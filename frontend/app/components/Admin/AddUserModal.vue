<template>
  <Transition name="modal-fade">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div 
        class="backdrop absolute inset-0 bg-[#1f3d34]/30 backdrop-blur-sm" style="transform: translateZ(0); will-change: opacity;" 
        @click="$emit('update:modelValue', false)"
      ></div>

      <!-- Modal Content -->
      <div class="modal-card relative bg-white rounded-[24px] shadow-2xl w-full max-w-[520px] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-8 py-6 border-b border-[#e5ece9] flex items-center justify-between bg-[#f4f7f6]/50">
        <div>
          <h3 class="text-[20px] font-black text-[#1f3d34]">เพิ่มสมาชิกใหม่</h3>
          <p class="text-[13px] text-[#64766d] mt-1 font-medium">สร้างบัญชีสำหรับเกษตรกร ผู้เชี่ยวชาญ หรือแอดมิน</p>
        </div>
        <button 
          @click="$emit('update:modelValue', false)"
          class="w-8 h-8 rounded-full flex items-center justify-center text-[#a6b5aa] hover:bg-[#e5ece9] hover:text-[#1f3d34] transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
        
        <!-- Role Selection -->
        <div class="space-y-2">
          <label class="text-[13px] font-bold text-[#4e6057]">ประเภทสมาชิก <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-3 gap-3">
            <button 
              type="button"
              v-for="role in roles" 
              :key="role.id"
              @click="form.role = role.id"
              :class="[
                'py-2.5 px-3 rounded-[12px] text-[13px] font-bold border transition-all text-center cursor-pointer',
                form.role === role.id 
                  ? 'bg-[#e6f2e7] border-[#3e7d4f]/30 text-[#1f3d34] ring-1 ring-[#3e7d4f]' 
                  : 'bg-white border-[#e5ece9] text-[#718078] hover:border-[#a6b5aa]'
              ]"
            >
              {{ role.name }}
            </button>
          </div>
        </div>

        <!-- Name -->
        <div class="space-y-2">
          <label class="text-[13px] font-bold text-[#4e6057]">ชื่อ-นามสกุล <span class="text-red-500">*</span></label>
          <input 
            v-model="form.name"
            type="text" 
            placeholder="เช่น สมชาย มั่งมี"
            class="w-full bg-[#f4f7f6] border border-[#e5ece9] rounded-[12px] px-4 py-3 text-[14px] text-[#1f3d34] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1f3d34]/20 transition-all"
          >
        </div>

        <!-- Organization / Farm Name -->
        <div class="space-y-2">
          <label class="text-[13px] font-bold text-[#4e6057]">ชื่อฟาร์ม / สังกัด</label>
          <input 
            v-model="form.org"
            type="text" 
            placeholder="เช่น ฟาร์มสมชาย โคนมไทย"
            class="w-full bg-[#f4f7f6] border border-[#e5ece9] rounded-[12px] px-4 py-3 text-[14px] text-[#1f3d34] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1f3d34]/20 transition-all"
          >
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <!-- Phone (Username) -->
          <div class="space-y-2">
            <label class="text-[13px] font-bold text-[#4e6057]">เบอร์โทรศัพท์ <span class="text-red-500">*</span></label>
            <input 
              v-model="form.phone"
              type="tel" 
              placeholder="08X-XXX-XXXX"
              class="w-full bg-[#f4f7f6] border border-[#e5ece9] rounded-[12px] px-4 py-3 text-[14px] text-[#1f3d34] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1f3d34]/20 transition-all"
            >
            <p class="text-[11px] text-[#a6b5aa]">ใช้เป็นชื่อเข้าสู่ระบบ (Username)</p>
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label class="text-[13px] font-bold text-[#4e6057]">รหัสผ่านเริ่มต้น <span class="text-red-500">*</span></label>
            <input 
              v-model="form.password"
              type="text" 
              class="w-full bg-[#f4f7f6] border border-[#e5ece9] rounded-[12px] px-4 py-3 text-[14px] text-[#1f3d34] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1f3d34]/20 transition-all"
            >
            <p class="text-[11px] text-[#a6b5aa]">สามารถเปลี่ยนภายหลังได้</p>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-8 py-5 border-t border-[#e5ece9] bg-[#f4f7f6]/30 flex justify-end gap-3">
        <button 
          @click="$emit('update:modelValue', false)"
          class="px-5 py-2.5 rounded-[12px] text-[13px] font-bold text-[#64766d] hover:bg-[#e5ece9] transition-colors cursor-pointer"
        >
          ยกเลิก
        </button>
        <button 
          @click="submitForm"
          class="px-6 py-2.5 rounded-[12px] text-[13px] font-bold text-white bg-[#1f3d34] hover:bg-[#142a24] shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          บันทึกข้อมูล
        </button>
      </div>

    </div>
  </div>
  </Transition>

</template>

<script setup>
import { reactive } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const roles = [
  { id: 'farmer', name: 'เกษตรกร' },
  { id: 'expert', name: 'ผู้เชี่ยวชาญ' },
  { id: 'admin', name: 'ผู้ดูแลระบบ' }
]

const form = reactive({
  role: 'farmer',
  name: '',
  org: '',
  phone: '',
  password: 'cowcare2026' // default password
})

const submitForm = () => {
  if (!form.name || !form.phone || !form.password) {
    alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
    return
  }
  
  emit('submit', { ...form })
  
  // Reset form
  form.name = ''
  form.org = ''
  form.phone = ''
  form.password = 'cowcare2026'
  form.role = 'farmer'
  
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* Root opacity transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.4s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Smooth Backdrop Blur Transition */
.modal-fade-enter-active .backdrop,
.modal-fade-leave-active .backdrop {
  transition: backdrop-filter 0.4s ease, background-color 0.4s ease;
}

.modal-fade-enter-from .backdrop,
.modal-fade-leave-to .backdrop {
  backdrop-filter: blur(0px);
  background-color: transparent;
}

/* Modal Card Spring Animation */
.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-fade-enter-from .modal-card,
.modal-fade-leave-to .modal-card {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}
</style>
