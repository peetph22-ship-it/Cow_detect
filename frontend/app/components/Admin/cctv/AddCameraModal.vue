<template>
  <v-dialog v-model="internalModel" max-width="640" persistent transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(36,67,58,0.22)] border border-[#24433a]/10 font-sans">
      
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-[#24433a] via-[#1f3c34] to-[#162e27] text-white p-6 relative overflow-hidden">
        <!-- Ambient Glow -->
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-[#d87939]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-start justify-between relative z-10">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-[18px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <v-icon icon="mdi-cctv" size="26" class="text-white" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-black tracking-tight text-white">ผูกกล้องวงจรปิด Hikvision</h3>
                <span class="px-2.5 py-0.5 rounded-full bg-[#d87939]/20 text-[#f59e0b] text-[10px] font-bold border border-[#d87939]/30 uppercase tracking-wider">
                  RTSP DUAL-STREAM
                </span>
              </div>
              <p class="text-xs text-white/75 mt-0.5 font-medium">
                ลงทะเบียนกล้อง IP ประจำฟาร์มเพื่อดึงภาพตรวจจับพฤติกรรมโคนมด้วย YOLO26 + ByteTrack
              </p>
            </div>
          </div>

          <!-- Close Button -->
          <button 
            type="button" 
            @click="closeModal" 
            :disabled="isLoading"
            class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
            <v-icon icon="mdi-close" size="18" class="text-white" />
          </button>
        </div>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="submitCamera" class="p-6 md:p-8 space-y-5 bg-[#fafcfb] max-h-[75vh] overflow-y-auto">
        
        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[16px] flex items-center gap-2.5 animate-fade-in">
          <v-icon icon="mdi-alert-circle-outline" size="18" class="text-rose-500 shrink-0" />
          <span class="font-medium">{{ errorMessage }}</span>
        </div>

        <!-- 1. ชื่อกล้อง & ยูนิตโรงเรือน -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              ชื่อกล้อง / ตำแหน่งติดตั้ง <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="form.camera_name" 
              type="text" 
              required
              placeholder="เช่น กล้องโรงเรือน 1 - โซนคอกนอน" 
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              ยูนิตโรงเรือน (Barn Unit)
            </label>
            <input 
              v-model="form.barn_unit" 
              type="text" 
              placeholder="Main Barn Unit 1" 
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all"
            />
          </div>
        </div>

        <!-- 2. ยี่ห้อ & รุ่นกล้อง -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              ยี่ห้อกล้อง (Brand)
            </label>
            <select 
              v-model="form.brand" 
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all cursor-pointer">
              <option value="Hikvision">Hikvision (แนะนำสำหรับการสตรีม RTSP)</option>
              <option value="Dahua">Dahua</option>
              <option value="Uniview">Uniview</option>
              <option value="Generic RTSP">Generic RTSP / ONVIF</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              รุ่นกล้อง (Model)
            </label>
            <input 
              v-model="form.model" 
              type="text" 
              placeholder="เช่น DS-2CD2143G2-I" 
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all"
            />
          </div>
        </div>

        <!-- 3. ข้อมูลเครือข่าย IP & พอร์ต -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              หมายเลข IP ในเครือข่าย <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="form.ip_address" 
              type="text" 
              required
              placeholder="192.168.1.108" 
              class="w-full font-mono bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              พอร์ต RTSP
            </label>
            <input 
              v-model.number="form.rtsp_port" 
              type="number" 
              placeholder="554" 
              class="w-full font-mono bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all"
            />
          </div>
        </div>

        <!-- 4. ข้อมูลการยืนยันตัวตน (Credentials) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              ชื่อผู้ใช้ (Username) <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="form.username" 
              type="text" 
              required
              placeholder="admin" 
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              รหัสผ่าน (Password) <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="form.password" 
              type="password" 
              required
              placeholder="••••••••" 
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              ช่องสัญญาณ (Channel)
            </label>
            <input 
              v-model.number="form.channel_no" 
              type="number" 
              min="1" 
              max="64"
              placeholder="1" 
              class="w-full font-mono bg-white border border-[#e5ece9] rounded-[16px] px-3.5 py-2.5 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all"
            />
          </div>
        </div>

        <!-- 5. Simulation Sandbox Flag Checkbox -->
        <div class="p-3.5 rounded-[18px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <v-icon icon="mdi-flask-outline" size="20" class="text-amber-700" />
            <div>
              <div class="text-xs font-bold text-amber-900">โหมดจำลองกล้องเสมือน (Simulation Sandbox)</div>
              <div class="text-[11px] text-amber-800/80">ใช้ทดสอบสตรีมวิดีโอจำลองก่อนมีกล้องจริง (is_simulation = true)</div>
            </div>
          </div>
          <input 
            v-model="form.is_simulation" 
            type="checkbox" 
            class="w-5 h-5 rounded text-[#24433a] focus:ring-[#24433a] cursor-pointer"
          />
        </div>

        <!-- 6. Hikvision Dual-Stream URL Auto-Generator Preview -->
        <div class="p-4 rounded-[20px] bg-[#142820] text-white space-y-2.5 font-mono text-xs">
          <div class="flex items-center justify-between text-white/70 text-[11px]">
            <span class="font-sans font-bold flex items-center gap-1.5">
              <v-icon icon="mdi-link-variant" size="14" class="text-emerald-400" />
              <span>Hikvision Dual-Stream Protocol Preview</span>
            </span>
            <span class="text-emerald-400 text-[10px]">Auto-Generated</span>
          </div>

          <!-- Main Stream (1080p for Live Viewing) -->
          <div class="bg-black/40 p-2.5 rounded-xl border border-white/10 space-y-1">
            <div class="text-[10px] text-white/50 uppercase">Main Stream (1080p สำหรับแสดงผลสด):</div>
            <div class="text-emerald-300 break-all select-all text-[11px]">
              {{ mainStreamPreview }}
            </div>
          </div>

          <!-- Sub Stream (360p for AI Inference) -->
          <div class="bg-black/40 p-2.5 rounded-xl border border-white/10 space-y-1">
            <div class="text-[10px] text-white/50 uppercase">Sub Stream (360p สำหรับ YOLO AI Inference - ประหยัด CPU >70%):</div>
            <div class="text-amber-300 break-all select-all text-[11px]">
              {{ subStreamPreview }}
            </div>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="pt-3 flex items-center justify-end gap-3 border-t border-[#e5ece9]">
          <button 
            type="button" 
            @click="closeModal" 
            :disabled="isLoading"
            class="px-5 py-2.5 rounded-[16px] border border-[#e5ece9] text-[#718078] hover:text-[#24433a] hover:bg-[#f0f4f2] text-xs font-bold transition-all cursor-pointer">
            ยกเลิก
          </button>
          
          <button 
            type="submit" 
            :disabled="isLoading"
            class="px-6 py-2.5 rounded-[16px] bg-[#24433a] hover:bg-[#1a322b] text-white text-xs font-black shadow-[0_4px_14px_rgba(36,67,58,0.2)] hover:shadow-[0_6px_20px_rgba(36,67,58,0.3)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <v-icon v-if="isLoading" icon="mdi-loading" size="16" class="animate-spin" />
            <v-icon v-else icon="mdi-check-circle-outline" size="16" />
            <span>{{ isLoading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกและผูกกล้อง' }}</span>
          </button>
        </div>

      </form>

    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Admin } from '~/API/baseAPI'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  farmId: {
    type: String,
    required: true
  },
  farm: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'created'])

const internalModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isLoading = ref(false)
const errorMessage = ref('')

const form = ref({
  camera_name: '',
  barn_unit: 'Main Barn Unit 1',
  brand: 'Hikvision',
  model: 'DS-2CD2143G2-I',
  ip_address: '192.168.1.108',
  rtsp_port: 554,
  http_port: 80,
  username: 'admin',
  password: '',
  channel_no: 1,
  is_simulation: false
})

const mainStreamPreview = computed(() => {
  const user = form.value.username || 'admin'
  const pass = form.value.password || 'password'
  const ip = form.value.ip_address || '192.168.1.108'
  const port = form.value.rtsp_port || 554
  const ch = form.value.channel_no || 1
  return `rtsp://${user}:${pass}@${ip}:${port}/Streaming/Channels/${ch}01`
})

const subStreamPreview = computed(() => {
  const user = form.value.username || 'admin'
  const pass = form.value.password || 'password'
  const ip = form.value.ip_address || '192.168.1.108'
  const port = form.value.rtsp_port || 554
  const ch = form.value.channel_no || 1
  return `rtsp://${user}:${pass}@${ip}:${port}/Streaming/Channels/${ch}02`
})

const resetForm = () => {
  form.value = {
    camera_name: props.farm?.name_farms ? `กล้อง ${props.farm.name_farms} - คอกหลัก` : 'กล้องโรงเรือน 1',
    barn_unit: 'Main Barn Unit 1',
    brand: 'Hikvision',
    model: 'DS-2CD2143G2-I',
    ip_address: '192.168.1.108',
    rtsp_port: 554,
    http_port: 80,
    username: 'admin',
    password: '',
    channel_no: 1,
    is_simulation: false
  }
  errorMessage.value = ''
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

const closeModal = () => {
  internalModel.value = false
}

const getToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

const submitCamera = async () => {
  if (!props.farmId) return
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = getToken()
    const payload = {
      ...form.value,
      main_stream_url: mainStreamPreview.value,
      sub_stream_url: subStreamPreview.value
    }

    const res = await axios.post(`${Admin}/farms/${props.farmId}/cameras`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })

    if (res.data && res.data.success) {
      emit('created', res.data.camera)
      closeModal()
    } else {
      errorMessage.value = res.data?.message || 'ไม่สามารถบันทึกข้อมูลกล้องได้'
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
  } finally {
    isLoading.value = false
  }
}
</script>
