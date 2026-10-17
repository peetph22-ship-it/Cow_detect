<template>
  <v-dialog v-model="internalModel" max-width="720" transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(36,67,58,0.22)] border border-[#24433a]/10 font-sans">
      
      <!-- Drawer Header -->
      <div class="bg-gradient-to-r from-[#162e27] via-[#1f3c34] to-[#24433a] text-white p-6 relative overflow-hidden">
        <!-- Ambient Glow -->
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-start justify-between relative z-10">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-[18px] bg-amber-500/20 backdrop-blur-md border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-inner flex-shrink-0">
              <v-icon icon="mdi-flask" size="26" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-xl font-black tracking-tight text-white">Barn Vision Simulator Sandbox</h3>
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                  SANDBOX (is_simulation = true)
                </span>
              </div>
              <p class="text-xs text-white/75 mt-0.5 font-medium">
                สภาพแวดล้อมจำลองพฤติกรรมโคและกล้อง Hikvision เพื่อทดสอบระบบ AI โดยไม่ต้องเชื่อมต่อฮาร์ดแวร์จริง
              </p>
            </div>
          </div>

          <!-- Close Button -->
          <button 
            type="button" 
            @click="internalModel = false" 
            class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
            <v-icon icon="mdi-close" size="18" class="text-white" />
          </button>
        </div>
      </div>

      <!-- Drawer Content -->
      <div class="p-6 md:p-8 space-y-6 bg-[#fafcfb] max-h-[75vh] overflow-y-auto">

        <!-- 1. Video Simulation Switch -->
        <div class="p-4 rounded-[22px] bg-white border border-[#e5ece9] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <v-icon icon="mdi-movie-open-play-outline" size="22" />
            </div>
            <div>
              <div class="text-xs font-bold text-[#24433a]">สตรีมวิดีโอจำลองฝูงโค (sample_barn.mp4)</div>
              <div class="text-[11px] text-[#718078]">เล่นคลิปแม่โคในคอกจำลองผ่าน FastAPI พอร์ต 8000 พร้อมกล่องตรวจจับ ByteTrack</div>
            </div>
          </div>
          <button 
            type="button"
            @click="emitSwitchToSimVideo"
            class="px-4 py-2 rounded-xl bg-[#24433a] hover:bg-[#1a322b] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto">
            <v-icon icon="mdi-play-circle-outline" size="16" />
            <span>สลับเป็นวิดีโอจำลอง</span>
          </button>
        </div>

        <!-- 2. Environmental Slider Simulation -->
        <div class="p-5 rounded-[24px] bg-white border border-[#e5ece9] shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-black uppercase tracking-wider text-[#4e6057] flex items-center gap-1.5">
              <v-icon icon="mdi-tune-vertical" size="16" class="text-amber-600" />
              <span>1. จำลองสภาพอากาศโรงเรือน (Microclimate Sliders)</span>
            </h4>
            <span class="text-[11px] font-mono font-bold bg-[#f0f4f2] text-[#4e6057] px-2.5 py-0.5 rounded-lg">
              Dynamic Real-time
            </span>
          </div>

          <!-- Temp Slider -->
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs font-bold">
              <span class="text-[#718078]">อุณหภูมิอากาศในคอก (Temperature)</span>
              <span class="font-mono text-[#24433a] font-black text-sm">{{ simTemp.toFixed(1) }} °C</span>
            </div>
            <input 
              v-model.number="simTemp" 
              type="range" 
              min="20" 
              max="42" 
              step="0.5"
              class="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          <!-- Humidity Slider -->
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs font-bold">
              <span class="text-[#718078]">ความชื้นสัมพัทธ์ (Relative Humidity)</span>
              <span class="font-mono text-sky-800 font-black text-sm">{{ simHum }} %RH</span>
            </div>
            <input 
              v-model.number="simHum" 
              type="range" 
              min="30" 
              max="99" 
              step="1"
              class="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <!-- Calculated Metrics Display -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div class="p-2.5 rounded-xl bg-[#fafcfb] border border-[#e5ece9] text-center">
              <span class="text-[10px] text-[#718078] block font-bold">NRC Raw THI</span>
              <span class="text-base font-black font-mono text-[#24433a]">{{ rawThi.toFixed(1) }}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-[#fafcfb] border border-[#e5ece9] text-center">
              <span class="text-[10px] text-[#718078] block font-bold">Thai-Relief THI</span>
              <span class="text-base font-black font-mono text-amber-700">{{ thaiThi.toFixed(1) }}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-[#fafcfb] border border-[#e5ece9] text-center">
              <span class="text-[10px] text-[#718078] block font-bold">ระดับความเสี่ยง</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-0.5" :class="riskBadgeClass">
                {{ riskLabel }}
              </span>
            </div>
            <div class="p-2.5 rounded-xl bg-[#fafcfb] border border-[#e5ece9] text-center">
              <span class="text-[10px] text-[#718078] block font-bold">สูญเสียน้ำนม (กิโล)</span>
              <span class="text-base font-black font-mono text-rose-600">{{ simMilkLoss.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Anti-Misting Rule Indicator -->
          <div 
            v-if="simHum >= 75" 
            class="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center gap-2 animate-fade-in">
            <v-icon icon="mdi-fan-alert" size="18" class="text-sky-600 shrink-0" />
            <span class="font-medium">
              🌧️ <strong>กฎป้องกันความชื้นสูง (Maejo Rule):</strong> ความชื้น {{ simHum }}% (≥75%) แนะนำ <strong>เปิดพัดลมเท่านั้น (ห้ามพ่นหมอก)</strong> เพื่อป้องกันคอกแฉะและโรคเต้านมอักเสบ
            </span>
          </div>
        </div>

        <!-- 3. Herd Posture & Behavior Sliders -->
        <div class="p-5 rounded-[24px] bg-white border border-[#e5ece9] shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-black uppercase tracking-wider text-[#4e6057] flex items-center gap-1.5">
              <v-icon icon="mdi-cow" size="18" class="text-[#24433a]" />
              <span>2. จำลองสัดส่วนพฤติกรรมฝูงโค (Herd Posture & CCI)</span>
            </h4>
            <div class="text-xs font-bold px-2.5 py-0.5 rounded-lg border" :class="cciBadgeClass">
              CCI: {{ simCci.toFixed(1) }}%
            </div>
          </div>

          <!-- Standing vs Lying Sliders -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-orange-700">ยืน (Standing %)</span>
                <span class="font-mono">{{ simStandingPct }}%</span>
              </div>
              <input 
                v-model.number="simStandingPct" 
                type="range" 
                min="0" 
                max="100" 
                class="w-full accent-orange-600 cursor-pointer"
                @input="simLyingPct = Math.max(0, 100 - simStandingPct)"
              />
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-blue-700">นอนเคี้ยวเอื้อง (Lying %)</span>
                <span class="font-mono">{{ simLyingPct }}%</span>
              </div>
              <input 
                v-model.number="simLyingPct" 
                type="range" 
                min="0" 
                max="100" 
                class="w-full accent-blue-600 cursor-pointer"
                @input="simStandingPct = Math.max(0, 100 - simLyingPct)"
              />
            </div>
          </div>

          <!-- Comfort Index Explanation -->
          <div class="p-3 rounded-xl bg-[#fafcfb] border border-[#e5ece9] text-xs text-[#718078]">
            <strong>Cow Comfort Index (CCI):</strong> โคควรนอนพักผ่อนอย่างน้อย 85% ของโคนที่ไม่ได้กำลังกินอาหาร หาก CCI ต่ำกว่า 75% แสดงว่ามีความร้อนสะสมทำให้วัวยืนแช่ระบายเหงื่อ หรือพื้นคอกแฉะไม่สบาย
          </div>
        </div>

        <!-- 4. One-Click Emergency Trigger Buttons -->
        <div class="space-y-3">
          <h4 class="text-xs font-black uppercase tracking-wider text-[#4e6057] flex items-center gap-1.5">
            <v-icon icon="mdi-bell-ring-outline" size="16" class="text-rose-600" />
            <span>3. ปุ่มทดสอบระบบแจ้งเตือนฉุกเฉิน (One-Click Anomaly Triggers)</span>
          </h4>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            <!-- Button 1: Prolonged Standing -->
            <button 
              type="button" 
              @click="triggerProlongedStandingAlert" 
              :disabled="isTriggering"
              class="p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition-all cursor-pointer group active:scale-95 disabled:opacity-50">
              <div class="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <v-icon icon="mdi-timer-alert-outline" size="18" />
              </div>
              <div class="text-xs font-black text-amber-900">วัวยืนแช่นานเกิน 3 ชม.</div>
              <div class="text-[10px] text-amber-800/80 mt-0.5">Prolonged Standing (&gt;180 นาที)</div>
            </button>

            <!-- Button 2: Downer Cow -->
            <button 
              type="button" 
              @click="triggerDownerCowAlert" 
              :disabled="isTriggering"
              class="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left transition-all cursor-pointer group active:scale-95 disabled:opacity-50">
              <div class="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <v-icon icon="mdi-alert-octagon" size="18" />
              </div>
              <div class="text-xs font-black text-rose-900">แม่โคนอนนิ่งไม่ลุก</div>
              <div class="text-[10px] text-rose-800/80 mt-0.5">Downer Cow (&gt;240 นาที)</div>
            </button>

            <!-- Button 3: Rainy Heat Stress -->
            <button 
              type="button" 
              @click="triggerRainyHeatStressAlert" 
              :disabled="isTriggering"
              class="p-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-left transition-all cursor-pointer group active:scale-95 disabled:opacity-50">
              <div class="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <v-icon icon="mdi-weather-pouring" size="18" />
              </div>
              <div class="text-xs font-black text-sky-900">ความร้อนสะสมฤดูฝน</div>
              <div class="text-[10px] text-sky-800/80 mt-0.5">RH &gt; 75% + THI &ge; 84.0</div>
            </button>

          </div>
        </div>

      </div>

      <!-- Drawer Footer -->
      <div class="p-4 bg-white border-t border-[#e5ece9] flex items-center justify-between">
        <span class="text-[11px] text-[#718078]">
          ข้อมูลจำลองจะไม่ถูกนำไปคำนวณในมุมมองสถิติจริงของเกษตรกร (แยกผ่าน is_simulation = true)
        </span>
        <button 
          type="button" 
          @click="internalModel = false" 
          class="px-5 py-2 rounded-xl bg-[#24433a] hover:bg-[#1a322b] text-white text-xs font-bold transition-all cursor-pointer">
          ปิดหน้าต่าง
        </button>
      </div>

    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
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
  }
})

const emit = defineEmits(['update:modelValue', 'alert-triggered', 'switch-simulation-video'])

const internalModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isTriggering = ref(false)

// Environmental Sim Values
const simTemp = ref(32.0)
const simHum = ref(82)

// Posture Sim Values
const simStandingPct = ref(65)
const simLyingPct = ref(35)

// Calculations
const rawThi = computed(() => {
  const t = simTemp.value
  const rh = simHum.value
  return (1.8 * t + 32) - (0.55 - 0.0055 * rh) * (1.8 * t - 26)
})

const thaiThi = computed(() => {
  const raw = rawThi.value
  if (simTemp.value < 27.5) {
    return raw - 0.6 * (27.5 - simTemp.value)
  }
  return raw
})

const riskLabel = computed(() => {
  const val = thaiThi.value
  if (val >= 84.0) return 'วิกฤต (Severe)'
  if (val >= 80.0) return 'กระทบปานกลาง'
  if (val >= 76.0) return 'เริ่มเฝ้าระวัง'
  return 'ปกติ (Normal)'
})

const riskBadgeClass = computed(() => {
  const val = thaiThi.value
  if (val >= 84.0) return 'bg-rose-100 text-rose-800'
  if (val >= 80.0) return 'bg-orange-100 text-orange-800'
  if (val >= 76.0) return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-800'
})

const simMilkLoss = computed(() => {
  const thi = thaiThi.value
  return thi > 76.0 ? Math.max(0.0, (thi - 76.0) * 0.45) : 0.0
})

const simCci = computed(() => {
  const total = simLyingPct.value + simStandingPct.value
  if (total === 0) return 85.0
  return (simLyingPct.value / total) * 100
})

const cciBadgeClass = computed(() => {
  if (simCci.value >= 85) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (simCci.value >= 75) return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
})

const getToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

const emitSwitchToSimVideo = () => {
  emit('switch-simulation-video')
  internalModel.value = false
}

// 1. Prolonged Standing Alert
const triggerProlongedStandingAlert = async () => {
  if (!props.farmId || isTriggering.value) return
  isTriggering.value = true
  try {
    const token = getToken()
    const payload = {
      alert_type: 'prolonged_standing',
      severity: 'severe',
      track_id: 102,
      duration_minutes: 195,
      message_th: 'ตรวจพบโคหมายเลข #102 ยืนแช่ต่อเนื่อง 195 นาทีโดยไม่ยอมนอนพัก เสี่ยงต่อโรคกีบและความเครียดรุนแรง',
      thi_at_event: parseFloat(thaiThi.value.toFixed(1)),
      is_simulation: true
    }
    const res = await axios.post(`${Admin}/farms/${props.farmId}/cameras/alerts`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    emit('alert-triggered', res.data.alert)
    internalModel.value = false
  } catch (e) {
    console.error('Trigger alert failed:', e)
  } finally {
    isTriggering.value = false
  }
}

// 2. Downer Cow Alert
const triggerDownerCowAlert = async () => {
  if (!props.farmId || isTriggering.value) return
  isTriggering.value = true
  try {
    const token = getToken()
    const payload = {
      alert_type: 'downer_cow',
      severity: 'severe',
      track_id: 105,
      duration_minutes: 260,
      message_th: 'ตรวจพบโคหมายเลข #105 นอนนิ่งต่อเนื่อง 260 นาที ไม่ลุกมากินอาหารหรือดื่มน้ำ เสี่ยงภาวะไข้น้ำนมหรือเจ็บป่วยรุนแรง',
      thi_at_event: parseFloat(thaiThi.value.toFixed(1)),
      is_simulation: true
    }
    const res = await axios.post(`${Admin}/farms/${props.farmId}/cameras/alerts`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    emit('alert-triggered', res.data.alert)
    internalModel.value = false
  } catch (e) {
    console.error('Trigger alert failed:', e)
  } finally {
    isTriggering.value = false
  }
}

// 3. Rainy Heat Stress Alert
const triggerRainyHeatStressAlert = async () => {
  if (!props.farmId || isTriggering.value) return
  isTriggering.value = true
  try {
    const token = getToken()
    const payload = {
      alert_type: 'severe_heat_stress',
      severity: 'severe',
      duration_minutes: 120,
      message_th: 'ตรวจพบวิกฤตความร้อนสะสม THI 85.5 ท่ามกลางความชื้น 86% โคหอบรุนแรง (ห้ามพ่นหมอกเด็ดขาด ให้เปิดพัดลมเป่าระบายอากาศสูงสุด)',
      thi_at_event: 85.5,
      is_simulation: true
    }
    const res = await axios.post(`${Admin}/farms/${props.farmId}/cameras/alerts`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    emit('alert-triggered', res.data.alert)
    internalModel.value = false
  } catch (e) {
    console.error('Trigger alert failed:', e)
  } finally {
    isTriggering.value = false
  }
}
</script>
