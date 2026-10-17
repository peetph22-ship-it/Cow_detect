<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans pb-16">

    <!-- 🟢 Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
      <div>
        <h1 class="text-[32px] md:text-[38px] font-black text-[#142820] tracking-tight leading-tight mb-2 flex items-center gap-3">
          แดชบอร์ดสัตวแพทย์ & ผู้เชี่ยวชาญ
          <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold uppercase tracking-wider border border-blue-200">
            Clinical & Herd Health
          </span>
        </h1>
        <p class="text-[#718078] text-[15px] font-medium max-w-2xl">
          ระบบวิเคราะห์ระบาดวิทยาสภาวะเครียดจากความร้อนในโคนม ระดับฝูงและระดับเครือข่ายสหกรณ์โคนม (Veterinary Epidemiological Surveillance)
        </p>
      </div>

      <div class="flex items-center gap-3">
        <NuxtLink
          to="/Admin"
          class="bg-[#142820] hover:bg-[#1C362B] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 text-decoration-none">
          <v-icon icon="mdi-shield-crown-outline" size="16" />
          <span>Admin Console</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 🟢 Clinical Indicator Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      
      <!-- Network Average THI -->
      <div class="bg-white rounded-3xl p-6 border border-[#E4E8E5] shadow-sm">
        <div class="text-[11px] font-bold text-[#718078] uppercase tracking-wider mb-2">ค่าเฉลี่ย THI ทั้งเครือข่าย</div>
        <div class="text-3xl font-black text-[#142820]">{{ avgNetworkThi }}</div>
        <div class="text-xs font-bold text-amber-600 mt-2 flex items-center gap-1">
          <v-icon icon="mdi-alert-circle-outline" size="14" />
          <span>เริ่มมีผลกระทบต่ออัตราการกินได้ (DMI)</span>
        </div>
      </div>

      <!-- Panting Risk Index -->
      <div class="bg-white rounded-3xl p-6 border border-[#E4E8E5] shadow-sm">
        <div class="text-[11px] font-bold text-[#718078] uppercase tracking-wider mb-2">ดัชนีความเสี่ยงการหอบ (Panting Risk)</div>
        <div class="text-3xl font-black text-rose-600">{{ pantingRiskPct }}%</div>
        <div class="text-xs font-bold text-rose-600 mt-2 flex items-center gap-1">
          <v-icon icon="mdi-lungs" size="14" />
          <span>คาดการณ์อัตราการหายใจ > 80 ครั้ง/นาที</span>
        </div>
      </div>

      <!-- Night Recovery Failures -->
      <div class="bg-white rounded-3xl p-6 border border-[#E4E8E5] shadow-sm">
        <div class="text-[11px] font-bold text-[#718078] uppercase tracking-wider mb-2">ฟาร์มที่ไม่มีการฟื้นตัวกลางคืน</div>
        <div class="text-3xl font-black text-amber-600">{{ nightRecoveryFailures }} ฟาร์ม</div>
        <div class="text-xs font-bold text-[#718078] mt-2 flex items-center gap-1">
          <v-icon icon="mdi-weather-night" size="14" />
          <span>THI กลางคืนคงค้าง ≥ 74 ตลอดทั้งคืน</span>
        </div>
      </div>

      <!-- Rumination Drop Proxy -->
      <div class="bg-white rounded-3xl p-6 border border-[#E4E8E5] shadow-sm">
        <div class="text-[11px] font-bold text-[#718078] uppercase tracking-wider mb-2">การเคี้ยวเอื้องลดลง (Rumination Drop)</div>
        <div class="text-3xl font-black text-blue-700">-12.8%</div>
        <div class="text-xs font-bold text-blue-700 mt-2 flex items-center gap-1">
          <v-icon icon="mdi-bacteria-outline" size="14" />
          <span>เสี่ยงภาวะกระเพาะหมักเป็นกรด (SARA)</span>
        </div>
      </div>

    </div>

    <!-- 🟢 Farms Herd Health Priority Matrix -->
    <div class="bg-white rounded-3xl border border-[#E4E8E5] shadow-sm overflow-hidden">
      <div class="p-6 border-b border-[#E4E8E5] flex items-center justify-between">
        <div>
          <h2 class="text-lg font-black text-[#142820]">ตารางเฝ้าระวังสุขภาพฝูงโคนมรายฟาร์ม</h2>
          <p class="text-xs text-[#718078]">จัดลำดับความสำคัญของฟาร์มที่สัตวแพทย์ควรเข้าตรวจเยี่ยม</p>
        </div>
        <span class="px-3 py-1 rounded-full bg-[#F6F7F5] border border-[#E4E8E5] text-xs font-bold text-[#718078]">
          {{ farmList.length }} ฟาร์มในระบบ
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-[#F6F7F5] text-[11px] font-bold text-[#718078] uppercase">
            <tr>
              <th class="py-4 px-6">ชื่อฟาร์ม & เจ้าของ</th>
              <th class="py-4 px-6">ดัชนี THI ปัจจุบัน</th>
              <th class="py-4 px-6">สถานะทางสัตวแพทย์</th>
              <th class="py-4 px-6">โครงสร้างโรงเรือน</th>
              <th class="py-4 px-6">มาตรการรักษาเร่งด่วน</th>
              <th class="py-4 px-6 text-right">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E4E8E5]">
            <tr v-for="farm in farmList" :key="farm.id_farms" class="hover:bg-[#F6F7F5]/50">
              <td class="py-4 px-6">
                <div class="font-bold text-[#142820] text-sm">{{ farm.name_farms }}</div>
                <div class="text-[11px] text-[#718078]">{{ farm.owner_name || 'เกษตรกรสมาชิก' }} • {{ farm.district }}, {{ farm.province }}</div>
              </td>
              <td class="py-4 px-6">
                <div class="font-extrabold text-sm" :class="farm.thi >= 84 ? 'text-rose-600' : farm.thi >= 80 ? 'text-amber-600' : 'text-emerald-700'">
                  THI {{ farm.thi || 77.5 }}
                </div>
                <div class="text-[10px] text-[#718078]">{{ farm.temperature_c }}°C / {{ farm.humidity_pct }}% RH</div>
              </td>
              <td class="py-4 px-6">
                <span 
                  class="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"
                  :class="farm.thi >= 84 ? 'bg-rose-50 text-rose-700 border border-rose-200' : farm.thi >= 80 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
                  {{ farm.thi >= 84 ? '🚨 วิกฤต เสี่ยงหอบรุนแรง' : farm.thi >= 80 ? '⚠️ เสี่ยงกินอาหารลดลง' : 'ปกติ สุขภาพฝูงดี' }}
                </span>
              </td>
              <td class="py-4 px-6 text-[#718078]">
                <div>สูง {{ farm.barn_height_m || 3.2 }} ม. ({{ farm.roof_type || 'เมทัลชีท' }})</div>
                <div class="text-[10px]">{{ farm.cooling_system || 'พัดลม' }}</div>
              </td>
              <td class="py-4 px-6 font-medium text-[#142820]">
                {{ farm.thi >= 84 ? 'ตรวจเช็กรางน้ำ เพิ่มพัดลมเป่าตรงคอกนอน เสริมบัฟเฟอร์ใน TMR' : 'เปิดพัดลมระบายอากาศต่อเนื่อง' }}
              </td>
              <td class="py-4 px-6 text-right">
                <NuxtLink
                  :to="`/Admin/farms/farm_detail-${farm.id_farms}`"
                  class="px-3 py-1.5 rounded-xl bg-[#142820] text-white text-[11px] font-bold hover:bg-[#1C362B] text-decoration-none">
                  เปิด Cockpit
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Admin } from '../../API/baseAPI'

useHead({ title: 'สัตวแพทย์และผู้เชี่ยวชาญ | CowCare AI' })

const farmList = ref([])
const avgNetworkThi = ref(78.2)
const pantingRiskPct = ref(24.5)
const nightRecoveryFailures = ref(1)

const fetchExpertData = async () => {
  try {
    const res = await axios.get(`${Admin}/farms/all`)
    if (res.data && res.data.rows) {
      farmList.value = res.data.rows
      const thiArr = farmList.value.map(f => parseFloat(f.thi)).filter(v => !isNaN(v))
      if (thiArr.length) {
        avgNetworkThi.value = +(thiArr.reduce((a, b) => a + b, 0) / thiArr.length).toFixed(1)
        pantingRiskPct.value = Math.round((farmList.value.filter(f => parseFloat(f.thi) >= 80).length / farmList.value.length) * 100)
      }
    }
  } catch (err) {
    console.error('Fetch expert data error:', err.message)
  }
}

onMounted(() => {
  fetchExpertData()
})
</script>
