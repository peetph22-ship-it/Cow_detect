<template>
  <div class="space-y-5">

    <!-- 1. บัตรประจำตัวเกษตรกร & ฟาร์ม -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB]">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center text-2xl font-black shadow-xs shrink-0">
          {{ initial }}
        </div>
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-black text-[#15221B] truncate leading-tight">
            {{ displayName }}
          </h1>
          <p class="text-xs sm:text-sm text-[#2D6A4F] font-bold mt-0.5">
            {{ isAdmin ? 'ผู้ดูแลระบบ (ดูตัวอย่างหน้าเกษตรกร)' : 'เกษตรกรเจ้าของฟาร์ม' }}
          </p>
        </div>
      </div>

      <!-- รายละเอียดฟาร์ม -->
      <div class="mt-5 pt-4 border-t border-gray-100 space-y-3">
        <div class="flex justify-between items-center text-sm sm:text-base">
          <span class="text-[#64748B]">ชื่อฟาร์ม</span>
          <span class="font-bold text-[#15221B] text-right">{{ farm?.name || '—' }}</span>
        </div>
        <div class="flex justify-between items-center text-sm sm:text-base">
          <span class="text-[#64748B]">โรงเรือน</span>
          <span class="font-bold text-[#15221B] text-right">{{ farm?.barn_unit || 'โรงเรือนหลัก' }}</span>
        </div>
        <div class="flex justify-between items-center text-sm sm:text-base">
          <span class="text-[#64748B]">จังหวัด</span>
          <span class="font-bold text-[#15221B] text-right">{{ farm?.province || '—' }}</span>
        </div>
      </div>
    </section>


    <!-- 2. ปุ่มติดต่อสัตวแพทย์ / สหกรณ์ (ปุ่มใหญ่ เด่นมาก) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB] space-y-3">
      <div class="text-xs sm:text-sm font-bold text-[#64748B] flex items-center gap-1.5">
        <v-icon icon="mdi-doctor" class="text-[#2D6A4F]" size="20" />
        <span>สัตวแพทย์และผู้ดูแลประจำฟาร์ม</span>
      </div>

      <a
        v-if="farm?.vet_phone"
        :href="`tel:${farm.vet_phone.replace(/[^0-9+]/g, '')}`"
        class="w-full h-15 sm:h-16 rounded-2xl bg-[#E07A5F] hover:bg-[#d46a4e] text-white font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all text-decoration-none shadow-xs active:scale-[0.99]">
        <v-icon icon="mdi-phone-in-talk" size="24" />
        <span>โทรหาสัตวแพทย์: {{ farm.vet_phone }}</span>
      </a>
      <div v-else class="p-4 rounded-2xl bg-[#FFFBEB] text-[#92400E] text-sm font-medium">
        ยังไม่ได้บันทึกเบอร์สัตวแพทย์ สามารถติดต่อเจ้าหน้าที่สหกรณ์เพื่อเพิ่มเบอร์ได้จ้า
      </div>
    </section>


    <!-- 3. การเชื่อมต่อไปยังหลังบ้านของเพื่อน / Localhost / Cloud (เชื่อมต่อได้อิสระ) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB] space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base sm:text-lg font-bold text-[#15221B] flex items-center gap-2">
          <v-icon icon="mdi-server-network" class="text-[#2D6A4F]" size="22" />
          <span>เชื่อมต่อหลังบ้าน (Backend Server)</span>
        </h2>
        <span 
          class="text-xs font-bold px-2.5 py-1 rounded-full border"
          :class="isCustomBackend ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' : 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'">
          {{ isCustomBackend ? 'หลังบ้านกำหนดเอง' : 'เซิร์ฟเวอร์หลัก' }}
        </span>
      </div>

      <p class="text-xs sm:text-sm text-[#64748B] leading-relaxed">
        สามารถเลือกเชื่อมต่อกับเซิร์ฟเวอร์หลัก, เครื่องนี้, หรือ <strong class="text-[#15221B]">ใส่ IP / URL หลังบ้านของเพื่อน</strong> เพื่อดึงข้อมูลเซ็นเซอร์ร่วมกันได้ทันที
      </p>

      <!-- ปุ่มเลือกหลังบ้านด่วน -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          @click="selectBackendOption('cloud')"
          class="p-3 rounded-2xl border-2 text-left font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col justify-between"
          :class="selectedOption === 'cloud' ? 'border-[#2D6A4F] bg-[#E8F5E9] text-[#1B4332]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'">
          <div class="flex items-center gap-1.5">
            <v-icon icon="mdi-cloud-outline" size="18" />
            <span>เซิร์ฟเวอร์หลัก (Cloud)</span>
          </div>
          <span class="text-[11px] font-normal opacity-80 mt-1">Render Cloud</span>
        </button>

        <button
          type="button"
          @click="selectBackendOption('local')"
          class="p-3 rounded-2xl border-2 text-left font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col justify-between"
          :class="selectedOption === 'local' ? 'border-[#2D6A4F] bg-[#E8F5E9] text-[#1B4332]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'">
          <div class="flex items-center gap-1.5">
            <v-icon icon="mdi-laptop" size="18" />
            <span>เครื่องนี้ (Localhost)</span>
          </div>
          <span class="text-[11px] font-normal opacity-80 mt-1">port 4001</span>
        </button>

        <button
          type="button"
          @click="selectBackendOption('friend')"
          class="p-3 rounded-2xl border-2 text-left font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col justify-between"
          :class="selectedOption === 'friend' ? 'border-[#2D6A4F] bg-[#E8F5E9] text-[#1B4332]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'">
          <div class="flex items-center gap-1.5">
            <v-icon icon="mdi-account-network-outline" size="18" />
            <span>หลังบ้านของเพื่อน</span>
          </div>
          <span class="text-[11px] font-normal opacity-80 mt-1">ใส่ IP / URL</span>
        </button>
      </div>

      <!-- ช่องกรอก URL -->
      <div class="space-y-1.5">
        <label class="block text-xs font-bold text-[#64748B]">
          URL API หลังบ้านที่ต้องการเชื่อมต่อ:
        </label>
        <div class="flex gap-2">
          <input
            v-model="inputBackendUrl"
            type="text"
            placeholder="เช่น http://192.168.1.50:4001/api หรือ https://xxxx.trycloudflare.com/api"
            class="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-none focus:border-[#2D6A4F] bg-[#F8F9F5]" />
          
          <button
            type="button"
            @click="runPingTest"
            :disabled="testingPing"
            class="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#15221B] font-bold text-xs sm:text-sm shrink-0 flex items-center gap-1.5 cursor-pointer border border-gray-300">
            <v-icon v-if="testingPing" icon="mdi-loading" class="animate-spin" size="16" />
            <v-icon v-else icon="mdi-access-point" size="16" />
            <span>ทดสอบ</span>
          </button>
        </div>
      </div>

      <!-- ผลการทดสอบการเชื่อมต่อ -->
      <div v-if="pingResult" class="p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2"
        :class="pingResult.success ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]' : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'">
        <v-icon :icon="pingResult.success ? 'mdi-check-circle' : 'mdi-alert-circle'" size="18" />
        <span>{{ pingResult.message }}</span>
      </div>

      <!-- ปุ่มบันทึกการเชื่อมต่อ -->
      <div class="flex gap-2.5 pt-1">
        <button
          type="button"
          @click="applyBackendConnection"
          class="flex-1 h-12 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]">
          <v-icon icon="mdi-content-save-check" size="20" />
          <span>บันทึกและเชื่อมต่อทันที</span>
        </button>

        <button
          v-if="isCustomBackend"
          type="button"
          @click="resetToDefaultBackend"
          class="px-4 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm cursor-pointer border border-gray-300">
          คืนค่าเริ่มต้น
        </button>
      </div>
    </section>


    <!-- 4. การตั้งค่าความสะดวกสำหรับผู้สูงอายุ (ขนาดตัวหนังสือ & เสียงพูด) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB] space-y-4">
      <h2 class="text-base sm:text-lg font-bold text-[#15221B] flex items-center gap-2">
        <v-icon icon="mdi-eye-check-outline" class="text-[#2D6A4F]" size="22" />
        การตั้งค่าการมองเห็นและเสียง
      </h2>

      <!-- ขนาดตัวหนังสือ -->
      <div class="space-y-2">
        <label class="block text-xs sm:text-sm font-bold text-[#64748B]">
          ขนาดตัวอักษรในแอป (เลือกขนาดที่สบายตา):
        </label>
        <div class="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            v-for="opt in [
              { key: 'normal', title: 'ก ปกติ', desc: 'ขนาดทั่วไป' },
              { key: 'large', title: 'ก+ ใหญ่', desc: 'สำหรับสายตายาว' },
              { key: 'huge', title: 'ก++ ใหญ่มาก', desc: 'ไม่ต้องใส่แว่น' }
            ]"
            :key="opt.key"
            type="button"
            @click="setFontSize(opt.key)"
            class="p-3 rounded-2xl border-2 text-center transition-all cursor-pointer"
            :class="fontSize === opt.key ? 'border-[#2D6A4F] bg-[#E8F5E9] text-[#1B4332] font-black' : 'border-gray-200 bg-white text-gray-700 font-bold'">
            <div class="text-base sm:text-lg">{{ opt.title }}</div>
            <div class="text-[11px] opacity-80 mt-0.5">{{ opt.desc }}</div>
          </button>
        </div>
      </div>

      <!-- ทดสอบเสียงพูด -->
      <div class="pt-2">
        <button
          type="button"
          @click="testVoice"
          class="w-full h-13 rounded-2xl bg-[#F8F9F5] border border-[#CBD5E1] hover:border-[#2D6A4F] text-[#1B4332] font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-colors">
          <v-icon icon="mdi-volume-high" size="22" class="text-[#2D6A4F]" />
          <span>กดทดสอบระบบเสียงอ่านภาษาไทย</span>
        </button>
      </div>
    </section>


    <!-- 5. ความหมายของสีในแอป (เข้าใจง่าย) -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB] space-y-3">
      <h2 class="text-base sm:text-lg font-bold text-[#15221B] flex items-center gap-2">
        <v-icon icon="mdi-palette-outline" class="text-[#2D6A4F]" size="22" />
        ความหมายของสีระดับความร้อน
      </h2>

      <div class="space-y-2 text-xs sm:text-sm">
        <div class="p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3">
          <span class="w-3.5 h-3.5 rounded-full bg-[#16A34A] shrink-0"></span>
          <div>
            <span class="font-bold text-[#14532D]">สีเขียว (สบายดี):</span>
            <span class="text-[#166534] ml-1">อากาศร่มรื่น แม่วัวไม่เครียด ให้นมได้เต็มที่</span>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-3">
          <span class="w-3.5 h-3.5 rounded-full bg-[#D97706] shrink-0"></span>
          <div>
            <span class="font-bold text-[#78350F]">สีส้ม (เริ่มร้อน):</span>
            <span class="text-[#92400E] ml-1">เริ่มมีไอร้อน ควรเปิดพัดลมระบายอากาศ</span>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3">
          <span class="w-3.5 h-3.5 rounded-full bg-[#DC2626] shrink-0"></span>
          <div>
            <span class="font-bold text-[#991B1B]">สีแดง (ร้อนจัด):</span>
            <span class="text-[#B91C1C] ml-1">อากาศร้อนมาก เสี่ยงน้ำนมดิ่ง รีบเปิดพัดลมและสเปรย์น้ำด่วน</span>
          </div>
        </div>
      </div>
    </section>


    <!-- 6. ปุ่มกลับหน้าแอดมิน (ถ้าเป็นแอดมิน) & ออกจากระบบ -->
    <div class="space-y-3 pt-2">
      <NuxtLink
        v-if="isAdmin"
        to="/Admin"
        class="w-full h-14 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 text-[#15221B] text-base font-bold flex items-center justify-center gap-2 text-decoration-none shadow-2xs">
        <v-icon icon="mdi-shield-account-outline" size="22" />
        <span>กลับสู่หน้าระบบแอดมิน</span>
      </NuxtLink>

      <button
        type="button"
        @click="logout"
        class="w-full h-14 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-base font-bold flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.99]">
        <v-icon icon="mdi-logout" size="22" />
        <span>ออกจากระบบ</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'
import { getCustomNodeApi } from '~/API/baseAPI'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ฟาร์มฉัน & เชื่อมต่อหลังบ้าน | CowCare ฟาร์มโคนม' })

const { 
  farm, 
  user, 
  isAdmin, 
  fontSize, 
  setFontSize, 
  speakThai, 
  currentBackendUrl, 
  testBackend, 
  switchBackend, 
  logout 
} = useFarmer()

const displayName = computed(() => user.value?.name_users || user.value?.full_name || user.value?.name || user.value?.email || 'เกษตรกร')
const initial = computed(() => String(displayName.value).trim().charAt(0).toUpperCase() || 'ก')

// การจัดการเชื่อมต่อหลังบ้าน
const inputBackendUrl = ref('')
const selectedOption = ref('cloud')
const testingPing = ref(false)
const pingResult = ref(null)

const isCustomBackend = computed(() => Boolean(getCustomNodeApi()))

const selectBackendOption = (opt) => {
  selectedOption.value = opt
  pingResult.value = null
  if (opt === 'cloud') {
    inputBackendUrl.value = 'https://cow-detect-zea6.onrender.com/api'
  } else if (opt === 'local') {
    inputBackendUrl.value = 'http://localhost:4001/api'
  } else if (opt === 'friend') {
    inputBackendUrl.value = getCustomNodeApi() || 'http://192.168.1.50:4001/api'
  }
}

const runPingTest = async () => {
  testingPing.value = true
  pingResult.value = null
  try {
    const res = await testBackend(inputBackendUrl.value)
    pingResult.value = res
  } catch (e) {
    pingResult.value = { success: false, message: `ทดสอบล้มเหลว: ${e.message}` }
  } finally {
    testingPing.value = false
  }
}

const applyBackendConnection = async () => {
  const url = inputBackendUrl.value.trim()
  await switchBackend(url)
  alert(`เชื่อมต่อหลังบ้านเรียบร้อยแล้ว: ${url || 'เซิร์ฟเวอร์เริ่มต้น'}`)
  pingResult.value = null
}

const resetToDefaultBackend = async () => {
  await switchBackend('')
  inputBackendUrl.value = currentBackendUrl.value
  selectedOption.value = 'cloud'
  pingResult.value = null
  alert('คืนค่าเริ่มต้นกลับสู่เซิร์ฟเวอร์หลักเรียบร้อย')
}

const testVoice = () => {
  speakThai('ยินดีต้อนรับสู่ระบบเฝ้าระวังความเครียดความร้อนโคนม CowCare สำหรับเกษตรกรจ้า ระบบนี้ช่วยให้คุณดูแลแม่วัวได้อย่างสบายใจ')
}

onMounted(() => {
  inputBackendUrl.value = currentBackendUrl.value || 'https://cow-detect-zea6.onrender.com/api'
  if (inputBackendUrl.value.includes('localhost')) {
    selectedOption.value = 'local'
  } else if (isCustomBackend.value) {
    selectedOption.value = 'friend'
  } else {
    selectedOption.value = 'cloud'
  }
})
</script>
