<template>
  <v-app-bar class="site-header" elevation="0" height="76">
    <v-container class="d-flex align-center h-100 px-4 px-md-8">
      <NuxtLink to="/" class="brand d-flex align-center text-decoration-none" aria-label="CowCare AI home">
        <!-- <span class="brand-mark"><v-icon icon="mdi-cow" size="24" /></span> -->
        <img src="/images/logo/logo1.png" alt="PH Detection Logo" style="height: 40px; border-radius: 8px;" />
        <span>
          <strong>Detection</strong> <em>System</em>
          <small>HEAT STRESS INTELLIGENCE</small>
        </span>
      </NuxtLink>

      <nav class="desktop-nav ml-auto" aria-label="Main navigation">
        <a href="#solution" @click="scrollToSection($event, '#solution')">ระบบทำงานอย่างไร</a>
        <a href="#lstm" @click="scrollToSection($event, '#lstm')">AI คาดการณ์</a>
        <a href="#research" @click="scrollToSection($event, '#research')">งานวิจัย</a>
        <a href="#solution" @click="scrollToSection($event, '#solution')">Solution</a>
      </nav>

      <v-btn class="header-cta ml-5 d-none d-md-flex" rounded="pill" variant="flat">
        <nuxt-link to="/login" style="text-decoration-line: none;" class="text-white">START <v-icon end icon="mdi-arrow-right" /></nuxt-link>
      </v-btn>

      <v-btn class="d-md-none ml-auto" icon="mdi-menu" variant="text" color="#24433a" aria-label="Open menu" @click="drawer = !drawer" />
    </v-container>
  </v-app-bar>

  <v-navigation-drawer v-model="drawer" location="right" width="300" temporary class="mobile-drawer">
    <div class="pa-6 d-flex align-center justify-space-between">
      <span class="drawer-title">CowCare AI</span>
      <v-btn icon="mdi-close" variant="text" @click="drawer = false" />
    </div>
    <v-divider />
    <nav class="mobile-nav pa-4" aria-label="Mobile navigation">
      <a href="#solution" @click="scrollToSection($event, '#solution')"><v-icon icon="mdi-radar" /> ระบบทำงานอย่างไร</a>
      <a href="#lstm" @click="scrollToSection($event, '#lstm')"><v-icon icon="mdi-chart-timeline-variant" /> AI คาดการณ์</a>
      <a href="#research" @click="scrollToSection($event, '#research')"><v-icon icon="mdi-book-open-variant" /> งานวิจัย</a>
    </nav>
  </v-navigation-drawer>

  <v-main>
    <slot />
  </v-main>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const drawer = ref(false)

const scrollToSection = (event: MouseEvent, selector: string) => {
  event.preventDefault()
  drawer.value = false

  const target = document.querySelector(selector)
  if (!target) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}
</script>

<style scoped>
.site-header {
  background: rgba(255, 253, 247, 0.8) !important;
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(36, 67, 58, 0.08) !important;
}

.brand { color: #24433a; gap: 10px; letter-spacing: -0.04em; }
.brand-mark { display: grid; place-items: center; width: 40px; height: 40px; color: #fffdf7; background: #24433a; border-radius: 13px 13px 13px 4px; }
.brand strong, .brand em { font-size: 1.25rem; font-style: normal; }
.brand em { color: #d87939; margin-left: 2px; }
.brand small { display: block; color: #718078; font-size: 0.53rem; font-weight: 800; letter-spacing: 0.12em; }
.desktop-nav { display: flex; gap: 28px; }
.desktop-nav a { color: #4e6057; font-size: 0.9rem; font-weight: 700; text-decoration: none; transition: color 0.2s ease; }
.desktop-nav a:hover { color: #d87939; }
.header-cta { color: white !important; background: #24433a !important; font-weight: 800; letter-spacing: 0; }
.mobile-drawer { background: #fffdf7 !important; }
.drawer-title { color: #24433a; font-size: 1.2rem; font-weight: 850; }
.mobile-nav { display: grid; gap: 8px; }
.mobile-nav a { display: flex; align-items: center; gap: 12px; padding: 14px; color: #24433a; font-weight: 750; text-decoration: none; border-radius: 12px; }
.mobile-nav a:hover { background: #edf3ed; }

@media (max-width: 960px) { .site-header :deep(.v-container) { max-width: none; } }
</style>
