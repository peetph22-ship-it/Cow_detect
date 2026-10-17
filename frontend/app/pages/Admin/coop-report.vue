<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-16">

    <!-- 🟢 1. Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
      <div>
        <h1 class="text-[32px] md:text-[40px] font-black text-[#142820] tracking-tight leading-tight mb-2 flex items-center gap-3">
          สมุดความเสี่ยง &amp; เอกสารยื่นสหกรณ์
          <span class="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-[12px] text-xs font-bold uppercase tracking-wider border border-emerald-200">
            Coop ESG Logbook Hub
          </span>
        </h1>
        <p class="text-[#718078] text-[15px] font-medium max-w-2xl">
          ระบบรายงานสถิติดัชนีความร้อนสะสม สวัสดิภาพโคนม (Animal Welfare) และการประเมินคาร์บอนฟุตพริ้นท์ สำหรับยื่นสหกรณ์โคนมและสถาบันการเงิน
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="fetchFarmsSummary"
          class="px-4 py-2.5 rounded-xl border border-[#E4E8E5] bg-white text-xs font-bold text-[#142820] hover:bg-[#F6F7F5] flex items-center gap-2 cursor-pointer shadow-xs">
          <v-icon :class="{ 'animate-spin': isLoading }" icon="mdi-refresh" size="16" />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>
    </div>

    <!-- 🟢 2. Toolbar: Title, Search & View Switcher (Table vs Card Grid) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-up">
      
      <!-- Left: Farm Title & Count -->
      <div class="flex items-center gap-3">
        <h3 class="text-lg md:text-xl font-black text-[#142820]">
          ฟาร์มทั้งหมด
        </h3>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#718078] border border-[#E4E8E5] shadow-2xs">
          {{ filteredFarms.length }} ฟาร์ม
        </span>
      </div>

      <!-- Right: Search Input + View Mode Switcher -->
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:w-80">
          <v-icon icon="mdi-magnify" size="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718078]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อฟาร์ม, สหกรณ์, เจ้าของ, จังหวัด..."
            class="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E8E5] rounded-xl text-xs font-medium text-[#142820] focus:outline-none focus:border-[#142820] transition-all shadow-xs"
          />
        </div>

        <!-- Segmented Toggle: Table View vs Card Grid View -->
        <div class="inline-flex items-center p-1 bg-white rounded-xl border border-[#E4E8E5] shadow-xs shrink-0">
          <button 
            type="button"
            @click="viewMode = 'table'"
            :class="viewMode === 'table' ? 'bg-[#142820] text-white shadow-xs' : 'text-[#718078] hover:text-[#142820] hover:bg-gray-50'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
            <v-icon icon="mdi-table-large" size="16" />
            <span class="hidden sm:inline">ตารางข้อมูล</span>
          </button>
          <button 
            type="button"
            @click="viewMode = 'grid'"
            :class="viewMode === 'grid' ? 'bg-[#142820] text-white shadow-xs' : 'text-[#718078] hover:text-[#142820] hover:bg-gray-50'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
            <v-icon icon="mdi-view-grid-outline" size="16" />
            <span class="hidden sm:inline">การ์ดฟาร์ม</span>
          </button>
        </div>
      </div>

    </div>

    <!-- 🟢 3. Loading / Empty States -->
    <div v-if="isLoading" class="p-16 text-center bg-white rounded-[32px] border border-[#E4E8E5]">
      <div class="w-10 h-10 border-4 border-[#142820] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs font-bold text-[#718078]">กำลังโหลดข้อมูลฟาร์มและสมุดความเสี่ยงสหกรณ์...</p>
    </div>

    <div v-else-if="filteredFarms.length === 0" class="p-16 text-center bg-white rounded-[32px] border border-[#E4E8E5]">
      <div class="w-16 h-16 rounded-2xl bg-[#F6F7F5] text-[#718078] flex items-center justify-center mx-auto mb-3">
        <v-icon icon="mdi-book-remove-outline" size="32" />
      </div>
      <h3 class="text-base font-bold text-[#142820] mb-1">ไม่พบข้อมูลฟาร์ม</h3>
      <p class="text-xs text-[#718078] max-w-md mx-auto mb-4">
        {{ searchQuery ? `ไม่พบฟาร์มที่ตรงตามเงื่อนไขการค้นหา "${searchQuery}"` : 'ไม่พบข้อมูลฟาร์มในระบบ' }}
      </p>
      <div v-if="searchQuery" class="flex items-center justify-center gap-3">
        <button 
          @click="searchQuery = ''"
          class="px-4 py-2 rounded-xl bg-[#142820] hover:bg-[#D87939] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5">
          <v-icon icon="mdi-refresh" size="14" />
          <span>ล้างคำค้นหา</span>
        </button>
      </div>
    </div>

    <template v-else>
      
      <!-- 🟢 VIEW A: Table View (ตารางข้อมูลฟาร์มทั้งหมด) -->
      <div 
        v-if="viewMode === 'table'"
        class="bg-white rounded-[28px] border border-[#E4E8E5] shadow-xs overflow-hidden animate-fade-up">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead class="bg-[#F6F7F5]/60 text-[11px] font-black text-[#718078] uppercase tracking-wider border-b border-[#E4E8E5]">
              <tr>
                <th class="py-4 px-5 text-center w-14">#</th>
                <th class="py-4 px-6">ข้อมูลฟาร์ม &amp; เกษตรกร</th>
                <th class="py-4 px-6">โครงสร้างโรงเรือน</th>
                <th class="py-4 px-6 text-center">เกรดสวัสดิภาพ (Welfare)</th>
                <th class="py-4 px-6 text-right">ค่าเฉลี่ย THI สะสม</th>
                <th class="py-4 px-6 text-center">Night Recovery</th>
                <th class="py-4 px-6 text-right">ผลกระทบน้ำนมสูญเสีย</th>
                <th class="py-4 px-6 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E4E8E5]/60">
              <tr 
                v-for="(farm, index) in filteredFarms" 
                :key="farm.id_farms"
                class="hover:bg-[#F6F7F5]/40 transition-colors">
                
                <!-- Index -->
                <td class="py-4 px-5 text-center font-bold text-[#718078]">
                  {{ index + 1 }}
                </td>

                <!-- Farm & Farmer Info -->
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-[#142820]/5 text-[#142820] flex items-center justify-center font-black text-sm shrink-0 border border-[#E4E8E5]">
                      <v-icon icon="mdi-barn" size="20" />
                    </div>
                    <div>
                      <div class="font-extrabold text-[#142820] text-sm flex items-center gap-1.5">
                        <span>{{ farm.name_farms }}</span>
                        <span class="text-[10px] text-[#718078] font-normal">({{ farm.barn_unit || 'โรงเรือน 1' }})</span>
                      </div>
                      <div class="text-[11px] text-[#718078] mt-0.5 flex items-center gap-1.5">
                        <span>{{ farm.farmer_name }}</span>
                        <span>•</span>
                        <span class="text-emerald-700 font-medium">{{ farm.cooperative }}</span>
                        <span>•</span>
                        <span>{{ farm.province }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Barn Structure Specs -->
                <td class="py-4 px-6">
                  <div class="space-y-1">
                    <div class="font-bold text-[#142820]">
                      สูง {{ farm.barn_height_m }} ม. · {{ farm.roof_type }}
                    </div>
                    <div class="text-[11px] text-[#718078] truncate max-w-[200px]">
                      {{ farm.cooling_system }}
                    </div>
                  </div>
                </td>

                <!-- Welfare Grade Badge -->
                <td class="py-4 px-6 text-center">
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border"
                    :class="farm.welfare_grade === 'A' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20' 
                      : farm.welfare_grade === 'B' 
                      ? 'bg-amber-50 text-amber-800 border-amber-300' 
                      : 'bg-rose-50 text-rose-800 border-rose-300'">
                    <span class="w-2 h-2 rounded-full" :class="farm.welfare_grade === 'A' ? 'bg-emerald-500' : farm.welfare_grade === 'B' ? 'bg-amber-500' : 'bg-rose-500'"></span>
                    <span>เกรด {{ farm.welfare_grade }}</span>
                    <span class="text-[10px] font-medium opacity-80">({{ farm.welfare_grade === 'A' ? 'ดีเยี่ยม' : farm.welfare_grade === 'B' ? 'ระดับดี' : 'ปรับปรุง' }})</span>
                  </div>
                </td>

                <!-- 30-Day Average THI -->
                <td class="py-4 px-6 text-right">
                  <div class="font-black text-sm text-[#142820]">
                    {{ farm.avg_thi }} THI
                  </div>
                  <div class="text-[10px] text-[#718078] mt-0.5">
                    สูงสุด {{ farm.max_thi }} THI
                  </div>
                </td>

                <!-- Night Recovery Rate -->
                <td class="py-4 px-6 text-center">
                  <span class="font-black text-xs px-2.5 py-0.5 rounded-md bg-[#F6F7F5] border border-[#E4E8E5]"
                    :class="farm.night_recovery_rate_pct >= 80 ? 'text-emerald-700' : 'text-amber-700'">
                    {{ farm.night_recovery_rate_pct }}%
                  </span>
                </td>

                <!-- Monthly Loss Impact -->
                <td class="py-4 px-6 text-right">
                  <div class="font-extrabold text-xs text-rose-700">
                    -{{ farm.monthly_loss_thb.toLocaleString() }} ฿/ด.
                  </div>
                  <div class="text-[10px] text-emerald-700 font-bold mt-0.5">
                    -{{ farm.methane_reduction_pct }}% CH₄
                  </div>
                </td>

                <!-- Action Button -->
                <td class="py-4 px-6 text-right">
                  <NuxtLink
                    :to="`/Admin/coop-report-${farm.id_farms}`"
                    class="px-3.5 py-2 rounded-xl bg-[#142820] hover:bg-[#D87939] text-white text-[11px] font-bold transition-all inline-flex items-center gap-1.5 text-decoration-none shadow-xs cursor-pointer">
                    <v-icon icon="mdi-file-document-outline" size="14" />
                    <span>เปิดสมุดความเสี่ยง</span>
                  </NuxtLink>
                </td>

              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 🟢 VIEW B: Card Grid View (การ์ดฟาร์ม) -->
      <div 
        v-else 
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
        <div 
          v-for="farm in filteredFarms" 
          :key="farm.id_farms"
          class="bg-white rounded-[28px] p-6 border border-[#E4E8E5] shadow-xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between group">
          
          <div>
            <!-- Card Header: Title & Welfare Badge -->
            <div class="flex items-start justify-between gap-3 mb-4">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-[#142820]/5 text-[#142820] flex items-center justify-center font-bold text-sm shrink-0 border border-[#E4E8E5]">
                  <v-icon icon="mdi-barn" size="22" />
                </div>
                <div>
                  <h4 class="font-black text-base text-[#142820] group-hover:text-[#D87939] transition-colors leading-snug">
                    {{ farm.name_farms }}
                  </h4>
                  <p class="text-xs text-[#718078] font-medium mt-0.5">
                    {{ farm.farmer_name }} • {{ farm.province }}
                  </p>
                </div>
              </div>

              <!-- Welfare Grade Pill -->
              <span 
                class="px-3 py-1 rounded-full text-xs font-black border shadow-2xs shrink-0"
                :class="farm.welfare_grade === 'A' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : farm.welfare_grade === 'B' 
                  ? 'bg-amber-50 text-amber-800 border-amber-300' 
                  : 'bg-rose-50 text-rose-800 border-rose-300'">
                เกรด {{ farm.welfare_grade }}
              </span>
            </div>

            <!-- Coop & Barn Tag -->
            <div class="mb-4 flex flex-wrap gap-1.5 text-[11px]">
              <span class="px-2.5 py-1 rounded-lg bg-[#F6F7F5] text-[#142820] font-bold border border-[#E4E8E5]">
                🏢 {{ farm.cooperative }}
              </span>
              <span class="px-2.5 py-1 rounded-lg bg-[#F6F7F5] text-[#718078] font-medium border border-[#E4E8E5]">
                สูง {{ farm.barn_height_m }} ม. ({{ farm.roof_type }})
              </span>
            </div>

            <!-- Metric Box (4 KPIs) -->
            <div class="grid grid-cols-2 gap-2 p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#E4E8E5] text-xs mb-4">
              <div>
                <div class="text-[10px] text-[#718078] font-bold">ค่า THI เฉลี่ยสะสม</div>
                <div class="text-sm font-black text-[#142820] mt-0.5">{{ farm.avg_thi }} THI</div>
              </div>
              <div>
                <div class="text-[10px] text-[#718078] font-bold">อัตราฟื้นตัวกลางคืน</div>
                <div class="text-sm font-black text-emerald-700 mt-0.5">{{ farm.night_recovery_rate_pct }}%</div>
              </div>
              <div class="pt-2 border-t border-[#E4E8E5]/70">
                <div class="text-[10px] text-[#718078] font-bold">สูญเสียน้ำนมดิบ</div>
                <div class="text-xs font-black text-rose-700 mt-0.5">-{{ farm.monthly_loss_thb.toLocaleString() }} ฿/ด.</div>
              </div>
              <div class="pt-2 border-t border-[#E4E8E5]/70">
                <div class="text-[10px] text-[#718078] font-bold">ลดก๊าซมีเทน</div>
                <div class="text-xs font-black text-emerald-700 mt-0.5">-{{ farm.methane_reduction_pct }}% CH₄</div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Button -->
          <NuxtLink
            :to="`/Admin/coop-report-${farm.id_farms}`"
            class="w-full py-2.5 px-4 rounded-xl bg-[#142820] hover:bg-[#D87939] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 text-decoration-none shadow-xs cursor-pointer group-hover:shadow-md">
            <v-icon icon="mdi-file-document-outline" size="16" />
            <span>เปิดสมุดความเสี่ยงสหกรณ์ (PDF)</span>
          </NuxtLink>

        </div>
      </div>

    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Admin } from '../../API/baseAPI'

definePageMeta({
  layout: 'admin'
})

useHead({ 
  title: 'สมุดความเสี่ยง & เอกสารยื่นสหกรณ์ (Coop ESG Risk Logbook) | CowCare AI' 
})

const farms = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const viewMode = ref('table') // 'table' | 'grid'

const fetchFarmsSummary = async () => {
  isLoading.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const res = await axios.get(`${Admin}/coop-report/farms-summary`, { headers })
    if (res.data && res.data.success) {
      farms.value = res.data.farms || []
    }
  } catch (err) {
    console.error('[Fetch Coop Farms Summary Error]:', err.message)
  } finally {
    isLoading.value = false
  }
}

// Search Filter (ชื่อฟาร์ม, สหกรณ์, เจ้าของ, จังหวัด, อำเภอ)
const filteredFarms = computed(() => {
  if (!searchQuery.value.trim()) return farms.value
  const q = searchQuery.value.toLowerCase().trim()
  return farms.value.filter(f => 
    (f.name_farms && f.name_farms.toLowerCase().includes(q)) ||
    (f.farmer_name && f.farmer_name.toLowerCase().includes(q)) ||
    (f.cooperative && f.cooperative.toLowerCase().includes(q)) ||
    (f.province && f.province.toLowerCase().includes(q)) ||
    (f.district && f.district.toLowerCase().includes(q)) ||
    (f.device_serial && f.device_serial.toLowerCase().includes(q))
  )
})

onMounted(async () => {
  await fetchFarmsSummary()
})
</script>

<style scoped>
/* Coop Report Roster Styles */
</style>
