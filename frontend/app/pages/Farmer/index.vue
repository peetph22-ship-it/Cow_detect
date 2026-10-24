<template>
  <div class="space-y-5 sm:space-y-6">

    <!-- 1. การ์ดสถานะอากาศหลัก (Modern & Glanceable: ตัวเลขใหญ่ + แถบวัด 4 สีเข้าใจทันที) -->
    <section 
      class="bg-white rounded-3xl p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border transition-all duration-300"
      :class="statusCardBorder">
      
      <!-- หัวการ์ด: ป้ายสถานะภาษาชาวบ้าน + เวลาอัปเดต -->
      <div class="flex items-center justify-between gap-2 pb-3">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-black text-sm sm:text-base border shadow-2xs"
          :class="statusBadgeStyle">
          <span class="w-2.5 h-2.5 rounded-full" :class="statusDotStyle"></span>
          <span>{{ statusTitle }}</span>
        </div>

        <span class="text-xs sm:text-sm text-[#64748B] font-medium flex items-center gap-1">
          <v-icon icon="mdi-clock-outline" size="15" />
          <span>{{ agoText(now?.minutes_ago) || 'เมื่อสักครู่' }}</span>
        </span>
      </div>

      <!-- แถบวัดระดับความร้อน 4 ระดับ (Visual Heat Meter Bar - เห็นสีแล้วเข้าใจทันที) -->
      <div class="my-3">
        <div class="grid grid-cols-4 gap-1.5 h-3 rounded-full overflow-hidden bg-gray-100 p-0.5">
          <div 
            class="rounded-full transition-all duration-500"
            :class="heatLevelIndex >= 0 ? 'bg-[#2D6A4F]' : 'bg-gray-200'" 
            title="สบายดี"></div>
          <div 
            class="rounded-full transition-all duration-500"
            :class="heatLevelIndex >= 1 ? 'bg-[#D97706]' : 'bg-gray-200'" 
            title="เริ่มอุ่น"></div>
          <div 
            class="rounded-full transition-all duration-500"
            :class="heatLevelIndex >= 2 ? 'bg-[#EA580C]' : 'bg-gray-200'" 
            title="เริ่มร้อน"></div>
          <div 
            class="rounded-full transition-all duration-500"
            :class="heatLevelIndex >= 3 ? 'bg-[#DC2626]' : 'bg-gray-200'" 
            title="ร้อนจัด"></div>
        </div>
        <div class="grid grid-cols-4 text-[11px] font-bold text-center mt-1.5 text-[#64748B]">
          <span :class="{ 'text-[#1B4332] font-black': heatLevelIndex === 0 }">สบายดี</span>
          <span :class="{ 'text-[#92400E] font-black': heatLevelIndex === 1 }">เริ่มอุ่น</span>
          <span :class="{ 'text-[#9A3412] font-black': heatLevelIndex === 2 }">เริ่มร้อน</span>
          <span :class="{ 'text-[#991B1B] font-black': heatLevelIndex === 3 }">ร้อนจัด!</span>
        </div>
      </div>

      <!-- ตัวเลขอุณหภูมิและความชื้น (ใหญ่มาก สะอาดตา คอนทราสต์สูง) -->
      <div class="grid grid-cols-2 gap-4 my-4 py-3 bg-[#F8F9F6] rounded-2xl p-4 border border-[#E9EFEA]">
        <!-- อุณหภูมิ -->
        <div class="flex flex-col">
          <span class="text-xs sm:text-sm text-[#55695D] font-bold flex items-center gap-1">
            <v-icon icon="mdi-thermometer" size="16" class="text-[#E07A5F]" />
            อุณหภูมิในคอก
          </span>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-4xl sm:text-6xl font-black tracking-tight tabular-nums text-[#143225]">
              {{ now ? Number(now.temperature_c).toFixed(1) : '—' }}
            </span>
            <span class="text-xl sm:text-2xl font-black text-[#55695D]">°C</span>
          </div>
        </div>

        <!-- ความชื้น -->
        <div class="flex flex-col border-l border-gray-200 pl-4 sm:pl-6">
          <span class="text-xs sm:text-sm text-[#55695D] font-bold flex items-center gap-1">
            <v-icon icon="mdi-water-percent" size="16" class="text-[#2D6A4F]" />
            ความชื้นในอากาศ
          </span>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-4xl sm:text-6xl font-black tracking-tight tabular-nums text-[#143225]">
              {{ now ? Math.round(now.humidity_pct) : '—' }}
            </span>
            <span class="text-xl sm:text-2xl font-black text-[#55695D]">%</span>
          </div>
        </div>
      </div>

      <!-- คำแนะนำภาษาชาวบ้านเข้าใจง่าย -->
      <div class="p-3.5 rounded-2xl flex items-start gap-3" :class="statusBoxStyle">
        <v-icon :icon="statusIcon" size="24" class="shrink-0 mt-0.5" />
        <p class="text-sm sm:text-base font-bold leading-relaxed">
          {{ statusMessage }}
        </p>
      </div>

      <!-- ปุ่มฟังเสียงอ่านสรุปภาษาไทย (สำหรับผู้สูงอายุที่ไม่ชอบอ่านหนังสือ) -->
      <button
        type="button"
        @click="playVoice"
        class="mt-4 w-full h-14 sm:h-15 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs active:scale-[0.99]"
        :class="isSpeaking 
          ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626] animate-pulse' 
          : 'bg-[#143225] hover:bg-[#1B4332] border-[#143225] text-white'">
        <v-icon :icon="isSpeaking ? 'mdi-stop-circle' : 'mdi-volume-high'" size="26" />
        <span class="text-base sm:text-lg font-black">
          {{ isSpeaking ? 'กำลังพูด... กดเพื่อหยุด' : '🔊 กดตรงนี้เพื่อฟังเสียงอ่านสรุป' }}
        </span>
      </button>
    </section>


    <!-- 2. สิ่งที่ควรทำในคอกวันนี้ (Modern Interactive Checklist) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#E5E9E5]">
      <!-- หัวข้อ + แถบความคืบหน้า -->
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-base sm:text-lg font-black text-[#15221B] flex items-center gap-2">
            <v-icon icon="mdi-check-decagram" class="text-[#2D6A4F]" size="22" />
            สิ่งที่ควรทำในคอกตอนนี้
          </h2>
          <p class="text-xs sm:text-sm text-[#64748B] mt-0.5">กดที่การ์ดเพื่อติ๊กเครื่องหมายว่าทำแล้ว</p>
        </div>
        <span class="text-xs sm:text-sm font-black px-3 py-1 rounded-full bg-[#EBF6EE] text-[#1B4332] border border-[#CDE8D5]">
          ทำแล้ว {{ doneCount }}/{{ actionList.length }}
        </span>
      </div>

      <!-- แถบ Progress Bar -->
      <div class="w-full h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
        <div 
          class="h-full bg-[#2D6A4F] transition-all duration-300"
          :style="{ width: `${(doneCount / actionList.length) * 100}%` }">
        </div>
      </div>

      <!-- รายการ 4 สิ่งที่ต้องทำ -->
      <div class="space-y-3">
        <button
          v-for="act in actionList"
          :key="act.id"
          type="button"
          @click="toggleAction(act.id)"
          class="w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99]"
          :class="isDone(act.id) 
            ? 'bg-[#EBF6EE] border-[#2D6A4F] text-[#1B4332] shadow-2xs' 
            : 'bg-[#F9FAFB] border-[#E5E7EB] hover:border-gray-300 text-[#334155]'">
          
          <div class="flex items-center gap-3.5 min-w-0">
            <!-- ไอคอนประจำข้อ -->
            <div 
              class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold transition-colors"
              :class="isDone(act.id) ? 'bg-[#2D6A4F] text-white shadow-xs' : 'bg-white border border-[#E2E8F0] text-[#64748B]'">
              <v-icon :icon="act.icon" size="24" />
            </div>

            <!-- ข้อความ -->
            <div class="min-w-0">
              <div class="text-base sm:text-lg font-black leading-tight" :class="isDone(act.id) ? 'line-through text-[#2D6A4F]/80' : ''">
                {{ act.title }}
              </div>
              <div class="text-xs sm:text-sm mt-1 leading-snug" :class="isDone(act.id) ? 'text-[#2D6A4F]/80' : 'text-[#64748B]'">
                {{ act.desc }}
              </div>
            </div>
          </div>

          <!-- ตุ่มเช็คถูกกลมๆ ชัดเจน -->
          <div 
            class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all"
            :class="isDone(act.id) ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white shadow-xs' : 'border-[#CBD5E1] bg-white text-transparent'">
            <v-icon icon="mdi-check" size="22" />
          </div>
        </button>
      </div>
    </section>


    <!-- 3. คาดการณ์ล่วงหน้า (เข้าใจง่าย ภาษาชาวบ้าน ไม่ต้องดูกราฟ) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#E5E9E5]">
      <h2 class="text-base sm:text-lg font-black text-[#15221B] flex items-center gap-2 mb-3">
        <v-icon icon="mdi-weather-cloudy-clock" class="text-[#D97706]" size="22" />
        คาดการณ์อากาศล่วงหน้า
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <!-- บ่ายนี้ -->
        <div class="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between">
          <div class="text-xs sm:text-sm font-bold text-[#B45309] flex items-center gap-1.5">
            <v-icon icon="mdi-weather-sunny" size="18" />
            <span>ช่วงที่ร้อนที่สุดของวันนี้</span>
          </div>
          <div class="text-base sm:text-lg font-black text-[#78350F] mt-2 leading-snug">
            {{ peakText }}
          </div>
          <div class="text-xs sm:text-sm text-[#92400E] mt-1">
            เตรียมเปิดพัดลมและสเปรย์น้ำล่วงหน้า
          </div>
        </div>

        <!-- พรุ่งนี้ -->
        <div class="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col justify-between">
          <div class="text-xs sm:text-sm font-bold text-[#15803D] flex items-center gap-1.5">
            <v-icon icon="mdi-calendar-arrow-right" size="18" />
            <span>แนวโน้มสภาพอากาศพรุ่งนี้</span>
          </div>
          <div class="text-base sm:text-lg font-black text-[#14532D] mt-2 leading-snug">
            {{ tomorrowText }}
          </div>
          <div class="text-xs sm:text-sm text-[#166534] mt-1">
            เตรียมรางน้ำสะอาดสำรองไว้ให้แม่วัว
          </div>
        </div>
      </div>
    </section>


    <!-- 4. ปุ่มโทรด่วนสัตวแพทย์ / สหกรณ์ (ปุ่มใหญ่ สีเด่น แตะโทรทันที) -->
    <section class="bg-white rounded-3xl p-5 border border-[#E5E9E5] shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <v-icon icon="mdi-doctor" class="text-[#2D6A4F]" size="22" />
          <h3 class="text-base font-black text-[#15221B]">สัตวแพทย์ประจำฟาร์ม</h3>
        </div>
        <span class="text-xs text-[#64748B] font-semibold">แตะโทรออกทันที</span>
      </div>

      <a
        v-if="farm?.vet_phone"
        :href="`tel:${cleanPhone(farm.vet_phone)}`"
        class="w-full h-14 sm:h-16 rounded-2xl bg-[#E07A5F] hover:bg-[#cf6b50] text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 text-decoration-none shadow-sm transition-all active:scale-[0.99]">
        <v-icon icon="mdi-phone-in-talk" size="24" />
        <span>โทรหาหมอ {{ farm.vet_phone }}</span>
      </a>
      <div v-else class="text-xs text-[#64748B] p-3 rounded-xl bg-gray-50 border border-gray-200">
        ยังไม่ได้ระบุเบอร์โทรสัตวแพทย์ในระบบ แจ้งเจ้าหน้าที่สหกรณ์เพื่อเพิ่มได้ค่ะ
      </div>
    </section>


    <!-- 5. รายละเอียดเชิงลึกทางเทคนิค (พับเก็บไว้ ไม่รบกวนคนแก่) -->
    <section class="bg-white rounded-3xl border border-[#E5E9E5] shadow-2xs overflow-hidden">
      <button
        type="button"
        @click="showDetails = !showDetails"
        class="w-full p-4 flex items-center justify-between text-xs sm:text-sm font-bold text-[#64748B] hover:text-[#15221B] cursor-pointer transition-colors">
        <div class="flex items-center gap-2">
          <v-icon icon="mdi-information-outline" size="18" />
          <span>ข้อมูลทางเทคนิคของเซ็นเซอร์และเกณฑ์ THI (สำหรับดูเพิ่มเติม)</span>
        </div>
        <v-icon :icon="showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" />
      </button>

      <div v-if="showDetails" class="p-4 pt-0 border-t border-gray-100 text-xs sm:text-sm space-y-2 mt-2">
        <div class="flex justify-between py-1.5 border-b border-gray-100">
          <span class="text-[#64748B]">ดัชนี THI ปัจจุบัน:</span>
          <span class="font-mono font-bold text-[#15221B]">{{ now?.thi != null ? Number(now.thi).toFixed(1) : '—' }}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-gray-100">
          <span class="text-[#64748B]">สถานะเซ็นเซอร์ RS485:</span>
          <span class="font-bold text-[#16A34A]">{{ now?.sensor_status === 'online' ? 'ออนไลน์ปกติ' : 'ออฟไลน์' }}</span>
        </div>
        <div class="flex justify-between py-1.5">
          <span class="text-[#64748B]">สูตรประเมินความเครียดความร้อน:</span>
          <span class="font-bold text-[#15221B]">NRC 1971 (THI 72/78/84)</span>
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

// สไตล์การ์ดหลัก
const statusCardBorder = computed(() => {
  const idx = heatLevelIndex.value
  if (idx === 3) return 'border-[#FECACA]'
  if (idx === 2) return 'border-[#FED7AA]'
  if (idx === 1) return 'border-[#FDE68A]'
  return 'border-[#C8E6C9]'
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
  if (idx === 3) return 'bg-[#FEF2F2] text-[#991B1B]'
  if (idx === 2) return 'bg-[#FFF7ED] text-[#9A3412]'
  if (idx === 1) return 'bg-[#FFFBEB] text-[#92400E]'
  return 'bg-[#F0FDF4] text-[#166534]'
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

const peakText = computed(() => {
  const f = senior.value?.forecast_simple
  if (f) return f
  return 'ช่วงเวลา 13:00 - 15:00 น. จะเป็นช่วงที่อากาศร้อนที่สุดของวัน'
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