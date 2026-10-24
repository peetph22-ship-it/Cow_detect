"""Home-sensor proxy check: does a bias learned from the last N completed days help? (home, NOT a barn)
Usage: python -I home_check.py <data_dir>"""
import json, sys
from datetime import date, timedelta
import numpy as np
D = sys.argv[1]
def thi(t, rh): return (1.8*t+32)-(0.55-0.0055*rh)*(1.8*t-26)
home = json.load(open(f"{D}/home_hourly.json"))
acc = {}
for r in home:
    if r["n"] >= 60: acc.setdefault(r["h"][:10], []).append(r["thi"])   # >=60 readings ~ 15 min of data at 15 s
od = {d: float(np.mean(v)) for d, v in acc.items() if len(v) >= 20}
h = json.load(open(f"{D}/home_period_ecmwf.json"))["hourly"]
fd = {}
for k, s in enumerate(["", "_previous_day1", "_previous_day2", "_previous_day3"]):
    a = {}
    for t, T, R in zip(h["time"], h["temperature_2m"+s], h["relative_humidity_2m"+s]):
        if T is not None and R is not None: a.setdefault(t[:10], []).append(thi(T, R))
    fd[k] = {d: float(np.mean(v)) for d, v in a.items() if len(v) == 24}
days = sorted(od)
print("home days with >=20 h:", days)
print("daily home - forecast(lead1):", ", ".join(f"{d[5:]} {od[d]-fd[1][d]:+.2f}" for d in days if d in fd[1]))
for k in (1, 2, 3):
    raw, cor = [], []
    for d in days:
        if d not in fd[k]: continue
        dd = date.fromisoformat(d)
        hist = [(dd - timedelta(days=k+1+j)).isoformat() for j in range(3)]
        hist = [x for x in hist if x in od and x in fd[k]]
        if len(hist) < 3: continue
        raw.append(fd[k][d]-od[d]); cor.append(fd[k][d]-np.mean([fd[k][x]-od[x] for x in hist])-od[d])
    if raw: print(f"day+{k}: n={len(raw)}  raw forecast MAE {np.abs(raw).mean():.2f} (bias {np.mean(raw):+.2f})  ->  3-day bias-corrected MAE {np.abs(cor).mean():.2f}")
