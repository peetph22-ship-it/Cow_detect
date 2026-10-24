<template>
  <div class="h-screen bg-[#F4F5F2] flex font-sans text-[#142820] relative overflow-hidden selection:bg-[#D87939]/15 selection:text-[#142820]">
    <!-- พื้นหลังลายจุดบางๆ สไตล์เดียวกับหน้าหลัก -->
    <div class="fixed inset-0 bg-[radial-gradient(#142820_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.025] pointer-events-none"></div>

    <!-- ฉากหลังมืดเมื่อเปิด Sidebar บนมือถือ -->
    <div
      v-if="sidebarOpen && isMobile"
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-[#142820]/50 backdrop-blur-xs z-40 lg:hidden"></div>

    <!-- แถบนำทางด้านซ้าย (สไลด์เปิด-ปิดได้ทั้งบนคอมและมือถือ) -->
    <FarmerBottomNav
      variant="sidebar"
      :open="sidebarOpen"
      :is-mobile="isMobile"
      @close="sidebarOpen = false"
      @nav-click="handleNavClick" />

    <!-- พื้นที่ทำงานหลักด้านขวา (ล็อกความสูง h-screen และเลื่อนเฉพาะเนื้อหาด้านใน) -->
    <div class="flex-1 flex flex-col min-w-0 h-screen relative z-10">
      <!-- แถบด้านบนของพื้นที่ทำงาน -->
      <FarmerTopBar
        :sidebar-open="sidebarOpen"
        @toggle-sidebar="sidebarOpen = !sidebarOpen" />

      <!-- เนื้อหาหลักที่เลื่อนขึ้น-ลงแยกอิสระ ไม่ดันหน้าเว็บตก -->
      <main class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-28 lg:pb-10">
        <div class="max-w-[1360px] w-full mx-auto">
          <!-- สถานะกำลังโหลด -->
          <div v-if="!loaded" class="py-24 text-center space-y-3">
            <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F]" size="44" />
            <p class="text-base sm:text-lg font-extrabold text-[#3A5248]">กำลังเปิดข้อมูลฟาร์มโคนม...</p>
          </div>

          <!-- สถานะเชื่อมต่อไม่สำเร็จ -->
          <div
            v-else-if="error && !me"
            class="max-w-md mx-auto my-12 py-12 px-6 bg-white rounded-[28px] border border-[#E4E8E5] text-center space-y-4 shadow-sm">
            <div class="w-16 h-16 rounded-3xl bg-[#FEE2E2] text-[#DC2626] mx-auto flex items-center justify-center">
              <v-icon icon="mdi-wifi-off" size="36" />
            </div>
            <h2 class="text-lg sm:text-xl font-black text-[#142820]">{{ error }}</h2>
            <p class="text-xs sm:text-sm text-[#5A6B63]">กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วกดลองใหม่อีกครั้ง</p>
            <button
              type="button"
              @click="refresh"
              class="w-full h-13 rounded-2xl bg-[#142820] hover:bg-[#24433A] text-white font-black text-base transition-colors cursor-pointer shadow-xs">
              ลองใหม่อีกครั้ง
            </button>
          </div>

          <!-- สถานะบัญชียังไม่ผูกกับฟาร์ม -->
          <div
            v-else-if="!farm"
            class="max-w-md mx-auto my-12 py-12 px-6 bg-white rounded-[28px] border border-[#E4E8E5] text-center space-y-3 shadow-sm">
            <div class="w-16 h-16 rounded-3xl bg-[#FEF3C7] text-[#D97706] mx-auto flex items-center justify-center">
              <v-icon icon="mdi-barn" size="36" />
            </div>
            <h2 class="text-lg sm:text-xl font-black text-[#142820]">
              {{ me?.message || 'ยังไม่พบข้อมูลฟาร์มของคุณ' }}
            </h2>
            <p class="text-sm text-[#5A6B63]">กรุณาติดต่อเจ้าหน้าที่สหกรณ์เพื่อผูกบัญชีเข้ากับโรงเรือน</p>
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
        </div>
      </main>
    </div>

    <!-- แถบเมนูด้านล่างแบบลอยตัวสำหรับมือถือ -->
    <FarmerBottomNav variant="mobile" />

    <!-- หน้าต่างยืนยันออกจากระบบ -->
    <FarmerLogoutModal />
  </div>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

const sidebarOpen = ref(true)
const isMobile = ref(false)

const checkViewport = () => {
  if (typeof window === 'undefined') return
  const mobile = window.innerWidth < 1024
  if (mobile !== isMobile.value) {
    isMobile.value = mobile
    sidebarOpen.value = !mobile
  }
}

const handleNavClick = () => {
  if (isMobile.value) {
    sidebarOpen.value = false
  }
}

const {
  me,
  farm,
  loaded,
  error,
  ensureAuth,
  refresh,
  openLogoutModal,
  startPolling,
  stopPolling
} = useFarmer()

onMounted(() => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 1024
    sidebarOpen.value = !isMobile.value
    window.addEventListener('resize', checkViewport)
  }
  if (!ensureAuth()) return
  if (!me.value) refresh()
  startPolling()
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkViewport)
  }
  stopPolling()
})
</script>
