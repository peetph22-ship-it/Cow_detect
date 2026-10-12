<template>
  <v-dialog v-model="internalModel" max-width="540" persistent>
    <v-card rounded="xl" elevation="10">
      <!-- Header -->
      <v-card-title class="bg-teal-darken-4 text-white px-6 py-4 d-flex justify-space-between align-center">
        <div class="d-flex align-center gap-3">
          <v-icon>mdi-account-plus</v-icon>
          <span class="text-h6 font-weight-bold">เพิ่มสมาชิกใหม่</span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeModal" color="white"></v-btn>
      </v-card-title>

      <!-- Body -->
      <v-card-text class="pa-6 bg-grey-lighten-5">
        <v-form ref="formRef" v-model="isFormValid" @submit.prevent="submitForm">
          
          <!-- Role -->
          <div class="mb-5">
            <label class="text-subtitle-2 font-weight-bold text-blue-grey-darken-2 mb-2 d-block">ประเภทสมาชิก <span class="text-error">*</span></label>
            <v-btn-toggle v-model="form.role" color="teal-darken-3" mandatory class="w-100 elevation-1 bg-white" style="height: 48px;">
              <v-btn value="farmer" class="flex-grow-1 text-subtitle-2 font-weight-bold">เกษตรกร</v-btn>
              <v-btn value="expert" class="flex-grow-1 text-subtitle-2 font-weight-bold">ผู้เชี่ยวชาญ</v-btn>
              <v-btn value="admin" class="flex-grow-1 text-subtitle-2 font-weight-bold">ผู้ดูแลระบบ</v-btn>
            </v-btn-toggle>
          </div>

          <!-- Name -->
          <v-text-field
            v-model="form.name"
            placeholder="เช่น สมชาย มั่งมี"
            :rules="[v => !!v || 'กรุณากรอกชื่อ-นามสกุล']"
            variant="outlined"
            color="teal-darken-3"
            density="comfortable"
            class="mb-3"
            bg-color="white"
            prepend-inner-icon="mdi-account"
          >
            <template v-slot:label>
              ชื่อ-นามสกุล <span class="text-error">*</span>
            </template>
          </v-text-field>

          <!-- Organization / Farm Name -->
          <v-text-field
            v-model="form.org"
            :placeholder="orgPlaceholder"
            :rules="[v => !!v || `กรุณากรอก${orgLabel}`]"
            variant="outlined"
            color="teal-darken-3"
            density="comfortable"
            class="mb-3"
            bg-color="white"
            :prepend-inner-icon="form.role === 'farmer' ? 'mdi-barn' : 'mdi-domain'"
          >
            <template v-slot:label>
              {{ orgLabel }} <span class="text-error">*</span>
            </template>
          </v-text-field>

          <!-- Phone -->
          <v-text-field
            v-model="form.phone"
            placeholder="08X-XXX-XXXX"
            :rules="phoneRules"
            variant="outlined"
            color="teal-darken-3"
            density="comfortable"
            hint="ใช้เป็นชื่อเข้าสู่ระบบ (Username)"
            persistent-hint
            type="tel"
            bg-color="white"
            prepend-inner-icon="mdi-phone"
          >
            <template v-slot:label>
              เบอร์โทรศัพท์ <span class="text-error">*</span>
            </template>
          </v-text-field>
          
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <!-- Footer -->
      <v-card-actions class="px-6 py-4 bg-grey-lighten-4">
        <v-spacer></v-spacer>
        <v-btn color="blue-grey-darken-1" variant="text" class="font-weight-bold px-4" @click="closeModal" :disabled="isLoading">ยกเลิก</v-btn>
        <v-btn color="teal-darken-4" variant="flat" class="font-weight-bold px-6" @click="submitForm" :loading="isLoading">
          <v-icon left class="mr-2">mdi-content-save</v-icon>
          บันทึกข้อมูล
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
 

 
 
 
import { base } from '../../api/baseAPI'

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

const formRef = ref(null)
const isFormValid = ref(false)
const isLoading = ref(false)

const form = reactive({
  role: 'farmer',
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
  if (form.role === 'expert') return 'เช่น กรมปศุสัตว์, คณะสัตวแพทยศาสตร์'
  return 'เช่น ศูนย์ควบคุมส่วนกลาง'
})

const phoneRules = [
  v => !!v || 'กรุณากรอกเบอร์โทรศัพท์',
  v => /^[0-9]{9,10}$/.test(v) || 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
]

// Reset form when modal closes
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen && formRef.value) {
    formRef.value.reset()
    form.role = 'farmer'
  }
})

const closeModal = () => {
  internalModel.value = false
}

const submitForm = async () => {
  if (!formRef.value) return
  
  const { valid } = await formRef.value.validate()
  if (!valid) return

  isLoading.value = true
  
  try {
    const payload = {
      full_name: form.name,
      phone: form.phone,
      role: form.role,
      organization: form.org,
      password: form.phone, // Default password = phone number
      email: null // Backend has been updated to accept null email
    }
    
    // Call Node.js Backend API using baseAPI
    const response = await axios.post(`${base}/auth/register`, payload)
    
    // Emit event back to users.vue so the UI updates
    emit('submit', { 
      id: response.data.user?.id || Date.now(), 
      name: form.name, 
      role: form.role, 
      org: form.org, 
      phone: form.phone 
    })
    
    closeModal()
    
  } catch (error) {
    console.error("Register Error:", error)
    alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Vuetify styles are sufficient */
</style>
