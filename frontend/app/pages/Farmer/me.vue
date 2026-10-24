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
import { computed } from 'vue'
import { useFarmer } from '~/composables/useFarmer'
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
  openLogoutModal
} = useFarmer()

const displayName = computed(() => user.value?.name_users || user.value?.full_name || user.value?.email || 'เกษตรกร')
const initial = computed(() => String(displayName.value).trim().charAt(0).toUpperCase() || 'K')

const cleanPhone = (phone) => String(phone || '').replace(/[^0-9+]/g, '')

const testVoice = () => {
  speakThai('สวัสดีค่ะ ระบบช่วยเหลือด้วยเสียงของ CowCare AI พร้อมดูแลคุณตาคุณยายแล้วค่ะ')
}
</script>