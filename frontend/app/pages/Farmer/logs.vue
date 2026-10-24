<template>
  <div class="space-y-5">
    
    <!-- ส่วนหัว: สมุดจดประจำวัน -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB]">
      <div class="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div class="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#1B4332] flex items-center justify-center text-2xl font-bold">
          <v-icon icon="mdi-notebook-edit-outline" size="26" />
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-[#15221B] leading-tight">
            สมุดจดประจำวันของเกษตรกร
          </h1>
          <p class="text-xs sm:text-sm text-[#64748B] mt-0.5">
            จดปริมาณน้ำนมและสุขภาพแม่วัวอย่างง่าย ไม่ยุ่งยาก
          </p>
        </div>
      </div>

      <!-- ฟอร์มบันทึกวันนี้ -->
      <form @submit.prevent="handleSubmitLog" class="space-y-5 mt-5">
        
        <!-- 1. ปริมาณน้ำนมดิบวันนี้ (กก.) -->
        <div class="space-y-2">
          <label class="block text-sm sm:text-base font-bold text-[#15221B]">
            🥛 1. ปริมาณน้ำนมดิบวันนี้ (กิโลกรัม)
          </label>

          <div class="bg-[#F8F9F5] border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <!-- ตัวเลขใหญ่ -->
            <div class="flex items-baseline gap-2">
              <input
                v-model.number="milkKg"
                type="number"
                step="0.5"
                min="0"
                max="2000"
                class="w-32 text-center text-4xl sm:text-5xl font-black text-[#1B4332] bg-white border border-[#CBD5E1] rounded-2xl py-2 focus:outline-none focus:border-[#2D6A4F]" />
              <span class="text-lg sm:text-xl font-bold text-[#55695D]">กก.</span>
            </div>

            <!-- ปุ่มกดเพิ่มลดเร็ว สำหรับผู้สูงอายุไม่ต้องพิมพ์เอง -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="adjustMilk(-5)"
                class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-[#CBD5E1] hover:bg-gray-100 text-[#15221B] font-bold text-base flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs">
                -5
              </button>
              <button
                type="button"
                @click="adjustMilk(-1)"
                class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-[#CBD5E1] hover:bg-gray-100 text-[#15221B] font-bold text-base flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs">
                -1
              </button>
              <button
                type="button"
                @click="adjustMilk(1)"
                class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-[#CBD5E1] hover:bg-gray-100 text-[#15221B] font-bold text-base flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs">
                +1
              </button>
              <button
                type="button"
                @click="adjustMilk(5)"
                class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-[#CBD5E1] hover:bg-gray-100 text-[#15221B] font-bold text-base flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs">
                +5
              </button>
            </div>
          </div>
        </div>

        <!-- 2. สุขภาพแม่วัววันนี้ (เลือกแตะ 1 ปุ่มใหญ่) -->
        <div class="space-y-2">
          <label class="block text-sm sm:text-base font-bold text-[#15221B]">
            🐮 2. อาการและสุขภาพของแม่วัววันนี้
          </label>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              v-for="h in healthOptions"
              :key="h.key"
              type="button"
              @click="cowHealth = h.key"
              class="p-4 rounded-2xl border-2 text-left flex flex-col justify-between gap-2 transition-all cursor-pointer select-none active:scale-[0.98]"
              :class="cowHealth === h.key 
                ? `${h.activeBorder} ${h.activeBg} ${h.activeText} shadow-xs` 
                : 'border-[#E5E7EB] bg-white hover:border-[#CBD5E1] text-[#475569]'">
              <div class="flex items-center justify-between">
                <v-icon :icon="h.icon" size="26" />
                <v-icon v-if="cowHealth === h.key" icon="mdi-check-circle" size="20" />
              </div>
              <div>
                <div class="text-base sm:text-lg font-bold leading-tight">{{ h.title }}</div>
                <div class="text-xs mt-1 leading-snug opacity-90">{{ h.desc }}</div>
              </div>
            </button>
          </div>
        </div>

        <!-- 3. ข้อความช่วยจำเพิ่มเติม -->
        <div class="space-y-1.5">
          <label class="block text-xs sm:text-sm font-bold text-[#64748B]">
            📝 ข้อความช่วยจำสั้นๆ (ถ้ามี):
          </label>
          <input
            v-model="note"
            type="text"
            placeholder="เช่น ให้หญ้าสดตอนเช้า แม่วัวกินดี"
            class="w-full px-4 py-3 rounded-2xl border border-[#CBD5E1] text-sm sm:text-base focus:outline-none focus:border-[#2D6A4F] bg-[#F8F9F5]" />
        </div>

        <!-- ปุ่มบันทึกใหญ่มาก -->
        <button
          type="submit"
          :disabled="isSaving"
          class="w-full h-15 sm:h-16 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50">
          <v-icon v-if="isSaving" icon="mdi-loading" class="animate-spin" size="24" />
          <v-icon v-else icon="mdi-content-save-check" size="24" />
          <span>{{ isSaving ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกข้อมูลวันนี้' }}</span>
        </button>

        <p v-if="saveSuccessMsg" class="text-sm font-bold text-[#15803D] text-center pt-1 animate-pulse">
          {{ saveSuccessMsg }}
        </p>
      </form>
    </section>


    <!-- ประวัติการจดที่ผ่านมา (ย้อนหลัง 14 วัน) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB]">
      <h2 class="text-base sm:text-lg font-bold text-[#15221B] flex items-center gap-2 mb-4">
        <v-icon icon="mdi-history" class="text-[#2D6A4F]" size="22" />
        ประวัติสมุดจดย้อนหลัง
      </h2>

      <div v-if="loadingLogs" class="py-8 text-center text-sm text-[#64748B]">
        กำลังเปิดสมุดจดย้อนหลัง...
      </div>

      <div v-else-if="!dailyLogs.length" class="p-6 rounded-2xl bg-[#F8F9F5] text-center space-y-2">
        <v-icon icon="mdi-book-open-outline" size="32" class="text-[#94A3B8]" />
        <p class="text-sm font-bold text-[#64748B]">ยังไม่มีบันทึกในสมุดจด</p>
        <p class="text-xs text-[#94A3B8]">กดบันทึกน้ำนมวันนี้ด้านบนเพื่อเริ่มจดได้เลยจ้า</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in dailyLogs"
          :key="item.id || item.date"
          class="p-4 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between gap-3">
          
          <div class="min-w-0">
            <div class="text-xs sm:text-sm font-bold text-[#64748B]">
              {{ thaiDate(item.date, { weekday: 'long', day: 'numeric', month: 'short' }) }}
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-lg sm:text-xl font-black text-[#1B4332] tabular-nums">
                {{ item.milk_kg }} กก.
              </span>
              <span 
                class="text-xs font-bold px-2 py-0.5 rounded-full"
                :class="healthBadgeClass(item.cow_health)">
                {{ healthBadgeText(item.cow_health) }}
              </span>
            </div>
            <p v-if="item.note" class="text-xs sm:text-sm text-[#475569] mt-1 truncate">
              {{ item.note }}
            </p>
          </div>

          <div class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <v-icon :icon="healthIcon(item.cow_health)" size="22" :class="healthIconClass(item.cow_health)" />
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { useFarmer, thaiDate } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'สมุดจดประจำวัน | CowCare ฟาร์มโคนม' })

const { dailyLogs, loadLogs, saveLog } = useFarmer()

const milkKg = ref(20)
const cowHealth = ref('normal')
const note = ref('')
const isSaving = ref(false)
const saveSuccessMsg = ref('')
const loadingLogs = ref(false)

const healthOptions = [
  {
    key: 'normal',
    title: '🟢 สบายดี ปกติ',
    desc: 'กินหญ้าดี เดินเล่นปกติ เคี้ยวเอื้องสบาย',
    icon: 'mdi-emoticon-happy-outline',
    activeBorder: 'border-[#2D6A4F]',
    activeBg: 'bg-[#E8F5E9]',
    activeText: 'text-[#1B4332]'
  },
  {
    key: 'mild_concern',
    title: '🟡 ซึม / กินน้อย',
    desc: 'กินอาหารลดลง ยืนนิ่ง เฝ้าดูอาการ',
    icon: 'mdi-emoticon-neutral-outline',
    activeBorder: 'border-[#D97706]',
    activeBg: 'bg-[#FEF3C7]',
    activeText: 'text-[#92400E]'
  },
  {
    key: 'severe_concern',
    title: '🔴 มีตัวหอบ / ป่วย',
    desc: 'หายใจหอบ ล้มนอน ควรโทรหาหมอวัว',
    icon: 'mdi-emoticon-sad-outline',
    activeBorder: 'border-[#DC2626]',
    activeBg: 'bg-[#FEE2E2]',
    activeText: 'text-[#991B1B]'
  }
]

const adjustMilk = (amount) => {
  milkKg.value = Math.max(0, Math.round((milkKg.value + amount) * 10) / 10)
}

const handleSubmitLog = async () => {
  isSaving.value = true
  saveSuccessMsg.value = ''
  try {
    await saveLog({
      milk_kg: milkKg.value,
      cow_health: cowHealth.value,
      note: note.value
    })
    saveSuccessMsg.value = '✅ บันทึกสมุดจดเรียบร้อยแล้วจ้า'
    setTimeout(() => {
      saveSuccessMsg.value = ''
    }, 4000)
  } catch (err) {
    alert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  } finally {
    isSaving.value = false
  }
}

const healthBadgeClass = (h) => {
  if (h === 'severe_concern') return 'bg-[#FEE2E2] text-[#991B1B]'
  if (h === 'mild_concern') return 'bg-[#FEF3C7] text-[#92400E]'
  return 'bg-[#E8F5E9] text-[#1B4332]'
}

const healthBadgeText = (h) => {
  if (h === 'severe_concern') return 'มีตัวหอบ'
  if (h === 'mild_concern') return 'กินอาหารน้อย'
  return 'วัวสบายดี'
}

const healthIcon = (h) => {
  if (h === 'severe_concern') return 'mdi-alert-circle'
  if (h === 'mild_concern') return 'mdi-information'
  return 'mdi-check-circle'
}

const healthIconClass = (h) => {
  if (h === 'severe_concern') return 'text-[#DC2626]'
  if (h === 'mild_concern') return 'text-[#D97706]'
  return 'text-[#2D6A4F]'
}

onMounted(async () => {
  loadingLogs.value = true
  await loadLogs()
  loadingLogs.value = false
})
</script>
