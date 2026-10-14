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
              <v-icon icon="mdi-account-edit-outline" size="26" class="text-white" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-black tracking-tight text-white">แก้ไขข้อมูลสมาชิก</h3>
                <span class="px-2 py-0.5 rounded-full bg-[#d87939]/20 text-[#f6a877] text-[10px] font-bold border border-[#d87939]/30 uppercase tracking-wider">Edit</span>
              </div>
              <p class="text-xs text-white/70 mt-0.5 font-medium">ปรับปรุงบทบาท สิทธิ์การเข้าถึง และข้อมูลการติดต่อ</p>
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
                <option value="farmer">เกษตรกร (ฟาร์ม)</option>
                <option value="expert">ผู้เชี่ยวชาญ (สัตวแพทย์)</option>
                <option value="admin">ผู้ดูแลระบบ (Admin)</option>
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
                <option value="active">ใช้งานอยู่ (Active)</option>
                <option value="pending">รออนุมัติ (Pending)</option>
                <option value="suspended">ระงับการใช้งาน (Suspended)</option>
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

        <!-- 4. Phone & Email Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Phone Number -->
          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              เบอร์โทรศัพท์ <span class="text-rose-500">*</span>
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

          <!-- Email -->
          <div>
            <label class="block text-xs font-black text-[#4e6057] uppercase tracking-wider mb-1.5">
              อีเมล <span class="text-xs text-[#a6b5aa] font-medium">(ถ้ามี)</span>
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
                <v-icon icon="mdi-email-outline" size="18" class="text-[#718078]" />
              </div>
              <input 
                v-model="form.email" 
                type="email" 
                placeholder="user@cowcare.ai"
                class="w-full bg-white border border-[#e5ece9] rounded-[16px] pl-10 pr-4 py-3 text-sm font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all" />
            </div>
          </div>

        </div>

        <!-- 5. Reset Password Box -->
        <div class="p-4 rounded-[20px] bg-white border border-[#e5ece9] shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-black text-[#4e6057] uppercase tracking-wider flex items-center gap-1.5">
              <v-icon icon="mdi-key-variant" size="15" class="text-[#d87939]" />
              <span>รหัสผ่านใหม่</span>
            </label>
            <span class="text-[11px] text-[#718078] font-medium">เว้นว่างไว้หากใช้รหัสผ่านเดิม</span>
          </div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718078]">
              <v-icon icon="mdi-lock-outline" size="18" class="text-[#718078]" />
            </div>
            <input 
              v-model="form.password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="กรอกรหัสผ่านใหม่หากต้องการรีเซ็ต"
              class="w-full bg-[#f8faf9] border border-[#e5ece9] rounded-[14px] pl-10 pr-10 py-2.5 text-sm font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:border-[#24433a] focus:bg-white transition-all" />
            <button 
              type="button" 
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#718078] hover:text-[#24433a] cursor-pointer">
              <v-icon :icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" size="18" />
            </button>
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
            <v-icon v-else icon="mdi-check-circle-outline" size="18" class="text-white" />
            <span>{{ isLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}</span>
          </button>
        </div>

      </form>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import { api } from '../../../API/baseAPI'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['update:modelValue', 'updated'])

const internalModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isLoading = ref(false)
const showPassword = ref(false)

const form = reactive({
  id: '',
  role: 'farmer',
  status: 'active',
  name: '',
  org: '',
  phone: '',
  email: '',
  password: ''
})

watch(() => props.user, (u) => {
  if (u) {
    form.id = u.id || ''
    form.role = u.role || 'farmer'
    form.status = u.status || 'active'
    form.name = u.full_name || u.name || ''
    form.org = u.organization || u.org || ''
    form.phone = u.phone || ''
    form.email = (u.email && u.email !== '-') ? u.email : ''
    form.password = ''
  }
}, { immediate: true })

const orgLabel = computed(() => {
  if (form.role === 'farmer') return 'ชื่อฟาร์ม'
  if (form.role === 'expert') return 'หน่วยงานต้นสังกัด'
  return 'สังกัด / แผนก'
})

const orgPlaceholder = computed(() => {
  if (form.role === 'farmer') return 'เช่น ฟาร์มสมชาย โคนมไทย'
  if (form.role === 'expert') return 'เช่น สำนักงานปศุสัตว์ / สัตวแพทย์'
  return 'เช่น ศูนย์ควบคุมข้อมูลระบบ'
})

const closeModal = () => {
  internalModel.value = false
}

const submitForm = async () => {
  if (!form.name.trim() || !form.phone.trim()) {
    alert('กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์ให้ครบถ้วน')
    return
  }

  isLoading.value = true
  
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const payload = {
      full_name: form.name.trim(),
      phone: form.phone.trim(),
      role: form.role,
      status: form.status,
      organization: form.org.trim(),
      email: form.email && form.email.trim() ? form.email.trim() : null
    }

    if (form.password && form.password.trim()) {
      payload.password = form.password.trim()
    }

    // รองรับทั้ง /api/Admin/users/users/:id และ fallback /api/Admin/users/:id
    let response
    try {
      response = await axios.put(`${api}/Admin/users/users/${form.id}`, payload, { headers })
    } catch (err) {
      if (err.response?.status === 404) {
        response = await axios.put(`${api}/Admin/users/${form.id}`, payload, { headers })
      } else {
        throw err
      }
    }
    
    emit('updated', {
      id: form.id,
      full_name: form.name,
      name: form.name,
      phone: form.phone,
      role: form.role,
      status: form.status,
      organization: form.org,
      org: form.org,
      email: payload.email || '-'
    })

    closeModal()
    
  } catch (error) {
    console.error("Update User Error:", error)
    alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล กรุณาลองใหม่อีกครั้ง')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Scoped styles for EditUserModal */
</style>
