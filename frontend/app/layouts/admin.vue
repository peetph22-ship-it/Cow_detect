<template>
  <div class="min-h-screen bg-[#FDFCF8] flex font-sans text-[#24433a] relative overflow-hidden selection:bg-[#d87939]/20 selection:text-[#24433a]">
    
    <!-- 🌟 Ambient Background Glows (Soft floating orbs) -->
    <div class="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#d87939]/10 blur-[120px] pointer-events-none z-0 animate-float"></div>
    <div class="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#24433a]/5 blur-[100px] pointer-events-none z-0 animate-float-delayed"></div>

    <!-- 📌 Sidebar (Glassmorphism & Soft UI) -->
    <aside class="w-[280px] bg-white/40 backdrop-blur-3xl border-r border-[#24433a]/5 flex flex-col z-20 flex-shrink-0 relative shadow-[4px_0_24px_rgba(36,67,58,0.02)]">
      
      <!-- Logo Area -->
      <div class="h-28 flex items-center px-8 animate-fade-right">
        <NuxtLink to="/Admin" class="flex items-center gap-3.5 group">
          <div class="relative">
            <!-- Glow behind logo on hover -->
            <div class="absolute inset-0 bg-[#d87939]/30 blur-xl rounded-full group-hover:scale-125 transition-all duration-700 opacity-0 group-hover:opacity-100"></div>
            <div class="w-11 h-11 rounded-[14px] bg-[#24433a] flex items-center justify-center relative z-10 shadow-[0_4px_12px_rgba(36,67,58,0.2)] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
              <img src="/images/logo/logo1.png" alt="CowCare AI" class="h-6 w-auto object-contain drop-shadow-md filter brightness-0 invert" />
            </div>
          </div>
          <div class="flex flex-col pt-1">
            <span class="font-extrabold text-[15px] tracking-tight text-[#24433a] leading-none">Detection <em class="not-italic text-[#d87939]">System</em></span>
            <span class="text-[9px] text-[#718078] font-black tracking-[0.18em] mt-1.5 opacity-80">ADMIN CONSOLE</span>
          </div>
        </NuxtLink>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 py-4 px-5 space-y-8 overflow-y-auto custom-scrollbar">
        
        <!-- Group 1: Overview -->
        <div class="animate-fade-right delay-100">
          <p class="px-4 text-[10px] font-black text-[#718078]/60 uppercase tracking-[0.2em] mb-3">ภาพรวมระบบ</p>
          <nav class="space-y-1.5">
            <NuxtLink to="/Admin" class="flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] bg-[#24433a] text-white font-semibold shadow-[0_8px_20px_rgba(36,67,58,0.15)] transition-all group overflow-hidden relative">
              <!-- Shine effect on active menu -->
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine"></div>
              <div class="w-8 h-8 rounded-[12px] bg-white/15 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4.5 h-4.5 flex-shrink-0"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
              </div>
              <span class="text-[13px] tracking-wide">ภาพรวม (Dashboard)</span>
            </NuxtLink>
          </nav>
        </div>

        <!-- Group 2: Management -->
        <div class="animate-fade-right delay-200">
          <p class="px-4 text-[10px] font-black text-[#718078]/60 uppercase tracking-[0.2em] mb-3">การจัดการ</p>
          <nav class="space-y-1.5">
            <NuxtLink to="/Admin/users" class="flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group">
              <div class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm group-hover:shadow-[0_4px_12px_rgba(216,121,57,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4.5 h-4.5 flex-shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <span class="text-[13px] tracking-wide">สมาชิกเกษตรกร</span>
            </NuxtLink>

            <NuxtLink to="/Admin/farms" class="flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group">
              <div class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm group-hover:shadow-[0_4px_12px_rgba(216,121,57,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4.5 h-4.5 flex-shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              <span class="text-[13px] tracking-wide">ข้อมูลฟาร์ม (Farms)</span>
            </NuxtLink>

            <NuxtLink to="/Admin/devices" class="flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group">
              <div class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm group-hover:shadow-[0_4px_12px_rgba(216,121,57,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4.5 h-4.5 flex-shrink-0"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /></svg>
              </div>
              <span class="text-[13px] tracking-wide">อุปกรณ์ IoT & เซ็นเซอร์</span>
            </NuxtLink>

            <NuxtLink to="/Admin/alerts" class="flex items-center gap-3.5 px-4 py-3 rounded-[20px] text-[#4e6057] hover:bg-[#edf3ed] hover:text-[#24433a] font-semibold transition-all group">
              <div class="w-8 h-8 rounded-[12px] bg-[#edf3ed] group-hover:bg-white flex items-center justify-center text-[#718078] group-hover:text-[#d87939] group-hover:scale-110 transition-all duration-300 shadow-sm group-hover:shadow-[0_4px_12px_rgba(216,121,57,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4.5 h-4.5 flex-shrink-0"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              </div>
              <span class="text-[13px] tracking-wide">ประวัติการเตือนภัย</span>
            </NuxtLink>
          </nav>
        </div>
      </div>

      <!-- User Profile / Logout -->
      <div class="p-5 mt-auto animate-fade-up delay-300">
        <div class="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[24px] p-2 shadow-[0_8px_20px_rgba(36,67,58,0.03)]">
          <div class="flex items-center gap-3 px-3 py-2.5 mb-1.5 rounded-[18px] bg-gradient-to-br from-[#edf3ed] to-transparent">
            <div class="w-10 h-10 rounded-[14px] bg-[#d87939] text-white flex items-center justify-center font-bold text-sm shadow-[0_4px_12px_rgba(216,121,57,0.25)] flex-shrink-0">
              AD
            </div>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-sm font-extrabold text-[#24433a] truncate">{{ user?.name || 'Administrator' }}</span>
              <span class="text-[10px] font-bold text-[#718078] uppercase tracking-wider truncate">{{ user?.email || 'admin@cowcare.ai' }}</span>
            </div>
          </div>
          
          <button @click="handleLogout" class="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-[16px] text-[#e04f4f] hover:bg-[#e04f4f]/10 hover:text-[#c43a3a] transition-all text-[13px] font-bold group">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 flex-shrink-0 group-hover:-translate-x-1 transition-transform">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </aside>

    <!-- 🌌 Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 h-screen relative z-10">
      
      <!-- Glassmorphic Topbar -->
      <header class="h-24 px-10 flex items-center justify-between flex-shrink-0 animate-fade-down z-30 sticky top-0 bg-[#FDFCF8]/60 backdrop-blur-2xl border-b border-[#24433a]/5">
        <div class="flex items-center gap-4">
          <div class="inline-flex items-center px-3 py-1.5 rounded-full bg-white/80 border border-[#24433a]/10 shadow-sm backdrop-blur-md">
            <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse-soft"></span>
            <span class="text-[11px] font-black tracking-widest text-[#24433a] uppercase">Live Network</span>
          </div>
        </div>

        <div class="flex items-center gap-5">
          <!-- Notification Bell -->
          <button class="relative w-11 h-11 rounded-[16px] bg-white border border-[#24433a]/5 text-[#4e6057] hover:text-[#d87939] hover:shadow-md transition-all flex items-center justify-center hover:-translate-y-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 flex-shrink-0"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            <span class="absolute top-2.5 right-3 w-2.5 h-2.5 bg-[#d87939] rounded-full border-2 border-white"></span>
          </button>

          <!-- Back to Main Site -->
          <NuxtLink to="/" class="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-[16px] bg-white border border-[#24433a]/5 text-[#24433a] font-bold text-xs hover:bg-[#edf3ed] hover:border-[#24433a]/20 hover:-translate-y-0.5 transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 flex-shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            หน้าหลักเว็บไซต์
          </NuxtLink>
        </div>
      </header>

      <!-- Scrollable Page Content -->
      <main class="flex-1 overflow-y-auto px-6 md:px-10 pb-16 pt-8 custom-scrollbar relative z-10">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const user = ref(null)

onMounted(() => {
  if (process.client) {
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

const handleLogout = () => {
  if (process.client) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigateTo('/login')
  }
}
</script>

<style scoped>
/* 🎨 Custom Soft Animations */
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}
.animate-float {
  animation: float 12s ease-in-out infinite;
}
.animate-float-delayed {
  animation: float 15s ease-in-out infinite 2s;
}

@keyframes fadeRight {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}
.animate-fade-right {
  animation: fadeRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-up {
  animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-down {
  animation: fadeDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

@keyframes pulseSoft {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
}
.animate-pulse-soft {
  animation: pulseSoft 2s ease-in-out infinite;
}

@keyframes shine {
  100% { transform: translateX(100%); }
}
.animate-shine {
  animation: shine 1.5s ease-in-out infinite;
}

.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }

/* Custom Scrollbar for a cleaner look */
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
