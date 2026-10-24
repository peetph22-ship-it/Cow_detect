<template>
  <section
    v-if="forecastDays.length || simpleForecastText || insufficientReason"
    class="bg-[#FFFDF7] rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E6DEC8] space-y-4">
    <!-- หัวข้อการ์ด -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-base sm:text-lg font-black text-[#1B342D] flex items-center gap-2">
          <v-icon icon="mdi-calendar-clock" class="text-[#D87939]" size="24" />
          <span>พยากรณ์อากาศในคอกล่วงหน้า 3 วัน</span>
        </h2>
        <p class="text-xs sm:text-sm text-[#4E655B] font-medium mt-0.5">
          เตรียมเปิดพัดลมและสำรองน้ำดื่มล่วงหน้าโดยไม่ต้องอ่านกราฟ
        </p>
      </div>
    </div>

    <!-- กรณีมีรายการพยากรณ์รายวัน (forecast.days) -->
    <div v-if="forecastDays.length" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div
        v-for="(d, idx) in forecastDays"
        :key="d.date || idx"
        class="p-4 rounded-2xl border-2 flex flex-col justify-between transition-all"
        :class="dayCardStyle(d.risk_level)">
        <div>
          <!-- ชื่อวัน + ป้ายระดับ -->
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="text-sm sm:text-base font-black text-[#1B342D]">
                {{ dayTitle(d, idx) }}
              </div>
              <div v-if="d.date" class="text-xs font-bold text-[#4E655B]">
                {{ thaiDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' }) }}
              </div>
            </div>

            <span
              class="text-xs font-black px-2.5 py-1 rounded-full shrink-0"
              :class="dayBadgeStyle(d.risk_level)">
              {{ dayRiskLabel(d.risk_level) }}
            </span>
          </div>

          <!-- คำอธิบายสั้น -->
          <p class="text-xs sm:text-sm font-bold text-[#1B342D] mt-3 leading-snug">
            {{ dayAdvice(d) }}
          </p>
        </div>

        <div
          v-if="d.predicted_thi != null"
          class="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-xs font-extrabold text-[#4E655B]">
          <span>ค่าความร้อนคาดการณ์ (THI)</span>
          <span class="text-sm font-black text-[#1B342D] tabular-nums">{{ Number(d.predicted_thi).toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <!-- กรณีไม่มี forecast.days แต่มีข้อความสรุปจาก senior.forecast_simple -->
    <div
      v-else-if="simpleForecastText"
      class="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center gap-3">
      <v-icon icon="mdi-weather-partly-cloudy" size="28" class="text-[#15803D] shrink-0" />
      <p class="text-sm sm:text-base font-bold text-[#14532D] leading-snug">
        {{ simpleForecastText }}
      </p>
    </div>

    <!-- กรณีข้อมูลในคอกยังไม่ครบเกณฑ์พยากรณ์ -->
    <div
      v-else-if="insufficientReason"
      class="p-4 rounded-2xl bg-[#F4EFE4] border border-[#E6DEC8] text-xs sm:text-sm font-semibold text-[#4E655B] flex items-center gap-2.5">
      <v-icon icon="mdi-information-outline" size="20" class="text-[#D87939] shrink-0" />
      <span>{{ insufficientReason }}</span>
    </div>
  </section>
</template>

<script setup>
import { useFarmer, thaiDate } from '~/composables/useFarmer'

const { forecast, senior } = useFarmer()

const forecastDays = computed(() => forecast.value?.days || [])
const simpleForecastText = computed(() => senior.value?.forecast_simple || '')
const insufficientReason = computed(() =>
  forecast.value?.insufficient_data ? (forecast.value.reason || 'กำลังสะสมข้อมูลเซ็นเซอร์เพื่อพยากรณ์ล่วงหน้า') : ''
)

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
  return 'bg-[#1B4332] text-white'
}

const dayAdvice = (d) => {
  if (d.advisory) return d.advisory
  if (d.risk_level === 'severe') return 'คาดว่าจะร้อนจัด เตรียมเปิดพัดลมและสำรองน้ำดื่มให้พร้อม'
  if (d.risk_level === 'moderate') return 'ช่วงบ่ายจะค่อนข้างร้อน ควรเปิดพัดลมระบายอากาศ'
  if (d.risk_level === 'mild') return 'อากาศเริ่มอุ่นช่วงบ่าย เตรียมน้ำสะอาดให้เต็มราง'
  return 'สภาพอากาศโปร่งสบาย แม่วัวกินอาหารได้ตามปกติ'
}
</script>
