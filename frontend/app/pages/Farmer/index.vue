<template>
  <div class="space-y-4 sm:space-y-6">

    <!-- 1. การ์ดสภาพอากาศในคอกตอนนี้ (Minimal, ตัวเลขใหญ่สะใจ คนแก่เห็นชัดเจน) -->
    <section 
      class="rounded-3xl p-5 sm:p-7 shadow-xs border transition-all duration-300"
      :class="statusCardStyle">
      
      <!-- หัวการ์ด: ป้ายสถานะ + เวลาอัปเดต -->
      <div class="flex items-center justify-between gap-2 pb-3">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-sm sm:text-base border shadow-2xs"
          :class="statusBadgeStyle">
          <v-icon :icon="statusIcon" size="20" />
          <span>{{ statusTitle }}</span>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            v-if="isCustomBackend"
            to="/Farmer/me"
            class="inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-decoration-none">
            🤝 เชื่อมหลังบ้านเพื่อน
          </NuxtLink>
          <span class="text-xs sm:text-sm text-[#55695D] font-medium">
            อัปเดต {{ agoText(now?.minutes_ago) || 'เมื่อสักครู่' }}
          </span>
        </div>
      </div>

      <!-- ตัวเลขอุณหภูมิและความชื้น (ใหญ่มาก สำหรับผู้สูงอายุ) -->
      <div class="grid grid-cols-2 gap-4 my-4 py-2 border-y border-black/5">
        <!-- อุณหภูมิ -->
        <div class="flex flex-col">
          <span class="text-xs sm:text-sm text-[#55695D] font-bold">อุณหภูมิในคอก</span>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-4xl sm:text-6xl font-black tracking-tight tabular-nums text-[#15221B]">
              {{ now ? Number(now.temperature_c).toFixed(1) : '—' }}
            </span>
            <span class="text-lg sm:text-2xl font-bold text-[#55695D]">°C</span>
          </div>
        </div>

        <!-- ความชื้น -->
        <div class="flex flex-col border-l border-black/5 pl-4">
          <span class="text-xs sm:text-sm text-[#55695D] font-bold">ความชื้นในอากาศ</span>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-4xl sm:text-6xl font-black tracking-tight tabular-nums text-[#15221B]">
              {{ now ? Math.round(now.humidity_pct) : '—' }}
            </span>
            <span class="text-lg sm:text-2xl font-bold text-[#55695D]">%</span>
          </div>
        </div>
      </div>

      <!-- คำแนะนำภาษาชาวบ้านเข้าใจง่าย 1 ประโยค -->
      <p class="text-sm sm:text-base font-semibold leading-relaxed text-[#2C3E35]">
        {{ statusMessage }}
      </p>

      <!-- ปุ่มฟังเสียงสรุปประจำวัน -->
      <button
        type="button"
        @click="playVoice"
        class="mt-4 w-full h-13 sm:h-14 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#2D6A4F] text-[#1B4332] font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer active:scale-[0.99]">
        <v-icon :icon="isSpeaking ? 'mdi-stop-circle' : 'mdi-volume-high'" size="24" :class="isSpeaking ? 'text-[#DC2626]' : 'text-[#2D6A4F]'" />
        <span>{{ isSpeaking ? 'กดเพื่อหยุดเสียงอ่าน' : '🔊 กดเพื่อฟังเสียงอ่านสรุป' }}</span>
      </button>
    </section>


    <!-- 2. สิ่งที่ควรทำตอนนี้ (Checklist 4 ข้อใหญ่ กดแล้วเปลี่ยนเป็นสีเขียวทันที) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB]">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-[#15221B] flex items-center gap-2">
            <v-icon icon="mdi-checkbox-marked-circle-outline" class="text-[#2D6A4F]" size="22" />
            สิ่งที่ต้องทำในคอกวันนี้
          </h2>
          <p class="text-xs sm:text-sm text-[#64748B] mt-0.5">กดที่การ์ดเพื่อติ๊กเครื่องหมายว่าทำแล้ว</p>
        </div>
        <span class="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-[#E8F5E9] text-[#1B4332]">
          ทำแล้ว {{ doneCount }}/{{ actionList.length }}
        </span>
      </div>

      <!-- รายการสิ่งที่ต้องทำ -->
      <div class="space-y-3">
        <button
          v-for="act in actionList"
          :key="act.id"
          type="button"
          @click="toggleAction(act.id)"
          class="w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99]"
          :class="isDone(act.id) 
            ? 'bg-[#E8F5E9] border-[#2D6A4F] text-[#1B4332]' 
            : 'bg-[#F9FAFB] border-[#E5E7EB] hover:border-[#CBD5E1] text-[#334155]'">
          
          <div class="flex items-center gap-3.5 min-w-0">
            <!-- ไอคอนประจำการกระทำ -->
            <div 
              class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold transition-colors"
              :class="isDone(act.id) ? 'bg-[#2D6A4F] text-white shadow-xs' : 'bg-white border border-[#E2E8F0] text-[#64748B]'">
              <v-icon :icon="act.icon" size="24" />
            </div>

            <!-- ข้อความ -->
            <div class="min-w-0">
              <div class="text-base sm:text-lg font-bold leading-tight" :class="isDone(act.id) ? 'line-through text-[#2D6A4F]/80' : ''">
                {{ act.title }}
              </div>
              <div class="text-xs sm:text-sm mt-1 leading-snug" :class="isDone(act.id) ? 'text-[#2D6A4F]/80' : 'text-[#64748B]'">
                {{ act.desc }}
              </div>
            </div>
          </div>

          <!-- เครื่องหมายถูกหรือปุ่มกด -->
          <div 
            class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all"
            :class="isDone(act.id) ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white' : 'border-[#CBD5E1] bg-white text-transparent'">
            <v-icon icon="mdi-check" size="20" />
          </div>
        </button>
      </div>
    </section>


    <!-- 3. คาดการณ์สภาพอากาศช่วงบ่าย & พรุ่งนี้ (เข้าใจง่าย ไม่ต้องดูกราฟ) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB]">
      <h2 class="text-base sm:text-lg font-bold text-[#15221B] flex items-center gap-2 mb-3">
        <v-icon icon="mdi-weather-cloudy-clock" class="text-[#D97706]" size="22" />
        คาดการณ์ล่วงหน้า (ไม่ต้องดูกราฟ)
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <!-- บ่ายนี้ -->
        <div class="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col justify-between">
          <div class="text-xs sm:text-sm font-bold text-[#B45309] flex items-center gap-1.5">
            <v-icon icon="mdi-weather-sunny" size="18" />
            <span>ช่วงที่ร้อนที่สุดวันนี้</span>
          </div>
          <div class="text-base sm:text-lg font-bold text-[#78350F] mt-2 leading-snug">
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
            <span>สภาพอากาศพรุ่งนี้</span>
          </div>
          <div class="text-base sm:text-lg font-bold text-[#14532D] mt-2 leading-snug">
            {{ tomorrowText }}
          </div>
          <div class="text-xs sm:text-sm text-[#166534] mt-1">
            {{ tomorrowAdvice }}
          </div>
        </div>
      </div>
    </section>


    <!-- 4. ปุ่มโทรหาหมอวัว (ปุ่มใหญ่ กดง่าย) ไม่มีเบอร์จริง = ไม่แสดง
         ตัดปุ่ม SOS ออก: เดิมบอกว่าเจ้าหน้าที่จะติดต่อกลับ แต่ไม่มีใครได้รับแจ้งจริง -->
    <section v-if="vetPhoneDisplay" class="grid grid-cols-1 gap-3.5">
      <!-- ปุ่มโทรหาหมอวัว -->
      <a
        v-if="vetPhoneDisplay"
        :href="`tel:${vetPhoneClean}`"
        class="h-16 sm:h-20 rounded-3xl bg-[#E07A5F] hover:bg-[#d46a4e] text-white flex items-center justify-center gap-3 font-black text-base sm:text-lg shadow-sm transition-all text-decoration-none active:scale-[0.98]">
        <div class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <v-icon icon="mdi-phone-in-talk" size="26" />
        </div>
        <div class="text-left">
          <div class="text-xs sm:text-sm text-white/90 font-medium">เมื่อแม่วัวมีปัญหา</div>
          <div class="leading-tight">โทรหาหมอวัว: {{ vetPhoneDisplay }}</div>
        </div>
      </a>

    </section>



  </div>
</template>

<script setup>
import { useFarmer, agoText } from '~/composables/useFarmer'
import { getCustomNodeApi } from '~/API/baseAPI'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'สภาพในคอกตอนนี้ | CowCare ฟาร์มโคนม' })

const {
  me,
  farm,
  now,
  senior,
  isSpeaking,
  speakThai,
  stopSpeech,
  doneActions,
  toggleAction
} = useFarmer()

const isCustomBackend = computed(() => Boolean(getCustomNodeApi()))

// ข้อมูลหมอวัว
// ไม่มีเบอร์จริง = ไม่แสดงปุ่มโทร (ห้ามใส่เบอร์สมมติ เกษตรกรจะโทรไปเบอร์ที่ไม่มีจริง)
const vetPhoneDisplay = computed(() => farm.value?.vet_phone || '')
const vetPhoneClean = computed(() => vetPhoneDisplay.value.replace(/[^0-9+]/g, ''))

// รายการสิ่งที่ควรทำ (ดึงจาก senior ใน backend หรือเทมเพลตมาตรฐาน)
const actionList = computed(() => {
  if (senior.value?.action_templates?.length) {
    return senior.value.action_templates
  }
  return [
    { id: 'fan', title: 'เปิดพัดลมในคอก', desc: 'ช่วยระบายอากาศร้อน ไม่ให้อากาศอับ', icon: 'mdi-fan' },
    { id: 'water_spray', title: 'เปิดละอองน้ำ / สปริงเกลอร์', desc: 'ฉีดพ่นละอองน้ำเป็นรอบๆ ช่วยลดอุณหภูมิร่างกายวัว', icon: 'mdi-sprinkler-variant' },
    { id: 'fresh_water', title: 'เติมน้ำสะอาดให้เต็มราง', desc: 'แม่วัวกินน้ำเยอะขึ้นเมื่ออากาศร้อน ดื่มน้ำลดเครียด', icon: 'mdi-cup-water' },
    { id: 'check_cow', title: 'สังเกตอาการแม่วัว (ไม่หอบ)', desc: 'ตรวจดูว่ามีตัวไหนยืนหอบ อ้าปาก หรือน้ำลายยืดหรือไม่', icon: 'mdi-cow' }
  ]
})

const isDone = (id) => doneActions.value.includes(id)
const doneCount = computed(() => actionList.value.filter(a => isDone(a.id)).length)

// สไตล์และข้อความระดับความร้อน
const riskLevel = computed(() => now.value?.risk_level || 'normal')

const statusTitle = computed(() => {
  if (riskLevel.value === 'severe') return 'อากาศร้อนจัดมาก แม่วัวกำลังเครียด!'
  if (riskLevel.value === 'moderate' || riskLevel.value === 'mild') return 'อากาศเริ่มร้อนขึ้นแล้ว ระวังแม่วัวหอบ'
  return 'อากาศสบายดี แม่วัวไม่เครียด'
})

const statusMessage = computed(() => {
  if (riskLevel.value === 'severe') {
    return 'อุณหภูมิและความชื้นสูงมาก เสี่ยงน้ำนมดิ่ง รีบเปิดพัดลมและสเปรย์น้ำระบายความร้อนทันที'
  }
  if (riskLevel.value === 'moderate' || riskLevel.value === 'mild') {
    return 'ความร้อนสะสมเริ่มเพิ่มขึ้น แนะนำให้เปิดพัดลมระบายอากาศ และเตรียมน้ำสะอาดให้พร้อม'
  }
  return 'สภาพอากาศในคอกเหมาะสมดี แม่วัวเคี้ยวเอื้องสบาย ให้น้ำนมได้เต็มที่'
})

const statusIcon = computed(() => {
  if (riskLevel.value === 'severe') return 'mdi-alert-octagon'
  if (riskLevel.value === 'moderate' || riskLevel.value === 'mild') return 'mdi-weather-sunny-alert'
  return 'mdi-emoticon-happy'
})

const statusCardStyle = computed(() => {
  if (riskLevel.value === 'severe') return 'bg-[#FEF2F2] border-[#FECACA]'
  if (riskLevel.value === 'moderate' || riskLevel.value === 'mild') return 'bg-[#FFFBEB] border-[#FDE68A]'
  return 'bg-[#F0FDF4] border-[#BBF7D0]'
})

const statusBadgeStyle = computed(() => {
  if (riskLevel.value === 'severe') return 'bg-[#DC2626] text-white border-[#B91C1C]'
  if (riskLevel.value === 'moderate' || riskLevel.value === 'mild') return 'bg-[#D97706] text-white border-[#B45309]'
  return 'bg-[#2D6A4F] text-white border-[#1B4332]'
})

// พยากรณ์ช่วงบ่าย
const peakText = computed(() => {
  if (me.value?.forecast?.peak_window) {
    return `ช่วง ${me.value.forecast.peak_window} น.`
  }
  return 'ช่วงบ่าย 13:00 – 15:30 น.'
})

const tomorrowForecast = computed(() => me.value?.forecast?.days?.[0] || null)

const tomorrowText = computed(() => {
  if (tomorrowForecast.value?.risk_level === 'severe') return 'อากาศร้อนจัดมาก'
  if (tomorrowForecast.value?.risk_level === 'moderate') return 'อากาศค่อนข้างร้อน'
  return 'อากาศสบาย ลมพัดดี'
})

const tomorrowAdvice = computed(() => {
  if (tomorrowForecast.value?.risk_level === 'severe') return 'เตรียมเปิดพัดลมและเตรียมน้ำดื่มสำรอง'
  if (tomorrowForecast.value?.risk_level === 'moderate') return 'ช่วงบ่ายเปิดพัดลมระบายอากาศ'
  return 'สภาพอากาศดี เหมาะแก่การให้นม'
})

const playVoice = () => {
  if (isSpeaking.value) {
    stopSpeech()
  } else {
    const text = senior.value?.voice_text || 
      `สภาพอากาศในคอกวัวตอนนี้ อุณหภูมิ ${now.value ? Number(now.value.temperature_c).toFixed(1) : '31'} องศาเซลเซียส ความชื้น ${now.value ? Math.round(now.value.humidity_pct) : '70'} เปอร์เซ็นต์ ${statusTitle.value} ${statusMessage.value} อย่าลืมดูแลแม่วัวนะจ๊ะ`
    speakThai(text)
  }
}
</script>
