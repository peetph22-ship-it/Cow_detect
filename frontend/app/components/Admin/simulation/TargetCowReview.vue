<template>
  <div class="rounded-2xl border border-[#e5ece9] bg-white p-4 md:p-5 space-y-4">
    <!-- หัว -->
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h4 class="text-sm font-black text-[#24433a]">วัวเป้าหมาย</h4>
        <p class="text-[11px] text-[#718078]">
          เลือกที่วินาที {{ target.seedT.toFixed(1) }} · ติดตามด้วยวิธีเดียวกับ server ({{ METHOD }}) · ตรวจทุก {{ target.step }} วินาที
        </p>
      </div>
      <button type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#4e6057] bg-[#f0f4f2] hover:bg-[#e5ece9] cursor-pointer" @click="emit('clear')">เลือกตัวใหม่</button>
    </div>

    <!-- ตัวเลขการติดตาม -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div class="rounded-xl bg-[#f6f8f7] p-2.5">
        <span class="text-[10px] font-bold text-[#718078] block">เห็นวัวตัวนี้</span>
        <span class="text-lg font-black text-[#24433a] tabular-nums">{{ seenCount }}/{{ obs.length }}</span>
        <span class="text-[10px] text-[#718078]"> เฟรม ({{ seenPct }}%)</span>
      </div>
      <div class="rounded-xl bg-[#f6f8f7] p-2.5">
        <span class="text-[10px] font-bold text-[#718078] block">คะแนนจับคู่เฉลี่ย</span>
        <span class="text-lg font-black text-[#24433a] tabular-nums">{{ avgScore ?? '-' }}</span>
        <span class="text-[10px] text-[#718078]"> (0–1)</span>
      </div>
      <div v-for="k in SHOW" :key="k" class="rounded-xl p-2.5" :style="{ background: COLORS[k] + '14' }">
        <span class="text-[10px] font-bold block" :style="{ color: COLORS[k] }">{{ LABELS[k] }}</span>
        <span class="text-lg font-black text-[#24433a] tabular-nums">{{ fmtDur(totals[k]) }}</span>
      </div>
    </div>
    <p v-if="target.lostAt != null" class="text-xs font-bold text-rose-700">
      หลุดการติดตามที่วินาที {{ target.lostAt.toFixed(1) }} (ไม่เห็นวัวนานเกินเกณฑ์) ต้องเลือกตัวใหม่ เหมือนบน server
    </p>

    <!-- ไทม์ไลน์ -->
    <div class="space-y-1">
      <div class="relative h-7 rounded-lg bg-[#f0f4f2] overflow-hidden cursor-pointer" title="คลิกเพื่อไปยังช่วงนั้น" @click="onBarClick">
        <div v-for="(b, i) in bars" :key="i" class="absolute top-0 bottom-0"
          :style="{ left: b.left + '%', width: b.width + '%', background: b.behavior === 'not_visible' ? 'repeating-linear-gradient(45deg,#cbd5d1 0 4px,#e5ece9 4px 8px)' : COLORS[b.behavior] }"
          :title="`${LABELS[b.behavior]} ${b.start.toFixed(1)}–${b.end.toFixed(1)} วิ`"></div>
        <div class="absolute top-0 bottom-0 w-0.5 bg-[#24433a]" :style="{ left: cursorPct + '%' }"></div>
      </div>
      <div class="flex justify-between text-[10px] text-[#718078] tabular-nums">
        <span>{{ target.seedT.toFixed(0) }} วิ</span>
        <span class="flex gap-2.5">
          <span v-for="k in [...SHOW, 'not_visible']" :key="k" class="inline-flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-sm" :style="{ background: k === 'not_visible' ? '#cbd5d1' : COLORS[k] }"></span>{{ LABELS[k] }}
          </span>
        </span>
        <span>{{ endT.toFixed(0) }} วิ</span>
      </div>
      <p class="text-[10px] text-[#718078]">ท่าดื่มรวมกับยืน (โมเดลแยกท่าดื่มได้แม่นต่ำ) และหายจากภาพ 1 เฟรมระหว่างท่าเดียวกันนับเป็นท่าเดิม เหมือนกราฟใน farm_detail</p>
    </div>

    <!-- ตรวจความถูกต้อง -->
    <div class="rounded-xl border border-dashed border-[#cbd5d1] p-3 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-black text-[#24433a]">ตรวจด้วยตา (วัดความแม่นการติดตาม)</span>
        <span class="text-[11px] text-[#718078] tabular-nums">ตรวจแล้ว {{ reviewedCount }}/{{ obs.length }} เฟรม</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#f0f4f2] hover:bg-[#e5ece9] cursor-pointer disabled:opacity-40" :disabled="curIdx <= 0" @click="go(curIdx - 1)">← ก่อนหน้า</button>
        <span class="text-[11px] font-bold text-[#4e6057] tabular-nums">
          {{ curObs ? `วินาที ${curT.toFixed(1)}: ระบบบอก ${LABELS[curObs.behavior]}` : 'เลื่อนวิดีโอไปเฟรมที่ติดตามแล้ว' }}
        </span>
        <button type="button" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#f0f4f2] hover:bg-[#e5ece9] cursor-pointer disabled:opacity-40" :disabled="curIdx < 0 || curIdx >= obs.length - 1" @click="go(curIdx + 1)">ถัดไป →</button>
        <button type="button" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#24433a] hover:bg-[#f0f4f2] cursor-pointer disabled:opacity-40" :disabled="nextUnreviewed < 0" @click="go(nextUnreviewed)">ไปเฟรมที่ยังไม่ตรวจ</button>
      </div>

      <div v-if="curObs" class="flex flex-wrap gap-1.5">
        <button v-for="o in options" :key="o.value" type="button"
          class="px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer"
          :class="reviews[curKey] === o.value ? 'bg-[#24433a] text-white border-[#24433a]' : 'bg-white text-[#24433a] border-[#e5ece9] hover:border-[#24433a]/40'"
          @click="mark(o.value)">{{ o.label }}</button>
      </div>

      <div v-if="reviewedCount" class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
        <div class="rounded-lg bg-[#f6f8f7] p-2"><b class="text-[#24433a]">ถูกตัว {{ pct(metrics.idOk, metrics.idTotal) }}</b><span class="text-[#718078]"> ({{ metrics.idOk }}/{{ metrics.idTotal }} เฟรมที่ระบบชี้วัว · เกณฑ์ ≥ 90%)</span></div>
        <div class="rounded-lg bg-[#f6f8f7] p-2"><b class="text-[#24433a]">ท่าถูก {{ pct(metrics.poseOk, metrics.poseTotal) }}</b><span class="text-[#718078]"> ({{ metrics.poseOk }}/{{ metrics.poseTotal }} เฟรมที่ถูกตัว)</span></div>
        <div class="rounded-lg bg-[#f6f8f7] p-2"><b class="text-[#24433a]">หาไม่เจอทั้งที่เห็น {{ metrics.missed }}</b><span class="text-[#718078]"> จาก {{ metrics.hiddenTotal }} เฟรมที่ระบบบอกว่าไม่เห็น</span></div>
      </div>

      <div class="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#24433a] text-white hover:bg-[#1C362B] cursor-pointer" @click="exportCsv">ส่งออก CSV</button>
        <label class="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#e5ece9] text-[#24433a] hover:border-[#24433a]/40 cursor-pointer">
          นำเข้าผลตรวจ (CSV)
          <input type="file" accept=".csv,text/csv" class="hidden" @change="importCsv" />
        </label>
        <span v-if="importMsg" class="text-[11px] text-[#718078]">{{ importMsg }}</span>
      </div>
      <p class="text-[10px] text-[#718078] leading-relaxed">
        CSV มีผลของระบบทุกเฟรม (ท่า คะแนน กรอบ) และผลตรวจของคุณ เก็บไว้เป็นไฟล์คำตอบได้ นำเข้ากลับมาเพื่อตรวจต่อหรือวัดซ้ำหลังเปลี่ยนโมเดล (จับคู่ด้วยวินาทีของวิดีโอ)
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { METHOD } from '~/utils/cowTracking'

const props = defineProps({
  // { seedT, step, lostAt (วินาที|null), observations: [{t, behavior, box, matchScore}], bouts: [{behavior, start, end}] (วินาที) }
  target: { type: Object, required: true },
  duration: { type: Number, default: 0 },
  currentT: { type: Number, default: 0 },
  reviews: { type: Object, default: () => ({}) },
  videoName: { type: String, default: '' }
})
const emit = defineEmits(['seek', 'review', 'import-reviews', 'clear'])

const COLORS = { lying: '#3b82f6', standing: '#f97316', feeding: '#10b981', drinking: '#06b6d4', not_visible: '#94a3b8' }
const LABELS = { lying: 'นอน', standing: 'ยืน', feeding: 'กิน', drinking: 'ดื่ม', not_visible: 'ไม่เห็น' }
const SHOW = ['lying', 'standing', 'feeding']

const obs = computed(() => props.target.observations)
const keyOf = (t) => t.toFixed(2)
const endT = computed(() => {
  const last = obs.value[obs.value.length - 1]
  return last ? Math.min(props.duration || Infinity, last.t + props.target.step) : props.target.seedT
})
const span = computed(() => Math.max(0.001, endT.value - props.target.seedT))

const seenCount = computed(() => obs.value.filter(o => o.behavior !== 'not_visible').length)
const seenPct = computed(() => (obs.value.length ? Math.round(seenCount.value / obs.value.length * 100) : 0))
const avgScore = computed(() => {
  const s = obs.value.filter(o => o.matchScore != null).map(o => o.matchScore)
  return s.length ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(2) : null
})

const bars = computed(() => props.target.bouts.map(b => ({
  behavior: b.behavior,
  start: b.start,
  end: b.end,
  left: Math.max(0, (b.start - props.target.seedT) / span.value * 100),
  width: Math.max(0.3, (Math.min(b.end, endT.value) - Math.max(b.start, props.target.seedT)) / span.value * 100)
})))
const totals = computed(() => {
  const out = { lying: 0, standing: 0, feeding: 0, not_visible: 0 }
  for (const b of props.target.bouts) {
    const s = Math.max(b.start, props.target.seedT)
    const e = Math.min(b.end, endT.value)
    if (e > s) out[b.behavior] = (out[b.behavior] || 0) + (e - s)
  }
  return out
})
const cursorPct = computed(() => Math.min(100, Math.max(0, (props.currentT - props.target.seedT) / span.value * 100)))
const fmtDur = (sec) => {
  const s = Math.round(sec || 0)
  return s < 60 ? `${s} วิ` : `${Math.floor(s / 60)} น. ${s % 60} วิ`
}
const onBarClick = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  emit('seek', props.target.seedT + (e.clientX - r.left) / r.width * span.value)
}

// เฟรมที่ติดตามแล้วใกล้เวลาปัจจุบัน (ไม่เกินครึ่งรอบ)
const curIdx = computed(() => {
  let best = -1
  obs.value.forEach((o, i) => { if (best < 0 || Math.abs(o.t - props.currentT) < Math.abs(obs.value[best].t - props.currentT)) best = i })
  return best >= 0 && Math.abs(obs.value[best].t - props.currentT) <= props.target.step / 2 + 0.05 ? best : -1
})
const curObs = computed(() => (curIdx.value >= 0 ? obs.value[curIdx.value] : null))
const curT = computed(() => curObs.value?.t ?? 0)
const curKey = computed(() => (curObs.value ? keyOf(curObs.value.t) : ''))
const go = (i) => { if (obs.value[i]) emit('seek', obs.value[i].t) }

// ระบบชี้วัว: ถูกตัวท่าถูก / ถูกตัวท่าผิด / ผิดตัว, ระบบบอกไม่เห็น: ไม่เห็นจริง / เห็นแต่หาไม่เจอ
const options = computed(() => (curObs.value?.behavior === 'not_visible'
  ? [{ value: 'hidden_ok', label: 'ไม่เห็นจริง (ถูกบัง/ออกนอกภาพ)' }, { value: 'missed', label: 'เห็นอยู่ แต่ระบบหาไม่เจอ' }]
  : [{ value: 'ok', label: 'ถูกตัว ท่าถูก' }, { value: 'wrong_pose', label: 'ถูกตัว ท่าผิด' }, { value: 'wrong_cow', label: 'ผิดตัว' }]))
const mark = (value) => {
  emit('review', curKey.value, value)
  if (curIdx.value < obs.value.length - 1) go(curIdx.value + 1)
}
const reviewedCount = computed(() => obs.value.filter(o => props.reviews[keyOf(o.t)]).length)
const nextUnreviewed = computed(() => {
  const n = obs.value.length
  for (let k = 1; k <= n; k++) {
    const i = (Math.max(curIdx.value, 0) + k) % n
    if (!props.reviews[keyOf(obs.value[i].t)]) return i
  }
  return -1
})
const metrics = computed(() => {
  const c = { ok: 0, wrong_pose: 0, wrong_cow: 0, hidden_ok: 0, missed: 0 }
  for (const o of obs.value) { const r = props.reviews[keyOf(o.t)]; if (r && r in c) c[r]++ }
  return {
    idOk: c.ok + c.wrong_pose, idTotal: c.ok + c.wrong_pose + c.wrong_cow,
    poseOk: c.ok, poseTotal: c.ok + c.wrong_pose,
    missed: c.missed, hiddenTotal: c.hidden_ok + c.missed
  }
})
const pct = (a, b) => (b ? `${Math.round(a / b * 1000) / 10}%` : '-')

// ---------- CSV ----------
const HEADER = ['t_sec', 'system_behavior', 'match_score', 'x1', 'y1', 'x2', 'y2', 'review']
const exportCsv = () => {
  const r4 = (v) => (v == null ? '' : Math.round(v * 10000) / 10000)
  const rows = obs.value.map(o => [o.t.toFixed(2), o.behavior, o.matchScore ?? '', r4(o.box?.x1), r4(o.box?.y1), r4(o.box?.x2), r4(o.box?.y2), props.reviews[keyOf(o.t)] || ''].join(','))
  const meta = `# video=${(props.videoName || '').replace(/[,\n]/g, ' ')},seed_t=${props.target.seedT.toFixed(2)},step_sec=${props.target.step},method=${METHOD}`
  const blob = new Blob([[meta, HEADER.join(','), ...rows].join('\n') + '\n'], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `target_cow_${(props.videoName || 'video').replace(/\.[^.]+$/, '')}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
const importMsg = ref('')
const VALID = new Set(['ok', 'wrong_pose', 'wrong_cow', 'hidden_ok', 'missed'])
const importCsv = async (e) => {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  const lines = (await f.text()).split(/\r?\n/).filter(l => l && !l.startsWith('#'))
  const head = (lines.shift() || '').split(',')
  const ti = head.indexOf('t_sec')
  const ri = head.indexOf('review')
  if (ti < 0 || ri < 0) { importMsg.value = 'ไฟล์ต้องมีคอลัมน์ t_sec และ review'; return }
  const have = new Set(obs.value.map(o => keyOf(o.t)))
  const map = {}
  let skipped = 0
  for (const l of lines) {
    const c = l.split(',')
    const t = Number(c[ti])
    const r = (c[ri] || '').trim()
    if (!Number.isFinite(t) || !VALID.has(r)) continue
    if (have.has(keyOf(t))) map[keyOf(t)] = r
    else skipped++
  }
  emit('import-reviews', map)
  importMsg.value = `นำเข้า ${Object.keys(map).length} เฟรม${skipped ? ` · ข้าม ${skipped} เฟรมที่ไม่ตรงกับเฟรมที่วิเคราะห์ (ใช้รอบตรวจเท่ากับตอนส่งออก)` : ''}`
}
</script>
