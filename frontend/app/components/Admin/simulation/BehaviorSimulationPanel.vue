<template>
  <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-6">

    <!-- หัวข้อ + สถานการณ์ -->
    <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-[#e5ece9]">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-cctv" size="26" />
        </div>
        <div>
          <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight">จำลองการตรวจจับพฤติกรรมวัว</h3>
          <p class="text-xs text-[#718078] font-medium">ยืน · นอน · กิน · ดื่ม แยกตามท่า เปลี่ยนตาม THI ของสถานการณ์ที่เลือก</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button v-for="s in SCENARIOS" :key="s.key" type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer"
          :class="scenario === s.key ? 'bg-[#24433a] text-white border-[#24433a]' : 'bg-white text-[#4e6057] border-[#e5ece9] hover:border-[#24433a]/40'"
          @click="scenario = s.key">{{ s.label }}</button>
        <button type="button" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f0f4f2] text-[#24433a] hover:bg-[#e5ece9] cursor-pointer flex items-center gap-1" @click="seed++">
          <v-icon icon="mdi-dice-multiple-outline" size="16" />สุ่มใหม่
        </button>
      </div>
    </div>

    <p class="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
      ข้อมูลในส่วนนี้เป็น<strong>ข้อมูลจำลองสำหรับสาธิต</strong> ไม่ได้มาจากกล้องหรือโมเดลจริง รูปแบบใช้แนวโน้มทั่วไป (วัวกินช่วงหลังให้อาหาร นอนมากตอนกลางคืน และยืนมากขึ้น นอนน้อยลงเมื่อร้อน) ตัวเลขไม่ใช่ผลวัด
    </p>

    <!-- 1) ภาพจำลองกรอบตรวจจับ -->
    <section class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="text-sm font-black text-[#24433a]">1. ภาพจำลองการตรวจจับ (เวลา {{ pad(hour) }}:00 น. · THI {{ thiAt(hour).toFixed(1) }})</h4>
        <div class="flex items-center gap-2 text-xs font-bold text-[#4e6057]">
          <span>เวลา</span>
          <input v-model.number="hour" type="range" min="0" max="23" step="1" class="w-40 accent-[#24433a] cursor-pointer" aria-label="เลือกเวลาของภาพจำลอง" />
          <span class="font-mono w-12">{{ pad(hour) }}:00</span>
        </div>
      </div>

      <div class="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[#3b3a33] select-none">
        <!-- โซนในคอก -->
        <div class="absolute inset-x-0 top-0 h-[16%] bg-[#6b5a3a]/70 flex items-center justify-center text-[10px] font-bold text-white/70">รางอาหาร</div>
        <div class="absolute right-0 top-[16%] w-[12%] h-[38%] bg-[#2d6a8f]/60 flex items-center justify-center text-[10px] font-bold text-white/70 text-center px-1">อ่างน้ำ</div>
        <div class="absolute inset-x-0 bottom-0 h-[42%] bg-[#4a4636] border-t-2 border-dashed border-white/15 flex items-end justify-center pb-1 text-[10px] font-bold text-white/50">ซองนอน</div>
        <div class="absolute left-0 top-[16%] w-[88%] h-[42%] flex items-center justify-center text-[10px] font-bold text-white/30">ทางเดิน</div>

        <!-- วัว + กรอบ -->
        <div v-for="c in frame" :key="c.id" class="absolute rounded-md flex items-center justify-center"
          :style="{ left: c.x + '%', top: c.y + '%', width: c.w + '%', height: c.h + '%', border: `2px solid ${CLASS[c.cls].color}`, background: CLASS[c.cls].color + '22' }">
          <v-icon icon="mdi-cow" :size="c.cls === 'lying' ? 22 : 28" class="text-white/85" />
          <span class="absolute -top-[18px] left-[-2px] px-1 rounded-t text-[9px] font-bold text-white whitespace-nowrap" :style="{ background: CLASS[c.cls].color }">
            {{ CLASS[c.cls].en }} {{ c.score.toFixed(2) }}
          </span>
        </div>
        <span class="absolute left-2 bottom-2 text-[10px] font-mono text-white/60">ภาพจำลอง · {{ herd }} ตัว</span>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div v-for="k in CLASS_KEYS" :key="k" class="rounded-2xl p-3 border text-center" :style="{ background: CLASS[k].color + '10', borderColor: CLASS[k].color + '40' }">
          <span class="text-xs font-bold block" :style="{ color: CLASS[k].color }">{{ CLASS[k].th }} ({{ CLASS[k].en }})</span>
          <span class="text-xl font-black text-[#24433a]">{{ frameCounts[k] }}</span>
          <span class="text-[11px] text-[#718078] block">ตัว · {{ Math.round(frameCounts[k] / herd * 100) }}%</span>
        </div>
      </div>
    </section>

    <!-- 2) กราฟฝูง 24 ชม. -->
    <section class="space-y-2 pt-2 border-t border-[#f0f4f2]">
      <h4 class="text-sm font-black text-[#24433a]">2. สัดส่วนพฤติกรรมของฝูงตลอด 24 ชม.</h4>
      <ClientOnly>
        <ApexChart type="bar" height="260" :options="herdOptions" :series="herdSeries" />
        <ApexChart type="line" height="150" :options="thiOptions" :series="thiSeries" />
      </ClientOnly>
      <p class="text-[11px] text-[#718078]">แต่ละแท่ง = สัดส่วนวัวแต่ละท่าในชั่วโมงนั้น (ค่าคาดหมายของการจำลอง) · เส้นล่าง = THI จำลองของวันเดียวกัน</p>
    </section>

    <!-- 3) วัว 1 ตัวทั้งวัน -->
    <section class="space-y-3 pt-2 border-t border-[#f0f4f2]">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="text-sm font-black text-[#24433a]">3. จำลองวัว 1 ตัวตลอดวัน</h4>
        <div class="flex items-center gap-1.5 bg-[#f0f4f2] p-1 rounded-xl">
          <button v-for="v in [{ key: 'timeline', label: 'แถบเวลา' }, { key: 'hourly', label: 'แท่งรายชั่วโมง' }]" :key="v.key" type="button"
            class="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
            :class="cowView === v.key ? 'bg-[#24433a] text-white' : 'text-[#4e6057] hover:text-[#24433a]'"
            @click="cowView = v.key">{{ v.label }}</button>
        </div>
      </div>
      <ClientOnly>
        <ApexChart v-if="cowView === 'timeline'" type="rangeBar" height="250" :options="cowOptions" :series="cowSeries" />
        <ApexChart v-else type="bar" height="280" :options="cowHourlyOptions" :series="cowHourlySeries" />
      </ClientOnly>
      <p v-if="cowView === 'hourly'" class="text-[11px] text-[#718078]">แต่ละแท่ง = 60 นาทีของชั่วโมงนั้น แบ่งตามท่า (การเคลื่อนที่เกิดระหว่างยืน จึงไม่แยกเป็นแท่ง)</p>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <div v-for="c in cowCards" :key="c.key" class="rounded-2xl p-3 border" :style="{ background: c.color + '10', borderColor: c.color + '40' }">
          <span class="text-xs font-bold" :style="{ color: c.color }">{{ c.label }}</span>
          <div class="text-base font-black text-[#24433a]">{{ c.total }}</div>
          <div class="text-[11px] text-[#718078]">{{ c.detail }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { hourlyMinutes, hourlyBarOptions } from '~/utils/behaviorHourly'

const CLASS = {
  standing: { th: 'ยืน', en: 'standing', color: '#f97316' },
  lying: { th: 'นอน', en: 'lying', color: '#3b82f6' },
  feeding: { th: 'กิน', en: 'feeding', color: '#10b981' },
  drinking: { th: 'ดื่ม', en: 'drinking', color: '#06b6d4' }
}
const CLASS_KEYS = ['standing', 'lying', 'feeding', 'drinking']
const MOVING_COLOR = '#8b5cf6'

// THI ตลอดวัน: ต่ำสุดตอนเช้ามืด สูงสุดราว 14:00
const SCENARIOS = [
  { key: 'normal', label: 'วันปกติ', mid: 71, amp: 3 },
  { key: 'hot', label: 'วันร้อน', mid: 75, amp: 5 },
  { key: 'very_hot', label: 'วันร้อนจัด', mid: 79, amp: 5 }
]
const FEED_HOURS = [6, 7, 16, 17]   // หลังรีดนม/ให้อาหาร (สมมติ)

const scenario = ref('hot')
const seed = ref(1)
const hour = ref(14)
const herd = 12

const pad = (n) => String(n).padStart(2, '0')
const sc = computed(() => SCENARIOS.find(s => s.key === scenario.value))
const thiAt = (h) => sc.value.mid + sc.value.amp * Math.cos(((h - 14) / 24) * 2 * Math.PI)

// โอกาสที่วัวจะอยู่แต่ละท่าในชั่วโมงนั้น (สมมติเพื่อสาธิต ไม่ใช่ค่าจากงานวิจัย)
const probsAt = (h) => {
  const thi = thiAt(h)
  const heat = Math.max(0, thi - 74)
  const feeding = FEED_HOURS.includes(h) ? 0.35 : [8, 18].includes(h) ? 0.15 : 0.05
  const drinking = Math.min(0.12, 0.03 + 0.012 * heat + (FEED_HOURS.includes(h) ? 0.02 : 0))
  const lyingBase = h >= 21 || h <= 4 ? 0.75 : h >= 11 && h <= 14 ? 0.55 : 0.45
  const lying = Math.max(0.1, Math.min(lyingBase - 0.06 * heat, 1 - feeding - drinking - 0.05))
  const standing = Math.max(0, 1 - feeding - drinking - lying)
  return { standing, lying, feeding, drinking }
}

// สุ่มแบบกำหนดค่าเริ่มได้ (กด "สุ่มใหม่" = เปลี่ยน seed) ผลเหมือนเดิมทุกครั้งที่ seed เท่ากัน
const rng = (s) => () => {
  s |= 0; s = (s + 0x6D2B79F5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (p, r) => {
  let acc = 0
  const x = r()
  for (const k of CLASS_KEYS) { acc += p[k]; if (x < acc) return k }
  return 'standing'
}

// ---------- 1) ภาพจำลอง: วางวัวตามโซนของท่า ----------
const frame = computed(() => {
  const r = rng(seed.value * 1000 + hour.value * 7 + scenario.value.length)
  const p = probsAt(hour.value)
  const slots = { feeding: 0, drinking: 0, lying: 0, standing: 0 }
  return Array.from({ length: herd }, (_, id) => {
    const cls = pick(p, r)
    const n = slots[cls]++
    const jitter = () => (r() - 0.5) * 2
    let pos
    // กิน = ริมรางอาหาร, ดื่ม = ในอ่างน้ำ, นอน = ซองนอน, ยืน = ทางเดิน (แถวละ 8 ตัว ไม่ซ้อนกัน)
    if (cls === 'feeding') pos = { x: 3 + (n % 8) * 10.5 + jitter() * 0.5, y: 12, w: 8, h: 19 }
    else if (cls === 'drinking') pos = { x: 89.5 + jitter() * 0.3, y: 18 + (n % 3) * 12, w: 8, h: 11 }
    else if (cls === 'lying') pos = { x: 3 + (n % 7) * 12 + jitter(), y: 65 + Math.floor(n / 7) * 16, w: 11, h: 13 }
    else pos = { x: 2 + (n % 8) * 10.5 + jitter() * 0.5, y: 32 + Math.floor(n / 8) * 15, w: 7.5, h: 15 }
    return { id, cls, score: 0.62 + r() * 0.35, ...pos }
  })
})
const frameCounts = computed(() => Object.fromEntries(CLASS_KEYS.map(k => [k, frame.value.filter(c => c.cls === k).length])))

// ---------- 2) กราฟฝูง 24 ชม. ----------
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const herdSeries = computed(() => CLASS_KEYS.map(k => ({ name: CLASS[k].th, data: HOURS.map(h => Math.round(probsAt(h)[k] * 100)) })))
const baseChart = { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } }
const LABEL_W = 44
const herdOptions = computed(() => ({
  chart: { ...baseChart, stacked: true, stackType: '100%' },
  colors: CLASS_KEYS.map(k => CLASS[k].color),
  plotOptions: { bar: { columnWidth: '80%' } },
  dataLabels: { enabled: false },
  xaxis: { categories: HOURS.map(h => `${pad(h)}:00`), labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '10px', colors: '#718078' } } },
  yaxis: { labels: { minWidth: LABEL_W, maxWidth: LABEL_W, formatter: (v) => `${Math.round(v)}%`, style: { colors: '#718078' } } },
  legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' },
  tooltip: { y: { formatter: (v) => `${v}%` } },
  grid: { borderColor: '#f0f4f2', strokeDashArray: 4 }
}))
const thiSeries = computed(() => [{ name: 'THI', data: HOURS.map(h => Number(thiAt(h).toFixed(1))) }])
const thiOptions = computed(() => ({
  chart: baseChart,
  colors: ['#d87939'],
  stroke: { curve: 'smooth', width: 2.5 },
  dataLabels: { enabled: false },
  xaxis: { categories: HOURS.map(h => `${pad(h)}:00`), labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '10px', colors: '#718078' } } },
  yaxis: { min: 66, max: 86, tickAmount: 4, labels: { minWidth: LABEL_W, maxWidth: LABEL_W, style: { colors: '#718078' } } },
  annotations: { yaxis: [
    { y: 74, borderColor: '#f59e0b', strokeDashArray: 4, label: { text: '74 เฝ้าระวัง', position: 'right', textAnchor: 'end', style: { color: '#fff', background: '#f59e0b', fontSize: '10px' } } },
    { y: 76, borderColor: '#ea580c', strokeDashArray: 4, label: { text: '76 เครียดจากความร้อน', position: 'left', textAnchor: 'start', style: { color: '#fff', background: '#ea580c', fontSize: '10px' } } }
  ] },
  grid: { borderColor: '#f0f4f2', strokeDashArray: 4 }
}))

// ---------- 3) วัว 1 ตัวทั้งวัน: เดินทีละรอบพฤติกรรม ----------
// ความยาวรอบโดยประมาณ (นาที) วันร้อนรอบนอนสั้นลง รอบยืนยาวขึ้น
const cowBouts = computed(() => {
  const r = rng(seed.value * 31 + scenario.value.length * 7)
  const bouts = []
  let t = 0
  let prev = 'lying'
  while (t < 1440) {
    const h = Math.floor(t / 60)
    const heat = Math.max(0, thiAt(h) - 74)
    const means = { lying: Math.max(30, 75 - 6 * heat), standing: 25 + 4 * heat, feeding: 35, drinking: 4 }
    // เลือกท่าถัดไปตามสัดส่วนเวลา ÷ ความยาวรอบ เวลารวมของแต่ละท่าจึงใกล้กับสัดส่วนของฝูงในชั่วโมงนั้น
    const probs = probsAt(h)
    const w = Object.fromEntries(CLASS_KEYS.map(k => [k, k === prev ? 0 : probs[k] / means[k]]))
    const sum = CLASS_KEYS.reduce((a, k) => a + w[k], 0)
    CLASS_KEYS.forEach(k => { w[k] /= sum })
    const cls = pick(w, r)
    const dur = Math.max(2, Math.round(means[cls] * (0.6 + r() * 0.8)))
    // เดินไปรางอาหาร/อ่างน้ำ 2–4 นาทีก่อนเริ่มกิน/ดื่ม
    if ((cls === 'feeding' || cls === 'drinking') && prev !== 'feeding' && prev !== 'drinking') bouts.push({ cls: 'moving', start: t, end: Math.min(1440, t + 2 + Math.floor(r() * 3)) })
    bouts.push({ cls, start: t, end: Math.min(1440, t + dur) })
    t += dur
    prev = cls
  }
  return bouts
})

const DAY0 = Date.UTC(2026, 0, 1)
const cowRows = [...CLASS_KEYS.map(k => ({ key: k, label: CLASS[k].th, color: CLASS[k].color })), { key: 'moving', label: 'เคลื่อนที่', color: MOVING_COLOR }]
const cowSeries = computed(() => cowRows.map(row => ({
  name: row.label,
  data: [
    { x: row.label, y: [DAY0, DAY0] },
    ...cowBouts.value.filter(b => b.cls === row.key).map(b => ({ x: row.label, y: [DAY0 + b.start * 60e3, DAY0 + b.end * 60e3] }))
  ]
})))
const hhmm = (ms) => (ms - DAY0 >= 864e5 ? '24:00' : new Date(ms).toISOString().slice(11, 16))
const fmtDur = (min) => (min >= 60 ? `${Math.floor(min / 60)} ชม. ${min % 60} นาที` : `${min} นาที`)
const cowOptions = computed(() => ({
  chart: baseChart,
  plotOptions: { bar: { horizontal: true, rangeBarGroupRows: true, barHeight: '70%', borderRadius: 3 } },
  colors: cowRows.map(r => r.color),
  dataLabels: { enabled: false },
  legend: { show: false },
  xaxis: { type: 'datetime', min: DAY0, max: DAY0 + 864e5, tickAmount: 8, labels: { datetimeUTC: true, rotate: 0, hideOverlappingLabels: true, formatter: (v) => hhmm(Number(v)), style: { fontSize: '11px', colors: '#718078' } } },
  yaxis: { labels: { minWidth: 70, maxWidth: 70, style: { fontSize: '12px', fontWeight: 700, colors: '#24433a' } } },
  grid: { borderColor: '#f0f4f2', strokeDashArray: 4, xaxis: { lines: { show: true } }, padding: { right: 18 } },
  tooltip: {
    custom: ({ seriesIndex, dataPointIndex, w }) => {
      const p = w.config.series[seriesIndex].data[dataPointIndex]
      if (p.y[0] === p.y[1]) return ''
      const row = cowRows[seriesIndex]
      const mins = Math.round((p.y[1] - p.y[0]) / 60e3)
      const h = Math.floor((p.y[0] - DAY0) / 3600e3)
      return `<div style="padding:8px 12px;font-size:12px;line-height:1.6"><b style="color:${row.color}">${row.label}</b><br>${hhmm(p.y[0])} – ${hhmm(p.y[1])} · ${fmtDur(mins)}<br><span style="color:#718078">THI ราว ${thiAt(h).toFixed(1)}</span></div>`
    }
  }
}))
const cowView = ref('timeline')
const cowHourly = computed(() => hourlyMinutes(
  cowBouts.value.map(b => ({ key: b.cls, startMs: DAY0 + b.start * 60e3, endMs: DAY0 + b.end * 60e3 })), DAY0, CLASS_KEYS))
const cowHourlySeries = computed(() => CLASS_KEYS.map(k => ({ name: CLASS[k].th, data: cowHourly.value[k] })))
const cowHourlyOptions = hourlyBarOptions(CLASS_KEYS.map(k => CLASS[k].color), 70)

const cowCards = computed(() => cowRows.map(row => {
  const list = cowBouts.value.filter(b => b.cls === row.key)
  const total = list.reduce((a, b) => a + (b.end - b.start), 0)
  const longest = list.reduce((a, b) => Math.max(a, b.end - b.start), 0)
  return {
    ...row,
    total: fmtDur(total),
    detail: row.key === 'lying' ? `${list.length} รอบ · นานสุด ${fmtDur(longest)}` : `${list.length} ${row.key === 'moving' ? 'ครั้ง' : 'รอบ'}`
  }
}))
</script>
