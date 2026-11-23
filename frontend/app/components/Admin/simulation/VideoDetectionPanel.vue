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
          <option :value="10">10 วินาที</option>
          <option :value="30">30 วินาที</option>
          <option :value="60">60 วินาที (เท่ากล้องจริง)</option>
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
    <!-- วิดีโอแนวตั้ง (กล้องมองลงจากเพดาน) สูงไม่เกิน 70% ของจอ จะได้เห็นและคลิกวัวได้ครบโดยไม่ต้องเลื่อน -->
    <div v-show="videoUrl" class="rounded-2xl overflow-hidden bg-black">
     <div class="relative mx-auto w-fit max-w-full">
      <video ref="videoEl" :src="videoUrl" class="block max-w-full max-h-[70vh] w-auto h-auto" controls muted playsinline preload="auto" @timeupdate="onTime" @seeked="onTime" @loadedmetadata="onMeta" @error="onVideoError"></video>
      <!-- กรอบวัวทุกตัว: เลขประจำตัวคงที่ทั้งวิดีโอ คลิกกรอบเพื่อเลือกวัวเป้าหมาย -->
      <div class="absolute inset-0 pointer-events-none">
        <div v-for="b in labeledBoxes" :key="b.id" class="absolute rounded-sm"
          :class="canPick ? 'pointer-events-auto cursor-pointer hover:bg-white/20' : ''"
          :title="canPick ? `เลือกวัว #${b.id} เป็นเป้าหมาย` : ''"
          :style="{ left: b.x1 * 100 + '%', top: b.y1 * 100 + '%', width: (b.x2 - b.x1) * 100 + '%', height: (b.y2 - b.y1) * 100 + '%',
                    border: `${b.isTarget ? 4 : 2}px solid ${b.isTarget ? '#facc15' : CLASS[key(b.cls)].color}`, opacity: target && !b.isTarget ? 0.55 : 1 }"
          @click.stop="pickBox(b)">
          <span class="absolute -top-[18px] left-[-2px] px-1 rounded-t text-[10px] font-bold whitespace-nowrap"
            :style="{ background: b.isTarget ? '#facc15' : CLASS[key(b.cls)].color, color: b.isTarget ? '#24433a' : '#fff' }">
            {{ b.isTarget ? '🎯 ' : '' }}#{{ b.id }} {{ CLASS[key(b.cls)].th }} {{ b.score.toFixed(2) }}
          </span>
        </div>
      </div>
      <div v-if="targetBanner" class="absolute top-2 left-2 pointer-events-none">
        <span class="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold" :class="targetBanner.cls">{{ targetBanner.text }}</span>
      </div>
     </div>
    </div>

    <!-- เลือกวัวเป้าหมาย 1 ตัว: คลิกกรอบบนวิดีโอ หรือกดเลขวัวด้านล่าง -->
    <div v-if="frames.length && !analysing" class="flex flex-wrap items-center gap-2">
      <span class="text-xs font-bold text-[#24433a]">
        <v-icon icon="mdi-target" size="15" class="text-amber-500" />
        {{ target ? `กำลังติดตามวัว #${target.cowId} · เลือกตัวอื่นได้:` : '4. เลือกวัวเป้าหมาย (คลิกกรอบบนวิดีโอ หรือกดเลข):' }}
      </span>
      <button v-for="b in chipBoxes" :key="b.id" type="button"
        class="px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer"
        :class="b.isTarget ? 'bg-[#facc15] border-[#eab308] text-[#24433a]' : 'bg-white border-[#e5ece9] text-[#24433a] hover:border-[#24433a]/40'"
        @click="pickBox(b)">#{{ b.id }} {{ CLASS[key(b.cls)].th }}</button>
      <span v-if="!chipBoxes.length" class="text-[11px] text-amber-700">เฟรมนี้ไม่มีกรอบวัว เลื่อนวิดีโอไปเฟรมอื่น</span>
      <span class="w-full text-[10px] text-[#718078]">เลขวัว (#) คงที่ทั้งวิดีโอ ช่วยให้รู้ว่าตัวไหนเป็นตัวไหน · ระบบติดตามจากเฟรมที่เลือกไปจนจบวิดีโอด้วยวิธีเดียวกับ server</span>
    </div>
    <TargetCowReview v-if="target" :target="target" :duration="duration" :current-t="currentTime" :reviews="reviews" :video-name="videoName"
      @seek="seekTo" @review="(k, v) => (reviews = { ...reviews, [k]: v })" @import-reviews="(m) => (reviews = { ...reviews, ...m })" @clear="clearTarget" />

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
      ย่อภาพแบบยืดเหมือน server · การติดตามวัวเป้าหมายใช้โค้ดชุดเดียวกับ server (เทสต์อัตโนมัติยืนยันว่าผลตรงกัน) ·
      วิดีโอตรวจถี่กว่ากล้องจริง ถ้าอยากเห็นผลแบบหน้างานให้ตรวจทุก 60 วินาที
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'
import { trackTarget, buildBouts } from '~/utils/cowTracking'
import { assignCowIds } from '~/utils/cowIds'
import TargetCowReview from '~/components/Admin/simulation/TargetCowReview.vue'

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
  clearTarget()
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
  clearTarget()
  analysedStep.value = stepSec.value
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
  return Math.abs(best.t - currentTime.value) <= analysedStep.value / 2 + 0.05 ? best : null
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

// ---------- ติดตามวัวเป้าหมาย 1 ตัว (โค้ดเดียวกับ server: utils/cowTracking.js สร้างจาก backend) ----------
// เวลาในวิดีโอ (วินาที) -> เวลาสมมติ ให้ฟังก์ชันของ server ใช้ได้ตรง ๆ
const T_BASE = Date.UTC(2000, 0, 1)
const toIso = (t) => new Date(T_BASE + Math.round(t * 1000)).toISOString()
const toSec = (iso) => (Date.parse(iso) - T_BASE) / 1000
const analysedStep = ref(1)
const target = ref(null)
const reviews = ref({})

const clearTarget = () => { target.value = null; reviews.value = {} }
const canPick = computed(() => frames.value.length > 0 && !analysing.value)
const seekTo = (t) => { if (videoEl.value) videoEl.value.currentTime = Math.max(0, Math.min(t, duration.value)) }

const pickBox = (b) => {
  if (!canPick.value || !currentFrame.value) return
  videoEl.value?.pause()
  const seedT = currentFrame.value.t
  const fr = frames.value.filter(f => f.t >= seedT - 1e-6).map(f => ({ observedAt: toIso(f.t), boxes: f.boxes }))
  const res = trackTarget(fr, { box: b, at: fr[0].observedAt })
  const { bouts } = buildBouts(res.observations, { intervalSec: analysedStep.value })
  target.value = {
    cowId: b.id,
    seedT,
    step: analysedStep.value,
    lostAt: res.lostAt ? toSec(res.lostAt) : null,
    observations: res.observations.map(o => ({ t: toSec(o.observedAt), behavior: o.behavior, box: o.box, matchScore: o.matchScore })),
    bouts: bouts.map(x => ({ behavior: x.behavior, start: toSec(x.start), end: toSec(x.end) }))
  }
  reviews.value = {}
}

const currentObs = computed(() => {
  if (!target.value || !currentFrame.value) return null
  return target.value.observations.find(o => Math.abs(o.t - currentFrame.value.t) < 1e-3) || null
})
const sameBox = (a, b) => a && b && a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2
// เลขชั่วคราวเรียงซ้ายไปขวาในเฟรมนี้ ช่วยเลือกตัว (ไม่ใช่เลขประจำตัววัว)
// เลขวัวคงที่ทั้งวิดีโอ (utils/cowIds.js) คำนวณครั้งเดียวหลังวิเคราะห์
const cowIds = computed(() => (analysing.value ? [] : assignCowIds(frames.value)))
const labeledBoxes = computed(() => {
  const i = currentFrame.value ? frames.value.indexOf(currentFrame.value) : -1
  return currentBoxes.value.map((b, j) => ({ ...b, id: cowIds.value[i]?.[j] ?? j + 1, isTarget: sameBox(b, currentObs.value?.box) }))
})
const chipBoxes = computed(() => [...labeledBoxes.value].sort((a, b) => a.id - b.id))
const targetBanner = computed(() => {
  const tg = target.value
  if (!tg || !currentFrame.value) return null
  const t = currentFrame.value.t
  if (t < tg.seedT - 1e-6) return { text: 'ก่อนเฟรมที่เลือกวัว', cls: 'bg-white/85 text-[#4e6057]' }
  if (tg.lostAt != null && t >= tg.lostAt - 1e-6) return { text: 'หลุดการติดตาม', cls: 'bg-rose-600 text-white' }
  if (currentObs.value?.behavior === 'not_visible') return { text: 'ไม่เห็นวัวเป้าหมายในเฟรมนี้', cls: 'bg-amber-400 text-[#24433a]' }
  return null
})

onBeforeUnmount(() => { cancelled.value = true; if (videoUrl.value) URL.revokeObjectURL(videoUrl.value) })
</script>
