import glob, os, json, sys, cv2, numpy as np, collections
D = sys.argv[1]; out = sys.argv[2]
files = sorted(glob.glob(f'{D}/labelframes/*.jpg'))
# 1 ภาพต่อคลิป (เฟรมแรกที่มี) พอจะบอกกล้องได้ เพราะกล้องติดตาย
byclip = {}
for f in files:
    v = os.path.basename(f).split('_')[0]
    byclip.setdefault(v, f)
def vec(f):
    im = cv2.imread(f); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    v = cv2.resize(g, (48, 27), interpolation=cv2.INTER_AREA).astype(np.float32)
    v = cv2.GaussianBlur(v, (3, 3), 0).ravel(); v -= v.mean(); n = np.linalg.norm(v)
    sat = float(cv2.cvtColor(im, cv2.COLOR_BGR2HSV)[..., 1].mean())
    return (v / n if n else v), sat
clips = sorted(byclip, key=int); V = []; S = {}
for c in clips:
    v, s = vec(byclip[c]); V.append(v); S[c] = s
V = np.stack(V); C = V @ V.T
# จัดกลุ่มแบบเชื่อมต่อ: คลิปที่คล้ายกัน (corr >= th) อยู่กล้องเดียวกัน
def groups(th):
    parent = list(range(len(clips)))
    def f(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    for i in range(len(clips)):
        for j in np.where(C[i, i+1:] >= th)[0] + i + 1: parent[f(i)] = f(j)
    g = collections.defaultdict(list)
    for i, c in enumerate(clips): g[f(i)].append(c)
    return sorted(g.values(), key=len, reverse=True)
for th in (0.80, 0.75, 0.70, 0.65, 0.60):
    g = groups(th); print(th, 'groups', len(g), 'sizes', [len(x) for x in g[:12]])
th = float(sys.argv[3]) if len(sys.argv) > 3 else 0.7
g = groups(th)
json.dump({'th': th, 'groups': g, 'sat': S, 'rep': {c: byclip[c] for c in clips}}, open(out, 'w'))
