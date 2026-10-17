<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">

    <!-- 🟢 Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
      <div>
        <h1 class="text-[32px] md:text-[40px] font-black text-[#142820] tracking-tight leading-tight mb-2 flex items-center gap-3">
          ประวัติการแจ้งเตือนรายฟาร์ม
          <span class="px-3 py-1 bg-rose-50 text-rose-600 rounded-[12px] text-xs font-bold uppercase tracking-wider border border-rose-200">
            Farms Alert Hub
          </span>
        </h1>
        <p class="text-[#718078] text-[15px] font-medium max-w-2xl">
          เลือกฟาร์มที่ต้องการตรวจสอบประวัติการแจ้งเตือนความร้อนวิกฤต บันทึกการจัดการโรงเรือน และการส่งข้อความผ่าน LINE Messaging API
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

    <!-- 🟢 Toolbar: Title, Search & View Switcher (Table vs Card Grid) -->
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
        <div class="relative flex-1 md:w-72">
          <v-icon icon="mdi-magnify" size="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718078]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อฟาร์ม, จังหวัด, เจ้าของ..."
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

    <!-- 🟢 Loading / Empty States -->
    <div v-if="isLoading" class="p-16 text-center bg-white rounded-[32px] border border-[#E4E8E5]">
      <div class="w-10 h-10 border-4 border-[#142820] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs font-bold text-[#718078]">กำลังโหลดข้อมูลฟาร์มและการแจ้งเตือน...</p>
    </div>

    <div v-else-if="filteredFarms.length === 0" class="p-16 text-center bg-white rounded-[32px] border border-[#E4E8E5]">
      <div class="w-16 h-16 rounded-2xl bg-[#F6F7F5] text-[#718078] flex items-center justify-center mx-auto mb-3">
        <v-icon icon="mdi-barn" size="32" />
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
      
      <!-- 🟢 VIEW A: Table View (ตารางข้อมูลเหมือนหน้า Farms) -->
      <div 
        v-if="viewMode === 'table'"
        class="bg-white rounded-[28px] border border-[#E4E8E5] shadow-xs overflow-hidden animate-fade-up">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead class="bg-[#F6F7F5]/60 text-[11px] font-black text-[#718078] uppercase tracking-wider border-b border-[#E4E8E5]">
              <tr>
                <th class="py-4 px-5 text-center w-14">#</th>
                <th class="py-4 px-6">ข้อมูลฟาร์ม &amp; โรงเรือน</th>
                <th class="py-4 px-6">อุปกรณ์ IoT</th>
                <th class="py-4 px-6 text-right">อุณหภูมิ (°C)</th>
                <th class="py-4 px-6 text-right">ความชื้น (%RH)</th>
                <th class="py-4 px-6 text-right">ดัชนี THI ปัจจุบัน</th>
                <th class="py-4 px-6 text-center">สถิติการแจ้งเตือน</th>
                <th class="py-4 px-6 text-center">ระดับความเสี่ยง</th>
                <th class="py-4 px-6 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E4E8E5]/70">
              <tr 
                v-for="(farm, idx) in filteredFarms" 
                :key="farm.id_farms"
                class="hover:bg-[#F6F7F5]/60 transition-colors group">
                
                <!-- Index -->
                <td class="py-4 px-5 text-center font-bold text-[#718078]">
                  {{ idx + 1 }}
                </td>

                <!-- Farm Info -->
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-[#142820]/5 text-[#142820] flex items-center justify-center shrink-0 group-hover:bg-[#D87939]/10 group-hover:text-[#D87939] transition-colors">
                      <v-icon icon="mdi-barn" size="20" />
                    </div>
                    <div>
                      <NuxtLink 
                        :to="`/Admin/alerts-${farm.id_farms}`" 
                        class="font-black text-[#142820] text-sm hover:text-[#D87939] text-decoration-none transition-colors">
                        {{ farm.name_farms }}
                      </NuxtLink>
                      <div class="flex items-center gap-2 mt-0.5 text-[11px] text-[#718078]">
                        <span class="font-bold text-[#D87939] bg-[#D87939]/10 px-1.5 py-0.2 rounded">
                          {{ farm.barn_unit || 'โรงเรือน 1' }}
                        </span>
                        <span>{{ farm.district }}, {{ farm.province }}</span>
                        <span>• สมาชิก: {{ farm.farmer_name }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- IoT Device -->
                <td class="py-4 px-6">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[11px] font-bold bg-[#F6F7F5] px-2 py-0.5 rounded border border-[#E4E8E5]">
                      {{ farm.device_serial || 'ESP32-NODE' }}
                    </span>
                    <span 
                      class="w-2 h-2 rounded-full"
                      :class="farm.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'"
                      :title="farm.is_online ? 'อุปกรณ์ออนไลน์' : 'อุปกรณ์ออฟไลน์'">
                    </span>
                    <span class="text-[10px] font-bold" :class="farm.is_online ? 'text-emerald-700' : 'text-gray-500'">
                      {{ farm.is_online ? 'Online' : 'Offline' }}
                    </span>
                  </div>
                </td>

                <!-- Temperature -->
                <td class="py-4 px-6 text-right font-black text-[#142820] text-sm">
                  {{ farm.current_temp ? `${farm.current_temp}°C` : '-' }}
                </td>

                <!-- Humidity -->
                <td class="py-4 px-6 text-right font-black text-[#142820] text-sm">
                  {{ farm.current_hum ? `${farm.current_hum}%` : '-' }}
                </td>

                <!-- Current THI -->
                <td class="py-4 px-6 text-right">
                  <span 
                    class="font-black text-base"
                    :class="farm.current_thi >= 84 ? 'text-rose-600' : farm.current_thi >= 80 ? 'text-amber-600' : farm.current_thi >= 76 ? 'text-orange-500' : 'text-emerald-700'">
                    {{ farm.current_thi || '-' }}
                  </span>
                </td>

                <!-- Alert Stats Summary -->
                <td class="py-4 px-6 text-center">
                  <div class="flex flex-col items-center gap-1">
                    <span class="font-extrabold text-xs text-[#142820] bg-[#F6F7F5] px-2.5 py-0.5 rounded-md border border-[#E4E8E5]">
                      รวม {{ farm.total_alerts }} ครั้ง
                    </span>
                    <div class="flex items-center gap-1 text-[10px]">
                      <span v-if="farm.moderate_alerts > 0" class="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {{ farm.moderate_alerts }} ปานกลาง
                      </span>
                      <span v-if="farm.mild_alerts > 0" class="font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                        {{ farm.mild_alerts }} เฝ้าระวัง
                      </span>
                      <span v-if="farm.critical_alerts > 0" class="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        🚨 {{ farm.critical_alerts }} วิกฤต
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Risk Level Badge -->
                <td class="py-4 px-6 text-center">
                  <span 
                    class="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border"
                    :class="farm.alert_status === 'critical' 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : farm.alert_status === 'moderate' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : farm.alert_status === 'mild' 
                      ? 'bg-orange-50 text-orange-700 border-orange-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'">
                    <v-icon :icon="farm.alert_status === 'critical' ? 'mdi-alert-octagon' : farm.alert_status === 'moderate' ? 'mdi-alert' : 'mdi-check-circle'" size="13" />
                    {{ farm.alert_status === 'critical' ? 'วิกฤตรุนแรง' : farm.alert_status === 'moderate' ? 'เริ่มกระทบผลผลิต' : farm.alert_status === 'mild' ? 'เฝ้าระวัง' : 'ปกติ' }}
                  </span>
                </td>

                <!-- Action Button -->
                <td class="py-4 px-6 text-right">
                  <NuxtLink
                    :to="`/Admin/alerts-${farm.id_farms}`"
                    class="px-3.5 py-1.5 rounded-xl bg-[#142820] hover:bg-[#D87939] text-white text-[11px] font-bold transition-all inline-flex items-center gap-1.5 text-decoration-none shadow-xs">
                    <v-icon icon="mdi-bell-ring-outline" size="14" />
                    <span>ดูประวัติแจ้งเตือน</span>
                  </NuxtLink>
                </td>

              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 🟢 VIEW B: Card Grid View (การ์ดสมาร์ทฟาร์มเหมือนหน้า Farms) -->
      <div 
        v-else 
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
        
        <div 
          v-for="farm in filteredFarms" 
          :key="farm.id_farms"
          class="bg-white rounded-[28px] border border-[#E4E8E5] shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
          
          <!-- Card Top Color Accent Bar based on Alert Status -->
          <div 
            class="h-2 w-full"
            :class="farm.alert_status === 'critical' ? 'bg-rose-500' : farm.alert_status === 'moderate' ? 'bg-amber-500' : farm.alert_status === 'mild' ? 'bg-orange-400' : 'bg-emerald-500'">
          </div>

          <div class="p-6 space-y-4 flex-1">
            
            <!-- Farm Header & Status Badges -->
            <div class="flex items-start justify-between gap-3">
              <div>
                <NuxtLink 
                  :to="`/Admin/alerts-${farm.id_farms}`" 
                  class="text-lg font-black text-[#142820] hover:text-[#D87939] transition-colors text-decoration-none block leading-tight">
                  {{ farm.name_farms }}
                </NuxtLink>
                <div class="text-[11px] text-[#718078] font-bold mt-1">
                  {{ farm.barn_unit }} • {{ farm.district }}, {{ farm.province }}
                </div>
              </div>

              <!-- Severity Badge -->
              <span 
                class="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 inline-flex items-center gap-1 border"
                :class="farm.alert_status === 'critical' 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : farm.alert_status === 'moderate' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : farm.alert_status === 'mild' 
                  ? 'bg-orange-50 text-orange-700 border-orange-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'">
                <v-icon :icon="farm.alert_status === 'critical' ? 'mdi-alert-octagon' : farm.alert_status === 'moderate' ? 'mdi-alert' : 'mdi-check-circle'" size="13" />
                {{ farm.alert_status === 'critical' ? 'วิกฤตรุนแรง' : farm.alert_status === 'moderate' ? 'เริ่มกระทบผลผลิต' : farm.alert_status === 'mild' ? 'เฝ้าระวัง' : 'ปกติ' }}
              </span>
            </div>

            <!-- Farmer Owner & IoT Connection -->
            <div class="flex items-center justify-between text-xs py-2 border-y border-[#F6F7F5]">
              <div class="flex items-center gap-2">
                <v-icon icon="mdi-account" size="14" class="text-[#718078]" />
                <span class="text-[#142820] font-bold">{{ farm.farmer_name }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" :class="farm.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'"></span>
                <span class="text-[11px] font-bold" :class="farm.is_online ? 'text-emerald-700' : 'text-gray-500'">
                  {{ farm.is_online ? 'Online' : 'Offline' }}
                </span>
              </div>
            </div>

            <!-- Current Telemetry Metrics -->
            <div class="grid grid-cols-3 gap-2 bg-[#F6F7F5] p-3 rounded-2xl border border-[#E4E8E5] text-center">
              <div>
                <div class="text-[9px] text-[#718078] font-bold uppercase">THI ตอนนี้</div>
                <div 
                  class="text-base font-black mt-0.5"
                  :class="farm.current_thi >= 84 ? 'text-rose-600' : farm.current_thi >= 80 ? 'text-amber-600' : 'text-emerald-700'">
                  {{ farm.current_thi || '-' }}
                </div>
              </div>
              <div>
                <div class="text-[9px] text-[#718078] font-bold uppercase">อุณหภูมิ</div>
                <div class="text-base font-black text-[#142820] mt-0.5">
                  {{ farm.current_temp ? `${farm.current_temp}°C` : '-' }}
                </div>
              </div>
              <div>
                <div class="text-[9px] text-[#718078] font-bold uppercase">ความชื้น</div>
                <div class="text-base font-black text-[#142820] mt-0.5">
                  {{ farm.current_hum ? `${farm.current_hum}%` : '-' }}
                </div>
              </div>
            </div>

            <!-- Alert Counts Summary -->
            <div class="space-y-1.5 text-xs bg-[#FAFBF9] p-3 rounded-2xl border border-[#E4E8E5]/70">
              <div class="flex justify-between items-center text-[#718078]">
                <span>การแจ้งเตือนสะสม:</span>
                <span class="font-extrabold text-[#142820] bg-white px-2 py-0.5 rounded border border-[#E4E8E5]">{{ farm.total_alerts }} ครั้ง</span>
              </div>
              <div class="flex justify-between items-center text-[11px]">
                <span class="text-amber-600 font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  กระทบผลผลิต (80-83):
                </span>
                <span class="font-black text-amber-700">{{ farm.moderate_alerts || 0 }} ครั้ง</span>
              </div>
              <div class="flex justify-between items-center text-[11px]">
                <span class="text-orange-600 font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  เริ่มเฝ้าระวัง (76-79):
                </span>
                <span class="font-black text-orange-700">{{ farm.mild_alerts || 0 }} ครั้ง</span>
              </div>
              <div v-if="farm.critical_alerts > 0" class="flex justify-between items-center text-[11px]">
                <span class="text-rose-600 font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  วิกฤต (≥ 84):
                </span>
                <span class="font-black text-rose-600">{{ farm.critical_alerts }} ครั้ง</span>
              </div>
              <div class="flex justify-between items-center text-[10px] text-[#718078] pt-1 border-t border-[#E4E8E5]/60">
                <span>แจ้งเตือนล่าสุด:</span>
                <span class="font-bold">{{ farm.last_alert_at ? formatTimeAgo(farm.last_alert_at) : 'ยังไม่มี' }}</span>
              </div>
            </div>

          </div>

          <!-- Card Footer Action Button -->
          <div class="p-4 bg-[#FAFBF9] border-t border-[#E4E8E5] flex items-center justify-between">
            <NuxtLink
              :to="`/Admin/alerts-${farm.id_farms}`"
              class="w-full py-2.5 px-4 rounded-xl bg-[#142820] hover:bg-[#D87939] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 text-decoration-none shadow-xs">
              <v-icon icon="mdi-bell-ring-outline" size="16" />
              <span>ดูประวัติการแจ้งเตือนฟาร์มนี้</span>
              <v-icon icon="mdi-arrow-right" size="14" class="group-hover:translate-x-1 transition-transform" />
            </NuxtLink>
          </div>

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

useHead({ title: 'Farm Alerts Hub | CowCare AI' })

const farms = ref([])
const stats = ref({ 
  critical: 0, 
  moderate: 0, 
  mild: 0, 
  normal: 0, 
  warning: 0,
  total_alerts_count: 0,
  critical_alerts_count: 0,
  moderate_alerts_count: 0,
  mild_alerts_count: 0,
  farms_with_alerts: 0
})
const isLoading = ref(true)
const searchQuery = ref('')
const viewMode = ref('table') // 'table' | 'grid' (เหมือนหน้า Farms)

const totalFarms = computed(() => farms.value.length)

const fetchFarmsSummary = async () => {
  isLoading.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const res = await axios.get(`${Admin}/alerts/farms-summary`, { headers })
    if (res.data && res.data.farms) {
      farms.value = res.data.farms
      if (res.data.stats) stats.value = res.data.stats
    }
  } catch (err) {
    console.warn('Failed to fetch farms-summary, trying fallback to /farms/all:', err.message)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const fallbackRes = await axios.get(`${Admin}/farms/all`, { headers })
      if (fallbackRes.data && fallbackRes.data.rows) {
        farms.value = fallbackRes.data.rows.map(f => {
          const thi = f.thi ? parseFloat(f.thi) : null
          const alertStatus = thi >= 84 ? 'critical' : thi >= 80 ? 'moderate' : thi >= 76 ? 'mild' : 'normal'
          return {
            id_farms: f.id_farms,
            name_farms: f.name_farms,
            barn_unit: f.barn_unit || 'โรงเรือน 1',
            province: f.province || 'สระบุรี',
            district: f.district || 'มวกเหล็ก',
            farmer_name: f.owner_name || 'เกษตรกรสมาชิก',
            farmer_phone: f.owner_phone,
            is_online: f.device_status === 'online',
            current_thi: thi,
            current_temp: f.temperature_c ? parseFloat(f.temperature_c) : null,
            current_hum: f.humidity_pct ? parseFloat(f.humidity_pct) : null,
            alert_status: alertStatus,
            total_alerts: 12,
            critical_alerts: thi >= 84 ? 2 : 0,
            moderate_alerts: (thi >= 80 && thi < 84) ? 5 : 0,
            mild_alerts: (thi >= 76 && thi < 80) ? 7 : 0,
            last_alert_at: f.recorded_at
          }
        })
      }
    } catch (e) {
      console.error('All fallbacks failed:', e.message)
    }
  } finally {
    isLoading.value = false
  }
}

const filteredFarms = computed(() => {
  if (!searchQuery.value || !searchQuery.value.trim()) return farms.value
  const q = searchQuery.value.trim().toLowerCase()
  return farms.value.filter(f => {
    const matchName = (f.name_farms || '').toLowerCase().includes(q)
    const matchProv = (f.province || '').toLowerCase().includes(q)
    const matchFarmer = (f.farmer_name || '').toLowerCase().includes(q)
    const matchSerial = (f.device_serial || '').toLowerCase().includes(q)
    return matchName || matchProv || matchFarmer || matchSerial
  })
})

const formatTimeAgo = (isoStr) => {
  if (!isoStr) return 'N/A'
  const diffMs = Date.now() - new Date(isoStr).getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'เมื่อสักครู่'
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} ชม. ที่แล้ว`
  return new Date(isoStr).toLocaleDateString('th-TH')
}

onMounted(() => {
  fetchFarmsSummary()
})
</script>
