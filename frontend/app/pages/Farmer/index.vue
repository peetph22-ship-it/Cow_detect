<template>
  <div class="space-y-5 sm:space-y-6">

    <!-- 1. การ์ดสถานะอากาศหลัก (Hero Ambient Weather Card - ดีไซน์พรีเมียม ตัวเลขใหญ่ แถบ 4 สีเข้าใจทันที) -->
    <section 
      class="rounded-[32px] p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,41,30,0.06)] border transition-all duration-500 overflow-hidden relative"
      :class="heroCardBg">
      
      <!-- แสง Ambient Glow ตกแต่งพื้นหลัง เพิ่มมิติความลึกแบบแอปสมัยใหม่ -->
      <div 
        class="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 transition-colors duration-500"
        :class="ambientGlowColor"></div>

      <!-- แถวบน: ป้ายสถานะสภาพอากาศ + เวลาอัปเดตเซ็นเซอร์ล่าสุด -->
      <div class="relative z-10 flex items-center justify-between gap-2 pb-4">
        <div 
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm sm:text-base border shadow-xs transition-all duration-300"
          :class="statusBadgeStyle">
          <span class="w-2.5 h-2.5 rounded-full" :class="statusDotStyle"></span>
          <span>{{ statusTitle }}</span>
        </div>

        <div class="flex items-center gap-1.5 text-xs sm:text-sm text-[#4A6356] font-bold bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 shadow-2xs">
          <v-icon icon="mdi-clock-outline" size="15" />
          <span>{{ agoText(now?.minutes_ago) || 'เมื่อสักครู่' }}</span>
        </div>
      </div>

      <!-- แถบวัดความร้อน 4 ระดับ (Visual Heat Meter Bar - เห็นสีรู้ทันที ไม่ต้องคำนวณ) -->
      <div class="relative z-10 my-4 bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-black/5 shadow-2xs">
        <div class="flex items-center justify-between text-xs font-black text-[#4A6356] mb-2 px-1">
          <span class="flex items-center gap-1">
            <v-icon icon="mdi-gauge" size="16" class="text-[#2D6A4F]" />
            ระดับความร้อนในคอกวัว
          </span>
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-[#2D6A4F]">NRC 1971 Standard</span>
        </div>

        <!-- แถบ Segment 4 สี -->
        <div class="grid grid-cols-4 gap-1.5 h-3.5 rounded-full overflow-hidden bg-gray-200/70 p-0.5">
          <div 
            class="rounded-full transition-all duration-500"
            :class="heatLevelIndex >= 0 ? 'bg-[#2D6A4F] shadow-xs' : 'bg-gray-200'" 
            title="สบายดี"></div>
          <div 
            class="rounded-full transition-all duration-500"
            :class="heatLevelIndex >= 1 ? 'bg-[#D97706] shadow-xs' : 'bg-gray-200'" 
            title="เริ่มอุ่น"></div>
          <div 
            class="rounded-full transition-all duration-500"
            :class="heatLevelIndex >= 2 ? 'bg-[#EA580C] shadow-xs' : 'bg-gray-200'" 
            title="เริ่มร้อน"></div>
          <div 
            class="rounded-full transition-all duration-500"
            :class="heatLevelIndex >= 3 ? 'bg-[#DC2626] shadow-xs' : 'bg-gray-200'" 
            title="ร้อนจัด"></div>
        </div>

        <!-- ป้ายกำกับ 4 โซน -->
        <div class="grid grid-cols-4 text-[11px] sm:text-xs font-bold text-center mt-2">
          <span :class="heatLevelIndex === 0 ? 'text-[#143225] font-black scale-105' : 'text-[#64748B]'">สบายดี</span>
          <span :class="heatLevelIndex === 1 ? 'text-[#92400E] font-black scale-105' : 'text-[#64748B]'">เริ่มอุ่น</span>
          <span :class="heatLevelIndex === 2 ? 'text-[#9A3412] font-black scale-105' : 'text-[#64748B]'">เริ่มร้อน</span>
          <span :class="heatLevelIndex === 3 ? 'text-[#991B1B] font-black scale-105' : 'text-[#64748B]'">ร้อนจัด!</span>
        </div>
      </div>

      <!-- แผงแสดงตัวเลขอุณหภูมิ & ความชื้น (ขนาดใหญ่ คมชัด สไตล์แอปพรีเมียม) -->
      <div class="relative z-10 grid grid-cols-2 gap-3 my-4">
        <!-- อุณหภูมิ -->
        <div class="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-black/5 shadow-xs flex flex-col justify-between">
          <span class="text-xs sm:text-sm text-[#55695D] font-extrabold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-[#E07A5F]"></span>
            อุณหภูมิในคอก
          </span>
          <div class="flex items-baseline gap-1 mt-2">
            <span class="text-5xl sm:text-6xl font-black tracking-tight tabular-nums text-[#0F291E]">
              {{ now ? Number(now.temperature_c).toFixed(1) : '—' }}
            </span>
            <span class="text-xl sm:text-2xl font-black text-[#55695D]">°C</span>
          </div>
          <span class="text-[11px] text-[#71877A] font-semibold mt-1">เกณฑ์ปลอดภัย: ไม่เกิน 32°C</span>
        </div>

        <!-- ความชื้น -->
        <div class="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-black/5 shadow-xs flex flex-col justify-between">
          <span class="text-xs sm:text-sm text-[#55695D] font-extrabold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-[#2D6A4F]"></span>
            ความชื้นในอากาศ
          </span>
          <div class="flex items-baseline gap-1 mt-2">
            <span class="text-5xl sm:text-6xl font-black tracking-tight tabular-nums text-[#0F291E]">
              {{ now ? Math.round(now.humidity_pct) : '—' }}
            </span>
            <span class="text-xl sm:text-2xl font-black text-[#55695D]">%</span>
          </div>
          <span class="text-[11px] text-[#71877A] font-semibold mt-1">ความชื้นสบายตัว: 60–75%</span>
        </div>
      </div>

      <!-- กล่องคำแนะนำภาษาชาวบ้านเข้าใจง่าย -->
      <div class="relative z-10 p-4 rounded-2xl flex items-start gap-3 border shadow-2xs transition-all" :class="statusBoxStyle">
        <v-icon :icon="statusIcon" size="26" class="shrink-0 mt-0.5" />
        <p class="text-sm sm:text-base font-black leading-relaxed">
          {{ statusMessage }}
        </p>
      </div>

      <!-- ปุ่มฟังเสียงผู้ช่วยภาษาไทย (Waveform Animated Button) -->
      <button
        type="button"
        @click="playVoice"
        class="relative z-10 mt-4 w-full h-15 sm:h-16 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer shadow-md active:scale-[0.99]"
        :class="isSpeaking 
          ? 'bg-gradient-to-r from-[#DC2626] to-[#B91C1C] border-[#DC2626] text-white animate-pulse' 
          : 'bg-gradient-to-r from-[#143225] via-[#1B4332] to-[#2D6A4F] hover:from-[#1B4332] hover:to-[#387e60] border-[#143225] text-white'">
        <v-icon :icon="isSpeaking ? 'mdi-stop-circle' : 'mdi-volume-high'" size="28" />
        <span class="text-base sm:text-lg font-black tracking-wide">
          {{ isSpeaking ? 'กำลังอ่านสรุป... แตะเพื่อหยุดเสียง' : '🔊 กดตรงนี้เพื่อฟังเสียงอ่านสรุปสภาพอากาศ' }}
        </span>
      </button>
    </section>


    <!-- 2. ภารกิจดูแลแม่วัวในคอกวันนี้ (Daily Care Mission Checklist with Progress Bar) -->
    <section class="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_12px_40px_rgba(15,41,30,0.05)] border border-[#E5ECE7]">
      <!-- หัวข้อ + ตัวนับภารกิจ -->
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-base sm:text-lg font-black text-[#0F291E] flex items-center gap-2">
            <v-icon icon="mdi-clipboard-check-outline" class="text-[#2D6A4F]" size="24" />
            ภารกิจดูแลแม่วัวในคอกวันนี้
          </h2>
          <p class="text-xs sm:text-sm text-[#64748B] mt-0.5 font-medium">กดที่การ์ดเพื่อติ๊กเครื่องหมายว่าทำเรียบร้อยแล้ว</p>
        </div>
        <span class="text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full bg-[#EBF6EE] text-[#1B4332] border border-[#CDE8D5] shadow-2xs">
          ทำแล้ว {{ doneCount }}/{{ actionList.length }}
        </span>
      </div>

      <!-- แถบความคืบหน้า (Progress Bar) -->
      <div class="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden mb-4 p-0.5">
        <div 
          class="h-full bg-gradient-to-r from-[#52B788] to-[#2D6A4F] rounded-full transition-all duration-500 shadow-2xs"
          :style="{ width: `${(doneCount / actionList.length) * 100}%` }">
        </div>
      </div>

      <!-- รายการ 4 ภารกิจที่แตะเลือกได้ง่ายมาก -->
      <div class="space-y-3">
        <button
          v-for="act in actionList"
          :key="act.id"
          type="button"
          @click="toggleAction(act.id)"
          class="w-full text-left p-4 sm:p-4.5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-3.5 cursor-pointer select-none active:scale-[0.99]"
          :class="isDone(act.id) 
            ? 'bg-[#EBF6EE] border-[#2D6A4F] text-[#143225] shadow-xs' 
            : 'bg-[#FAFBF9] border-[#E5ECE7] hover:border-gray-300 text-[#334155]'">
          
          <div class="flex items-center gap-3.5 min-w-0">
            <!-- ไอคอนประจำภารกิจ -->
            <div 
              class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold transition-all"
              :class="isDone(act.id) ? 'bg-[#2D6A4F] text-white shadow-sm' : 'bg-white border border-[#E2E8F0] text-[#64748B]'">
              <v-icon :icon="act.icon" size="24" />
            </div>

            <!-- รายละเอียด -->
            <div class="min-w-0">
              <div class="text-base sm:text-lg font-black leading-tight" :class="isDone(act.id) ? 'line-through text-[#2D6A4F]/80' : ''">
                {{ act.title }}
              </div>
              <div class="text-xs sm:text-sm mt-1 leading-snug font-medium" :class="isDone(act.id) ? 'text-[#2D6A4F]/80' : 'text-[#64748B]'">
                {{ act.desc }}
              </div>
            </div>
          </div>

          <!-- ตุ่มเครื่องหมายถูก -->
          <div 
            class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all"
            :class="isDone(act.id) ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs' : 'border-[#CBD5E1] bg-white text-transparent'">
            <v-icon icon="mdi-check" size="22" />
          </div>
        </button>
      </div>
    </section>


    <!-- 3. คาดการณ์ล่วงหน้า (Modern Weather Insights การ์ดบ่ายนี้ & พรุ่งนี้) -->
    <section class="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_12px_40px_rgba(15,41,30,0.05)] border border-[#E5ECE7]">
      <h2 class="text-base sm:text-lg font-black text-[#0F291E] flex items-center gap-2 mb-3">
        <v-icon icon="mdi-weather-cloudy-clock" class="text-[#D97706]" size="24" />
        คาดการณ์อากาศล่วงหน้า
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <!-- บ่ายนี้ -->
        <div class="p-4.5 rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] flex flex-col justify-between shadow-2xs">
          <div class="text-xs sm:text-sm font-black text-[#B45309] flex items-center gap-1.5">
            <v-icon icon="mdi-weather-sunny" size="18" />
            <span>ช่วงที่ร้อนที่สุดของวันนี้</span>
          </div>
          <div class="text-xl sm:text-2xl font-black text-[#78350F] mt-2 leading-snug">
            {{ peakTimeText }}
          </div>
          <div class="text-xs sm:text-sm text-[#92400E] mt-1 font-semibold">
            แนะนำเปิดพัดลมและสเปรย์ละอองน้ำล่วงหน้า
          </div>
        </div>

        <!-- พรุ่งนี้ -->
        <div class="p-4.5 rounded-2xl bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border border-[#BBF7D0] flex flex-col justify-between shadow-2xs">
          <div class="text-xs sm:text-sm font-black text-[#15803D] flex items-center gap-1.5">
            <v-icon icon="mdi-calendar-arrow-right" size="18" />
            <span>แนวโน้มสภาพอากาศพรุ่งนี้</span>
          </div>
          <div class="text-base sm:text-lg font-black text-[#14532D] mt-2 leading-snug">
            {{ tomorrowText }}
          </div>
          <div class="text-xs sm:text-sm text-[#166534] mt-1 font-semibold">
            เตรียมรางน้ำสะอาดสำรองไว้ให้แม่วัว
          </div>
        </div>
      </div>
    </section>


    <!-- 4. ปุ่มโทรด่วนสัตวแพทย์ / สหกรณ์ (Speed Dial Emergency) -->
    <section class="bg-white rounded-[32px] p-6 border border-[#E5ECE7] shadow-[0_12px_40px_rgba(15,41,30,0.05)] space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <v-icon icon="mdi-doctor" class="text-[#2D6A4F]" size="24" />
          <h3 class="text-base font-black text-[#0F291E]">สัตวแพทย์ประจำฟาร์ม</h3>
        </div>
        <span class="text-xs text-[#64748B] font-bold">แตะโทรออกทันที</span>
      </div>

      <a
        v-if="farm?.vet_phone"
        :href="`tel:${cleanPhone(farm.vet_phone)}`"
        class="w-full h-15 sm:h-16 rounded-2xl bg-gradient-to-r from-[#E07A5F] to-[#cf6347] hover:from-[#cf6347] hover:to-[#ba5238] text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 text-decoration-none shadow-md transition-all active:scale-[0.99]">
        <v-icon icon="mdi-phone-in-talk" size="26" />
        <span>โทรหาหมอ {{ farm.vet_phone }}</span>
      </a>
      <div v-else class="text-xs text-[#64748B] p-3.5 rounded-2xl bg-[#FAFBF9] border border-gray-200 font-medium">
        ยังไม่ได้ระบุเบอร์โทรสัตวแพทย์ในระบบ แจ้งเจ้าหน้าที่สหกรณ์เพื่อเพิ่มได้ค่ะ
      </div>
    </section>


    <!-- 5. ข้อมูลเชิงลึกทางเทคนิค (พับเก็บไว้เป็นค่าเริ่มต้น ไม่รบกวนคนแก่) -->
    <section class="bg-white rounded-2xl border border-[#E5ECE7] shadow-2xs overflow-hidden">
      <button
        type="button"
        @click="showDetails = !showDetails"
        class="w-full p-4 flex items-center justify-between text-xs sm:text-sm font-bold text-[#64748B] hover:text-[#0F291E] cursor-pointer transition-colors">
        <div class="flex items-center gap-2">
          <v-icon icon="mdi-information-outline" size="18" />
          <span>ข้อมูลทางเทคนิคของเซ็นเซอร์และเกณฑ์ THI (สำหรับดูเพิ่มเติม)</span>
        </div>
        <v-icon :icon="showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" />
      </button>

      <div v-if="showDetails" class="p-4 pt-0 border-t border-gray-100 text-xs sm:text-sm space-y-2.5 mt-2">
        <div class="flex justify-between py-1.5 border-b border-gray-100">
          <span class="text-[#64748B]">ดัชนี THI ปัจจุบัน:</span>
          <span class="font-mono font-bold text-[#0F291E]">{{ now?.thi != null ? Number(now.thi).toFixed(1) : '—' }}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-gray-100">
          <span class="text-[#64748B]">สถานะเซ็นเซอร์ RS485 (SHT20):</span>
          <span class="font-bold text-[#16A34A]">{{ now?.sensor_status === 'online' ? 'ออนไลน์ปกติ (ส่งทุก 1 นาที)' : 'ออฟไลน์' }}</span>
        </div>
        <div class="flex justify-between py-1.5">
          <span class="text-[#64748B]">เกณฑ์ประเมินความเครียดความร้อน:</span>
          <span class="font-bold text-[#0F291E]">NRC 1971 (THI 72/78/84)</span>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFarmer, agoText } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'หน้าหลักเกษตรกร | CowCare AI' })

const {
  farm,
  now,
  senior,
  doneActions,
  toggleAction,
  isSpeaking,
  speakThai,
  stopSpeech
} = useFarmer()

const showDetails = ref(false)

const cleanPhone = (phone) => String(phone || '').replace(/[^0-9+]/g, '')

// รายการเช็คลิสต์สิ่งที่ต้องทำ
const actionList = computed(() => senior.value?.action_templates || [
  { id: 'fan', title: 'เปิดพัดลมในคอก', desc: 'ช่วยระบายอากาศร้อน ไม่ให้อากาศอับ', icon: 'mdi-fan' },
  { id: 'water_spray', title: 'เปิดละอองน้ำ / สปริงเกลอร์', desc: 'พ่นละอองน้ำเป็นรอบๆ ช่วยลดอุณหภูมิร่างกายวัว', icon: 'mdi-sprinkler-variant' },
  { id: 'fresh_water', title: 'เติมน้ำสะอาดให้เต็มราง', desc: 'แม่วัวกินน้ำเยอะขึ้นเมื่ออากาศร้อน ดื่มน้ำลดเครียด', icon: 'mdi-cup-water' },
  { id: 'check_cow', title: 'สังเกตอาการแม่วัว (ไม่หอบ)', desc: 'ตรวจดูว่ามีตัวไหนยืนหอบ อ้าปาก หรือน้ำลายยืดหรือไม่', icon: 'mdi-cow' }
])

const isDone = (id) => doneActions.value.includes(id)
const doneCount = computed(() => actionList.value.filter(a => isDone(a.id)).length)

// ดัชนีระดับความร้อน (0 = ปกติ, 1 = เริ่มอุ่น, 2 = เริ่มร้อน, 3 = ร้อนจัด)
const heatLevelIndex = computed(() => {
  const lvl = now.value?.risk_level || 'normal'
  if (lvl === 'severe') return 3
  if (lvl === 'moderate') return 2
  if (lvl === 'mild') return 1
  return 0
})

// สไตล์การ์ดหลักแบบ Gradient ออร์แกนิก
const heroCardBg = computed(() => {
  const idx = heatLevelIndex.value
  if (idx === 3) return 'bg-gradient-to-b from-[#FEF2F2] via-[#FFF8F8] to-white border-[#FECACA]'
  if (idx === 2) return 'bg-gradient-to-b from-[#FFF7ED] via-[#FFFDF9] to-white border-[#FED7AA]'
  if (idx === 1) return 'bg-gradient-to-b from-[#FFFBEB] via-[#FFFEFA] to-white border-[#FDE68A]'
  return 'bg-gradient-to-b from-[#EBF7F0] via-[#F4FAF6] to-white border-[#C8E6C9]'
})

const ambientGlowColor = computed(() => {
  const idx = heatLevelIndex.value
  if (idx === 3) return 'bg-[#DC2626]'
  if (idx === 2) return 'bg-[#EA580C]'
  if (idx === 1) return 'bg-[#D97706]'
  return 'bg-[#2D6A4F]'
})

const statusBadgeStyle = computed(() => {
  const idx = heatLevelIndex.value
  if (idx === 3) return 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
  if (idx === 2) return 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]'
  if (idx === 1) return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
  return 'bg-[#E8F5E9] text-[#1B4332] border-[#C8E6C9]'
})

const statusDotStyle = computed(() => {
  const idx = heatLevelIndex.value
  if (idx === 3) return 'bg-[#DC2626] animate-ping'
  if (idx === 2) return 'bg-[#EA580C]'
  if (idx === 1) return 'bg-[#D97706]'
  return 'bg-[#2D6A4F]'
})

const statusBoxStyle = computed(() => {
  const idx = heatLevelIndex.value
  if (idx === 3) return 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
  if (idx === 2) return 'bg-[#FFF7ED] border-[#FED7AA] text-[#9A3412]'
  if (idx === 1) return 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
  return 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
})

const statusIcon = computed(() => {
  const idx = heatLevelIndex.value
  if (idx === 3) return 'mdi-fire-alert'
  if (idx === 2) return 'mdi-weather-sunny-alert'
  if (idx === 1) return 'mdi-weather-partly-cloudy'
  return 'mdi-weather-cloudy-check'
})

const statusTitle = computed(() => {
  const idx = heatLevelIndex.value
  if (idx === 3) return 'อากาศร้อนจัดมาก!'
  if (idx === 2) return 'อากาศเริ่มร้อน'
  if (idx === 1) return 'อากาศเริ่มอุ่น'
  return 'อากาศสบายดี (ปกติ)'
})

const statusMessage = computed(() => senior.value?.message || 'สภาพอากาศในคอกเหมาะสมดี แม่วัวเคี้ยวเอื้องสบาย ให้น้ำนมได้ดี')

const peakTimeText = computed(() => {
  return senior.value?.peak_window_label || 'ช่วง 13:00 – 16:00 น.'
})

const tomorrowText = computed(() => 'สภาพอากาศพรุ่งนี้ใกล้เคียงกับวันนี้ ลมพัดถ่ายเทดี สบายใจได้จ้า')

const playVoice = () => {
  if (isSpeaking.value) {
    stopSpeech()
  } else {
    const text = senior.value?.voice_text || 
      `ตอนนี้ในคอก อุณหภูมิ ${now.value ? Number(now.value.temperature_c).toFixed(1) : '31'} องศาเซลเซียส ${statusTitle.value} ${statusMessage.value}`
    speakThai(text)
  }
}
</script>