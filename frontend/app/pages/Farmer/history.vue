<template>
  <div class="space-y-5">
    <!-- ส่วนหัว: สรุปประวัติย้อนหลัง 7 วัน -->
    <section class="bg-[#FFFDF7] rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E6DEC8]">
      <div class="flex items-center justify-between gap-3 pb-4 border-b border-[#E6DEC8]">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-[#1B342D] text-[#F3C68F] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-calendar-week" size="26" />
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-black text-[#1B342D] leading-tight">
              ประวัติอากาศย้อนหลัง 7 วัน
            </h1>
            <p class="text-xs sm:text-sm text-[#4E655B] font-medium mt-0.5">
              ดูภาพรวมว่าแม่วัวสบายดีหรือเจออากาศร้อนในแต่ละวัน
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="loadHistory"
          :disabled="loadingDays"
          class="w-10 h-10 rounded-xl bg-white hover:bg-[#F4EFE4] border border-[#E6DEC8] flex items-center justify-center text-[#1B342D] cursor-pointer shrink-0"
          title="โหลดข้อมูลใหม่">
          <v-icon icon="mdi-refresh" size="20" :class="loadingDays ? 'animate-spin' : ''" />
        </button>
      </div>

      <!-- สรุป 4 ช่องสำหรับผู้สูงอายุ -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div class="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
          <div class="text-xs font-extrabold text-[#15803D] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
            <span>วันสบายดี</span>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#14532D] mt-1 tabular-nums">
            {{ goodDaysCount }} <span class="text-xs sm:text-sm font-bold">วัน</span>
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
          <div class="text-xs font-extrabold text-[#B45309] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
            <span>วันเริ่มร้อน</span>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#78350F] mt-1 tabular-nums">
            {{ mildDaysCount }} <span class="text-xs sm:text-sm font-bold">วัน</span>
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]">
          <div class="text-xs font-extrabold text-[#B91C1C] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
            <span>วันร้อนจัด</span>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#991B1B] mt-1 tabular-nums">
            {{ severeDaysCount }} <span class="text-xs sm:text-sm font-bold">วัน</span>
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA]">
          <div class="text-xs font-extrabold text-[#C2410C] flex items-center gap-1.5">
            <v-icon icon="mdi-fire" size="16" />
            <span>ร้อนสะสมติดกัน</span>
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#7C2D12] mt-1 tabular-nums">
            {{ streakDays }} <span class="text-xs sm:text-sm font-bold">วันติด</span>
          </div>
        </div>
      </div>
    </section>

    <!-- รายการการ์ดรายวัน -->
    <div v-if="loadingDays" class="py-14 text-center text-sm font-extrabold text-[#4E655B]">
      <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F] mb-2" size="36" />
      <p>กำลังเปิดข้อมูลย้อนหลัง 7 วัน...</p>
    </div>

    <div v-else class="space-y-3.5">
      <FarmerHistoryDayCard
        v-for="d in days"
        :key="d.date"
        :day="d" />
    </div>
  </div>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ประวัติย้อนหลัง 7 วัน | CowCare ฟาร์มโคนม' })

const { request, farmId } = useFarmer()
const days = ref([])
const streakDays = ref(0)
const loadingDays = ref(true)

const loadHistory = async () => {
  loadingDays.value = true
  try {
    const res = await request('history')
    days.value = res?.days || []
    streakDays.value = res?.streak?.days || 0
  } catch (err) {
    console.error('Error loading history:', err.message)
  } finally {
    loadingDays.value = false
  }
}

const goodDaysCount = computed(() =>
  days.value.filter(d => d.has_data && (d.stress_hours || 0) === 0).length
)

const mildDaysCount = computed(() =>
  days.value.filter(d => d.has_data && (d.stress_hours || 0) > 0 && (d.severe_hours || 0) === 0).length
)

const severeDaysCount = computed(() =>
  days.value.filter(d => d.has_data && (d.severe_hours || 0) > 0).length
)

watch(farmId, () => {
  loadHistory()
})

onMounted(loadHistory)
</script>
