<template>
  <section class="bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-2xl bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-chart-bar-stacked" size="22" />
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-black text-[#142820] leading-tight">
            ชั่วโมงร้อนแต่ละวัน 7 วันล่าสุด
          </h2>
          <p class="text-xs text-[#64766D] font-medium">
            แท่งยิ่งสูง วันนั้นแม่วัวเจอความร้อนนานขึ้น
          </p>
        </div>
      </div>

      <NuxtLink
        to="/Farmer/history"
        class="px-3 py-1.5 rounded-full bg-[#F4F6F4] hover:bg-[#E6ECE8] text-xs font-extrabold text-[#142820] flex items-center gap-1 text-decoration-none shrink-0">
        <span>ดูรายละเอียด</span>
        <v-icon icon="mdi-arrow-right" size="14" />
      </NuxtLink>
    </div>

    <template v-if="hasData">
      <ApexChart v-if="chartHeight" type="bar" :height="chartHeight" :options="options" :series="series" />
      <p v-if="missingDays" class="text-[11px] font-bold text-[#64766D]">
        * วันที่ไม่มีแท่งและเขียนว่า "ไม่มีข้อมูล" คือวันที่กล่องเซ็นเซอร์ไม่ได้ส่งข้อมูล ไม่ใช่วันที่อากาศสบาย
      </p>
    </template>

    <div
      v-else
      class="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E4E8E5] text-xs sm:text-sm font-semibold text-[#4E655B] flex items-center gap-2.5">
      <v-icon icon="mdi-information-outline" size="20" class="text-[#D87939] shrink-0" />
      <span>ยังไม่มีข้อมูลจากกล่องเซ็นเซอร์ใน 7 วันที่ผ่านมา</span>
    </div>
  </section>
</template>

<script setup>
import { useFarmer, RISK_SHORT } from '~/composables/useFarmer'
import { baseChart, AXIS_LABEL, thaiDay, LEVEL_COLOR } from '~/utils/farmerCharts'

const { charts } = useFarmer()

const days = computed(() => charts.value?.week || [])
const hasData = computed(() => days.value.some(d => d.has_data))
const missingDays = computed(() => days.value.filter(d => !d.has_data).length)

// ตั้งความสูงก่อนวาดกราฟครั้งแรก (เปลี่ยนความสูงหลังวาดแล้ว ApexCharts บนมือถือไม่วาดกราฟ)
const chartHeight = ref(0)
onMounted(() => { chartHeight.value = window.innerWidth < 640 ? 220 : 250 })

const KEYS = [
  { key: 'mild_hours', level: 'mild' },
  { key: 'moderate_hours', level: 'moderate' },
  { key: 'severe_hours', level: 'severe' }
]

const series = computed(() => KEYS.map(k => ({
  name: RISK_SHORT[k.level],
  data: days.value.map(d => (d.has_data ? d[k.key] : 0))
})))

// ป้ายแกน 2 บรรทัด: วัน + "วันนี้" หรือ "ไม่มีข้อมูล"
const label = d => {
  const day = thaiDay(d.date)
  if (!d.has_data) return [day, 'ไม่มีข้อมูล']
  return d.is_today ? [day, 'วันนี้'] : [day]
}

const options = computed(() => {
  const ds = days.value
  const maxH = Math.max(...ds.map(d => (d.mild_hours || 0) + (d.moderate_hours || 0) + (d.severe_hours || 0)), 0)
  return {
    chart: { ...baseChart, type: 'bar', stacked: true },
    colors: KEYS.map(k => LEVEL_COLOR[k.level]),
    plotOptions: { bar: { columnWidth: '58%', borderRadius: 4, borderRadiusApplication: 'end', borderRadiusWhenStacked: 'last' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ds.map(label),
      labels: { rotate: 0, style: AXIS_LABEL },
      axisTicks: { show: false }
    },
    yaxis: {
      min: 0,
      // ขั้นละ 2/4/6/8 ชม. ให้ตัวเลขแกนเป็นจำนวนเต็มสวยๆ เสมอ
      max: Math.max(6, Math.ceil(maxH / 6) * 6),
      tickAmount: 3,
      decimalsInFloat: 0,
      title: { text: 'ชั่วโมง', style: { fontSize: '11px', color: '#4E655B', fontWeight: 700 } },
      labels: { style: AXIS_LABEL, formatter: v => String(Math.round(v)) }
    },
    legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px', fontWeight: 700, markers: { size: 6 } },
    grid: { borderColor: '#f0f4f2', strokeDashArray: 4, padding: { left: 4, right: 4 } },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }) => {
        const d = ds[dataPointIndex]
        if (!d) return ''
        const head = `<div style="font-weight:800">${thaiDay(d.date)}${d.is_today ? ' (วันนี้ ถึงตอนนี้)' : ''}</div>`
        if (!d.has_data) return `<div style="padding:8px 10px;font-size:12px">${head}<div>ไม่มีข้อมูลจากกล่องเซ็นเซอร์</div></div>`
        const rows = KEYS.map(k => `<div><span style="color:${LEVEL_COLOR[k.level]};font-weight:800">${RISK_SHORT[k.level]}</span> ${d[k.key]} ชม.</div>`).join('')
        return `<div style="padding:8px 10px;font-size:12px;line-height:1.5">${head}${rows}
          <div style="color:#4E655B">THI เฉลี่ย ${d.avg_thi} · มีข้อมูล ${d.data_hours} ชม. (${d.coverage_pct}%)</div></div>`
      }
    }
  }
})
</script>
