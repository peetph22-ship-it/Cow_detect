"""Verify Open-Meteo previous-run forecasts against Chiang Mai airport (WMO 48327, Meteostat).

Usage: python -I verify_openmeteo.py <data_dir>
Station is OUTDOOR (airport), used as a stand-in for "the farm's own sensor".
All times UTC. Daily means use local day (UTC+7).
"""
import gzip, json, sys, math
from datetime import datetime, timedelta
import numpy as np

DATA = sys.argv[1]
TZ = timedelta(hours=7)


def thi(t, rh):
    return (1.8 * t + 32) - (0.55 - 0.0055 * rh) * (1.8 * t - 26)


# ---------- station ----------
obs = {}
with gzip.open(f"{DATA}/meteostat/48327.csv.gz", "rt") as f:
    for line in f:
        p = line.rstrip("\n").split(",")
        if p[0] < "2024-01-01" or p[2] == "" or p[4] == "":
            continue
        ts = datetime.strptime(p[0], "%Y-%m-%d") + timedelta(hours=int(p[1]))
        obs[ts] = (float(p[2]), float(p[4]))


def load(model):
    d = json.load(open(f"{DATA}/openmeteo/prev_cnx_{model}.json"))
    h = d["hourly"]
    times = [datetime.fromisoformat(t) for t in h["time"]]
    out = {}
    for k, sfx in enumerate(["", "_previous_day1", "_previous_day2", "_previous_day3"]):
        T = h["temperature_2m" + sfx]
        R = h["relative_humidity_2m" + sfx]
        out[k] = {t: (a, b) for t, a, b in zip(times, T, R) if a is not None and b is not None}
    return out


def stats(e):
    e = np.asarray(e, float)
    return dict(n=len(e), bias=e.mean(), mae=np.abs(e).mean(), rmse=math.sqrt((e ** 2).mean()))


def fmt(s):
    return f"n={s['n']:5d} bias={s['bias']:+.2f} MAE={s['mae']:.2f} RMSE={s['rmse']:.2f}"


def daily_means(series):
    """series: dict ts->(T,RH). returns local-date -> mean THI (only days with >=20 h)."""
    acc = {}
    for t, (a, b) in series.items():
        d = (t + TZ).date()
        acc.setdefault(d, []).append(thi(a, b))
    return {d: float(np.mean(v)) for d, v in acc.items() if len(v) >= 20}


def cat(x):
    return 0 if x < 74 else 1 if x < 76 else 2 if x < 82 else 3


obs_daily = daily_means(obs)
print(f"station hourly rows (2024-): {len(obs)}, daily means with >=20h: {len(obs_daily)}")

results = {}
for model in ["best_match", "ecmwf_ifs025", "gfs_seamless"]:
    fc = load(model)
    print(f"\n===== {model} =====")
    for k in range(4):
        common = [t for t in fc[k] if t in obs]
        eT = [fc[k][t][0] - obs[t][0] for t in common]
        eR = [fc[k][t][1] - obs[t][1] for t in common]
        eH = [thi(*fc[k][t]) - thi(*obs[t]) for t in common]
        fd = daily_means({t: fc[k][t] for t in common})
        od = daily_means({t: obs[t] for t in common})
        days = sorted(set(fd) & set(od))
        eD = [fd[d] - od[d] for d in days]
        hit = np.mean([cat(fd[d]) == cat(od[d]) for d in days])
        print(f" lead day{k}: T  {fmt(stats(eT))}")
        print(f"            RH {fmt(stats(eR))}")
        print(f"            THI(hourly) {fmt(stats(eH))}")
        print(f"            THI(daily mean) {fmt(stats(eD))}  category-hit={hit:.3f}")
        results[(model, k)] = (common, fd, od, days)
    # diurnal bias of THI, lead day1
    common = [t for t in fc[1] if t in obs]
    by_h = {}
    for t in common:
        by_h.setdefault((t + TZ).hour, []).append(thi(*fc[1][t]) - thi(*obs[t]))
    print(" day1 hourly THI bias by local hour:", " ".join(f"{h:02d}:{np.mean(v):+.1f}" for h, v in sorted(by_h.items())))

# ---------- current baseline: mean THI of last 72 h of station obs ----------
print("\n===== baseline-72h-mean (station as sensor) vs station daily-mean THI =====")
obs_sorted = sorted(obs)
# forecast for local day d issued at local midnight starting day d-k+1, using the trailing 72 h
ts = np.array([(t - datetime(2024, 1, 1)).total_seconds() / 3600 for t in obs_sorted])
vals = np.array([thi(*obs[t]) for t in obs_sorted])
cs = np.concatenate([[0], np.cumsum(vals)])
for k in (1, 2, 3):
    errs, hits = [], []
    for d, val in obs_daily.items():
        issue_local = datetime.combine(d, datetime.min.time()) - timedelta(days=k - 1)
        h_issue = (issue_local - TZ - datetime(2024, 1, 1)).total_seconds() / 3600
        i0, i1 = np.searchsorted(ts, h_issue - 72), np.searchsorted(ts, h_issue)
        if i1 - i0 < 60:
            continue
        pred = (cs[i1] - cs[i0]) / (i1 - i0)
        errs.append(pred - val)
        hits.append(cat(pred) == cat(val))
    print(f" day+{k}: THI(daily mean) {fmt(stats(errs))} category-hit={np.mean(hits):.3f}")

# ---------- short-history correction of daily-mean THI, learned from SAME model+lead past errors ----------
print("\n===== correction of daily-mean THI from last N verified days of the same model & lead =====")
for model in ["best_match", "ecmwf_ifs025", "gfs_seamless"]:
    for k in (1, 2, 3):
        common, fd, od, days = results[(model, k)]
        dset = set(days)
        raw = [fd[d] - od[d] for d in days]
        hraw = np.mean([cat(fd[d]) == cat(od[d]) for d in days])
        print(f"{model} day+{k} raw: " + fmt(stats(raw)) + f" hit={hraw:.3f}")
        for N in (3, 7, 14, 30):
            eb, el, hb, hl = [], [], [], []
            for d in days:
                last = d - timedelta(days=k)  # latest fully observed day at issue time
                hist = [last - timedelta(days=j) for j in range(N) if (last - timedelta(days=j)) in dset]
                if len(hist) < max(2, (2 * N) // 3):
                    continue
                x = np.array([fd[h] for h in hist]); y = np.array([od[h] for h in hist])
                pb = fd[d] - np.mean(x - y)
                eb.append(pb - od[d]); hb.append(cat(pb) == cat(od[d]))
                if N >= 14 and x.std() > 0.3:
                    a, b = np.polyfit(x, y, 1)
                    pl = a * fd[d] + b
                    el.append(pl - od[d]); hl.append(cat(pl) == cat(od[d]))
            line = f"   N={N:2d} bias-only: " + fmt(stats(eb)) + f" hit={np.mean(hb):.3f}"
            if el:
                line += f" | linear: " + fmt(stats(el)) + f" hit={np.mean(hl):.3f}"
            print(line)
