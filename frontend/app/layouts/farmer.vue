<template>
  <div
    class="min-h-screen bg-[#F6F1E6] text-[#1B342D] font-sans selection:bg-[#2D6A4F]/20 flex flex-col transition-all duration-200">
    <!-- แถบด้านบน: ชื่อฟาร์ม ตัวสลับฟาร์ม ปุ่มฟังเสียง ปุ่มขยายตัวอักษร -->
    <FarmerTopBar @toggle-voice="handleVoiceToggle" />

    <!-- แถบเมนูนำทางสำหรับจอแท็บเล็ตและคอมพิวเตอร์ -->
    <FarmerBottomNav variant="desktop" />

    <!-- เนื้อหาหลัก -->
    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-5 pb-28 md:pb-12">
      <!-- สถานะกำลังโหลด -->
      <div v-if="!loaded" class="py-24 text-center space-y-3">
        <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F]" size="44" />
        <p class="text-base sm:text-lg font-extrabold text-[#3A5248]">กำลังเปิดข้อมูลฟาร์มโคนม...</p>
      </div>

      <!-- สถานะเชื่อมต่อไม่สำเร็จ -->
      <div v-else-if="error && !me" class="max-w-md mx-auto py-16 px-5 bg-[#FFFDF7] rounded-3xl border border-[#E6DEC8] text-center space-y-4 shadow-xs">
        <div class="w-16 h-16 rounded-3xl bg-[#FEE2E2] text-[#DC2626] mx-auto flex items-center justify-center">
          <v-icon icon="mdi-wifi-off" size="36" />
        </div>
        <h2 class="text-lg sm:text-xl font-black text-[#1B342D]">{{ error }}</h2>
        <p class="text-xs sm:text-sm text-[#4E655B]">กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วกดลองใหม่อีกครั้ง</p>
        <button
          type="button"
          @click="refresh"
          class="w-full h-14 rounded-2xl bg-[#1B342D] hover:bg-[#24433A] text-white font-black text-base transition-colors cursor-pointer shadow-xs">
          ลองใหม่อีกครั้ง
        </button>
      </div>

      <!-- สถานะบัญชียังไม่ผูกกับฟาร์ม -->
      <div v-else-if="!farm" class="max-w-md mx-auto py-16 px-5 bg-[#FFFDF7] rounded-3xl border border-[#E6DEC8] text-center space-y-3 shadow-xs">
        <div class="w-16 h-16 rounded-3xl bg-[#FEF3C7] text-[#D97706] mx-auto flex items-center justify-center">
          <v-icon icon="mdi-barn" size="36" />
        </div>
        <h2 class="text-lg sm:text-xl font-black text-[#1B342D]">
          {{ me?.message || 'ยังไม่พบข้อมูลฟาร์มของคุณ' }}
        </h2>
        <p class="text-sm text-[#4E655B]">กรุณาติดต่อเจ้าหน้าที่สหกรณ์เพื่อผูกบัญชีเข้ากับโรงเรือน</p>
        <button
          type="button"
          @click="openLogoutModal"
          class="text-sm text-[#DC2626] font-black underline cursor-pointer pt-2">
          ออกจากระบบ
        </button>
      </div>

      <!-- เนื้อหาของแต่ละหน้า -->
      <template v-else>
        <slot />
      </template>
    </main>

    <!-- แถบเมนูด้านล่างสำหรับมือถือ -->
    <FarmerBottomNav variant="mobile" />

    <!-- หน้าต่างยืนยันออกจากระบบสำหรับผู้สูงอายุ -->
    <FarmerLogoutModal />
  </div>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

const {
  me,
  farm,
  now,
  senior,
  cooling,
  loaded,
  error,
  isSpeaking,
  speakThai,
  stopSpeech,
  ensureAuth,
  refresh,
  openLogoutModal,
  startPolling,
  stopPolling
} = useFarmer()


const handleVoiceToggle = () => {
  if (isSpeaking.value) {
    stopSpeech()
  } else {
    const baseVoice = senior.value?.voice_text ||
      `สภาพอากาศในคอกตอนนี้ อุณหภูมิ ${now.value ? Number(now.value.temperature_c).toFixed(1) : 'ปกติ'} องศาเซลเซียส สบายดีจ้า`
    const coolingNote = cooling.value?.short ? ` คำแนะนำเพิ่มเติมคือ ${cooling.value.short}` : ''
    speakThai(`${baseVoice}${coolingNote}`)
  }
}

onMounted(() => {
  if (!ensureAuth()) return
  if (!me.value) refresh()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

