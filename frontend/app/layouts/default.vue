<template>
  <div class="min-h-screen flex flex-col bg-[#FAF9F5] text-[#142820] font-sans selection:bg-[#D87939]/15 selection:text-[#142820]">
    
    <!-- Floating Modern Navbar -->
    <header 
      class="fixed top-0 inset-x-0 z-50 transition-all duration-300 px-4 sm:px-6 lg:px-8"
      :class="isScrolled ? 'py-3' : 'py-5'">
      <div 
        class="max-w-[1280px] mx-auto flex items-center justify-between transition-all duration-300 rounded-full px-4 sm:px-6"
        :class="isScrolled 
          ? 'h-14 bg-white/85 backdrop-blur-xl border border-[#142820]/8 shadow-[0_8px_30px_rgba(20,40,32,0.06)]' 
          : 'h-16 bg-white/60 backdrop-blur-md border border-[#142820]/5'">
        
        <!-- Brand Logo -->
        <NuxtLink to="/" class="flex items-center gap-3 group text-decoration-none">
          <div class="w-9 h-9 rounded-xl bg-[#142820] flex items-center justify-center shadow-sm group-hover:bg-[#D87939] transition-colors duration-300">
            <img src="/images/logo/logo1.png" alt="CowCare AI" class="h-5 w-auto object-contain brightness-0 invert" />
          </div>
          <div class="flex flex-col">
            <div class="text-[15px] font-extrabold tracking-tight text-[#142820] leading-none">
              CowCare <span class="text-[#D87939]">AI</span>
            </div>
            <span class="text-[9px] font-bold tracking-[0.16em] text-[#6E7E76] uppercase mt-1">
              Heat Stress Intelligence
            </span>
          </div>
        </NuxtLink>

        <!-- Desktop Pill Navigation -->
        <nav class="hidden md:flex items-center gap-1 bg-[#F2F4F2]/80 p-1 rounded-full border border-[#142820]/5" aria-label="Main navigation">
          <a 
            v-for="item in navItems" 
            :key="item.target"
            :href="item.target" 
            @click="scrollToSection($event, item.target)"
            class="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 text-decoration-none"
            :class="activeSection === item.target 
              ? 'bg-white text-[#142820] shadow-sm' 
              : 'text-[#5A6B63] hover:text-[#142820]'">
            {{ item.label }}
          </a>
        </nav>

        <!-- Right CTA Actions -->
        <div class="hidden md:flex items-center gap-2.5">
          <button 
            type="button"
            @click="scrollToSection($event, '#sandbox-card')"
            class="px-4 py-2 rounded-full text-xs font-bold text-[#142820] hover:bg-[#142820]/5 transition-colors cursor-pointer">
            คำนวณ THI
          </button>
          <NuxtLink 
            to="/login" 
            class="px-5 py-2 rounded-full bg-[#142820] hover:bg-[#D87939] text-white text-xs font-bold transition-all duration-300 flex items-center gap-1.5 shadow-sm text-decoration-none group">
            <span>เข้าสู่ระบบ</span>
            <v-icon icon="mdi-arrow-top-right" size="14" class="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </NuxtLink>
        </div>

        <!-- Mobile Menu Button -->
        <button 
          type="button"
          @click="drawer = !drawer"
          class="md:hidden w-9 h-9 rounded-full bg-[#F2F4F2] flex items-center justify-center text-[#142820] hover:bg-[#E5EAE7] transition-colors"
          aria-label="Open menu">
          <v-icon :icon="drawer ? 'mdi-close' : 'mdi-menu'" size="18" />
        </button>
      </div>

      <!-- Clean Dropdown Mobile Menu -->
      <Transition name="fade-slide">
        <div 
          v-if="drawer" 
          class="md:hidden mt-2 max-w-[1280px] mx-auto bg-white/95 backdrop-blur-xl rounded-3xl p-4 border border-[#142820]/10 shadow-xl">
          <nav class="flex flex-col gap-1">
            <a 
              v-for="item in navItems" 
              :key="item.target"
              :href="item.target"
              @click="scrollToSection($event, item.target)"
              class="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold text-[#142820] hover:bg-[#F2F4F2] transition-colors text-decoration-none">
              <span class="flex items-center gap-3">
                <v-icon :icon="item.icon" size="18" class="text-[#D87939]" />
                {{ item.label }}
              </span>
              <v-icon icon="mdi-chevron-right" size="16" class="text-[#8C9B93]" />
            </a>
          </nav>
          <div class="mt-3 pt-3 border-t border-[#142820]/10 flex flex-col gap-2">
            <NuxtLink 
              to="/login" 
              @click="drawer = false"
              class="w-full py-3 rounded-2xl bg-[#142820] text-white text-center text-xs font-bold text-decoration-none">
              เข้าสู่ระบบใช้งาน (Command Center)
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </header>

    <!-- Main Slot -->
    <main class="flex-1">
      <slot />
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const drawer = ref(false)
const isScrolled = ref(false)
const activeSection = ref('#sandbox-card')

const navItems = [
  { label: 'จำลองค่า THI', target: '#sandbox-card', icon: 'mdi-thermometer-lines' },
  { label: 'สถาปัตยกรรม 3 ชั้น', target: '#solution', icon: 'mdi-layers-triple-outline' },
  { label: 'AI พยากรณ์ล่วงหน้า', target: '#lstm', icon: 'mdi-brain' },
  { label: 'งานวิจัยรองรับ', target: '#research', icon: 'mdi-book-open-page-variant-outline' }
]

const handleScroll = () => {
  isScrolled.value = window.scrollY > 24

  const sections = ['#sandbox-card', '#solution', '#lstm', '#research']
  for (const sec of sections) {
    const el = document.querySelector(sec)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= 180 && rect.bottom >= 180) {
        activeSection.value = sec
        break
      }
    }
  }
}

const scrollToSection = (event: MouseEvent, selector: string) => {
  event.preventDefault()
  drawer.value = false
  activeSection.value = selector

  const target = document.querySelector(selector)
  if (!target) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>