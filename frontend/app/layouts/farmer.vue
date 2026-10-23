<template>
  <div class="min-h-screen bg-[#F6F7F5] text-[#142820] font-sans selection:bg-[#D87939]/20">

    <!-- หัวหน้าจอ: เขียวเข้มต่อเนื่องกับส่วนบนของแต่ละหน้า -->
    <header class="bg-[#142820] text-white sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-[#D87939] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-barn" size="20" />
          </div>
          <div class="min-w-0">
            <div class="text-[15px] font-bold leading-tight truncate">{{ farm?.name || 'CowCare AI' }}</div>
            <div class="text-xs text-[#9FB5AA] truncate">{{ farm?.barn_unit || 'สำหรับเกษตรกร' }}</div>
          </div>
        </div>

        <!-- แท็บบนจอใหญ่ -->
        <nav class="hidden md:flex items-center gap-1 bg-[#1c362d] rounded-2xl p-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors text-decoration-none"
            :class="isActive(item.to) ? 'bg-[#24433a] text-[#F2BD7C]' : 'text-[#9FB5AA] hover:text-white'">
            <v-icon :icon="item.icon" size="18" />
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-2 shrink-0">
          <span
            v-if="now"
            class="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
            :class="now.sensor_status === 'online' ? 'bg-[#24433a] text-[#97C459]' : 'bg-[#4a3a1f] text-[#F2BD7C]'">
            <span class="w-1.5 h-1.5 rounded-full" :class="now.sensor_status === 'online' ? 'bg-[#97C459]' : 'bg-[#F2BD7C]'"></span>
            {{ now.sensor_status === 'online' ? 'ออนไลน์' : 'ขาดการติดต่อ' }}
          </span>
          <NuxtLink
            v-if="isAdmin"
            to="/Admin"
            class="hidden sm:inline-flex text-xs font-semibold text-[#9FB5AA] hover:text-white px-2.5 py-1 rounded-full bg-[#1c362d] text-decoration-none">
            แอดมิน
          </NuxtLink>
        </div>
      </div>

      <!-- หลายฟาร์ม -->
      <div v-if="farms.length > 1" class="max-w-5xl mx-auto px-4 pb-3">
        <select
          :value="farmId"
          @change="selectFarm($event.target.value)"
          class="w-full md:w-72 bg-[#1c362d] text-white rounded-xl px-3 py-2 text-sm border border-[#24433a] outline-none">
          <option v-for="f in farms" :key="f.id" :value="f.id" class="text-black">{{ f.name }}</option>
        </select>
      </div>
    </header>

    <main class="pb-28 md:pb-12">
      <!-- สถานะที่ใช้ร่วมทุกหน้า -->
      <div v-if="!loaded" class="max-w-5xl mx-auto px-4 py-16 text-center text-[#718078]">
        <v-icon icon="mdi-loading" class="animate-spin" size="28" />
        <p class="mt-2 text-sm">กำลังโหลดข้อมูลฟาร์ม...</p>
      </div>
      <div v-else-if="error && !me" class="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <v-icon icon="mdi-wifi-off" size="36" class="text-[#718078]" />
        <p class="text-[15px]">{{ error }}</p>
        <button type="button" @click="refresh" class="px-5 py-2.5 rounded-xl bg-[#142820] text-white text-sm font-semibold cursor-pointer">ลองใหม่</button>
      </div>
      <div v-else-if="!farm" class="max-w-md mx-auto px-4 py-16 text-center space-y-2">
        <v-icon icon="mdi-barn" size="40" class="text-[#718078]" />
        <p class="text-[15px] font-semibold">{{ me?.message || 'บัญชีนี้ยังไม่ได้ผูกกับฟาร์ม' }}</p>
        <button type="button" @click="logout" class="text-sm text-[#718078] underline cursor-pointer">ออกจากระบบ</button>
      </div>
      <template v-else>
        <div v-if="now && now.sensor_status === 'offline'" class="bg-[#4a3a1f] text-[#F7DDB2]">
          <div class="max-w-5xl mx-auto px-4 py-2.5 text-sm flex items-center gap-2">
            <v-icon icon="mdi-alert-outline" size="18" />
            กล่องเซ็นเซอร์ไม่ได้ส่งข้อมูลมา {{ agoText(now.minutes_ago) }} · ตรวจไฟและอินเทอร์เน็ตที่โรงเรือน
          </div>
        </div>
        <slot />
      </template>
    </main>

    <!-- แถบเมนูล่าง (มือถือ) -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#142820] px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div class="grid grid-cols-4 gap-1.5 max-w-md mx-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl text-[11px] font-semibold transition-colors text-decoration-none"
          :class="isActive(item.to) ? 'bg-[#24433a] text-[#F2BD7C]' : 'text-[#9FB5AA]'">
          <v-icon :icon="item.icon" size="22" />
          {{ item.label }}
          <span v-if="item.badge" class="absolute top-1.5 right-[calc(50%-18px)] w-2 h-2 rounded-full bg-[#D87939]"></span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { useFarmer, agoText } from '~/composables/useFarmer'

const route = useRoute()
const { me, farm, now, isAdmin, loaded, error, farmId, ensureAuth, refresh, selectFarm, logout, startPolling, stopPolling } = useFarmer()

const farms = computed(() => me.value?.farms || [])

const navItems = computed(() => [
  { to: '/Farmer', label: 'ตอนนี้', icon: 'mdi-home-variant-outline' },
  { to: '/Farmer/history', label: 'ย้อนหลัง', icon: 'mdi-chart-bar' },
  // จุดส้มที่เมนูแจ้งเตือน: ตอนนี้วัวเครียดหรือวิกฤต
  { to: '/Farmer/alerts', label: 'แจ้งเตือน', icon: 'mdi-bell-outline', badge: ['moderate', 'severe'].includes(now.value?.risk_level) },
  { to: '/Farmer/me', label: 'ฉัน', icon: 'mdi-account-outline' }
])

const isActive = (to) => (to === '/Farmer' ? route.path === '/Farmer' || route.path === '/Farmer/' : route.path.startsWith(to))

onMounted(() => {
  if (!ensureAuth()) return
  if (!me.value) refresh()
  startPolling()
})

onUnmounted(stopPolling)
</script>
