<template>
  <div class="min-h-screen bg-[#F6F7F5] font-sans text-[#142820] pb-16">

    <!-- 🟢 Top Farmer Header Bar -->
    <header class="bg-[#142820] text-white px-4 py-4 sticky top-0 z-40 shadow-md">
      <div class="max-w-3xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-[#D87939] flex items-center justify-center font-bold text-lg text-white shadow-sm">
            <v-icon icon="mdi-cow" size="24" />
          </div>
          <div>
            <h1 class="text-base font-black leading-tight">CowCare AI • สำหรับเกษตรกร</h1>
            <p class="text-[11px] text-[#F2BD7C] font-medium">ฟาร์มของคุณ: {{ farmName }} ({{ barnUnit }})</p>
          </div>
        </div>

        <NuxtLink 
          to="/Admin" 
          class="text-xs font-bold text-white/80 hover:text-white px-3 py-1.5 rounded-xl bg-white/10 text-decoration-none">
          แอดมิน
        </NuxtLink>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-6 space-y-6">

      <!-- 🟢 1. Big Status Hero Card (Large High-Contrast for Elderly Farmers) -->
      <div 
        class="rounded-[32px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden transition-all"
        :class="currentThi >= 84 ? 'bg-gradient-to-br from-rose-700 to-rose-900' : currentThi >= 80 ? 'bg-gradient-to-br from-amber-600 to-orange-700' : 'bg-gradient-to-br from-emerald-700 to-[#142820]'">
        
        <div class="flex items-center justify-between mb-4">
          <span class="px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-wider backdrop-blur-xs">
            สภาวะในโรงเรือนตอนนี้
          </span>
          <span class="text-xs text-white/80 font-bold flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
            อัปเดตสด
          </span>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-2">
          <div>
            <div class="text-3xl sm:text-4xl font-black leading-tight tracking-tight">
              {{ statusTitle }}
            </div>
            <p class="text-sm text-white/90 font-medium mt-1">
              {{ statusSubtext }}
            </p>
          </div>

          <!-- Big THI Display -->
          <div class="bg-white/15 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20 text-center shrink-0">
            <div class="text-[11px] font-bold text-white/80 uppercase">ดัชนี THI</div>
            <div class="text-4xl sm:text-5xl font-black text-white leading-none mt-1">{{ currentThi }}</div>
          </div>
        </div>

        <!-- Temperature & Humidity Chips -->
        <div class="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/20 text-center text-xs">
          <div class="bg-black/10 rounded-2xl p-2.5">
            <div class="text-white/70 text-[11px]">อุณหภูมิโรงเรือน</div>
            <div class="text-xl font-black text-white mt-0.5">{{ currentTemp }} °C</div>
          </div>
          <div class="bg-black/10 rounded-2xl p-2.5">
            <div class="text-white/70 text-[11px]">ความชื้นสัมพัทธ์</div>
            <div class="text-xl font-black text-white mt-0.5">{{ currentHum }}% RH</div>
          </div>
        </div>

      </div>

      <!-- 🟢 2. Action Checklist for Farmer (Plain Thai Language) -->
      <div class="bg-white rounded-[28px] p-6 border border-[#E4E8E5] shadow-sm space-y-4">
        <h2 class="text-base font-black text-[#142820] flex items-center gap-2">
          <v-icon icon="mdi-clipboard-check-outline" size="20" class="text-[#D87939]" />
          สิ่งที่เกษตรกรควรทำตอนนี้
        </h2>

        <div class="space-y-3">
          <!-- Fan Action -->
          <div class="p-4 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <v-icon icon="mdi-fan" size="22" />
            </div>
            <div class="flex-1">
              <div class="text-xs font-bold text-[#718078]">พัดลมระบายอากาศ</div>
              <div class="font-extrabold text-sm text-[#142820] mt-0.5">
                {{ currentThi >= 76 ? 'เปิดพัดลมเต็มกำลังทุกตัวทันที' : 'เปิดพัดลมระบายอากาศตามปกติ' }}
              </div>
              <p class="text-[11px] text-[#718078] mt-0.5">
                ช่วยเป่าลมไล่ความร้อนและความชื้นออกจากตัวแม่โค
              </p>
            </div>
          </div>

          <!-- Misting Action (Rainy season / high humidity rule) -->
          <div class="p-4 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-start gap-3.5">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              :class="currentHum >= 75 ? 'bg-amber-50 text-amber-600' : 'bg-cyan-50 text-cyan-600'">
              <v-icon :icon="currentHum >= 75 ? 'mdi-water-off' : 'mdi-water'" size="22" />
            </div>
            <div class="flex-1">
              <div class="text-xs font-bold text-[#718078]">ระบบพ่นหมอกน้ำ</div>
              <div 
                class="font-extrabold text-sm mt-0.5"
                :class="currentHum >= 75 ? 'text-amber-700' : 'text-[#142820]'">
                {{ currentHum >= 75 ? '⚠️ แนะนำให้ "ปิดระบบพ่นหมอก" ชั่วคราว' : 'เปิดพ่นหมอกสลับเป่าพัดลมได้' }}
              </div>
              <p class="text-[11px] text-[#718078] mt-0.5">
                {{ currentHum >= 75 ? 'ความชื้นในอากาศสูงเกิน 75% หากพ่นหมอกเพิ่มจะทำให้อับชื้นและที่นอนเปียก' : 'ความชื้นเหมาะสม สามารถพ่นละอองน้ำช่วยลดอุณหภูมิได้' }}
              </p>
            </div>
          </div>

          <!-- Clean Water Action -->
          <div class="p-4 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <v-icon icon="mdi-cup-water" size="22" />
            </div>
            <div class="flex-1">
              <div class="text-xs font-bold text-[#718078]">น้ำดื่มแม่โค</div>
              <div class="font-extrabold text-sm text-[#142820] mt-0.5">
                ตรวจสอบให้น้ำในรางใส เย็น และไหลเวียนตลอดเวลา
              </div>
              <p class="text-[11px] text-[#718078] mt-0.5">
                แม่โคที่ร้อนจะดื่มน้ำเพิ่มขึ้น 2 เท่าเพื่อระบายความร้อน
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 🟢 3. Milk Yield Risk Card -->
      <div class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-[28px] p-6 border border-amber-200 shadow-sm flex items-center justify-between gap-4">
        <div>
          <span class="text-[10px] font-black text-amber-800 uppercase tracking-widest">การประเมินปริมาณน้ำนม</span>
          <h3 class="text-base font-black text-[#142820] mt-0.5">ความเสี่ยงน้ำนมลดลง</h3>
          <p class="text-xs text-amber-900/80 mt-1">
            {{ currentThi >= 76 ? `คาดว่าน้ำนมอาจลดลงประมาณ ${estimatedMilkLoss} กก./ตัว/วัน หากไม่เปิดพัดลม` : 'ไม่มีความเสี่ยงน้ำนมลด ผลผลิตอยู่ในเกณฑ์ปกติ' }}
          </p>
        </div>
        <div class="text-right shrink-0">
          <div class="text-2xl font-black text-amber-700">
            {{ currentThi >= 76 ? `-${estimatedMilkLoss}` : '0' }}
          </div>
          <div class="text-[10px] font-bold text-amber-800">กก./ตัว/วัน</div>
        </div>
      </div>

      <!-- 🟢 4. Emergency Call Button to Cooperative / Veterinarian -->
      <div class="bg-white rounded-[28px] p-6 border border-[#E4E8E5] text-center space-y-3">
        <h3 class="text-sm font-bold text-[#142820]">พบแม่โคหอบ หรือมีอาการผิดปกติ?</h3>
        <p class="text-xs text-[#718078]">สามารถกดโทรด่วนเพื่อปรึกษาสัตวแพทย์ประจำสหกรณ์โคนมได้ทันที</p>
        <a 
          href="tel:036341234" 
          class="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md transition-all text-decoration-none">
          <v-icon icon="mdi-phone" size="18" />
          <span>โทรหาสัตวแพทย์สหกรณ์ (036-341-234)</span>
        </a>
      </div>

    </main>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Admin } from '../../API/baseAPI'

useHead({ title: 'หน้าเกษตรกร | CowCare AI' })

const farmName = ref('ฟาร์มสาธิตมวกเหล็ก')
const barnUnit = ref('โรงเรือนหลัก')
const currentThi = ref(78.5)
const currentTemp = ref(29.8)
const currentHum = ref(76.0)

const statusTitle = computed(() => {
  if (currentThi.value >= 84.0) return '🚨 วัวร้อนมาก (วิกฤต)'
  if (currentThi.value >= 80.0) return '⚠️ อากาศเริ่มร้อนอบอ้าว'
  if (currentThi.value >= 76.0) return '🌤️ เริ่มเฝ้าระวังความร้อน'
  return 'สบายดี อากาศเหมาะสม'
})

const statusSubtext = computed(() => {
  if (currentThi.value >= 84.0) return 'แม่โคเสี่ยงหอบและหยุดกินอาหาร รีบระบายอากาศทันที'
  if (currentThi.value >= 80.0) return 'น้ำนมอาจเริ่มลดลง ควรเปิดพัดลมช่วยระบายความร้อน'
  if (currentThi.value >= 76.0) return 'เปิดพัดลมให้อากาศถ่ายเทสะดวก'
  return 'สภาพอากาศอยู่ในโซนที่แม่โคสบายที่สุด (Comfort Zone)'
})

const estimatedMilkLoss = computed(() => {
  if (currentThi.value < 76.0) return '0'
  return ((currentThi.value - 76.0) * 0.35).toFixed(1)
})

const fetchFarmerTelemetry = async () => {
  try {
    const res = await axios.get(`${Admin}/farms/all`)
    if (res.data && res.data.rows && res.data.rows.length > 0) {
      const f = res.data.rows[0]
      farmName.value = f.name_farms || 'ฟาร์มสมาชิก'
      barnUnit.value = f.barn_unit || 'โรงเรือน 1'
      if (f.thi) currentThi.value = parseFloat(f.thi)
      if (f.temperature_c) currentTemp.value = parseFloat(f.temperature_c)
      if (f.humidity_pct) currentHum.value = parseFloat(f.humidity_pct)
    }
  } catch (err) {
    console.warn('Fallback to demo values for farmer:', err.message)
  }
}

onMounted(() => {
  fetchFarmerTelemetry()
})
</script>
