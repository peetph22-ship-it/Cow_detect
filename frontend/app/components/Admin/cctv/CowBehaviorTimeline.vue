<template>
  <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-5">

    <!-- หัวข้อ + เลือกวัน -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#e5ece9]">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-cow" size="26" />
        </div>
        <div>
          <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight">พฤติกรรมวัวรายตัว</h3>
          <p class="text-xs text-[#718078] font-medium">
            <template v-if="data?.cow">
              วัวหมายเลข {{ data.cow.tag_id || '-' }}<template v-if="data.cow.name"> ({{ data.cow.name }})</template> ·
            </template>
            นอน ยืน กิน ตลอดวัน จากภาพกล้อง เทียบกับ THI ในคอก
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 self-start lg:self-auto">
        <button type="button" class="w-9 h-9 rounded-xl bg-[#f0f4f2] text-[#24433a] hover:bg-[#e5ece9] flex items-center justify-center cursor-pointer" aria-label="วันก่อนหน้า" @click="shiftDay(-1)">
          <v-icon icon="mdi-chevron-left" size="20" />
        </button>
        <input v-model="date" type="date" :max="today" aria-label="เลือกวันที่"
          class="h-9 px-3 rounded-xl bg-[#f0f4f2] text-sm font-bold text-[#24433a] border-0 outline-none focus:ring-2 focus:ring-[#24433a]/20" />
        <button type="button" class="w-9 h-9 rounded-xl bg-[#f0f4f2] text-[#24433a] hover:bg-[#e5ece9] flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" aria-label="วันถัดไป" :disabled="date >= today" @click="shiftDay(1)">
          <v-icon icon="mdi-chevron-right" size="20" />
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="h-[260px] flex items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl animate-pulse">
      <v-icon icon="mdi-loading" size="24" class="animate-spin mr-2" />
      กำลังโหลดข้อมูล...
    </div>

    <div v-else-if="error" class="py-8 text-center text-sm font-bold text-rose-600 bg-rose-50 rounded-2xl">{{ error }}</div>

    <div v-else-if="!bouts.length" class="py-10 flex flex-col items-center justify-center text-center text-[#718078] bg-[#f8faf9] rounded-2xl">
      <v-icon icon="mdi-chart-timeline" size="44" class="text-[#a6b5aa] mb-2" />
      <p class="text-sm font-bold">{{ data?.note_th || 'ยังไม่มีข้อมูล' }}</p>
      <p v-if="!data?.cow" class="text-xs mt-1">เมื่อเริ่มติดตามวัวผ่านกล้อง กราฟจะแสดงที่นี่</p>
    </div>

    <template v-else>
      <!-- แถบเวลาของแต่ละท่า -->
      <ClientOnly>
        <ApexChart type="rangeBar" height="230" :options="timelineOptions" :series="timelineSeries" />
        <!-- THI วันเดียวกัน ใช้แกนเวลาเดียวกัน -->
        <ApexChart v-if="thiSeries[0].data.length" type="line" height="170" :options="thiOptions" :series="thiSeries" />
        <p v-else class="text-xs text-center text-[#718078] py-2">วันนี้ไม่มีข้อมูล THI จากเซ็นเซอร์</p>
        <template #fallback>
          <div class="h-[400px] flex items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl animate-pulse">กำลังโหลดกราฟ...</div>
        </template>
      </ClientOnly>

      <!-- การ์ดสรุปรายวัน -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div v-for="c in summaryCards" :key="c.key" class="rounded-2xl p-4 border" :style="{ background: c.color + '12', borderColor: c.color + '33' }">
          <div class="flex items-center gap-1.5 text-xs font-bold" :style="{ color: c.color }">
            <span class="w-2.5 h-2.5 rounded-full" :style="{ background: c.color }"></span>{{ c.label }}
          </div>
          <div class="text-base md:text-lg font-black text-[#24433a] mt-1">{{ c.total }}</div>
          <div class="text-[11px] text-[#718078] font-medium">{{ c.detail }}</div>
        </div>
      </div>

      <!-- หมายเหตุ -->
      <div class="text-[11px] text-[#718078] leading-relaxed bg-[#f8faf9] rounded-2xl px-4 py-3 space-y-1">
        <p>มีภาพของวัวตัวนี้ {{ fmtDur(data.summary.covered_min) }} จาก {{ fmtDur(data.summary.window_min) }}</p>
        <p>{{ data.note_th }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'

const props = defineProps({
  farmId: { type: String, required: true }
})

// อ่าน API base ตอน setup เท่านั้น ห้ามเรียกใน callback/setInterval
const Admin = `${getNodeApiBase()}/Admin`

// เวลาไทยเสมอ ไม่ขึ้นกับเขตเวลาของเครื่องที่เปิด: เลื่อนเวลา +7 ชม. แล้วอ่านแบบ UTC
const BKK_MS = 7 * 3600e3
const bkk = (iso) => new Date(iso).getTime() + BKK_MS
const today = new Date(Date.now() + BKK_MS).toISOString().slice(0, 10)

const ROWS = [
  { key: 'lying', label: 'นอน', color: '#3b82f6' },
  { key: 'standing', label: 'ยืน', color: '#f97316' },
  { key: 'feeding', label: 'กิน', color: '#10b981' },
  { key: 'not_visible', label: 'ไม่เห็นในภาพ', color: '#a6b5aa' }
]
const AXIS_LABEL_WIDTH = 92   // กว้างเท่ากันทั้ง 2 กราฟ แกนเวลาจะได้ตรงกัน
// จอมือถือ: ขีดเวลาทุก 6 ชม. และป้ายแกนแคบลง (ทั้ง 2 กราฟเท่ากัน)
const MOBILE = [{ breakpoint: 640, options: { xaxis: { tickAmount: 4 }, yaxis: { labels: { minWidth: 88, maxWidth: 88 } } } }]

const date = ref(today)
const data = ref(null)
const isLoading = ref(false)
const error = ref('')

const bouts = computed(() => data.value?.bouts || [])
const windowMs = computed(() => data.value ? [bkk(data.value.window.from), bkk(data.value.window.to)] : [0, 0])

const fmtDur = (min) => {
  const m = Math.round(min || 0)
  if (m < 60) return `${m} นาที`
  return m % 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} นาที` : `${m / 60} ชม.`
}
const fmtTime = (shiftedMs) => (shiftedMs >= windowMs.value[1] ? '24:00' : new Date(shiftedMs).toISOString().slice(11, 16))

const shiftDay = (n) => {
  const d = new Date(`${date.value}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  const next = d.toISOString().slice(0, 10)
  if (next <= today) date.value = next
}

const fetchData = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cow-behavior`, {
      params: { date: date.value },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    data.value = res.data?.cow_behavior || null
  } catch (err) {
    data.value = null
    error.value = err.response?.data?.message || 'ดึงข้อมูลพฤติกรรมวัวไม่สำเร็จ'
  } finally {
    isLoading.value = false
  }
}

watch(date, fetchData)
watch(() => props.farmId, fetchData)
onMounted(fetchData)

// ทุกแถวแสดงเสมอ (แม้วันนั้นไม่มีท่านั้น) ด้วยจุดความยาว 0 ที่มองไม่เห็น
const timelineSeries = computed(() => ROWS.map(r => ({
  name: r.label,
  data: [
    { x: r.label, y: [windowMs.value[0], windowMs.value[0]], bout: null },
    ...bouts.value.filter(b => b.behavior === r.key).map(b => ({ x: r.label, y: [bkk(b.start), bkk(b.end)], bout: b }))
  ]
})))

const xaxis = computed(() => ({
  type: 'datetime',
  min: windowMs.value[0],
  max: windowMs.value[1],
  tickAmount: 8,
  // ใช้ค่าแรกเสมอ: กราฟแท่งแนวนอนส่งลำดับขีด (0, 1, 2...) มาเป็นค่าที่ 2 ไม่ใช่เวลา
  labels: { datetimeUTC: true, rotate: 0, hideOverlappingLabels: true, formatter: (val) => fmtTime(Number(val)), style: { fontSize: '11px', colors: '#718078' } },
  axisBorder: { show: false },
  axisTicks: { show: false },
  tooltip: { enabled: false }
}))

const timelineOptions = computed(() => ({
  chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
  plotOptions: { bar: { horizontal: true, rangeBarGroupRows: true, barHeight: '70%', borderRadius: 3 } },
  colors: ROWS.map(r => r.color),
  dataLabels: { enabled: false },
  legend: { show: false },
  xaxis: xaxis.value,
  yaxis: { labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, style: { fontSize: '12px', fontWeight: 700, colors: '#24433a' } } },
  grid: { borderColor: '#f0f4f2', strokeDashArray: 4, xaxis: { lines: { show: true } }, padding: { right: 18 } },
  responsive: MOBILE,
  tooltip: {
    custom: ({ seriesIndex, dataPointIndex, w }) => {
      const p = w.config.series[seriesIndex].data[dataPointIndex]
      if (!p?.bout) return ''
      const b = p.bout
      const extra = [b.from_previous_day && 'ต่อจากเมื่อวาน', b.to_next_day && 'ต่อไปวันถัดไป'].filter(Boolean).join(' · ')
      return `<div style="padding:8px 12px;font-size:12px;line-height:1.6">
        <b style="color:${ROWS[seriesIndex].color}">${ROWS[seriesIndex].label}</b><br>
        ${fmtTime(p.y[0])} – ${fmtTime(p.y[1])} · ${fmtDur(b.duration_min)}
        ${extra ? `<br><span style="color:#718078">${extra}</span>` : ''}
      </div>`
    }
  }
}))

const thiSeries = computed(() => [{
  name: 'THI',
  data: (data.value?.thi || []).map(p => [bkk(p.t), p.thi])
}])

// ป้าย 2 เส้นเกณฑ์อยู่คนละฝั่ง จะได้ไม่ทับกัน (เกณฑ์ห่างกันแค่ 2 หน่วย)
const thresholdLine = (y, color, text, side) => ({
  y, borderColor: color, strokeDashArray: 4,
  label: { borderColor: color, position: side, textAnchor: side === 'left' ? 'start' : 'end', style: { color: '#fff', background: color, fontSize: '10px', fontWeight: 700 }, text }
})

const thiOptions = computed(() => {
  const t = data.value?.thresholds || {}
  // ให้เห็นเส้นเกณฑ์เสมอ แม้วันนั้น THI ต่ำกว่าเกณฑ์มาก
  const values = thiSeries.value[0].data.map(p => p[1])
  const yMin = Math.floor(Math.min(...values, t.mild) - 1)
  const yMax = Math.ceil(Math.max(...values, t.moderate) + 1)
  return {
    chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
    colors: ['#d87939'],
    stroke: { curve: 'smooth', width: 2.5 },
    dataLabels: { enabled: false },
    xaxis: xaxis.value,
    yaxis: {
      min: yMin,
      max: yMax,
      tickAmount: 4,
      labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, style: { fontSize: '11px', colors: '#718078' }, formatter: (v) => (v != null ? Number(v).toFixed(0) : '') },
      title: { text: 'THI', style: { fontSize: '11px', color: '#718078', fontWeight: 700 } }
    },
    annotations: {
      yaxis: [
        thresholdLine(t.mild, '#f59e0b', `${t.mild} เฝ้าระวัง`, 'right'),
        thresholdLine(t.moderate, '#ea580c', `${t.moderate} เครียดจากความร้อน`, 'left')
      ]
    },
    tooltip: {
      x: { formatter: (ts) => fmtTime(ts) },
      y: { formatter: (v) => (v != null ? Number(v).toFixed(1) : '-') }
    },
    grid: { borderColor: '#f0f4f2', strokeDashArray: 4, padding: { right: 18 } },
    responsive: MOBILE
  }
})

const summaryCards = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    { ...ROWS[0], total: fmtDur(s.minutes.lying), detail: `${s.bouts.lying} รอบ · นานสุด ${fmtDur(s.longest_lying_min)}` },
    { ...ROWS[1], total: fmtDur(s.minutes.standing), detail: `${s.bouts.standing} รอบ (รวมเวลาดื่มน้ำ)` },
    { ...ROWS[2], total: fmtDur(s.minutes.feeding), detail: `${s.bouts.feeding} รอบ` },
    { ...ROWS[3], total: fmtDur(s.minutes.not_visible), detail: 'หาวัวตัวนี้ในภาพไม่เจอ' }
  ]
})
</script>
