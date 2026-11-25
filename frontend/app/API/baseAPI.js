/**
 * CowCare AI - Base API Configuration (รองรับเชื่อมต่อหลังบ้านเพื่อนและ Custom Endpoint)
 * รองรับการดึงค่า Environment Variables ทั้งฝั่ง Browser (import.meta.env), Nuxt RuntimeConfig, SSR (process.env)
 * และ LocalStorage สำหรับสลับไปชี้หลังบ้านของเพื่อนได้ทันทีโดยไม่ต้องแก้โค้ด!
 */

export const CUSTOM_API_KEY = 'custom_node_api'

// สลับไปหลังบ้านเพื่อนได้เฉพาะตอนเปิดหน้าเว็บจากเครื่องตัวเอง (localhost/วง LAN)
// บนเว็บจริงห้าม: ถ้าเกษตรกรถูกหลอกให้ใส่ URL อื่น รหัสผ่านและ token จะถูกส่งไปที่นั่น
export const canSwitchBackend = () => {
  if (typeof window === 'undefined') return false
  return /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(window.location.hostname)
}

const resolveEnvNodeApi = () => {
  if (typeof window !== 'undefined' && window.__NUXT__?.config?.public?.nodeApiBase) {
    return String(window.__NUXT__.config.public.nodeApiBase).replace(/\/+$/, '')
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.NUXT_PUBLIC_NODE_API_BASE) {
    return String(import.meta.env.NUXT_PUBLIC_NODE_API_BASE).replace(/\/+$/, '')
  }
  if (typeof process !== 'undefined' && process.env?.NUXT_PUBLIC_NODE_API_BASE) {
    return String(process.env.NUXT_PUBLIC_NODE_API_BASE).replace(/\/+$/, '')
  }
  return 'https://cow-detect-zea6.onrender.com/api'
}

export const getNodeApiBase = () => {
  // 1. ตรวจสอบว่าผู้ใช้หรือเกษตรกรตั้งค่าเชื่อมต่อหลังบ้านเพื่อนไว้ในเครื่องหรือไม่
  if (typeof window !== 'undefined') {
    const custom = canSwitchBackend() ? localStorage.getItem(CUSTOM_API_KEY) : null
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '')
    }
  }

  // 2. ถ้าไม่ได้ตั้งค่าเอง ให้ใช้ค่าจาก RuntimeConfig
  try {
    const config = useRuntimeConfig()
    if (config?.public?.nodeApiBase) {
      return String(config.public.nodeApiBase).replace(/\/+$/, '')
    }
  } catch (e) {
    // Outside Nuxt setup context
  }

  // 3. Fallback ค่าปริยาย
  return resolveEnvNodeApi()
}

export const setCustomNodeApi = (url) => {
  if (canSwitchBackend()) {
    if (url && url.trim()) {
      localStorage.setItem(CUSTOM_API_KEY, url.trim().replace(/\/+$/, ''))
    } else {
      localStorage.removeItem(CUSTOM_API_KEY)
    }
  }
}

export const getCustomNodeApi = () => {
  if (canSwitchBackend()) {
    return localStorage.getItem(CUSTOM_API_KEY) || ''
  }
  return ''
}

export const getKnownBackends = () => [
  { key: 'cloud', name: 'เซิร์ฟเวอร์หลัก (Cloud Render)', url: 'https://cow-detect-zea6.onrender.com/api', desc: 'ฐานข้อมูลออนไลน์กลาง' },
  { key: 'local', name: 'เครื่องนี้ (Localhost 4001)', url: 'http://localhost:4001/api', desc: 'รัน backend_node ในเครื่อง' },
  { key: 'friend', name: 'หลังบ้านของเพื่อน (IP / Tunnel)', url: '', desc: 'ใส่ IP เช่น http://192.168.1.50:4001/api หรือ Cloudflare Tunnel' }
]

const defaultNode = resolveEnvNodeApi()

export const api = defaultNode
export const base = defaultNode
export const Admin = `${defaultNode}/Admin`
