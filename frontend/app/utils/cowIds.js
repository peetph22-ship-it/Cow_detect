/**
 * เลขประจำตัวชั่วคราวของวัวทุกตัวในวิดีโอ (หน้า simulator) ไว้ให้ผู้ใช้รู้ว่าตัวไหนเป็นตัวไหนข้ามเฟรม
 * - จับคู่ด้วยคะแนนเดียวกับการติดตามบน server (matchScore: ซ้อนทับ 70% + ระยะใกล้ 30%)
 * - จับคู่ทั้งเฟรมพร้อมกัน: คู่ที่คะแนนสูงสุดได้ก่อน (วัว 2 ตัวไม่ได้เลขเดียวกันในเฟรมเดียว)
 * - หายไปไม่เกิน maxLostSec แล้วกลับมาที่เดิม = เลขเดิม, กรอบใหม่ที่ไม่ตรงกับใคร = เลขใหม่
 * เลขนี้ใช้แสดงผลเท่านั้น วัวเป้าหมายยังติดตามด้วย trackTarget (วิธีเดียวกับ server) แยกต่างหาก
 */
import { matchScore, TRACK_DEFAULTS } from './cowTracking.js'

/**
 * @param {Array<{t: number, boxes: Array<{x1,y1,x2,y2}>}>} frames  เรียงตามเวลา (t = วินาที)
 * @returns {Array<Array<number>>}  ids[i][j] = เลขของกรอบ j ในเฟรม i
 */
export const assignCowIds = (frames, opts = {}) => {
  const o = { minScore: TRACK_DEFAULTS.minScore, maxShift: TRACK_DEFAULTS.maxShift, maxLostSec: TRACK_DEFAULTS.maxLostSec, ...opts }
  let nextId = 1
  let tracks = []   // { id, box, lastT }
  return frames.map((f) => {
    tracks = tracks.filter(tr => f.t - tr.lastT <= o.maxLostSec)
    const pairs = []
    tracks.forEach((tr, ti) => f.boxes.forEach((b, bi) => {
      const s = matchScore(tr.box, b, o.maxShift)
      if (s >= o.minScore) pairs.push({ ti, bi, s })
    }))
    pairs.sort((a, b) => b.s - a.s)
    const ids = new Array(f.boxes.length).fill(0)
    const usedTrack = new Set()
    for (const p of pairs) {
      if (usedTrack.has(p.ti) || ids[p.bi]) continue
      usedTrack.add(p.ti)
      ids[p.bi] = tracks[p.ti].id
      tracks[p.ti].box = f.boxes[p.bi]
      tracks[p.ti].lastT = f.t
    }
    // กรอบที่ไม่ตรงกับใคร: เลขใหม่ เรียงซ้ายไปขวา (เลขในเฟรมแรกอ่านง่าย)
    f.boxes
      .map((b, bi) => ({ b, bi }))
      .filter(x => !ids[x.bi])
      .sort((a, b) => (a.b.x1 + a.b.x2) - (b.b.x1 + b.b.x2))
      .forEach(({ b, bi }) => {
        ids[bi] = nextId++
        tracks.push({ id: ids[bi], box: b, lastT: f.t })
      })
    return ids
  })
}
