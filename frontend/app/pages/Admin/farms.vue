<template>
  <v-container fluid class="py-10">

    <!-- Header Section (ส่วนหัวตามภาพ) -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
      <div>
        <h1 class="text-[32px] md:text-[40px] font-black text-[#24433a] tracking-tight leading-tight mb-2 flex items-center gap-3">
          การจัดการฟาร์มและ IoT
          <span class="px-3 py-1 bg-[#d87939]/10 text-[#d87939] rounded-[12px] text-xs font-bold uppercase tracking-wider border border-[#d87939]/20">
            Farms
          </span>
        </h1>
        <p class="text-[#718078] text-[15px] font-medium max-w-2xl">
          จัดการข้อมูลฟาร์มในเครือข่าย เฝ้าระวังอุณหภูมิ ความชื้น และค่า THI จากเซ็นเซอร์ IoT แบบเรียลไทม์
        </p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <!-- Live Polling Button -->
        <button 
          type="button"
          class="px-4 py-3.5 rounded-[20px] text-xs font-bold border shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:shadow-md bg-white text-[#718078] border-[#e5ece9]">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Live Sync (8s)</span>
        </button>

        <!-- Refresh Button -->
        <button 
          type="button" 
          @click="fetch"
          :disabled="isLoading"
          title="รีเฟรชข้อมูล"
          class="w-12 h-12 rounded-[20px] bg-white border border-[#e5ece9] hover:border-[#24433a]/30 text-[#24433a] shadow-sm hover:shadow-md flex items-center justify-center transition-all cursor-pointer disabled:opacity-50">
          <v-icon :class="{ 'animate-spin': isLoading }" icon="mdi-refresh" size="20" />
        </button>

        <!-- ➕ Add Farm Button -->
        <button
          type="button"
          @click="isAddModalOpen = true"
          class="bg-[#24433a] hover:bg-[#1a322b] text-white px-6 py-3.5 rounded-[20px] font-bold shadow-[0_8px_20px_rgba(36,67,58,0.15)] hover:shadow-[0_12px_25px_rgba(36,67,58,0.25)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2.5 text-sm cursor-pointer">
          <v-icon icon="mdi-plus" size="20" />
          <span>เพิ่มฟาร์มใหม่</span>
        </button>
      </div>
    </div>

  <!-- content -->
  <v-container fluid class="py-10">
    <v-card>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th class="text-center border">ลำดับ</th>
              <th class="text-center border">ฟาร์ม</th>
              <th class="text-center border">อุปกรณ์</th>
              <th class="text-center border">อุณหภูมิ(°C)</th>
              <th class="text-center border">ความชื้น(%RH)</th>
              <th class="text-center border">ค่า THI</th>
              <!-- <th class="text-center border">การประเมิน</th> -->
              <th class="text-center border">สถานะ</th>
              <th class="text-center border">รายละเอียด</th>
              <th class="text-center border">จัดการ</th>
            </tr>            
          </thead>
          <tbody>
            <tr v-for="(items,index) in farmData" :key="items.id_farms">
              <td class="text-center border">{{ index+1 }}</td>
              <td class="text-center border">{{ items.name_farms }}</td>
              <td class="text-center border">{{ items.name_devices || items.serial_no }}</td>
              <td class="text-center border">{{ items.temperature_c ? Number(items.temperature_c).toFixed(2) : '-' }}</td>
              <td class="text-center border">{{ items.humidity_pct ? Number(items.humidity_pct).toFixed(2) : '-' }}</td>
              <td class="text-center border font-bold">{{ items.thi ? Number(items.thi).toFixed(2) : '-' }}</td>
              <td class="text-center border">
                <v-btn :color="bg(items.thi)" rounded="3" size="small">{{ items.thi < 76 ? 'สภาวะปกติ' : items.thi < 80 ? 'เฝ้าระวัง' : items.thi < 84 ? 'เริ่มมีผลกระทบ' : 'ภาวะวิกฤต' }}</v-btn>
              </td>
              <td class="text-center border font-bold">
                <v-btn color="primary" rounded="3" size="small" prepend-icon="mdi-eye-outline" @click="">รายละเอียด</v-btn>
              </td>
              <td class="text-center border">
                <v-btn size="small" color="warning" rounded="4" prepend-icon="mdi-pencil-outline" @click="openEditModal(items)">จัดการ</v-btn>
              </td>
            </tr>
            <tr v-if="farmData.length === 0">
              <td class="text-center border" colspan="10">ไม่พบข้อมูล</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </v-container>

  <!-- 🟢 Add Farm Modal Component -->
  <AdminAddFarmModal v-model="isAddModalOpen" @success="handleFarmAdded" />

  <!-- 🟢 Edit & Delete Farm Modal Component -->
  <AdminEditFarmModal 
    v-model="isEditModalOpen" 
    :farm="selectedFarm" 
    @updated="fetch" 
    @deleted="fetch" 
  />

  </v-container>
</template>

<script setup>
import axios from 'axios'
import { Admin, api } from '../../API/baseAPI'
import AdminAddFarmModal from '../../components/Admin/farm/AddFarmModal.vue'
import AdminEditFarmModal from '../../components/Admin/farm/EditFarmModal.vue'

definePageMeta({
  layout: 'admin'
})

const farmData = ref([])
const isLoading = ref(false)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedFarm = ref(null)
const token = process.client ? localStorage.getItem('token') : null

// เปิด Modal แก้ไขฟาร์ม
const openEditModal = (farm) => {
  selectedFarm.value = farm
  isEditModalOpen.value = true
}

// Fetch Screen
const fetch = async () => {
  isLoading.value = true
  try {
    const res_Farm = await axios.get(`${Admin}/farms/all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    farmData.value = res_Farm.data.rows
    // console.log(farmData.value)
  } catch(err) {
    console.error("Error!, Can't Fetching:", err)
  } finally {
    isLoading.value = false
  }
}

// Callback เมื่อเพิ่มฟาร์มสำเร็จ
const handleFarmAdded = () => {
  fetch()
}

// bg status thi
const bg = (thi) => {
  if (thi < 76) return 'success'
  else if (thi < 80) return 'warning'
  else if (thi < 84) return 'bg-orange-lighten-3'
  else return 'error'
}

onMounted(fetch)
</script>
