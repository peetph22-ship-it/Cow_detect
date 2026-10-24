/**
 * CowCare AI - Base API Configuration (รองรับเชื่อมต่อหลังบ้านเพื่อนและ Custom Endpoint)
 * รองรับการดึงค่า Environment Variables ทั้งฝั่ง Browser (import.meta.env), Nuxt RuntimeConfig, SSR (process.env)
 * และ LocalStorage สำหรับสลับไปชี้หลังบ้านของเพื่อนได้ทันทีโดยไม่ต้องแก้โค้ด!
 */

export const CUSTOM_API_KEY = 'custom_node_api'

/**
 * 🔒 ตรวจสอบความปลอดภัยของ Backend URL ป้องกัน SSRF, CRLF Injection และ Token Exfiltration
 * - อนุญาตเฉพาะ HTTP / HTTPS เท่านั้น (บล็อก javascript:, file:, data:)
 * - ห้ามมี whitespace หรือ newline ป้องกัน Header Injection
 * - อนุญาตเฉพาะ Localhost, วง LAN ปลอดภัย (RFC 1918) หรือ Trusted Domains
 */
export const isValidBackendUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return false
  const trimmed = urlStr.trim()
  if (/[\s\r\n]/.test(trimmed)) return false

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

    const host = parsed.hostname.toLowerCase()
    // Localhost & Loopback
    if (host === 'localhost' || host === '127.0.0.1') return true
    // LAN Private IP (RFC 1918)
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true
    // Trusted Production & Tunnel Domains
    if (
      host === 'cow-detect-zea6.onrender.com' ||
      host.endsWith('.onrender.com') ||
      host.endsWith('.trycloudflare.com') ||
      host.endsWith('.ngrok-free.app') ||
      host.endsWith('.ngrok.io')
    ) {
      return true
    }

    return false
  } catch {
    return false
  }
}

const resolveEnvNodeApi = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.NUXT_PUBLIC_NODE_API_BASE) {
    const envVal = String(import.meta.env.NUXT_PUBLIC_NODE_API_BASE).replace(/\/+$/, '')
    if (isValidBackendUrl(envVal)) return envVal
  }
  if (typeof process !== 'undefined' && process.env?.NUXT_PUBLIC_NODE_API_BASE) {
    const envVal = String(process.env.NUXT_PUBLIC_NODE_API_BASE).replace(/\/+$/, '')
    if (isValidBackendUrl(envVal)) return envVal
  }
  return 'https://cow-detect-zea6.onrender.com/api'
}

const resolveEnvFastApi = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.NUXT_PUBLIC_API_BASE) {
    const envVal = String(import.meta.env.NUXT_PUBLIC_API_BASE).replace(/\/+$/, '')
    if (isValidBackendUrl(envVal)) return envVal
  }
  if (typeof process !== 'undefined' && process.env?.NUXT_PUBLIC_API_BASE) {
    const envVal = String(process.env.NUXT_PUBLIC_API_BASE).replace(/\/+$/, '')
    if (isValidBackendUrl(envVal)) return envVal
  }
  return 'http://localhost:8000'
}

export const getNodeApiBase = () => {
  // 1. ตรวจสอบว่าผู้ใช้หรือเกษตรกรตั้งค่าเชื่อมต่อหลังบ้านเพื่อนไว้ในเครื่องหรือไม่ (ต้องผ่านการตรวจความปลอดภัย)
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(CUSTOM_API_KEY)
    if (custom && isValidBackendUrl(custom)) {
      return custom.trim().replace(/\/+$/, '')
    } else if (custom) {
      // ล้างค่าทิ้งทันทีหากเป็น URL ผิดรูปแบบหรือไม่ปลอดภัย
      localStorage.removeItem(CUSTOM_API_KEY)
    }
  }

  // 2. ถ้าไม่ได้ตั้งค่าเอง ให้ใช้ค่าจาก RuntimeConfig
  try {
    const config = useRuntimeConfig()
    if (config?.public?.nodeApiBase && isValidBackendUrl(config.public.nodeApiBase)) {
      return String(config.public.nodeApiBase).replace(/\/+$/, '')
    }
  } catch (e) {
    // Outside Nuxt setup context
  }

  // 3. Fallback ค่าปริยาย
  return resolveEnvNodeApi()
}

export const setCustomNodeApi = (url) => {
  if (typeof window !== 'undefined') {
    if (url && isValidBackendUrl(url)) {
      localStorage.setItem(CUSTOM_API_KEY, url.trim().replace(/\/+$/, ''))
    } else {
      localStorage.removeItem(CUSTOM_API_KEY)
    }
  }
}

export const getCustomNodeApi = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(CUSTOM_API_KEY) || ''
  }
  return ''
}

export const getKnownBackends = () => [
  { key: 'cloud', name: 'เซิร์ฟเวอร์หลัก (Cloud Render)', url: 'https://cow-detect-zea6.onrender.com/api', desc: 'ฐานข้อมูลออนไลน์กลาง' },
  { key: 'local', name: 'เครื่องนี้ (Localhost 4001)', url: 'http://localhost:4001/api', desc: 'รัน backend_node ในเครื่อง' },
  { key: 'friend', name: 'หลังบ้านของเพื่อน (IP / Tunnel)', url: '', desc: 'ใส่ IP เช่น http://192.168.1.50:4001/api หรือ Cloudflare Tunnel' }
]

export const getFastApiBase = () => {
  try {
    const config = useRuntimeConfig()
    if (config?.public?.apiBase) {
      return String(config.public.apiBase).replace(/\/+$/, '')
    }
  } catch (e) {
    // Outside Nuxt setup context
  }
  return resolveEnvFastApi()
}

const defaultNode = resolveEnvNodeApi()

export const api = defaultNode
export const base = defaultNode
export const Admin = `${defaultNode}/Admin`
