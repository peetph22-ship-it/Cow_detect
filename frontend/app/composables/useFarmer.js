/**
 * CowCare AI - ข้อมูลกลางสำหรับเกษตรกร (Senior & Minimal Edition)
 * - รองรับระบบผู้สูงอายุ (ขยายขนาดตัวหนังสือ, สังเคราะห์เสียงพูดภาษาไทย Web Speech API)
 * - รองรับการเชื่อมต่อไปยังหลังบ้านของเพื่อน (Custom Backend URL / Localhost / Cloud)
 * - ระบบตรวจและแปลงข้อมูลยืดหยุ่น (Tolerant Data Parser) ไม่พังแม้หลังบ้านเพื่อนส่งฟอร์แมตต่างกัน
 * - ระบบเช็คลิสต์สิ่งที่ต้องทำประจำวัน /actions
 */
import axios from 'axios'
import { getNodeApiBase, setCustomNodeApi, getCustomNodeApi, getKnownBackends } from '~/API/baseAPI'
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

  // URL หลังบ้านที่กำลังเชื่อมต่ออยู่
  const currentBackendUrl = useState('farmer.backendUrl', () => getNodeApiBase())

  // รายการเช็คลิสต์ที่ทำแล้ววันนี้
  const doneActions = useState('farmer.doneActions', () => [])

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

  // หน้าต่างยืนยันการออกจากระบบ (Senior Modal)
  const showLogoutModal = useState('farmer.showLogoutModal', () => false)

  const openLogoutModal = () => {
    showLogoutModal.value = true
  }

  const cancelLogout = () => {
    showLogoutModal.value = false
  }

  const confirmLogout = async () => {
    showLogoutModal.value = false
    await logout()
  }

  const logout = async () => {
    stopSpeech()
    
    // แจ้งหลังบ้านว่าออกจากระบบ (Fire & forget)
    try {
      const apiBase = getNodeApiBase()
      await axios.post(`${apiBase}/auth/logout`, {}, {
        headers: token() ? { Authorization: `Bearer ${token()}` } : {},
        timeout: 2000
      }).catch(() => {})
    } catch (e) {}

    // ล้างข้อมูลและ Session ทั้งหมดในเครื่อง
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem(FARM_KEY)
      sessionStorage.clear()
    }
    me.value = null
    user.value = null
    farmId.value = ''
    doneActions.value = []
    loaded.value = false
    await navigateTo('/login?logout=success')
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
    currentBackendUrl.value = getNodeApiBase()
    return true
  }

  // ตัวทดสอบการเชื่อมต่อไปยัง URL หลังบ้าน
  const testBackend = async (targetUrl) => {
    const cleanUrl = String(targetUrl || '').trim().replace(/\/+$/, '')
    if (!cleanUrl) return { success: false, message: 'กรุณากรอก URL' }
    const startTime = Date.now()

    try {
      let res = null
      try {
        res = await axios.get(`${cleanUrl}/farmer/ping`, { timeout: 4000 })
      } catch (e1) {
        try {
          res = await axios.get(`${cleanUrl}/ping`, { timeout: 4000 })
        } catch (e2) {
          res = await axios.get(`${cleanUrl}/`, { timeout: 4000 })
        }
      }
      const latency = Date.now() - startTime
      return { 
        success: true, 
        latency, 
        message: `เชื่อมต่อสำเร็จ! ความเร็ว ${latency} ms`, 
        data: res?.data 
      }
    } catch (err) {
      return { 
        success: false, 
        latency: 0, 
        message: `เชื่อมต่อไม่สำเร็จ: ${err.message}` 
      }
    }
  }

  // เปลี่ยน URL หลังบ้านที่เชื่อมต่อ
  const switchBackend = async (newUrl) => {
    setCustomNodeApi(newUrl)
    currentBackendUrl.value = getNodeApiBase()
    await refresh()
  }

  // GET /api/farmer/<path>
  const request = async (path, params = {}) => {
    try {
      const apiBase = getNodeApiBase()
      const res = await axios.get(`${apiBase}/farmer/${path}`, {
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
      const apiBase = getNodeApiBase()
      const res = await axios.post(`${apiBase}/farmer/${path}`, body, {
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

  // ปรับข้อมูลที่ได้รับจากหลังบ้าน (รองรับทั้งระบบเราและหลังบ้านของเพื่อน)
  const normalizeData = (d) => {
    if (!d) return null
    if (!d.farm && d.farm_id) d.farm = { id: d.farm_id, name: d.farm_name || 'ฟาร์มโคนม' }

    // กรณีหลังบ้านเพื่อนส่งฟิลด์ชื่อ temp หรือ temperature
    if (!d.now && (d.temperature != null || d.temperature_c != null || d.temp != null)) {
      const t = Number(d.temperature_c ?? d.temperature ?? d.temp)
      const h = Number(d.humidity_pct ?? d.humidity ?? d.hum ?? 70)
      d.now = {
        temperature_c: t,
        humidity_pct: h,
        thi: d.thi ?? null,
        risk_level: d.risk_level ?? 'normal',
        minutes_ago: d.minutes_ago ?? 0,
        sensor_status: d.sensor_status ?? 'online'
      }
    }

    // สังเคราะห์ senior summary อัตโนมัติหากหลังบ้านเพื่อนไม่มีฟิลด์นี้
    if (!d.senior && d.now) {
      const risk = d.now.risk_level || 'normal'
      const isSevere = risk === 'severe'
      const isMod = risk === 'moderate' || risk === 'mild'
      d.senior = {
        level: isSevere ? 'danger' : (isMod ? 'warning' : 'good'),
        title: isSevere ? 'อากาศร้อนจัดมาก แม่วัวกำลังเครียด!' : (isMod ? 'อากาศเริ่มร้อนขึ้นแล้ว ระวังแม่วัวหอบ' : 'อากาศสบายดี แม่วัวไม่เครียด'),
        message: isSevere ? 'อุณหภูมิและความชื้นสูงมาก เสี่ยงน้ำนมดิ่ง รีบเปิดพัดลมและสเปรย์น้ำด่วน' : (isMod ? 'ความร้อนสะสมเริ่มเพิ่มขึ้น แนะนำเปิดพัดลมระบายอากาศ' : 'สภาพอากาศในคอกเหมาะสมดี แม่วัวเคี้ยวเอื้องสบาย'),
        voice_text: `สวัสดีจ้า ตอนนี้ในคอกวัว อุณหภูมิ ${d.now.temperature_c} องศาเซลเซียส ความชื้น ${Math.round(d.now.humidity_pct)} เปอร์เซ็นต์ ${isSevere ? 'อากาศร้อนจัด' : 'สบายดีจ้า'}`,
        vet_phone: d.farm?.vet_phone || null,
        vet_name: 'สัตวแพทย์ประจำฟาร์ม',
        action_templates: [
          { id: 'fan', title: 'เปิดพัดลมในคอก', desc: 'ช่วยระบายอากาศร้อน ไม่ให้อากาศอับ', icon: 'mdi-fan' },
          { id: 'water_spray', title: 'เปิดละอองน้ำ / สปริงเกลอร์', desc: 'พ่นละอองน้ำเป็นรอบๆ ช่วยลดอุณหภูมิร่างกายวัว', icon: 'mdi-sprinkler-variant' },
          { id: 'fresh_water', title: 'เติมน้ำสะอาดให้เต็มราง', desc: 'แม่วัวกินน้ำเยอะขึ้นเมื่ออากาศร้อน ดื่มน้ำลดเครียด', icon: 'mdi-cup-water' },
          { id: 'check_cow', title: 'สังเกตอาการแม่วัว (ไม่หอบ)', desc: 'ตรวจดูว่ามีตัวไหนยืนหอบ อ้าปาก หรือน้ำลายยืดหรือไม่', icon: 'mdi-cow' }
        ]
      }
    }
    return d
  }

  const refresh = async () => {
    if (!token()) return
    loading.value = true
    try {
      const [d, acts] = await Promise.all([
        request('me'),
        request('actions').catch(() => ({ done_actions: [] }))
      ])
      me.value = normalizeData(d)
      doneActions.value = acts?.done_actions || []
      if (d?.farm?.id && d.farm.id !== farmId.value) farmId.value = d.farm.id
      error.value = ''
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        error.value = 'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสัญญาณเน็ตหรือ URL หลังบ้าน'
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
    currentBackendUrl,
    testBackend,
    switchBackend,
    getKnownBackends,
    doneActions,
    toggleAction,
    ensureAuth,
    refresh,
    request,
    postRequest,
    selectFarm,
    logout,
    showLogoutModal,
    openLogoutModal,
    cancelLogout,
    confirmLogout,
    startPolling,
    stopPolling
  }
}
