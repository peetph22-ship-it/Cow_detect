<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- ส่วนหัว: สรุปประวัติย้อนหลัง 7 วัน (4 Bento KPI Cards) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-[24px] p-5 border border-[#E4E8E5] shadow-[0_8px_24px_rgba(20,40,32,0.04)] flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-extrabold text-[#15803D] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
            <span>วันสบายดี</span>
          </div>
          <div class="text-3xl font-black text-[#142820] mt-1.5 tabular-nums">
            {{ goodDaysCount }} <span class="text-xs font-bold text-[#64766D]">วัน</span>
          </div>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-emoticon-happy-outline" size="24" />
        </div>
      </div>

      <div class="bg-white rounded-[24px] p-5 border border-[#E4E8E5] shadow-[0_8px_24px_rgba(20,40,32,0.04)] flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-extrabold text-[#B45309] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
            <span>วันอากาศร้อน</span>
          </div>
          <div class="text-3xl font-black text-[#142820] mt-1.5 tabular-nums">
            {{ mildDaysCount }} <span class="text-xs font-bold text-[#64766D]">วัน</span>
          </div>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-weather-sunny-alert" size="24" />
        </div>
      </div>

      <div class="bg-white rounded-[24px] p-5 border border-[#E4E8E5] shadow-[0_8px_24px_rgba(20,40,32,0.04)] flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-extrabold text-[#B91C1C] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
            <span>วันร้อนจัด</span>
          </div>
          <div class="text-3xl font-black text-[#142820] mt-1.5 tabular-nums">
            {{ severeDaysCount }} <span class="text-xs font-bold text-[#64766D]">วัน</span>
          </div>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-alert-octagon-outline" size="24" />
        </div>
      </div>

      <div class="bg-white rounded-[24px] p-5 border border-[#E4E8E5] shadow-[0_8px_24px_rgba(20,40,32,0.04)] flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-extrabold text-[#C2410C] flex items-center gap-1.5">
            <v-icon icon="mdi-fire" size="15" />
            <span>ร้อนสะสมติดกัน</span>
          </div>
          <div class="text-3xl font-black text-[#142820] mt-1.5 tabular-nums">
            {{ streakDays }} <span class="text-xs font-bold text-[#64766D]">วันติด</span>
          </div>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-calendar-alert" size="24" />
        </div>
      </div>
    </div>

    <!-- รายการการ์ดรายวัน (Grid 2 คอลัมน์บนจอใหญ่) -->
    <div v-if="loadingDays" class="py-14 text-center text-sm font-extrabold text-[#4E655B]">
      <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F] mb-2" size="36" />
      <p>กำลังเปิดข้อมูลย้อนหลัง 7 วัน...</p>
    </div>

    <div v-else-if="loadError" class="bg-white rounded-[28px] p-8 shadow-xs border-2 border-[#FCA5A5] text-center space-y-3">
      <v-icon icon="mdi-cloud-off-outline" size="40" class="text-[#B91C1C]" />
      <p class="text-base font-extrabold text-[#7F1D1D]">โหลดข้อมูลย้อนหลังไม่สำเร็จ</p>
      <p class="text-sm text-[#4E655B]">ตรวจสัญญาณอินเทอร์เน็ตแล้วลองใหม่</p>
      <button type="button" class="px-5 py-2.5 rounded-2xl bg-[#142820] text-white font-bold cursor-pointer" @click="loadHistory">
        ลองใหม่
      </button>
    </div>

    <div v-else-if="!days.length" class="bg-white rounded-[28px] p-8 shadow-xs border border-[#E4E8E5] text-center text-sm font-bold text-[#4E655B]">
      ยังไม่มีข้อมูลย้อนหลัง เมื่อกล่องเซ็นเซอร์ส่งข้อมูลครบวัน หน้านี้จะแสดงให้อัตโนมัติ
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
const loadError = ref(false)

const loadHistory = async () => {
  loadingDays.value = true
  loadError.value = false
  try {
    const res = await request('history')
    days.value = res?.days || []
    streakDays.value = res?.streak?.days || 0
  } catch (err) {
    loadError.value = true
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
