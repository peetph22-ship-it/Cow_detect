<template>
  <div class="space-y-5 pb-8">

    <!-- การ์ดข้อมูลผู้ใช้ & ฟาร์ม -->
    <section class="bg-white rounded-3xl p-5 sm:p-6 border border-[#E5E7EB] shadow-xs">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center text-2xl sm:text-3xl font-black shrink-0 shadow-sm">
          {{ initial }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1B4332] mb-1">
            <v-icon :icon="isAdmin ? 'mdi-shield-crown' : 'mdi-cow'" size="14" />
            <span>{{ isAdmin ? 'ผู้ดูแลระบบ (Admin)' : 'เกษตรกรผู้เลี้ยงโคนม' }}</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-black text-[#15221B] truncate">{{ displayName }}</h1>
          <p class="text-xs sm:text-sm text-[#64748B] truncate mt-0.5">{{ user?.email || user?.phone || 'ไม่มีข้อมูลติดต่อ' }}</p>
        </div>
      </div>

      <!-- รายละเอียดฟาร์ม -->
      <div class="mt-5 pt-4 border-t border-[#F1F5F9] grid grid-cols-2 gap-3 sm:gap-4 text-sm">
        <div class="bg-[#F8F9F5] p-3 rounded-2xl">
          <span class="text-xs text-[#64748B] block font-semibold">ชื่อฟาร์ม</span>
          <span class="font-bold text-[#15221B] mt-0.5 block truncate">{{ farm?.name || '—' }}</span>
        </div>
        <div class="bg-[#F8F9F5] p-3 rounded-2xl">
          <span class="text-xs text-[#64748B] block font-semibold">โรงเรือน</span>
          <span class="font-bold text-[#15221B] mt-0.5 block truncate">{{ farm?.barn_unit || '—' }}</span>
        </div>
        <div class="bg-[#F8F9F5] p-3 rounded-2xl">
          <span class="text-xs text-[#64748B] block font-semibold">จังหวัด</span>
          <span class="font-bold text-[#15221B] mt-0.5 block truncate">{{ farm?.province || '—' }}</span>
        </div>
        <div class="bg-[#F8F9F5] p-3 rounded-2xl">
          <span class="text-xs text-[#64748B] block font-semibold">เกณฑ์ประเมินความร้อน</span>
          <span class="font-bold text-[#15221B] mt-0.5 block truncate">{{ PROFILE_LABELS[farm?.profile] || 'โคนมลูกผสมไทย' }}</span>
        </div>
      </div>
    </section>

    <!-- เบอร์โทรด่วนสัตวแพทย์ / สหกรณ์ (ตัวหนังสือใหญ่ แตะโทรได้ทันที) -->
    <section class="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <v-icon icon="mdi-doctor" class="text-[#2D6A4F]" size="22" />
          <h2 class="text-base sm:text-lg font-bold text-[#15221B]">ติดต่อสัตวแพทย์ / สหกรณ์</h2>
        </div>
        <span class="text-xs font-semibold text-[#64748B]">กดเพื่อโทรออกทันที</span>
      </div>

      <div v-if="farm?.vet_phone">
        <a
          :href="`tel:${cleanPhone(farm.vet_phone)}`"
          class="w-full h-14 sm:h-16 rounded-2xl bg-[#E07A5F] hover:bg-[#cf6b50] text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 text-decoration-none shadow-sm transition-all active:scale-[0.99]">
          <v-icon icon="mdi-phone-in-talk" size="24" />
          <span>โทรหาหมอ {{ farm.vet_phone }}</span>
        </a>
      </div>
      <div v-else class="p-4 rounded-2xl bg-[#FEF3C7] text-[#92400E] text-sm font-semibold flex items-center gap-2">
        <v-icon icon="mdi-alert-circle" size="20" class="shrink-0" />
        <span>ยังไม่ได้บันทึกเบอร์โทรสัตวแพทย์ในระบบนี้ สามารถแจ้งเจ้าหน้าที่สหกรณ์ให้เพิ่มได้ค่ะ</span>
      </div>
    </section>

    <!-- ปรับขนาดตัวอักษรและเสียงอ่าน (เพื่อผู้สูงอายุ) -->
    <section class="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
      <div class="flex items-center gap-2">
        <v-icon icon="mdi-eye-outline" class="text-[#2D6A4F]" size="22" />
        <h2 class="text-base sm:text-lg font-bold text-[#15221B]">การมองเห็นและเสียงอ่าน</h2>
      </div>

      <!-- ขนาดตัวหนังสือ -->
      <div class="space-y-2">
        <label class="text-xs sm:text-sm font-bold text-[#475569] block">
          เลือกขนาดตัวหนังสือที่อ่านสบายตาที่สุด:
        </label>
        <div class="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            @click="setFontSize('normal')"
            class="py-3 px-2 rounded-2xl border-2 font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
            :class="fontSize === 'normal' ? 'border-[#1B4332] bg-[#E8F5E9] text-[#1B4332] shadow-xs' : 'border-[#E5E7EB] text-[#64748B] hover:border-gray-300'">
            <span class="text-base font-extrabold">ก</span>
            <span class="text-xs">ขนาดปกติ</span>
          </button>
          <button
            type="button"
            @click="setFontSize('large')"
            class="py-3 px-2 rounded-2xl border-2 font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
            :class="fontSize === 'large' ? 'border-[#1B4332] bg-[#E8F5E9] text-[#1B4332] shadow-xs' : 'border-[#E5E7EB] text-[#64748B] hover:border-gray-300'">
            <span class="text-xl font-extrabold">ก+</span>
            <span class="text-xs">ตัวใหญ่</span>
          </button>
          <button
            type="button"
            @click="setFontSize('huge')"
            class="py-3 px-2 rounded-2xl border-2 font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
            :class="fontSize === 'huge' ? 'border-[#1B4332] bg-[#E8F5E9] text-[#1B4332] shadow-xs' : 'border-[#E5E7EB] text-[#64748B] hover:border-gray-300'">
            <span class="text-2xl font-black">ก++</span>
            <span class="text-xs">ใหญ่พิเศษ</span>
          </button>
        </div>
      </div>

      <!-- ทดสอบเสียงอ่าน -->
      <div class="pt-2 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="text-xs sm:text-sm text-[#64748B]">
          มีเสียงสังเคราะห์ภาษาไทยช่วยอ่านสรุปสภาพอากาศในคอกวัว
        </div>
        <button
          type="button"
          @click="testVoice"
          class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs">
          <v-icon :icon="isSpeaking ? 'mdi-volume-high' : 'mdi-volume-medium'" size="18" />
          <span>{{ isSpeaking ? 'กำลังพูด...' : 'ทดลองฟังเสียงผู้ช่วย' }}</span>
        </button>
      </div>
    </section>

    <!-- ระบบเชื่อมต่อหลังบ้านเพื่อน (Backend Connection Switcher) -->
    <section class="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <v-icon icon="mdi-server-network" class="text-[#2D6A4F]" size="22" />
          <h2 class="text-base sm:text-lg font-bold text-[#15221B]">เชื่อมต่อหลังบ้าน (Backend Server)</h2>
        </div>
        <span 
          class="text-xs font-bold px-2.5 py-1 rounded-full"
          :class="isCustomBackend ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#E8F5E9] text-[#1B4332]'">
          {{ isCustomBackend ? 'ใช้หลังบ้านกำหนดเอง' : 'ใช้หลังบ้านหลัก' }}
        </span>
      </div>

      <p class="text-xs sm:text-sm text-[#64748B] leading-relaxed">
        สามารถเปลี่ยน URL ไปเชื่อมกับเครื่องคอมพิวเตอร์ของเพื่อน หรือเซิร์ฟเวอร์ทดสอบได้โดยไม่ต้องแก้โค้ด
      </p>

      <!-- URL ที่กำลังใช้งาน -->
      <div class="p-3 bg-[#F8F9F5] rounded-2xl border border-[#E5E7EB] text-xs sm:text-sm font-mono break-all flex items-center justify-between gap-2">
        <div>
          <span class="text-[11px] text-[#64748B] block font-sans font-bold">URL ที่ใช้งานอยู่ขณะนี้:</span>
          <span class="text-[#1B4332] font-bold">{{ currentBackendUrl }}</span>
        </div>
        <button 
          type="button" 
          @click="pingCurrent"
          :disabled="testing"
          class="shrink-0 px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-[#334155] hover:bg-gray-50 text-xs font-sans font-bold cursor-pointer flex items-center gap-1">
          <v-icon :icon="testing ? 'mdi-loading' : 'mdi-wifi-check'" :class="{ 'animate-spin': testing }" size="15" />
          <span>ทดสอบ Ping</span>
        </button>
      </div>

      <!-- ฟอร์มเปลี่ยน URL -->
      <div class="space-y-3">
        <label for="custom-backend-input" class="text-xs font-bold text-[#334155] block">
          ระบุ URL เซิร์ฟเวอร์หลังบ้าน (เช่น หลังบ้านของเพื่อน):
        </label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            id="custom-backend-input"
            v-model.trim="targetUrl"
            type="text"
            placeholder="http://192.168.1.xxx:5000 หรือ https://..."
            class="flex-1 px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm font-mono focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"
          />
          <div class="flex gap-2">
            <button
              type="button"
              @click="pingTarget"
              :disabled="testing || !targetUrl"
              class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] disabled:opacity-50 text-[#334155] text-xs sm:text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5">
              <v-icon :icon="testing ? 'mdi-loading' : 'mdi-wifi'" :class="{ 'animate-spin': testing }" size="16" />
              <span>ทดสอบ</span>
            </button>
            <button
              type="button"
              @click="applyTarget"
              :disabled="saving || !targetUrl"
              class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
              <v-icon icon="mdi-content-save-check" size="16" />
              <span>บันทึกและสลับ</span>
            </button>
          </div>
        </div>

        <!-- รายการ Preset ด่วน -->
        <div class="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span class="text-[#64748B] font-semibold">ตัวเลือกด่วน:</span>
          <button
            v-for="preset in knownList"
            :key="preset.url"
            type="button"
            @click="targetUrl = preset.url"
            class="px-2.5 py-1 rounded-lg bg-[#F8F9F5] hover:bg-gray-200 border border-[#E5E7EB] text-[#334155] font-semibold cursor-pointer">
            {{ preset.label }}
          </button>
          <button
            v-if="isCustomBackend"
            type="button"
            @click="resetToDefault"
            class="px-2.5 py-1 rounded-lg bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#991B1B] font-bold cursor-pointer ml-auto">
            คืนค่าเริ่มต้น
          </button>
        </div>

        <!-- กล่องผลลัพธ์การทดสอบ Ping -->
        <div 
          v-if="testResult" 
          class="p-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2"
          :class="testResult.success ? 'bg-[#E8F5E9] text-[#1B4332] border border-[#C8E6C9]' : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'">
          <v-icon :icon="testResult.success ? 'mdi-check-circle' : 'mdi-alert-circle'" size="18" />
          <span>{{ testResult.message }}</span>
        </div>
      </div>
    </section>

    <!-- ความหมายของสีระดับความร้อน (คู่มือเตือนภัยสำหรับคนแก่) -->
    <section class="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-xs space-y-3">
      <div class="flex items-center gap-2">
        <v-icon icon="mdi-palette" class="text-[#2D6A4F]" size="22" />
        <h2 class="text-base sm:text-lg font-bold text-[#15221B]">ความหมายของสีระดับความร้อน</h2>
      </div>

      <div class="space-y-2 text-xs sm:text-sm">
        <div class="p-3 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-center gap-3">
          <span class="w-4 h-4 rounded-full bg-[#2D6A4F] shrink-0"></span>
          <div>
            <span class="font-bold text-[#1B4332] block">สีเขียว — สบายดี (ปกติ)</span>
            <span class="text-[#2D6A4F]">อากาศสบาย ไม่เครียด กินอาหารได้ดี ให้น้ำนมปกติ</span>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center gap-3">
          <span class="w-4 h-4 rounded-full bg-[#D97706] shrink-0"></span>
          <div>
            <span class="font-bold text-[#92400E] block">สีเหลือง/ส้มอ่อน — เริ่มอุ่น</span>
            <span class="text-[#B45309]">อากาศเริ่มร้อนขึ้น แนะนำเปิดพัดลมให้อากาศถ่ายเท</span>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-[#FFEDD5] border border-[#FED7AA] flex items-center gap-3">
          <span class="w-4 h-4 rounded-full bg-[#EA580C] shrink-0"></span>
          <div>
            <span class="font-bold text-[#9A3412] block">สีส้มเข้ม — เริ่มร้อนจัด</span>
            <span class="text-[#C2410C]">แม่วัวเริ่มหอบ เปิดพัดลมและเตรียมเปิดน้ำพ่นละออง เติมน้ำสะอาด</span>
          </div>
        </div>

        <div class="p-3 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] flex items-center gap-3">
          <span class="w-4 h-4 rounded-full bg-[#DC2626] shrink-0"></span>
          <div>
            <span class="font-bold text-[#991B1B] block">สีแดง — ร้อนจัดอันตราย!</span>
            <span class="text-[#DC2626]">เครียดความร้อนรุนแรง รีบพ่นน้ำ-เปิดพัดลมเต็มกำลัง สังเกตตัวที่หอบ และติดต่อหมอ</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ลิงก์กลับหน้าแอดมิน (ถ้าเป็นแอดมิน) -->
    <NuxtLink 
      v-if="isAdmin" 
      to="/Admin" 
      class="w-full h-14 rounded-2xl bg-white border border-[#CBD5E1] hover:bg-gray-50 text-[#15221B] font-bold text-sm sm:text-base flex items-center justify-center gap-2 text-decoration-none shadow-xs transition-colors">
      <v-icon icon="mdi-shield-account-outline" size="20" />
      <span>กลับหน้าแผงควบคุมหลัก (Admin Portal)</span>
    </NuxtLink>

    <!-- ปุ่มออกจากระบบ (ชัดเจน ไม่ซับซ้อน ปลอดภัย) -->
    <button
      type="button"
      @click="openLogoutModal"
      class="w-full h-14 sm:h-16 rounded-2xl bg-white border-2 border-[#FCA5A5] hover:bg-[#FEF2F2] text-[#DC2626] font-black text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer shadow-xs transition-colors active:scale-[0.99]">
      <v-icon icon="mdi-logout" size="24" />
      <span>ออกจากระบบ (Log Out)</span>
    </button>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFarmer } from '~/composables/useFarmer'
import { getCustomNodeApi, setCustomNodeApi, getNodeApiBase } from '~/API/baseAPI'
import { PROFILE_LABELS } from '~/utils/heatStress'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ฟาร์มของฉัน | CowCare AI' })

const {
  farm,
  user,
  isAdmin,
  fontSize,
  setFontSize,
  isSpeaking,
  speakThai,
  currentBackendUrl,
  testBackend,
  switchBackend,
  openLogoutModal
} = useFarmer()

const displayName = computed(() => user.value?.name_users || user.value?.full_name || user.value?.email || 'เกษตรกร')
const initial = computed(() => String(displayName.value).trim().charAt(0).toUpperCase() || 'K')

const cleanPhone = (phone) => String(phone || '').replace(/[^0-9+]/g, '')

const testVoice = () => {
  speakThai('สวัสดีค่ะ ระบบช่วยเหลือด้วยเสียงของ CowCare AI พร้อมดูแลคุณตาคุณยายแล้วค่ะ')
}

// Backend Switcher State
const targetUrl = ref(currentBackendUrl.value || '')
const testing = ref(false)
const saving = ref(false)
const testResult = ref(null)

const isCustomBackend = computed(() => Boolean(getCustomNodeApi()))

const knownList = [
  { label: 'เครื่องเพื่อน (192.168.1.100)', url: 'http://192.168.1.100:5000' },
  { label: 'Localhost:5000', url: 'http://localhost:5000' }
]

const pingCurrent = async () => {
  testing.value = true
  testResult.value = null
  const res = await testBackend(currentBackendUrl.value)
  testResult.value = res
  testing.value = false
}

const pingTarget = async () => {
  if (!targetUrl.value) return
  testing.value = true
  testResult.value = null
  const res = await testBackend(targetUrl.value)
  testResult.value = res
  testing.value = false
}

const applyTarget = async () => {
  if (!targetUrl.value) return
  saving.value = true
  await switchBackend(targetUrl.value)
  testResult.value = {
    success: true,
    message: `บันทึกและสลับไปใช้ ${targetUrl.value} เรียบร้อยแล้ว!`
  }
  saving.value = false
}

const resetToDefault = async () => {
  setCustomNodeApi(null)
  targetUrl.value = getNodeApiBase()
  await switchBackend(null)
  testResult.value = {
    success: true,
    message: 'คืนค่าเซิร์ฟเวอร์กลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว'
  }
}
</script>