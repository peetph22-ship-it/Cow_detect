<template>
  <v-dialog v-model="internalModel" max-width="560" persistent transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(36,67,58,0.22)] border border-[#24433a]/10 font-sans">
      
      <!-- 🟢 Header -->
      <div class="bg-gradient-to-r from-[#24433a] via-[#1f3c34] to-[#162e27] text-white p-6 relative overflow-hidden">
        <!-- Ambient Glow -->
        <div class="absolute -right-12 -top-12 w-44 h-44 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -bottom-10 w-36 h-36 bg-[#d87939]/15 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-start justify-between relative z-10">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-[18px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <v-icon icon="mdi-account-plus-outline" size="26" class="text-white" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-black tracking-tight text-white">เพิ่มสมาชิกใหม่</h3>
                <span class="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30 uppercase tracking-wider">New</span>
              </div>
              <p class="text-xs text-white/70 mt-0.5 font-medium">ลงทะเบียนบัญชีผู้ใช้งานใหม่เข้าสู่ระบบเครือข่าย CowCare AI</p>
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
        
        <!-- 1. Role & Status Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Role Selection -->
          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              ประเภทสมาชิก <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
                <v-icon icon="mdi-shield-account-outline" size="18" class="text-[#718078]" />
              </div>
              <select
                v-model="form.role"
                required
                class="w-full appearance-none bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-10 py-3 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all cursor-pointer">
                <option value="farmer">🚜 เกษตรกร (ฟาร์ม)</option>
                <option value="expert">🩺 ผู้เชี่ยวชาญ (สัตวแพทย์)</option>
                <option value="admin">🛡️ ผู้ดูแลระบบ (Admin)</option>
              </select>
              <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718078]">
                <v-icon icon="mdi-chevron-down" size="20" class="text-[#718078]" />
              </div>
            </div>
          </div>

          <!-- Status Selection -->
          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              สถานะผู้ใช้งาน <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
                <v-icon icon="mdi-checkbox-marked-circle-outline" size="18" class="text-[#718078]" />
              </div>
              <select
                v-model="form.status"
                required
                class="w-full appearance-none bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-10 py-3 text-sm font-bold text-[#1f3d34] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all cursor-pointer">
                <option value="active">🟢 ใช้งานอยู่ (Active)</option>
                <option value="pending">🟡 รออนุมัติ (Pending)</option>
                <option value="suspended">🔴 ระงับการใช้งาน (Suspended)</option>
              </select>
              <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718078]">
                <v-icon icon="mdi-chevron-down" size="20" class="text-[#718078]" />
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Full Name Input -->
        <div>
          <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
            ชื่อ-นามสกุล <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-account-outline" size="19" class="text-[#718078]" />
            </div>
            <input 
              v-model="form.name" 
              type="text" 
              required
              placeholder="เช่น สมชาย มั่งมี"
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-4 py-3 text-sm font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all" />
          </div>
        </div>

        <!-- 3. Organization / Farm Input -->
        <div>
          <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
            <span>{{ orgLabel }}</span> <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon :icon="form.role === 'farmer' ? 'mdi-barn' : 'mdi-domain'" size="19" class="text-[#718078]" />
            </div>
            <input 
              v-model="form.org" 
              type="text" 
              required
              :placeholder="orgPlaceholder"
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-4 py-3 text-sm font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all" />
          </div>
        </div>

        <!-- 4. Phone Number Input -->
        <div>
          <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>เบอร์โทรศัพท์ (Username) <span class="text-rose-500">*</span></span>
            <span class="text-[11px] text-[#718078] font-normal">* รหัสผ่านเริ่มต้นคือเบอร์โทรศัพท์</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-phone-outline" size="18" class="text-[#718078]" />
            </div>
            <input 
              v-model="form.phone" 
              type="tel" 
              required
              placeholder="08XXXXXXXX"
              class="w-full bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-4 py-3 text-sm font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all" />
          </div>
        </div>

        <!-- 🟢 Footer Action Buttons -->
        <div class="pt-3 flex items-center justify-end gap-3 border-t border-[#eef2f0]">
          <button 
            type="button" 
            @click="closeModal" 
            :disabled="isLoading"
            class="px-5 py-3 rounded-[16px] text-sm font-bold text-[#718078] hover:text-[#24433a] hover:bg-[#edf3ed] transition-all cursor-pointer">
            ยกเลิก
          </button>
          <button 
            type="submit" 
            :disabled="isLoading"
            class="px-7 py-3.5 rounded-[18px] text-sm font-black bg-gradient-to-r from-[#24433a] to-[#1e3b33] hover:from-[#1a322b] hover:to-[#162c26] text-white shadow-[0_8px_20px_rgba(36,67,58,0.22)] hover:shadow-[0_12px_28px_rgba(36,67,58,0.32)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <v-icon v-else icon="mdi-account-plus-outline" size="18" class="text-white" />
            <span>{{ isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}</span>
          </button>
        </div>

      </form>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import { api, base } from '../../../API/baseAPI'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const internalModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isLoading = ref(false)

const form = reactive({
  role: 'farmer',
  status: 'active',
  name: '',
  org: '',
  phone: ''
})

const orgLabel = computed(() => {
  if (form.role === 'farmer') return 'ชื่อฟาร์ม'
  if (form.role === 'expert') return 'หน่วยงานต้นสังกัด'
  return 'สังกัด / แผนก'
})

const orgPlaceholder = computed(() => {
  if (form.role === 'farmer') return 'เช่น ฟาร์มสมชาย โคนมไทย'
  if (form.role === 'expert') return 'เช่น สำนักงานปศุสัตว์ / สัตวแพทย์'
  return 'เช่น ศูนย์ควบคุมข้อมูลส่วนกลาง'
})

// Reset form when modal closes
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    form.name = ''
    form.org = ''
    form.phone = ''
    form.role = 'farmer'
    form.status = 'active'
  }
})

const closeModal = () => {
  internalModel.value = false
}

const submitForm = async () => {
  if (!form.name.trim() || !form.phone.trim() || !form.org.trim()) {
    alert('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่องที่มีเครื่องหมาย *')
    return
  }

  if (!/^[0-9]{9,10}$/.test(form.phone.trim())) {
    alert('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (กรุณากรอกตัวเลข 9-10 หลัก)')
    return
  }

  isLoading.value = true
  
  try {
    const payload = {
      full_name: form.name.trim(),
      phone: form.phone.trim(),
      role: form.role,
      status: form.status,
      organization: form.org.trim(),
      password: form.phone.trim(), // Default password = phone number
      email: null
    }
    
    // Call Node.js Backend API
    const response = await axios.post(`${base || api}/auth/register`, payload)
    
    emit('submit', { 
      id: response.data.user?.id || Date.now(), 
      name: form.name.trim(),
      full_name: form.name.trim(),
      role: form.role, 
      status: form.status,
      org: form.org.trim(),
      organization: form.org.trim(),
      phone: form.phone.trim() 
    })
    
    closeModal()
    
  } catch (error) {
    console.error("Register Error:", error)
    alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Scoped styles for AddUserModal */
</style>
