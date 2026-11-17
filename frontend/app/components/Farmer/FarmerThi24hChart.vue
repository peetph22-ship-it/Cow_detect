<template>
  <section class="bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#D87939] border border-[#FED7AA] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-chart-bell-curve-cumulative" size="22" />
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-black text-[#142820] leading-tight">
            ความร้อนในคอก 24 ชม. ที่ผ่านมา
          </h2>
          <p class="text-xs text-[#64766D] font-medium">
            เส้นยิ่งสูงยิ่งร้อน สีพื้นหลังบอกระดับ (ค่าเฉลี่ยรายชั่วโมงของทั้งฟาร์ม)
          </p>
        </div>
      </div>
    </div>

    <template v-if="hasData">
      <!-- สรุปสั้นๆ ให้อ่านได้โดยไม่ต้องดูกราฟ -->
      <div class="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div class="p-3 sm:p-3.5 rounded-2xl border" :class="peakStyle.chip">
          <div class="text-[11px] font-extrabold opacity-90">ร้อนที่สุด</div>
          <div class="text-base sm:text-lg font-black mt-0.5 tabular-nums">
            {{ peak ? `${thaiHour(peak.t)} น.` : '—' }}
          </div>
          <div class="text-[11px] font-bold mt-0.5">THI {{ peak?.thi ?? '—' }} · {{ levelName(peak?.level) }}</div>
        </div>
        <div class="p-3 sm:p-3.5 rounded-2xl border bg-[#F8FAF9] border-[#E4E8E5] text-[#142820]">
          <div class="text-[11px] font-extrabold text-[#4E655B]">ชั่วโมงที่ถึงระดับอากาศร้อน</div>
          <div class="text-base sm:text-lg font-black mt-0.5 tabular-nums">{{ hotHours }} ชม.</div>
          <div class="text-[11px] font-bold mt-0.5 text-[#4E655B]">
            {{ missingHours ? `ไม่มีข้อมูล ${missingHours} ชม. (เส้นขาด)` : 'มีข้อมูลครบทุกชั่วโมง' }}
          </div>
        </div>
      </div>

      <div class="space-y-1">
        <FarmerRiskLegend />
        <ApexChart v-if="chartHeight" type="line" :height="chartHeight" :options="options" :series="series" />
      </div>
    </template>

    <div
      v-else
      class="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E4E8E5] text-xs sm:text-sm font-semibold text-[#4E655B] flex items-center gap-2.5">
      <v-icon icon="mdi-information-outline" size="20" class="text-[#D87939] shrink-0" />
      <span>ยังไม่มีข้อมูลจากกล่องเซ็นเซอร์ใน 24 ชม. ที่ผ่านมา จึงยังวาดกราฟไม่ได้</span>
    </div>
  </section>
</template>

<script setup>
import { useFarmer, riskStyle } from '~/composables/useFarmer'
import { thiRange, thiBands, baseChart, AXIS_LABEL, thaiHour, levelName, LEVEL_COLOR } from '~/utils/farmerCharts'

const { charts, thresholds, today } = useFarmer()

const points = computed(() => charts.value?.hourly || [])
const hasData = computed(() => points.value.some(p => p.thi != null))
const withData = computed(() => points.value.filter(p => p.thi != null))
const peak = computed(() => withData.value.reduce((a, p) => (!a || p.thi > a.thi ? p : a), null))
const peakStyle = computed(() => riskStyle(peak.value?.level))
// ใช้ตัวเลขเดียวกับการ์ดสรุป 24 ชม. (นับจากค่าทุก 5 นาที) ไม่นับจากค่าเฉลี่ยรายชั่วโมง ตัวเลขจะได้ไม่ขัดกัน
const hotHours = computed(() => today.value?.stress_hours ?? 0)
const missingHours = computed(() => points.value.length - withData.value.length)

// ตั้งความสูงก่อนวาดกราฟครั้งแรก (เปลี่ยนความสูงหลังวาดแล้ว ApexCharts บนมือถือไม่วาดกราฟ)
const chartHeight = ref(0)
onMounted(() => { chartHeight.value = window.innerWidth < 640 ? 220 : 260 })

const lastIdx = computed(() => {
  for (let i = points.value.length - 1; i >= 0; i--) if (points.value[i].thi != null) return i
  return -1
})

const series = computed(() => [{ name: 'THI', data: points.value.map(p => p.thi) }])

const options = computed(() => {
  const t = thresholds.value
  const range = thiRange(points.value.map(p => p.thi), t)
  const pts = points.value
  return {
    chart: { ...baseChart, type: 'line' },
    colors: ['#142820'],
    stroke: { width: 3, curve: 'smooth' },
    markers: {
      size: 0,
      hover: { size: 6 },
      discrete: lastIdx.value >= 0
        ? [{ seriesIndex: 0, dataPointIndex: lastIdx.value, size: 7, fillColor: LEVEL_COLOR[pts[lastIdx.value].level] || '#142820', strokeColor: '#fff' }]
        : []
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: pts.map(p => thaiHour(p.t)),
      // มือถือแสดงป้ายเวลาน้อยลง ไม่ให้ตัวเลขชนกัน
      tickAmount: chartHeight.value && chartHeight.value < 260 ? 4 : 6,
      labels: { rotate: 0, hideOverlappingLabels: true, style: AXIS_LABEL },
      axisTicks: { show: false },
      tooltip: { enabled: false }
    },
    yaxis: { min: range.min, max: range.max, tickAmount: 4, decimalsInFloat: 0, labels: { style: AXIS_LABEL, formatter: v => String(Math.round(v)) } },
    annotations: { yaxis: thiBands(t, range) },
    grid: { borderColor: '#f0f4f2', strokeDashArray: 4, padding: { left: 4, right: 8 } },
    legend: { show: false },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const p = pts[dataPointIndex]
        if (!p || p.thi == null) return ''
        return `<div style="padding:8px 10px;font-size:12px;line-height:1.5">
          <div style="font-weight:800">${thaiHour(p.t)} น.</div>
          <div>THI <b>${p.thi}</b> · <span style="color:${LEVEL_COLOR[p.level]};font-weight:800">${levelName(p.level)}</span></div>
          <div style="color:#4E655B">${p.temp}°C · ความชื้น ${p.hum}%</div>
        </div>`
      }
    }
  }
})
</script>
