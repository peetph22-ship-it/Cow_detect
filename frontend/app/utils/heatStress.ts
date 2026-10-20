/**
 * CowCare AI - Heat stress thresholds (frontend copy)
 * ต้องตรงกับ backend_node/app/services/heatStress.js ห้ามเขียนตัวเลขเกณฑ์ในไฟล์ .vue
 *
 * สูตร THI: NRC (1971)
 * เกณฑ์: Boonkum et al. (2011, 2024), Duangjinda et al. (ICAR)
 */

export type RiskLevel = 'normal' | 'mild' | 'moderate' | 'severe'
export type HfProfile = 'default' | 'high_hf'

export const PROFILES: Record<HfProfile, { mild: number; moderate: number; severe: number }> = {
  default: { mild: 74, moderate: 76, severe: 82 },
  high_hf: { mild: 72, moderate: 74, severe: 80 }
}

export const PROFILE_LABELS: Record<HfProfile, string> = {
  default: 'ค่าเริ่มต้น (โคนมลูกผสมไทยทั่วไป)',
  high_hf: 'สายเลือดโฮลสไตน์สูง (≥87.5%) / แม่โคหลายท้อง'
}

export const RISK_LABELS_TH: Record<RiskLevel, string> = {
  normal: 'ปกติ',
  mild: 'เฝ้าระวัง',
  moderate: 'เครียดจากความร้อน',
  severe: 'วิกฤต'
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  normal: '#059669',
  mild: '#D97706',
  moderate: '#EA580C',
  severe: '#E11D48'
}

export const normalizeProfile = (p?: string | null): HfProfile => (p === 'high_hf' ? 'high_hf' : 'default')

export const getThresholds = (p?: string | null) => PROFILES[normalizeProfile(p)]

export const calcThi = (t?: number | string | null, rh?: number | string | null): number | null => {
  if (t == null || rh == null || t === '' || rh === '') return null
  const temp = Number(t)
  const hum = Number(rh)
  if (!Number.isFinite(temp) || !Number.isFinite(hum)) return null
  return Number(((1.8 * temp + 32) - (0.55 - 0.0055 * hum) * (1.8 * temp - 26)).toFixed(1))
}

export const getRiskLevel = (thi?: number | string | null, p?: string | null): RiskLevel | null => {
  if (thi == null || thi === '') return null
  const v = Number(thi)
  if (!Number.isFinite(v)) return null
  const t = getThresholds(p)
  if (v >= t.severe) return 'severe'
  if (v >= t.moderate) return 'moderate'
  if (v >= t.mild) return 'mild'
  return 'normal'
}

// ระดับที่ระบบแจ้งเตือนใช้ (ตรงกับ toAlertLevel ฝั่ง backend)
export const ALERT_LEVEL: Record<RiskLevel, string | null> = {
  normal: null,
  mild: 'warning',
  moderate: 'moderate',
  severe: 'critical'
}

// ข้อความใต้แถบเกจ เช่น "ปกติ (<74)"
export const thresholdLabels = (p?: string | null) => {
  const t = getThresholds(p)
  return [
    `ปกติ (<${t.mild})`,
    `เฝ้าระวัง (${t.mild})`,
    `เครียด (${t.moderate})`,
    `วิกฤต (${t.severe}+)`
  ]
}

export const VALIDATION_NOTE = 'ต้นแบบ อยู่ระหว่างทดสอบภาคสนาม'
