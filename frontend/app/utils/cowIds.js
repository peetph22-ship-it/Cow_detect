/**
 * เลขประจำตัวชั่วคราวของวัวทุกตัวในวิดีโอ (หน้า simulator) ไว้ให้รู้ว่าตัวไหนเป็นตัวไหนข้ามเฟรม
 * ใช้ stepCowIds ตัวเดียวกับที่ server ใส่เลขวัวให้กรอบทุกภาพจากกล้องจริง (utils/cowTracking.js สร้างจากโค้ด server)
 */
import { stepCowIds } from './cowTracking.js'

/**
 * @param {Array<{t: number, boxes: Array<{x1,y1,x2,y2}>}>} frames  เรียงตามเวลา (t = วินาที)
 * @returns {Array<Array<number>>}  ids[i][j] = เลขของกรอบ j ในเฟรม i
 */
export const assignCowIds = (frames, opts = {}) => {
  let state = { tracks: [], nextId: 1 }
  return frames.map((f) => {
    const r = stepCowIds(state, { observedAt: Math.round(f.t * 1000), boxes: f.boxes }, opts)
    state = r.state
    return r.ids
  })
}
