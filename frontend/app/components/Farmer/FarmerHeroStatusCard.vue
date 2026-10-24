<template>
  <section
    class="rounded-3xl p-5 sm:p-7 shadow-sm border-2 transition-all duration-300 relative overflow-hidden"
    :class="heroTheme.card">
    <!-- แถบสถานะบนสุด + เวลาอัปเดต -->
    <div class="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-black/10">
      <div
        class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-sm sm:text-base border shadow-2xs"
        :class="heroTheme.badge">
        <v-icon :icon="heroTheme.icon" size="22" />
        <span>{{ heroTheme.shortTag }}</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs sm:text-sm font-bold" :class="heroTheme.subtext">
          {{ now ? `อัปเดต ${agoText(now.minutes_ago)}` : 'ยังไม่มีข้อมูลล่าสุด' }}
        </span>
        <button
          type="button"
          @click="refresh"
          :disabled="loading"
          class="w-9 h-9 rounded-xl bg-white/80 hover:bg-white border border-black/10 flex items-center justify-center text-[#1B342D] cursor-pointer transition-transform active:scale-95"
          title="ดึงข้อมูลล่าสุด">
          <v-icon icon="mdi-refresh" size="18" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
    </div>

    <!-- หัวข้อภาษาชาวบ้านเข้าใจทันที -->
    <div class="mt-4">
      <h2 class="text-xl sm:text-2xl font-black leading-snug" :class="heroTheme.titleText">
        {{ statusTitle }}
      </h2>
      <p class="text-sm sm:text-base font-semibold mt-1 leading-relaxed" :class="heroTheme.bodyText">
        {{ statusMessage }}
      </p>
    </div>

    <!-- ตัวเลขขนาดใหญ่พิเศษ: อุณหภูมิ / ความชื้น / ดัชนีความร้อน THI -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 my-5">
      <!-- 1. อุณหภูมิ -->
      <div class="p-4 rounded-2xl bg-white/90 border border-black/10 shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between gap-1">
          <span class="text-xs sm:text-sm font-extrabold text-[#4E655B]">อุณหภูมิในคอก</span>
          <v-icon icon="mdi-thermometer" size="20" class="text-[#D87939]" />
        </div>
        <div class="flex items-baseline gap-1 mt-2">
          <span class="text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-[#1B342D]">
            {{ now?.temperature_c != null ? Number(now.temperature_c).toFixed(1) : '—' }}
          </span>
          <span class="text-lg sm:text-2xl font-extrabold text-[#4E655B]">°C</span>
        </div>
        <div v-if="today?.max_temp != null && today?.min_temp != null" class="text-[11px] sm:text-xs font-bold text-[#4E655B] mt-2 pt-1.5 border-t border-black/5">
          วันนี้ {{ today.min_temp }}° – {{ today.max_temp }}°C
        </div>
      </div>

      <!-- 2. ความชื้นสัมพัทธ์ -->
      <div class="p-4 rounded-2xl bg-white/90 border border-black/10 shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between gap-1">
          <span class="text-xs sm:text-sm font-extrabold text-[#4E655B]">ความชื้นในอากาศ</span>
          <v-icon icon="mdi-water-percent" size="22" class="text-[#0284C7]" />
        </div>
        <div class="flex items-baseline gap-1 mt-2">
          <span class="text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-[#1B342D]">
            {{ now?.humidity_pct != null ? Math.round(now.humidity_pct) : '—' }}
          </span>
          <span class="text-lg sm:text-2xl font-extrabold text-[#4E655B]">%</span>
        </div>
        <div v-if="cooling" class="text-[11px] sm:text-xs font-bold mt-2 pt-1.5 border-t border-black/5"
          :class="cooling.humid ? 'text-[#B45309]' : 'text-[#15803D]'">
          {{ cooling.humid ? 'อากาศชื้นมาก (งดหมอกฝอย)' : 'ความชื้นปกติ ระบายอากาศได้ดี' }}
        </div>
      </div>

      <!-- 3. ค่าดัชนีความร้อน (THI) + หลอดระดับ -->
      <div class="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white/90 border border-black/10 shadow-2xs flex flex-col justify-between">
        <div class="flex items-center justify-between gap-1">
          <span class="text-xs sm:text-sm font-extrabold text-[#4E655B]">ระดับความอึดอัด (THI)</span>
          <span
            class="text-xs font-black px-2 py-0.5 rounded-full"
            :class="heroTheme.badge">
            {{ heroTheme.shortTag }}
          </span>
        </div>

        <div class="flex items-baseline justify-between gap-2 mt-2">
          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl sm:text-5xl font-black tracking-tight tabular-nums text-[#1B342D]">
              {{ now?.thi != null ? Number(now.thi).toFixed(1) : '—' }}
            </span>
            <span class="text-xs sm:text-sm font-bold text-[#4E655B]">หน่วย</span>
          </div>
          <span v-if="today?.avg_thi != null" class="text-xs font-bold text-[#4E655B]">
            เฉลี่ยวันนี้ {{ today.avg_thi }}
          </span>
        </div>

        <!-- หลอดวัดระดับความร้อน (Visual Gauge) -->
        <div class="mt-2.5">
          <div class="h-3 w-full rounded-full overflow-hidden grid grid-cols-4 gap-0.5 bg-black/10 p-0.5 relative">
            <div class="bg-[#16A34A] rounded-l-full"></div>
            <div class="bg-[#F59E0B]"></div>
            <div class="bg-[#EA580C]"></div>
            <div class="bg-[#DC2626] rounded-r-full"></div>
          </div>
          <!-- เข็มชี้ตำแหน่งปัจจุบัน -->
          <div v-if="now?.thi != null" class="relative h-2 mt-0.5">
            <div
              class="w-3 h-3 rounded-full bg-[#1B342D] border-2 border-white shadow-sm -top-3.5 -translate-x-1/2 absolute transition-all duration-300"
              :style="{ left: `${gaugePercent}%` }"></div>
          </div>
          <div class="grid grid-cols-4 text-[10px] font-bold text-[#4E655B] mt-0.5 text-center">
            <span v-for="(lbl, idx) in gaugeLabels" :key="idx" class="truncate">{{ lbl }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ปุ่มกดฟังเสียงสรุปขนาดใหญ่ -->
    <button
      type="button"
      @click="$emit('play-voice')"
      class="w-full min-h-[54px] px-4 py-3 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-[0.99] border-2"
      :class="isSpeaking
        ? 'bg-[#DC2626] text-white border-[#991B1B]'
        : 'bg-[#1B342D] hover:bg-[#24433A] text-[#FFFDF7] border-[#1B342D]'">
      <v-icon :icon="isSpeaking ? 'mdi-stop-circle' : 'mdi-volume-high'" size="24" class="text-[#F3C68F]" />
      <span>{{ isSpeaking ? 'กดเพื่อหยุดเสียงอ่าน' : 'กดฟังเสียงสรุปสภาพอากาศตอนนี้' }}</span>
    </button>
  </section>
</template>

<script setup>
import { useFarmer, agoText } from '~/composables/useFarmer'
import { thresholdLabels } from '~/utils/heatStress'

defineEmits(['play-voice'])

const {
  farm,
  now,
  today,
  cooling,
  senior,
  thresholds,
  loading,
  isSpeaking,
  refresh
} = useFarmer()

// ไม่มีข้อมูล หรือกล่องไม่ได้ส่งค่าล่าสุด = ไม่บอกระดับความเสี่ยงจากค่าเก่า
const noFreshData = computed(() => !now.value || now.value.sensor_status !== 'online')
const riskLevel = computed(() => (noFreshData.value ? 'nodata' : (now.value?.risk_level || 'normal')))

const statusTitle = computed(() => {
  if (riskLevel.value === 'nodata') return now.value ? 'กล่องเซ็นเซอร์ไม่ได้ส่งข้อมูลล่าสุด' : 'ยังไม่มีข้อมูลจากกล่องเซ็นเซอร์'
  if (senior.value?.title) return senior.value.title
  if (riskLevel.value === 'severe') return 'อากาศร้อนจัดมาก แม่วัวกำลังเครียด!'
  if (riskLevel.value === 'moderate') return 'อากาศร้อน แม่วัวเริ่มอึดอัดและหอบ'
  if (riskLevel.value === 'mild') return 'อากาศเริ่มอุ่นขึ้น ควรเฝ้าระวังช่วงบ่าย'
  return 'อากาศสบายดี แม่วัวไม่เครียด'
})

const statusMessage = computed(() => {
  if (riskLevel.value === 'nodata') {
    return now.value
      ? `ค่าที่เห็นเป็นค่าล่าสุดเมื่อ ${now.value.minutes_ago ?? '?'} นาทีที่แล้ว ยังบอกไม่ได้ว่าตอนนี้วัวเครียดหรือไม่ ตรวจปลั๊กไฟและอินเทอร์เน็ตของกล่อง`
      : 'เมื่อกล่องเริ่มส่งข้อมูล หน้านี้จะแสดงสภาพในคอกให้อัตโนมัติ'
  }
  if (senior.value?.message) return senior.value.message
  if (riskLevel.value === 'severe') {
    return 'อุณหภูมิและความชื้นสูงถึงระดับวิกฤต เสี่ยงน้ำนมลดลงมาก รีบเปิดพัดลมระบายอากาศและช่วยลดความร้อนให้แม่วัวทันที'
  }
  if (riskLevel.value === 'moderate' || riskLevel.value === 'mild') {
    return 'ความร้อนสะสมในคอกเริ่มสูงขึ้น แนะนำให้เปิดพัดลมช่วยระบายอากาศ และตรวจรางน้ำดื่มให้มีน้ำสะอาดเต็มเสมอ'
  }
  return 'สภาพอากาศในคอกร่มรื่น แม่วัวกินอาหารและนอนเคี้ยวเอื้องได้ตามปกติ'
})

const heroTheme = computed(() => {
  if (riskLevel.value === 'nodata') {
    return {
      shortTag: 'ไม่มีข้อมูลล่าสุด',
      icon: 'mdi-wifi-off',
      card: 'bg-[#F3F4F6] border-[#D1D5DB]',
      badge: 'bg-[#6B7280] text-white border-[#4B5563]',
      titleText: 'text-[#1F2937]',
      bodyText: 'text-[#374151]',
      subtext: 'text-[#4B5563]'
    }
  }
  if (riskLevel.value === 'severe') {
    return {
      shortTag: 'ร้อนจัดวิกฤต!',
      icon: 'mdi-alert-octagon',
      card: 'bg-[#FEF2F2] border-[#FCA5A5]',
      badge: 'bg-[#DC2626] text-white border-[#B91C1C]',
      titleText: 'text-[#7F1D1D]',
      bodyText: 'text-[#991B1B]',
      subtext: 'text-[#991B1B]'
    }
  }
  if (riskLevel.value === 'moderate') {
    return {
      shortTag: 'อากาศร้อน',
      icon: 'mdi-fire-alert',
      card: 'bg-[#FFF7ED] border-[#FDBA74]',
      badge: 'bg-[#EA580C] text-white border-[#C2410C]',
      titleText: 'text-[#7C2D12]',
      bodyText: 'text-[#9A3412]',
      subtext: 'text-[#9A3412]'
    }
  }
  if (riskLevel.value === 'mild') {
    return {
      shortTag: 'เริ่มอุ่น เฝ้าระวัง',
      icon: 'mdi-weather-sunny-alert',
      card: 'bg-[#FFFBEB] border-[#FDE68A]',
      badge: 'bg-[#D97706] text-white border-[#B45309]',
      titleText: 'text-[#78350F]',
      bodyText: 'text-[#92400E]',
      subtext: 'text-[#92400E]'
    }
  }
  return {
    shortTag: 'สบายดี',
    icon: 'mdi-emoticon-happy-outline',
    card: 'bg-[#ECFDF5] border-[#A7F3D0]',
    badge: 'bg-[#1B4332] text-white border-[#143225]',
    titleText: 'text-[#143225]',
    bodyText: 'text-[#1B4332]',
    subtext: 'text-[#2D6A4F]'
  }
})

const gaugeLabels = computed(() => thresholdLabels(farm.value?.profile))

const gaugePercent = computed(() => {
  const val = Number(now.value?.thi)
  if (!Number.isFinite(val)) return 0
  const t = thresholds.value
  const minVal = t.mild - 8
  const maxVal = t.severe + 6
  const pct = ((val - minVal) / (maxVal - minVal)) * 100
  return Math.max(4, Math.min(96, Math.round(pct)))
})
</script>
