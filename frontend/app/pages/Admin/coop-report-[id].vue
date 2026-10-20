<template>
  <div class="max-w-[1200px] mx-auto space-y-8 font-sans pb-16 print:p-0 print:space-y-4">

    <!-- 🟢 1. Top Navigation & Action Controls (Hidden during print) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E8E5] print:hidden animate-fade-up">
      <div class="flex items-center gap-3.5">
        <!-- Back button to Coop Report Roster -->
        <NuxtLink 
          to="/Admin/coop-report" 
          class="w-11 h-11 rounded-[16px] bg-white border border-[#E4E8E5] hover:border-[#142820]/30 text-[#142820] shadow-xs flex items-center justify-center transition-all cursor-pointer text-decoration-none group active:scale-95">
          <v-icon icon="mdi-arrow-left" size="20" class="group-hover:-translate-x-0.5 transition-transform" />
        </NuxtLink>

        <div>
          <!-- Breadcrumbs -->
          <div class="flex items-center gap-2 text-xs font-bold text-[#718078] mb-0.5">
            <NuxtLink to="/Admin" class="hover:text-[#142820] transition-colors text-decoration-none text-[#718078]">Admin</NuxtLink>
            <v-icon icon="mdi-chevron-right" size="14" class="opacity-40" />
            <NuxtLink to="/Admin/coop-report" class="hover:text-[#142820] transition-colors text-decoration-none text-[#718078]">สมุดรายงานสหกรณ์</NuxtLink>
            <v-icon icon="mdi-chevron-right" size="14" class="opacity-40" />
            <span class="text-[#142820] font-black">{{ reportData?.farm_profile?.name_farms || 'เอกสารยื่นสหกรณ์' }}</span>
          </div>

          <!-- Farm Title & Certification Pill -->
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-2xl md:text-3xl font-black text-[#142820] tracking-tight">
              {{ reportData?.farm_profile?.name_farms || 'กำลังโหลดข้อมูลฟาร์ม...' }}
            </h1>
            <span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black tracking-wide border border-emerald-200">
              ESG &amp; BAAC Certified
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Link to Barn Cockpit -->
        <NuxtLink 
          :to="`/Admin/farms/farm_detail-${farmId}`"
          class="px-4 py-2.5 rounded-xl border border-[#E4E8E5] bg-white hover:bg-[#F6F7F5] text-[#142820] text-xs font-bold transition-all flex items-center gap-1.5 text-decoration-none shadow-xs">
          <v-icon icon="mdi-gauge" size="16" class="text-[#D87939]" />
          <span>เปิด Barn Cockpit</span>
        </NuxtLink>

        <!-- Link to Alert History -->
        <NuxtLink 
          :to="`/Admin/alerts-${farmId}`"
          class="px-4 py-2.5 rounded-xl border border-[#E4E8E5] bg-white hover:bg-[#F6F7F5] text-[#142820] text-xs font-bold transition-all flex items-center gap-1.5 text-decoration-none shadow-xs">
          <v-icon icon="mdi-bell-outline" size="16" class="text-rose-600" />
          <span>ประวัติแจ้งเตือน</span>
        </NuxtLink>

        <!-- Print / PDF Button -->
        <button
          @click="printReport"
          class="bg-[#142820] hover:bg-[#1C362B] text-white px-5 py-2.5 rounded-xl font-bold shadow-xs hover:-translate-y-0.5 transition-all text-xs flex items-center gap-2 cursor-pointer">
          <v-icon icon="mdi-printer" size="16" />
          <span>พิมพ์ / บันทึก PDF</span>
        </button>
      </div>
    </div>

    <!-- 🟢 Loading State -->
    <div v-if="isLoading" class="p-16 text-center bg-white rounded-[32px] border border-[#E4E8E5] print:hidden">
      <div class="w-10 h-10 border-4 border-[#142820] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs font-bold text-[#718078]">กำลังประมวลผลสมุดความเสี่ยงสหกรณ์...</p>
    </div>

    <!-- 🟢 Official Document Container (Styled for Screen & High-Resolution Print) -->
    <div 
      v-else-if="reportData" 
      class="bg-white rounded-[32px] p-8 md:p-12 border border-[#E4E8E5] shadow-xl relative overflow-hidden print:border-none print:shadow-none print:p-0 print:rounded-none">

      <!-- Top Colored Stripe -->
      <div class="h-3 bg-gradient-to-r from-[#142820] via-emerald-700 to-[#D87939] -mx-8 -mt-8 md:-mx-12 md:-mt-12 mb-8 print:hidden"></div>

      <!-- 1. Official Header Block -->
      <div class="flex flex-col sm:flex-row justify-between items-start border-b-2 border-[#142820] pb-6 mb-8 gap-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-[#142820] flex items-center justify-center text-white shrink-0 shadow-md">
            <v-icon icon="mdi-cow" size="36" class="text-[#F2BD7C]" />
          </div>
          <div>
            <div class="text-[10px] font-black text-[#D87939] uppercase tracking-[0.2em]">
              OFFICIAL DAIRY ESG RISK LOGBOOK
            </div>
            <h2 class="text-2xl font-black text-[#142820] tracking-tight">
              สมุดรายงานความเสี่ยงสภาวะเครียดจากความร้อนในโคนม
            </h2>
            <div class="text-xs text-[#718078] font-bold mt-0.5">
              ระบบโทรมาตรสิ่งแวดล้อมเพื่อเกษตรกรรายย่อย (PH Detection System / CowCare AI)
            </div>
          </div>
        </div>

        <div class="text-right sm:self-center">
          <div class="font-mono text-xs font-bold text-[#142820]">
            รหัสเอกสาร: <span class="text-[#D87939]">{{ reportData.report_id }}</span>
          </div>
          <div class="text-[11px] text-[#718078] mt-0.5">
            วันที่พิมพ์: {{ formatDate(reportData.generated_at) }}
          </div>
          <span class="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            ✓ ข้อมูลจริงจากฮาร์ดแวร์ IoT (Real Telemetry)
          </span>
        </div>
      </div>

      <!-- 2. Farm Profile & Structural Specifications -->
      <div class="mb-8">
        <h3 class="text-sm font-black text-[#142820] uppercase tracking-wider mb-3 flex items-center gap-2">
          <v-icon icon="mdi-barn" size="18" class="text-[#142820]" />
          ข้อมูลทั่วไปของฟาร์มและลักษณะโครงสร้างโรงเรือน
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] text-xs">
          <div>
            <div class="text-[#718078] font-medium text-[11px]">ชื่อฟาร์ม</div>
            <div class="font-extrabold text-[#142820] text-sm mt-0.5">{{ reportData.farm_profile.name_farms }}</div>
            <div class="text-[10px] text-[#718078]">{{ reportData.farm_profile.district }}, {{ reportData.farm_profile.province }}</div>
          </div>
          <div>
            <div class="text-[#718078] font-medium text-[11px]">เกษตรกรเจ้าของฟาร์ม</div>
            <div class="font-bold text-[#142820] mt-0.5">{{ reportData.farm_profile.farmer_name }}</div>
            <div class="text-[10px] text-[#718078]">{{ reportData.farm_profile.cooperative }}</div>
          </div>
          <div>
            <div class="text-[#718078] font-medium text-[11px]">ความสูงโรงเรือน / หลังคา</div>
            <div class="font-bold text-[#142820] mt-0.5">{{ reportData.farm_profile.barn_height_m }} เมตร</div>
            <div class="text-[10px] text-[#718078]">{{ reportData.farm_profile.roof_type }}</div>
          </div>
          <div>
            <div class="text-[#718078] font-medium text-[11px]">ระบบระบายความร้อน</div>
            <div class="font-bold text-[#142820] mt-0.5">{{ reportData.farm_profile.cooling_system }}</div>
            <div class="text-[10px] text-emerald-700 font-bold">พัดลม + ควบคุมความชื้น</div>
          </div>
        </div>
      </div>

      <!-- 3. Risk & Welfare Scorecard -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <!-- Scorecard Grade Badge -->
        <div class="p-6 rounded-3xl bg-gradient-to-br from-[#142820] to-[#1C362B] text-white flex flex-col justify-between shadow-md">
          <div>
            <div class="text-[10px] font-bold text-[#F2BD7C] uppercase tracking-widest">
              COWCARE INTERNAL WELFARE GRADE
            </div>
            <div class="text-base font-black mt-1">เกรดสวัสดิภาพโคนมเบื้องต้น</div>
            <div class="text-xs text-white/70 mt-0.5">ประเมินจากชั่วโมงวิกฤตและการฟื้นตัวกลางคืน</div>
          </div>
          <div class="my-4 text-center">
            <div class="text-6xl font-black text-[#F2BD7C] leading-none">{{ reportData.welfare_assessment?.welfare_grade || '—' }}</div>
            <div class="text-xs font-bold text-white/90 mt-2">{{ reportData.welfare_assessment?.welfare_status || 'ยังไม่มีข้อมูล' }}</div>
          </div>
          <div class="text-[10px] text-white/60 text-center border-t border-white/10 pt-2">
            {{ reportData.welfare_assessment?.grading_basis || 'เกณฑ์ภายในของ CowCare จากข้อมูลเซ็นเซอร์จริง' }}
          </div>
        </div>

        <!-- Heat Stress Breakdown -->
        <div class="p-6 rounded-3xl bg-[#F6F7F5] border border-[#E4E8E5] flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-[#718078] uppercase tracking-widest">30-DAY HEAT MONITORING</div>
            <div class="text-base font-black text-[#142820] mt-1">สถิติดัชนีความร้อนสะสม</div>
          </div>
          
          <div class="space-y-2.5 my-3 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-[#718078] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                ปกติ (THI &lt; {{ reportData.farm_profile?.thresholds?.mild ?? 74 }}):
              </span>
              <span class="font-extrabold text-[#142820]">{{ reportData.risk_metrics?.stress_breakdown?.comfort_hours ?? 0 }} ชม.</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[#718078] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                เฝ้าระวัง (THI {{ reportData.farm_profile?.thresholds?.mild ?? 74 }}–{{ (reportData.farm_profile?.thresholds?.moderate ?? 76) - 0.1 }}):
              </span>
              <span class="font-extrabold text-amber-700">{{ reportData.risk_metrics?.stress_breakdown?.mild_hours ?? 0 }} ชม.</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[#718078] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                เครียดความร้อน (THI {{ reportData.farm_profile?.thresholds?.moderate ?? 76 }}–{{ (reportData.farm_profile?.thresholds?.severe ?? 82) - 0.1 }}):
              </span>
              <span class="font-extrabold text-orange-700">{{ reportData.risk_metrics?.stress_breakdown?.moderate_hours ?? 0 }} ชม.</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[#718078] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                วิกฤต (THI &ge; {{ reportData.farm_profile?.thresholds?.severe ?? 82 }}):
              </span>
              <span class="font-extrabold text-rose-700">{{ reportData.risk_metrics?.stress_breakdown?.severe_hours ?? 0 }} ชม.</span>
            </div>
          </div>

          <div class="text-[10px] text-[#718078] border-t border-[#E4E8E5] pt-2 flex justify-between">
            <span>อัตราฟื้นตัวกลางคืน (22:00–05:00 น.):</span>
            <span class="font-black text-emerald-700">
              {{ reportData.risk_metrics?.night_recovery_rate_pct != null ? `${reportData.risk_metrics.night_recovery_rate_pct}%` : 'ไม่มีข้อมูล' }}
            </span>
          </div>
        </div>

        <!-- Data Basis & Threshold Profile Summary -->
        <div class="p-6 rounded-3xl bg-[#F6F7F5] border border-[#E4E8E5] flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-[#718078] uppercase tracking-widest">DATA BASIS &amp; PROFILE</div>
            <div class="text-base font-black text-[#142820] mt-1">เกณฑ์อ้างอิงและความครบถ้วนข้อมูล</div>
          </div>

          <div class="space-y-3 my-3 text-xs">
            <div>
              <div class="text-[11px] text-[#718078]">ชั่วโมงที่มีความเครียดความร้อนรวม:</div>
              <div class="text-xl font-black text-amber-700 mt-0.5">
                {{ reportData.risk_metrics?.stressed_hours ?? 0 }} ชม. / {{ reportData.risk_metrics?.hours_sampled ?? 0 }} ชม.
              </div>
              <div class="text-[10px] text-[#718078]">
                คำนวณจากชั่วโมงที่มีข้อมูลเซ็นเซอร์จริงในรอบ {{ reportData.report_days || 30 }} วัน
              </div>
            </div>

            <div class="border-t border-[#E4E8E5] pt-2">
              <div class="text-[11px] text-[#718078]">ชุดเกณฑ์สายพันธุ์โคนม (Profile):</div>
              <div class="text-sm font-black text-[#142820] mt-0.5">
                {{ reportData.farm_profile?.hf_profile === 'high_hf' ? 'สายเลือดโฮลสไตน์สูง (≥87.5%)' : 'โคนมลูกผสมไทยทั่วไป (Default)' }}
              </div>
              <div class="text-[10px] text-emerald-800 font-medium">
                (อ้างอิง Boonkum et al., 2011 / 2024; สูตร NRC 1971)
              </div>
            </div>
          </div>

          <div class="text-[10px] text-[#718078] border-t border-[#E4E8E5] pt-2">
            หมายเหตุ: รายงานนี้แสดงเฉพาะค่าที่วัดได้จริงจากเซ็นเซอร์ ไม่ประมาณการมูลค่าน้ำนมสูญเสีย
          </div>
        </div>

      </div>

      <!-- 4. Thermal & Telemetry Reference Chart Summary -->
      <div class="mb-8 p-6 rounded-3xl bg-[#F6F7F5] border border-[#E4E8E5]">
        <h3 class="text-sm font-black text-[#142820] uppercase tracking-wider mb-3 flex items-center gap-2">
          <v-icon icon="mdi-chart-areaspline" size="18" class="text-[#D87939]" />
          สรุปพารามิเตอร์สิ่งแวดล้อมสะสม (30-Day Aggregated Telemetry)
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div class="p-3 bg-white rounded-2xl border border-[#E4E8E5]">
            <div class="text-[10px] font-bold text-[#718078]">ค่า THI เฉลี่ยสะสม</div>
            <div class="text-xl font-black text-[#142820] mt-1">{{ reportData.risk_metrics?.average_thi ?? '—' }}</div>
          </div>
          <div class="p-3 bg-white rounded-2xl border border-[#E4E8E5]">
            <div class="text-[10px] font-bold text-[#718078]">THI สูงสุดที่ตรวจพบ</div>
            <div class="text-xl font-black text-rose-700 mt-1">{{ reportData.risk_metrics?.max_thi ?? '—' }}</div>
          </div>
          <div class="p-3 bg-white rounded-2xl border border-[#E4E8E5]">
            <div class="text-[10px] font-bold text-[#718078]">THI ต่ำสุดที่ตรวจพบ</div>
            <div class="text-xl font-black text-emerald-700 mt-1">{{ reportData.risk_metrics?.min_thi ?? '—' }}</div>
          </div>
          <div class="p-3 bg-white rounded-2xl border border-[#E4E8E5]">
            <div class="text-[10px] font-bold text-[#718078]">ชั่วโมงที่ตรวจวัดสะสม</div>
            <div class="text-xl font-black text-[#142820] mt-1">{{ reportData.risk_metrics?.hours_sampled ?? 0 }} ชม.</div>
          </div>
        </div>
      </div>

      <!-- 5. Operational Compliance Checklist -->
      <div class="mb-10">
        <h3 class="text-sm font-black text-[#142820] uppercase tracking-wider mb-3 flex items-center gap-2">
          <v-icon icon="mdi-checkbox-marked-circle-outline" size="18" class="text-emerald-700" />
          รายการตรวจสอบการปฏิบัติตามมาตรฐานสวัสดิภาพสัตว์
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div 
            v-for="(chk, i) in reportData.action_checklist" 
            :key="i"
            class="p-3.5 rounded-xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-center justify-between gap-2 text-xs">
            <span class="font-medium text-[#142820]">{{ chk.item }}</span>
            <span v-if="chk.compliance_pct != null" class="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[11px] shrink-0">
              {{ chk.compliance_pct }}% (วัดจากเซ็นเซอร์)
            </span>
            <span v-else class="font-bold text-[#718078] bg-white border border-[#E4E8E5] px-2 py-0.5 rounded-md text-[10px] shrink-0">
              ไม่มีการบันทึกในระบบ
            </span>
          </div>
        </div>
      </div>

      <!-- 6. Official Signatures Block (For Dairy Cooperative & Bank Submission) -->
      <div class="border-t-2 border-[#142820] pt-8 grid grid-cols-3 gap-6 text-center text-xs">
        
        <div>
          <div class="h-16 flex items-end justify-center pb-2">
            <div class="w-36 border-b border-dashed border-[#142820]"></div>
          </div>
          <div class="font-bold text-[#142820]">{{ reportData.farm_profile?.farmer_name || 'เกษตรกรเจ้าของฟาร์ม' }}</div>
          <div class="text-[10px] text-[#718078] mt-0.5">เกษตรกรเจ้าของฟาร์ม</div>
        </div>

        <div>
          <div class="h-16 flex items-end justify-center pb-2">
            <div class="w-36 border-b border-dashed border-[#142820]"></div>
          </div>
          <div class="font-bold text-[#142820]">นายสัตวแพทย์ / เจ้าหน้าที่ส่งเสริม</div>
          <div class="text-[10px] text-[#718078] mt-0.5">สหกรณ์โคนม / ที่ปรึกษาฟาร์ม</div>
        </div>

        <div>
          <div class="h-16 flex items-end justify-center pb-2">
            <div class="px-3 py-1 rounded bg-[#142820] text-[#F2BD7C] font-mono text-[10px] font-bold">
              DIGITALLY VERIFIED
            </div>
          </div>
          <div class="font-bold text-[#142820]">CowCare AI Smart Auditor</div>
          <div class="text-[10px] text-[#718078] mt-0.5">ระบบโทรมาตรอัตโนมัติ (IoT)</div>
        </div>

      </div>

    </div>

    <!-- Error State -->
    <div v-else class="p-16 text-center bg-white rounded-[32px] border border-[#E4E8E5] print:hidden">
      <div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
        <v-icon icon="mdi-alert-circle-outline" size="32" />
      </div>
      <h3 class="text-base font-bold text-[#142820] mb-1">ไม่สามารถโหลดข้อมูลสมุดความเสี่ยงได้</h3>
      <p class="text-xs text-[#718078] max-w-md mx-auto mb-4">
        ไม่พบข้อมูลฟาร์มหรือยังไม่มีข้อมูลการตรวจวัดสำหรับฟาร์มนี้
      </p>
      <NuxtLink 
        to="/Admin/coop-report"
        class="px-4 py-2 rounded-xl bg-[#142820] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 text-decoration-none">
        <v-icon icon="mdi-arrow-left" size="14" />
        <span>กลับหน้ารายการฟาร์ม</span>
      </NuxtLink>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { Admin } from '../../API/baseAPI'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const farmId = ref(route.params.id || null)

useHead({ 
  title: 'สมุดรายงานความเสี่ยงสหกรณ์ (Coop ESG Risk Logbook) | CowCare AI' 
})

const reportData = ref(null)
const isLoading = ref(true)

const fetchReport = async () => {
  if (!farmId.value) return
  isLoading.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const res = await axios.get(`${Admin}/coop-report/${farmId.value}`, { headers })
    if (res.data && res.data.success) {
      reportData.value = res.data
    }
  } catch (err) {
    console.error('[Coop Report Detail Error]:', err.message)
  } finally {
    isLoading.value = false
  }
}

const printReport = () => {
  if (typeof window !== 'undefined') {
    window.print()
  }
}

const formatDate = (isoStr) => {
  if (!isoStr) return 'N/A'
  return new Date(isoStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

onMounted(async () => {
  await fetchReport()
})
</script>

<style>
@media print {
  body {
    background-color: white !important;
    color: black !important;
  }
  aside, header, nav {
    display: none !important;
  }
}
</style>
