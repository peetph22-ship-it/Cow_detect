/**
 * รัน YOLO (โมเดลเดียวกับ server) ในเบราว์เซอร์ สำหรับตรวจจับจากวิดีโอในหน้า simulation
 * ขั้นตอนตรงกับ backend_node/app/services/visionWorker.js + visionPostprocess.js:
 * letterbox สีเทา 114 -> RGB CHW 0–1 -> output0 [1, 4+nc, N] -> NMS ไม่ดูคลาส -> กรอบเป็นสัดส่วน 0–1 ของภาพจริง
 * ต่างจาก server เล็กน้อยตรงวิธีย่อภาพ (canvas ของเบราว์เซอร์ vs sharp) ผลจึงอาจต่างกันเล็กน้อย
 */
// โหลด onnxruntime-web จาก CDN ตอนใช้งานเท่านั้น ไม่รวมใน build:
// ไฟล์ wasm ของมัน (~27MB) เกินขนาดไฟล์สูงสุดของ Cloudflare Pages (25MB) ทำให้ deploy ไม่ผ่าน
const ORT_DIR = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/'
let ortPromise: Promise<any> | null = null
const loadOrt = () => {
  if (!ortPromise) {
    ortPromise = import(/* @vite-ignore */ `${ORT_DIR}ort.min.mjs`).then((ort) => {
      ort.env.wasm.wasmPaths = ORT_DIR
      return ort
    }).catch((err) => { ortPromise = null; throw err })
  }
  return ortPromise
}

export interface ModelInfo {
  file: string
  sha256: string | null
  parts: string[]
  imgsz: number
  class_names: string[]
  detect_opts: { conf: number; iouThr: number; agnostic: boolean }
}
export interface Box { cls: string; score: number; x1: number; y1: number; x2: number; y2: number }

const CACHE = 'cowcare-yolo-model'

const fetchWithProgress = async (url: string, onBytes: (n: number) => void): Promise<Uint8Array> => {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`ดาวน์โหลดโมเดลไม่สำเร็จ (${res.status})`)
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    onBytes(value.length)
  }
  return concat(chunks)
}
const concat = (chunks: Uint8Array[]) => {
  const out = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0))
  let o = 0
  for (const c of chunks) { out.set(c, o); o += c.length }
  return out
}
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')

/**
 * โหลดโมเดล (ครั้งแรกดาวน์โหลด ~82MB แล้วเก็บใน Cache Storage ครั้งต่อไปไม่ต้องโหลดใหม่)
 * @returns session + execution provider ที่ใช้ได้จริง ('webgpu' เร็วกว่า ถ้าเครื่องไม่รองรับใช้ 'wasm')
 */
export const loadModel = async (info: ModelInfo, onProgress: (loadedBytes: number, cached: boolean) => void) => {
  const key = `/model/${info.file}/${info.sha256 || 'nohash'}`
  let bytes: Uint8Array | null = null
  let cache: Cache | null = null
  try {
    cache = await caches.open(CACHE)
    const hit = await cache.match(key)
    if (hit) { bytes = new Uint8Array(await hit.arrayBuffer()); onProgress(bytes.length, true) }
  } catch { cache = null }   // บางเบราว์เซอร์/โหมดส่วนตัวไม่มี Cache Storage: โหลดใหม่ทุกครั้ง

  if (!bytes) {
    let loaded = 0
    const parts: Uint8Array[] = []
    for (const url of info.parts) parts.push(await fetchWithProgress(url, (n) => { loaded += n; onProgress(loaded, false) }))
    bytes = concat(parts)
    if (info.sha256 && crypto?.subtle) {
      const got = hex(await crypto.subtle.digest('SHA-256', bytes))
      if (got !== info.sha256) throw new Error('ไฟล์โมเดลที่ดาวน์โหลดไม่ตรงกับ checksum')
    }
    try { await cache?.put(key, new Response(bytes)) } catch { /* พื้นที่ cache ไม่พอ: ใช้ต่อได้ แค่ไม่จำ */ }
  }

  const ort = await loadOrt()
  for (const ep of ['webgpu', 'wasm']) {
    try {
      const session = await ort.InferenceSession.create(bytes, { executionProviders: [ep] })
      return { session, provider: ep }
    } catch (err) {
      if (ep === 'wasm') throw err
    }
  }
  throw new Error('สร้างโมเดลไม่สำเร็จ')
}

const iou = (a: any, b: any) => {
  const w = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1))
  const h = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1))
  const inter = w * h
  const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter
  return union > 0 ? inter / union : 0
}

/**
 * ตรวจจับ 1 เฟรม จากวิดีโอ/ภาพ/canvas
 * @param canvas canvas ขนาด imgsz × imgsz สำหรับใช้ซ้ำ
 */
export const detectFrame = async (session: any, source: CanvasImageSource & { videoWidth?: number; videoHeight?: number; width?: number; height?: number }, info: ModelInfo, canvas: HTMLCanvasElement): Promise<Box[]> => {
  const S = info.imgsz
  const W = (source.videoWidth || source.width) as number
  const H = (source.videoHeight || source.height) as number
  const scale = Math.min(S / W, S / H)
  const dw = W * scale
  const dh = H * scale
  const px = (S - dw) / 2
  const py = (S - dh) / 2
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = 'rgb(114,114,114)'
  ctx.fillRect(0, 0, S, S)
  ctx.drawImage(source, px, py, dw, dh)
  const { data } = ctx.getImageData(0, 0, S, S)
  const plane = S * S
  const chw = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    chw[i] = data[i * 4] / 255
    chw[plane + i] = data[i * 4 + 1] / 255
    chw[2 * plane + i] = data[i * 4 + 2] / 255
  }
  const ort = await loadOrt()
  const out = await session.run({ images: new ort.Tensor('float32', chw, [1, 3, S, S]) })
  const o = out.output0 ?? out[session.outputNames[0]]
  const d = o.data as Float32Array
  const nc = o.dims[1] - 4
  const n = o.dims[2]
  const { conf, iouThr, agnostic } = info.detect_opts

  const cands: any[] = []
  for (let i = 0; i < n; i++) {
    let best = -1
    let score = 0
    for (let c = 0; c < nc; c++) {
      const s = d[(4 + c) * n + i]
      if (s > score) { score = s; best = c }
    }
    if (score < conf) continue
    const cx = d[i], cy = d[n + i], w = d[2 * n + i], h = d[3 * n + i]
    cands.push({ cls: best, score, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 })
  }
  cands.sort((a, b) => b.score - a.score)
  const kept: any[] = []
  for (const c of cands) {
    if (kept.length >= 300) break
    if (kept.some(k => (agnostic || k.cls === c.cls) && iou(k, c) > iouThr)) continue
    kept.push(c)
  }
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return kept.map(k => ({
    cls: info.class_names[k.cls],
    score: k.score,
    x1: clamp((k.x1 - px) / scale / W),
    y1: clamp((k.y1 - py) / scale / H),
    x2: clamp((k.x2 - px) / scale / W),
    y2: clamp((k.y2 - py) / scale / H)
  }))
}
