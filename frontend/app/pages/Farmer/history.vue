<template>
  <div>
    <!-- ส่วนบนเขียวเข้ม: กราฟ 7 วัน -->
    <section class="bg-[#142820] text-white">
      <div class="max-w-5xl mx-auto px-4 pb-6 pt-2">
        <div class="flex items-end justify-between">
          <div>
            <h1 class="text-lg font-bold">ย้อนหลัง 7 วัน</h1>
            <p class="text-xs text-[#9FB5AA]">ชั่วโมงที่วัวอยู่ในความร้อนระดับเครียดขึ้นไป</p>
          </div>
          <span v-if="avgStress != null" class="text-xs text-[#9FB5AA] text-right">เฉลี่ย<br><span class="text-base font-bold text-white tabular-nums">{{ avgStress }}</span> ชม./วัน</span>
        </div>

        <div v-if="loadingDays" class="h-[150px] flex items-center justify-center text-[#9FB5AA] text-sm">กำลังโหลด...</div>
        <div v-else class="flex items-end gap-2 md:gap-4 h-[150px] mt-5">
          <button
            v-for="d in days"
            :key="d.date"
            type="button"
            @click="selected = d.date"
            class="flex-1 h-full flex flex-col justify-end items-center gap-1.5 cursor-pointer group"
            :aria-label="`${thaiDate(d.date)} ${d.has_data ? d.stress_hours + ' ชั่วโมง' : 'ไม่มีข้อมูล'}`">
            <span class="text-[11px] tabular-nums" :class="d.date === selected ? 'text-white font-semibold' : 'text-[#9FB5AA]'">{{ d.has_data ? Math.round(d.stress_hours) : '' }}</span>
            <div
              class="w-full rounded-lg transition-all"
              :class="d.has_data ? '' : 'border border-dashed border-[#36584d]'"
              :style="{ height: barHeight(d), background: barColor(d), outline: d.date === selected ? '2px solid #F2BD7C' : 'none', outlineOffset: '2px' }">
            </div>
            <span class="text-[11px]" :class="d.is_today ? 'text-white font-semibold' : 'text-[#9FB5AA]'">{{ d.is_today ? 'วันนี้' : thaiDate(d.date, { weekday: 'short' }) }}</span>
          </button>
        </div>
      </div>
    </section>

    <div class="max-w-5xl mx-auto px-4 py-5 md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0 md:items-start">
      <!-- รายละเอียดวันที่เลือก -->
      <section v-if="selectedDay" class="bg-[#fffdf7] border border-[#EFE6D6] rounded-[22px] p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs text-[#718078]">{{ selectedDay.is_today ? 'วันนี้ (ตั้งแต่เที่ยงคืน)' : thaiDate(selectedDay.date, { weekday: 'long', day: 'numeric', month: 'long' }) }}</div>
            <div class="text-lg font-bold mt-0.5">{{ selectedDay.has_data ? `เครียด ${selectedDay.stress_hours} ชม.` : 'ไม่มีข้อมูล' }}</div>
          </div>
          <span v-if="selectedDay.has_data" class="text-xs font-semibold px-2.5 py-1 rounded-full" :class="riskStyle(selectedDay.risk_level).chip">เฉลี่ย{{ riskShort(selectedDay.risk_level) }}</span>
        </div>
        <div v-if="selectedDay.has_data" class="grid grid-cols-2 gap-2.5 mt-4">
          <div class="bg-[#F6F7F5] rounded-2xl p-3"><div class="text-[11px] text-[#718078]">ร้อนที่สุด</div><div class="text-[17px] font-bold tabular-nums">{{ selectedDay.max_temp }}°C</div></div>
          <div class="bg-[#F6F7F5] rounded-2xl p-3"><div class="text-[11px] text-[#718078]">เย็นที่สุด</div><div class="text-[17px] font-bold tabular-nums">{{ selectedDay.min_temp }}°C</div></div>
          <div class="bg-[#F6F7F5] rounded-2xl p-3"><div class="text-[11px] text-[#718078]">ช่วงร้อนที่สุด</div><div class="text-[17px] font-bold tabular-nums">{{ selectedDay.peak_hour != null ? `${selectedDay.peak_hour}:00 น.` : '—' }}</div></div>
          <div class="bg-[#F6F7F5] rounded-2xl p-3"><div class="text-[11px] text-[#718078]">วิกฤต</div><div class="text-[17px] font-bold tabular-nums">{{ selectedDay.severe_hours }} ชม.</div></div>
          <div class="bg-[#F6F7F5] rounded-2xl p-3"><div class="text-[11px] text-[#718078]">THI เฉลี่ยทั้งวัน</div><div class="text-[17px] font-bold tabular-nums">{{ selectedDay.avg_thi }}</div></div>
          <div class="bg-[#F6F7F5] rounded-2xl p-3"><div class="text-[11px] text-[#718078]">พักกลางคืน</div><div class="text-[17px] font-bold tabular-nums">{{ selectedDay.night_relief_hours ?? 0 }} ชม.</div></div>
        </div>
        <p v-if="selectedDay.has_data && selectedDay.data_hours < 23 && !selectedDay.is_today" class="text-xs text-[#a4521c] mt-3">
          มีข้อมูล {{ selectedDay.data_hours }} จาก 24 ชม. (กล่องเซ็นเซอร์ขาดการติดต่อบางช่วง)
        </p>
      </section>

      <div class="space-y-4">
        <!-- สรุปสั้นๆ -->
        <section v-if="insight" class="bg-[#e6f2e7] border border-[#cfe5d2] rounded-[22px] p-4 flex gap-3">
          <v-icon icon="mdi-lightbulb-on-outline" size="20" class="text-[#3e7d4f] shrink-0 mt-0.5" />
          <p class="text-[14px] text-[#24433a] leading-relaxed">{{ insight }}</p>
        </section>

        <!-- รายการทุกวัน -->
        <section class="bg-[#fffdf7] border border-[#EFE6D6] rounded-[22px] px-4 py-1">
          <button
            v-for="(d, i) in [...days].reverse()"
            :key="d.date"
            type="button"
            @click="selected = d.date"
            class="w-full flex items-center justify-between py-3 text-left cursor-pointer"
            :class="i < days.length - 1 ? 'border-b border-[#EFE6D6]' : ''">
            <span class="flex items-center gap-2.5 text-[14px]" :class="d.date === selected ? 'font-bold' : ''">
              <span class="w-2 h-2 rounded-full" :style="{ background: d.has_data ? riskStyle(d.risk_level).dot : '#cfd6d2' }"></span>
              {{ d.is_today ? 'วันนี้' : thaiDate(d.date) }}
            </span>
            <span class="text-[14px] tabular-nums">
              <template v-if="d.has_data">{{ d.stress_hours }} ชม. <span class="text-[#718078] text-xs">· สูงสุด {{ d.max_temp }}°</span></template>
              <span v-else class="text-[#718078] text-xs">ไม่มีข้อมูล</span>
            </span>
          </button>
        </section>
      </div>

      <p v-if="errorMsg" class="text-sm text-[#a4521c] md:col-span-2">{{ errorMsg }}</p>
      <HeatMethodNote :method="method" tone="farmer" class="md:col-span-2" />
    </div>
  </div>
</template>

<script setup>
import { useFarmer, riskStyle, riskShort, thaiDate } from '~/composables/useFarmer'
import HeatMethodNote from '~/components/common/HeatMethodNote.vue'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ย้อนหลัง | CowCare AI' })

const { farmId, request } = useFarmer()
const days = ref([])
const selected = ref('')
const loadingDays = ref(true)
const errorMsg = ref('')
const method = ref(null)

const withData = computed(() => days.value.filter(d => d.has_data))
const maxStress = computed(() => Math.max(1, ...withData.value.map(d => d.stress_hours)))
const hottestDate = computed(() => withData.value.reduce((a, d) => (!a || d.max_temp > a.max_temp ? d : a), null)?.date)
const selectedDay = computed(() => days.value.find(d => d.date === selected.value) || null)
const avgStress = computed(() => {
  const full = withData.value.filter(d => !d.is_today)
  return full.length ? Math.round(full.reduce((s, d) => s + d.stress_hours, 0) / full.length) : null
})

const barHeight = (d) => (d.has_data ? `${Math.max(6, (d.stress_hours / Math.max(24, maxStress.value)) * 100)}%` : '24px')
// วันนี้ = ส้ม, วันที่ร้อนที่สุดของสัปดาห์ = ทอง, วันอื่น = เขียวหม่น
const barColor = (d) => (!d.has_data ? 'transparent' : d.is_today ? '#D87939' : d.date === hottestDate.value ? '#F2BD7C' : '#36584d')

// สรุปจากข้อมูลจริง: ช่วงเวลาที่ร้อนที่สุดที่พบบ่อย และแนวโน้มครึ่งแรกเทียบครึ่งหลังของสัปดาห์
const insight = computed(() => {
  const full = withData.value.filter(d => !d.is_today)
  if (full.length < 3) return ''
  const hours = full.map(d => d.peak_hour).filter(h => h != null)
  const counts = hours.reduce((m, h) => m.set(h, (m.get(h) || 0) + 1), new Map())
  const [topHour] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || []
  const half = Math.floor(full.length / 2)
  const avg = (arr) => arr.reduce((s, d) => s + d.stress_hours, 0) / arr.length
  const diff = avg(full.slice(-half)) - avg(full.slice(0, half))
  const trend = diff > 2 ? 'ช่วงหลังของสัปดาห์ร้อนนานขึ้น' : diff < -2 ? 'ช่วงหลังของสัปดาห์ร้อนน้อยลง' : 'ความร้อนใกล้เคียงกันทุกวัน'
  return `${trend}${topHour != null ? ` · ร้อนที่สุดมักเป็นช่วง ${topHour}:00 น.` : ''}`
})

const load = async () => {
  loadingDays.value = true
  try {
    const d = await request('history')
    days.value = d.days || []
    method.value = d.method || null
    if (!days.value.find(x => x.date === selected.value)) selected.value = days.value[days.value.length - 1]?.date || ''
    errorMsg.value = ''
  } catch {
    errorMsg.value = 'โหลดข้อมูลย้อนหลังไม่สำเร็จ'
  } finally {
    loadingDays.value = false
  }
}

onMounted(load)
watch(farmId, (v, old) => { if (old && v !== old) load() })
</script>
