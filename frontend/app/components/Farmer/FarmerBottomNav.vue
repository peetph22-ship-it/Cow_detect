<template>
  <!-- ======================================================================= -->
  <!-- 1. แถบนำทางด้านซ้าย (สไลด์เปิด-ปิดได้ทั้งบนคอมและมือถือ)                 -->
  <!-- ======================================================================= -->
  <aside
    v-if="variant === 'sidebar'"
    :class="[
      'h-screen bg-[#142820] text-[#FFFDF7] flex flex-col z-50 shrink-0 select-none overflow-hidden',
      'fixed lg:relative top-0 left-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
      open
        ? 'w-[276px] translate-x-0 shadow-2xl lg:shadow-none border-r border-white/10'
        : 'w-[276px] -translate-x-full lg:w-0 lg:-translate-x-full border-r-0'
    ]">
    <div class="w-[276px] h-full flex flex-col">
      <!-- โลโก้แบรนด์ CowCare AI + ปุ่มพับเก็บ Sidebar -->
      <div class="h-16 sm:h-[68px] px-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <NuxtLink to="/Farmer" @click="$emit('nav-click')" class="flex items-center gap-3 text-decoration-none">
          <div class="w-9 h-9 rounded-xl bg-[#D87939] flex items-center justify-center shadow-sm shrink-0">
            <img src="/images/logo/logo1.png" alt="CowCare AI" class="h-5 w-auto object-contain brightness-0 invert" />
          </div>
          <div class="flex flex-col">
            <span class="font-black text-base tracking-tight text-white leading-none">
              CowCare <span class="text-[#F3C68F]">AI</span>
            </span>
            <span class="text-[9px] text-[#9BB5AA] font-extrabold tracking-[0.14em] uppercase mt-1">
              FARMER PORTAL
            </span>
          </div>
        </NuxtLink>

        <!-- ปุ่มสไลด์ปิด Sidebar -->
        <button
          type="button"
          @click="$emit('close')"
          title="พับเก็บแถบเมนู"
          class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors">
          <v-icon icon="mdi-chevron-left" size="20" />
        </button>
      </div>

      <!-- บัตรฟาร์มที่กำลังดูอยู่ใน Sidebar -->
      <div class="p-4 border-b border-white/10 shrink-0">
        <div class="p-3.5 rounded-2xl bg-[#1E3A2F] border border-white/10 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#F3C68F]">
              โรงเรือนที่กำลังดูแล
            </span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold"
              :class="now?.sensor_status === 'online'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="now?.sensor_status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
              {{ now?.sensor_status === 'online' ? 'ออนไลน์' : 'ออฟไลน์' }}
            </span>
          </div>

          <!-- กรณีมีหลายฟาร์ม -->
          <div v-if="farms.length > 1" class="relative">
            <select
              :value="farm?.id"
              @change="onSelectFarm($event)"
              aria-label="เลือกฟาร์ม"
              class="w-full appearance-none bg-[#142820] hover:bg-[#193228] text-white font-black text-sm rounded-xl pl-3 pr-8 py-2 border border-white/15 focus:outline-none focus:border-[#F3C68F] cursor-pointer truncate">
              <option v-for="f in farms" :key="f.id" :value="f.id" class="bg-[#142820] text-white">
                {{ f.name }}
              </option>
            </select>
            <v-icon
              icon="mdi-chevron-down"
              size="18"
              class="text-[#F3C68F] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <div v-else class="text-sm font-black text-white truncate">
            {{ farm?.name || 'ฟาร์มโคนม' }}
          </div>

          <div class="text-[11px] text-[#B8CEC4] font-medium flex items-center gap-1.5 truncate">
            <v-icon icon="mdi-map-marker-outline" size="13" class="text-[#F3C68F] shrink-0" />
            <span class="truncate">{{ farm?.barn_unit || 'โรงเรือนหลัก' }}{{ farm?.province ? ` · จ.${farm.province}` : '' }}</span>
          </div>
        </div>
      </div>

      <!-- รายการเมนูหลัก -->
      <div class="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div class="px-3 pb-1 text-[10px] font-extrabold text-[#8AA69B] uppercase tracking-[0.15em]">
          เมนูจัดการฟาร์ม
        </div>

        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          @click="$emit('nav-click')"
          class="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-extrabold transition-all text-decoration-none relative group"
          :class="isActive(item.to)
            ? 'bg-[#D87939] text-white shadow-md'
            : 'text-[#CBE0D7] hover:bg-white/8 hover:text-white'">
          <div class="flex items-center gap-3 min-w-0">
            <v-icon
              :icon="item.icon"
              size="20"
              :class="isActive(item.to) ? 'text-white' : 'text-[#F3C68F]'" />
            <div class="min-w-0">
              <div class="leading-tight truncate">{{ item.label }}</div>
              <div
                class="text-[10px] font-medium truncate mt-0.5"
                :class="isActive(item.to) ? 'text-white/85' : 'text-[#8AA69B]'">
                {{ item.desc }}
              </div>
            </div>
          </div>

          <span
            v-if="item.badge"
            class="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#DC2626] text-white ring-2 ring-white/30">
            !
          </span>
        </NuxtLink>

        <!-- การ์ดโทรด่วนหาสัตวแพทย์ใน Sidebar (เมื่อมีเบอร์จริง) -->
        <div v-if="vetPhoneClean" class="pt-3 px-1">
          <a
            :href="`tel:${vetPhoneClean}`"
            class="p-3 rounded-2xl bg-gradient-to-br from-[#D87939] to-[#B85D23] text-white flex items-center gap-3 text-decoration-none shadow-md hover:brightness-105 transition-all">
            <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <v-icon icon="mdi-phone-in-talk" size="20" />
            </div>
            <div class="min-w-0">
              <div class="text-[10px] font-bold text-orange-100">สายด่วนสัตวแพทย์</div>
              <div class="text-xs font-black truncate">{{ farm?.vet_phone }}</div>
            </div>
          </a>
        </div>
      </div>

      <!-- ส่วนท้าย Sidebar: ข้อมูลผู้ใช้ + ปุ่มกลับแอดมิน + ออกจากระบบ -->
      <div class="p-3.5 border-t border-white/10 space-y-2 shrink-0 bg-[#10201A]">
        <NuxtLink
          v-if="isAdmin"
          to="/Admin"
          class="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-extrabold text-[#F3C68F] flex items-center justify-center gap-2 text-decoration-none transition-colors">
          <v-icon icon="mdi-shield-account-outline" size="16" />
          <span>สลับไปหน้าแอดมิน</span>
        </NuxtLink>

        <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-[#24433A] text-[#F3C68F] font-black text-xs flex items-center justify-center shrink-0 border border-white/15">
              {{ userInitial }}
            </div>
            <div class="min-w-0">
              <div class="text-xs font-extrabold text-white truncate">{{ userName }}</div>
              <div class="text-[10px] text-[#9BB5AA] truncate">{{ isAdmin ? 'ผู้ดูแลระบบ' : 'เกษตรกรโคนม' }}</div>
            </div>
          </div>

          <button
            type="button"
            @click="openLogoutModal"
            title="ออกจากระบบ"
            class="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer shrink-0">
            <v-icon icon="mdi-logout" size="14" />
            <span>ออก</span>
          </button>
        </div>
      </div>
    </div>
  </aside>

  <!-- ======================================================================= -->
  <!-- 2. แถบนำทางลอยตัวด้านล่างสำหรับมือถือ (Floating Mobile Bottom Dock)    -->
  <!-- ======================================================================= -->
  <nav
    v-else
    aria-label="เมนูด้านล่างเกษตรกร"
    class="lg:hidden fixed bottom-3 inset-x-3 z-40 bg-[#142820]/95 backdrop-blur-xl rounded-3xl border border-white/15 shadow-[0_12px_32px_rgba(20,40,32,0.35)] p-1.5">
    <div class="grid grid-cols-4 gap-1 max-w-md mx-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all text-decoration-none min-h-[52px] select-none"
        :class="isActive(item.to)
          ? 'bg-[#D87939] text-white font-black shadow-sm'
          : 'text-[#B8CEC4] hover:text-white font-bold'">
        <div class="relative">
          <v-icon
            :icon="item.icon"
            size="21"
            :class="isActive(item.to) ? 'text-white' : 'text-[#F3C68F]'" />
          <span
            v-if="item.badge"
            class="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] ring-2 ring-[#142820]"></span>
        </div>
        <span class="text-[11px] leading-tight mt-1 tracking-tight text-center">
          {{ item.shortLabel }}
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
    default: 'sidebar' // 'sidebar' | 'mobile'
  },
  open: {
    type: Boolean,
    default: true
  },
  isMobile: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close', 'nav-click'])

const route = useRoute()
const { now, me, farm, farms, user, isAdmin, selectFarm, openLogoutModal } = useFarmer()

const userName = computed(() => user.value?.name_users || user.value?.full_name || user.value?.name || user.value?.email || 'เกษตรกร')
const userInitial = computed(() => String(userName.value).trim().charAt(0).toUpperCase() || 'ก')

const vetPhoneClean = computed(() => (farm.value?.vet_phone || '').replace(/[^0-9+]/g, ''))

const hasUrgentAlert = computed(() => {
  const risk = now.value?.risk_level
  const sensorOff = now.value?.sensor_status === 'offline' || me.value?.device?.status === 'sensor_fault'
  return ['moderate', 'severe'].includes(risk) || sensorOff
})

const navItems = computed(() => [
  {
    to: '/Farmer',
    label: 'ภาพรวมคอกวันนี้',
    shortLabel: 'วันนี้',
    desc: 'อุณหภูมิ คำแนะนำ พยากรณ์ล่วงหน้า',
    icon: 'mdi-view-dashboard-outline'
  },
  {
    to: '/Farmer/history',
    label: 'ประวัติย้อนหลัง 7 วัน',
    shortLabel: 'ย้อนหลัง',
    desc: 'สรุปวันร้อนและการพักกลางคืน',
    icon: 'mdi-calendar-week'
  },
  {
    to: '/Farmer/alerts',
    label: 'ศูนย์แจ้งเตือน',
    shortLabel: 'แจ้งเตือน',
    desc: 'เหตุการณ์ความร้อนและสัญญาณ',
    icon: 'mdi-bell-ring-outline',
    badge: hasUrgentAlert.value
  },
  {
    to: '/Farmer/me',
    label: 'ข้อมูลฟาร์ม & ตั้งค่า',
    shortLabel: 'ฟาร์มฉัน',
    desc: 'สลับฟาร์ม ข้อมูลโรงเรือน คู่มือสี',
    icon: 'mdi-barn'
  }
])

const onSelectFarm = (event) => {
  const targetId = event.target?.value
  if (targetId) selectFarm(targetId)
}

const isActive = (to) => {
  if (to === '/Farmer') return route.path === '/Farmer' || route.path === '/Farmer/'
  return route.path.startsWith(to)
}
</script>
