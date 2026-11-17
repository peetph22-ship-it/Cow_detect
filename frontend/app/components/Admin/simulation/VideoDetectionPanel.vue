<template>
  <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-5">
    <div class="flex items-center gap-3.5 pb-4 border-b border-[#e5ece9]">
      <div class="w-12 h-12 rounded-2xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center shrink-0">
        <v-icon icon="mdi-movie-search-outline" size="26" />
      </div>
      <div>
        <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight">ตรวจจับพฤติกรรมจากวิดีโอ</h3>
        <p class="text-xs text-[#718078] font-medium">ใช้โมเดล YOLO26m ตัวเดียวกับระบบจริง รันในเบราว์เซอร์ วิดีโอไม่ถูกส่งออกจากเครื่อง</p>
      </div>
    </div>

    <!-- 1) โมเดล -->
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" :disabled="modelState === 'loading' || modelState === 'ready'"
        class="px-4 py-2 rounded-xl text-xs font-bold bg-[#24433a] text-white hover:bg-[#1C362B] cursor-pointer disabled:opacity-50 disabled:cursor-default flex items-center gap-1.5"
        @click="prepareModel">
        <v-icon icon="mdi-download" size="16" />
        {{ modelState === 'ready' ? 'โมเดลพร้อมแล้ว' : modelState === 'loading' ? 'กำลังโหลดโมเดล...' : '1. โหลดโมเดล (~82 MB ครั้งแรก)' }}
      </button>
      <span v-if="modelState === 'loading'" class="text-xs text-[#718078]">{{ modelProgressText }}</span>
      <span v-if="modelState === 'ready'" class="text-xs text-emerald-700 font-bold">ใช้ {{ provider === 'webgpu' ? 'การ์ดจอ (WebGPU)' : 'CPU (WebAssembly)' }}{{ modelCached ? ' · โหลดจากเครื่อง' : '' }}</span>
      <span v-if="modelError" class="text-xs text-rose-600 font-bold">{{ modelError }}</span>
    </div>

    <!-- 2) วิดีโอ + ตั้งค่า -->
    <div class="flex flex-wrap items-center gap-3">
      <label class="px-4 py-2 rounded-xl text-xs font-bold border border-[#e5ece9] bg-white text-[#24433a] hover:border-[#24433a]/40 cursor-pointer flex items-center gap-1.5">
        <v-icon icon="mdi-file-video-outline" size="16" />2. เลือกไฟล์วิดีโอ
        <input type="file" accept="video/*" class="hidden" @change="onFile" />
      </label>
      <span v-if="videoName" class="text-xs text-[#4e6057] font-medium truncate max-w-[220px]">{{ videoName }}</span>
      <span v-if="videoError" class="w-full text-xs text-rose-600 font-bold">{{ videoError }}</span>
      <label class="text-xs font-bold text-[#4e6057] flex items-center gap-1.5">ตรวจทุก
        <select v-model.number="stepSec" class="h-8 px-2 rounded-lg bg-[#f0f4f2] text-xs font-bold border-0 outline-none">
          <option :value="0.5">0.5 วินาที</option>
          <option :value="1">1 วินาที</option>
          <option :value="2">2 วินาที</option>
          <option :value="5">5 วินาที</option>
        </select>
      </label>
      <button type="button" :disabled="!canAnalyse"
        class="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-white hover:bg-[#0e9f70] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        @click="analyse">
        <v-icon icon="mdi-play-circle-outline" size="16" />3. วิเคราะห์วิดีโอ
      </button>
      <button v-if="analysing" type="button" class="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer" @click="cancelled = true">หยุด</button>
    </div>

    <div v-if="analysing || frames.length" class="space-y-1">
      <div class="h-2 rounded-full bg-[#f0f4f2] overflow-hidden">
        <div class="h-full bg-[#10b981] transition-all" :style="{ width: progressPct + '%' }"></div>
      </div>
      <p class="text-[11px] text-[#718078]">
        วิเคราะห์แล้ว {{ frames.length }} / {{ totalFrames }} เฟรม
        <template v-if="msPerFrame"> · เฟรมละ ~{{ (msPerFrame / 1000).toFixed(1) }} วินาที</template>
        <template v-if="analysing && msPerFrame"> · เหลืออีกประมาณ {{ Math.ceil((totalFrames - frames.length) * msPerFrame / 1000) }} วินาที</template>
      </p>
    </div>

    <!-- วิดีโอ + กรอบ -->
    <div v-show="videoUrl" class="relative w-full rounded-2xl overflow-hidden bg-black">
      <video ref="videoEl" :src="videoUrl" class="w-full h-auto block" controls muted playsinline preload="auto" @timeupdate="onTime" @seeked="onTime" @loadedmetadata="onMeta" @error="onVideoError"></video>
      <div class="absolute inset-0 pointer-events-none">
        <div v-for="(b, i) in currentBoxes" :key="i" class="absolute rounded-sm"
          :style="{ left: b.x1 * 100 + '%', top: b.y1 * 100 + '%', width: (b.x2 - b.x1) * 100 + '%', height: (b.y2 - b.y1) * 100 + '%', border: `2px solid ${CLASS[key(b.cls)].color}` }">
          <span class="absolute -top-[17px] left-[-2px] px-1 rounded-t text-[10px] font-bold text-white whitespace-nowrap" :style="{ background: CLASS[key(b.cls)].color }">
            {{ CLASS[key(b.cls)].th }} {{ b.score.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <!-- จำนวนแต่ละคลาสของเฟรมปัจจุบัน -->
    <div v-if="frames.length" class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      <div v-for="k in CLASS_KEYS" :key="k" class="rounded-2xl p-3 border text-center" :style="{ background: CLASS[k].color + '10', borderColor: CLASS[k].color + '40' }">
        <span class="text-xs font-bold block" :style="{ color: CLASS[k].color }">{{ CLASS[k].th }} ({{ k }})</span>
        <span class="text-xl font-black text-[#24433a]">{{ currentCounts[k] }}</span>
        <span class="text-[11px] text-[#718078] block">ตัว ณ วินาทีที่ {{ currentFrame ? currentFrame.t.toFixed(1) : '-' }}</span>
      </div>
    </div>

    <!-- กราฟจำนวนแต่ละคลาสตลอดวิดีโอ -->
    <div v-if="frames.length > 1" class="space-y-1">
      <h4 class="text-sm font-black text-[#24433a]">จำนวนวัวแต่ละท่าตลอดวิดีโอ</h4>
      <ClientOnly>
        <ApexChart type="area" height="260" :options="chartOptions" :series="chartSeries" />
      </ClientOnly>
    </div>

    <p class="text-[11px] text-[#718078] leading-relaxed">
      ความแม่นของโมเดลบนชุดทดสอบสาธารณะ: mAP50 72% (กิน 93% · ยืน 80% · นอน 79% · ดื่ม 37%) ยังไม่ได้วัดกับภาพคอกในไทย ·
      ผลอาจต่างจาก server เล็กน้อยเพราะเบราว์เซอร์ย่อภาพคนละวิธี · ไม่มีการติดตามวัวข้ามเฟรมในส่วนนี้ (นับต่อเฟรม)
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'

// อ่าน API base ตอน setup เท่านั้น
const Admin = `${getNodeApiBase()}/Admin`

const CLASS = {
  standing: { th: 'ยืน', color: '#f97316' },
  lying: { th: 'นอน', color: '#3b82f6' },
  feeding: { th: 'กิน', color: '#10b981' },
  drinking: { th: 'ดื่ม', color: '#06b6d4' }
}
const CLASS_KEYS = ['standing', 'lying', 'feeding', 'drinking']
const key = (cls) => (cls === 'lying down' ? 'lying' : cls)

const modelState = ref('idle')   // idle | loading | ready
const modelError = ref('')
const modelLoaded = ref(0)
const modelCached = ref(false)
const provider = ref('')
let yolo = null      // { session, info, detectFrame }

const videoEl = ref(null)
const videoUrl = ref('')
const videoName = ref('')
const duration = ref(0)
const stepSec = ref(1)
const frames = ref([])   // [{ t, boxes }]
const analysing = ref(false)
const cancelled = ref(false)
const msPerFrame = ref(0)
const currentTime = ref(0)

const modelProgressText = computed(() => modelCached.value ? 'โหลดจากเครื่อง...' : `${(modelLoaded.value / 1048576).toFixed(1)} MB`)
const canAnalyse = computed(() => modelState.value === 'ready' && videoUrl.value && duration.value > 0 && !analysing.value)
const totalFrames = computed(() => (duration.value ? Math.floor(duration.value / stepSec.value) + 1 : 0))
const progressPct = computed(() => (totalFrames.value ? Math.min(100, frames.value.length / totalFrames.value * 100) : 0))

const prepareModel = async () => {
  modelState.value = 'loading'
  modelError.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${Admin}/vision/model`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    // โหลด onnxruntime เฉพาะตอนใช้ หน้าอื่นไม่ต้องโหลด
    const { loadModel, detectFrame } = await import('~/utils/browserYolo')
    const { session, provider: ep } = await loadModel(res.data, (n, cached) => { modelLoaded.value = n; modelCached.value = cached })
    yolo = { session, info: res.data, detectFrame }
    provider.value = ep
    modelState.value = 'ready'
  } catch (err) {
    console.error('[VideoDetection] load model failed:', err)
    modelState.value = 'idle'
    modelError.value = err.response?.data?.message || err.message || String(err) || 'โหลดโมเดลไม่สำเร็จ'
  }
}

const onFile = (e) => {
  const f = e.target.files?.[0]
  if (!f) return
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value)
  videoUrl.value = URL.createObjectURL(f)
  videoName.value = f.name
  frames.value = []
  duration.value = 0
}
const onMeta = () => { duration.value = videoEl.value?.duration || 0; videoError.value = '' }
// เช่น MP4 แบบ MPEG-4 Part 2 ที่ Chrome เปิดไม่ได้
const videoError = ref('')
const onVideoError = () => {
  if (!videoUrl.value) return
  duration.value = 0
  videoError.value = 'เบราว์เซอร์เปิดไฟล์วิดีโอนี้ไม่ได้ ลองใช้ไฟล์ MP4 (H.264) หรือ WebM เช่น วิดีโอจากมือถือ'
}
const onTime = () => { currentTime.value = videoEl.value?.currentTime || 0 }

const seek = (v, t) => new Promise((resolve) => {
  const done = () => { v.removeEventListener('seeked', done); resolve() }
  v.addEventListener('seeked', done)
  v.currentTime = t
})

const analyse = async () => {
  const v = videoEl.value
  if (!v || !yolo) return
  analysing.value = true
  cancelled.value = false
  frames.value = []
  v.pause()
  const canvas = document.createElement('canvas')
  try {
    for (let i = 0; i < totalFrames.value && !cancelled.value; i++) {
      const t = Math.min(i * stepSec.value, Math.max(0, duration.value - 0.05))
      await seek(v, t)
      const t0 = performance.now()
      const boxes = await yolo.detectFrame(yolo.session, v, yolo.info, canvas)
      const ms = performance.now() - t0
      msPerFrame.value = msPerFrame.value ? msPerFrame.value * 0.7 + ms * 0.3 : ms
      frames.value = [...frames.value, { t, boxes }]
    }
  } catch (err) {
    modelError.value = `วิเคราะห์ไม่สำเร็จ: ${err.message}`
  } finally {
    analysing.value = false
    await seek(v, 0)
  }
}

// เฟรมที่วิเคราะห์ไว้ใกล้เวลาปัจจุบันที่สุด (ไม่เกินครึ่งช่วง)
const currentFrame = computed(() => {
  if (!frames.value.length) return null
  let best = null
  for (const f of frames.value) if (!best || Math.abs(f.t - currentTime.value) < Math.abs(best.t - currentTime.value)) best = f
  return Math.abs(best.t - currentTime.value) <= stepSec.value / 2 + 0.05 ? best : null
})
const currentBoxes = computed(() => currentFrame.value?.boxes || [])
const countOf = (boxes) => Object.fromEntries(CLASS_KEYS.map(k => [k, boxes.filter(b => key(b.cls) === k).length]))
const currentCounts = computed(() => countOf(currentBoxes.value))

const chartSeries = computed(() => CLASS_KEYS.map(k => ({
  name: CLASS[k].th,
  data: frames.value.map(f => [Number(f.t.toFixed(1)), countOf(f.boxes)[k]])
})))
const chartOptions = computed(() => ({
  chart: {
    fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false }, stacked: true,
    events: { click: (_e, _c, cfg) => { const f = frames.value[cfg.dataPointIndex]; if (f && videoEl.value) videoEl.value.currentTime = f.t } }
  },
  colors: CLASS_KEYS.map(k => CLASS[k].color),
  stroke: { curve: 'stepline', width: 1.5 },
  fill: { type: 'solid', opacity: 0.35 },
  dataLabels: { enabled: false },
  xaxis: { type: 'numeric', title: { text: 'วินาทีในวิดีโอ', style: { fontSize: '11px', color: '#718078' } }, labels: { formatter: (v) => Number(v).toFixed(0), style: { colors: '#718078' } } },
  yaxis: { title: { text: 'จำนวน (ตัว)', style: { fontSize: '11px', color: '#718078' } }, labels: { formatter: (v) => Math.round(v), style: { colors: '#718078' } } },
  annotations: { xaxis: currentFrame.value ? [{ x: Number(currentFrame.value.t.toFixed(1)), borderColor: '#24433a', strokeDashArray: 0 }] : [] },
  legend: { position: 'top', horizontalAlign: 'left' },
  tooltip: { shared: true, intersect: false, x: { formatter: (v) => `วินาทีที่ ${Number(v).toFixed(1)}` }, y: { formatter: (v) => `${v} ตัว` } },
  grid: { borderColor: '#f0f4f2', strokeDashArray: 4 }
}))

onBeforeUnmount(() => { cancelled.value = true; if (videoUrl.value) URL.revokeObjectURL(videoUrl.value) })
</script>
