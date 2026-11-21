<template>
  <v-dialog :model-value="modelValue" max-width="540" @update:model-value="emit('update:modelValue', $event)">
    <!-- จอเตี้ย (มือถือ) เนื้อหายาวกว่าจอได้ ให้เลื่อนภายในกล่อง -->
    <div class="bg-white rounded-[32px] overflow-hidden overflow-y-auto max-h-[calc(100dvh-48px)] shadow-2xl border border-[#E4E8E5] font-sans">
      <div class="h-2 w-full" :class="collect?.active ? 'bg-emerald-500' : 'bg-[#D87939]'"></div>

      <div class="p-6 md:p-8 space-y-5">
        <!-- หัว -->
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-black text-[#142820]">เก็บภาพทุกภาพ</h3>
            <p class="text-xs text-[#718078] mt-0.5">
              {{ device?.name_devices }} · {{ device?.name_farms || 'ยังไม่ผูกฟาร์ม' }}
            </p>
          </div>
          <button
            class="w-8 h-8 rounded-full bg-[#F6F7F5] text-[#718078] hover:bg-[#E4E8E5] flex items-center justify-center cursor-pointer shrink-0"
            aria-label="ปิด"
            @click="emit('update:modelValue', false)">
            <v-icon icon="mdi-close" size="16" />
          </button>
        </div>

        <p class="text-[13px] text-[#5A6B63] leading-relaxed">
          ปกติระบบเก็บภาพไว้ชั่วโมงละ 1 ภาพ โหมดนี้เก็บ<b class="text-[#142820]">ทุกภาพ</b>ที่กล่องส่งมาพร้อมผลของโมเดล
          รวมภาพที่ server ประมวลผลไม่ทัน ใช้วันดูหน้างานและวันเก็บข้อมูล (วัดความแม่นยำ ฝึกโมเดล ตรวจการติดตามวัวย้อนหลัง)
        </p>

        <div v-if="loading" class="py-6 text-center text-xs font-bold text-[#718078]">กำลังโหลดสถานะ...</div>

        <template v-else-if="info">
          <!-- สถานะ -->
          <div
            class="rounded-2xl border p-4 space-y-1.5"
            :class="collect?.active ? 'bg-emerald-50/70 border-emerald-200' : 'bg-[#F6F7F5] border-[#E4E8E5]'">
            <div v-if="collect?.active" class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span class="inline-flex items-center gap-1.5 text-sm font-black text-emerald-800">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                กำลังเก็บทุกภาพ
              </span>
              <span class="text-sm font-bold text-emerald-900 tabular-nums">ถึง {{ clock(collect.until) }}</span>
              <span class="text-xs text-emerald-800 tabular-nums">(อีก {{ durationText(remainingMin) }})</span>
            </div>
            <div v-else class="text-sm font-black text-[#142820]">ไม่ได้เปิด <span class="font-medium text-[#718078]">· เก็บชั่วโมงละ 1 ภาพตามปกติ</span></div>

            <div v-if="collect?.started_at" class="text-xs text-[#5A6B63] tabular-nums leading-relaxed">
              <template v-if="collect.active">เริ่ม {{ clock(collect.started_at) }}</template>
              <template v-else>ครั้งล่าสุด {{ dateClock(collect.started_at) }}–{{ clock(collect.until) }}</template>
              <template v-if="info.saved"> · {{ collect.active ? 'เก็บแล้ว' : 'ได้' }} <b class="text-[#142820]">{{ info.saved.images }}</b> ภาพ ({{ info.saved.mb }} MB)</template>
              <template v-if="info.saved?.last_at"> · ภาพล่าสุด {{ clock(info.saved.last_at) }}</template>
            </div>
            <div v-if="noImagesYet" class="text-xs font-semibold text-amber-700 leading-relaxed">
              ⚠ เปิดมาแล้ว {{ durationText(minutesSinceStart) }} ยังไม่มีภาพเข้า: ตรวจว่ากล่องออนไลน์ เฟิร์มแวร์ 1.5.0 และกล่องดึงภาพจากกล้องได้
            </div>
          </div>

          <!-- รอบถ่ายภาพ -->
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="text-[#5A6B63]">
              รอบถ่ายภาพตอนนี้: <b class="text-[#142820]">{{ intervalLabel }}</b>
              <span v-if="!info.camera_interval_sec || info.camera_interval_sec > 60" class="block text-[11px] text-amber-700 mt-0.5">วันเก็บข้อมูลแนะนำทุก 1 นาที</span>
            </div>
            <button
              class="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#142820] bg-[#F2F4F2] hover:bg-[#E4E8E5] cursor-pointer"
              @click="emit('edit-interval')">
              แก้รอบถ่ายภาพ
            </button>
          </div>

          <!-- ปุ่ม -->
          <div>
            <div class="text-[11px] font-bold text-[#718078] uppercase tracking-wider mb-2">
              {{ collect?.active ? 'ต่อเวลา (นับจากตอนนี้)' : 'เริ่มเก็บ' }}
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="p in PRESETS"
                :key="p.minutes"
                :disabled="saving || !device?.id_farms"
                class="rounded-2xl border border-[#E4E8E5] px-2 py-3 text-center hover:border-[#142820] hover:bg-[#F6F7F5] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                @click="setCollect(p.minutes)">
                <div class="text-sm font-black text-[#142820]">{{ p.label }}</div>
                <div class="text-[10px] text-[#718078] mt-0.5 tabular-nums">≈ {{ estimate(p.minutes).images }} ภาพ · {{ estimate(p.minutes).mb }} MB</div>
              </button>
            </div>
            <button
              v-if="collect?.active"
              :disabled="saving"
              class="mt-2 w-full rounded-2xl border border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100 px-3 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-40"
              @click="setCollect(0)">
              หยุดเก็บตอนนี้
            </button>
            <p v-if="!device?.id_farms" class="text-[11px] text-rose-700 mt-2">ผูกกล่องนี้กับฟาร์มก่อน (ปุ่มแก้ไขอุปกรณ์)</p>
          </div>

          <!-- Storage -->
          <div v-if="info.storage_used_mb != null" class="space-y-1">
            <div class="flex justify-between text-[11px] text-[#718078] tabular-nums">
              <span>พื้นที่ Storage (Supabase ฟรี)</span>
              <span>ใช้ไป {{ info.storage_used_mb.toLocaleString() }} / {{ info.storage_limit_mb.toLocaleString() }} MB</span>
            </div>
            <div class="h-1.5 rounded-full bg-[#E4E8E5] overflow-hidden">
              <div class="h-full rounded-full" :class="storagePct > 80 ? 'bg-rose-500' : 'bg-[#142820]'" :style="{ width: `${storagePct}%` }"></div>
            </div>
            <p v-if="storageTight" class="text-[11px] font-semibold text-amber-700">⚠ เก็บ 6 ชม. ({{ estimate(360).mb }} MB) จะเกินพื้นที่ที่เหลือ ดาวน์โหลดแล้วลบภาพเก่าก่อน</p>
          </div>

          <!-- ที่อยู่ไฟล์ -->
          <div v-if="info.folder" class="rounded-xl bg-[#F6F7F5] border border-[#E4E8E5] p-3 space-y-1">
            <div class="text-[11px] text-[#5A6B63]">ภาพอยู่ที่ <span class="font-mono text-[#142820] break-all">{{ info.folder }}&lt;วันที่&gt;/</span></div>
            <div class="flex items-start gap-2">
              <code class="flex-1 text-[10.5px] font-mono text-[#142820] break-all leading-relaxed">{{ downloadCommand }}</code>
              <button class="text-[#718078] hover:text-[#142820] cursor-pointer shrink-0" title="คัดลอกคำสั่งดาวน์โหลด" aria-label="คัดลอกคำสั่งดาวน์โหลด" @click="copy(downloadCommand)">
                <v-icon :icon="copied ? 'mdi-check' : 'mdi-content-copy'" size="14" />
              </button>
            </div>
          </div>
        </template>

        <p v-if="message" class="text-xs font-semibold text-emerald-700">{{ message }}</p>
        <p v-if="error" class="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{{ error }}</p>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // แถวอุปกรณ์จาก GET /api/Admin/devices (id_devices, name_devices, name_farms, id_farms)
  device: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'changed', 'edit-interval'])

const Admin = `${getNodeApiBase()}/Admin`
const PRESETS = [
  { minutes: 60, label: '1 ชม.' },
  { minutes: 180, label: '3 ชม.' },
  { minutes: 360, label: '6 ชม.' }
]
const FIRMWARE_DEFAULT_SEC = 600

const info = ref(null)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')
const copied = ref(false)
const now = ref(Date.now())
let timer = null

const collect = computed(() => info.value?.collect || null)
const remainingMin = computed(() => collect.value?.active ? Math.max(0, Math.ceil((new Date(collect.value.until).getTime() - now.value) / 60000)) : 0)
const minutesSinceStart = computed(() => collect.value?.started_at ? Math.floor((now.value - new Date(collect.value.started_at).getTime()) / 60000) : 0)
const effectiveInterval = computed(() => info.value?.camera_interval_sec || FIRMWARE_DEFAULT_SEC)
// เปิดมาเกิน 3 รอบถ่ายภาพแล้วยังไม่มีภาพ = น่าจะมีปัญหาที่กล่อง/กล้อง
const noImagesYet = computed(() => Boolean(collect.value?.active && info.value?.saved && info.value.saved.images === 0
  && minutesSinceStart.value * 60 >= effectiveInterval.value * 3))
const intervalLabel = computed(() => {
  const s = info.value?.camera_interval_sec
  if (!s) return 'ตามค่าในเฟิร์มแวร์ (ปกติ 10 นาที)'
  return s < 60 ? `ทุก ${s} วินาที` : s % 60 === 0 ? `ทุก ${s / 60} นาที` : `ทุก ${s} วินาที`
})
const estimate = (minutes) => {
  const images = Math.floor((minutes * 60) / effectiveInterval.value)
  return { images, mb: Math.round((images * (info.value?.image_kb_estimate || 300)) / 1024) }
}
const storagePct = computed(() => {
  const i = info.value
  return i?.storage_used_mb != null && i.storage_limit_mb ? Math.min(100, Math.round((i.storage_used_mb / i.storage_limit_mb) * 100)) : 0
})
const storageTight = computed(() => {
  const i = info.value
  return i?.storage_used_mb != null && i.storage_limit_mb - i.storage_used_mb < estimate(360).mb
})
const downloadCommand = computed(() => `node backend_node/scripts/download_collected.js --farm ${info.value?.id_farms || '<farm_id>'}`)

const clock = (iso) => iso ? `${new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} น.` : '-'
const dateClock = (iso) => iso
  ? `${new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}`
  : '-'
const durationText = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} ชม.${m ? ` ${m} นาที` : ''}` : `${m} นาที`
}

const headers = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const load = async () => {
  if (!props.device?.id_devices) return
  loading.value = !info.value
  try {
    const { data } = await axios.get(`${Admin}/devices/${props.device.id_devices}/collect`, { headers: headers() })
    info.value = data
    now.value = Date.now()
  } catch (err) {
    error.value = err.response?.data?.message || 'โหลดสถานะการเก็บภาพไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

const setCollect = async (minutes) => {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const { data } = await axios.post(`${Admin}/devices/${props.device.id_devices}/collect`, { minutes }, { headers: headers() })
    message.value = minutes > 0 ? `เปิดแล้ว เก็บถึง ${clock(data.collect.until)}` : 'หยุดเก็บแล้ว'
    await load()
    emit('changed', data.collect)
  } catch (err) {
    error.value = err.response?.data?.message || 'ตั้งค่าการเก็บภาพไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (e) {
    // คัดลอกไม่ได้ (เบราว์เซอร์ไม่อนุญาต) ผู้ใช้เลือกข้อความเองได้
  }
}

// เปิดอยู่: อัปเดตจำนวนภาพทุก 30 วินาที
watch(() => props.modelValue, (open) => {
  clearInterval(timer)
  if (!open) return
  info.value = null
  error.value = ''
  message.value = ''
  load()
  timer = setInterval(load, 30000)
}, { immediate: true })
onUnmounted(() => clearInterval(timer))
</script>
