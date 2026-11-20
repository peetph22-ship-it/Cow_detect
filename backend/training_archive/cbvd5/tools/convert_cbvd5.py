"""
แปลง CBVD-5 (Kaggle, CC0; Li et al., Sci Rep 14:18702, 2024) เป็นรูปแบบ YOLO 4 ท่าแบบเดียวกับโมเดลที่ใช้อยู่
  classes: 0 drinking, 1 feeding, 2 lying down, 3 standing (ลำดับเดียวกับ data.yaml เดิม)
  CBVD-5 มีท่า (stand / lying down) + สถานะ (foraging / drinking water / rumination) ต่อวัว 1 ตัว:
    ดื่ม -> drinking, กิน (foraging) -> feeding, นอน -> lying down, อื่นๆ -> standing (เคี้ยวเอื้องตามท่า)
แบ่งชุดตาม "มุมกล้อง" ไม่ใช่สุ่มภาพ: ภาพจากคลิปเดียวกันอยู่ชุดเดียวเสมอ
  test  = มุมกล้องที่กันไว้ทั้งหมด (โมเดลไม่เคยเห็นกล้องนี้ตอนฝึก)
  val   = 10% ของคลิปที่เหลือ (สุ่มทั้งคลิป)
  train = ที่เหลือ
ภาพไม่ถูกยืด (1920x1080) ใช้ hardlink ไม่เปลืองพื้นที่
Usage: python convert_cbvd5.py <raw_dir> <groups.json> <out_dir> <test_group_index>
"""
import csv, json, os, random, sys, collections

raw, groups_json, out, test_gi = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
NAMES = ['drinking', 'feeding', 'lying down', 'standing']
# AVA action id ของ CBVD-5: 1 stand, 2 lying down, 3 foraging, 4 drinking water, 5 rumination
def to_class(actions):
    if 4 in actions: return 0
    if 3 in actions: return 1
    if 2 in actions: return 2
    return 3

boxes = collections.defaultdict(lambda: collections.defaultdict(set))   # image -> box -> actions
for sp in ('train', 'val', 'test'):
    for r in csv.reader(open(f'{raw}/annotations/ava_{sp}_v2.1.csv')):
        if not r: continue
        vid, ts, x1, y1, x2, y2, act = r[0], int(r[1]), *map(float, r[2:6]), int(r[6])
        boxes[f'{int(vid)}_{ts:05d}'][(round(x1, 5), round(y1, 5), round(x2, 5), round(y2, 5))].add(act)

g = json.load(open(groups_json))['groups']
clip_group = {c: gi for gi, cl in enumerate(g) for c in cl}
test_clips = set(g[test_gi])
rest = sorted({k.split('_')[0] for k in boxes} - test_clips, key=int)
random.seed(20261120); val_clips = set(random.sample(rest, max(1, round(len(rest) * 0.1))))
split_of = lambda clip: 'test' if clip in test_clips else 'val' if clip in val_clips else 'train'

stats = collections.defaultdict(collections.Counter)
for sp in ('train', 'val', 'test'):
    os.makedirs(f'{out}/{sp}/images', exist_ok=True); os.makedirs(f'{out}/{sp}/labels', exist_ok=True)
for img, bx in sorted(boxes.items()):
    clip = img.split('_')[0]; sp = split_of(clip)
    src = f'{raw}/labelframes/{img}.jpg'
    if not os.path.exists(src): stats['missing'][sp] += 1; continue
    dst = f'{out}/{sp}/images/{img}.jpg'
    if not os.path.exists(dst): os.link(src, dst)
    with open(f'{out}/{sp}/labels/{img}.txt', 'w') as f:
        for (x1, y1, x2, y2), acts in bx.items():
            c = to_class(acts)
            f.write(f'{c} {(x1 + x2) / 2:.6f} {(y1 + y2) / 2:.6f} {x2 - x1:.6f} {y2 - y1:.6f}\n')
            stats[sp][NAMES[c]] += 1
    stats[sp]['images'] += 1
    stats[sp]['clips:' + clip] = 1
with open(f'{out}/data.yaml', 'w') as f:
    f.write(f"# CBVD-5 (CC0) แปลงด้วย tools/convert_cbvd5.py - test = มุมกล้องที่ไม่เคยใช้ฝึก (group {test_gi})\n")
    f.write("train: train/images\nval: val/images\ntest: test/images\n\nnc: 4\nnames: ['drinking', 'feeding', 'lying down', 'standing']\n")
json.dump({'test_group': test_gi, 'test_clips': sorted(test_clips, key=int), 'val_clips': sorted(val_clips, key=int)}, open(f'{out}/split.json', 'w'))
for sp in ('train', 'val', 'test'):
    s = stats[sp]; nclips = sum(1 for k in s if k.startswith('clips:'))
    print(f"{sp:5} images={s['images']:5} clips={nclips:4} " + ' '.join(f"{n}={s[n]}" for n in NAMES))
if stats['missing']: print('missing images:', dict(stats['missing']))
