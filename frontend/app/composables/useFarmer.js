/**
 * ข้อมูลกลางของฝั่งเกษตรกร ใช้ร่วมกันทุกหน้าใน layouts/farmer.vue
 * - ตรวจ login (เฉพาะ farmer และ admin ที่ดูตัวอย่าง)
 * - /api/farmer/me ดึงทุก 1 นาที และเมื่อกลับมาที่แท็บ
 * - ฟาร์มที่เลือกจำไว้ในเครื่อง (กรณีมีหลายฟาร์ม)
 */
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'
import { getThresholds, RISK_LABELS_TH } from '~/utils/heatStress'

const REFRESH_MS = 60 * 1000
const FARM_KEY = 'farmer.farm_id'

let timer = null
let listening = false

// สีระดับความร้อนชุดเดียวกันทุกหน้า (โทนแบรนด์)
export const RISK_STYLE = {
  normal: { dot: '#3e7d4f', chip: 'bg-[#e6f2e7] text-[#2f6a3f]', solid: 'bg-[#3e7d4f] text-white', bar: '#3e7d4f' },
  mild: { dot: '#c99a2e', chip: 'bg-[#fbf1d9] text-[#8a6412]', solid: 'bg-[#c99a2e] text-white', bar: '#c99a2e' },
  moderate: { dot: '#D87939', chip: 'bg-[#fbe6d6] text-[#a4521c]', solid: 'bg-[#D87939] text-white', bar: '#D87939' },
  severe: { dot: '#c2412d', chip: 'bg-[#f8dcd6] text-[#9b2c1d]', solid: 'bg-[#c2412d] text-white', bar: '#c2412d' }
}
export const riskStyle = (lvl) => RISK_STYLE[lvl] || RISK_STYLE.normal
export const riskLabel = (lvl) => RISK_LABELS_TH[lvl] || 'ไม่ทราบ'
export const RISK_SHORT = { normal: 'สบาย', mild: 'เฝ้าระวัง', moderate: 'เครียด', severe: 'วิกฤต' }
export const riskShort = (lvl) => RISK_SHORT[lvl] || '—'

export const agoText = (min) => {
  if (min == null) return ''
  if (min < 1) return 'เมื่อสักครู่'
  if (min < 60) return `${min} นาทีที่แล้ว`
  if (min < 24 * 60) return `${Math.floor(min / 60)} ชม. ที่แล้ว`
  return `${Math.floor(min / 1440)} วันที่แล้ว`
}

export const thaiDate = (iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(iso).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', ...opts })
export const thaiTime = (iso) =>
  new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })

export const useFarmer = () => {
  const me = useState('farmer.me', () => null)
  const user = useState('farmer.user', () => null)
  const loading = useState('farmer.loading', () => false)
  const loaded = useState('farmer.loaded', () => false)
  const error = useState('farmer.error', () => '')
  const farmId = useState('farmer.farmId', () => '')

  const farm = computed(() => me.value?.farm || null)
  const now = computed(() => me.value?.now || null)
  const thresholds = computed(() => me.value?.thresholds || getThresholds(farm.value?.profile))
  const isAdmin = computed(() => user.value?.role === 'admin')

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    me.value = null
    loaded.value = false
    navigateTo('/login')
  }

  const ensureAuth = () => {
    let u = null
    try { u = JSON.parse(localStorage.getItem('user') || 'null') } catch { u = null }
    if (!token() || !u || !['farmer', 'admin'].includes(u.role)) {
      navigateTo('/login')
      return false
    }
    user.value = u
    if (!farmId.value) farmId.value = localStorage.getItem(FARM_KEY) || ''
    return true
  }

  // GET /api/farmer/<path> พร้อม token และฟาร์มที่เลือก; 401/403 = ออกจากระบบ
  const request = async (path) => {
    try {
      const res = await axios.get(`${getNodeApiBase()}/farmer/${path}`, {
        headers: { Authorization: `Bearer ${token()}` },
        params: farmId.value ? { farm_id: farmId.value } : {}
      })
      return res.data
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) logout()
      throw err
    }
  }

  const refresh = async () => {
    if (!token()) return
    loading.value = true
    try {
      const d = await request('me')
      me.value = d
      if (d?.farm?.id && d.farm.id !== farmId.value) farmId.value = d.farm.id
      error.value = ''
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) error.value = 'โหลดข้อมูลไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต'
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  const selectFarm = async (id) => {
    farmId.value = id
    localStorage.setItem(FARM_KEY, id)
    await refresh()
  }

  const onVisible = () => { if (document.visibilityState === 'visible') refresh() }

  const startPolling = () => {
    if (!timer) timer = setInterval(refresh, REFRESH_MS)
    if (!listening) { document.addEventListener('visibilitychange', onVisible); listening = true }
  }
  const stopPolling = () => {
    clearInterval(timer)
    timer = null
    if (listening) { document.removeEventListener('visibilitychange', onVisible); listening = false }
  }

  return { me, user, farm, now, thresholds, isAdmin, loading, loaded, error, farmId, ensureAuth, refresh, request, selectFarm, logout, startPolling, stopPolling }
}
