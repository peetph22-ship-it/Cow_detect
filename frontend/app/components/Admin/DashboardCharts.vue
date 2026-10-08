<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-300">
    <!-- Area Chart (THI Trend + Forecast) -->
    <div class="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] p-8">
      <h3 class="font-black text-[#24433a] text-lg mb-1 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[#d87939]"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        THI Trend & Forecast (พยากรณ์ล่วงหน้า 3 วัน)
      </h3>
      <p class="text-[13px] text-[#718078] mb-6">โมเดล LSTM พยากรณ์ระดับความรุนแรงของ THI เพื่อเตรียมการรับมือ</p>
      <div class="h-[280px]">
        <ClientOnly>
          <ApexChart type="line" height="100%" :options="areaChartOptions" :series="areaSeries" />
          <template #fallback>
            <div class="w-full h-full flex items-center justify-center text-[#718078] bg-[#edf3ed]/30 rounded-2xl animate-pulse">
              กำลังโหลดโมเดล LSTM...
            </div>
          </template>
        </ClientOnly>
      </div>
    </div>

    <!-- Donut Chart (Farm Status) -->
    <div class="bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] p-8 flex flex-col">
      <h3 class="font-black text-[#24433a] text-lg mb-1 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[#d87939]"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
        สัดส่วนสภาวะฟาร์ม
      </h3>
      <p class="text-[13px] text-[#718078] mb-6">แบ่งตามระดับความเสี่ยงแบบเรียลไทม์</p>
      <div class="flex-1 flex items-center justify-center relative">
        <ClientOnly>
          <ApexChart type="donut" width="100%" height="280" :options="donutOptions" :series="donutSeries" />
          <template #fallback>
            <div class="w-48 h-48 rounded-full border-8 border-[#edf3ed] border-t-[#d87939] animate-spin"></div>
          </template>
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 1. Line/Area Chart (THI Trend + Forecast)
const areaSeries = ref([
  {
    name: 'THI เฉลี่ย (ข้อมูลจริง)',
    type: 'area',
    data: [68, 71, 70, 72, 73, 75, 78, null, null, null, null] 
  },
  {
    name: 'LSTM พยากรณ์ล่วงหน้า',
    type: 'line',
    data: [null, null, null, null, null, null, 78, 80, 83, 85, 82] 
  }
])

const areaChartOptions = ref({
  chart: {
    type: 'line',
    fontFamily: 'inherit',
    toolbar: { show: false },
    zoom: { enabled: false },
    dropShadow: { enabled: true, top: 4, left: 0, blur: 4, opacity: 0.1 }
  },
  colors: ['#d87939', '#e04f4f'],
  fill: {
    type: ['gradient', 'solid'],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.05,
      stops: [0, 100]
    }
  },
  dataLabels: { enabled: false },
  stroke: { 
    curve: 'smooth', 
    width: [3, 3],
    dashArray: [0, 6]
  },
  annotations: {
    yaxis: [
      {
        y: 70,
        borderColor: '#f59e0b',
        strokeDashArray: 4,
        label: {
          borderColor: '#f59e0b',
          style: { color: '#fff', background: '#f59e0b', fontSize: '11px', fontWeight: 600, padding: { left: 8, right: 8, top: 4, bottom: 4 } },
          text: 'THI 70 (เกณฑ์อันตราย)'
        }
      },
      {
        y: 80,
        borderColor: '#e04f4f',
        strokeDashArray: 4,
        label: {
          borderColor: '#e04f4f',
          style: { color: '#fff', background: '#e04f4f', fontSize: '11px', fontWeight: 600, padding: { left: 8, right: 8, top: 4, bottom: 4 } },
          text: 'THI 80 (วิกฤตรุนแรง)'
        }
      }
    ]
  },
  xaxis: {
    categories: ['-6 วัน', '-5 วัน', '-4 วัน', '-3 วัน', '-2 วัน', 'เมื่อวาน', 'วันนี้', 'พรุ่งนี้', '+2 วัน', '+3 วัน', '+4 วัน'],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#718078', fontSize: '12px', fontWeight: 700 } }
  },
  yaxis: {
    min: 60,
    max: 90,
    labels: { style: { colors: '#718078', fontSize: '12px', fontWeight: 700 } }
  },
  grid: {
    borderColor: 'rgba(36, 67, 58, 0.06)',
    strokeDashArray: 4,
    yaxis: { lines: { show: true } },
    xaxis: { lines: { show: true } }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    labels: { colors: '#4e6057', useSeriesColors: false },
    itemMargin: { horizontal: 10 }
  },
  tooltip: {
    theme: 'light',
    y: { formatter: (val) => val ? val + " THI" : 'N/A' }
  }
})

// 2. Donut Chart (Farm Status Proportion)
const donutSeries = ref([28, 10, 4])
const donutOptions = ref({
  chart: {
    type: 'donut',
    fontFamily: 'inherit',
  },
  labels: ['ปกติ (Normal)', 'เสี่ยงปานกลาง', 'วิกฤต (Severe)'],
  colors: ['#10b981', '#f59e0b', '#e04f4f'],
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          name: { fontSize: '12px', color: '#718078', fontWeight: 700, offsetY: -5 },
          value: { fontSize: '32px', color: '#24433a', fontWeight: 900, offsetY: 10 },
          total: {
            show: true,
            label: 'ฟาร์มทั้งหมด',
            color: '#718078',
            fontSize: '13px',
            fontWeight: 800,
            formatter: function (w) {
              return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
            }
          }
        }
      }
    }
  },
  dataLabels: { enabled: false },
  stroke: { show: true, colors: '#ffffff', width: 4 },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    markers: { radius: 12 },
    itemMargin: { horizontal: 10, vertical: 8 },
    labels: { colors: '#4e6057', useSeriesColors: false }
  },
  tooltip: { theme: 'light' }
})
</script>
