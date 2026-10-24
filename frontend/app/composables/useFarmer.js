/**
 * CowCare AI - ข้อมูลกลางสำหรับเกษตรกร (Senior & Minimal Edition)
 * - รองรับระบบผู้สูงอายุ (ขยายขนาดตัวหนังสือ, สังเคราะห์เสียงพูดภาษาไทย Web Speech API)
 * - ดึงข้อมูลอัตโนมัติ /api/farmer/me
 * - ระบบเช็คลิสต์สิ่งที่ต้องทำประจำวัน /actions
 * - ระบบสมุดจดน้ำนม & สุขภาพวัว /logs
 * - ระบบโทรด่วน & ขอความช่วยเหลือฉุกเฉิน /sos
 */
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'
import { getThresholds, RISK_LABELS_TH } from '~/utils/heatStress'

const REFRESH_MS = 60 * 1000
const FARM_KEY = 'farmer.farm_id'
const FONT_KEY = 'farmer.font_size'

let timer = null
let listening = false

// สีระดับความร้อนชุดเดียวกันทุกหน้า (มินิมอล สบายตา และมี contrast สูง)
export const RISK_STYLE = {
  normal: { 
    dot: '#2D6A4F', 
    chip: 'bg-[#E8F5E9] text-[#1B4332] border border-[#C8E6C9]', 
    solid: 'bg-[#2D6A4F] text-white', 
    bar: '#2D6A4F',
    cardBg: 'bg-[#E8F5E9]',
    cardText: 'text-[#1B4332]'
  },
  mild: { 
    dot: '#D97706', 
    chip: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]', 
    solid: 'bg-[#D97706] text-white', 
    bar: '#D97706',
    cardBg: 'bg-[#FEF3C7]',
    cardText: 'text-[#92400E]'
  },
  moderate: { 
    dot: '#EA580C', 
    chip: 'bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]', 
    solid: 'bg-[#EA580C] text-white', 
    bar: '#EA580C',
    cardBg: 'bg-[#FFEDD5]',
    cardText: 'text-[#9A3412]'
  },
  severe: { 
    dot: '#DC2626', 
    chip: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]', 
    solid: 'bg-[#DC2626] text-white', 
    bar: '#DC2626',
    cardBg: 'bg-[#FEE2E2]',
    cardText: 'text-[#991B1B]'
  }
}

export const riskStyle = (lvl) => RISK_STYLE[lvl] || RISK_STYLE.normal
export const riskLabel = (lvl) => RISK_LABELS_TH[lvl] || 'ปกติ'
export const RISK_SHORT = { normal: 'สบายดี', mild: 'เริ่มอุ่น', moderate: 'เริ่มร้อน', severe: 'ร้อนจัด' }
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

  // ฟีเจอร์ผู้สูงอายุ: ขนาดตัวอักษร (normal = ปกติ, large = ใหญ่, huge = ใหญ่พิเศษ)
  const fontSize = useState('farmer.fontSize', () => 'normal')
  const isSpeaking = useState('farmer.isSpeaking', () => false)

  // รายการเช็คลิสต์ที่ทำแล้ววันนี้
  const doneActions = useState('farmer.doneActions', () => [])
  const dailyLogs = useState('farmer.dailyLogs', () => [])

  const farm = computed(() => me.value?.farm || null)
  const now = computed(() => me.value?.now || null)
  const thresholds = computed(() => me.value?.thresholds || getThresholds(farm.value?.profile))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const senior = computed(() => me.value?.senior || null)

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)

  const setFontSize = (size) => {
    fontSize.value = size
    if (typeof window !== 'undefined') {
      localStorage.setItem(FONT_KEY, size)
    }
  }

  // เสียงอ่านภาษาไทย (Web Speech API)
  const speakThai = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    if (!text) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'th-TH'
    utterance.rate = fontSize.value === 'huge' ? 0.9 : 0.95 // อ่านช้าลงเล็กน้อยให้ผู้สูงอายุฟังทัน

    const voices = window.speechSynthesis.getVoices()
    const thVoice = voices.find(v => v.lang && v.lang.startsWith('th'))
    if (thVoice) utterance.voice = thVoice

    utterance.onstart = () => { isSpeaking.value = true }
    utterance.onend = () => { isSpeaking.value = false }
    utterance.onerror = () => { isSpeaking.value = false }

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    isSpeaking.value = false
  }

  const logout = () => {
    stopSpeech()
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
    
    // โหลดขนาดตัวหนังสือที่เคยตั้งไว้
    if (typeof window !== 'undefined') {
      const savedFont = localStorage.getItem(FONT_KEY)
      if (savedFont && ['normal', 'large', 'huge'].includes(savedFont)) {
        fontSize.value = savedFont
      }
    }
    return true
  }

  // GET /api/farmer/<path>
  const request = async (path, params = {}) => {
    try {
      const res = await axios.get(`${getNodeApiBase()}/farmer/${path}`, {
        headers: { Authorization: `Bearer ${token()}` },
        params: {
          ...(farmId.value ? { farm_id: farmId.value } : {}),
          ...params
        }
      })
      return res.data
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) logout()
      throw err
    }
  }

  // POST /api/farmer/<path>
  const postRequest = async (path, body = {}) => {
    try {
      const res = await axios.post(`${getNodeApiBase()}/farmer/${path}`, body, {
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
      const [d, acts] = await Promise.all([
        request('me'),
        request('actions').catch(() => ({ done_actions: [] }))
      ])
      me.value = d
      doneActions.value = acts?.done_actions || []
      if (d?.farm?.id && d.farm.id !== farmId.value) farmId.value = d.farm.id
      error.value = ''
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        error.value = 'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสัญญาณอินเทอร์เน็ต'
      }
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  // สลับสถานะสิ่งที่ต้องทำ
  const toggleAction = async (actionId) => {
    const isDone = !doneActions.value.includes(actionId)
    if (isDone) {
      doneActions.value = [...doneActions.value, actionId]
    } else {
      doneActions.value = doneActions.value.filter(id => id !== actionId)
    }

    try {
      await postRequest('actions/toggle', { action_id: actionId, is_done: isDone })
    } catch (e) {
      console.warn('Action toggle offline / sync failed:', e.message)
    }
  }

  // โหลดประวัติสมุดจด
  const loadLogs = async () => {
    try {
      const res = await request('logs')
      dailyLogs.value = res?.logs || []
      return dailyLogs.value
    } catch (e) {
      return []
    }
  }

  // บันทึกสมุดจด
  const saveLog = async (entry) => {
    const res = await postRequest('logs', entry)
    await loadLogs()
    return res
  }

  // ส่งสัญญาณขอความช่วยเหลือ SOS
  const sendSos = async (sosData) => {
    return await postRequest('sos', sosData)
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
    stopSpeech()
    clearInterval(timer)
    timer = null
    if (listening) { document.removeEventListener('visibilitychange', onVisible); listening = false }
  }

  return {
    me,
    user,
    farm,
    now,
    thresholds,
    isAdmin,
    senior,
    loading,
    loaded,
    error,
    farmId,
    fontSize,
    setFontSize,
    isSpeaking,
    speakThai,
    stopSpeech,
    doneActions,
    toggleAction,
    dailyLogs,
    loadLogs,
    saveLog,
    sendSos,
    ensureAuth,
    refresh,
    request,
    postRequest,
    selectFarm,
    logout,
    startPolling,
    stopPolling
  }
}
