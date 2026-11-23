<template>
  <!-- จอภาพล่าสุดจากกล้อง (แทนสตรีมสดเดิมที่ต้องใช้ FastAPI): ภาพนิ่งที่กล่องส่งมา + กรอบและเลขวัวทุกตัว อัปเดตเอง -->
  <div class="bg-[#142820] rounded-2xl overflow-hidden shadow-md border border-[#24433a] text-white flex flex-col min-h-[340px]">
    <!-- แถบบน -->
    <div class="px-3 py-2.5 bg-black/40 flex flex-wrap items-center justify-between gap-2 text-[11px] border-b border-white/10">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2 h-2 rounded-full shrink-0" :class="fresh.dot"></span>
        <span class="font-bold truncate">ภาพล่าสุดจากกล้อง<template v-if="camera"> · {{ camera.camera_name }} ({{ camera.ip_address }})</template></span>
      </div>
      <div class="flex items-center gap-2 text-white/80 shrink-0">
        <span v-if="latest" class="font-mono tabular-nums">{{ clock(latest.captured_at) }} น. · {{ fresh.text }}</span>
        <button type="button" class="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer disabled:opacity-40" :disabled="loading" title="โหลดภาพล่าสุดใหม่" @click="load">
          <v-icon icon="mdi-refresh" size="14" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
    </div>

    <!-- ภาพ -->
    <div class="flex-1 flex items-center justify-center p-3 relative">
      <div v-if="loading && !data" class="text-xs text-white/60">กำลังโหลดภาพล่าสุด...</div>

      <div v-else-if="!camera && !latest" class="py-10 px-6 text-center space-y-3">
        <v-icon icon="mdi-cctv-off" size="42" class="text-amber-400" />
        <p class="text-sm font-black">ยังไม่ได้ผูกกล้องกับฟาร์มนี้</p>
        <p class="text-xs text-white/70 max-w-xs mx-auto">ผูกกล้องแล้ว กล่องเซ็นเซอร์จะดึงภาพจากกล้องส่งขึ้นระบบ ภาพล่าสุดจะแสดงที่นี่</p>
        <button type="button" class="px-4 py-2 rounded-xl text-xs font-bold text-[#142820] bg-emerald-400 hover:bg-emerald-300 cursor-pointer" @click="emit('add-camera')">+ ผูกกล้องประจำฟาร์ม</button>
      </div>

      <div v-else-if="!latest" class="py-10 px-6 text-center space-y-2">
        <v-icon icon="mdi-image-off-outline" size="42" class="text-white/30" />
        <p class="text-sm font-black">ยังไม่มีภาพจากกล้อง</p>
        <p class="text-xs text-white/70 max-w-xs mx-auto">ภาพจะขึ้นหลังกล่องเซ็นเซอร์ส่งภาพแรก (เปิดกล่อง และกล้องต้องอยู่วงแลนเดียวกันที่ 192.168.1.108)</p>
      </div>

      <div v-else class="relative w-fit max-w-full mx-auto">
        <img :src="latest.image_url" alt="ภาพล่าสุดจากกล้อง" class="block max-w-full max-h-[440px] w-auto h-auto rounded-lg" />
        <div v-for="(b, i) in boxes" :key="i" class="absolute rounded-sm pointer-events-none"
          :style="{ ...boxStyle(b), border: `${b.isTarget ? 4 : 2}px solid ${b.isTarget ? '#facc15' : color(b.cls)}`, opacity: target && !b.isTarget ? 0.7 : 1 }">
          <span class="absolute -top-[17px] left-[-2px] px-1 rounded-t text-[10px] font-bold whitespace-nowrap"
            :style="{ background: b.isTarget ? '#facc15' : color(b.cls), color: b.isTarget ? '#142820' : '#fff' }">
            {{ b.isTarget ? `🎯 ${targetLabel} ` : '' }}{{ b.id ? `${b.isTarget ? '(' : ''}#${b.id}${b.isTarget ? ')' : ''} ` : '' }}{{ POSE_TH[poseKey(b.cls)] || b.cls }}
          </span>
        </div>
        <div v-if="targetNote" class="absolute top-2 left-2 px-2.5 py-1 rounded-lg text-[11px] font-bold" :class="targetNote.cls">{{ targetNote.text }}</div>
      </div>
    </div>

    <!-- แถบล่าง: จำนวนแต่ละท่าในภาพนี้ -->
    <div class="px-3 py-2.5 bg-black/40 flex flex-wrap items-center justify-between gap-2 text-[11px] border-t border-white/10">
      <div v-if="latest" class="flex flex-wrap items-center gap-1.5">
        <span class="font-bold text-white/90">ในภาพนี้ {{ boxes.length }} ตัว:</span>
        <span v-for="k in ['lying', 'standing', 'feeding', 'drinking']" :key="k" class="px-1.5 py-0.5 rounded font-bold" :style="{ background: COLOR[k] + '33', color: COLOR[k] }">
          {{ POSE_TH[k] }} {{ counts[k] }}
        </span>
      </div>
      <span v-else class="text-white/60">—</span>
      <span class="text-white/60">#เลข = เลขวัวที่ระบบตั้ง (คงที่ข้ามภาพ) · อัปเดตเองทุก 1 นาที</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'

const props = defineProps({
  farmId: { type: String, required: true },
  // กล้องหลักของฟาร์ม (cctv_cameras) ไม่มี = ยังไม่ผูกกล้อง
  camera: { type: Object, default: null }
})
const emit = defineEmits(['add-camera'])

// อ่าน API base ตอน setup เท่านั้น
const Admin = `${getNodeApiBase()}/Admin`
const POSE_TH = { lying: 'นอน', standing: 'ยืน', feeding: 'กิน', drinking: 'ดื่ม' }
const COLOR = { lying: '#3b82f6', standing: '#f97316', feeding: '#10b981', drinking: '#06b6d4' }
const poseKey = (cls) => (cls === 'lying down' ? 'lying' : cls)
const color = (cls) => COLOR[poseKey(cls)] || '#94a3b8'

const data = ref(null)
const loading = ref(false)
const now = ref(Date.now())
let timer = null

const latest = computed(() => data.value?.latest || null)
const target = computed(() => (data.value?.target?.active ? data.value.target : null))
const targetLabel = computed(() => (target.value?.cow?.tag_id ? `วัว #${target.value.cow.tag_id}` : 'วัวเป้าหมาย'))
const sameBox = (a, b) => a && b && ['x1', 'y1', 'x2', 'y2'].every(k => Math.abs(Number(a[k]) - Number(b[k])) < 1e-6)
const boxes = computed(() => (latest.value?.boxes || []).map(b => ({ ...b, isTarget: Boolean(target.value && sameBox(b, data.value?.target_in_latest?.box)) })))
const counts = computed(() => {
  const c = { lying: 0, standing: 0, feeding: 0, drinking: 0 }
  for (const b of boxes.value) { const k = poseKey(b.cls); if (k in c) c[k]++ }
  return c
})
const targetNote = computed(() => {
  if (!target.value) return null
  const t = data.value?.target_in_latest
  if (!t) return { text: `${targetLabel.value}: ยังไม่มีผลติดตามของภาพนี้`, cls: 'bg-white/85 text-[#24433a]' }
  if (!t.box) return { text: `${targetLabel.value}: ไม่เห็นในภาพนี้`, cls: 'bg-amber-400 text-[#142820]' }
  return null
})

const boxStyle = (b) => ({ left: `${b.x1 * 100}%`, top: `${b.y1 * 100}%`, width: `${(b.x2 - b.x1) * 100}%`, height: `${(b.y2 - b.y1) * 100}%` })
const clock = (iso) => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(11, 19)
// ภาพเก่าแค่ไหน: กล้องส่งทุก 15–60 วิ เกิน 5 นาที = เริ่มขาด, เกิน 30 นาที = กล้อง/กล่องน่าจะหลุด
const fresh = computed(() => {
  if (!latest.value) return { dot: 'bg-white/30', text: '' }
  const min = Math.max(0, Math.round((now.value - new Date(latest.value.captured_at).getTime()) / 60000))
  const text = min < 1 ? 'เมื่อสักครู่' : min < 60 ? `${min} นาทีที่แล้ว` : min < 1440 ? `${Math.floor(min / 60)} ชม. ${min % 60} นาทีที่แล้ว` : `${Math.floor(min / 1440)} วันที่แล้ว`
  return { dot: min <= 5 ? 'bg-emerald-400 animate-pulse' : min <= 30 ? 'bg-amber-400' : 'bg-rose-500', text }
})

const load = async () => {
  loading.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cow-target`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    data.value = res.data || null
  } catch (e) {
    console.warn('[CameraLatestView] load failed:', e?.message)
  } finally {
    loading.value = false
    now.value = Date.now()
  }
}

// อัปเดตทุก 1 นาที (ข้ามตอนแท็บไม่ได้เปิดดู)
onMounted(() => {
  load()
  timer = setInterval(() => { now.value = Date.now(); if (!document.hidden) load() }, 60000)
})
onUnmounted(() => clearInterval(timer))
watch(() => props.farmId, load)
defineExpose({ load })
</script>
