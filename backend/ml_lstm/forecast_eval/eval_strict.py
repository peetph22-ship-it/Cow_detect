"""Strict re-run + small GRU / LSTM test. Truth = Chiang Mai airport station (Meteostat 48327).
Issue time = 00:00 local of the day after the last fully observed day (so only completed days are used).
Target day d at lead k: last fully observed day = d - k - ... we use last = d - k - 1 (strict, no partial day).
Test = last 365 target days with data; GRU / LSTM trained on earlier days only (same inputs, size and training).
Usage: python -I eval_strict.py <data_dir>"""
import gzip, json, sys, math
from datetime import datetime, timedelta
import numpy as np
import torch, torch.nn as nn
DATA = sys.argv[1]; TZ = timedelta(hours=7)
def thi(t, rh): return (1.8*t+32)-(0.55-0.0055*rh)*(1.8*t-26)
def cat(x): return 0 if x < 74 else 1 if x < 76 else 2 if x < 82 else 3
obs = {}
with gzip.open(f"{DATA}/meteostat/48327.csv.gz", "rt") as f:
    for line in f:
        p = line.rstrip("\n").split(",")
        if p[0] < "2024-01-01" or p[2] == "" or p[4] == "": continue
        obs[datetime.strptime(p[0], "%Y-%m-%d")+timedelta(hours=int(p[1]))] = (float(p[2]), float(p[4]))
def dmean(series):
    acc = {}
    for t, (a, b) in series.items(): acc.setdefault((t+TZ).date(), []).append(thi(a, b))
    return {d: float(np.mean(v)) for d, v in acc.items() if len(v) >= 20}
od = dmean(obs)
def load(model):
    h = json.load(open(f"{DATA}/openmeteo/prev_cnx_{model}.json"))["hourly"]
    times = [datetime.fromisoformat(t) for t in h["time"]]
    out = {}
    for k, s in enumerate(["", "_previous_day1", "_previous_day2", "_previous_day3"]):
        out[k] = dmean({t: (a, b) for t, a, b in zip(times, h["temperature_2m"+s], h["relative_humidity_2m"+s]) if a is not None and b is not None and t in obs})
    return out
def st(e): e = np.asarray(e); return f"MAE {np.abs(e).mean():.2f} RMSE {math.sqrt((e**2).mean()):.2f} n={len(e)}"
all_days = sorted(od); TEST0 = all_days[-1] - timedelta(days=364)
res = {}
for model in ["best_match", "ecmwf_ifs025"]:
    fd = load(model)
    print(f"== {model} (test {TEST0}..{all_days[-1]}) ==")
    for k in (1, 2, 3):
        days = [d for d in all_days if d >= TEST0 and d in fd[k]]
        raw = [fd[k][d]-od[d] for d in days]
        # baseline 72h: mean of last 3 completed days before issue (issue = start of day d-k+1)
        base = []
        for d in days:
            prev = [d - timedelta(days=k+j) for j in range(0, 3)]
            if all(p in od for p in prev): base.append((np.mean([od[p] for p in prev]) - od[d], cat(np.mean([od[p] for p in prev])) == cat(od[d])))
        line = f" day+{k} raw {st(raw)} hit={np.mean([cat(fd[k][d])==cat(od[d]) for d in days]):.3f} | base72 {st([b[0] for b in base])} hit={np.mean([b[1] for b in base]):.3f}"
        print(line)
        for N in (3, 7, 14):
            e, h = [], []
            for d in days:
                last = d - timedelta(days=k+1)          # strict: newest COMPLETED day whose lead-k forecast is verified
                hist = [last - timedelta(days=j) for j in range(N)]
                hist = [x for x in hist if x in od and x in fd[k]]
                if len(hist) < max(2, (2*N)//3): continue
                p = fd[k][d] - np.mean([fd[k][x]-od[x] for x in hist])
                e.append(p-od[d]); h.append(cat(p) == cat(od[d]))
            print(f"    N={N:2d} bias-corrected {st(e)} hit={np.mean(h):.3f}")
            res[(model, k, N)] = (np.abs(e).mean(), len(e))
# ---- small GRU / LSTM: sequence of last 14 completed days [obs, fc_lead1..3 for those days, sin, cos] + target-day fc (lead k) -> 3 targets
fd = load("ecmwf_ifs025")
X, Y, D = [], [], []
for d0 in all_days:            # d0 = last completed day; targets d0+1..d0+3 use leads 2..4? keep consistent: target d0+k uses lead k+... approximate with lead k
    seq = []
    ok = True
    for j in range(13, -1, -1):
        x = d0 - timedelta(days=j)
        if x not in od or not all(x in fd[k] for k in (1, 2, 3)): ok = False; break
        a = 2*np.pi*x.timetuple().tm_yday/365.25
        seq.append([od[x], fd[1][x], fd[2][x], fd[3][x], np.sin(a), np.cos(a)])
    tg = [d0 + timedelta(days=k+1) for k in (1, 2, 3)]   # strict: target d at lead k has last completed day d-k-1
    if not ok or not all(t in od and t in fd[k] for k, t in zip((1, 2, 3), tg)): continue
    X.append(np.array(seq) ); Y.append([od[t] for t in tg]); D.append(([fd[k][t] for k, t in zip((1, 2, 3), tg)], tg[0]))
X = np.array(X, np.float32); Y = np.array(Y, np.float32)
F = np.array([d[0] for d in D], np.float32); T0 = [d[1] for d in D]
te = np.array([t >= TEST0 for t in T0]); tr = ~te
mu, sd = X[tr].reshape(-1, 6).mean(0), X[tr].reshape(-1, 6).std(0)+1e-6
Xn = (X-mu)/sd; fm, fs = F[tr].mean(), F[tr].std()
class M(nn.Module):
    def __init__(s, cell): super().__init__(); s.g = cell(6, 16, batch_first=True); s.o = nn.Linear(16+3, 3)
    def forward(s, x, f):
        _, h = s.g(x)
        if isinstance(h, tuple): h = h[0]   # LSTM returns (h, c)
        return s.o(torch.cat([h[-1], f], 1))
def run_rnn(cell):
    maes = []
    for seed in (0, 1, 2):
        torch.manual_seed(seed); np.random.seed(seed)
        m = M(cell); opt = torch.optim.Adam(m.parameters(), 3e-3, weight_decay=1e-4)
        idx = np.where(tr)[0]; nv = max(30, len(idx)//6); va, trn = idx[-nv:], idx[:-nv]
        xt = lambda i: (torch.tensor(Xn[i]), torch.tensor((F[i]-fm)/fs), torch.tensor(Y[i]-F[i]))  # predict correction to forecast
        best, bstate, bad = 1e9, None, 0
        for ep in range(400):
            m.train(); a, b, c = xt(trn); opt.zero_grad(); loss = ((m(a, b)-c)**2).mean(); loss.backward(); opt.step()
            m.eval()
            with torch.no_grad(): a, b, c = xt(va); vl = (m(a, b)-c).abs().mean().item()
            if vl < best - 1e-4: best, bstate, bad = vl, {k: v.clone() for k, v in m.state_dict().items()}, 0
            else:
                bad += 1
                if bad > 40: break
        m.load_state_dict(bstate); m.eval()
        with torch.no_grad(): a, b, c = xt(np.where(te)[0]); pred = m(a, b).numpy() + F[te]
        maes.append(np.abs(pred - Y[te]).mean(0))
    return np.array(maes)
for name, cell in (("GRU", nn.GRU), ("LSTM", nn.LSTM)):
    maes = run_rnn(cell)
    print(f"== {name} (ecmwf, 14-day seq, {sum(p.numel() for p in M(cell).parameters())} params, train {tr.sum()} / test {te.sum()} samples) ==")
    for k in range(3): print(f" day+{k+1} {name} MAE {maes[:, k].mean():.2f} (seeds {', '.join(f'{v:.2f}' for v in maes[:, k])}) vs bias-corrected N=14 MAE {res[('ecmwf_ifs025', k+1, 14)][0]:.2f}")
# static regional correction (mean bias of the TRAIN period only) applied to test days
for k in (1, 2, 3):
    fdk = load("ecmwf_ifs025")[k]
    trd = [d for d in all_days if d < TEST0 and d in fdk]; ted = [d for d in all_days if d >= TEST0 and d in fdk]
    b = np.mean([fdk[d]-od[d] for d in trd])
    e = [fdk[d]-b-od[d] for d in ted]
    print(f" static train-bias {b:+.2f} -> test day+{k} {st(e)} hit={np.mean([cat(fdk[d]-b)==cat(od[d]) for d in ted]):.3f}")
