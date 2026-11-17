/**
 * ส่วนที่ใช้ร่วมกันของกราฟหน้าเกษตรกร: แถบสีระดับความร้อน ช่วงแกน THI และตั้งค่าพื้นฐาน
 * สีและชื่อระดับต้องตรงกับการ์ดอื่นในหน้าเกษตรกร (RISK_STYLE / RISK_SHORT ใน useFarmer)
 */
import { RISK_STYLE, RISK_SHORT } from '~/composables/useFarmer'

export interface Thresholds { mild: number; moderate: number; severe: number }

export const LEVEL_COLOR = {
  normal: RISK_STYLE.normal.bar,
  mild: RISK_STYLE.mild.bar,
  moderate: RISK_STYLE.moderate.bar,
  severe: RISK_STYLE.severe.bar
}
export const levelName = (lvl?: string | null) => (lvl ? (RISK_SHORT as Record<string, string>)[lvl] || '—' : 'ไม่มีข้อมูล')

// ช่วงแกน THI: ให้เห็นเส้นเกณฑ์ทุกเส้นเสมอ และไม่ตัดค่าที่สูง/ต่ำกว่าเกณฑ์
export const thiRange = (values: (number | null | undefined)[], t: Thresholds) => {
  const v = values.filter((x): x is number => Number.isFinite(x as number))
  const lo = Math.min(t.mild - 6, ...v)
  const hi = Math.max(t.severe + 2, ...v)
  return { min: Math.floor(lo / 2) * 2, max: Math.ceil(hi / 2) * 2 }
}

// แถบพื้นหลังตามระดับ (บอกว่าเส้นอยู่โซนไหน โดยไม่ต้องอ่านตัวเลข)
export const thiBands = (t: Thresholds, range: { min: number; max: number }) => {
  // ไม่ใส่ป้ายในกราฟ: แถบเริ่มอุ่นแคบ (2 หน่วย) ป้ายจะทับกัน ใช้ FarmerRiskLegend ด้านบนกราฟแทน
  const band = (y: number, y2: number, color: string) => ({ y, y2, fillColor: color, opacity: 0.12, borderColor: 'transparent' })
  return [
    band(range.min, t.mild, LEVEL_COLOR.normal),
    band(t.mild, t.moderate, LEVEL_COLOR.mild),
    band(t.moderate, t.severe, LEVEL_COLOR.moderate),
    band(t.severe, range.max, LEVEL_COLOR.severe)
  ]
}

export const baseChart = {
  fontFamily: 'inherit',
  toolbar: { show: false },
  zoom: { enabled: false },
  animations: { enabled: false },
  parentHeightOffset: 0
}

export const AXIS_LABEL = { colors: '#4E655B', fontSize: '11px', fontWeight: 700 }

export const thaiHour = (iso: string) =>
  new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })

export const thaiDay = (date: string) =>
  new Date(`${date}T12:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'short', day: 'numeric' })
