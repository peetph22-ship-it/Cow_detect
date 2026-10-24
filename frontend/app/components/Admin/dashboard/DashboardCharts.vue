<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-200">

    <!-- 🟢 1. Left Bento Card: THI เฉลี่ยรายวัน 7 วัน (จริง) + พยากรณ์ baseline 3 วัน (2/3 width) -->
    <div class="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[32px] border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] p-6 md:p-8 flex flex-col justify-between">
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h3 class="font-black text-[#24433a] text-lg md:text-xl flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-[10px] bg-[#163026] text-white flex items-center justify-center text-xs shadow-sm">
                <v-icon icon="mdi-chart-bell-curve-cumulative" size="18" />
              </span>
              <span>THI เฉลี่ยรายวัน 7 วัน + พยากรณ์ 3 วัน</span>
            </h3>
            <p class="text-[13px] text-[#718078] mt-1 font-medium">
              ค่าเฉลี่ยทั้งวันจากเซ็นเซอร์ในโรงเรือน (วิธีเดียวกับเกณฑ์ในงานวิจัย) วันที่ข้อมูลไม่ถึง {{ trend?.min_data_hours ?? 12 }} ชม. จะเว้นว่าง
            </p>
          </div>

          <!-- Model Accuracy Badge -->
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <span class="px-3 py-1 rounded-[10px] bg-[#163026]/5 text-[#163026] text-xs font-black border border-[#163026]/10 flex items-center gap-1.5">
              <v-icon icon="mdi-chart-timeline-variant" size="14" class="text-[#D97736]" />
              <span>ข้อมูลจริง + baseline</span>
            </span>
          </div>
        </div>

        <!-- Custom Legend Indicators -->
        <div class="flex flex-wrap items-center gap-4 text-xs font-bold text-[#4e6057] my-4 pt-2 border-t border-[#f0f4f2]">
          <span class="flex items-center gap-2">
            <span class="w-4 h-1 bg-[#163026] rounded-full"></span>
            <span>เส้นทึบ: THI เฉลี่ยรายวัน (ค่าจริง)</span>
          </span>
          <span class="flex items-center gap-2">
            <span class="w-4 h-0 border-t-2 border-dashed border-[#D97736]"></span>
            <span>เส้นประ: พยากรณ์ 3 วัน (ค่าเฉลี่ย THI 72 ชม. ยังไม่ใช้พยากรณ์อากาศ)</span>
          </span>
          <span class="flex items-center gap-1.5 text-[#718078] text-[11px] ml-auto">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>เส้นเตือน {{ T.mild }} / {{ T.moderate }} / {{ T.severe }} THI (ค่าเริ่มต้น)</span>
          </span>
        </div>
      </div>

      <!-- Chart Canvas -->
      <div class="h-[290px] w-full mt-2">
        <ClientOnly>
          <ApexChart 
            v-if="hasTrend"
            type="line" 
            height="100%" 
            :options="lineChartOptions" 
            :series="lineSeries" 
          />
          <template #fallback>
            <div class="w-full h-full flex items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl animate-pulse text-sm">
              <v-icon icon="mdi-loading" size="24" class="animate-spin mr-2" />
              กำลังโหลดข้อมูล...
            </div>
          </template>
        </ClientOnly>
        <div v-if="trendLoaded && !hasTrend" class="w-full h-full flex items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl text-sm">ยังไม่มีข้อมูลเซ็นเซอร์ 7 วันล่าสุด</div>
      </div>
      <p v-if="forecastNote" class="text-[11px] text-[#718078] mt-2">{{ forecastNote }}</p>
    </div>

    <!-- 🟢 2. Right Bento Card: Risk Proportion Donut Chart (1/3 width) -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[32px] border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] p-6 md:p-8 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-black text-[#24433a] text-lg flex items-center gap-2">
            <span class="w-8 h-8 rounded-[10px] bg-[#D97736]/10 text-[#D97736] flex items-center justify-center text-xs">
              <v-icon icon="mdi-chart-donut" size="18" />
            </span>
            <span>สัดส่วนสภาวะฟาร์ม</span>
          </h3>
          <span class="text-xs font-bold text-[#718078] bg-[#f0f4f2] px-2.5 py-1 rounded-[8px]">
            Real-time
          </span>
        </div>
        <p class="text-[13px] text-[#718078] mb-4 font-medium">
          จำแนกสถานะฟาร์มในเครือข่ายตามระดับความเครียดความร้อน
        </p>
      </div>

      <!-- Donut Chart Container -->
      <div class="flex-1 flex items-center justify-center relative min-h-[220px]">
        <ClientOnly>
          <ApexChart 
            type="donut" 
            width="100%" 
            height="250" 
            :options="donutChartOptions" 
            :series="donutSeries" 
          />
          <template #fallback>
            <div class="w-36 h-36 rounded-full border-4 border-[#edf3ed] border-t-[#D97736] animate-spin"></div>
          </template>
        </ClientOnly>
      </div>

      <!-- Summary Distribution Badges -->
      <div class="grid grid-cols-2 gap-2 pt-3 border-t border-[#f0f4f2] text-[11px] font-bold">
        <div class="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50/70 text-emerald-800 border border-emerald-100">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>ปกติ: {{ distNormal }} ฟาร์ม</span>
        </div>
        <div class="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50/70 text-amber-800 border border-amber-100">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>เฝ้าระวัง: {{ distMild }} ฟาร์ม</span>
        </div>
        <div class="flex items-center gap-1.5 p-2 rounded-xl bg-orange-50/70 text-orange-800 border border-orange-100">
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
          <span>เครียด: {{ distModerate }} ฟาร์ม</span>
        </div>
        <div class="flex items-center gap-1.5 p-2 rounded-xl bg-rose-50/70 text-rose-800 border border-rose-100">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>วิกฤต: {{ distSevere }} ฟาร์ม</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'
import { getThresholds } from '~/utils/heatStress'

const T = getThresholds('default')
// ข้อมูลจริง: THI เฉลี่ยรายวัน 7 วัน + พยากรณ์ baseline 3 วัน จาก /farms/dashboard-trend
// โหลดตอนเปิดหน้าและทุก 10 นาที (ค่ารายวันเปลี่ยนช้า ไม่ต้องดึงทุก 12 วินาทีแบบการ์ดอื่น)
// อ่าน base ตอน setup: ใน setInterval เรียก useRuntimeConfig ไม่ได้ (จะตกไปใช้ URL production)
const ADMIN_API = `${getNodeApiBase()}/Admin`
const trend = ref(null)
const trendLoaded = ref(false)
let trendTimer = null
const fetchTrend = async () => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await axios.get(`${ADMIN_API}/farms/dashboard-trend`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (res.data?.success) trend.value = res.data.trend
  } catch (err) {
    console.warn('[DashboardCharts] dashboard-trend unavailable:', err.message)
  } finally {
    trendLoaded.value = true
  }
}
onMounted(() => {
  fetchTrend()
  trendTimer = setInterval(fetchTrend, 10 * 60 * 1000)
})
onUnmounted(() => { if (trendTimer) clearInterval(trendTimer) })

const trendFarms = computed(() => trend.value?.farms || [])
const hasTrend = computed(() => trendFarms.value.some(f => f.days.some(d => d.avg_thi != null)))

// แกน x: 7 วันย้อนหลัง + 3 วันข้างหน้า (วันที่เวลาไทย YYYY-MM-DD)
const dateKeys = computed(() => {
  const keys = new Set()
  trendFarms.value.forEach(f => {
    f.days.forEach(d => keys.add(d.date))
    ;(f.forecast?.points || []).forEach(p => keys.add(p.date))
  })
  return [...keys].sort()
})
const todayKey = computed(() => trendFarms.value[0]?.days.find(d => d.is_today)?.date)
const dateLabel = (key) => {
  if (!key) return ''
  const d = new Date(`${key}T12:00:00+07:00`)
  const txt = d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' })
  return key === todayKey.value ? `วันนี้` : txt
}

const FARM_COLORS = ['#163026', '#2f6f5e', '#5b8c7a', '#8aa89b']
const forecastNote = computed(() => {
  const f = trendFarms.value.find(x => x.forecast)
  if (!f) return ''
  if (f.forecast.insufficient_data) return `พยากรณ์: ${f.forecast.reason}`
  return `พยากรณ์: ${f.forecast.method_th} (${f.forecast.evaluation_note})`
})

const props = defineProps({
  stats: {
    type: Object,
    default: () => null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// -------------------------------------------------------------
// 1. Line/Area Chart Series: Actual (#163026) vs LSTM (#D97736)
// -------------------------------------------------------------
// ค่าจริง (เส้นทึบ) และพยากรณ์ (เส้นประ) ต่อฟาร์ม เส้นพยากรณ์เริ่มจากจุดจริงจุดสุดท้ายให้ต่อกัน
const lineSeries = computed(() => {
  const keys = dateKeys.value
  const series = []
  trendFarms.value.forEach(f => {
    const byDate = new Map(f.days.map(d => [d.date, d.avg_thi]))
    const actual = keys.map(k => byDate.get(k) ?? null)
    series.push({ name: `${f.name} (จริง)`, data: actual, _meta: f })
    const pts = f.forecast && !f.forecast.insufficient_data ? f.forecast.points : []
    if (pts.length) {
      const fc = new Map(pts.map(p => [p.date, p.predicted_thi]))
      let lastIdx = -1
      actual.forEach((v, i) => { if (v != null) lastIdx = i })
      const data = keys.map((k, i) => (fc.has(k) ? fc.get(k) : i === lastIdx ? actual[i] : null))
      series.push({ name: `${f.name} (พยากรณ์)`, data, _meta: f })
    }
  })
  return series
})

const lineChartOptions = computed(() => {
  const series = lineSeries.value
  const colorIdx = new Map(trendFarms.value.map((f, i) => [f.id, i]))
  const colors = series.map(sr => sr.name.endsWith('(พยากรณ์)') ? '#D97736' : FARM_COLORS[(colorIdx.get(sr._meta.id) || 0) % FARM_COLORS.length])
  const dashes = series.map(sr => (sr.name.endsWith('(พยากรณ์)') ? 6 : 0))
  const allVals = series.flatMap(sr => sr.data).filter(v => v != null)
  const yMin = Math.min(T.mild - 4, ...allVals.map(v => Math.floor(v - 2)))
  const yMax = Math.max(T.severe + 2, ...allVals.map(v => Math.ceil(v + 2)))
  const keys = dateKeys.value
  const todayIdx = keys.indexOf(todayKey.value)
  const threshold = (y, color, text) => ({
    y,
    borderColor: color,
    strokeDashArray: 4,
    label: { borderColor: color, style: { color: '#fff', background: color, fontSize: '10px', fontWeight: 700 }, text }
  })
  return {
    chart: {
      type: 'line',
      fontFamily: 'inherit',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false }
    },
    colors,
    stroke: { width: 3, curve: 'straight', dashArray: dashes },
    markers: { size: 4, strokeWidth: 0, hover: { size: 6 } },
    dataLabels: { enabled: false },
    annotations: {
      yaxis: [
        threshold(T.mild, '#f59e0b', `THI ${T.mild} (เฝ้าระวัง)`),
        threshold(T.moderate, '#ea580c', `THI ${T.moderate} (เครียด)`),
        threshold(T.severe, '#e11d48', `THI ${T.severe} (วิกฤต)`)
      ],
      // เส้นแบ่งวันนี้: ซ้ายคือค่าจริง ขวาคือพยากรณ์
      xaxis: todayIdx >= 0 ? [{
        x: dateLabel(keys[todayIdx]),
        borderColor: '#a6b5aa',
        strokeDashArray: 3,
        label: { borderColor: '#a6b5aa', style: { color: '#4e6057', background: '#f6f7f5', fontSize: '10px' }, text: 'วันนี้', orientation: 'horizontal' }
      }] : []
    },
    xaxis: {
      categories: keys.map(dateLabel),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#718078', fontSize: '11px', fontWeight: 600 } }
    },
    yaxis: {
      min: yMin,
      max: yMax,
      tickAmount: 5,
      labels: {
        style: { colors: '#718078', fontSize: '11px', fontWeight: 600 },
        formatter: (val) => (val != null ? val.toFixed(0) : '')
      }
    },
    grid: { borderColor: '#f0f4f2', strokeDashArray: 4 },
    legend: { show: trendFarms.value.length > 1, position: 'top', horizontalAlign: 'left', fontSize: '11px' },
    tooltip: {
      theme: 'light',
      shared: true,
      intersect: false,
      y: {
        formatter: (val, { seriesIndex, dataPointIndex }) => {
          if (val == null) return '-'
          const sr = series[seriesIndex]
          if (sr?.name.endsWith('(พยากรณ์)')) return `${val.toFixed(1)} THI`
          const day = sr?._meta.days.find(d => d.date === keys[dataPointIndex])
          return day ? `${val.toFixed(1)} THI (ข้อมูล ${day.data_hours} ชม.)` : `${val.toFixed(1)} THI`
        }
      }
    }
  }
})

// -------------------------------------------------------------
// 2. Donut Chart Series: Proportions of Farm Stress States
// -------------------------------------------------------------
const distNormal = computed(() => props.stats?.distribution?.normal ?? 0)
const distMild = computed(() => props.stats?.distribution?.mild ?? 0)
const distModerate = computed(() => props.stats?.distribution?.moderate ?? 0)
const distSevere = computed(() => props.stats?.distribution?.severe ?? 0)

const donutSeries = computed(() => {
  const n = distNormal.value
  const m = distMild.value
  const mod = distModerate.value
  const s = distSevere.value
  if (n === 0 && m === 0 && mod === 0 && s === 0) {
    return [0, 0, 0, 0]
  }
  return [n, m, mod, s]
})

const totalFarmsInDonut = computed(() => {
  return distNormal.value + distMild.value + distModerate.value + distSevere.value || (props.stats?.farms?.total ?? 0)
})

const donutChartOptions = computed(() => {
  return {
    chart: {
      type: 'donut',
      fontFamily: 'inherit'
    },
    labels: ['ปกติ (Comfort)', 'เฝ้าระวัง (Mild)', 'เครียด (Moderate)', 'วิกฤต (Severe)'],
    colors: ['#10b981', '#f59e0b', '#ea580c', '#e11d48'],
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: {
              fontSize: '12px',
              color: '#718078',
              fontWeight: 700,
              offsetY: -5
            },
            value: {
              fontSize: '26px',
              color: '#24433a',
              fontWeight: 900,
              offsetY: 4,
              formatter: () => `${totalFarmsInDonut.value}`
            },
            total: {
              show: true,
              label: 'ฟาร์มทั้งหมด',
              fontSize: '11px',
              color: '#718078',
              fontWeight: 700,
              formatter: () => `${totalFarmsInDonut.value} ฟาร์ม`
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: ['#ffffff'] },
    legend: { show: false },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val) => `${val} ฟาร์ม`
      }
    }
  }
})
</script>
