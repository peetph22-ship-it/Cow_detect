<template>
  <div class="space-y-4">
    <!-- ส่วนหัวกระชับ + ตัวกรองหมวดหมู่ในแถวเดียว -->
    <section class="bg-[#FFFDF7] rounded-3xl p-4 sm:p-5 shadow-xs border border-[#E6DEC8] space-y-3.5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#1B342D] text-[#F3C68F] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-bell-ring-outline" size="22" />
          </div>
          <div>
            <h1 class="text-base sm:text-lg font-black text-[#1B342D] leading-tight">
              ประวัติการแจ้งเตือนย้อนหลัง 7 วัน
            </h1>
            <p class="text-xs text-[#4E655B] font-medium mt-0.5">
              กดเลือกหมวดหมู่เพื่อดูเฉพาะเหตุการณ์ที่ต้องการ
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="load"
          :disabled="loadingEvents"
          class="px-3 py-2 rounded-xl bg-white hover:bg-[#F4EFE4] border border-[#E6DEC8] flex items-center gap-1.5 text-xs font-extrabold text-[#1B342D] cursor-pointer shrink-0 transition-colors"
          title="โหลดข้อมูลใหม่">
          <v-icon icon="mdi-refresh" size="17" :class="loadingEvents ? 'animate-spin' : ''" />
          <span>รีเฟรช</span>
        </button>
      </div>

      <!-- ปุ่มกรองหมวดหมู่ (รวมตัวเลขสรุปไว้ในปุ่มเดียว ไม่กินพื้นที่แนวตั้ง) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          @click="setFilter('all')"
          class="px-3 py-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2"
          :class="activeFilter === 'all'
            ? 'bg-[#1B342D] text-white border-[#1B342D] shadow-xs'
            : 'bg-white text-[#1B342D] border-[#E6DEC8] hover:bg-[#F4EFE4]'">
          <span class="text-xs font-extrabold">ทั้งหมด</span>
          <span
            class="px-2 py-0.5 rounded-lg text-xs font-black tabular-nums"
            :class="activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#F4EFE4] text-[#1B342D]'">
            {{ events.length }}
          </span>
        </button>

        <button
          type="button"
          @click="setFilter('severe')"
          class="px-3 py-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2"
          :class="activeFilter === 'severe'
            ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
            : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] hover:bg-[#FEE2E2]'">
          <span class="text-xs font-extrabold">ร้อนจัด</span>
          <span
            class="px-2 py-0.5 rounded-lg text-xs font-black tabular-nums"
            :class="activeFilter === 'severe' ? 'bg-white/20 text-white' : 'bg-white text-[#DC2626]'">
            {{ counts.severe }}
          </span>
        </button>

        <button
          type="button"
          @click="setFilter('moderate')"
          class="px-3 py-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2"
          :class="activeFilter === 'moderate'
            ? 'bg-[#D97706] text-white border-[#D97706] shadow-xs'
            : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] hover:bg-[#FEF3C7]'">
          <span class="text-xs font-extrabold">อากาศร้อน</span>
          <span
            class="px-2 py-0.5 rounded-lg text-xs font-black tabular-nums"
            :class="activeFilter === 'moderate' ? 'bg-white/20 text-white' : 'bg-white text-[#D97706]'">
            {{ counts.moderate }}
          </span>
        </button>

        <button
          type="button"
          @click="setFilter('offline')"
          class="px-3 py-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2"
          :class="activeFilter === 'offline'
            ? 'bg-[#3A5248] text-white border-[#3A5248] shadow-xs'
            : 'bg-white text-[#3A5248] border-[#E6DEC8] hover:bg-[#F4EFE4]'">
          <span class="text-xs font-extrabold">สัญญาณหลุด</span>
          <span
            class="px-2 py-0.5 rounded-lg text-xs font-black tabular-nums"
            :class="activeFilter === 'offline' ? 'bg-white/20 text-white' : 'bg-[#F4EFE4] text-[#1B342D]'">
            {{ counts.offline }}
          </span>
        </button>
      </div>

      <!-- คำแนะนำรวมบรรทัดเดียว (ลดข้อความซ้ำในรายการย่อย) -->
      <div class="px-3.5 py-2 rounded-xl bg-[#F4EFE4]/80 border border-[#E6DEC8] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#3A5248] font-semibold">
        <span class="flex items-center gap-1.5">
          <v-icon icon="mdi-fan" size="15" class="text-[#D97706]" />
          <span><b>เตือนความร้อน:</b> เปิดพัดลมระบายอากาศและตรวจน้ำดื่มแม่วัว</span>
        </span>
        <span class="flex items-center gap-1.5">
          <v-icon icon="mdi-power-plug-outline" size="15" class="text-[#1B342D]" />
          <span><b>สัญญาณขาดหาย:</b> ตรวจปลั๊กไฟและ Wi-Fi ที่โรงเรือน</span>
        </span>
      </div>
    </section>

    <!-- สถานะกำลังโหลด -->
    <div v-if="loadingEvents" class="py-12 text-center text-sm font-extrabold text-[#4E655B]">
      <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F] mb-2" size="32" />
      <p>กำลังเปิดรายการแจ้งเตือน...</p>
    </div>

    <!-- โหลดไม่สำเร็จ: ห้ามขึ้นว่าปลอดภัย -->
    <div v-else-if="loadError" class="bg-[#FFFDF7] rounded-3xl p-6 shadow-xs border-2 border-[#FCA5A5] text-center space-y-2.5">
      <v-icon icon="mdi-cloud-off-outline" size="36" class="text-[#B91C1C]" />
      <p class="text-sm sm:text-base font-extrabold text-[#7F1D1D]">โหลดรายการแจ้งเตือนไม่สำเร็จ</p>
      <p class="text-xs sm:text-sm text-[#4E655B]">ตรวจสัญญาณอินเทอร์เน็ตแล้วลองใหม่ (ยังไม่รู้ว่ามีเหตุการณ์หรือไม่)</p>
      <button type="button" class="px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold cursor-pointer" @click="load">ลองใหม่</button>
    </div>

    <!-- ไม่มีข้อมูลจากกล่องเลยในรอบ 7 วัน: ห้ามขึ้นว่าปลอดภัยหรือกล่องทำงานปกติ -->
    <div v-else-if="!hasData" class="bg-[#FFFDF7] rounded-3xl p-6 shadow-xs border-2 border-[#FCD34D] text-center space-y-2.5">
      <v-icon icon="mdi-access-point-network-off" size="36" class="text-[#B45309]" />
      <p class="text-sm sm:text-base font-extrabold text-[#78350F]">ไม่มีข้อมูลจากกล่องเซ็นเซอร์ในรอบ 7 วัน</p>
      <p class="text-xs sm:text-sm text-[#4E655B]">
        {{ lastDataText }} จึงยังบอกไม่ได้ว่ามีช่วงอากาศร้อนหรือไม่ ตรวจปลั๊กไฟและ Wi-Fi ที่โรงเรือน
      </p>
    </div>

    <!-- กรณีไม่มีเหตุการณ์ในหมวดที่เลือก -->
    <div
      v-else-if="!filteredEvents.length"
      class="bg-[#FFFDF7] rounded-3xl p-7 shadow-xs border border-[#A7F3D0] text-center space-y-2">
      <div class="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center mx-auto">
        <v-icon icon="mdi-check-decagram-outline" size="28" />
      </div>
      <h2 class="text-sm sm:text-base font-black text-[#1B342D]">
        {{ events.length ? 'ไม่มีรายการในหมวดหมู่นี้' : 'ไม่มีเหตุการณ์ความร้อนผิดปกติในรอบ 7 วันนี้' }}
      </h2>
      <p class="text-xs text-[#3A5248] font-medium">
        {{ events.length ? 'กดเลือกหมวด "ทั้งหมด" เพื่อดูรายการแจ้งเตือนประเภทอื่น' : 'ไม่มีช่วงที่ THI ถึงระดับอากาศร้อนต่อเนื่อง 30 นาทีขึ้นไป และไม่มีช่วงสัญญาณขาดหายเกิน 15 นาที' }}
      </p>
    </div>

    <!-- รายการเหตุการณ์แยกตามวัน (จัด 2 คอลัมน์บนจอใหญ่ + จำกัดจำนวนเริ่มต้นไม่ให้หน้ายาวเกินไป) -->
    <div v-else class="space-y-4">
      <section
        v-for="g in groups"
        :key="g.date"
        class="bg-[#FFFDF7] rounded-3xl p-4 sm:p-5 shadow-xs border border-[#E6DEC8] space-y-3">
        <div class="flex items-center justify-between border-b border-[#E6DEC8] pb-2">
          <div class="text-xs sm:text-sm font-black text-[#1B342D] flex items-center gap-1.5">
            <v-icon icon="mdi-calendar-clock" size="17" class="text-[#D87939]" />
            <span>{{ g.label }}</span>
          </div>
          <span class="text-xs font-bold text-[#63786E]">{{ g.items.length }} รายการ</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <FarmerAlertItemCard
            v-for="e in g.items"
            :key="e.start + e.type"
            :event="e" />
        </div>
      </section>

      <!-- ปุ่มดูเพิ่มเติม / ย่อรายการ เพื่อไม่ให้หน้าเว็บตกลงไปข้างล่าง -->
      <div v-if="filteredEvents.length > INITIAL_LIMIT" class="flex justify-center pt-1">
        <button
          type="button"
          @click="toggleExpand"
          class="px-5 py-2.5 rounded-2xl bg-white hover:bg-[#F4EFE4] border border-[#E6DEC8] text-xs sm:text-sm font-extrabold text-[#1B342D] shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors">
          <v-icon :icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="18" />
          <span>
            {{ isExpanded
              ? 'ย่อรายการแจ้งเตือน'
              : `ดูเพิ่มเติมอีก ${filteredEvents.length - INITIAL_LIMIT} รายการ` }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFarmer, thaiDate, thaiTime } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'แจ้งเตือน | CowCare ฟาร์มโคนม' })

const INITIAL_LIMIT = 10

const { request, farmId } = useFarmer()
const events = ref([])
const loadingEvents = ref(true)
const activeFilter = ref('all')
const isExpanded = ref(false)

const setFilter = (filterKey) => {
  activeFilter.value = filterKey
  isExpanded.value = false
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const bkkKey = (iso) => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 10)

const counts = computed(() => ({
  severe: events.value.filter(e => e.type === 'heat' && e.level === 'severe').length,
  moderate: events.value.filter(e => e.type === 'heat' && e.level === 'moderate').length,
  offline: events.value.filter(e => e.type === 'sensor_offline').length
}))

const filteredEvents = computed(() => {
  if (activeFilter.value === 'severe') {
    return events.value.filter(e => e.type === 'heat' && e.level === 'severe')
  }
  if (activeFilter.value === 'moderate') {
    return events.value.filter(e => e.type === 'heat' && e.level === 'moderate')
  }
  if (activeFilter.value === 'offline') {
    return events.value.filter(e => e.type === 'sensor_offline')
  }
  return events.value
})

const visibleEvents = computed(() => {
  if (isExpanded.value) return filteredEvents.value
  return filteredEvents.value.slice(0, INITIAL_LIMIT)
})

const groups = computed(() => {
  const today = bkkKey(new Date())
  const yesterday = bkkKey(new Date(Date.now() - 86400e3))
  const map = new Map()
  for (const e of visibleEvents.value) {
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
// มีข้อมูลจากกล่องในรอบ 7 วันไหม (API ส่ง has_data และเวลาข้อมูลล่าสุดมาให้)
const hasData = ref(true)
const lastDataAt = ref(null)
const lastDataText = computed(() => lastDataAt.value
  ? `ได้รับข้อมูลล่าสุดเมื่อ ${thaiDate(lastDataAt.value, { day: 'numeric', month: 'short', year: '2-digit' })} เวลา ${thaiTime(lastDataAt.value)} น.`
  : 'ยังไม่เคยได้รับข้อมูลจากกล่องเซ็นเซอร์ของฟาร์มนี้')
const load = async () => {
  loadingEvents.value = true
  loadError.value = false
  try {
    const res = await request('events')
    events.value = res?.events || []
    hasData.value = res?.has_data !== false
    lastDataAt.value = res?.last_data_at || null
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
