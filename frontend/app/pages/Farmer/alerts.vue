<template>
  <div class="space-y-5">
    <!-- ส่วนหัว: สรุปเหตุการณ์แจ้งเตือน 7 วัน -->
    <section class="bg-[#FFFDF7] rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E6DEC8]">
      <div class="flex items-center justify-between gap-3 pb-4 border-b border-[#E6DEC8]">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-[#1B342D] text-[#F3C68F] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-bell-ring-outline" size="26" />
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-black text-[#1B342D] leading-tight">
              ประวัติการแจ้งเตือน 7 วัน
            </h1>
            <p class="text-xs sm:text-sm text-[#4E655B] font-medium mt-0.5">
              รวมเหตุการณ์ช่วงที่อากาศร้อนเกินเกณฑ์และช่วงที่สัญญาณขาดหาย
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="load"
          :disabled="loadingEvents"
          class="w-10 h-10 rounded-xl bg-white hover:bg-[#F4EFE4] border border-[#E6DEC8] flex items-center justify-center text-[#1B342D] cursor-pointer shrink-0"
          title="โหลดข้อมูลใหม่">
          <v-icon icon="mdi-refresh" size="20" :class="loadingEvents ? 'animate-spin' : ''" />
        </button>
      </div>

      <!-- สรุปตัวเลข 3 ช่อง -->
      <div class="grid grid-cols-3 gap-3 mt-4">
        <div class="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-center">
          <div class="text-xs font-extrabold text-[#991B1B]">ร้อนวิกฤต</div>
          <div class="text-2xl sm:text-3xl font-black text-[#DC2626] mt-1 tabular-nums">
            {{ counts.severe }} <span class="text-xs font-bold">ครั้ง</span>
          </div>
        </div>
        <div class="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-center">
          <div class="text-xs font-extrabold text-[#92400E]">เริ่มร้อน</div>
          <div class="text-2xl sm:text-3xl font-black text-[#D97706] mt-1 tabular-nums">
            {{ counts.moderate }} <span class="text-xs font-bold">ครั้ง</span>
          </div>
        </div>
        <div class="p-3.5 rounded-2xl bg-white border border-[#E6DEC8] text-center">
          <div class="text-xs font-extrabold text-[#4E655B]">สัญญาณหลุด</div>
          <div class="text-2xl sm:text-3xl font-black text-[#1B342D] mt-1 tabular-nums">
            {{ counts.offline }} <span class="text-xs font-bold">ครั้ง</span>
          </div>
        </div>
      </div>
    </section>

    <!-- สถานะกำลังโหลด -->
    <div v-if="loadingEvents" class="py-14 text-center text-sm font-extrabold text-[#4E655B]">
      <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F] mb-2" size="36" />
      <p>กำลังเปิดรายการแจ้งเตือน...</p>
    </div>

    <!-- โหลดไม่สำเร็จ: ห้ามขึ้นว่าปลอดภัย -->
    <div v-else-if="loadError" class="bg-[#FFFDF7] rounded-3xl p-8 shadow-xs border-2 border-[#FCA5A5] text-center space-y-3">
      <v-icon icon="mdi-cloud-off-outline" size="40" class="text-[#B91C1C]" />
      <p class="text-base font-extrabold text-[#7F1D1D]">โหลดรายการแจ้งเตือนไม่สำเร็จ</p>
      <p class="text-sm text-[#4E655B]">ตรวจสัญญาณอินเทอร์เน็ตแล้วลองใหม่ (ยังไม่รู้ว่ามีเหตุการณ์หรือไม่)</p>
      <button type="button" class="px-5 py-2.5 rounded-2xl bg-[#1B4332] text-white font-bold" @click="load">ลองใหม่</button>
    </div>

    <!-- กรณีไม่มีเหตุการณ์ผิดปกติ -->
    <div
      v-else-if="!events.length"
      class="bg-[#FFFDF7] rounded-3xl p-8 shadow-xs border-2 border-[#A7F3D0] text-center space-y-2.5">
      <div class="w-16 h-16 rounded-2xl bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center mx-auto">
        <v-icon icon="mdi-check-decagram-outline" size="38" />
      </div>
      <h2 class="text-base sm:text-lg font-black text-[#1B342D]">
        ไม่มีเหตุการณ์ความร้อนผิดปกติในรอบ 7 วันนี้
      </h2>
      <p class="text-xs sm:text-sm text-[#3A5248] font-medium">
        สภาพอากาศในคอกวัวอยู่ในเกณฑ์ปลอดภัย และกล่องเซ็นเซอร์ทำงานปกติ
      </p>
    </div>

    <!-- รายการเหตุการณ์แยกตามวัน -->
    <div v-else class="space-y-5">
      <section v-for="g in groups" :key="g.date" class="space-y-2.5">
        <div class="text-xs sm:text-sm font-black text-[#1B342D] px-2 flex items-center gap-1.5">
          <v-icon icon="mdi-calendar-clock" size="18" class="text-[#D87939]" />
          <span>{{ g.label }}</span>
        </div>

        <div class="space-y-3">
          <FarmerAlertItemCard
            v-for="e in g.items"
            :key="e.start + e.type"
            :event="e" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useFarmer, thaiDate } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'แจ้งเตือน | CowCare ฟาร์มโคนม' })

const { request, farmId } = useFarmer()
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
    label: date === today ? 'วันนี้' : date === yesterday ? 'เมื่อวานนี้' : thaiDate(date, { weekday: 'long', day: 'numeric', month: 'short' }),
    items
  }))
})

const loadError = ref(false)
const load = async () => {
  loadingEvents.value = true
  loadError.value = false
  try {
    const res = await request('events')
    events.value = res?.events || []
  } catch (err) {
    loadError.value = true
    console.error('Error loading events:', err.message)
  } finally {
    loadingEvents.value = false
  }
}

watch(farmId, () => {
  load()
})

onMounted(load)
</script>
