"""
Evaluate forecast baselines on the synthetic data generator used to train farm_lstm.onnx.

Writes X.bin / S.bin / Y.bin (float32) to OUT_DIR so backend_node/scripts/eval_forecast.js
can run the deployed ONNX model on exactly the same samples.

Usage:
    cd backend && venv/bin/python ml_lstm/eval_baselines.py [OUT_DIR] [N] [SEED]

NOTE: results only describe the synthetic generator. They say nothing about real farms.
"""
import os
import random
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import synthetic_pretrain as sp  # noqa: E402

out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "eval_out")
n = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
out_dir.mkdir(parents=True, exist_ok=True)

random.seed(seed)
np.random.seed(seed)
data = [sp.generate_thai_farm_sequence() for _ in range(n)]
X = np.stack([d[0] for d in data]).astype(np.float32)  # [n, 72, 11]
S = np.stack([d[1] for d in data]).astype(np.float32)  # [n, 3]
Y = np.stack([d[2] for d in data]).astype(np.float32)  # [n, 3] mean THI of day +1..+3
R = np.stack([d[4] for d in data])                     # [n, 3] risk class (training thresholds)
classify = np.vectorize(sp.classify_thai_risk)


def report(name, pred):
    mae = np.abs(pred - Y).mean(axis=0)
    acc = (classify(pred) == R).mean(axis=0) * 100
    print(f"{name:34s} MAE d1/d2/d3 = {mae[0]:.2f}/{mae[1]:.2f}/{mae[2]:.2f} "
          f"| risk acc = {acc[0]:.1f}/{acc[1]:.1f}/{acc[2]:.1f}%")


print(f"Synthetic samples: n={n}, seed={seed}")
report("Persistence (mean of last 24h)", np.repeat(X[:, 48:72, 2].mean(axis=1, keepdims=True), 3, axis=1))
report("Mean of 72h lookback", np.repeat(X[:, :, 2].mean(axis=1, keepdims=True), 3, axis=1))
print("corr(THI, standing%) =", round(float(np.corrcoef(X[:, :, 2].ravel(), X[:, :, 8].ravel())[0, 1]), 3),
      "(behaviour features are a function of THI in the generator)")

X.tofile(out_dir / "X.bin")
S.tofile(out_dir / "S.bin")
Y.tofile(out_dir / "Y.bin")
print(f"Wrote samples to {os.path.abspath(out_dir)} -> run: node backend_node/scripts/eval_forecast.js {out_dir}")
