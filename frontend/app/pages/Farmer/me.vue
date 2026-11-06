<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- แถวที่ 1 (Bento Grid 2 คอลัมน์): ข้อมูลฟาร์ม & สลับฟาร์ม (7 คอลัมน์) + ติดต่อสัตวแพทย์ประจำฟาร์ม (5 คอลัมน์) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
      <!-- 1. บัตรข้อมูลเกษตรกร & ตัวเลือกสลับฟาร์ม -->
      <section class="lg:col-span-7 bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-4">
            <div class="w-15 h-15 rounded-2xl bg-[#142820] text-[#F3C68F] flex items-center justify-center text-2xl font-black shadow-xs shrink-0">
              {{ initial }}
            </div>
            <div class="min-w-0">
              <h2 class="text-xl sm:text-2xl font-black text-[#142820] truncate leading-tight">
                {{ displayName }}
              </h2>
              <p class="text-xs sm:text-sm text-[#2D6A4F] font-extrabold mt-0.5">
                {{ isAdmin ? 'ผู้ดูแลระบบ (กำลังดูมุมมองเกษตรกร)' : 'เกษตรกรเจ้าของฟาร์ม' }}
              </p>
            </div>
          </div>

          <!-- ตัวสลับฟาร์ม (กรณีมีมากกว่า 1 ฟาร์ม) -->
          <div v-if="farms.length > 1" class="mt-5 pt-4 border-t border-[#E4E8E5]">
            <label class="block text-xs sm:text-sm font-extrabold text-[#4E655B] mb-2">
              เลือกฟาร์มหรือโรงเรือนที่ต้องการดูข้อมูล:
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                v-for="f in farms"
                :key="f.id"
                type="button"
                @click="selectFarm(f.id)"
                class="p-3.5 rounded-2xl border-2 text-left font-black text-sm flex items-center justify-between gap-2 cursor-pointer transition-all"
                :class="farm?.id === f.id
                  ? 'bg-[#ECFDF5] border-[#16A34A] text-[#142820]'
                  : 'bg-[#F8FAF9] border-[#E4E8E5] text-[#3A5248] hover:border-[#2D6A4F]/50'">
                <div class="flex items-center gap-2.5 min-w-0">
                  <v-icon icon="mdi-barn" size="20" :class="farm?.id === f.id ? 'text-[#16A34A]' : 'text-[#4E655B]'" />
                  <span class="truncate">{{ f.name }}</span>
                </div>
                <v-icon v-if="farm?.id === f.id" icon="mdi-check-circle" size="20" class="text-[#16A34A] shrink-0" />
              </button>
            </div>
          </div>
        </div>

        <!-- รายละเอียดฟาร์มปัจจุบัน -->
        <div class="mt-5 pt-4 border-t border-[#E4E8E5] space-y-3 text-sm sm:text-base">
          <div class="flex justify-between items-center gap-2">
            <span class="text-[#5A6B63] font-semibold">ชื่อฟาร์ม</span>
            <span class="font-black text-[#142820] text-right">{{ farm?.name || '—' }}</span>
          </div>
          <div class="flex justify-between items-center gap-2">
            <span class="text-[#5A6B63] font-semibold">โรงเรือน</span>
            <span class="font-black text-[#142820] text-right">{{ farm?.barn_unit || 'โรงเรือนหลัก' }}</span>
          </div>
          <div class="flex justify-between items-center gap-2">
            <span class="text-[#5A6B63] font-semibold">จังหวัด</span>
            <span class="font-black text-[#142820] text-right">{{ farm?.province || '—' }}</span>
          </div>
          <div class="flex justify-between items-center gap-2">
            <span class="text-[#5A6B63] font-semibold">เกณฑ์พันธุ์โคนม</span>
            <span class="font-bold text-[#142820] text-right text-xs sm:text-sm">
              {{ profileLabel }}
            </span>
          </div>
        </div>
      </section>

      <!-- 2. ติดต่อสัตวแพทย์ประจำฟาร์ม -->
      <div class="lg:col-span-5 flex flex-col">
        <section class="bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] space-y-3 flex-1 flex flex-col justify-between">
          <div>
            <h2 class="text-base sm:text-lg font-black text-[#142820] flex items-center gap-2">
              <v-icon icon="mdi-doctor" class="text-[#D87939]" size="24" />
              <span>ติดต่อสัตวแพทย์ประจำฟาร์ม</span>
            </h2>
            <p class="text-xs sm:text-sm text-[#5A6B63] font-medium mt-1">
              ใช้สำหรับโทรปรึกษาสัตวแพทย์หรือเจ้าหน้าที่สหกรณ์เมื่อแม่วัวมีอาการผิดปกติ
            </p>
          </div>
          <FarmerVetCallButton :show-empty-hint="true" />
        </section>
      </div>
    </div>

    <!-- 3. คู่มือความหมายสีระดับความร้อน (4 ระดับตามเกณฑ์ฟาร์มจริง) -->
    <section class="bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] space-y-3.5">
      <h2 class="text-base sm:text-lg font-black text-[#142820] flex items-center gap-2">
        <v-icon icon="mdi-palette-outline" class="text-[#2D6A4F]" size="24" />
        <span>ความหมายของสีระดับความร้อน (THI) สำหรับโรงเรือนนี้</span>
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
        <div class="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-1">
          <div class="flex items-center gap-2 font-black text-[#14532D]">
            <span class="w-3.5 h-3.5 rounded-full bg-[#16A34A] shrink-0"></span>
            <span>สีเขียว — สบายดี (&lt; {{ thresholds.mild }})</span>
          </div>
          <p class="text-[#166534] font-medium text-xs leading-relaxed">
            อากาศในคอกยังต่ำกว่าระดับเริ่มอุ่นของระบบ
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1">
          <div class="flex items-center gap-2 font-black text-[#78350F]">
            <span class="w-3.5 h-3.5 rounded-full bg-[#D97706] shrink-0"></span>
            <span>สีเหลือง — เริ่มอุ่น ({{ thresholds.mild }}–{{ thresholds.moderate - 1 }})</span>
          </div>
          <p class="text-[#92400E] font-medium text-xs leading-relaxed">
            อากาศเริ่มอบอ้าว เฝ้าระวังช่วงบ่ายและเตรียมน้ำให้เต็มราง
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-[#FFF7ED] border border-[#FDBA74] space-y-1">
          <div class="flex items-center gap-2 font-black text-[#7C2D12]">
            <span class="w-3.5 h-3.5 rounded-full bg-[#EA580C] shrink-0"></span>
            <span>สีส้ม — อากาศร้อน ({{ thresholds.moderate }}–{{ thresholds.severe - 1 }})</span>
          </div>
          <p class="text-[#9A3412] font-medium text-xs leading-relaxed">
            แม่วัวเริ่มเครียดจากความร้อน ควรเปิดพัดลมระบายอากาศ
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] space-y-1">
          <div class="flex items-center gap-2 font-black text-[#991B1B]">
            <span class="w-3.5 h-3.5 rounded-full bg-[#DC2626] shrink-0"></span>
            <span>สีแดง — ร้อนจัด (≥ {{ thresholds.severe }})</span>
          </div>
          <p class="text-[#B91C1C] font-medium text-xs leading-relaxed">
            เสี่ยงน้ำนมลด ต้องเร่งพัดลมและใช้น้ำช่วยลดความร้อนทันที
          </p>
        </div>
      </div>
    </section>

    <!-- 4. การเชื่อมต่อหลังบ้าน (แสดงเฉพาะโหมดพัฒนาบนเครื่อง localhost เท่านั้น) -->
    <section
      v-if="showBackendSwitch"
      class="bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] space-y-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base sm:text-lg font-black text-[#142820] flex items-center gap-2">
          <v-icon icon="mdi-server-network" class="text-[#2D6A4F]" size="22" />
          <span>เชื่อมต่อเซิร์ฟเวอร์หลังบ้าน (สำหรับนักพัฒนา)</span>
        </h2>
        <span
          class="text-xs font-extrabold px-2.5 py-1 rounded-full border"
          :class="isCustomBackend ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' : 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'">
          {{ isCustomBackend ? 'หลังบ้านกำหนดเอง' : 'เซิร์ฟเวอร์หลัก' }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          @click="selectBackendOption('cloud')"
          class="p-3 rounded-2xl border-2 text-left font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col justify-between"
          :class="selectedOption === 'cloud' ? 'border-[#142820] bg-[#ECFDF5] text-[#142820]' : 'border-[#E4E8E5] bg-white text-[#3A5248]'">
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
          :class="selectedOption === 'local' ? 'border-[#142820] bg-[#ECFDF5] text-[#142820]' : 'border-[#E4E8E5] bg-white text-[#3A5248]'">
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
          :class="selectedOption === 'friend' ? 'border-[#142820] bg-[#ECFDF5] text-[#142820]' : 'border-[#E4E8E5] bg-white text-[#3A5248]'">
          <div class="flex items-center gap-1.5">
            <v-icon icon="mdi-account-network-outline" size="18" />
            <span>หลังบ้านของเพื่อน</span>
          </div>
          <span class="text-[11px] font-normal opacity-80 mt-1">ใส่ IP / URL</span>
        </button>
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-extrabold text-[#4E655B]">
          URL API หลังบ้าน:
        </label>
        <div class="flex gap-2">
          <input
            v-model="inputBackendUrl"
            type="text"
            placeholder="เช่น http://192.168.1.50:4001/api"
            class="flex-1 px-4 py-3 rounded-xl border border-[#E4E8E5] text-xs sm:text-sm focus:outline-none focus:border-[#142820] bg-[#F8FAF9]" />
          <button
            type="button"
            @click="runPingTest"
            :disabled="testingPing"
            class="px-4 py-3 rounded-xl bg-[#F4F6F4] hover:bg-[#E4E8E5] text-[#142820] font-extrabold text-xs sm:text-sm shrink-0 flex items-center gap-1.5 cursor-pointer border border-[#E4E8E5]">
            <v-icon v-if="testingPing" icon="mdi-loading" class="animate-spin" size="16" />
            <v-icon v-else icon="mdi-access-point" size="16" />
            <span>ทดสอบ</span>
          </button>
        </div>
      </div>

      <div
        v-if="pingResult"
        class="p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
        :class="pingResult.success ? 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'">
        <v-icon :icon="pingResult.success ? 'mdi-check-circle' : 'mdi-alert-circle'" size="18" />
        <span>{{ pingResult.message }}</span>
      </div>

      <div class="flex gap-2.5 pt-1">
        <button
          type="button"
          @click="applyBackendConnection"
          class="flex-1 h-12 rounded-xl bg-[#142820] hover:bg-[#24433A] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-xs">
          <v-icon icon="mdi-content-save-check" size="20" />
          <span>บันทึกและเชื่อมต่อ</span>
        </button>

        <button
          v-if="isCustomBackend"
          type="button"
          @click="resetToDefaultBackend"
          class="px-4 h-12 rounded-xl bg-white hover:bg-[#F4F6F4] text-[#142820] font-extrabold text-xs sm:text-sm cursor-pointer border border-[#E4E8E5]">
          คืนค่าเริ่มต้น
        </button>
      </div>
    </section>

    <!-- 5. ปุ่มกลับหน้าแอดมิน & ปุ่มออกจากระบบขนาดใหญ่ -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
      <NuxtLink
        v-if="isAdmin"
        to="/Admin"
        class="w-full h-14 rounded-2xl border-2 border-[#E4E8E5] bg-white hover:bg-[#F8FAF9] text-[#142820] text-base font-black flex items-center justify-center gap-2 text-decoration-none shadow-2xs">
        <v-icon icon="mdi-shield-account-outline" size="22" />
        <span>กลับสู่หน้าระบบแอดมิน</span>
      </NuxtLink>

      <button
        type="button"
        @click="openLogoutModal"
        :class="isAdmin ? '' : 'sm:col-span-2'"
        class="w-full h-14 rounded-2xl border-2 border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] text-base font-black flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.99]">
        <v-icon icon="mdi-logout" size="22" />
        <span>ออกจากระบบ</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'
import { getCustomNodeApi, canSwitchBackend } from '~/API/baseAPI'
import { PROFILE_LABELS, normalizeProfile } from '~/utils/heatStress'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ฟาร์มและตั้งค่า | CowCare ฟาร์มโคนม' })

const {
  farm,
  farms,
  thresholds,
  user,
  isAdmin,
  selectFarm,
  currentBackendUrl,
  testBackend,
  switchBackend,
  openLogoutModal
} = useFarmer()

const displayName = computed(() => user.value?.name_users || user.value?.full_name || user.value?.name || user.value?.email || 'เกษตรกร')
const initial = computed(() => String(displayName.value).trim().charAt(0).toUpperCase() || 'ก')
const profileLabel = computed(() => PROFILE_LABELS[normalizeProfile(farm.value?.profile)])

const inputBackendUrl = ref('')
const selectedOption = ref('cloud')
const testingPing = ref(false)
const pingResult = ref(null)

const isCustomBackend = computed(() => Boolean(getCustomNodeApi()))
const showBackendSwitch = ref(false)
onMounted(() => {
  showBackendSwitch.value = canSwitchBackend()
})

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
