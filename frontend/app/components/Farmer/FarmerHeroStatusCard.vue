<template>
  <section
    class="h-full rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.06)] border-2 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
    :class="heroTheme.card">
    <!-- แสงเรืองด้านหลังการ์ด -->
    <div
      class="w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none absolute -top-12 -right-12"
      :class="heroTheme.glow"></div>

    <div>
      <!-- แถวบนสุด: ป้ายสถานะ + เวลาอัปเดต -->
      <div class="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-black/10 relative z-10">
        <div
          class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-xs sm:text-sm border shadow-2xs"
          :class="heroTheme.badge">
          <v-icon :icon="heroTheme.icon" size="20" />
          <span>{{ heroTheme.shortTag }}</span>
        </div>

        <span class="text-xs sm:text-sm font-bold" :class="heroTheme.subtext">
          {{ now ? `อัปเดต ${agoText(now.minutes_ago)}` : 'ยังไม่มีข้อมูลจากกล่องเซ็นเซอร์' }}
        </span>
      </div>

      <!-- หัวข้อสรุปภาษาชาวบ้าน -->
      <div class="mt-4 relative z-10">
        <h2 class="text-xl sm:text-2xl lg:text-[26px] font-black leading-snug tracking-tight" :class="heroTheme.titleText">
          {{ statusTitle }}
        </h2>
        <p class="text-xs sm:text-sm font-semibold mt-1.5 leading-relaxed" :class="heroTheme.bodyText">
          {{ statusMessage }}
        </p>
      </div>

      <!-- 3 กล่องตัวเลขหลัก: อุณหภูมิ / ความชื้น / ดัชนีความร้อน THI -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 relative z-10">
        <!-- 1. อุณหภูมิ -->
        <div class="p-4 rounded-2xl bg-white/95 border border-black/8 shadow-2xs flex flex-col justify-between">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-extrabold text-[#4E655B]">อุณหภูมิในคอก</span>
            <div class="w-8 h-8 rounded-xl bg-orange-50 text-[#D87939] flex items-center justify-center">
              <v-icon icon="mdi-thermometer" size="18" />
            </div>
          </div>
          <div class="flex items-baseline gap-1 mt-2">
            <span class="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-[#142820]">
              {{ now?.temperature_c != null ? Number(now.temperature_c).toFixed(1) : '—' }}
            </span>
            <span class="text-base sm:text-lg font-extrabold text-[#4E655B]">°C</span>
          </div>
          <div class="text-[11px] font-bold text-[#64766D] mt-2 pt-1.5 border-t border-black/5">
            <span v-if="today?.max_temp != null && today?.min_temp != null">
              วันนี้ {{ today.min_temp }}° – {{ today.max_temp }}°C
            </span>
            <span v-else>วัดจากหัววัด SHT20</span>
          </div>
        </div>

        <!-- 2. ความชื้นสัมพัทธ์ -->
        <div class="p-4 rounded-2xl bg-white/95 border border-black/8 shadow-2xs flex flex-col justify-between">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-extrabold text-[#4E655B]">ความชื้นสัมพัทธ์</span>
            <div class="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <v-icon icon="mdi-water-percent" size="20" />
            </div>
          </div>
          <div class="flex items-baseline gap-1 mt-2">
            <span class="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-[#142820]">
              {{ now?.humidity_pct != null ? Math.round(now.humidity_pct) : '—' }}
            </span>
            <span class="text-base sm:text-lg font-extrabold text-[#4E655B]">%</span>
          </div>
          <div
            class="text-[11px] font-bold mt-2 pt-1.5 border-t border-black/5"
            :class="!noFreshData && cooling ? (cooling.humid ? 'text-[#B45309]' : 'text-[#15803D]') : 'text-[#64766D]'">
            <span v-if="!noFreshData && cooling">
              {{ cooling.humid ? 'ชื้นสูง · งดพ่นหมอกฝอย' : 'พ่นหมอกคู่พัดลมได้' }}
            </span>
            <span v-else>เกณฑ์ชื้นสูง ≥ 75%</span>
          </div>
        </div>

        <!-- 3. ค่าดัชนีความร้อน (THI) + หลอดระดับ -->
        <div class="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white/95 border border-black/8 shadow-2xs flex flex-col justify-between">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-extrabold text-[#4E655B]">ค่าความอึดอัด (THI)</span>
            <span v-if="today?.avg_thi != null" class="text-[11px] font-bold text-[#64766D]">
              เฉลี่ย {{ today.avg_thi }}
            </span>
          </div>

          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-[#142820]">
              {{ now?.thi != null ? Number(now.thi).toFixed(1) : '—' }}
            </span>
            <span class="text-xs font-bold text-[#4E655B]">หน่วย</span>
          </div>

          <!-- หลอดวัดระดับความร้อน (Visual Gauge) -->
          <div class="mt-2">
            <div class="h-2.5 w-full rounded-full overflow-hidden grid grid-cols-4 gap-0.5 bg-black/10 p-0.5 relative">
              <div class="bg-[#16A34A] rounded-l-full"></div>
              <div class="bg-[#F59E0B]"></div>
              <div class="bg-[#EA580C]"></div>
              <div class="bg-[#DC2626] rounded-r-full"></div>
            </div>
            <div v-if="now?.thi != null" class="relative h-1.5 mt-0.5">
              <div
                class="w-3 h-3 rounded-full bg-[#142820] border-2 border-white shadow-sm -top-3 -translate-x-1/2 absolute transition-all duration-300"
                :style="{ left: `${gaugePercent}%` }"></div>
            </div>
            <div class="grid grid-cols-4 text-[9px] font-extrabold text-[#4E655B] mt-0.5 text-center">
              <span v-for="(lbl, idx) in gaugeLabels" :key="idx" class="truncate">{{ lbl }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useFarmer, agoText, RISK_SHORT } from '~/composables/useFarmer'

const {
  farm,
  now,
  today,
  cooling,
  senior,
  thresholds
} = useFarmer()

// ไม่มีข้อมูล หรือกล่องไม่ได้ส่งค่าล่าสุด = ไม่บอกระดับความเสี่ยงจากค่าเก่า
const noFreshData = computed(() => !now.value || now.value.sensor_status !== 'online')
const riskLevel = computed(() => (noFreshData.value ? 'nodata' : (now.value?.risk_level || 'normal')))

const statusTitle = computed(() => {
  if (riskLevel.value === 'nodata') {
    return now.value ? 'กล่องเซ็นเซอร์ไม่ได้ส่งข้อมูลล่าสุด' : 'ยังไม่มีข้อมูลจากกล่องเซ็นเซอร์'
  }
  if (senior.value?.title) return senior.value.title
  if (riskLevel.value === 'severe') return 'อากาศร้อนจัดมาก แม่วัวกำลังเครียด!'
  if (riskLevel.value === 'moderate') return 'อากาศร้อน แม่วัวเริ่มอึดอัดและหอบ'
  if (riskLevel.value === 'mild') return 'อากาศเริ่มอุ่นขึ้น ควรเฝ้าระวังช่วงบ่าย'
  return 'อากาศสบายดี แม่วัวไม่เครียด'
})

const statusMessage = computed(() => {
  if (riskLevel.value === 'nodata') {
    return now.value
      ? `ค่าที่เห็นเป็นค่าล่าสุดเมื่อ ${now.value.minutes_ago ?? '?'} นาทีที่แล้ว ยังบอกไม่ได้ว่าตอนนี้วัวเครียดหรือไม่ กรุณาตรวจปลั๊กไฟและอินเทอร์เน็ตของกล่อง`
      : 'เมื่อกล่องเริ่มส่งข้อมูลอุณหภูมิและความชื้น หน้านี้จะแสดงสถานะความร้อนของคอกทันที'
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
      shortTag: now.value ? 'ไม่มีข้อมูลสด' : 'ยังไม่มีข้อมูล',
      icon: 'mdi-wifi-off',
      card: 'bg-white border-[#CBD5E1]',
      glow: 'bg-slate-300',
      badge: 'bg-[#475569] text-white border-[#334155]',
      titleText: 'text-[#1E293B]',
      bodyText: 'text-[#475569]',
      subtext: 'text-[#64748B]'
    }
  }
  if (riskLevel.value === 'severe') {
    return {
      shortTag: 'ร้อนจัด!',
      icon: 'mdi-alert-octagon',
      card: 'bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2]/60 border-[#FCA5A5]',
      glow: 'bg-rose-400',
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
      card: 'bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5]/60 border-[#FDBA74]',
      glow: 'bg-orange-400',
      badge: 'bg-[#EA580C] text-white border-[#C2410C]',
      titleText: 'text-[#7C2D12]',
      bodyText: 'text-[#9A3412]',
      subtext: 'text-[#9A3412]'
    }
  }
  if (riskLevel.value === 'mild') {
    return {
      shortTag: 'เริ่มอุ่น',
      icon: 'mdi-weather-sunny-alert',
      card: 'bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7]/60 border-[#FDE68A]',
      glow: 'bg-amber-400',
      badge: 'bg-[#D97706] text-white border-[#B45309]',
      titleText: 'text-[#78350F]',
      bodyText: 'text-[#92400E]',
      subtext: 'text-[#92400E]'
    }
  }
  return {
    shortTag: 'สบายดี',
    icon: 'mdi-emoticon-happy-outline',
    card: 'bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5]/50 border-[#A7F3D0]',
    glow: 'bg-emerald-400',
    badge: 'bg-[#142820] text-white border-[#142820]',
    titleText: 'text-[#142820]',
    bodyText: 'text-[#1B4332]',
    subtext: 'text-[#2D6A4F]'
  }
})

// คำเรียกระดับชุดเดียวกับทุกหน้าของเกษตรกร (RISK_SHORT)
const gaugeLabels = computed(() => {
  const t = thresholds.value
  return [
    `${RISK_SHORT.normal} (<${t.mild})`,
    `${RISK_SHORT.mild} (${t.mild})`,
    `${RISK_SHORT.moderate} (${t.moderate})`,
    `${RISK_SHORT.severe} (${t.severe}+)`
  ]
})

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
