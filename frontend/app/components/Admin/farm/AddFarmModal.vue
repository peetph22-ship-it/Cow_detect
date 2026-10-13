<template>
  <v-dialog v-model="internalModel" max-width="580" persistent transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(36,67,58,0.22)] border border-[#24433a]/10 font-sans">
      
      <!-- 🟢 Modal Header -->
      <div class="bg-gradient-to-r from-[#24433a] via-[#1f3c34] to-[#162e27] text-white p-6 relative overflow-hidden">
        <!-- Ambient Glow -->
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-[#d87939]/15 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-start justify-between relative z-10">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-[18px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <v-icon icon="mdi-barn" size="26" class="text-white" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-black tracking-tight text-white">เพิ่มข้อมูลฟาร์มใหม่</h3>
                <span class="px-2.5 py-0.5 rounded-full bg-[#d87939]/20 text-[#f59e0b] text-[10px] font-bold border border-[#d87939]/30 uppercase tracking-wider">
                  Farm & IoT
                </span>
              </div>
              <p class="text-xs text-white/75 mt-0.5 font-medium">บันทึกข้อมูลโรงเรือนโคนม และผูกอุปกรณ์เซ็นเซอร์ IoT เข้าสู่เครือข่าย</p>
            </div>
          </div>

          <!-- Close Button -->
          <button 
            type="button" 
            @click="closeModal" 
            :disabled="isLoading"
            class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
            <v-icon icon="mdi-close" size="18" class="text-white" />
          </button>
        </div>
      </div>

      <!-- 🟢 Form Body -->
      <form @submit.prevent="submitForm" class="p-6 md:p-8 space-y-5 bg-[#fafcfb] max-h-[75vh] overflow-y-auto">
        
        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-[16px] flex items-center gap-2.5 animate-fade-in">
          <v-icon icon="mdi-alert-circle-outline" size="18" class="text-rose-500 shrink-0" />
          <span class="font-medium">{{ errorMessage }}</span>
        </div>

        <!-- 1. ชื่อฟาร์ม (เลือกจาก Users ที่มีข้อมูลฟาร์ม) -->
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
          <p class="text-[11px] text-[#718078] mt-1">ดึงข้อมูลชื่อฟาร์ม/สังกัดจากสมาชิกในระบบ</p>
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

        <!-- 4. เลือกอุปกรณ์ IoT -->
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
                {{ dev.name_devices || dev.serial_no }} ({{ dev.serial_no }}) - {{ dev.status === 'online' ? 'Online' : 'Offline' }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-chevron-down" size="20" class="text-[#718078]" />
            </div>
          </div>
        </div>

        <!-- 🟢 Footer Action Buttons -->
        <div class="pt-4 border-t border-[#e5ece9] flex items-center justify-end gap-3">
          <button 
            type="button" 
            @click="closeModal" 
            :disabled="isLoading"
            class="px-5 py-3 rounded-[18px] text-sm font-bold text-[#718078] hover:bg-black/5 transition-all cursor-pointer disabled:opacity-50">
            ยกเลิก
          </button>
          
          <button 
            type="submit" 
            :disabled="isLoading"
            class="px-6 py-3 rounded-[18px] text-sm font-bold text-white bg-[#24433a] hover:bg-[#1a322b] shadow-[0_8px_20px_rgba(36,67,58,0.2)] hover:shadow-[0_12px_25px_rgba(36,67,58,0.3)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <svg v-if="isLoading" class="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <v-icon v-else icon="mdi-check-circle-outline" size="18" class="text-white" />
            <span>{{ isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลฟาร์ม' }}</span>
          </button>
        </div>

      </form>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { Admin } from '../../../API/baseAPI'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const internalModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isLoading = ref(false)
const isFetchingDevices = ref(false)
const isFetchingUsers = ref(false)
const errorMessage = ref('')
const devicesList = ref([])
const usersList = ref([])

// Form State
const form = ref({
  name_farms: '',
  province: '',
  district: '',
  address: '',
  id_devices: ''
})

const token = process.client ? localStorage.getItem('token') : null

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

// แปลงรายการ Users เป็นตัวเลือกชื่อฟาร์ม
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

// ดึงรายการอุปกรณ์ IoT
const fetchDevices = async () => {
  isFetchingDevices.value = true
  try {
    const res = await axios.get(`${Admin}/farms/devices`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data && res.data.devices) {
      devicesList.value = res.data.devices
      if (!form.value.id_devices && devicesList.value.length > 0) {
        form.value.id_devices = devicesList.value[0].id_devices
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
  if (isLoading.value) return
  internalModel.value = false
  errorMessage.value = ''
}

// รีเซ็ตฟอร์ม
const resetForm = () => {
  form.value = {
    name_farms: '',
    province: '',
    district: '',
    address: '',
    id_devices: devicesList.value.length > 0 ? devicesList.value[0].id_devices : ''
  }
  errorMessage.value = ''
}

// ส่งฟอร์มบันทึก
const submitForm = async () => {
  if (!form.value.name_farms || !form.value.name_farms.trim()) {
    errorMessage.value = 'กรุณาเลือกชื่อฟาร์มจากสมาชิก'
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

  isLoading.value = true
  errorMessage.value = ''

  try {
    const payload = {
      name_farms: form.value.name_farms.trim(),
      province: form.value.province.trim(),
      district: form.value.district ? form.value.district.trim() : null,
      address: form.value.address ? form.value.address.trim() : null,
      id_devices: form.value.id_devices
    }

    const res = await axios.post(`${Admin}/farms`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data && res.data.success) {
      emit('success', res.data)
      closeModal()
      resetForm()
    } else {
      errorMessage.value = res.data?.message || 'บันทึกข้อมูลไม่สำเร็จ'
    }
  } catch (err) {
    console.error('Add Farm Error:', err)
    errorMessage.value = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
  } finally {
    isLoading.value = false
  }
}

// เมื่อเปิด Modal ให้โหลดทั้ง Devices และ Users
watch(internalModel, (newVal) => {
  if (newVal) {
    fetchUsers()
    fetchDevices()
  }
})

onMounted(() => {
  if (props.modelValue) {
    fetchUsers()
    fetchDevices()
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
