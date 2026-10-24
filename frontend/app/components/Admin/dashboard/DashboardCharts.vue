<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-200">

    <!-- 🟢 1. Left Bento Card: THI Actual vs AI LSTM Forecast (2/3 width) -->
    <div class="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[32px] border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] p-6 md:p-8 flex flex-col justify-between">
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h3 class="font-black text-[#24433a] text-lg md:text-xl flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-[10px] bg-[#163026] text-white flex items-center justify-center text-xs shadow-sm">
                <v-icon icon="mdi-chart-bell-curve-cumulative" size="18" />
              </span>
              <span>THI ล่าสุดรายฟาร์ม</span>
            </h3>
            <p class="text-[13px] text-[#718078] mt-1 font-medium">
              ค่าจริงจากเซ็นเซอร์ล่าสุดของแต่ละฟาร์ม (แนวโน้ม 3 วันดูได้ที่หน้ารายละเอียดฟาร์ม)
            </p>
          </div>

          <!-- Model Accuracy Badge -->
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <span class="px-3 py-1 rounded-[10px] bg-[#163026]/5 text-[#163026] text-xs font-black border border-[#163026]/10 flex items-center gap-1.5">
              <v-icon icon="mdi-brain" size="14" class="text-[#D97736]" />
              <span>ข้อมูลจริง</span>
            </span>
          </div>
        </div>

        <!-- Custom Legend Indicators -->
        <div class="flex flex-wrap items-center gap-4 text-xs font-bold text-[#4e6057] my-4 pt-2 border-t border-[#f0f4f2]">
          <span class="flex items-center gap-2">
            <span class="w-4 h-1 bg-[#163026] rounded-full"></span>
            <span>แท่ง: THI ล่าสุด (NRC)</span>
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
            v-if="farmBars.length"
            type="bar" 
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
        <div v-if="!farmBars.length" class="w-full h-full flex items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl text-sm">ยังไม่มีข้อมูลเซ็นเซอร์</div>
      </div>
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
import { computed, ref, onMounted } from 'vue'
import axios from 'axios'
import { Admin } from '~/API/baseAPI'
import { calcThi, getThresholds, getRiskLevel, RISK_COLORS } from '~/utils/heatStress'

const T = getThresholds('default')
// ข้อมูลจริง: THI ล่าสุดของแต่ละฟาร์มจาก /farms/all
const farmBars = ref([])
onMounted(async () => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await axios.get(`${Admin}/farms/all`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    farmBars.value = (res.data?.rows || [])
      .map(r => ({ name: r.name_farms || 'ฟาร์ม', thi: calcThi(r.temperature_c, r.humidity_pct), profile: r.hf_profile }))
      .filter(r => r.thi != null)
  } catch (err) {
    console.warn('[DashboardCharts] farms/all unavailable:', err.message)
  }
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
const lineSeries = computed(() => [{ name: 'THI ล่าสุด', data: farmBars.value.map(f => f.thi) }])

const lineChartOptions = computed(() => {
  return {
    chart: {
      type: 'line',
      fontFamily: 'inherit',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    // เส้นทึบสี #163026 สำหรับค่าจริง และ เส้นประสีส้ม #D97736 สำหรับพยากรณ์
    colors: [({ dataPointIndex }) => RISK_COLORS[getRiskLevel(farmBars.value[dataPointIndex]?.thi, farmBars.value[dataPointIndex]?.profile) || 'normal']],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    dataLabels: { enabled: false },
    annotations: {
      yaxis: [
        {
          y: T.mild,
          borderColor: '#f59e0b',
          strokeDashArray: 4,
          label: {
            borderColor: '#f59e0b',
            style: { color: '#fff', background: '#f59e0b', fontSize: '10px', fontWeight: 700 },
            text: `THI ${T.mild} (เฝ้าระวัง)`
          }
        },
        {
          y: T.moderate,
          borderColor: '#ea580c',
          strokeDashArray: 4,
          label: {
            borderColor: '#ea580c',
            style: { color: '#fff', background: '#ea580c', fontSize: '10px', fontWeight: 700 },
            text: `THI ${T.moderate} (เครียด)`
          }
        },
        {
          y: T.severe,
          borderColor: '#e11d48',
          strokeDashArray: 4,
          label: {
            borderColor: '#e11d48',
            style: { color: '#fff', background: '#e11d48', fontSize: '10px', fontWeight: 700 },
            text: `THI ${T.severe} (วิกฤต)`
          }
        }
      ]
    },
    xaxis: {
      categories: farmBars.value.map(f => f.name),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#718078', fontSize: '11px', fontWeight: 600 }
      }
    },
    yaxis: {
      min: 65,
      max: 90,
      labels: {
        style: { colors: '#718078', fontSize: '11px', fontWeight: 600 },
        formatter: (val) => val ? val.toFixed(0) : ''
      }
    },
    grid: {
      borderColor: '#f0f4f2',
      strokeDashArray: 4
    },
    legend: {
      show: false
    },
    tooltip: {
      theme: 'light',
      // กราฟแท่งชุดเดียว: ApexCharts ไม่ยอมให้ shared คู่กับ intersect (ค่าเริ่มต้นของ bar) กราฟจะไม่วาดเลย
      shared: false,
      intersect: false,
      y: {
        formatter: (val) => val !== null && val !== undefined ? `${val.toFixed(1)} THI` : '-'
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
