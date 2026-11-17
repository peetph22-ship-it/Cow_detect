<template>
  <section
    v-if="forecastDays.length || simpleForecastText || insufficientReason"
    class="bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] space-y-4">
    <!-- หัวข้อการ์ด -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#D87939] border border-[#FED7AA] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-calendar-clock" size="22" />
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-black text-[#142820] leading-tight">
            พยากรณ์อากาศในคอกล่วงหน้า 3 วัน
          </h2>
          <p class="text-xs text-[#64766D] font-medium">
            เส้นทึบคือค่าจริง 7 วันที่ผ่านมา เส้นประคือค่าที่คาดการณ์
          </p>
        </div>
      </div>

      <span
        v-if="forecast?.method_th"
        class="text-[11px] font-bold px-3 py-1 rounded-full bg-[#F4F6F4] text-[#4E655B] border border-[#E4E8E5]">
        {{ forecast.method_th }}
      </span>
    </div>

    <!-- กราฟ THI เฉลี่ยรายวัน: 7 วันจริง ต่อด้วยพยากรณ์ 3 วัน (ค่าเฉลี่ยทั้งวันเหมือนกัน เทียบกันได้) -->
    <FarmerRiskLegend v-if="forecastDays.length && hasPast" />
    <ApexChart
      v-if="chartHeight && forecastDays.length && hasPast"
      type="line"
      :height="chartHeight"
      :options="trendOptions"
      :series="trendSeries" />

    <!-- กรณีมีรายการพยากรณ์รายวัน (forecast.days) -->
    <div v-if="forecastDays.length" class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      <div
        v-for="(d, idx) in forecastDays"
        :key="d.date || idx"
        class="p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all"
        :class="dayCardStyle(d.risk_level)">
        <div>
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="text-base font-black text-[#142820]">
                {{ dayTitle(d, idx) }}
              </div>
              <!-- หลังบ้านส่ง date มาเป็นข้อความไทยแล้ว (เช่น "อา. 25 ต.ค.") ห้ามแปลงด้วย new Date ซ้ำ -->
              <div v-if="d.date" class="text-xs font-bold text-[#4E655B]">
                {{ d.date }}
              </div>
            </div>

            <span
              class="text-xs font-black px-3 py-1 rounded-full shrink-0"
              :class="dayBadgeStyle(d.risk_level)">
              {{ dayRiskLabel(d.risk_level) }}
            </span>
          </div>

          <p class="text-xs sm:text-sm font-bold text-[#142820] mt-3 leading-snug">
            {{ dayAdvice(d) }}
          </p>
        </div>

        <div
          v-if="d.predicted_thi != null"
          class="mt-3.5 pt-2.5 border-t border-black/10 flex items-center justify-between text-xs font-extrabold text-[#4E655B]">
          <span>ค่าความร้อนคาดการณ์ (THI)</span>
          <span class="text-base font-black text-[#142820] tabular-nums">{{ Number(d.predicted_thi).toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <!-- ไม่มีพยากรณ์: บอกเหตุผลตามจริง -->
    <div
      v-else-if="insufficientReason"
      class="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E4E8E5] text-xs sm:text-sm font-semibold text-[#4E655B] flex items-center gap-2.5">
      <v-icon icon="mdi-information-outline" size="20" class="text-[#D87939] shrink-0" />
      <span>{{ insufficientReason }}</span>
    </div>
  </section>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'
import { thiRange, thiBands, baseChart, AXIS_LABEL, thaiDay, levelName, LEVEL_COLOR } from '~/utils/farmerCharts'

const { forecast, senior, charts, thresholds } = useFarmer()

const forecastDays = computed(() => forecast.value?.days || [])
const simpleForecastText = computed(() => (forecastDays.value.length ? senior.value?.forecast_simple || '' : ''))
const insufficientReason = computed(() => {
  if (forecastDays.value.length) return ''
  if (forecast.value?.insufficient_data) return forecast.value.reason || 'กำลังสะสมข้อมูลเซ็นเซอร์เพื่อพยากรณ์ล่วงหน้า'
  return 'ยังไม่มีพยากรณ์ล่วงหน้า (ระบบต้องใช้ข้อมูลเซ็นเซอร์ในคอกเพื่อปรับพยากรณ์)'
})

// ---------- กราฟแนวโน้ม ----------
const past = computed(() => charts.value?.week || [])
const hasPast = computed(() => past.value.some(d => d.has_data))
// ตั้งความสูงก่อนวาดกราฟครั้งแรก (เปลี่ยนความสูงหลังวาดแล้ว ApexCharts บนมือถือไม่วาดกราฟ)
const chartHeight = ref(0)
onMounted(() => { chartHeight.value = window.innerWidth < 640 ? 210 : 240 })

// จุดในกราฟ: [ค่าจริง 7 วัน..., พยากรณ์ 3 วัน...]
// มือถือมี 10 จุดในความกว้าง ~300px: ป้ายสั้นเหลือแค่วันที่/วันนี้/+1 วัน (รายละเอียดอยู่ใน tooltip)
const compact = computed(() => chartHeight.value > 0 && chartHeight.value < 240)
const trendPoints = computed(() => [
  ...past.value.map(d => ({
    label: compact.value
      ? (d.is_today ? 'วันนี้' : String(Number(d.date.slice(8))))
      : (d.is_today ? [thaiDay(d.date), 'วันนี้'] : [thaiDay(d.date)]),
    tip: `${thaiDay(d.date)}${d.is_today ? ' (วันนี้ ถึงตอนนี้)' : ''}`,
    thi: d.has_data ? d.avg_thi : null,
    level: d.has_data ? d.risk_level : null,
    forecast: false
  })),
  ...forecastDays.value.map((d, i) => ({
    label: compact.value ? `+${d.horizon_days || i + 1}` : [dayTitle(d, i).replace(/\s*\(.*\)$/, ''), 'คาดการณ์'],
    tip: `${d.date || dayTitle(d, i)} (คาดการณ์)`,
    thi: d.predicted_thi,
    level: d.risk_level,
    forecast: true
  }))
])

const trendSeries = computed(() => {
  const pts = trendPoints.value
  const nPast = past.value.length
  // เส้นประเริ่มจากค่าจริงวันล่าสุด ให้สองเส้นต่อกัน
  return [
    { name: 'ค่าจริง', data: pts.map((p, i) => (i < nPast ? p.thi : null)) },
    { name: 'คาดการณ์', data: pts.map((p, i) => (i >= nPast ? p.thi : (i === nPast - 1 ? p.thi : null))) }
  ]
})

const trendOptions = computed(() => {
  const t = thresholds.value
  const pts = trendPoints.value
  const range = thiRange(pts.map(p => p.thi), t)
  return {
    chart: { ...baseChart, type: 'line' },
    colors: ['#142820', '#D87939'],
    stroke: { width: [3, 3], curve: 'straight', dashArray: [0, 6] },
    markers: { size: [5, 5], strokeColors: '#fff', strokeWidth: 2, hover: { size: 7 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: pts.map(p => p.label),
      labels: { rotate: 0, hideOverlappingLabels: false, style: { ...AXIS_LABEL, fontSize: '10px' } },
      axisTicks: { show: false },
      tooltip: { enabled: false }
    },
    yaxis: { min: range.min, max: range.max, tickAmount: 4, decimalsInFloat: 0, labels: { style: AXIS_LABEL, formatter: v => String(Math.round(v)) } },
    annotations: { yaxis: thiBands(t, range) },
    grid: { borderColor: '#f0f4f2', strokeDashArray: 4, padding: { left: 4, right: 8 } },
    legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px', fontWeight: 700 },
    tooltip: {
      shared: false,
      intersect: true,
      custom: ({ dataPointIndex }) => {
        const p = pts[dataPointIndex]
        if (!p) return ''
        if (p.thi == null) return `<div style="padding:8px 10px;font-size:12px"><b>${p.tip}</b><div>ไม่มีข้อมูลจากกล่องเซ็นเซอร์</div></div>`
        return `<div style="padding:8px 10px;font-size:12px;line-height:1.5"><div style="font-weight:800">${p.tip}</div>
          <div>THI เฉลี่ยทั้งวัน <b>${p.thi}</b> · <span style="color:${LEVEL_COLOR[p.level] || '#142820'};font-weight:800">${levelName(p.level)}</span></div></div>`
      }
    }
  }
})

const dayTitle = (d, idx) => {
  if (d.label) return d.label
  if (idx === 0) return 'พรุ่งนี้'
  if (idx === 1) return 'มะรืนนี้'
  return `อีก ${d.horizon_days || idx + 1} วัน`
}

const dayRiskLabel = (risk) => {
  if (risk === 'severe') return 'ร้อนจัด'
  if (risk === 'moderate') return 'อากาศร้อน'
  if (risk === 'mild') return 'เริ่มอุ่น'
  return 'สบายดี'
}

const dayCardStyle = (risk) => {
  if (risk === 'severe') return 'bg-[#FEF2F2] border-[#FCA5A5]'
  if (risk === 'moderate') return 'bg-[#FFF7ED] border-[#FDBA74]'
  if (risk === 'mild') return 'bg-[#FFFBEB] border-[#FDE68A]'
  return 'bg-[#F0FDF4] border-[#BBF7D0]'
}

const dayBadgeStyle = (risk) => {
  if (risk === 'severe') return 'bg-[#DC2626] text-white'
  if (risk === 'moderate') return 'bg-[#EA580C] text-white'
  if (risk === 'mild') return 'bg-[#D97706] text-white'
  return 'bg-[#142820] text-white'
}

const dayAdvice = (d) => {
  if (d.advisory) return d.advisory
  if (d.risk_level === 'severe') return 'คาดว่าจะร้อนจัด เตรียมเปิดพัดลมและสำรองน้ำดื่มให้พร้อม'
  if (d.risk_level === 'moderate') return 'ช่วงบ่ายจะค่อนข้างร้อน ควรเปิดพัดลมระบายอากาศ'
  if (d.risk_level === 'mild') return 'อากาศเริ่มอุ่นช่วงบ่าย เตรียมน้ำสะอาดให้เต็มราง'
  return 'สภาพอากาศโปร่งสบาย แม่วัวกินอาหารได้ตามปกติ'
}
</script>
