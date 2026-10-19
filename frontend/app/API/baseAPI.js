/**
 * CowCare AI - Base API Configuration
 * รองรับการดึงค่า Environment Variables ทั้งฝั่ง Browser (import.meta.env), Nuxt RuntimeConfig และ SSR (process.env)
 */

const resolveEnvNodeApi = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.NUXT_PUBLIC_NODE_API_BASE) {
    return String(import.meta.env.NUXT_PUBLIC_NODE_API_BASE).replace(/\/+$/, '')
  }
  if (typeof process !== 'undefined' && process.env?.NUXT_PUBLIC_NODE_API_BASE) {
    return String(process.env.NUXT_PUBLIC_NODE_API_BASE).replace(/\/+$/, '')
  }
  return 'http://localhost:4001/api'
}

const resolveEnvFastApi = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.NUXT_PUBLIC_API_BASE) {
    return String(import.meta.env.NUXT_PUBLIC_API_BASE).replace(/\/+$/, '')
  }
  if (typeof process !== 'undefined' && process.env?.NUXT_PUBLIC_API_BASE) {
    return String(process.env.NUXT_PUBLIC_API_BASE).replace(/\/+$/, '')
  }
  return 'http://localhost:8000'
}

export const getNodeApiBase = () => {
  try {
    const config = useRuntimeConfig()
    if (config?.public?.nodeApiBase) {
      return String(config.public.nodeApiBase).replace(/\/+$/, '')
    }
  } catch (e) {
    // Outside Nuxt setup context
  }
  return resolveEnvNodeApi()
}

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
