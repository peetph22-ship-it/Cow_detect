<template>
  <!-- แถบเมนูบนจอแท็บเล็ตและคอมพิวเตอร์ (Desktop Sub-nav) -->
  <nav
    v-if="variant === 'desktop'"
    aria-label="เมนูหลักเกษตรกร"
    class="hidden md:block bg-[#F4EFE4] border-b border-[#E6DEC8]">
    <div class="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="px-4 py-2.5 rounded-2xl font-extrabold text-sm flex items-center gap-2 transition-all text-decoration-none select-none"
          :class="isActive(item.to)
            ? 'bg-[#1B342D] text-[#FFFDF7] shadow-xs'
            : 'text-[#3A5248] hover:bg-[#E8E0CE] hover:text-[#1B342D]'">
          <div class="relative flex items-center">
            <v-icon :icon="item.icon" size="20" />
            <span
              v-if="item.badge"
              class=" -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-[#DC2626] ring-2 ring-white absolute"></span>
          </div>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>

      <button
        type="button"
        @click="openLogoutModal"
        class="px-3.5 py-2 rounded-xl text-xs font-extrabold text-[#991B1B] hover:bg-[#FEE2E2] flex items-center gap-1.5 transition-colors cursor-pointer">
        <v-icon icon="mdi-logout" size="17" />
        <span>ออกจากระบบ</span>
      </button>
    </div>
  </nav>

  <!-- แถบเมนูด้านล่างสำหรับมือถือ (แตะง่ายด้วยนิ้วโป้ง) -->
  <nav
    v-else
    aria-label="เมนูด้านล่างเกษตรกร"
    class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFDF7]/95 backdrop-blur-md border-t border-[#E6DEC8] shadow-[0_-6px_24px_rgba(27,52,45,0.08)] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
    <div class="grid grid-cols-4 gap-1.5 max-w-lg mx-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all text-decoration-none min-h-[58px] select-none"
        :class="isActive(item.to)
          ? 'bg-[#1B342D] text-[#FFFDF7] font-black shadow-xs'
          : 'text-[#4E655B] hover:text-[#1B342D] font-bold'">
        <div class="relative">
          <v-icon
            :icon="item.icon"
            size="24"
            :class="isActive(item.to) ? 'text-[#F3C68F]' : 'text-[#4E655B]'" />
          <span
            v-if="item.badge"
            class="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-[#DC2626] ring-2 ring-[#FFFDF7]"></span>
        </div>
        <span class="text-xs leading-tight mt-1 tracking-tight text-center">
          {{ item.shortLabel || item.label }}
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

defineProps({
  variant: {
    type: String,
    default: 'mobile' // 'mobile' | 'desktop'
  }
})

const route = useRoute()
const { now, me, openLogoutModal } = useFarmer()

const hasUrgentAlert = computed(() => {
  const risk = now.value?.risk_level
  const sensorOff = now.value?.sensor_status === 'offline' || me.value?.device?.status === 'sensor_fault'
  return ['moderate', 'severe'].includes(risk) || sensorOff
})

const navItems = computed(() => [
  {
    to: '/Farmer',
    label: 'หน้าแรก (ตอนนี้)',
    shortLabel: 'ตอนนี้',
    icon: 'mdi-barn'
  },
  {
    to: '/Farmer/history',
    label: 'ย้อนหลัง 7 วัน',
    shortLabel: 'ย้อนหลัง',
    icon: 'mdi-calendar-week'
  },
  {
    to: '/Farmer/alerts',
    label: 'แจ้งเตือน',
    shortLabel: 'แจ้งเตือน',
    icon: 'mdi-bell-ring-outline',
    badge: hasUrgentAlert.value
  },
  {
    to: '/Farmer/me',
    label: 'ฟาร์มและตั้งค่า',
    shortLabel: 'ฟาร์มฉัน',
    icon: 'mdi-cog-outline'
  }
])

const isActive = (to) => {
  if (to === '/Farmer') return route.path === '/Farmer' || route.path === '/Farmer/'
  return route.path.startsWith(to)
}
</script>
