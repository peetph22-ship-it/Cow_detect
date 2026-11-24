<template>
  <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-5">

    <!-- หัวข้อ + เลือกวัน -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#e5ece9]">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-cow" size="26" />
        </div>
        <div>
          <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight">พฤติกรรมวัวรายตัว</h3>
          <p class="text-xs text-[#718078] font-medium">
            <template v-if="data?.cow">
              วัวหมายเลข {{ data.cow.tag_id || '-' }}<template v-if="data.cow.name"> ({{ data.cow.name }})</template> ·
            </template>
            นอน ยืน กิน ตลอดวัน จากภาพกล้อง เทียบกับ THI ในคอก
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 self-start lg:self-auto">
        <button type="button" class="w-9 h-9 rounded-xl bg-[#f0f4f2] text-[#24433a] hover:bg-[#e5ece9] flex items-center justify-center cursor-pointer" aria-label="วันก่อนหน้า" @click="shiftDay(-1)">
          <v-icon icon="mdi-chevron-left" size="20" />
        </button>
        <input v-model="date" type="date" :max="today" aria-label="เลือกวันที่"
          class="h-9 px-3 rounded-xl bg-[#f0f4f2] text-sm font-bold text-[#24433a] border-0 outline-none focus:ring-2 focus:ring-[#24433a]/20" />
        <button type="button" class="w-9 h-9 rounded-xl bg-[#f0f4f2] text-[#24433a] hover:bg-[#e5ece9] flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" aria-label="วันถัดไป" :disabled="date >= today" @click="shiftDay(1)">
          <v-icon icon="mdi-chevron-right" size="20" />
        </button>
      </div>
    </div>

    <!-- เลือกวัวที่จะติดตาม (คลิกจากภาพล่าสุดหรือภาพย้อนหลัง) -->
    <CowTargetPicker :farm-id="farmId" @changed="onTargetChanged" />

    <!-- ส่งออกข้อมูลวัวตัวนี้ทั้งวัน (เปิดด้วย Excel ได้) -->
    <div v-if="data?.cow" class="flex flex-wrap items-center gap-2">
      <span class="text-xs font-bold text-[#4e6057]">ส่งออก CSV วันที่ {{ date }}:</span>
      <button v-for="k in [{ key: 'snapshots', label: 'รายภาพ (ทุกภาพ + THI)' }, { key: 'bouts', label: 'รายช่วงพฤติกรรม' }]" :key="k.key" type="button"
        class="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#e5ece9] bg-white text-[#24433a] hover:border-[#24433a]/40 cursor-pointer disabled:opacity-50 flex items-center gap-1"
        :disabled="exporting === k.key" @click="exportCsv(k.key)">
        <v-icon icon="mdi-file-delimited-outline" size="14" />{{ exporting === k.key ? 'กำลังสร้างไฟล์...' : k.label }}
      </button>
      <span v-if="exportError" class="text-xs font-bold text-rose-600">{{ exportError }}</span>
    </div>

    <div v-if="isLoading" class="h-[260px] flex items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl animate-pulse">
      <v-icon icon="mdi-loading" size="24" class="animate-spin mr-2" />
      กำลังโหลดข้อมูล...
    </div>

    <div v-else-if="error" class="py-8 text-center text-sm font-bold text-rose-600 bg-rose-50 rounded-2xl">{{ error }}</div>

    <div v-else-if="!bouts.length" class="py-10 flex flex-col items-center justify-center text-center text-[#718078] bg-[#f8faf9] rounded-2xl">
      <v-icon icon="mdi-chart-timeline" size="44" class="text-[#a6b5aa] mb-2" />
      <p class="text-sm font-bold">{{ data?.note_th || 'ยังไม่มีข้อมูล' }}</p>
      <p v-if="!data?.cow" class="text-xs mt-1">เมื่อเริ่มติดตามวัวผ่านกล้อง กราฟจะแสดงที่นี่</p>
    </div>

    <template v-else>
      <!-- ท่าปัจจุบัน: อยู่ท่านี้มานานเท่าไร -->
      <div v-if="data.current" class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3 border"
        :style="{ background: ROW[data.current.behavior].color + '12', borderColor: ROW[data.current.behavior].color + '40' }">
        <span class="w-2.5 h-2.5 rounded-full animate-pulse" :style="{ background: ROW[data.current.behavior].color }"></span>
        <span class="text-sm font-black text-[#24433a]">
          ตอนนี้{{ ROW[data.current.behavior].label }}มาแล้ว {{ fmtDur(data.current.minutes) }}
        </span>
        <span class="text-xs text-[#718078] font-medium">
          ตั้งแต่ {{ sinceText(data.current.since) }} · ภาพล่าสุด {{ sinceText(data.current.last_image_at) }}
        </span>
      </div>

      <!-- กราฟเส้น (ค่าเริ่มต้น), แถบเวลาแบบเดิม หรือแท่งนาทีรายชั่วโมง -->
      <div class="flex justify-end">
        <div class="flex items-center gap-1.5 bg-[#f0f4f2] p-1 rounded-xl">
          <button v-for="v in VIEWS" :key="v.key" type="button"
            class="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
            :class="view === v.key ? 'bg-[#24433a] text-white' : 'text-[#4e6057] hover:text-[#24433a]'"
            @click="view = v.key">{{ v.label }}</button>
        </div>
      </div>
      <ClientOnly>
        <template v-if="view === 'hourly'">
          <ApexChart type="line" height="280" :options="hourlyLyingOptions" :series="hourlyLyingSeries" />
          <p class="text-[11px] text-[#718078]">เส้นน้ำเงิน = % ของเวลาที่เห็นวัวแล้วนอน ในแต่ละชั่วโมง (แกนซ้าย) · เส้นส้ม = THI เฉลี่ยรายชั่วโมง (แกนขวา) · เส้นขาด = ชั่วโมงที่เห็นวัวไม่ถึง {{ MIN_SEEN_MIN }} นาที</p>
        </template>
        <template v-else-if="view === 'line'">
          <!-- ตัวเลขสรุปใหญ่ + เส้นบางหนึ่งเส้นต่อท่า (นาทีต่อชั่วโมง) + คำอธิบายสีด้านล่าง -->
          <div class="flex flex-wrap items-end gap-x-6 gap-y-1 px-1">
            <div v-for="h in lineHeadline" :key="h.key">
              <div class="text-[11px] font-bold text-[#718078]">{{ h.label }}</div>
              <div class="text-xl md:text-2xl font-black tabular-nums" :style="{ color: h.color }">{{ h.value }}</div>
            </div>
          </div>
          <ApexChart type="line" height="260" :options="lineOptions" :series="lineSeries" />
          <p class="text-[11px] text-[#718078]">แต่ละเส้น = นาทีที่อยู่ในท่านั้นในแต่ละชั่วโมง (เต็ม 60) · เส้นหยุด = ยังไม่มีภาพชั่วโมงนั้น · การเดินดูได้ในตารางด้านล่าง</p>
        </template>
        <ApexChart v-else type="rangeBar" height="270" :options="timelineOptions" :series="timelineSeries" />
        <!-- THI วันเดียวกัน ใช้แกนเวลาเดียวกัน -->
        <ApexChart v-if="thiSeries[0].data.length" type="line" height="170" :options="thiOptions" :series="thiSeries" />
        <p v-else class="text-xs text-center text-[#718078] py-2">วันนี้ไม่มีข้อมูล THI จากเซ็นเซอร์</p>
        <template #fallback>
          <div class="h-[400px] flex items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl animate-pulse">กำลังโหลดกราฟ...</div>
        </template>
      </ClientOnly>

      <!-- การ์ดสรุปรายวัน -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <div v-for="c in summaryCards" :key="c.key" class="rounded-2xl p-4 border" :style="{ background: c.color + '12', borderColor: c.color + '33' }">
          <div class="flex items-center gap-1.5 text-xs font-bold" :style="{ color: c.color }">
            <span class="w-2.5 h-2.5 rounded-full" :style="{ background: c.color }"></span>{{ c.label }}
          </div>
          <div class="text-base md:text-lg font-black text-[#24433a] mt-1">{{ c.total }}</div>
          <div class="text-[11px] text-[#718078] font-medium">{{ c.detail }}</div>
        </div>
      </div>

      <!-- รายละเอียดแต่ละช่วง: เวลา นานเท่าไร และ THI ระหว่างช่วงนั้น -->
      <details open class="rounded-2xl border border-[#e5ece9] bg-white/60">
        <summary class="cursor-pointer select-none px-4 py-3 text-sm font-black text-[#24433a]">
          รายละเอียดแต่ละช่วง พร้อมค่า THI ({{ tableRows.length }} ช่วง)
        </summary>
        <div class="px-4 pb-4 space-y-3">
          <div class="flex flex-wrap gap-1.5">
            <button v-for="f in [{ key: 'all', label: 'ทั้งหมด' }, ...ROWS.filter(r => r.key !== 'not_visible')]" :key="f.key" type="button"
              class="px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-colors"
              :class="tableFilter === f.key ? 'bg-[#24433a] text-white border-[#24433a]' : 'bg-white text-[#4e6057] border-[#e5ece9] hover:border-[#24433a]/40'"
              @click="tableFilter = f.key">
              {{ f.label }}
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[560px] text-xs">
              <thead>
                <tr class="text-left text-[#718078] border-b border-[#e5ece9]">
                  <th class="py-2 pr-3 font-bold">ท่า</th>
                  <th class="py-2 pr-3 font-bold">ช่วงเวลา</th>
                  <th class="py-2 pr-3 font-bold">นาน</th>
                  <th class="py-2 pr-3 font-bold">THI เฉลี่ย</th>
                  <th class="py-2 pr-3 font-bold">THI ต่ำสุด–สูงสุด</th>
                  <th class="py-2 font-bold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in tableRows" :key="r.behavior + r.start" class="border-b border-[#f0f4f2] last:border-0">
                  <td class="py-2 pr-3 font-bold whitespace-nowrap" :style="{ color: ROW[r.behavior].color }">
                    <span class="inline-block w-2 h-2 rounded-full mr-1.5" :style="{ background: ROW[r.behavior].color }"></span>{{ ROW[r.behavior].label }}
                  </td>
                  <td class="py-2 pr-3 whitespace-nowrap text-[#24433a]">{{ fmtTime(bkk(r.start)) }} – {{ fmtTime(bkk(r.end)) }}</td>
                  <td class="py-2 pr-3 whitespace-nowrap text-[#24433a]">{{ fmtDur(r.duration_min) }}</td>
                  <td class="py-2 pr-3 whitespace-nowrap font-bold" :style="{ color: r.thi?.above ? ABOVE_COLOR[r.thi.above] : '#24433a' }">
                    {{ r.thi ? r.thi.avg : '-' }}
                    <span v-if="r.thi?.above" class="font-medium">({{ ABOVE_LABEL[r.thi.above] }})</span>
                  </td>
                  <td class="py-2 pr-3 whitespace-nowrap text-[#4e6057]">{{ r.thi ? `${r.thi.min}–${r.thi.max}` : 'ไม่มีข้อมูล' }}</td>
                  <td class="py-2 text-[#718078]">{{ rowNote(r) }}</td>
                </tr>
                <tr v-if="!tableRows.length"><td colspan="6" class="py-4 text-center text-[#718078]">ไม่มีช่วงของท่านี้ในวันที่เลือก</td></tr>
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-[#718078]">
            THI ของแต่ละช่วงคิดจากค่าเฉลี่ยทุก 5 นาทีของเซ็นเซอร์ในคอกที่อยู่ในช่วงนั้น · "ถึงเกณฑ์" เป็นการเทียบค่า THI กับเส้นเกณฑ์ของฟาร์ม
            (เกณฑ์ในงานวิจัยกำหนดจาก THI เฉลี่ยทั้งวัน จึงไม่ได้แปลว่าวัวเครียดในช่วงนั้น)
          </p>
        </div>
      </details>

      <!-- ภาพยืนยันรายชั่วโมง + กรอบวัวเป้าหมาย -->
      <CowDayImages :farm-id="farmId" :date="date" :cow-id="data.cow?.id || ''" :cow="data.cow" />

      <!-- หมายเหตุ -->
      <div class="text-[11px] text-[#718078] leading-relaxed bg-[#f8faf9] rounded-2xl px-4 py-3 space-y-1">
        <p>มีภาพของวัวตัวนี้ {{ fmtDur(data.summary.covered_min) }} จาก {{ fmtDur(data.summary.window_min) }}</p>
        <p>{{ data.note_th }}</p>
        <p v-if="data.movement_note_th">{{ data.movement_note_th }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'
import CowTargetPicker from '~/components/Admin/cctv/CowTargetPicker.vue'
import CowDayImages from '~/components/Admin/cctv/CowDayImages.vue'
import { hourlyMinutes } from '~/utils/behaviorHourly'

const props = defineProps({
  farmId: { type: String, required: true }
})

// อ่าน API base ตอน setup เท่านั้น ห้ามเรียกใน callback/setInterval
const Admin = `${getNodeApiBase()}/Admin`

// เวลาไทยเสมอ ไม่ขึ้นกับเขตเวลาของเครื่องที่เปิด: เลื่อนเวลา +7 ชม. แล้วอ่านแบบ UTC
const BKK_MS = 7 * 3600e3
const bkk = (iso) => new Date(iso).getTime() + BKK_MS
const today = new Date(Date.now() + BKK_MS).toISOString().slice(0, 10)

const ROWS = [
  { key: 'lying', label: 'นอน', color: '#3b82f6' },
  { key: 'standing', label: 'ยืน', color: '#f97316' },
  { key: 'feeding', label: 'กิน', color: '#10b981' },
  { key: 'moving', label: 'เคลื่อนที่', color: '#8b5cf6' },
  { key: 'not_visible', label: 'ไม่เห็นในภาพ', color: '#a6b5aa' }
]
const ROW = Object.fromEntries(ROWS.map(r => [r.key, r]))
const AXIS_LABEL_WIDTH = 92   // กว้างเท่ากันทั้ง 2 กราฟ แกนเวลาจะได้ตรงกัน
// จอมือถือ: ขีดเวลาทุก 6 ชม. และป้ายแกนแคบลง (ทั้ง 2 กราฟเท่ากัน)
const MOBILE = [{ breakpoint: 640, options: { xaxis: { tickAmount: 4 }, yaxis: { labels: { minWidth: 88, maxWidth: 88 } } } }]

const date = ref(today)
const data = ref(null)
const isLoading = ref(false)
const error = ref('')

const bouts = computed(() => data.value?.bouts || [])
const windowMs = computed(() => data.value ? [bkk(data.value.window.from), bkk(data.value.window.to)] : [0, 0])

const fmtDur = (min) => {
  const m = Math.round(min || 0)
  if (m < 60) return `${m} นาที`
  return m % 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} นาที` : `${m / 60} ชม.`
}
const fmtTime = (shiftedMs) => (shiftedMs >= windowMs.value[1] ? '24:00' : new Date(shiftedMs).toISOString().slice(11, 16))

const shiftDay = (n) => {
  const d = new Date(`${date.value}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  const next = d.toISOString().slice(0, 10)
  if (next <= today) date.value = next
}

const fetchData = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cow-behavior`, {
      params: { date: date.value },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    data.value = res.data?.cow_behavior || null
  } catch (err) {
    data.value = null
    error.value = err.response?.data?.message || 'ดึงข้อมูลพฤติกรรมวัวไม่สำเร็จ'
  } finally {
    isLoading.value = false
  }
}

// ส่งออก CSV: ดึงเป็นไฟล์ผ่าน axios (ต้องแนบ token) แล้วให้เบราว์เซอร์บันทึก
const exporting = ref('')
const exportError = ref('')
const exportCsv = async (kind) => {
  exporting.value = kind
  exportError.value = ''
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cow-behavior/export`, {
      params: { date: date.value, kind },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob'
    })
    const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || `cow_${date.value}_${kind}.csv`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(res.data)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch (err) {
    exportError.value = 'ส่งออกไม่สำเร็จ'
  } finally {
    exporting.value = ''
  }
}

watch(date, fetchData)
watch(() => props.farmId, fetchData)
onMounted(fetchData)

// เลือกวัวใหม่แล้ว: ไปที่วันของภาพที่เลือก (คำนวณย้อนหลังเริ่มจากวันนั้น)
const onTargetChanged = (day) => {
  if (day && day !== date.value && day <= today) date.value = day
  else fetchData()
}

// ทุกแถวแสดงเสมอ (แม้วันนั้นไม่มีท่านั้น) ด้วยจุดความยาว 0 ที่มองไม่เห็น
const timelineSeries = computed(() => ROWS.map(r => {
  const items = r.key === 'moving' ? (data.value?.movement || []) : bouts.value.filter(b => b.behavior === r.key)
  return {
    name: r.label,
    data: [
      { x: r.label, y: [windowMs.value[0], windowMs.value[0]], bout: null },
      ...items.map(b => ({ x: r.label, y: [bkk(b.start), bkk(b.end)], bout: b }))
    ]
  }
}))

const ABOVE_LABEL = { mild: 'เฝ้าระวัง', moderate: 'เครียดจากความร้อน', severe: 'วิกฤต' }
const ABOVE_COLOR = { mild: '#d97706', moderate: '#ea580c', severe: '#e11d48' }
const aboveText = (thi) => (thi?.above ? `ถึงเกณฑ์${ABOVE_LABEL[thi.above]} (${data.value.thresholds[thi.above]})` : '')
const thiText = (thi) => {
  if (!thi) return 'ไม่มีข้อมูล THI ช่วงนี้'
  const range = thi.min === thi.max ? '' : ` (${thi.min}–${thi.max})`
  return `THI เฉลี่ย ${thi.avg}${range}${thi.above ? ` · ${aboveText(thi)}` : ''}`
}

// ตารางรายละเอียด: ทุกช่วงที่จับเวลาได้ เรียงตามเวลา (ไม่รวม "ไม่เห็นในภาพ")
const tableFilter = ref('all')
const tableRows = computed(() => {
  const rows = [
    ...bouts.value.filter(b => b.behavior !== 'not_visible'),
    ...(data.value?.movement || []).map(m => ({ ...m, behavior: 'moving' }))
  ].filter(r => tableFilter.value === 'all' || r.behavior === tableFilter.value)
  return rows.sort((a, b) => new Date(a.start) - new Date(b.start))
})
const rowNote = (r) => [
  r.moving_min != null && r.moving_min > 0 && `เดิน ${fmtDur(r.moving_min)}`,
  r.distance_body != null && `≈ ${r.distance_body} ช่วงตัว`,
  r.from_previous_day && 'ต่อจากเมื่อวาน',
  r.to_next_day && 'ต่อไปวันถัดไป'
].filter(Boolean).join(' · ')

// เปลี่ยนค่าเริ่มต้นกลับเป็น 'timeline' ได้ ถ้าไม่ใช้กราฟเส้น
const VIEWS = [{ key: 'line', label: 'กราฟเส้น' }, { key: 'timeline', label: 'แถบเวลา' }, { key: 'hourly', label: '% นอนรายชั่วโมง' }]
const view = ref('line')
// % นอนรายชั่วโมง เทียบ THI: หารด้วยเวลาที่เห็นวัว (ไม่นับช่วงไม่เห็นในภาพ) ชั่วโมงที่เห็นน้อยเกินไป = ไม่แสดง
const MIN_SEEN_MIN = 10
const hourlyLyingSeries = computed(() => {
  if (!data.value) return []
  const dayStart = new Date(data.value.window.from).getTime()
  const mins = hourlyMinutes(
    bouts.value.map(b => ({ key: b.behavior, startMs: new Date(b.start).getTime(), endMs: new Date(b.end).getTime() })),
    dayStart, ['lying', 'standing', 'feeding'])
  const thiSum = Array(24).fill(0), thiN = Array(24).fill(0)
  for (const p of data.value.thi || []) {
    const h = Math.floor((new Date(p.t).getTime() - dayStart) / 3600e3)
    if (h >= 0 && h < 24 && p.thi != null) { thiSum[h] += Number(p.thi); thiN[h]++ }
  }
  const x = (h) => bkk(data.value.window.from) + h * 3600e3 + 1800e3   // กลางชั่วโมง
  const lying = [], thi = []
  for (let h = 0; h < 24; h++) {
    const seen = mins.lying[h] + mins.standing[h] + mins.feeding[h]
    lying.push({ x: x(h), y: seen >= MIN_SEEN_MIN ? Math.round((mins.lying[h] / seen) * 100) : null, seen: Math.round(seen), lyingMin: Math.round(mins.lying[h]) })
    thi.push({ x: x(h), y: thiN[h] ? Math.round((thiSum[h] / thiN[h]) * 10) / 10 : null })
  }
  return [{ name: '% นอน', type: 'line', data: lying }, { name: 'THI', type: 'line', data: thi }]
})
const hourlyLyingOptions = computed(() => {
  const t = data.value?.thresholds || {}
  const thiVals = (hourlyLyingSeries.value[1]?.data || []).map(p => p.y).filter(v => v != null)
  // แกน THI เป็นจำนวนเต็ม ขีดละ 1–2 หน่วย ป้ายจะได้ไม่ซ้ำหรือข้าม
  const thiMin = Math.floor(Math.min(...thiVals, t.mild ?? 72) - 1)
  let thiMax = Math.ceil(Math.max(...thiVals, t.moderate ?? 78) + 1)
  if ((thiMax - thiMin) % 2) thiMax++
  const thiTicks = thiMax - thiMin > 8 ? (thiMax - thiMin) / 2 : thiMax - thiMin
  return {
    chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
    colors: ['#3b82f6', '#d87939'],
    stroke: { curve: 'straight', width: [3, 2], dashArray: [0, 4] },
    markers: { size: [4, 0], strokeWidth: 0, hover: { size: 6 } },
    dataLabels: { enabled: false },
    legend: { show: true, position: 'top', horizontalAlign: 'left', fontSize: '12px' },
    xaxis: xaxis.value,
    yaxis: [
      { min: 0, max: 100, tickAmount: 4, labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, formatter: (v) => `${Math.round(v)}%`, style: { fontSize: '11px', colors: '#3b82f6' } }, title: { text: '% เวลานอน', style: { fontSize: '11px', color: '#3b82f6', fontWeight: 700 } } },
      { opposite: true, min: thiMin, max: thiMax, tickAmount: thiTicks, labels: { formatter: (v) => (v != null ? Number(v).toFixed(0) : ''), style: { fontSize: '11px', colors: '#d87939' } }, title: { text: 'THI', style: { fontSize: '11px', color: '#d87939', fontWeight: 700 } } }
    ],
    grid: { borderColor: '#f0f4f2', strokeDashArray: 4, padding: { right: 8 } },
    responsive: MOBILE,
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }) => {
        const [l, th] = hourlyLyingSeries.value.map(s => s.data[dataPointIndex])
        if (!l) return ''
        const hh = fmtTime(l.x - 1800e3)
        const lyingText = l.y == null ? `เห็นวัวแค่ ${l.seen} นาที (น้อยเกินไป)` : `นอน <b style="color:#3b82f6">${l.y}%</b> (${l.lyingMin} จาก ${l.seen} นาทีที่เห็นวัว)`
        return `<div style="padding:6px 10px;font-size:12px;line-height:1.6"><b>${hh}–${fmtTime(l.x + 1800e3)} น.</b><br>${lyingText}<br>THI เฉลี่ย <b style="color:#d87939">${th?.y ?? '-'}</b></div>`
      }
    }
  }
})

const sinceText = (iso) => {
  const t = bkk(iso)
  return `${new Date(t).toISOString().slice(11, 16)}${t < windowMs.value[0] ? ' เมื่อวาน' : ''}`
}

const xaxis = computed(() => ({
  type: 'datetime',
  min: windowMs.value[0],
  max: windowMs.value[1],
  tickAmount: 8,
  // ใช้ค่าแรกเสมอ: กราฟแท่งแนวนอนส่งลำดับขีด (0, 1, 2...) มาเป็นค่าที่ 2 ไม่ใช่เวลา
  labels: { datetimeUTC: true, rotate: 0, hideOverlappingLabels: true, formatter: (val) => fmtTime(Number(val)), style: { fontSize: '11px', colors: '#718078' } },
  axisBorder: { show: false },
  axisTicks: { show: false },
  tooltip: { enabled: false }
}))

const timelineOptions = computed(() => ({
  chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
  plotOptions: { bar: { horizontal: true, rangeBarGroupRows: true, barHeight: '70%', borderRadius: 3 } },
  colors: ROWS.map(r => r.color),
  dataLabels: { enabled: false },
  legend: { show: false },
  xaxis: xaxis.value,
  yaxis: { labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, style: { fontSize: '12px', fontWeight: 700, colors: '#24433a' } } },
  grid: { borderColor: '#f0f4f2', strokeDashArray: 4, xaxis: { lines: { show: true } }, padding: { right: 18 } },
  responsive: MOBILE,
  tooltip: {
    custom: ({ seriesIndex, dataPointIndex, w }) => {
      const p = w.config.series[seriesIndex].data[dataPointIndex]
      return p?.bout ? boutTooltip(ROWS[seriesIndex], p.bout, p.y[0], p.y[1]) : ''
    }
  }
}))

const boutTooltip = (row, b, startMs, endMs) => {
  const extra = [
    thiText(b.thi),
    // ปัดนาทีก่อนลบ เดิน + ยืนนิ่ง จะได้เท่ากับเวลารวมที่แสดงพอดี
    b.moving_min != null && `เดิน ${fmtDur(b.moving_min)} · ยืนนิ่ง ${fmtDur(Math.round(b.duration_min) - Math.round(b.moving_min))}`,
    b.distance_body != null && `ระยะประมาณ ${b.distance_body} ช่วงตัว`,
    b.from_previous_day && 'ต่อจากเมื่อวาน',
    b.to_next_day && 'ต่อไปวันถัดไป'
  ].filter(Boolean).join('<br>')
  return `<div style="padding:8px 12px;font-size:12px;line-height:1.6">
    <b style="color:${row.color}">${row.label}</b><br>
    ${fmtTime(startMs)} – ${fmtTime(endMs)} · ${fmtDur(b.duration_min)}
    ${extra ? `<br><span style="color:#718078">${extra}</span>` : ''}
  </div>`
}

// กราฟเส้น: นาทีของแต่ละท่าในแต่ละชั่วโมง เส้นบาง หนึ่งเส้นต่อท่า (ไม่มี "เคลื่อนที่" เพราะการเดินเกิดระหว่างยืน)
const LINE_ROWS = ROWS.filter(r => ['lying', 'standing', 'feeding'].includes(r.key))
const lineSeries = computed(() => {
  if (!data.value) return []
  const dayStart = new Date(data.value.window.from).getTime()
  const keys = [...LINE_ROWS.map(r => r.key), 'not_visible']
  const mins = hourlyMinutes(
    bouts.value.map(b => ({ key: b.behavior, startMs: new Date(b.start).getTime(), endMs: new Date(b.end).getTime() })),
    dayStart, keys)
  // ชั่วโมงที่ไม่มีภาพเลย = null เส้นจะหยุดตรงนั้น (ไม่ลากลงศูนย์ให้เข้าใจผิด)
  const hasData = (h) => keys.some(k => mins[k][h] > 0)
  const x = (h) => bkk(data.value.window.from) + h * 3600e3 + 1800e3
  return LINE_ROWS.map(r => ({
    name: r.label,
    data: Array.from({ length: 24 }, (_, h) => ({ x: x(h), y: hasData(h) ? Math.round(mins[r.key][h]) : null }))
  }))
})
const lineHeadline = computed(() => {
  const m = data.value?.summary?.minutes || {}
  return LINE_ROWS.map(r => ({ key: r.key, label: `${r.label}รวม`, color: r.color, value: fmtDur(m[r.key]) }))
})
const lineOptions = computed(() => ({
  chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
  colors: LINE_ROWS.map(r => r.color),
  stroke: { curve: 'straight', width: 2 },
  markers: { size: 0, hover: { size: 4 } },
  dataLabels: { enabled: false },
  legend: { show: true, position: 'bottom', horizontalAlign: 'left', fontSize: '12px', markers: { shape: 'circle', size: 5 }, itemMargin: { horizontal: 10 } },
  xaxis: xaxis.value,
  yaxis: { min: 0, max: 60, tickAmount: 2, labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, formatter: (v) => `${Math.round(v)} นาที`, style: { fontSize: '11px', colors: '#a6b5aa' } } },
  grid: { borderColor: '#f0f4f2', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } }, padding: { right: 18 } },
  responsive: MOBILE,
  tooltip: {
    shared: true,
    intersect: false,
    x: { formatter: (ts) => `${fmtTime(ts - 1800e3)}–${fmtTime(ts + 1800e3)} น.` },
    y: { formatter: (v) => (v == null ? 'ไม่มีภาพ' : `${v} นาที`) }
  }
}))

const thiSeries = computed(() => [{
  name: 'THI',
  data: (data.value?.thi || []).map(p => [bkk(p.t), p.thi])
}])

// ป้าย 2 เส้นเกณฑ์อยู่คนละฝั่ง จะได้ไม่ทับกัน (เกณฑ์ห่างกันแค่ 2 หน่วย)
const thresholdLine = (y, color, text, side) => ({
  y, borderColor: color, strokeDashArray: 4,
  label: { borderColor: color, position: side, textAnchor: side === 'left' ? 'start' : 'end', style: { color: '#fff', background: color, fontSize: '10px', fontWeight: 700 }, text }
})

const thiOptions = computed(() => {
  const t = data.value?.thresholds || {}
  // ให้เห็นเส้นเกณฑ์เสมอ แม้วันนั้น THI ต่ำกว่าเกณฑ์มาก
  const values = thiSeries.value[0].data.map(p => p[1])
  const yMin = Math.floor(Math.min(...values, t.mild) - 1)
  const yMax = Math.ceil(Math.max(...values, t.moderate) + 1)
  return {
    chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
    colors: ['#d87939'],
    stroke: { curve: 'smooth', width: 2.5 },
    dataLabels: { enabled: false },
    xaxis: xaxis.value,
    yaxis: {
      min: yMin,
      max: yMax,
      tickAmount: 4,
      labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, style: { fontSize: '11px', colors: '#718078' }, formatter: (v) => (v != null ? Number(v).toFixed(0) : '') },
      title: { text: 'THI', style: { fontSize: '11px', color: '#718078', fontWeight: 700 } }
    },
    annotations: {
      yaxis: [
        thresholdLine(t.mild, '#f59e0b', `${t.mild} เฝ้าระวัง`, 'right'),
        thresholdLine(t.moderate, '#ea580c', `${t.moderate} เครียดจากความร้อน`, 'left')
      ]
    },
    tooltip: {
      x: { formatter: (ts) => fmtTime(ts) },
      y: { formatter: (v) => (v != null ? Number(v).toFixed(1) : '-') }
    },
    grid: { borderColor: '#f0f4f2', strokeDashArray: 4, padding: { right: 18 } },
    responsive: MOBILE
  }
})

const summaryCards = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    { ...ROW.lying, total: fmtDur(s.minutes.lying), detail: `${s.bouts.lying} รอบ · นานสุด ${fmtDur(s.longest_lying_min)}` },
    { ...ROW.standing, total: fmtDur(s.minutes.standing), detail: `${s.bouts.standing} รอบ (รวมเวลาดื่มน้ำ)` },
    { ...ROW.feeding, total: fmtDur(s.minutes.feeding), detail: `${s.bouts.feeding} รอบ` },
    { ...ROW.moving, total: fmtDur(s.moving_min), detail: `${s.moves} ครั้ง · ระยะประมาณ ${s.distance_body} ช่วงตัว` },
    { ...ROW.not_visible, total: fmtDur(s.minutes.not_visible), detail: 'หาวัวตัวนี้ในภาพไม่เจอ' }
  ]
})
</script>
