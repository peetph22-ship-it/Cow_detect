<template>
  <div class="min-h-screen bg-[#F6F7F5] font-sans text-[#142820] pb-16 text-base">

    <!-- หัวหน้าจอ: ชื่อฟาร์ม + ออกจากระบบ (ไม่มีปุ่มแอดมินสำหรับเกษตรกร) -->
    <header class="bg-[#142820] text-white px-4 py-4 sticky top-0 z-40 shadow-md">
      <div class="max-w-3xl mx-auto flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-11 h-11 rounded-2xl bg-[#D87939] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-cow" size="26" />
          </div>
          <div class="min-w-0">
            <h1 class="text-lg font-black leading-tight truncate">{{ farm?.name || 'CowCare AI' }}</h1>
            <p class="text-sm text-[#F2BD7C] font-medium truncate">{{ farm?.barn_unit || 'สำหรับเกษตรกร' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <NuxtLink
            v-if="isAdmin"
            to="/Admin"
            class="text-sm font-bold text-white/80 px-3 py-2 rounded-xl bg-white/10 text-decoration-none">
            แอดมิน
          </NuxtLink>
          <button
            type="button"
            @click="logout"
            class="text-sm font-bold text-white px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer">
            ออกจากระบบ
          </button>
        </div>
      </div>
      <!-- หลายฟาร์ม: เลือกฟาร์ม -->
      <div v-if="farms.length > 1" class="max-w-3xl mx-auto mt-3">
        <select
          v-model="selectedFarmId"
          @change="fetchData"
          class="w-full bg-white/10 text-white rounded-xl px-3 py-2.5 text-base font-bold border border-white/20">
          <option v-for="f in farms" :key="f.id" :value="f.id" class="text-black">{{ f.name }}</option>
        </select>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-5 space-y-5">

      <!-- โหลด / ข้อผิดพลาด / ยังไม่ผูกฟาร์ม -->
      <div v-if="loading && !loaded" class="bg-white rounded-[28px] p-8 text-center text-lg font-bold text-[#718078]">
        กำลังโหลดข้อมูลฟาร์ม...
      </div>
      <div v-else-if="errorMessage" class="bg-rose-50 border border-rose-200 rounded-[28px] p-6 text-center space-y-3">
        <p class="text-lg font-bold text-rose-800">{{ errorMessage }}</p>
        <button type="button" @click="fetchData" class="px-6 py-3 rounded-2xl bg-rose-700 text-white text-base font-bold cursor-pointer">ลองใหม่</button>
      </div>
      <div v-else-if="loaded && !farm" class="bg-white rounded-[28px] p-8 text-center space-y-2">
        <v-icon icon="mdi-barn" size="44" class="text-[#718078]" />
        <p class="text-lg font-bold">{{ noFarmMessage }}</p>
      </div>

      <template v-else-if="farm">

        <!-- 🔴 กล่องเซ็นเซอร์ขาดการติดต่อ -->
        <div v-if="now && now.sensor_status === 'offline'" class="bg-amber-50 border-2 border-amber-300 rounded-[24px] p-5 flex gap-3">
          <v-icon icon="mdi-wifi-off" size="30" class="text-amber-700 shrink-0" />
          <div>
            <p class="text-lg font-black text-amber-900">กล่องเซ็นเซอร์ไม่ได้ส่งข้อมูลมา {{ agoText(now.minutes_ago) }}</p>
            <p class="text-base text-amber-900/80 mt-1">ตัวเลขด้านล่างเป็นค่าล่าสุดที่ได้รับ ตรวจว่ากล่องเสียบไฟและอินเทอร์เน็ตใช้ได้</p>
          </div>
        </div>

        <!-- 1. ตอนนี้ -->
        <section class="rounded-[32px] p-6 sm:p-8 text-white shadow-xl" :class="heroClass">
          <div class="flex items-center justify-between mb-3">
            <span class="px-3 py-1 rounded-full bg-white/20 text-sm font-extrabold">ตอนนี้ในโรงเรือน</span>
            <span v-if="now" class="text-sm text-white/90 font-bold">อัปเดต {{ agoText(now.minutes_ago) }}</span>
          </div>

          <div class="text-3xl sm:text-4xl font-black leading-tight">{{ statusTitle }}</div>
          <p class="text-lg text-white/95 font-medium mt-2">{{ statusSubtext }}</p>

          <div class="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/20 text-center">
            <div class="bg-black/10 rounded-2xl p-3">
              <div class="text-white/80 text-sm">อุณหภูมิ</div>
              <div class="text-3xl font-black mt-1">{{ now ? `${now.temperature_c}°` : '—' }}</div>
            </div>
            <div class="bg-black/10 rounded-2xl p-3">
              <div class="text-white/80 text-sm">ความชื้น</div>
              <div class="text-3xl font-black mt-1">{{ now ? `${now.humidity_pct}%` : '—' }}</div>
            </div>
          </div>
        </section>

        <!-- 2. สิ่งที่ควรทำตอนนี้ -->
        <section class="bg-white rounded-[28px] p-6 border border-[#E4E8E5] shadow-sm space-y-4">
          <h2 class="text-xl font-black flex items-center gap-2">
            <v-icon icon="mdi-clipboard-check-outline" size="24" class="text-[#D87939]" />
            สิ่งที่ควรทำตอนนี้
          </h2>
          <div class="space-y-3">
            <div v-for="a in actions" :key="a.key" class="p-4 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-start gap-3.5">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" :class="a.iconClass">
                <v-icon :icon="a.icon" size="26" />
              </div>
              <div class="flex-1">
                <div class="text-lg font-extrabold leading-snug" :class="a.textClass">{{ a.title }}</div>
                <p class="text-base text-[#4e6057] mt-1">{{ a.detail }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 3. วันนี้ (24 ชม. ที่ผ่านมา) -->
        <section class="bg-white rounded-[28px] p-6 border border-[#E4E8E5] shadow-sm space-y-3">
          <h2 class="text-xl font-black flex items-center gap-2">
            <v-icon icon="mdi-calendar-today" size="24" class="text-[#D87939]" />
            24 ชั่วโมงที่ผ่านมา
          </h2>
          <template v-if="today">
            <p class="text-lg leading-relaxed">
              วัวอยู่ในความร้อนระดับ<strong class="text-orange-700">เครียด</strong>
              <strong class="text-2xl text-orange-700">{{ today.stress_hours }}</strong> ชั่วโมง
            </p>
            <div class="w-full bg-[#f0f4f2] h-4 rounded-full overflow-hidden">
              <div class="h-full rounded-full bg-orange-500" :style="{ width: `${Math.min(100, today.stress_percentage || 0)}%` }"></div>
            </div>
            <p class="text-base text-[#4e6057]">
              ร้อนที่สุด {{ today.max_temp ?? '—' }}°C · เย็นที่สุด {{ today.min_temp ?? '—' }}°C
            </p>
          </template>
          <p v-else class="text-base text-[#718078]">ยังไม่มีข้อมูลพอสำหรับสรุป</p>
        </section>

        <!-- 4. พรุ่งนี้และวันถัดไป -->
        <section class="bg-white rounded-[28px] p-6 border border-[#E4E8E5] shadow-sm space-y-3">
          <h2 class="text-xl font-black flex items-center gap-2">
            <v-icon icon="mdi-weather-sunny-alert" size="24" class="text-[#D87939]" />
            พรุ่งนี้
          </h2>
          <template v-if="tomorrow">
            <div class="p-4 rounded-2xl border-2" :class="riskTheme(tomorrow.risk_level).box">
              <div class="text-2xl font-black" :class="riskTheme(tomorrow.risk_level).text">{{ riskTheme(tomorrow.risk_level).label }}</div>
              <p class="text-base mt-1">{{ adviceText(tomorrow.advisory) }}</p>
            </div>
            <div v-if="laterDays.length" class="grid grid-cols-2 gap-2">
              <div v-for="d in laterDays" :key="d.horizon_days" class="p-3 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5]">
                <div class="text-sm text-[#718078]">{{ d.date }}</div>
                <div class="text-lg font-black" :class="riskTheme(d.risk_level).text">{{ riskTheme(d.risk_level).label }}</div>
              </div>
            </div>
            <p class="text-sm text-[#718078]">คาดการณ์จากอุณหภูมิและความชื้นในโรงเรือนของท่าน 3 วันที่ผ่านมา</p>
          </template>
          <p v-else class="text-base text-[#718078]">{{ forecastNote }}</p>
        </section>

        <!-- 5. วัวในกล้อง (เฉพาะฟาร์มที่มีกล้อง) -->
        <section v-if="camera" class="bg-white rounded-[28px] p-6 border border-[#E4E8E5] shadow-sm space-y-2">
          <h2 class="text-xl font-black flex items-center gap-2">
            <v-icon icon="mdi-cctv" size="24" class="text-[#D87939]" />
            วัวในกล้อง
          </h2>
          <template v-if="camera.total > 0">
            <p class="text-lg">
              เห็นวัว <strong>{{ camera.total }}</strong> ตัว · นอนพัก <strong class="text-blue-700">{{ Math.round(camera.lying_pct ?? 0) }}%</strong>
            </p>
            <p class="text-base text-[#4e6057]">{{ cameraAdvice }}</p>
          </template>
          <p v-else class="text-lg">ไม่เห็นวัวในภาพล่าสุด</p>
          <p class="text-sm" :class="camera.status === 'online' ? 'text-[#718078]' : 'text-rose-700 font-bold'">
            {{ camera.status === 'online' ? `ภาพล่าสุด ${agoText(camera.minutes_ago)}` : `กล้องไม่ได้ส่งภาพมา ${agoText(camera.minutes_ago)}` }}
          </p>
        </section>

        <!-- 6. รายละเอียดสำหรับผู้ที่ต้องการ (ตัวเลขทางเทคนิค) -->
        <section class="bg-white rounded-[28px] border border-[#E4E8E5] shadow-sm overflow-hidden">
          <button type="button" @click="showDetails = !showDetails" class="w-full p-5 flex items-center justify-between text-lg font-bold cursor-pointer">
            <span>ดูรายละเอียด</span>
            <v-icon :icon="showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="26" />
          </button>
          <div v-if="showDetails" class="px-5 pb-5 space-y-2 text-base text-[#4e6057]">
            <p>ดัชนีความร้อนชื้น (THI) ตอนนี้: <strong class="text-[#142820]">{{ now?.thi ?? '—' }}</strong></p>
            <p>เกณฑ์ของฟาร์มนี้: เฝ้าระวัง {{ thresholds.mild }} · เครียด {{ thresholds.moderate }} · วิกฤต {{ thresholds.severe }}</p>
            <p>{{ PROFILE_LABELS[farm.profile] }}</p>
            <p v-if="today">THI เฉลี่ย 24 ชม.: {{ today.avg_thi ?? '—' }}</p>
            <p v-if="camera?.cci != null">ดัชนีความสบาย (สัดส่วนวัวนอนต่อวัวที่ยืนและนอน): {{ camera.cci }}%</p>
            <p class="text-sm text-[#718078]">อัปเดตอัตโนมัติทุก 1 นาที</p>
          </div>
        </section>

        <!-- 7. ติดต่อสัตวแพทย์ -->
        <section class="bg-white rounded-[28px] p-6 border border-[#E4E8E5] text-center space-y-2">
          <h3 class="text-lg font-bold">พบแม่โคหอบ ไม่กินอาหาร หรือมีอาการผิดปกติ?</h3>
          <p class="text-base text-[#4e6057]">ติดต่อสัตวแพทย์ประจำสหกรณ์ของท่านให้ตรวจโดยเร็ว</p>
        </section>

      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'
import { getThresholds, RISK_LABELS_TH, PROFILE_LABELS } from '~/utils/heatStress'

// หน้าเกษตรกรมีหัวหน้าจอของตัวเอง ไม่ใช้แถบเมนูของหน้าเว็บหลัก
definePageMeta({ layout: false })

useHead({ title: 'หน้าเกษตรกร | CowCare AI' })

const REFRESH_MS = 60 * 1000

const loading = ref(false)
const loaded = ref(false)
const errorMessage = ref('')
const noFarmMessage = ref('')
const showDetails = ref(false)
const isAdmin = ref(false)

const farms = ref([])
const selectedFarmId = ref('')
const farm = ref(null)
const now = ref(null)
const today = ref(null)
const forecast = ref(null)
const camera = ref(null)
const thresholds = ref(getThresholds('default'))

let timer = null

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  navigateTo('/login')
}

const agoText = (min) => {
  if (min == null) return ''
  if (min < 1) return 'เมื่อสักครู่'
  if (min < 60) return `${min} นาทีที่แล้ว`
  if (min < 24 * 60) return `${Math.floor(min / 60)} ชั่วโมงที่แล้ว`
  return `${Math.floor(min / 1440)} วันที่แล้ว`
}

const riskLevel = computed(() => now.value?.risk_level || null)

const heroClass = computed(() => ({
  severe: 'bg-gradient-to-br from-rose-700 to-rose-900',
  moderate: 'bg-gradient-to-br from-orange-600 to-orange-800',
  mild: 'bg-gradient-to-br from-amber-500 to-amber-700'
}[riskLevel.value] || (now.value ? 'bg-gradient-to-br from-emerald-700 to-[#142820]' : 'bg-gradient-to-br from-gray-500 to-gray-700')))

const statusTitle = computed(() => ({
  severe: '🚨 วัวร้อนมาก อันตราย',
  moderate: '⚠️ วัวเครียดจากความร้อน',
  mild: '🌤️ เริ่มร้อน เฝ้าระวัง',
  normal: '✅ สบายดี'
}[riskLevel.value] || 'ยังไม่มีข้อมูลจากเซ็นเซอร์'))

const statusSubtext = computed(() => ({
  severe: 'แม่โคเสี่ยงหอบและหยุดกินอาหาร ช่วยระบายความร้อนทันที',
  moderate: 'น้ำนมอาจเริ่มลด ควรเปิดพัดลมช่วยระบายความร้อน',
  mild: 'อากาศเริ่มอบอ้าว เปิดพัดลมให้อากาศถ่ายเท',
  normal: 'อากาศในโรงเรือนเหมาะกับแม่โค'
}[riskLevel.value] || 'ตรวจว่ากล่องเซ็นเซอร์เสียบไฟและต่ออินเทอร์เน็ตอยู่'))

const actions = computed(() => {
  const lvl = riskLevel.value
  const hum = now.value?.humidity_pct
  const hot = lvl === 'severe' || lvl === 'moderate'
  const list = [{
    key: 'fan',
    icon: 'mdi-fan',
    iconClass: 'bg-blue-50 text-blue-600',
    textClass: hot ? 'text-orange-800' : 'text-[#142820]',
    title: hot ? 'เปิดพัดลมเต็มกำลังทุกตัว' : lvl === 'mild' ? 'เปิดพัดลมระบายอากาศ' : 'เปิดพัดลมตามปกติ',
    detail: 'ลมช่วยไล่ความร้อนและความชื้นออกจากตัวแม่โค'
  }]
  if (hum != null && (hot || lvl === 'mild')) {
    list.push(hum >= 75
      ? { key: 'mist', icon: 'mdi-water-off', iconClass: 'bg-amber-50 text-amber-600', textClass: 'text-amber-800',
          title: 'ยังไม่ควรพ่นหมอกน้ำ', detail: `ความชื้นสูง (${hum}%) พ่นหมอกเพิ่มจะยิ่งอับชื้น ใช้พัดลมแทน` }
      : { key: 'mist', icon: 'mdi-water', iconClass: 'bg-cyan-50 text-cyan-600', textClass: 'text-[#142820]',
          title: 'พ่นหมอกน้ำสลับกับเปิดพัดลมได้', detail: 'อากาศไม่ชื้นเกินไป ละอองน้ำช่วยลดความร้อนได้' })
  }
  list.push({
    key: 'water',
    icon: 'mdi-cup-water',
    iconClass: 'bg-emerald-50 text-emerald-600',
    textClass: 'text-[#142820]',
    title: hot ? 'เติมน้ำให้เต็มราง ตรวจบ่อยขึ้น' : 'ตรวจน้ำในรางให้สะอาดและมีตลอด',
    detail: hot ? 'แม่โคที่ร้อนจะกินน้ำมากขึ้นมาก' : 'แม่โคต้องมีน้ำสะอาดกินได้ตลอดเวลา'
  })
  if (lvl === 'severe') {
    list.push({ key: 'vet', icon: 'mdi-stethoscope', iconClass: 'bg-rose-50 text-rose-600', textClass: 'text-rose-800',
      title: 'สังเกตแม่โคที่หอบหนักหรือไม่ลุก', detail: 'ถ้าพบอาการผิดปกติ ควรให้สัตวแพทย์ตรวจ' })
  }
  return list
})

// คำแนะนำจาก server ขึ้นต้นด้วยชื่อระดับ (ซ้ำกับหัวข้อในการ์ด) ตัดออก
const adviceText = (txt) => String(txt || '').replace(/^[^:]*:\s*/, '')

const tomorrow = computed(() => forecast.value?.days?.find(d => d.horizon_days === 1) || null)
const laterDays = computed(() => (forecast.value?.days || []).filter(d => d.horizon_days > 1))
const forecastNote = computed(() => forecast.value?.insufficient_data
  ? 'ยังมีข้อมูลไม่พอสำหรับคาดการณ์ (ต้องมีข้อมูลจากกล่องเซ็นเซอร์อย่างน้อยประมาณ 1 วัน)'
  : 'ยังไม่มีข้อมูลคาดการณ์')

const RISK_THEME = {
  severe: { box: 'border-rose-300 bg-rose-50', text: 'text-rose-700' },
  moderate: { box: 'border-orange-300 bg-orange-50', text: 'text-orange-700' },
  mild: { box: 'border-amber-300 bg-amber-50', text: 'text-amber-700' },
  normal: { box: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-700' }
}
const riskTheme = (lvl) => ({ ...(RISK_THEME[lvl] || RISK_THEME.normal), label: RISK_LABELS_TH[lvl] || 'ไม่ทราบ' })

// วัวนอนพักน้อยตอนอากาศร้อน = สัญญาณเครียด (ยืนระบายความร้อน)
const cameraAdvice = computed(() => {
  const lying = camera.value?.lying_pct
  if (lying == null) return ''
  if (lying < 30 && (riskLevel.value === 'moderate' || riskLevel.value === 'severe')) return 'วัวยืนมากกว่าปกติ อาจกำลังร้อน ช่วยระบายความร้อนในโรงเรือน'
  return 'วัวได้นอนพักตามปกติ'
})

const fetchData = async () => {
  const token = getToken()
  if (!token) return navigateTo('/login')
  loading.value = true
  try {
    const res = await axios.get(`${getNodeApiBase()}/farmer/me`, {
      headers: { Authorization: `Bearer ${token}` },
      params: selectedFarmId.value ? { farm_id: selectedFarmId.value } : {}
    })
    const d = res.data || {}
    farms.value = d.farms || []
    farm.value = d.farm || null
    noFarmMessage.value = d.message || 'บัญชีนี้ยังไม่ได้ผูกกับฟาร์ม'
    if (farm.value) selectedFarmId.value = farm.value.id
    now.value = d.now || null
    today.value = d.today || null
    forecast.value = d.forecast || null
    camera.value = d.camera || null
    thresholds.value = d.thresholds || getThresholds(farm.value?.profile)
    errorMessage.value = ''
  } catch (err) {
    const status = err.response?.status
    if (status === 401 || status === 403) return logout()
    errorMessage.value = 'โหลดข้อมูลไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต'
  } finally {
    loading.value = false
    loaded.value = true
  }
}

const onVisible = () => { if (document.visibilityState === 'visible') fetchData() }

onMounted(() => {
  const user = getStoredUser()
  if (!getToken() || !user || !['farmer', 'admin'].includes(user.role)) return navigateTo('/login')
  isAdmin.value = user.role === 'admin'
  fetchData()
  timer = setInterval(fetchData, REFRESH_MS)
  document.addEventListener('visibilitychange', onVisible)
})

onUnmounted(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>
