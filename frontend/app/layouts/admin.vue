<template>
  <div class="min-h-screen bg-[#F6F7F5] flex font-sans text-[#142820] relative overflow-x-hidden selection:bg-[#D87939]/15 selection:text-[#142820]">

    <!-- Mobile Backdrop Overlay -->
    <Transition name="fade">
      <div 
        v-if="isSidebarOpen && isMobile" 
        @click="isSidebarOpen = false"
        class="fixed inset-0 bg-[#142820]/40 backdrop-blur-xs z-40 lg:hidden">
      </div>
    </Transition>

    <!-- 📌 Sleek Collapsible Sidebar (Full Width or Mini Icon Rail on Desktop) -->
    <aside 
      :class="[
        'h-screen bg-white border-r border-[#E4E8E5] flex flex-col z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0',
        'fixed lg:sticky top-0 left-0',
        isMobile 
          ? (isSidebarOpen ? 'w-[260px] translate-x-0 shadow-2xl' : 'w-[260px] -translate-x-full')
          : (isSidebarOpen ? 'w-[256px]' : 'w-[76px]')
      ]">

      <!-- Brand Header -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-[#E4E8E5] shrink-0">
        <NuxtLink to="/Admin" @click="handleNavClick" class="flex items-center gap-3 overflow-hidden text-decoration-none">
          <div class="w-9 h-9 rounded-xl bg-[#142820] flex items-center justify-center shrink-0 shadow-xs">
            <img src="/images/logo/logo1.png" alt="CowCare AI" class="h-5 w-auto object-contain brightness-0 invert" />
          </div>
          <div v-show="isSidebarOpen || isMobile" class="flex flex-col whitespace-nowrap transition-opacity duration-200">
            <span class="font-extrabold text-sm tracking-tight text-[#142820] leading-none">
              CowCare <span class="text-[#D87939]">AI</span>
            </span>
            <span class="text-[9px] text-[#718078] font-bold tracking-[0.16em] uppercase mt-1">
              ADMIN CONSOLE
            </span>
          </div>
        </NuxtLink>

        <!-- Mobile Close Button -->
        <button 
          v-if="isMobile" 
          @click="isSidebarOpen = false"
          class="w-8 h-8 rounded-lg text-[#5A6B63] hover:bg-[#F2F4F2] flex items-center justify-center">
          <v-icon icon="mdi-close" size="18" />
        </button>
      </div>

      <!-- Navigation List -->
      <div class="flex-1 py-5 px-3 space-y-6 overflow-y-auto custom-scrollbar">
        
        <div v-for="group in navGroups" :key="group.title">
          <p 
            v-show="isSidebarOpen || isMobile" 
            class="px-3 text-[10px] font-bold text-[#84948C] uppercase tracking-[0.15em] mb-2">
            {{ group.title }}
          </p>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              @click="handleNavClick"
              :title="!isSidebarOpen && !isMobile ? item.label : ''"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 text-decoration-none relative group"
              :class="isActiveRoute(item.to)
                ? 'bg-[#142820] text-white shadow-xs'
                : 'text-[#52635B] hover:bg-[#F2F4F2] hover:text-[#142820]'">
              
              <!-- Active Left Pill Indicator -->
              <span 
                v-if="isActiveRoute(item.to)"
                class="w-1 h-4 rounded-full bg-[#D87939] absolute left-1">
              </span>

              <v-icon 
                :icon="item.icon" 
                size="19" 
                class="shrink-0 mx-auto lg:mx-0"
                :class="isActiveRoute(item.to) ? 'text-[#F2BD7C]' : 'text-[#718078] group-hover:text-[#142820]'" 
              />
              
              <span v-show="isSidebarOpen || isMobile" class="truncate flex-1">
                {{ item.label }}
              </span>
            </NuxtLink>
          </div>
        </div>

      </div>

      <!-- User Profile & Clean Logout Footer -->
      <div class="p-3 border-t border-[#E4E8E5] shrink-0">
        <div 
          class="flex items-center gap-2.5 p-2 rounded-xl bg-[#F6F7F5] border border-[#E4E8E5]/80"
          :class="!isSidebarOpen && !isMobile ? 'justify-center' : ''">
          
          <div class="w-8 h-8 rounded-lg bg-[#D87939] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {{ userInitials }}
          </div>

          <div v-show="isSidebarOpen || isMobile" class="min-w-0 flex-1">
            <div class="text-xs font-extrabold text-[#142820] truncate">{{ user?.name || 'Administrator' }}</div>
            <div class="text-[10px] text-[#718078] truncate">{{ user?.email || 'admin@cowcare.ai' }}</div>
          </div>

          <button 
            v-show="isSidebarOpen || isMobile"
            type="button"
            @click="showLogoutConfirm = true"
            title="ออกจากระบบ"
            class="w-8 h-8 rounded-lg text-[#718078] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0">
            <v-icon icon="mdi-logout-variant" size="17" />
          </button>
        </div>
      </div>

    </aside>

    <!-- 🌌 Main Content Workspace -->
    <div class="flex-1 flex flex-col min-w-0 h-screen">
      
      <!-- Crisp Sticky Topbar (h-16) -->
      <header class="h-16 px-4 sm:px-8 bg-white/85 backdrop-blur-md border-b border-[#E4E8E5] flex items-center justify-between sticky top-0 z-30 shrink-0">
        
        <!-- Left: Sidebar Toggle & Dynamic Page Breadcrumb -->
        <div class="flex items-center gap-3">
          <button 
            type="button" 
            @click="toggleSidebar"
            class="w-9 h-9 rounded-xl border border-[#E4E8E5] bg-white hover:bg-[#F2F4F2] text-[#142820] flex items-center justify-center transition-colors cursor-pointer"
            :title="isSidebarOpen ? 'ย่อเมนูด้านข้าง' : 'ขยายเมนูด้านข้าง'">
            <v-icon :icon="isSidebarOpen ? 'mdi-menu-open' : 'mdi-menu'" size="19" />
          </button>

          <div class="h-4 w-[1px] bg-[#E4E8E5] hidden sm:block"></div>

          <div class="flex items-center gap-2 text-xs sm:text-sm">
            <span class="text-[#718078] font-medium hidden sm:inline">Admin Console</span>
            <v-icon icon="mdi-chevron-right" size="15" class="text-[#84948C] hidden sm:inline" />
            <span class="font-extrabold text-[#142820]">{{ currentPageTitle }}</span>
          </div>
        </div>

        <!-- Right: Status Pill & Main Website Link -->
        <div class="flex items-center gap-2.5">
          <!-- Telemetry Status Pill -->
          <div class="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[11px] font-bold">
            <span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>IoT Network Online</span>
          </div>

          <!-- Back to Front Website -->
          <NuxtLink 
            to="/Admin"
            class="px-3.5 py-1.5 rounded-xl border border-[#E4E8E5] bg-white hover:bg-[#F2F4F2] text-[#142820] font-bold text-xs flex items-center gap-1.5 transition-colors text-decoration-none">
            <v-icon icon="mdi-web" size="15" class="text-[#D87939]" />
            <span class="hidden sm:inline">หน้าเว็บหลัก</span>
          </NuxtLink>
        </div>

      </header>

      <!-- Scrollable Viewport -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
        <div class="max-w-[1400px] mx-auto">
          <slot />
        </div>
      </main>

    </div>

    <!-- Clean Non-blocking Logout Confirmation Modal -->
    <Transition name="fade">
      <div v-if="showLogoutConfirm" class="fixed inset-0 z-50 bg-[#142820]/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#E4E8E5] shadow-2xl space-y-4">
          <div class="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <v-icon icon="mdi-logout-variant" size="22" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-[#142820]">ยืนยันการออกจากระบบ</h3>
            <p class="text-xs text-[#5A6B63] mt-1">ท่านต้องการออกจากระบบ CowCare AI Admin Console ใช่หรือไม่?</p>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button 
              type="button" 
              @click="showLogoutConfirm = false"
              class="px-4 py-2 rounded-xl text-xs font-bold text-[#52635B] hover:bg-[#F2F4F2] cursor-pointer">
              ยกเลิก
            </button>
            <button 
              type="button" 
              @click="confirmLogout"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const user = ref(null)
const isSidebarOpen = ref(true)
const isMobile = ref(false)
const showLogoutConfirm = ref(false)

const navGroups = [
  {
    title: 'Monitoring',
    items: [
      { label: 'ภาพรวมระบบ (Dashboard)', to: '/Admin', icon: 'mdi-view-dashboard-outline' },
      { label: 'ข้อมูลฟาร์ม (Farms)', to: '/Admin/farms', icon: 'mdi-barn' }
    ]
  },
  {
    title: 'Administration',
    items: [
      { label: 'สมาชิกเกษตรกร (Users)', to: '/Admin/users', icon: 'mdi-account-group-outline' },
      { label: 'อุปกรณ์ IoT (Devices)', to: '/Admin/devices', icon: 'mdi-memory' },
      { label: 'ประวัติแจ้งเตือน (Alerts)', to: '/Admin/alerts', icon: 'mdi-bell-outline' }
    ]
  }
]

const isActiveRoute = (targetPath) => {
  if (targetPath === '/Admin') {
    return route.path === '/Admin' || route.path === '/Admin/'
  }
  return route.path.startsWith(targetPath)
}

const currentPageTitle = computed(() => {
  const path = route.path
  if (path === '/Admin' || path === '/Admin/') return 'ภาพรวมระบบ (Command Center)'
  if (path === '/Admin/farms' || path === '/Admin/farms/') return 'จัดการข้อมูลฟาร์ม (Farm Roster)'
  if (path.startsWith('/Admin/farms/') || path.includes('/Admin/farm_detail')) return 'ข้อมูลโทรมาตรรายฟาร์ม (Barn Cockpit)'
  if (path.includes('/Admin/users')) return 'จัดการสมาชิก (User Management)'
  if (path.includes('/Admin/devices')) return 'จัดการอุปกรณ์ IoT (Devices)'
  if (path.includes('/Admin/alerts')) return 'ประวัติการแจ้งเตือน (Thermal Alerts)'
  return 'ระบบผู้ดูแล (Admin)'
})

const userInitials = computed(() => {
  const name = user.value?.name || 'AD'
  return name.slice(0, 2).toUpperCase()
})

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const handleNavClick = () => {
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

const checkScreen = () => {
  if (import.meta.client) {
    const mobile = window.innerWidth < 1024
    isMobile.value = mobile
    if (mobile && isSidebarOpen.value) {
      isSidebarOpen.value = false
    } else if (!mobile && !isSidebarOpen.value) {
      isSidebarOpen.value = true
    }
  }
}

onMounted(() => {
  if (import.meta.client) {
    checkScreen()
    window.addEventListener('resize', checkScreen)

    try {
      const token = localStorage.getItem('token')
      const stored = localStorage.getItem('user')

      if (!token || !stored) {
        return navigateTo('/login')
      }

      const parsedUser = JSON.parse(stored)
      user.value = parsedUser

      if (parsedUser.role !== 'admin') {
        return navigateTo('/login')
      }
    } catch (e) {
      console.error('[Admin Guard Error]:', e)
      return navigateTo('/login')
    }
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', checkScreen)
  }
})

const confirmLogout = () => {
  if (import.meta.client) {
    showLogoutConfirm.value = false
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigateTo('/')
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(20, 40, 32, 0.12);
  border-radius: 10px;
}
</style>