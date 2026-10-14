<template>
  <v-dialog v-model="internalModel" max-width="580" persistent transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(36,67,58,0.22)] border border-[#24433a]/10 font-sans">
      
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-[#24433a] via-[#1f3c34] to-[#162e27] text-white p-6 relative overflow-hidden">
        <!-- Ambient Glow -->
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-start justify-between relative z-10">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-[18px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <v-icon icon="mdi-home-edit-outline" size="26" class="text-white" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-black tracking-tight text-white">แก้ไขข้อมูลฟาร์ม</h3>
                <span class="px-2.5 py-0.5 rounded-full bg-[#d87939]/20 text-[#f59e0b] text-[10px] font-bold border border-[#d87939]/30 uppercase tracking-wider">
                  Edit Farm
                </span>
              </div>
              <p class="text-xs text-white/75 mt-0.5 font-medium">ปรับปรุงข้อมูลฟาร์ม และอุปกรณ์ IoT ประจำฟาร์ม</p>
            </div>
          </div>

          <!-- Close Button -->
          <button 
            type="button" 
            @click="closeModal" 
            :disabled="isLoading || isDeleting"
            class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
            <v-icon icon="mdi-close" size="18" class="text-white" />
          </button>
        </div>
      </div>

      <!-- 🟢 Form Body -->
      <form @submit.prevent="submitEdit" class="p-6 md:p-8 space-y-5 bg-[#fafcfb] max-h-[75vh] overflow-y-auto">
        
        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[16px] flex items-center gap-2.5 animate-fade-in">
          <v-icon icon="mdi-alert-circle-outline" size="18" class="text-rose-500 shrink-0" />
          <span class="font-medium">{{ errorMessage }}</span>
        </div>

        <!-- 1. ชื่อฟาร์ม (เลือกเฉพาะจากสมาชิกเท่านั้น) -->
        <div>
          <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>ชื่อฟาร์ม (เลือกจากสมาชิก) <span class="text-rose-500">*</span></span>
            <span v-if="isFetchingUsers" class="text-[11px] text-[#718078] font-normal">กำลังโหลดรายชื่อ...</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-barn" size="19" class="text-[#718078]" />
            </div>
            <select
              v-model="form.name_farms"
              required
              class="w-full appearance-none bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-10 py-3 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all cursor-pointer">
              <option value="" disabled>-- เลือกชื่อฟาร์มจากสมาชิก (Users) --</option>
              <!-- ตัวเลือกฟาร์มปัจจุบัน ถ้ายังไม่มีในรายชื่อสมาชิก -->
              <option 
                v-if="currentFarmNotInOptions" 
                :value="form.name_farms">
                {{ form.name_farms }} [ฟาร์มเดิม]
              </option>
              <option 
                v-for="u in userFarmOptions" 
                :key="u.id_users" 
                :value="u.farmName">
                {{ u.label }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-chevron-down" size="20" class="text-[#718078]" />
            </div>
          </div>
          <p class="text-[11px] text-[#718078] mt-1">เลือกชื่อฟาร์ม/สังกัดจากสมาชิกในระบบ</p>
        </div>

        <!-- 1.1 โรงเรือนย่อย (Sub-Barn Unit) -->
        <div>
          <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>หมายเลข/ชื่อโรงเรือนย่อย <span class="text-rose-500">*</span></span>
            <span class="text-[11px] text-[#718078] font-normal">เช่น โรงเรือนที่ 1 (โครีดนม)</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-home-analytics" size="19" class="text-[#718078]" />
            </div>
            <input 
              v-model="form.barn_unit" 
              type="text" 
              required
              placeholder="ระบุชื่อโรงเรือน เช่น โรงเรือนที่ 1 (โครีดนม), โรงเรือน A"
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-4 py-3 text-sm font-bold text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all" />
          </div>
        </div>

        <!-- 2. จังหวัด (แบบพิมพ์) -->
        <div>
          <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
            จังหวัด <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-map-marker-outline" size="19" class="text-[#718078]" />
            </div>
            <input 
              v-model="form.province" 
              type="text" 
              required
              placeholder="กรอกชื่อจังหวัด เช่น สระบุรี, เชียงใหม่"
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-4 py-3 text-sm font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all" />
          </div>
        </div>

        <!-- 3. อำเภอ / ตำบล และ ที่อยู่ -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              อำเภอ / ตำบล
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
                <v-icon icon="mdi-navigation-variant-outline" size="18" class="text-[#718078]" />
              </div>
              <input 
                v-model="form.district" 
                type="text" 
                placeholder="เช่น มวกเหล็ก, ปากช่อง"
                class="w-full bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-4 py-3 text-sm font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              ที่อยู่ / ที่ตั้งฟาร์ม
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
                <v-icon icon="mdi-office-building-marker-outline" size="18" class="text-[#718078]" />
              </div>
              <input 
                v-model="form.address" 
                type="text" 
                placeholder="เช่น 123 หมู่ 4 ต.มิตรภาพ"
                class="w-full bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-4 py-3 text-sm font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all" />
            </div>
          </div>
        </div>

        <!-- 4. เลือกอุปกรณ์ IoT (ไม่มี icon ใน option, ไม่มีระบุ serial, ไม่มีไม่มีอุปกรณ์, ไม่มีรูปดาว) -->
        <div>
          <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>เลือกอุปกรณ์ IoT <span class="text-rose-500">*</span></span>
            <span v-if="isFetchingDevices" class="text-[11px] text-[#718078] font-normal">กำลังโหลดอุปกรณ์...</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-chip" size="19" class="text-[#718078]" />
            </div>
            <select
              v-model="form.id_devices"
              required
              class="w-full appearance-none bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-10 py-3 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all cursor-pointer">
              <option value="" disabled>-- เลือกอุปกรณ์ IoT --</option>
              <option 
                v-for="dev in devicesList" 
                :key="dev.id_devices" 
                :value="dev.id_devices">
                {{ dev.name_devices || dev.serial_no }} ({{ dev.serial_no }}) - {{ dev.status === 'online' ? 'Online' : 'Offline' }} {{ dev.id_farms === farm?.id_farms ? '[อุปกรณ์ปัจจุบัน]' : '' }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-chevron-down" size="20" class="text-[#718078]" />
            </div>
          </div>
        </div>

        <!-- 🟢 Footer Action Buttons -->
        <div class="pt-5 border-t border-[#e5ece9] flex items-center justify-between gap-3">
          <!-- 🗑️ ปุ่มลบฟาร์ม (ด้านซ้าย) -->
          <button 
            type="button" 
            @click="isConfirmDeleteOpen = true" 
            :disabled="isLoading || isDeleting"
            class="px-4 py-3 rounded-[18px] text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <v-icon icon="mdi-trash-can-outline" size="16" class="text-rose-600" />
            <span>ลบฟาร์มนี้</span>
          </button>

          <!-- ปุ่มยกเลิก & บันทึก (ด้านขวา) -->
          <div class="flex items-center gap-2.5">
            <button 
              type="button" 
              @click="closeModal" 
              :disabled="isLoading || isDeleting"
              class="px-5 py-3 rounded-[18px] text-sm font-bold text-[#718078] hover:bg-black/5 transition-all cursor-pointer disabled:opacity-50">
              ยกเลิก
            </button>
            
            <button 
              type="submit" 
              :disabled="isLoading || isDeleting"
              class="px-6 py-3 rounded-[18px] text-sm font-bold text-white bg-[#24433a] hover:bg-[#1a322b] shadow-[0_8px_20px_rgba(36,67,58,0.2)] hover:shadow-[0_12px_25px_rgba(36,67,58,0.3)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <svg v-if="isLoading" class="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <v-icon v-else icon="mdi-check-circle-outline" size="18" class="text-white" />
              <span>{{ isLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  </v-dialog>

  <!-- 🔴 Delete Confirmation Dialog -->
  <v-dialog v-model="isConfirmDeleteOpen" max-width="440" persistent transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(225,29,72,0.25)] border border-rose-100 font-sans p-6 text-center space-y-4">
      <div class="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center border border-rose-100">
        <v-icon icon="mdi-trash-can-alert-outline" size="32" class="text-rose-500" />
      </div>

      <div>
        <h4 class="text-lg font-black text-[#1f3d34]">ยืนยันการลบฟาร์ม</h4>
        <p class="text-xs text-[#718078] mt-1">
          คุณต้องการลบฟาร์ม <span class="font-bold text-rose-600">"{{ form.name_farms }}"</span> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
        </p>
      </div>

      <div class="pt-2 flex items-center justify-center gap-3">
        <button 
          type="button" 
          @click="isConfirmDeleteOpen = false" 
          :disabled="isDeleting"
          class="px-5 py-2.5 rounded-[16px] text-xs font-bold text-[#718078] hover:bg-black/5 transition-all cursor-pointer">
          ยกเลิก
        </button>
        <button 
          type="button" 
          @click="executeDelete" 
          :disabled="isDeleting"
          class="px-5 py-2.5 rounded-[16px] text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          <svg v-if="isDeleting" class="animate-spin w-3.5 h-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <v-icon v-else icon="mdi-trash-can-outline" size="16" class="text-white" />
          <span>{{ isDeleting ? 'กำลังลบ...' : 'ยืนยันลบฟาร์ม' }}</span>
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Admin } from '../../../API/baseAPI'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  farm: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['update:modelValue', 'updated', 'deleted'])

const internalModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isLoading = ref(false)
const isDeleting = ref(false)
const isFetchingDevices = ref(false)
const isFetchingUsers = ref(false)
const isConfirmDeleteOpen = ref(false)
const errorMessage = ref('')
const devicesList = ref([])
const usersList = ref([])

// Form State
const form = ref({
  name_farms: '',
  barn_unit: 'โรงเรือนหลัก (Unit 1)',
  province: '',
  district: '',
  address: '',
  id_devices: ''
})

const token = process.client ? localStorage.getItem('token') : null

// โหลดข้อมูลฟาร์มเข้าฟอร์ม
const loadFarmData = () => {
  if (props.farm) {
    form.value = {
      name_farms: props.farm.name_farms || '',
      barn_unit: props.farm.barn_unit || 'โรงเรือนหลัก (Unit 1)',
      province: props.farm.province || '',
      district: props.farm.district || '',
      address: props.farm.address || '',
      id_devices: props.farm.id_devices || ''
    }
  }
}

// ดึงรายการ Users สำหรับตัวเลือกชื่อฟาร์ม
const fetchUsers = async () => {
  isFetchingUsers.value = true
  try {
    const res = await axios.get(`${Admin}/farms/user_farms`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data && res.data.rows) {
      usersList.value = res.data.rows
    }
  } catch (err) {
    console.warn("Could not fetch users list:", err.message)
  } finally {
    isFetchingUsers.value = false
  }
}

// ตัวเลือกชื่อฟาร์มจากสมาชิก
const userFarmOptions = computed(() => {
  if (!usersList.value || usersList.value.length === 0) return []
  return usersList.value.map(u => {
    const farmName = (u.organization && u.organization.trim())
      ? u.organization.trim()
      : (u.name_users ? `ฟาร์ม${u.name_users}` : `ฟาร์มสมาชิก #${u.id_users}`)
    
    return {
      id_users: u.id_users,
      farmName: farmName,
      name_users: u.name_users || '-',
      label: `${farmName} (เจ้าของ: ${u.name_users || '-'})`
    }
  })
})

// ตรวจสอบว่าชื่อฟาร์มปัจจุบันอยู่ในรายการตัวเลือกสมาชิกหรือไม่
const currentFarmNotInOptions = computed(() => {
  if (!form.value.name_farms) return false
  return !userFarmOptions.value.some(u => u.farmName === form.value.name_farms)
})

// ดึงรายการอุปกรณ์ IoT
const fetchDevices = async () => {
  isFetchingDevices.value = true
  try {
    const res = await axios.get(`${Admin}/farms/devices`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data && res.data.devices) {
      devicesList.value = res.data.devices
      // ถ้าฟอร์มยังไม่ได้ตั้ง id_devices และมีอุปกรณ์ในฟาร์มเดิม
      if (!form.value.id_devices && props.farm?.id_devices) {
        form.value.id_devices = props.farm.id_devices
      }
    }
  } catch (err) {
    console.warn("Could not fetch devices list:", err.message)
  } finally {
    isFetchingDevices.value = false
  }
}

// ปิด Modal
const closeModal = () => {
  if (isLoading.value || isDeleting.value) return
  internalModel.value = false
  errorMessage.value = ''
  isConfirmDeleteOpen.value = false
}

// ส่งฟอร์มแก้ไข
const submitEdit = async () => {
  if (!form.value.name_farms || !form.value.name_farms.trim()) {
    errorMessage.value = 'กรุณาระบุชื่อฟาร์ม'
    return
  }
  if (!form.value.barn_unit || !form.value.barn_unit.trim()) {
    errorMessage.value = 'กรุณาระบุหมายเลขหรือชื่อโรงเรือนย่อย'
    return
  }
  if (!form.value.province || !form.value.province.trim()) {
    errorMessage.value = 'กรุณากรอกชื่อจังหวัด'
    return
  }
  if (!form.value.id_devices) {
    errorMessage.value = 'กรุณาเลือกอุปกรณ์ IoT'
    return
  }
  if (!props.farm?.id_farms) {
    errorMessage.value = 'ไม่พบรหัสฟาร์ม'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const selectedOption = userFarmOptions.value.find(opt => opt.farmName === form.value.name_farms)
    const payload = {
      name_farms: form.value.name_farms.trim(),
      barn_unit: form.value.barn_unit.trim(),
      id_users: selectedOption ? selectedOption.id_users : props.farm?.id_users,
      province: form.value.province.trim(),
      district: form.value.district ? form.value.district.trim() : null,
      address: form.value.address ? form.value.address.trim() : null,
      id_devices: form.value.id_devices
    }

    const res = await axios.put(`${Admin}/farms/${props.farm.id_farms}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data && res.data.success) {
      emit('updated', res.data)
      closeModal()
    } else {
      errorMessage.value = res.data?.message || 'บันทึกการแก้ไขไม่สำเร็จ'
    }
  } catch (err) {
    console.error('Update Farm Error:', err)
    errorMessage.value = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
  } finally {
    isLoading.value = false
  }
}

// ดำเนินการลบฟาร์ม
const executeDelete = async () => {
  if (!props.farm?.id_farms) return

  isDeleting.value = true
  errorMessage.value = ''

  try {
    const res = await axios.delete(`${Admin}/farms/${props.farm.id_farms}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data && res.data.success) {
      isConfirmDeleteOpen.value = false
      emit('deleted', props.farm.id_farms)
      closeModal()
    } else {
      errorMessage.value = res.data?.message || 'ไม่สามารถลบฟาร์มได้'
      isConfirmDeleteOpen.value = false
    }
  } catch (err) {
    console.error('Delete Farm Error:', err)
    errorMessage.value = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการลบฟาร์ม'
    isConfirmDeleteOpen.value = false
  } finally {
    isDeleting.value = false
  }
}

// เมื่อเปิด Modal หรือ props.farm เปลี่ยน
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadFarmData()
    fetchDevices()
    fetchUsers()
  }
})

watch(() => props.farm, () => {
  if (props.modelValue) {
    loadFarmData()
  }
})
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}
</style>
