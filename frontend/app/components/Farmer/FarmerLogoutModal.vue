<template>
  <div
    v-if="showLogoutModal"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-[#FFFDF7] rounded-3xl p-6 shadow-2xl border border-[#E6DEC8] text-center space-y-4">
      <div class="w-16 h-16 rounded-full bg-[#FEE2E2] text-[#DC2626] mx-auto flex items-center justify-center shadow-inner">
        <v-icon icon="mdi-logout-variant" size="32" />
      </div>
      <div class="space-y-1.5">
        <h2 class="text-lg sm:text-xl font-black text-[#1B342D]">
          ต้องการออกจากระบบใช่หรือไม่?
        </h2>
        <p class="text-xs sm:text-sm text-[#4E655B] leading-relaxed">
          เมื่อออกจากระบบแล้ว หากต้องการเข้ามาดูสภาพอากาศอีกครั้ง จะต้องเข้าสู่ระบบใหม่
        </p>
      </div>
      <div class="pt-2 flex flex-col gap-2.5">
        <button
          type="button"
          @click="confirmLogout"
          class="w-full h-14 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black text-base flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]">
          <v-icon icon="mdi-logout" size="20" />
          <span>ออกจากระบบทันที</span>
        </button>
        <button
          type="button"
          @click="cancelLogout"
          class="w-full h-12 rounded-2xl bg-[#ECE6D8] hover:bg-[#E2D9C5] text-[#1B342D] font-extrabold text-sm cursor-pointer">
          ยกเลิก (อยู่หน้านี้ต่อ)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

const { showLogoutModal, cancelLogout, confirmLogout } = useFarmer()
</script>
