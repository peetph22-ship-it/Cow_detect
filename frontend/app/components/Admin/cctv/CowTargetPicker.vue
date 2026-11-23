<template>
  <div>
    <!-- สถานะการติดตาม -->
    <div v-if="status && !status.ready" class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
      ระบบเลือกวัวยังไม่พร้อม: ต้องรัน <code class="font-mono">{{ status.migration }}</code> ใน Supabase ก่อน
    </div>
    <div v-else-if="status" class="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 border"
      :class="statusTone.box">
      <div class="flex items-center gap-2.5 min-w-0">
        <v-icon :icon="statusTone.icon" size="20" :class="statusTone.icon_class" />
        <div class="text-xs min-w-0">
          <p class="font-black text-[#24433a]">{{ statusTitle }}</p>
          <p v-if="statusDetail" class="text-[#718078] font-medium">{{ statusDetail }}</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button v-if="target?.active" type="button" class="px-3 py-1.5 rounded-xl text-xs font-bold text-[#718078] hover:bg-white/70 cursor-pointer" :disabled="busy" @click="stop">
          เลิกติดตาม
        </button>
        <button type="button" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#24433a] text-white hover:bg-[#1C362B] cursor-pointer flex items-center gap-1.5" @click="openDialog">
          <v-icon icon="mdi-cursor-default-click-outline" size="16" />
          {{ target ? (target.active ? 'เปลี่ยนวัว' : 'เลือกวัวอีกครั้ง') : 'เลือกวัวที่จะติดตาม' }}
        </button>
      </div>
    </div>

    <!-- เลือกวัวโดยคลิกกรอบในภาพ -->
    <v-dialog v-model="dialog" max-width="760" scrollable>
      <div class="bg-white rounded-[28px] p-5 md:p-6 space-y-4 overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-black text-[#24433a]">เลือกวัวที่จะติดตาม</h3>
            <p class="text-xs text-[#718078] font-medium">คลิกที่กรอบของวัวในภาพ แล้วกรอกหมายเลขหู ระบบจะติดตามต่อจากภาพนั้นจนถึงปัจจุบัน</p>
          </div>
          <button type="button" class="w-8 h-8 rounded-xl hover:bg-[#f0f4f2] flex items-center justify-center cursor-pointer" aria-label="ปิด" @click="dialog = false">
            <v-icon icon="mdi-close" size="18" />
          </button>
        </div>

        <div class="flex items-center gap-1.5 bg-[#f0f4f2] p-1 rounded-xl w-fit">
          <button v-for="t in [{ key: 'latest', label: 'ภาพล่าสุด' }, { key: 'past', label: 'ภาพย้อนหลัง' }]" :key="t.key" type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
            :class="tab === t.key ? 'bg-[#24433a] text-white' : 'text-[#4e6057] hover:text-[#24433a]'"
            @click="tab = t.key">{{ t.label }}</button>
        </div>

        <!-- ภาพย้อนหลัง: เลือกวันและชั่วโมง -->
        <div v-if="tab === 'past'" class="space-y-2">
          <input v-model="pastDate" type="date" :max="todayBkk" aria-label="วันที่ของภาพย้อนหลัง"
            class="h-9 px-3 rounded-xl bg-[#f0f4f2] text-sm font-bold text-[#24433a] border-0 outline-none" />
          <p v-if="pastLoading" class="text-xs text-[#718078]">กำลังโหลดภาพ...</p>
          <p v-else-if="!pastImages.length" class="text-xs text-[#718078]">ไม่มีภาพตัวอย่างในวันนี้ (ระบบเก็บภาพชั่วโมงละ 1 ภาพ)</p>
          <div v-else class="flex flex-wrap gap-1.5">
            <button v-for="img in pastImages" :key="img.source" type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              :class="pastSource === img.source ? 'bg-[#24433a] text-white border-[#24433a]' : 'bg-white text-[#4e6057] border-[#e5ece9]'"
              @click="pastSource = img.source">{{ img.hour_label }}</button>
          </div>
        </div>

        <!-- ภาพ + กรอบที่คลิกได้ -->
        <div v-if="image" class="space-y-1.5">
          <div class="relative w-full rounded-2xl overflow-hidden bg-black/5">
            <img :src="image.image_url" alt="ภาพจากกล้อง" class="w-full block select-none" draggable="false" />
            <button v-for="(b, i) in image.boxes" :key="i" type="button"
              class="absolute rounded-md cursor-pointer transition-all"
              :style="boxStyle(b, i)"
              :aria-label="`เลือกวัว ${b.id ? '#' + b.id : 'ตัวที่ ' + (i + 1)} (${CLASS_TH[b.cls] || b.cls})`"
              @click="selected = i">
              <span class="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap"
                :style="{ background: selected === i ? '#24433a' : CLASS_COLOR[b.cls] || '#64748b' }">
                {{ selected === i ? 'ตัวที่เลือก' : `${b.id ? `#${b.id} ` : ''}${CLASS_TH[b.cls] || b.cls}` }}
              </span>
            </button>
          </div>
          <p class="text-[11px] text-[#718078]">
            ถ่ายเมื่อ {{ fmtDateTime(image.captured_at) }} · พบวัว {{ image.boxes.length }} ตัว
            <button v-if="tab === 'latest'" type="button" class="ml-1 font-bold text-[#24433a] underline cursor-pointer" @click="loadStatus">โหลดภาพล่าสุดใหม่</button>
          </p>
        </div>
        <div v-else-if="tab === 'latest'" class="py-10 text-center text-xs text-[#718078] bg-[#f8faf9] rounded-2xl">
          ยังไม่มีภาพล่าสุดจากกล้อง (ภาพจะขึ้นหลังกล้องส่งภาพเข้ามา) ลองเลือกจากภาพย้อนหลัง
        </div>
        <p v-if="image && !image.boxes.length" class="text-xs text-amber-700">ภาพนี้ไม่พบวัว ลองเลือกภาพอื่น</p>

        <!-- หมายเลขหูและชื่อ -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#24433a] mb-1">หมายเลขหู *</label>
            <input v-model="tagId" type="text" maxlength="50" placeholder="เช่น TH-012"
              class="w-full px-3 py-2 bg-[#F6F7F5] border border-[#E4E8E5] rounded-xl text-sm font-bold text-[#24433a] focus:outline-none focus:border-[#24433a]" />
          </div>
          <div>
            <label class="block text-xs font-bold text-[#24433a] mb-1">ชื่อเรียก (ไม่บังคับ)</label>
            <input v-model="cowName" type="text" maxlength="100" placeholder="เช่น มะลิ"
              class="w-full px-3 py-2 bg-[#F6F7F5] border border-[#E4E8E5] rounded-xl text-sm text-[#24433a] focus:outline-none focus:border-[#24433a]" />
          </div>
        </div>

        <p v-if="message" class="text-xs font-bold" :class="messageOk ? 'text-emerald-700' : 'text-rose-600'">{{ message }}</p>

        <div class="flex items-center justify-end gap-2">
          <button type="button" class="px-4 py-2 rounded-xl text-xs font-bold text-[#718078] hover:bg-[#f0f4f2] cursor-pointer" @click="dialog = false">ยกเลิก</button>
          <button type="button" :disabled="busy || selected == null || !tagId.trim()"
            class="px-5 py-2 rounded-xl text-xs font-bold bg-[#24433a] text-white hover:bg-[#1C362B] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            @click="confirm">
            {{ busy ? 'กำลังบันทึกและคำนวณย้อนหลัง...' : 'เริ่มติดตามวัวตัวนี้' }}
          </button>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'

const props = defineProps({
  farmId: { type: String, required: true }
})
const emit = defineEmits(['changed'])

// อ่าน API base ตอน setup เท่านั้น ห้ามเรียกใน callback/setInterval
const Admin = `${getNodeApiBase()}/Admin`

const BKK_MS = 7 * 3600e3
const todayBkk = new Date(Date.now() + BKK_MS).toISOString().slice(0, 10)
const bkkDate = (iso) => new Date(new Date(iso).getTime() + BKK_MS).toISOString().slice(0, 10)
const fmtDateTime = (iso) => {
  if (!iso) return '-'
  const d = new Date(new Date(iso).getTime() + BKK_MS).toISOString()
  return `${d.slice(8, 10)}/${d.slice(5, 7)} ${d.slice(11, 16)} น.`
}

const CLASS_TH = { 'lying down': 'นอน', lying: 'นอน', standing: 'ยืน', feeding: 'กิน', drinking: 'ดื่ม' }
const CLASS_COLOR = { 'lying down': '#3b82f6', lying: '#3b82f6', standing: '#f97316', feeding: '#10b981', drinking: '#06b6d4' }

const status = ref(null)
const busy = ref(false)
const dialog = ref(false)
const tab = ref('latest')
const pastDate = ref(todayBkk)
const pastImages = ref([])
const pastSource = ref('')
const pastLoading = ref(false)
const selected = ref(null)
const tagId = ref('')
const cowName = ref('')
const message = ref('')
const messageOk = ref(false)

const target = computed(() => status.value?.target || null)
const image = computed(() => (tab.value === 'latest'
  ? status.value?.latest || null
  : pastImages.value.find(i => i.source === pastSource.value) || null))

const statusTone = computed(() => {
  if (!target.value) return { box: 'bg-[#f8faf9] border-[#e5ece9]', icon: 'mdi-cow', icon_class: 'text-[#a6b5aa]' }
  if (target.value.active) return { box: 'bg-emerald-50/70 border-emerald-200', icon: 'mdi-crosshairs-gps', icon_class: 'text-emerald-600' }
  return { box: 'bg-amber-50 border-amber-200', icon: 'mdi-alert-circle-outline', icon_class: 'text-amber-600' }
})
const cowLabel = (c) => `วัวหมายเลข ${c.tag_id}${c.name ? ` (${c.name})` : ''}`
const statusTitle = computed(() => {
  const t = target.value
  if (!t) return 'ยังไม่ได้เลือกวัวที่จะติดตาม'
  if (t.active) return `กำลังติดตาม ${cowLabel(t.cow)}`
  if (t.lost_at) return `หลุดการติดตาม ${cowLabel(t.cow)}`
  return `เลิกติดตาม ${cowLabel(t.cow)} แล้ว`
})
const statusDetail = computed(() => {
  const t = target.value
  if (!t) return 'คลิกเลือกวัวจากภาพล่าสุดหรือภาพย้อนหลัง'
  const parts = [`เริ่มจากภาพ ${fmtDateTime(t.seed_at)}`]
  if (t.last_seen_at) parts.push(`เห็นล่าสุด ${fmtDateTime(t.last_seen_at)}`)
  if (!t.active && t.lost_at) parts.push(`หาวัวในภาพไม่เจอเกิน 15 นาที เมื่อ ${fmtDateTime(t.lost_at)}`)
  return parts.join(' · ')
})

const boxStyle = (b, i) => {
  const color = selected.value === i ? '#24433a' : CLASS_COLOR[b.cls] || '#64748b'
  return {
    left: `${b.x1 * 100}%`, top: `${b.y1 * 100}%`,
    width: `${(b.x2 - b.x1) * 100}%`, height: `${(b.y2 - b.y1) * 100}%`,
    border: `${selected.value === i ? 4 : 2}px solid ${color}`,
    background: selected.value === i ? 'rgba(36,67,58,0.18)' : 'transparent'
  }
}

const headers = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const loadStatus = async () => {
  try {
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cow-target`, { headers: headers() })
    status.value = res.data
  } catch (err) {
    status.value = null
  }
}

const loadPast = async () => {
  pastLoading.value = true
  pastImages.value = []
  try {
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cow-target/images`, { params: { date: pastDate.value }, headers: headers() })
    pastImages.value = res.data?.images || []
    pastSource.value = pastImages.value[0]?.source || ''
  } catch (err) {
    pastImages.value = []
  } finally {
    pastLoading.value = false
  }
}

const openDialog = async () => {
  message.value = ''
  selected.value = null
  tagId.value = target.value?.cow?.tag_id || ''
  cowName.value = target.value?.cow?.name || ''
  tab.value = 'latest'
  dialog.value = true
  await loadStatus()
}

const confirm = async () => {
  if (!image.value || selected.value == null) return
  busy.value = true
  message.value = ''
  try {
    const res = await axios.post(`${Admin}/farms/${props.farmId}/cow-target`, {
      source: image.value.source,
      captured_at: image.value.captured_at,
      box_index: selected.value,
      tag_id: tagId.value.trim(),
      name: cowName.value.trim()
    }, { headers: headers() })
    const r = res.data
    messageOk.value = true
    message.value = `เริ่มติดตาม ${cowLabel(r.cow)} แล้ว · คำนวณย้อนหลัง ${r.processed} ภาพ` + (r.lostAt ? ` · หลุดการติดตามเมื่อ ${fmtDateTime(r.lostAt)}` : '')
    await loadStatus()
    emit('changed', bkkDate(image.value.captured_at))
    setTimeout(() => { dialog.value = false }, 1200)
  } catch (err) {
    messageOk.value = false
    message.value = err.response?.data?.message || 'บันทึกการเลือกวัวไม่สำเร็จ'
    if (err.response?.status === 409 && tab.value === 'latest') await loadStatus()
  } finally {
    busy.value = false
  }
}

const stop = async () => {
  if (!confirmStop()) return
  busy.value = true
  try {
    await axios.post(`${Admin}/farms/${props.farmId}/cow-target/stop`, {}, { headers: headers() })
    await loadStatus()
    emit('changed', null)
  } finally {
    busy.value = false
  }
}
const confirmStop = () => typeof window === 'undefined' || window.confirm('เลิกติดตามวัวตัวนี้? ข้อมูลที่บันทึกแล้วยังอยู่')

watch(tab, (t) => { selected.value = null; if (t === 'past') loadPast() })
watch(pastDate, () => { selected.value = null; loadPast() })
watch(pastSource, () => { selected.value = null })
watch(() => props.farmId, loadStatus)
onMounted(loadStatus)
</script>
