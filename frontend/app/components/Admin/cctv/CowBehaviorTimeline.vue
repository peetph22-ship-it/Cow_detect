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
          <!-- รวมทีละกี่ชั่วโมง: วัวตัวเดียวนอนทีละ 1–2 ชม. รายชั่วโมงจึงแกว่ง 0/100% รวม 3 ชม. เห็นแนวโน้มชัดกว่า -->
          <div class="flex items-center gap-2 px-1">
            <span class="text-xs font-bold text-[#718078]">รวมทีละ</span>
            <div class="flex items-center gap-1 bg-[#f0f4f2] p-1 rounded-lg">
              <button v-for="n in [1, 3]" :key="n" type="button" class="px-2.5 py-0.5 rounded-md text-xs font-bold cursor-pointer"
                :class="binHours === n ? 'bg-white text-[#24433a] shadow-xs' : 'text-[#4e6057] hover:text-[#24433a]'"
                @click="binHours = n">{{ n }} ชม.</button>
            </div>
          </div>
          <ApexChart type="line" height="280" :options="hourlyLyingOptions" :series="hourlyLyingSeries" />
          <p class="text-[11px] text-[#718078]">% ของเวลาที่เห็นวัวแล้วนอน ในแต่ละช่วง {{ binHours }} ชม. · เทียบกับกราฟ THI ด้านล่างซึ่งใช้แกนเวลาเดียวกัน · เส้นขาด = ช่วงที่เห็นวัวไม่ถึง {{ MIN_SEEN_MIN * binHours }} นาที</p>
        </template>
        <template v-else-if="view === 'line'">
          <!-- คำอธิบายเส้น + ยอดรวมทั้งวัน (ตัวหนังสือสีเข้ม สีของท่าอยู่ที่ขีดหน้าชื่อ) -->
          <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-1">
            <div v-for="r in lineSeries" :key="r.key" class="flex items-baseline gap-2">
              <span class="inline-block w-4 h-[3px] rounded-full self-center" :style="{ background: r.color }"></span>
              <span class="text-xs font-bold text-[#718078]">{{ r.label }}</span>
              <span class="text-lg font-black text-[#24433a]">{{ r.total }}</span>
            </div>
          </div>
          <ApexChart type="line" height="290" :options="lineOptions" :series="lineChartSeries" />
          <p class="text-[11px] text-[#718078]">แต่ละเส้น = ตั้งแต่ 00:00 อยู่ในท่านั้นมาแล้วรวมกี่ชั่วโมง · ช่วงที่เส้นชัน = กำลังอยู่ท่านั้น · ช่วงที่เส้นแบน = ทำอย่างอื่น · ชี้ที่กราฟเพื่อดูยอดของทั้ง 3 ท่า ณ เวลานั้น</p>
        </template>
        <ApexChart v-else type="rangeBar" height="270" :options="timelineOptions" :series="timelineSeries" />
        <!-- การเดิน: กราฟแยก (การเดินเกิดระหว่างยืน จึงไม่ใส่เป็นเส้นที่ 4) ใช้แกนเวลาเดียวกับ THI -->
        <div v-if="walkSeries.length" class="pt-2 border-t border-[#f0f4f2]">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1">
            <span class="inline-block w-3 h-3 rounded-[3px] self-center" :style="{ background: ROW.moving.color }"></span>
            <span class="text-sm font-black text-[#24433a]">การเดิน (โดยประมาณ)</span>
            <span class="text-xs text-[#4e6057]">รวม <b class="text-[#24433a]">{{ fmtDur(data.summary?.moving_min) }}</b> · {{ data.summary?.moves ?? 0 }} ครั้ง · ระยะประมาณ {{ data.summary?.distance_body ?? 0 }} ช่วงตัว</span>
          </div>
          <ApexChart type="bar" height="170" :options="walkOptions" :series="walkSeries" />
          <p class="text-[11px] text-[#718078]">แท่ง = นาทีที่เดินในแต่ละชั่วโมง · นับเฉพาะตอนที่กรอบของวัวขยับระหว่าง 2 ภาพติดกันเกินเกณฑ์ จึงมักต่ำกว่าจริง (เดินไปกลับระหว่างภาพมองไม่เห็น) · ยังไม่ได้เทียบกับวิดีโอ</p>
        </div>
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
const PLOT_PAD_RIGHT = 40     // ขอบขวาเท่ากันทุกกราฟ (เว้นที่ให้ชื่อท่าที่ปลายเส้น) แกนเวลาจะได้ตรงกัน
const LABEL_OFFSET_Y = 16     // ให้ชื่อท่าอยู่ระดับเดียวกับจุดปลายเส้น
// เส้นตั้งตามเมาส์ บางและสีจาง
const CROSSHAIR = { show: true, width: 1, position: 'front', stroke: { color: '#a6b5aa', width: 1, dashArray: 0 } }
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
const binHours = ref(3)   // ค่าเริ่มต้น 3 ชม. (รายชั่วโมงแกว่งมากสำหรับวัวตัวเดียว)
const hourlyLyingSeries = computed(() => {
  if (!data.value) return []
  const dayStart = new Date(data.value.window.from).getTime()
  const mins = hourlyMinutes(
    bouts.value.map(b => ({ key: b.behavior, startMs: new Date(b.start).getTime(), endMs: new Date(b.end).getTime() })),
    dayStart, ['lying', 'standing', 'feeding'])
  const n = binHours.value
  const lying = []
  for (let h = 0; h < 24; h += n) {
    const hrs = Array.from({ length: n }, (_, i) => h + i)
    const sum = (k) => hrs.reduce((t, i) => t + mins[k][i], 0)
    const seen = sum('lying') + sum('standing') + sum('feeding')
    // จุดอยู่กลางช่วง · half = ครึ่งความกว้างช่วง ใช้บอกเวลาในป้าย
    const half = (n * 3600e3) / 2
    lying.push({ x: bkk(data.value.window.from) + h * 3600e3 + half, half, y: seen >= MIN_SEEN_MIN * n ? Math.round((sum('lying') / seen) * 100) : null, seen: Math.round(seen), lyingMin: Math.round(sum('lying')) })
  }
  return [{ name: '% นอน', data: lying }]
})
// แกนเดียวเท่านั้น: THI อยู่ในกราฟของตัวเองด้านล่าง (สองสเกลในกราฟเดียวทำให้ดูเหมือนสัมพันธ์กันทั้งที่ไม่ใช่)
const hourlyLyingOptions = computed(() => ({
  chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
  colors: [ROW.lying.color],
  stroke: { curve: 'straight', width: 2, lineCap: 'round' },
  markers: { size: 4, strokeColors: '#fff', strokeWidth: 2, hover: { size: 5 } },
  dataLabels: { enabled: false },
  legend: { show: false },
  xaxis: { ...xaxis.value, crosshairs: CROSSHAIR },
  yaxis: { min: 0, max: 100, tickAmount: 4, labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, formatter: (v) => `${Math.round(v)}%`, style: { fontSize: '11px', colors: '#718078' } } },
  grid: { borderColor: '#eef2f0', xaxis: { lines: { show: false } }, padding: { right: PLOT_PAD_RIGHT } },
  responsive: MOBILE,
  tooltip: {
    intersect: false,
    custom: ({ dataPointIndex }) => {
      const l = hourlyLyingSeries.value[0]?.data[dataPointIndex]
      if (!l) return ''
      const value = l.y == null ? `<span style="color:#718078">เห็นวัวแค่ ${l.seen} นาที (น้อยเกินไป)</span>` : `<b style="color:#24433a;font-size:14px">${l.y}%</b> <span style="color:#718078">นอน (${l.lyingMin} จาก ${l.seen} นาทีที่เห็นวัว)</span>`
      return `<div style="padding:8px 12px;font-size:12px;line-height:1.6"><div style="color:#718078">${fmtTime(l.x - l.half)}–${fmtTime(l.x + l.half)} น.</div>${value}</div>`
    }
  }
}))

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
  grid: { borderColor: '#f0f4f2', strokeDashArray: 4, xaxis: { lines: { show: true } }, padding: { right: PLOT_PAD_RIGHT } },
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

// กราฟเส้นสะสม: ตั้งแต่ 00:00 วัวอยู่ในแต่ละท่ามาแล้วรวมกี่ชั่วโมง เส้นขึ้นอย่างเดียว ไม่ตัดไปมา
// ปลายเส้น = ตัวเลขรวมด้านบน (ไม่มี "เคลื่อนที่" เพราะการเดินเกิดระหว่างยืน)
const LINE_ROWS = ROWS.filter(r => ['lying', 'standing', 'feeding'].includes(r.key))
const GRID_MS = 10 * 60e3   // จุดเสริมทุก 10 นาที ให้ชี้เมาส์ได้ทุกช่วง (มุมหักยังอยู่ตรงเวลาเปลี่ยนท่าจริง)
const lineSeries = computed(() => {
  if (!data.value || !bouts.value.length) return []
  const from = new Date(data.value.window.from).getTime()
  const parsed = bouts.value.map(b => ({ key: b.behavior, s: new Date(b.start).getTime(), e: new Date(b.end).getTime() }))
  const lastEnd = Math.max(...parsed.map(b => b.e))
  const shift = bkk(data.value.window.from) - from
  // จุดของกราฟ = ทุกจังหวะที่เปลี่ยนท่า (ต้นและปลายของทุกช่วง) + จุดเสริมทุก 10 นาที
  const grid = []
  for (let t = from; t < lastEnd; t += GRID_MS) grid.push(t)
  const times = [...new Set([...grid, lastEnd, ...parsed.flatMap(b => [b.s, b.e])])].filter(t => t >= from && t <= lastEnd).sort((a, b) => a - b)
  const m = data.value.summary?.minutes || {}
  return LINE_ROWS.map(r => {
    const mine = parsed.filter(b => b.key === r.key)
    const cum = (t) => mine.reduce((n, b) => n + Math.max(0, Math.min(b.e, t) - Math.max(b.s, from)), 0) / 3600e3
    return { key: r.key, label: r.label, color: r.color, total: fmtDur(m[r.key]), data: times.map(t => ({ x: t + shift, y: Math.round(cum(t) * 1000) / 1000 })) }
  })
})
const lineChartSeries = computed(() => lineSeries.value.map(r => ({ name: r.label, data: r.data })))
// แกนตั้งเป็นชั่วโมงเต็ม ขีดละ 2 ชม. (เกิน 8 ชม. ขีดละ 4 ชม.)
const lineAxis = computed(() => {
  const top = Math.max(0, ...lineSeries.value.map(r => r.data[r.data.length - 1]?.y || 0))
  const step = top <= 8 ? 2 : 4
  const max = Math.max(step, Math.ceil((top * 1.05) / step) * step)
  return { max, ticks: max / step }
})
// ชื่อท่าที่ปลายเส้น: เส้นที่ปลายอยู่ใกล้เส้นอื่นจนชื่อจะทับหรือชี้ผิดเส้น ไม่ใส่ชื่อทั้งคู่
// (ไม่ขยับชื่อหนีเส้น) ให้ดูจากคำอธิบายด้านบนและป้ายตอนชี้แทน
const lineEndLabels = computed(() => {
  const gap = lineAxis.value.max * 0.08
  const ends = lineSeries.value.map(r => r.data[r.data.length - 1])
  return lineSeries.value.map((r, i) => ({
    ...r,
    end: ends[i],
    show: ends.every((e, j) => j === i || Math.abs(e.y - ends[i].y) >= gap)
  }))
})
const lineOptions = computed(() => ({
  chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
  colors: LINE_ROWS.map(r => r.color),
  stroke: { curve: 'straight', width: 2, lineCap: 'round' },
  markers: { size: 0, strokeColors: '#fff', strokeWidth: 2, hover: { size: 5 } },
  dataLabels: { enabled: false },
  legend: { show: false },
  xaxis: { ...xaxis.value, crosshairs: CROSSHAIR },
  yaxis: { min: 0, max: lineAxis.value.max, tickAmount: lineAxis.value.ticks, labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, formatter: (v) => (v ? `${Math.round(v)} ชม.` : '0'), style: { fontSize: '11px', colors: '#718078' } } },
  grid: { borderColor: '#eef2f0', xaxis: { lines: { show: false } }, padding: { right: PLOT_PAD_RIGHT } },
  annotations: {
    // จุดปลายเส้น (มีวงขาวรอบ) + ชื่อท่าข้างจุด
    points: lineEndLabels.value.map(e => ({
      x: e.end.x,
      y: e.end.y,
      marker: { size: 4, fillColor: e.color, strokeColor: '#fff', strokeWidth: 2 },
      label: e.show
        ? { text: e.label, borderWidth: 0, textAnchor: 'start', offsetX: 8, offsetY: LABEL_OFFSET_Y, style: { color: '#24433a', background: 'transparent', fontSize: '12px', fontWeight: 700, padding: { left: 0, right: 0, top: 0, bottom: 0 } } }
        : { text: '' }
    }))
  },
  responsive: MOBILE,
  tooltip: {
    shared: true,
    intersect: false,
    // ค่ามาก่อน ชื่อท่าตามหลัง ขีดสีหน้าแถวบอกว่าเป็นเส้นไหน
    custom: ({ dataPointIndex }) => {
      const t = lineSeries.value[0]?.data[dataPointIndex]?.x
      if (t == null) return ''
      const rows = lineSeries.value.map(r => `<div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:14px;height:3px;border-radius:2px;background:${r.color}"></span>
        <b style="color:#24433a;min-width:92px">${fmtDur(r.data[dataPointIndex].y * 60)}</b><span style="color:#718078">${r.label}</span></div>`).join('')
      return `<div style="padding:8px 12px;font-size:12px;line-height:1.7"><div style="color:#718078;margin-bottom:2px">รวมตั้งแต่ 00:00 ถึง ${fmtTime(t)} น.</div>${rows}</div>`
    }
  }
}))

// นาทีที่เดินในแต่ละชั่วโมง (ช่วงเดินที่คร่อมชั่วโมงแบ่งตามเวลาจริง) ชั่วโมงที่แทบไม่เห็นวัว = ไม่มีแท่ง
const walkSeries = computed(() => {
  const moves = data.value?.movement || []
  if (!data.value || !moves.length) return []
  const dayStart = new Date(data.value.window.from).getTime()
  const toBouts = (list, key) => list.map(b => ({ key: key || b.behavior, startMs: new Date(b.start).getTime(), endMs: new Date(b.end).getTime() }))
  const walk = hourlyMinutes(toBouts(moves, 'moving'), dayStart, ['moving']).moving
  const seen = hourlyMinutes(toBouts(bouts.value), dayStart, ['lying', 'standing', 'feeding'])
  const count = Array(24).fill(0), dist = Array(24).fill(0)
  for (const m of moves) {
    const h = Math.floor((new Date(m.start).getTime() - dayStart) / 3600e3)
    if (h >= 0 && h < 24) { count[h]++; dist[h] += Number(m.distance_body) || 0 }
  }
  const x = (h) => bkk(data.value.window.from) + h * 3600e3 + 1800e3
  return [{
    name: 'เดิน',
    data: Array.from({ length: 24 }, (_, h) => {
      const seenMin = seen.lying[h] + seen.standing[h] + seen.feeding[h]
      return { x: x(h), y: seenMin >= MIN_SEEN_MIN ? Math.round(walk[h] * 10) / 10 : null, count: count[h], dist: Math.round(dist[h] * 10) / 10, seen: Math.round(seenMin) }
    })
  }]
})
const walkOptions = computed(() => {
  const top = Math.max(0, ...(walkSeries.value[0]?.data || []).map(p => p.y || 0))
  const step = top <= 10 ? 5 : top <= 30 ? 10 : 20
  const max = Math.max(step, Math.ceil(top / step) * step)
  return {
    chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
    colors: [ROW.moving.color],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
    states: { hover: { filter: { type: 'lighten', value: 0.1 } } },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: xaxis.value,
    yaxis: { min: 0, max, tickAmount: max / step, labels: { minWidth: AXIS_LABEL_WIDTH, maxWidth: AXIS_LABEL_WIDTH, formatter: (v) => (v ? `${Math.round(v)} นาที` : '0'), style: { fontSize: '11px', colors: '#718078' } } },
    grid: { borderColor: '#eef2f0', xaxis: { lines: { show: false } }, padding: { right: PLOT_PAD_RIGHT } },
    responsive: MOBILE,
    tooltip: {
      intersect: false,
      custom: ({ dataPointIndex }) => {
        const p = walkSeries.value[0]?.data[dataPointIndex]
        if (!p) return ''
        const head = `<div style="color:#718078">${fmtTime(p.x - 1800e3)}–${fmtTime(p.x + 1800e3)} น.</div>`
        const body = p.y == null
          ? `<span style="color:#718078">เห็นวัวแค่ ${p.seen} นาที (น้อยเกินไป)</span>`
          : `<b style="color:#24433a;font-size:14px">${fmtDur(p.y)}</b> <span style="color:#718078">เดิน · ${p.count} ครั้ง · ≈ ${p.dist} ช่วงตัว</span>`
        return `<div style="padding:8px 12px;font-size:12px;line-height:1.6">${head}${body}</div>`
      }
    }
  }
})

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
    grid: { borderColor: '#f0f4f2', strokeDashArray: 4, padding: { right: PLOT_PAD_RIGHT } },
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
