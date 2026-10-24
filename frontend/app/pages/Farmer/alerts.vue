<template>
  <div class="space-y-5">

    <!-- ส่วนหัว: สรุปเหตุการณ์แจ้งเตือน 7 วัน -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#E5E9E5]">
      <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div class="w-12 h-12 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center text-2xl font-bold border border-[#FECACA]">
          <v-icon icon="mdi-bell-alert-outline" size="26" />
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-black text-[#15221B] leading-tight">
            ประวัติการแจ้งเตือน
          </h1>
          <p class="text-xs sm:text-sm text-[#64748B] mt-0.5">
            เหตุการณ์ความร้อนและสัญญาณอุปกรณ์ในรอบ 7 วันที่ผ่านมา
          </p>
        </div>
      </div>

      <!-- สรุปตัวเลข 3 ช่องใหญ่ สบายตา -->
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
    <div v-if="loadingEvents" class="py-16 text-center text-sm font-bold text-[#64748B] space-y-2">
      <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F]" size="36" />
      <p>กำลังเปิดรายการแจ้งเตือน...</p>
    </div>

    <!-- กรณีไม่มีการแจ้งเตือนเลย (อากาศดีเยี่ยม) -->
    <div v-else-if="!events.length" class="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#BBF7D0] text-center space-y-3">
      <div class="w-16 h-16 rounded-3xl bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center mx-auto border border-[#BBF7D0]">
        <v-icon icon="mdi-check-circle" size="36" />
      </div>
      <h2 class="text-lg sm:text-xl font-black text-[#15221B]">ไม่มีเหตุการณ์ความร้อนผิดปกติใน 7 วันนี้</h2>
      <p class="text-xs sm:text-sm text-[#55695D] max-w-sm mx-auto leading-relaxed">
        สภาพอากาศในโรงเรือนอยู่ในเกณฑ์ปลอดภัย แม่วัวเคี้ยวเอื้องสบาย อารมณ์ดี ให้น้ำนมได้ดีจ้า
      </p>
    </div>

    <!-- รายการแจ้งเตือนตามวัน -->
    <div v-else class="space-y-4">
      <section v-for="g in groups" :key="g.date" class="space-y-2.5">
        <div class="text-xs sm:text-sm font-bold text-[#475569] px-2 flex items-center gap-1.5">
          <v-icon icon="mdi-calendar-clock" size="16" />
          <span>{{ g.label }}</span>
        </div>

        <div class="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-[#E5E9E5] space-y-3">
          <div 
            v-for="e in g.items" 
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
                <span class="text-base sm:text-lg font-black text-[#15221B] leading-tight">{{ title(e) }}</span>
                <span v-if="e.ongoing" class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#DC2626] text-white shrink-0 animate-pulse">
                  ยังเกิดอยู่
                </span>
              </div>

              <div class="text-xs sm:text-sm text-[#475569] font-semibold mt-1">
                เวลา: {{ thaiTime(e.start) }} – {{ e.end ? thaiTime(e.end) : 'ตอนนี้' }} น. (นาน {{ durationText(e.duration_min) }})
              </div>

              <div v-if="e.type === 'heat' && e.peak_temp != null" class="text-xs sm:text-sm font-bold text-[#B91C1C] mt-1.5">
                ร้อนที่สุด {{ e.peak_temp }}°C · ควรให้น้ำสะอาดและเปิดพัดลมระบายอากาศ
              </div>
              <div v-else-if="e.type === 'sensor_offline'" class="text-xs sm:text-sm text-[#64748B] mt-1.5">
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
import { ref, computed, onMounted } from 'vue'
import { useFarmer, thaiTime, thaiDate } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ประวัติการแจ้งเตือน | CowCare AI' })

const { request } = useFarmer()

const loadingEvents = ref(true)
const events = ref([])

const counts = computed(() => {
  let severe = 0, moderate = 0, offline = 0
  for (const e of events.value) {
    if (e.type === 'heat' && e.level === 'severe') severe++
    else if (e.type === 'heat' && (e.level === 'moderate' || e.level === 'mild')) moderate++
    else if (e.type === 'sensor_offline') offline++
  }
  return { severe, moderate, offline }
})

const groups = computed(() => {
  const map = {}
  for (const e of events.value) {
    const d = e.start.slice(0, 10)
    if (!map[d]) map[d] = []
    map[d].push(e)
  }
  return Object.keys(map).sort().reverse().map(date => {
    const today = new Date().toISOString().slice(0, 10)
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    let label = thaiDate(date, { weekday: 'long', day: 'numeric', month: 'short' })
    if (date === today) label = `วันนี้ (${label})`
    else if (date === yest) label = `เมื่อวาน (${label})`
    return { date, label, items: map[date] }
  })
})

const iconClass = (e) => {
  if (e.type === 'heat' && e.level === 'severe') return 'bg-[#DC2626] text-white shadow-xs'
  if (e.type === 'heat') return 'bg-[#D97706] text-white shadow-xs'
  return 'bg-[#64748B] text-white shadow-xs'
}

const title = (e) => {
  if (e.type === 'heat' && e.level === 'severe') return 'อากาศร้อนจัดมาก แม่วัวเครียด'
  if (e.type === 'heat') return 'อากาศเริ่มร้อนขึ้นในโรงเรือน'
  return 'กล่องเซ็นเซอร์ขาดการเชื่อมต่อ'
}

const durationText = (min) => {
  if (min == null) return ''
  if (min < 60) return `${min} นาที`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} ชั่วโมง ${m} นาที` : `${h} ชั่วโมง`
}

const loadEvents = async () => {
  loadingEvents.value = true
  try {
    const res = await request('events', { days: 7 })
    if (res?.events) events.value = res.events
  } catch (e) {
    events.value = []
  } finally {
    loadingEvents.value = false
  }
}

onMounted(loadEvents)
</script>