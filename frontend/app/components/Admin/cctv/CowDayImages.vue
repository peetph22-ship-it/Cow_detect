<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h4 class="text-sm font-black text-[#24433a]">ภาพยืนยันรายชั่วโมง <span class="font-medium text-[#718078]">· กรอบสีเหลือง = วัวที่ระบบติดตาม</span></h4>
      <span v-if="images.length" class="text-[11px] text-[#718078]">{{ withTarget }}/{{ images.length }} ภาพเจอวัวตัวนี้</span>
    </div>

    <div v-if="loading" class="h-28 rounded-2xl bg-[#f8faf9] animate-pulse"></div>
    <p v-else-if="error" class="text-xs font-bold text-rose-600">{{ error }}</p>
    <p v-else-if="!images.length" class="text-xs text-[#718078] bg-[#f8faf9] rounded-2xl px-4 py-3">วันนี้ไม่มีภาพตัวอย่างจากกล้อง (ระบบเก็บไว้ชั่วโมงละ 1 ภาพ)</p>

    <div v-else class="flex gap-2.5 overflow-x-auto pb-2 snap-x">
      <button v-for="img in images" :key="img.source" type="button"
        class="relative shrink-0 w-44 rounded-xl overflow-hidden border border-[#e5ece9] bg-black snap-start cursor-pointer text-left"
        @click="open = img">
        <div class="relative">
          <img :src="img.image_url" :alt="`ภาพเวลา ${img.hour_label}`" class="w-full h-auto block" loading="lazy" />
          <div v-if="img.target?.box" class="absolute border-[3px] border-[#facc15] rounded-sm" :style="boxStyle(img.target.box)"></div>
        </div>
        <div class="flex items-center justify-between gap-1 px-2 py-1 bg-white text-[10px]">
          <span class="font-black text-[#24433a] tabular-nums">{{ img.hour_label }}<template v-if="img.target?.cow_track_id"> · #{{ img.target.cow_track_id }}</template></span>
          <span class="font-bold truncate" :style="{ color: badge(img).color }">{{ badge(img).text }}</span>
        </div>
      </button>
    </div>
    <p v-if="images.length" class="text-[10px] text-[#718078]">คลิกภาพเพื่อดูใหญ่ · ถ้ากรอบสีเหลืองไม่ได้อยู่บนวัวตัวที่เลือก ให้เลือกตัวใหม่ (ระบบจะคำนวณย้อนหลังจากภาพที่เลือก)</p>

    <v-dialog :model-value="Boolean(open)" max-width="960" @update:model-value="(v) => { if (!v) open = null }">
      <div v-if="open" class="bg-white rounded-[24px] overflow-hidden">
        <div class="relative bg-black">
          <img :src="open.image_url" :alt="`ภาพเวลา ${open.hour_label}`" class="w-full h-auto block" />
          <div v-for="(b, i) in open.boxes" :key="i" class="absolute border border-white/60 rounded-sm" :style="boxStyle(b)">
            <span v-if="b.id" class="absolute top-0 left-0 px-1 text-[10px] font-bold bg-black/60 text-white">#{{ b.id }}</span>
          </div>
          <div v-if="open.target?.box" class="absolute border-4 border-[#facc15] rounded-sm" :style="boxStyle(open.target.box)">
            <span class="absolute -top-6 left-[-4px] px-1.5 py-0.5 rounded-t text-[11px] font-black bg-[#facc15] text-[#24433a] whitespace-nowrap">
              {{ cowLabel }}<template v-if="open.target.cow_track_id"> (#{{ open.target.cow_track_id }})</template> · {{ BEHAVIOR_TH[open.target.behavior] || open.target.behavior }}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
          <span class="font-bold text-[#24433a]">{{ open.hour_label }} น. · ถ่ายเมื่อ {{ clock(open.captured_at) }}</span>
          <span class="text-[#4e6057]">
            {{ badge(open).text }}<template v-if="open.target?.match_score != null"> · คะแนนจับคู่ {{ open.target.match_score.toFixed(2) }}</template>
            · กรอบสีขาว = วัวตัวอื่นที่โมเดลเห็น · #เลข = เลขวัวที่ระบบตั้ง (คงที่ข้ามภาพ ไม่ใช่เบอร์หู)
          </span>
          <button type="button" class="px-3 py-1.5 rounded-lg font-bold bg-[#f0f4f2] hover:bg-[#e5ece9] cursor-pointer" @click="open = null">ปิด</button>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'

const props = defineProps({
  farmId: { type: String, required: true },
  date: { type: String, required: true },
  // เปลี่ยนเมื่อเลือกวัวใหม่ เพื่อโหลดผลใหม่
  cowId: { type: String, default: '' },
  cow: { type: Object, default: null }
})

const Admin = `${getNodeApiBase()}/Admin`
const BEHAVIOR_TH = { lying: 'นอน', standing: 'ยืน', feeding: 'กิน', drinking: 'ดื่มน้ำ', not_visible: 'ไม่เห็นในภาพ' }
const COLOR = { lying: '#3b82f6', standing: '#f97316', feeding: '#10b981', drinking: '#06b6d4' }

const images = ref([])
const loading = ref(false)
const error = ref('')
const open = ref(null)

const cowLabel = computed(() => (props.cow?.tag_id ? `วัว #${props.cow.tag_id}` : 'วัวเป้าหมาย'))
const withTarget = computed(() => images.value.filter(i => i.target?.box).length)
const boxStyle = (b) => ({ left: `${b.x1 * 100}%`, top: `${b.y1 * 100}%`, width: `${(b.x2 - b.x1) * 100}%`, height: `${(b.y2 - b.y1) * 100}%` })
const badge = (img) => {
  if (!img.target) return { text: 'ไม่มีผลติดตาม', color: '#a6b5aa' }
  if (!img.target.box) return { text: 'ไม่เห็นในภาพ', color: '#d97706' }
  return { text: BEHAVIOR_TH[img.target.behavior] || img.target.behavior, color: COLOR[img.target.behavior] || '#24433a' }
}
const clock = (iso) => new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(11, 19)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cow-behavior/images`, {
      params: { date: props.date },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    images.value = res.data?.images || []
  } catch (err) {
    images.value = []
    error.value = err.response?.data?.message || 'ดึงภาพไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}
watch(() => [props.farmId, props.date, props.cowId], load, { immediate: true })
</script>
