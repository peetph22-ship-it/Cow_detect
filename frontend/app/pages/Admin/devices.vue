<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">

    <!-- 🟢 Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
      <div>
        <h1 class="text-[32px] md:text-[40px] font-black text-[#142820] tracking-tight leading-tight mb-2 flex items-center gap-3">
          จัดการอุปกรณ์ IoT & กล้อง
          <span class="px-3 py-1 bg-[#D87939]/10 text-[#D87939] rounded-[12px] text-xs font-bold uppercase tracking-wider border border-[#D87939]/20">
            Hardware & Edge AI
          </span>
        </h1>
        <p class="text-[#718078] text-[15px] font-medium max-w-2xl">
          ตรวจสอบสถานะการเชื่อมต่อ ฮาร์ดแวร์เซ็นเซอร์ตรวจวัดสิ่งแวดล้อม (ESP32-S3 SHT40/BMP280) และกล้อง CCTV ปัญญาประดิษฐ์ในเครือข่ายฟาร์มโคนม
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="openAddModal"
          class="bg-[#142820] hover:bg-[#1C362B] text-white px-6 py-3.5 rounded-[20px] font-bold shadow-[0_8px_20px_rgba(20,40,32,0.15)] hover:shadow-[0_12px_25px_rgba(20,40,32,0.25)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2.5 text-sm cursor-pointer">
          <v-icon icon="mdi-plus" size="18" />
          <span>ลงทะเบียนอุปกรณ์ใหม่</span>
        </button>
      </div>
    </div>

    <!-- 🟢 Summary Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up delay-100">
      
      <!-- Total Devices -->
      <div 
        @click="filterType = 'all'"
        class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-[#E4E8E5] shadow-[0_8px_30px_rgba(20,40,32,0.03)] hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer"
        :class="{ 'ring-2 ring-[#142820] bg-white': filterType === 'all' }">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold text-[#718078] uppercase tracking-[0.1em]">อุปกรณ์ทั้งหมด</span>
          <div class="w-11 h-11 rounded-2xl bg-[#142820]/5 text-[#142820] flex items-center justify-center">
            <v-icon icon="mdi-memory" size="22" />
          </div>
        </div>
        <div class="text-[36px] font-black text-[#142820] leading-none mb-2">{{ totalDevices }}</div>
        <div class="text-xs font-bold text-[#718078] flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-[#142820]"></span>
          <span>ในระบบทั้งหมด</span>
        </div>
      </div>

      <!-- Online Devices -->
      <div 
        @click="filterType = 'online'"
        class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-[#E4E8E5] shadow-[0_8px_30px_rgba(20,40,32,0.03)] hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer"
        :class="{ 'ring-2 ring-emerald-600 bg-white': filterType === 'online' }">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold text-emerald-700 uppercase tracking-[0.1em]">ออนไลน์ (ส่งข้อมูลสด)</span>
          <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <v-icon icon="mdi-wifi-check" size="22" />
          </div>
        </div>
        <div class="text-[36px] font-black text-emerald-700 leading-none mb-2">{{ onlineCount }}</div>
        <div class="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>ส่งข้อมูลภายใน 10 นาที</span>
        </div>
      </div>

      <!-- Offline Devices -->
      <div 
        @click="filterType = 'offline'"
        class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-[#E4E8E5] shadow-[0_8px_30px_rgba(20,40,32,0.03)] hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer"
        :class="{ 'ring-2 ring-amber-600 bg-white': filterType === 'offline' }">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold text-amber-700 uppercase tracking-[0.1em]">ออฟไลน์ (ขาดการติดต่อ)</span>
          <div class="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <v-icon icon="mdi-wifi-off" size="22" />
          </div>
        </div>
        <div class="text-[36px] font-black text-amber-700 leading-none mb-2">{{ offlineCount }}</div>
        <div class="text-xs font-bold text-amber-600 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>บอร์ดปิดเครื่องหรือสัญญาณขาด</span>
        </div>
      </div>

      <!-- Camera / Vision AI -->
      <div 
        @click="filterType = 'camera'"
        class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-[#E4E8E5] shadow-[0_8px_30px_rgba(20,40,32,0.03)] hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer"
        :class="{ 'ring-2 ring-[#D87939] bg-white': filterType === 'camera' }">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold text-[#D87939] uppercase tracking-[0.1em]">กล้อง CCTV / Vision AI</span>
          <div class="w-11 h-11 rounded-2xl bg-[#D87939]/10 text-[#D87939] flex items-center justify-center">
            <v-icon icon="mdi-cctv" size="22" />
          </div>
        </div>
        <div class="text-[36px] font-black text-[#D87939] leading-none mb-2">{{ cameraCount }}</div>
        <div class="text-xs font-bold text-[#D87939] flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-[#D87939]"></span>
          <span>ตรวจจับพฤติกรรมโค (YOLO)</span>
        </div>
      </div>

    </div>

    <!-- 🟢 Filter & Search Controls -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-4 border border-[#E4E8E5] flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
      <div class="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          @click="filterType = tab.value"
          class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer"
          :class="filterType === tab.value 
            ? 'bg-[#142820] text-white shadow-xs' 
            : 'text-[#5A6B63] hover:bg-[#F2F4F2] hover:text-[#142820]'">
          {{ tab.label }}
          <span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
            :class="filterType === tab.value ? 'bg-white/20 text-white' : 'bg-[#E4E8E5] text-[#5A6B63]'">
            {{ tab.count }}
          </span>
        </button>
      </div>

      <div class="relative w-full md:w-72">
        <v-icon icon="mdi-magnify" size="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718078]" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาชื่ออุปกรณ์, Serial, ฟาร์ม..."
          class="w-full pl-10 pr-4 py-2 bg-[#F6F7F5] border border-[#E4E8E5] rounded-xl text-xs font-medium text-[#142820] focus:outline-none focus:border-[#142820] focus:bg-white transition-all"
        />
      </div>
    </div>

    <!-- 🟢 Devices Data Table -->
    <div class="bg-white rounded-[28px] border border-[#E4E8E5] shadow-[0_8px_30px_rgba(20,40,32,0.03)] overflow-hidden">
      
      <div v-if="isLoading" class="p-16 text-center">
        <div class="w-10 h-10 border-4 border-[#142820] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-xs font-bold text-[#718078]">กำลังโหลดข้อมูลอุปกรณ์...</p>
      </div>

      <div v-else-if="filteredDevices.length === 0" class="p-16 text-center">
        <div class="w-16 h-16 rounded-2xl bg-[#F6F7F5] text-[#718078] flex items-center justify-center mx-auto mb-3">
          <v-icon icon="mdi-memory-off" size="32" />
        </div>
        <h3 class="text-base font-bold text-[#142820] mb-1">ไม่พบข้อมูลอุปกรณ์</h3>
        <p class="text-xs text-[#718078] max-w-sm mx-auto mb-4">ไม่มีอุปกรณ์ตรงตามเงื่อนไขการค้นหา คุณสามารถกดลงทะเบียนอุปกรณ์ใหม่ได้ทันที</p>
        <button
          @click="openAddModal"
          class="px-4 py-2 bg-[#142820] text-white rounded-xl text-xs font-bold hover:bg-[#1C362B] transition-all cursor-pointer">
          ลงทะเบียนอุปกรณ์แรก
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[#E4E8E5] bg-[#F6F7F5]/50 text-[11px] font-bold text-[#718078] uppercase tracking-wider">
              <th class="py-4 px-6">ชื่ออุปกรณ์ / Serial Number</th>
              <th class="py-4 px-6">ประเภท</th>
              <th class="py-4 px-6">ฟาร์ม & โรงเรือนที่ติดตั้ง</th>
              <th class="py-4 px-6">สถานะการเชื่อมต่อ</th>
              <th class="py-4 px-6">ข้อมูลโทรมาตรล่าสุด</th>
              <th class="py-4 px-6 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E4E8E5]/80 text-xs">
            <tr 
              v-for="device in filteredDevices" 
              :key="device.id_devices"
              class="hover:bg-[#F6F7F5]/60 transition-colors">
              
              <!-- Device Name & Serial -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div 
                    class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    :class="device.type === 'camera' ? 'bg-[#D87939]/10 text-[#D87939]' : 'bg-[#142820]/5 text-[#142820]'">
                    <v-icon :icon="device.type === 'camera' ? 'mdi-cctv' : 'mdi-chip'" size="20" />
                  </div>
                  <div>
                    <div class="font-bold text-[#142820] text-sm">{{ device.name_devices }}</div>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span class="font-mono text-[11px] text-[#718078] font-bold bg-[#F6F7F5] px-2 py-0.5 rounded border border-[#E4E8E5]">
                        {{ device.serial_no }}
                      </span>
                      <button 
                        @click="copySerial(device.serial_no)"
                        title="คัดลอก Serial No" 
                        class="text-[#718078] hover:text-[#142820] cursor-pointer">
                        <v-icon icon="mdi-content-copy" size="13" />
                      </button>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Type -->
              <td class="py-4 px-6">
                <span 
                  v-if="device.type === 'camera'"
                  class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D87939]/10 text-[#D87939] border border-[#D87939]/20 inline-flex items-center gap-1">
                  <v-icon icon="mdi-camera-iris" size="13" />
                  กล้อง AI (YOLO26)
                </span>
                <span 
                  v-else
                  class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#142820]/5 text-[#142820] border border-[#142820]/15 inline-flex items-center gap-1">
                  <v-icon icon="mdi-thermometer-lines" size="13" />
                  เซ็นเซอร์สภาพแวดล้อม
                </span>
              </td>

              <!-- Farm & Barn -->
              <td class="py-4 px-6">
                <div v-if="device.id_farms">
                  <NuxtLink 
                    :to="`/Admin/farms/farm_detail-${device.id_farms}`" 
                    class="font-bold text-[#142820] hover:text-[#D87939] text-decoration-none flex items-center gap-1">
                    {{ device.name_farms }}
                    <v-icon icon="mdi-arrow-top-right" size="13" />
                  </NuxtLink>
                  <div class="text-[11px] text-[#718078] mt-0.5">
                    {{ device.barn_unit }} • {{ device.province }}
                  </div>
                </div>
                <div v-else class="text-[#718078] italic">
                  ยังไม่ได้ผูกกับฟาร์ม
                </div>
              </td>

              <!-- Connection Status -->
              <td class="py-4 px-6">
                <div class="space-y-1">
                  <span 
                    class="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5"
                    :class="device.computed_status === 'online' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-stone-100 text-stone-600 border border-stone-200'">
                    <span 
                      class="w-1.5 h-1.5 rounded-full"
                      :class="device.computed_status === 'online' ? 'bg-emerald-500 animate-ping' : 'bg-stone-400'">
                    </span>
                    {{ device.computed_status === 'online' ? 'ออนไลน์ (Online)' : 'ออฟไลน์ (Offline)' }}
                  </span>
                </div>
              </td>

              <!-- Telemetry -->
              <td class="py-4 px-6">
                <div v-if="device.temperature_c != null" class="flex items-center gap-2">
                  <div class="bg-[#F6F7F5] px-2 py-1 rounded-lg border border-[#E4E8E5] text-center">
                    <div class="text-[9px] text-[#718078] font-bold uppercase">THI</div>
                    <div 
                      class="font-extrabold text-xs"
                      :class="device.thi >= 84 ? 'text-rose-600' : device.thi >= 80 ? 'text-amber-600' : 'text-emerald-700'">
                      {{ device.thi }}
                    </div>
                  </div>
                  <div class="bg-[#F6F7F5] px-2 py-1 rounded-lg border border-[#E4E8E5] text-center">
                    <div class="text-[9px] text-[#718078] font-bold uppercase">อุณหภูมิ</div>
                    <div class="font-bold text-xs text-[#142820]">{{ device.temperature_c }}°C</div>
                  </div>
                  <div class="bg-[#F6F7F5] px-2 py-1 rounded-lg border border-[#E4E8E5] text-center">
                    <div class="text-[9px] text-[#718078] font-bold uppercase">ความชื้น</div>
                    <div class="font-bold text-xs text-[#142820]">{{ device.humidity_pct }}%</div>
                  </div>
                </div>
                <div v-else class="text-[11px] text-[#718078] italic">
                  - ไม่มีข้อมูลล่าสุด -
                </div>
              </td>

              <!-- Actions -->
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openEditModal(device)"
                    class="p-2 rounded-xl text-[#718078] hover:text-[#142820] hover:bg-[#F2F4F2] transition-colors cursor-pointer"
                    title="แก้ไขอุปกรณ์">
                    <v-icon icon="mdi-pencil-outline" size="16" />
                  </button>
                  <button 
                    @click="confirmDelete(device)"
                    class="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="ลบอุปกรณ์">
                    <v-icon icon="mdi-trash-can-outline" size="16" />
                  </button>
                </div>
              </td>

            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- 🟢 Modal: Add / Edit Device -->
    <v-dialog v-model="showDeviceModal" max-width="520" persistent>
      <div class="bg-white rounded-[32px] overflow-hidden shadow-2xl border border-[#E4E8E5] font-sans">
        
        <div class="h-2 bg-[#142820] w-full"></div>

        <div class="p-6 md:p-8 space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-black text-[#142820]">
                {{ isEditMode ? 'แก้ไขข้อมูลอุปกรณ์' : 'ลงทะเบียนอุปกรณ์ใหม่' }}
              </h3>
              <p class="text-xs text-[#718078] mt-0.5">
                {{ isEditMode ? 'ปรับปรุงการตั้งค่าและฟาร์มที่ผูกกับฮาร์ดแวร์' : 'เพิ่มบอร์ดเซ็นเซอร์หรือกล้อง AI เข้าสู่เครือข่าย CowCare AI' }}
              </p>
            </div>
            <button 
              @click="showDeviceModal = false"
              class="w-8 h-8 rounded-full bg-[#F6F7F5] text-[#718078] hover:bg-[#E4E8E5] flex items-center justify-center cursor-pointer">
              <v-icon icon="mdi-close" size="16" />
            </button>
          </div>

          <form @submit.prevent="saveDevice" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-[#142820] mb-1.5">ชื่ออุปกรณ์ *</label>
              <input
                v-model="formDevice.name_devices"
                type="text"
                required
                placeholder="เช่น ESP32-S3 โรงเรือน 1, กล้อง AI ซองนอน A"
                class="w-full px-4 py-2.5 bg-[#F6F7F5] border border-[#E4E8E5] rounded-xl text-xs font-medium text-[#142820] focus:outline-none focus:border-[#142820] focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#142820] mb-1.5">Serial Number (MAC/UID) *</label>
              <input
                v-model="formDevice.serial_no"
                type="text"
                required
                placeholder="เช่น ESP32-S3-01, CAM-BARN-02"
                class="w-full px-4 py-2.5 bg-[#F6F7F5] border border-[#E4E8E5] rounded-xl text-xs font-mono font-bold text-[#142820] focus:outline-none focus:border-[#142820] focus:bg-white uppercase"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#142820] mb-1.5">ประเภทอุปกรณ์</label>
              <select
                v-model="formDevice.type"
                class="w-full px-4 py-2.5 bg-[#F6F7F5] border border-[#E4E8E5] rounded-xl text-xs font-medium text-[#142820] focus:outline-none focus:border-[#142820] focus:bg-white">
                <option value="env_sensor">เซ็นเซอร์สิ่งแวดล้อม (ESP32-S3 SHT40 + BMP280)</option>
                <option value="camera">กล้อง CCTV / Vision AI (YOLO26m พฤติกรรมโค)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#142820] mb-1.5">ผูกกับฟาร์ม</label>
              <select
                v-model="formDevice.id_farms"
                class="w-full px-4 py-2.5 bg-[#F6F7F5] border border-[#E4E8E5] rounded-xl text-xs font-medium text-[#142820] focus:outline-none focus:border-[#142820] focus:bg-white">
                <option :value="null">-- ยังไม่ระบุฟาร์ม (Unassigned) --</option>
                <option 
                  v-for="farm in farmOptions" 
                  :key="farm.id_farms" 
                  :value="farm.id_farms">
                  {{ farm.name_farms }} ({{ farm.barn_unit || 'โรงเรือน 1' }})
                </option>
              </select>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                @click="showDeviceModal = false"
                class="px-4 py-2.5 rounded-xl text-xs font-bold text-[#718078] hover:bg-[#F2F4F2] cursor-pointer">
                ยกเลิก
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#142820] hover:bg-[#1C362B] text-white flex items-center gap-2 cursor-pointer disabled:opacity-50">
                <v-icon v-if="!isSubmitting" icon="mdi-check" size="16" />
                <span>{{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกอุปกรณ์' }}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </v-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Admin } from '../../API/baseAPI'

definePageMeta({
  layout: 'admin'
})

useHead({ title: 'Device Management | CowCare AI' })

const devices = ref([])
const farmOptions = ref([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const filterType = ref('all')
const searchQuery = ref('')

const showDeviceModal = ref(false)
const isEditMode = ref(false)
const formDevice = ref({
  id_devices: null,
  name_devices: '',
  serial_no: '',
  type: 'env_sensor',
  id_farms: null
})

// Fetch Devices
const fetchDevices = async () => {
  isLoading.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const [devRes, farmRes] = await Promise.all([
      axios.get(`${Admin}/devices`, { headers }),
      axios.get(`${Admin}/farms/all`, { headers })
    ])

    if (devRes.data && devRes.data.devices) {
      devices.value = devRes.data.devices
    }
    if (farmRes.data && farmRes.data.rows) {
      farmOptions.value = farmRes.data.rows
    }
  } catch (err) {
    console.error('Fetch devices error:', err.message)
  } finally {
    isLoading.value = false
  }
}

// Stats Computed
const totalDevices = computed(() => devices.value.length)
const onlineCount = computed(() => devices.value.filter(d => d.computed_status === 'online').length)
const offlineCount = computed(() => totalDevices.value - onlineCount.value)
const cameraCount = computed(() => devices.value.filter(d => d.type === 'camera').length)

const filterTabs = computed(() => [
  { label: 'ทั้งหมด', value: 'all', count: totalDevices.value },
  { label: 'เซ็นเซอร์สิ่งแวดล้อม', value: 'env_sensor', count: devices.value.filter(d => d.type === 'env_sensor').length },
  { label: 'กล้อง AI', value: 'camera', count: cameraCount.value },
  { label: 'ออนไลน์', value: 'online', count: onlineCount.value },
  { label: 'ออฟไลน์', value: 'offline', count: offlineCount.value }
])

const filteredDevices = computed(() => {
  return devices.value.filter(d => {
    // Type Filter
    if (filterType.value === 'env_sensor' && d.type !== 'env_sensor') return false
    if (filterType.value === 'camera' && d.type !== 'camera') return false
    if (filterType.value === 'online' && d.computed_status !== 'online') return false
    if (filterType.value === 'offline' && d.computed_status !== 'offline') return false

    // Search Filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchName = (d.name_devices || '').toLowerCase().includes(q)
      const matchSerial = (d.serial_no || '').toLowerCase().includes(q)
      const matchFarm = (d.name_farms || '').toLowerCase().includes(q)
      if (!matchName && !matchSerial && !matchFarm) return false
    }

    return true
  })
})

const openAddModal = () => {
  isEditMode.value = false
  formDevice.value = {
    id_devices: null,
    name_devices: '',
    serial_no: '',
    type: 'env_sensor',
    id_farms: farmOptions.value.length ? farmOptions.value[0].id_farms : null
  }
  showDeviceModal.value = true
}

const openEditModal = (dev) => {
  isEditMode.value = true
  formDevice.value = {
    id_devices: dev.id_devices,
    name_devices: dev.name_devices,
    serial_no: dev.serial_no,
    type: dev.type || 'env_sensor',
    id_farms: dev.id_farms || null
  }
  showDeviceModal.value = true
}

const saveDevice = async () => {
  isSubmitting.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    if (isEditMode.value) {
      await axios.put(`${Admin}/devices/${formDevice.value.id_devices}`, formDevice.value, { headers })
    } else {
      await axios.post(`${Admin}/devices`, formDevice.value, { headers })
    }

    showDeviceModal.value = false
    await fetchDevices()
  } catch (err) {
    alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกอุปกรณ์')
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = async (dev) => {
  if (!confirm(`คุณต้องการลบอุปกรณ์ "${dev.name_devices}" (${dev.serial_no}) ใช่หรือไม่?`)) return
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    await axios.delete(`${Admin}/devices/${dev.id_devices}`, { headers })
    await fetchDevices()
  } catch (err) {
    alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบอุปกรณ์')
  }
}

const copySerial = (serial) => {
  if (navigator?.clipboard) {
    navigator.clipboard.writeText(serial)
    alert(`คัดลอก Serial Number "${serial}" แล้ว`)
  }
}

onMounted(() => {
  fetchDevices()
})
</script>
