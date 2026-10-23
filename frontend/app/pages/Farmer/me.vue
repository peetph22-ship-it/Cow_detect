<template>
  <div>
    <!-- ส่วนบนเขียวเข้ม: ผู้ใช้ -->
    <section class="bg-[#142820] text-white">
      <div class="max-w-3xl mx-auto px-4 pb-6 pt-2 flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-[#D87939] flex items-center justify-center text-xl font-bold shrink-0">{{ initial }}</div>
        <div class="min-w-0">
          <h1 class="text-lg font-bold truncate">{{ displayName }}</h1>
          <p class="text-xs text-[#9FB5AA]">{{ isAdmin ? 'ผู้ดูแลระบบ (ดูตัวอย่างหน้าเกษตรกร)' : 'เกษตรกร' }}</p>
        </div>
      </div>
    </section>

    <div class="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <!-- ติดต่อสัตวแพทย์ -->
      <section class="bg-[#fffdf7] border border-[#EFE6D6] rounded-[22px] p-4">
        <div class="text-xs font-semibold text-[#718078]">เมื่อแม่โคหอบ ไม่กินอาหาร หรือผิดปกติ</div>
        <a
          v-if="farm?.vet_phone"
          :href="`tel:${farm.vet_phone.replace(/[^0-9+]/g, '')}`"
          class="mt-3 w-full h-12 rounded-2xl bg-[#D87939] hover:bg-[#c56a2e] text-white font-semibold text-[15px] flex items-center justify-center gap-2 text-decoration-none transition-colors">
          <v-icon icon="mdi-phone" size="20" />
          โทรหาสัตวแพทย์ {{ farm.vet_phone }}
        </a>
        <p v-else class="text-[14px] mt-2">ติดต่อสัตวแพทย์ประจำสหกรณ์ของท่าน <span class="text-[#718078] text-xs block mt-1">ยังไม่ได้บันทึกเบอร์ในระบบ แจ้งเจ้าหน้าที่ให้เพิ่มได้</span></p>
      </section>

      <!-- ข้อมูลฟาร์ม -->
      <section class="bg-[#fffdf7] border border-[#EFE6D6] rounded-[22px] px-4 py-1">
        <div class="flex justify-between gap-3 py-3 border-b border-[#EFE6D6] text-[14px]"><span class="text-[#718078]">ฟาร์ม</span><span class="font-semibold text-right">{{ farm?.name }}</span></div>
        <div class="flex justify-between gap-3 py-3 border-b border-[#EFE6D6] text-[14px]"><span class="text-[#718078]">โรงเรือน</span><span class="text-right">{{ farm?.barn_unit || '—' }}</span></div>
        <div class="flex justify-between gap-3 py-3 border-b border-[#EFE6D6] text-[14px]"><span class="text-[#718078]">จังหวัด</span><span class="text-right">{{ farm?.province || '—' }}</span></div>
        <div class="flex justify-between gap-3 py-3 text-[14px]"><span class="text-[#718078]">เกณฑ์ความร้อน</span><span class="text-right">{{ PROFILE_LABELS[farm?.profile] }}</span></div>
      </section>

      <!-- อธิบายระดับ -->
      <section class="bg-[#e6f2e7] border border-[#cfe5d2] rounded-[22px] p-4">
        <div class="text-xs font-semibold text-[#3e7d4f] mb-2">ระดับความร้อนในแอป</div>
        <div class="grid grid-cols-2 gap-2 text-[13px]">
          <div v-for="lvl in ['normal', 'mild', 'moderate', 'severe']" :key="lvl" class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full" :style="{ background: riskStyle(lvl).dot }"></span>
            <span class="font-semibold">{{ riskShort(lvl) }}</span>
          </div>
        </div>
        <p class="text-xs text-[#4e6b59] mt-3">คำนวณจากอุณหภูมิและความชื้นในโรงเรือนของท่าน อัปเดตทุก 1 นาที</p>
      </section>

      <NuxtLink v-if="isAdmin" to="/Admin" class="w-full h-12 rounded-2xl border border-[#E4E8E5] bg-white text-[15px] font-semibold flex items-center justify-center gap-2 text-decoration-none text-[#142820]">
        <v-icon icon="mdi-shield-account-outline" size="20" /> กลับหน้าแอดมิน
      </NuxtLink>
      <button type="button" @click="logout" class="w-full h-12 rounded-2xl border border-[#E4E8E5] bg-white text-[15px] font-semibold text-[#9b2c1d] flex items-center justify-center gap-2 cursor-pointer">
        <v-icon icon="mdi-logout" size="20" /> ออกจากระบบ
      </button>
    </div>
  </div>
</template>

<script setup>
import { useFarmer, riskStyle, riskShort } from '~/composables/useFarmer'
import { PROFILE_LABELS } from '~/utils/heatStress'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ฉัน | CowCare AI' })

const { farm, user, isAdmin, logout } = useFarmer()
const displayName = computed(() => user.value?.name_users || user.value?.full_name || user.value?.email || 'ผู้ใช้')
const initial = computed(() => String(displayName.value).trim().charAt(0).toUpperCase() || 'U')
</script>
