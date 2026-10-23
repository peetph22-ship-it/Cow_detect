<template>
  <div>
    <!-- ส่วนบนเขียวเข้ม: สรุป 7 วัน -->
    <section class="bg-[#142820] text-white">
      <div class="max-w-5xl mx-auto px-4 pb-6 pt-2">
        <h1 class="text-lg font-bold">แจ้งเตือน</h1>
        <p class="text-xs text-[#9FB5AA]">เหตุการณ์ใน 7 วันที่ผ่านมา</p>
        <div class="grid grid-cols-3 gap-2.5 mt-4">
          <div class="bg-[#24433a] rounded-2xl p-3">
            <div class="text-[11px] text-[#9FB5AA]">วิกฤต</div>
            <div class="text-2xl font-bold tabular-nums" :class="counts.severe ? 'text-[#F2BD7C]' : ''">{{ counts.severe }}</div>
          </div>
          <div class="bg-[#24433a] rounded-2xl p-3">
            <div class="text-[11px] text-[#9FB5AA]">เครียด</div>
            <div class="text-2xl font-bold tabular-nums">{{ counts.moderate }}</div>
          </div>
          <div class="bg-[#24433a] rounded-2xl p-3">
            <div class="text-[11px] text-[#9FB5AA]">เซ็นเซอร์หลุด</div>
            <div class="text-2xl font-bold tabular-nums">{{ counts.offline }}</div>
          </div>
        </div>
      </div>
    </section>

    <div class="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <div v-if="loadingEvents" class="text-center text-sm text-[#718078] py-8">กำลังโหลด...</div>
      <p v-else-if="errorMsg" class="text-sm text-[#a4521c]">{{ errorMsg }}</p>
      <div v-else-if="!events.length" class="bg-[#e6f2e7] border border-[#cfe5d2] rounded-[22px] p-6 text-center">
        <v-icon icon="mdi-check-circle-outline" size="32" class="text-[#3e7d4f]" />
        <p class="text-[15px] font-semibold mt-2">ไม่มีเหตุการณ์ใน 7 วันที่ผ่านมา</p>
      </div>

      <section v-for="g in groups" :key="g.date">
        <h2 class="text-xs font-semibold text-[#718078] mb-2 px-1">{{ g.label }}</h2>
        <div class="bg-[#fffdf7] border border-[#EFE6D6] rounded-[22px] px-4 py-1">
          <div v-for="(e, i) in g.items" :key="e.start + e.type" class="flex gap-3 items-start py-3" :class="i < g.items.length - 1 ? 'border-b border-[#EFE6D6]' : ''">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="iconClass(e)">
              <v-icon :icon="e.type === 'heat' ? (e.level === 'severe' ? 'mdi-fire' : 'mdi-thermometer-alert') : 'mdi-wifi-off'" size="19" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[15px] font-semibold">{{ title(e) }}</span>
                <span v-if="e.ongoing" class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fbe6d6] text-[#a4521c] shrink-0">ยังเกิดอยู่</span>
              </div>
              <div class="text-[13px] text-[#4e6057] tabular-nums mt-0.5">
                {{ thaiTime(e.start) }} – {{ e.end ? thaiTime(e.end) : 'ตอนนี้' }} น. · {{ durationText(e.duration_min) }}
              </div>
              <div v-if="e.type === 'heat' && e.peak_temp != null" class="text-xs text-[#718078] mt-0.5">ร้อนสุด {{ e.peak_temp }}°C</div>
              <div v-else-if="e.type === 'sensor_offline'" class="text-xs text-[#718078] mt-0.5">ข้อมูลช่วงนี้ไม่ครบ ตรวจไฟและอินเทอร์เน็ตที่โรงเรือน</div>
            </div>
          </div>
        </div>
      </section>

      <p v-if="events.length" class="text-xs text-[#718078] text-center pt-1">นับเฉพาะช่วงที่เครียดต่อเนื่องอย่างน้อย 30 นาที · การแจ้งเตือนทาง LINE จะมาเร็วๆ นี้</p>
    </div>
  </div>
</template>

<script setup>
import { useFarmer, thaiDate, thaiTime } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'แจ้งเตือน | CowCare AI' })

const { farmId, request } = useFarmer()
const events = ref([])
const loadingEvents = ref(true)
const errorMsg = ref('')

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

const title = (e) => (e.type === 'sensor_offline' ? 'กล่องเซ็นเซอร์ขาดการติดต่อ' : e.level === 'severe' ? 'ร้อนถึงระดับวิกฤต' : 'วัวเครียดจากความร้อน')
const iconClass = (e) => (e.type === 'sensor_offline' ? 'bg-[#eef1ef] text-[#718078]' : e.level === 'severe' ? 'bg-[#c2412d] text-white' : 'bg-[#fbe6d6] text-[#a4521c]')
const durationText = (min) => (min >= 60 ? `${Math.floor(min / 60)} ชม.${min % 60 ? ` ${min % 60} นาที` : ''}` : `${min} นาที`)

const load = async () => {
  loadingEvents.value = true
  try {
    const d = await request('events')
    events.value = d.events || []
    errorMsg.value = ''
  } catch {
    errorMsg.value = 'โหลดประวัติแจ้งเตือนไม่สำเร็จ'
  } finally {
    loadingEvents.value = false
  }
}

onMounted(load)
watch(farmId, (v, old) => { if (old && v !== old) load() })
</script>
