<template>
  <div class="space-y-5">

    <!-- ส่วนหัว: สรุปเหตุการณ์แจ้งเตือน 7 วัน -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB]">
      <div class="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div class="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center text-2xl font-bold">
          <v-icon icon="mdi-bell-alert-outline" size="26" />
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-[#15221B] leading-tight">
            ประวัติการแจ้งเตือน
          </h1>
          <p class="text-xs sm:text-sm text-[#64748B] mt-0.5">
            เหตุการณ์ความร้อนและสัญญาณเซ็นเซอร์ในรอบ 7 วัน
          </p>
        </div>
      </div>

      <!-- สรุปตัวเลข 3 ช่องใหญ่ -->
      <div class="grid grid-cols-3 gap-3 mt-4">
        <div class="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-center">
          <div class="text-xs font-bold text-[#991B1B]">ร้อนวิกฤต</div>
          <div class="text-2xl sm:text-3xl font-black text-[#DC2626] mt-1 tabular-nums">{{ counts.severe }}</div>
        </div>
        <div class="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-center">
          <div class="text-xs font-bold text-[#92400E]">เริ่มร้อน</div>
          <div class="text-2xl sm:text-3xl font-black text-[#D97706] mt-1 tabular-nums">{{ counts.moderate }}</div>
        </div>
        <div class="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
          <div class="text-xs font-bold text-[#475569]">สัญญาณหลุด</div>
          <div class="text-2xl sm:text-3xl font-black text-[#64748B] mt-1 tabular-nums">{{ counts.offline }}</div>
        </div>
      </div>
    </section>

    <!-- รายการเหตุการณ์ตามกลุ่มวัน -->
    <div v-if="loadingEvents" class="py-12 text-center text-sm font-bold text-[#64748B]">
      <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F] mb-2" size="32" />
      <p>กำลังเปิดรายการแจ้งเตือน...</p>
    </div>

    <div v-else-if="!events.length" class="bg-white rounded-3xl p-8 shadow-xs border border-[#BBF7D0] text-center space-y-2">
      <div class="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#16A34A] flex items-center justify-center mx-auto">
        <v-icon icon="mdi-check-circle-outline" size="36" />
      </div>
      <h2 class="text-base sm:text-lg font-bold text-[#15221B]">ไม่มีเหตุการณ์ความร้อนผิดปกติใน 7 วันนี้</h2>
      <p class="text-xs sm:text-sm text-[#55695D]">สภาพอากาศในคอกวัวอยู่ในเกณฑ์ปลอดภัย แม่วัวสบายดีจ้า</p>
    </div>

    <div v-else class="space-y-4">
      <section v-for="g in groups" :key="g.date" class="space-y-2.5">
        <div class="text-xs sm:text-sm font-bold text-[#475569] px-2 flex items-center gap-1.5">
          <v-icon icon="mdi-calendar-clock" size="16" />
          <span>{{ g.label }}</span>
        </div>

        <div class="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-[#E5E7EB] space-y-3">
          <div 
            v-for="(e, i) in g.items" 
            :key="e.start + e.type" 
            class="p-4 rounded-2xl flex items-start gap-3.5 transition-all"
            :class="e.type === 'heat' ? (e.level === 'severe' ? 'bg-[#FEF2F2] border border-[#FECACA]' : 'bg-[#FFFBEB] border border-[#FDE68A]') : 'bg-[#F8FAFC] border border-[#E2E8F0]'">
            
            <!-- ไอคอน -->
            <div 
              class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold"
              :class="iconClass(e)">
              <v-icon :icon="e.type === 'heat' ? (e.level === 'severe' ? 'mdi-fire' : 'mdi-thermometer-alert') : 'mdi-wifi-off'" size="24" />
            </div>

            <!-- ข้อความ -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-base sm:text-lg font-bold text-[#15221B] leading-tight">{{ title(e) }}</span>
                <span v-if="e.ongoing" class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#DC2626] text-white shrink-0 animate-pulse">
                  ยังเกิดอยู่
                </span>
              </div>

              <div class="text-xs sm:text-sm text-[#475569] font-medium mt-1">
                เวลา: {{ thaiTime(e.start) }} – {{ e.end ? thaiTime(e.end) : 'ตอนนี้' }} น. (นาน {{ durationText(e.duration_min) }})
              </div>

              <div v-if="e.type === 'heat' && e.peak_temp != null" class="text-xs sm:text-sm font-bold text-[#B91C1C] mt-1">
                ร้อนที่สุด {{ e.peak_temp }}°C · ควรให้น้ำสะอาดและเปิดพัดลมระบายอากาศ
              </div>
              <div v-else-if="e.type === 'sensor_offline'" class="text-xs sm:text-sm text-[#64748B] mt-1">
                กล่องขาดการส่งสัญญาณ ตรวจสอบปลั๊กไฟและสาย Wi-Fi ที่โรงเรือน
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

  </div>
</template>

<script setup>
import { useFarmer, thaiDate, thaiTime } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'แจ้งเตือน | CowCare ฟาร์มโคนม' })

const { request } = useFarmer()
const events = ref([])
const loadingEvents = ref(true)

const bkkKey = (iso) => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 10)

const counts = computed(() => ({
  severe: events.value.filter(e => e.type === 'heat' && e.level === 'severe').length,
  moderate: events.value.filter(e => e.type === 'heat' && e.level === 'moderate').length,
  offline: events.value.filter(e => e.type === 'sensor_offline').length
}))

const groups = computed(() => {
  const today = bkkKey(new Date())
  const yesterday = bkkKey(new Date(Date.now() - 86400e3))
  const map = new Map()
  for (const e of events.value) {
    const k = bkkKey(e.start)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(e)
  }
  return [...map.entries()].map(([date, items]) => ({
    date,
    label: date === today ? 'วันนี้' : date === yesterday ? 'เมื่อวาน' : thaiDate(date, { weekday: 'long', day: 'numeric', month: 'short' }),
    items
  }))
})

const title = (e) => (e.type === 'sensor_offline' ? 'กล่องเซ็นเซอร์เงียบ ขาดการติดต่อ' : e.level === 'severe' ? 'อากาศในคอกร้อนถึงระดับวิกฤต!' : 'อากาศเริ่มร้อน แม่วัวเริ่มอึดอัด')
const iconClass = (e) => (e.type === 'sensor_offline' ? 'bg-gray-200 text-gray-700' : e.level === 'severe' ? 'bg-[#DC2626] text-white' : 'bg-[#D97706] text-white')
const durationText = (min) => (min >= 60 ? `${Math.floor(min / 60)} ชม.${min % 60 ? ` ${min % 60} นาที` : ''}` : `${min} นาที`)

const load = async () => {
  loadingEvents.value = true
  try {
    const res = await request('events')
    events.value = res?.events || []
  } catch (err) {
    console.error('Error loading events:', err.message)
  } finally {
    loadingEvents.value = false
  }
}

onMounted(load)
</script>
