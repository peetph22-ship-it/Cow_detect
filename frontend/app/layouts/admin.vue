<template>
  <div
    class="min-h-screen bg-[#FDFCF8] flex font-sans text-[#24433a] relative overflow-x-hidden selection:bg-[#d87939]/20 selection:text-[#24433a]">

    <!-- 🌟 Ambient Background Glows -->
    <div
      class="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#d87939]/10 blur-[120px] pointer-events-none z-0 animate-float">
    </div>
    <div
      class="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#24433a]/5 blur-[100px] pointer-events-none z-0 animate-float-delayed">
    </div>

    <!-- 📌 Mobile Overlay (ปิด Sidebar เมื่อกดพื้นหลังบนมือถือ) -->
    <Transition name="overlay">
      <div v-if="isSidebarOpen && isMobile" @click="isSidebarOpen = false"
        class="fixed inset-0 bg-[#24433a]/30 backdrop-blur-sm z-40 lg:hidden"></div>
    </Transition>

    <!-- 📌 Sidebar (สไลด์เปิด-ปิดได้ทั้ง Desktop และ Mobile) -->
    <aside :class="[
      'h-screen bg-white/80 backdrop-blur-3xl border-r border-[#24433a]/5 flex flex-col z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[4px_0_30px_rgba(36,67,58,0.03)] flex-shrink-0',
      'fixed lg:sticky top-0 left-0',
      isSidebarOpen
        ? 'w-[280px] translate-x-0 opacity-100'
        : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-none'
    ]" style="will-change: width, transform;">

      <!-- Close Button (เฉพาะหน้าจอมือถือ) -->
      <button v-if="isMobile" @click="isSidebarOpen = false"
        class="absolute top-7 right-5 w-9 h-9 rounded-full bg-[#edf3ed] text-[#4e6057] flex items-center justify-center z-50 hover:bg-[#d87939] hover:text-white transition-all duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Logo Area -->
      <div class="h-24 flex items-center px-8 flex-shrink-0">
        <NuxtLink to="/Admin" @click="handleNavClick" class="flex items-center gap-3.5 group">
          <div class="relative">
            <div
              class="absolute inset-0 bg-[#d87939]/30 blur-xl rounded-full group-hover:scale-125 transition-all duration-700 opacity-0 group-hover:opacity-100">
            </div>
            <div
              class="w-11 h-11 rounded-[14px] bg-[#24433a] flex items-center justify-center relative z-10 shadow-[0_4px_12px_rgba(36,67,58,0.2)] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
              <img src="/images/logo/logo1.png" alt="CowCare AI"
                class="h-6 w-auto object-contain drop-shadow-md filter brightness-0 invert" />
            </div>
          </div>
          <div class="flex flex-col pt-1">
            <span class="font-extrabold text-[15px] tracking-tight text-[#24433a] leading-none">Detection <em
                class="not-italic text-[#d87939]">System</em></span>
            <span class="text-[9px] text-[#718078] font-black tracking-[0.18em] mt-1.5 opacity-80">ADMIN CONSOLE</span>
          </div>
        </NuxtLink>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 py-4 px-5 space-y-7 overflow-y-auto custom-scrollbar">

        <!-- Group 1: Overview -->
        <div>
          <p class="px-4 text-[10px] font-black text-[#718078]/60 uppercase tracking-[0.2em] mb-3">ภาพรวมระบบ</p>
          <nav class="space-y-1.5">
            <NuxtLink to="/Admin" @click="handleNavClick"
              class="flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group"
              active-class="!bg-[#24433a] !text-white shadow-[0_8px_20px_rgba(36,67,58,0.15)]">
              <div
                class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                  class="w-4.5 h-4.5 flex-shrink-0">
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                </svg>
              </div>
              <span class="text-[13px] tracking-wide">ภาพรวม (Dashboard)</span>
            </NuxtLink>
          </nav>
        </div>

        <!-- Group 2: Management -->
        <div>
          <p class="px-4 text-[10px] font-black text-[#718078]/60 uppercase tracking-[0.2em] mb-3">การจัดการ</p>
          <nav class="space-y-1.5">
            <NuxtLink to="/Admin/users" @click="handleNavClick"
              class="flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group"
              active-class="!bg-[#24433a] !text-white shadow-[0_8px_20px_rgba(36,67,58,0.15)]">
              <div
                class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="w-4.5 h-4.5 flex-shrink-0">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <span class="text-[13px] tracking-wide">สมาชิกเกษตรกร</span>
            </NuxtLink>

            <NuxtLink to="/Admin/farms" @click="handleNavClick"
              class="flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group"
              active-class="!bg-[#24433a] !text-white shadow-[0_8px_20px_rgba(36,67,58,0.15)]">
              <div
                class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="w-4.5 h-4.5 flex-shrink-0">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span class="text-[13px] tracking-wide">ข้อมูลฟาร์ม (Farms)</span>
            </NuxtLink>

            <NuxtLink to="/Admin/devices" @click="handleNavClick"
              class="flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group"
              active-class="!bg-[#24433a] !text-white shadow-[0_8px_20px_rgba(36,67,58,0.15)]">
              <div
                class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="w-4.5 h-4.5 flex-shrink-0">
                  <rect width="16" height="16" x="4" y="4" rx="2" />
                  <rect width="6" height="6" x="9" y="9" rx="1" />
                  <path d="M15 2v2" />
                  <path d="M15 20v2" />
                  <path d="M2 15h2" />
                  <path d="M2 9h2" />
                </svg>
              </div>
              <span class="text-[13px] tracking-wide">อุปกรณ์ IoT & เซ็นเซอร์</span>
            </NuxtLink>

            <NuxtLink to="/Admin/alerts" @click="handleNavClick"
              class="flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group"
              active-class="!bg-[#24433a] !text-white shadow-[0_8px_20px_rgba(36,67,58,0.15)]">
              <div
                class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="w-4.5 h-4.5 flex-shrink-0">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <span class="text-[13px] tracking-wide">ประวัติการเตือนภัย</span>
            </NuxtLink>
          </nav>
        </div>
      </div>

      <!-- User Profile / Logout -->
      <div class="p-5 mt-auto flex-shrink-0">
        <div
          class="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[24px] p-2 shadow-[0_8px_20px_rgba(36,67,58,0.03)]">
          <div
            class="flex items-center gap-3 px-3 py-2.5 mb-1.5 rounded-[18px] bg-gradient-to-br from-[#edf3ed] to-transparent">
            <div
              class="w-10 h-10 rounded-[14px] bg-[#d87939] text-white flex items-center justify-center font-bold text-sm shadow-[0_4px_12px_rgba(216,121,57,0.25)] flex-shrink-0">
              AD
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-sm font-extrabold text-[#24433a] truncate">{{ user?.name || 'Administrator' }}</span>
              <span class="text-[10px] font-bold text-[#718078] uppercase tracking-wider truncate">{{ user?.email ||
                'admin@cowcare.ai' }}</span>
            </div>
          </div>

          <button @click="handleLogout"
            class="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-[16px] text-[#e04f4f] hover:bg-[#e04f4f]/10 hover:text-[#c43a3a] transition-all text-[13px] font-bold group cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              class="w-4 h-4 flex-shrink-0 group-hover:-translate-x-1 transition-transform">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </aside>

    <!-- 🌌 Main Content Area (ปรับขนาดแบบ Smooth ตามการเปิด-ปิด Sidebar) -->
    <div class="flex-1 flex flex-col min-w-0 h-screen relative z-10 transition-all duration-300">

      <!-- Glassmorphic Topbar -->
      <header
        class="h-20 px-6 md:px-10 flex items-center justify-between flex-shrink-0 z-30 sticky top-0 bg-[#FDFCF8]/80 backdrop-blur-2xl border-b border-[#24433a]/5">
        <div class="flex items-center gap-4">
          <!-- ☰ Hamburger Menu Button (สลับเปิด-ปิด Sidebar ได้ตลอดเวลา) -->
          <button type="button" @click="toggleSidebar"
            class="w-11 h-11 rounded-[16px] bg-white border border-[#24433a]/10 text-[#24433a] hover:text-[#d87939] hover:border-[#d87939]/30 hover:shadow-md flex items-center justify-center shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
            :title="isSidebarOpen ? 'ย่อแถบเมนู (Collapse Sidebar)' : 'ขยายแถบเมนู (Expand Sidebar)'">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
              class="w-5.5 h-5.5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div
            class="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/80 border border-[#24433a]/10 shadow-sm backdrop-blur-md">
            <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse-soft"></span>
            <span class="text-[11px] font-black tracking-widest text-[#24433a] uppercase">Live Network</span>
          </div>
        </div>

        <div class="flex items-center gap-3 sm:gap-5">
          <!-- Notification Bell -->
          <button
            class="relative w-11 h-11 rounded-[16px] bg-white border border-[#24433a]/5 text-[#4e6057] hover:text-[#d87939] hover:shadow-md transition-all flex items-center justify-center hover:-translate-y-0.5 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="w-5 h-5 flex-shrink-0">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span class="absolute top-2.5 right-3 w-2.5 h-2.5 bg-[#d87939] rounded-full border-2 border-white"></span>
          </button>

          <!-- Back to Main Site -->
          <NuxtLink to="/"
            class="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-[16px] bg-white border border-[#24433a]/5 text-[#24433a] font-bold text-xs hover:bg-[#edf3ed] hover:border-[#24433a]/20 hover:-translate-y-0.5 transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="w-4 h-4 flex-shrink-0">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            หน้าหลักเว็บไซต์
          </NuxtLink>
        </div>
      </header>

      <!-- Scrollable Page Content -->
      <main class="flex-1 overflow-y-auto px-6 md:px-10 pb-16 pt-8 custom-scrollbar relative z-10 w-full">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const user = ref(null)
const isSidebarOpen = ref(true)
const isMobile = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const handleNavClick = () => {
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

const checkScreen = () => {
  if (process.client) {
    const mobile = window.innerWidth < 1024
    isMobile.value = mobile
    // หากเป็นมือถือให้เริ่มต้นด้วยการปิด sidebar, หากเป็น desktop ให้เปิดไว้
    if (mobile && isSidebarOpen.value) {
      isSidebarOpen.value = false
    } else if (!mobile && !isSidebarOpen.value) {
      isSidebarOpen.value = true
    }
  }
}

onMounted(() => {
  if (process.client) {
    checkScreen()
    window.addEventListener('resize', checkScreen)

    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        user.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error(e)
    }
  }
})

onBeforeUnmount(() => {
  if (process.client) {
    window.removeEventListener('resize', checkScreen)
  }
})

const handleLogout = () => {
  if (process.client) {
    if(!confirm('ท่านต้องการออกจากระบบใช่หรือไม่?')) return
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigateTo('/')
  }
}
</script>

<style scoped>
/* Overlay transition */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.25s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

/* 🎨 Custom Soft Animations */
@keyframes float {

  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-30px) scale(1.05);
  }
}

.animate-float {
  animation: float 12s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float 15s ease-in-out infinite 2s;
}

@keyframes pulseSoft {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.7;
    transform: scale(1.1);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
  }
}

.animate-pulse-soft {
  animation: pulseSoft 2s ease-in-out infinite;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(36, 67, 58, 0.1);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(36, 67, 58, 0.2);
}
</style>
