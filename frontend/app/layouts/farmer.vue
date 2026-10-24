<template>
  <div 
    class="min-h-screen bg-[#F6F8F5] text-[#132A1F] font-sans selection:bg-[#2D6A4F]/20 flex flex-col transition-all duration-200"
    :class="fontSizeClass">

    <!-- แถบด้านบนสุด: ทันสมัย คลีน สบายตา สีเขียวธรรมชาติพรีเมียม -->
    <header class="bg-[#143225] text-white sticky top-0 z-40 border-b border-white/10 shadow-sm backdrop-blur-md">
      <div class="max-w-4xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-3">
        
        <!-- ซ้าย: โลโก้ฟาร์ม + ชื่อโรงเรือน + สถานะกล่องออนไลน์ -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#204E3B] border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
            <v-icon icon="mdi-barn" size="24" class="text-[#B7E4C7]" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-black leading-tight truncate text-white tracking-wide">
                {{ farm?.name || 'CowCare ฟาร์มโคนม' }}
              </h1>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#204E3B] text-[#B7E4C7] shrink-0 border border-white/10">
                <span class="w-1.5 h-1.5 rounded-full bg-[#52B788] animate-pulse"></span>
                <span>ออนไลน์</span>
              </span>
            </div>
            <div class="text-xs sm:text-sm text-[#95D5B2] truncate mt-0.5 font-medium">
              {{ farm?.barn_unit || 'โรงเรือนโคนม' }} · {{ farm?.province || 'ภาคกลาง' }}
            </div>
          </div>
        </div>

        <!-- ขวา: เครื่องมือช่วยเหลือผู้สูงอายุ (ฟังเสียง + ปรับขนาดตัวหนังสือ + ออกจากระบบ) -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- ปุ่มอ่านออกเสียง -->
          <button
            type="button"
            @click="handleVoiceToggle"
            class="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            :class="isSpeaking ? 'bg-[#E07A5F] text-white animate-pulse' : 'bg-[#204E3B] hover:bg-[#2D6A4F] text-white border border-white/15'"
            :title="isSpeaking ? 'กดเพื่อหยุดพูด' : 'กดเพื่อให้ระบบอ่านออกเสียงสรุป'">
            <v-icon :icon="isSpeaking ? 'mdi-volume-high' : 'mdi-volume-medium'" size="18" />
            <span class="hidden sm:inline">{{ isSpeaking ? 'หยุดพูด' : 'ฟังเสียง' }}</span>
          </button>

          <!-- ปุ่มขยายตัวหนังสือ (ก / ก+ / ก++) -->
          <div class="flex items-center bg-[#0D241A] p-1 rounded-xl border border-white/10">
            <button
              v-for="s in fontOptions"
              :key="s.key"
              type="button"
              @click="setFontSize(s.key)"
              class="px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer"
              :class="fontSize === s.key ? 'bg-[#2D6A4F] text-[#F8F9F5] shadow-xs' : 'text-[#8EA89D] hover:text-white'">
              {{ s.label }}
            </button>
          </div>

          <!-- ปุ่มออกจากระบบบน Header -->
          <button
            type="button"
            @click="openLogoutModal"
            class="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#B91C1C]/25 hover:bg-[#B91C1C] text-[#FCA5A5] hover:text-white border border-[#B91C1C]/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="ออกจากระบบ">
            <v-icon icon="mdi-logout" size="17" />
            <span class="inline">ออก</span>
          </button>
        </div>
      </div>

      <!-- สลับฟาร์ม (กรณีเกษตรกรมีหลายฟาร์ม) -->
      <div v-if="farms.length > 1" class="max-w-4xl mx-auto px-4 pb-3">
        <select
          :value="farmId"
          @change="selectFarm($event.target.value)"
          class="w-full sm:w-80 bg-[#0D241A] text-white rounded-xl px-3 py-2 text-sm border border-white/15 outline-none font-bold">
          <option v-for="f in farms" :key="f.id" :value="f.id" class="text-black">{{ f.name }}</option>
        </select>
      </div>

      <!-- แถบแจ้งเตือนอุปกรณ์ (เมื่อเซ็นเซอร์มีปัญหา) -->
      <div v-if="deviceAlert" class="bg-[#B45309] text-white text-xs sm:text-sm font-bold px-4 py-2 border-t border-black/10">
        <div class="max-w-4xl mx-auto flex items-center gap-2">
          <v-icon :icon="deviceAlert.icon" size="18" class="shrink-0" />
          <span>{{ deviceAlert.text }}</span>
        </div>
      </div>
    </header>

    <!-- เนื้อหาหลัก -->
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-5 pb-28 md:pb-12">
      <!-- Loading State -->
      <div v-if="!loaded" class="py-24 text-center space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-white text-[#2D6A4F] mx-auto flex items-center justify-center shadow-xs border border-gray-100">
          <v-icon icon="mdi-loading" class="animate-spin" size="32" />
        </div>
        <p class="text-base font-bold text-[#55695D]">กำลังโหลดข้อมูลฟาร์มของคุณตาคุณยาย...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && !me" class="max-w-md mx-auto py-16 text-center space-y-4">
        <div class="w-16 h-16 rounded-3xl bg-[#FEF2F2] text-[#DC2626] mx-auto flex items-center justify-center border border-[#FECACA]">
          <v-icon icon="mdi-wifi-off" size="36" />
        </div>
        <h2 class="text-lg font-bold text-[#15221B]">{{ error }}</h2>
        <button 
          type="button" 
          @click="refresh" 
          class="w-full h-14 rounded-2xl bg-[#1B4332] text-white font-bold text-base hover:bg-[#2D6A4F] transition-colors cursor-pointer shadow-sm active:scale-98">
          ลองใหม่อีกครั้ง
        </button>
      </div>

      <!-- Unbound Farm State -->
      <div v-else-if="!farm" class="max-w-md mx-auto py-16 text-center space-y-3">
        <div class="w-16 h-16 rounded-3xl bg-[#FEF3C7] text-[#D97706] mx-auto flex items-center justify-center border border-[#FDE68A]">
          <v-icon icon="mdi-barn" size="36" />
        </div>
        <h2 class="text-lg font-bold text-[#15221B]">{{ me?.message || 'ยังไม่พบข้อมูลฟาร์มของคุณ' }}</h2>
        <p class="text-sm text-[#55695D]">กรุณาติดต่อเจ้าหน้าที่สหกรณ์เพื่อลงทะเบียนอุปกรณ์</p>
        <button type="button" @click="openLogoutModal" class="text-sm text-[#DC2626] font-bold underline cursor-pointer pt-2">
          ออกจากระบบ
        </button>
      </div>

      <!-- Slot for Pages -->
      <template v-else>
        <slot />
      </template>
    </main>

    <!-- แถบเมนูด้านล่างสุด: สไตล์ Floating Card ทันสมัย ปุ่มใหญ่ ไม่หลง -->
    <nav class="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E9E5] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] px-3 pt-2 pb-[max(0.7rem,env(safe-area-inset-bottom))]">
      <div class="grid grid-cols-4 gap-2 max-w-lg mx-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all text-decoration-none min-h-[58px] select-none active:scale-95"
          :class="isActive(item.to) 
            ? 'bg-[#EBF6EE] text-[#1B4332] font-black shadow-2xs border border-[#CDE8D5]' 
            : 'text-[#64748B] hover:text-[#15221B] font-semibold border border-transparent'">
          <div class="relative">
            <v-icon :icon="item.icon" size="24" :class="isActive(item.to) ? 'text-[#1B4332]' : 'text-[#64748B]'" />
            <span v-if="item.badge" class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#E07A5F] ring-2 ring-white"></span>
          </div>
          <span class="text-xs leading-none mt-1 tracking-tight text-center">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Modal ยืนยันออกจากระบบสำหรับผู้สูงอายุ (Modern Senior-Friendly Modal) -->
    <div 
      v-if="showLogoutModal" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="w-16 h-16 rounded-full bg-[#FEF2F2] text-[#DC2626] mx-auto flex items-center justify-center shadow-inner border border-[#FECACA]">
          <v-icon icon="mdi-logout-variant" size="32" />
        </div>
        <div class="space-y-1.5">
          <h2 class="text-lg sm:text-xl font-black text-[#15221B]">
            ต้องการออกจากระบบใช่หรือไม่?
          </h2>
          <p class="text-xs sm:text-sm text-[#64748B] leading-relaxed">
            เมื่อออกจากระบบแล้ว ท่านจะต้องกรอกเบอร์โทรหรือรหัสผ่านเพื่อเข้าใช้งานใหม่อีกครั้ง
          </p>
        </div>
        <div class="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            @click="confirmLogout"
            class="w-full h-13 rounded-2xl bg-[#DC2626] hover:bg-[#b91c1c] text-white font-black text-base flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]">
            <v-icon icon="mdi-logout" size="20" />
            <span>ออกจากระบบทันที</span>
          </button>
          <button
            type="button"
            @click="cancelLogout"
            class="w-full h-12 rounded-2xl bg-[#F1F5F9] hover:bg-gray-200 text-[#334155] font-bold text-sm cursor-pointer">
            ยกเลิก (อยู่หน้านี้ต่อ)
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { useFarmer, agoText } from '~/composables/useFarmer'

const route = useRoute()
const {
  me,
  farm,
  now,
  senior,
  isAdmin,
  loaded,
  error,
  farmId,
  fontSize,
  setFontSize,
  isSpeaking,
  speakThai,
  stopSpeech,
  currentBackendUrl,
  showLogoutModal,
  openLogoutModal,
  cancelLogout,
  confirmLogout,
  selectFarm,
  ensureAuth,
  refresh,
  startPolling,
  stopPolling
} = useFarmer()

const farms = computed(() => me.value?.farms || [])

const fontOptions = [
  { key: 'normal', label: 'ก' },
  { key: 'large', label: 'ก+' },
  { key: 'huge', label: 'ก++' }
]

const fontSizeClass = computed(() => {
  if (fontSize.value === 'huge') return 'font-huge'
  if (fontSize.value === 'large') return 'font-large'
  return 'font-normal'
})

const handleVoiceToggle = () => {
  if (isSpeaking.value) {
    stopSpeech()
  } else {
    const textToSpeak = senior.value?.voice_text || 
      `สภาพอากาศในคอกตอนนี้ อุณหภูมิ ${now.value ? Number(now.value.temperature_c).toFixed(1) : 'ปกติ'} องศาเซลเซียส สบายดีจ้า`
    speakThai(textToSpeak)
  }
}

const deviceAlert = computed(() => {
  const dev = me.value?.device
  if (dev?.status === 'sensor_fault') return { icon: 'mdi-thermometer-off', text: 'กล่องออนไลน์ แต่อ่านค่าเซ็นเซอร์ไม่ได้ กรุณาตรวจสายเซ็นเซอร์' }
  if (now.value && now.value.sensor_status === 'offline') return { icon: 'mdi-wifi-off', text: `กล่องไม่ได้ส่งสัญญาณ ${agoText(now.value.minutes_ago)} กรุณาตรวจปลั๊กไฟที่โรงเรือน` }
  return null
})

const navItems = computed(() => [
  { to: '/Farmer', label: 'ตอนนี้', icon: 'mdi-home-heart' },
  { to: '/Farmer/history', label: 'ย้อนหลัง', icon: 'mdi-calendar-week' },
  { to: '/Farmer/alerts', label: 'แจ้งเตือน', icon: 'mdi-bell-outline', badge: ['moderate', 'severe'].includes(now.value?.risk_level) },
  { to: '/Farmer/me', label: 'ฟาร์มฉัน', icon: 'mdi-account-circle-outline' }
])

const isActive = (to) => {
  if (to === '/Farmer') return route.path === '/Farmer' || route.path === '/Farmer/'
  return route.path.startsWith(to)
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

<style>
/* คลาสปรับขนาดตัวอักษรสำหรับผู้สูงอายุ */
.font-normal {
  font-size: 16px;
}
.font-large {
  font-size: 18.5px;
}
.font-large h1 { font-size: 1.45rem !important; }
.font-large h2 { font-size: 1.3rem !important; }
.font-large p, .font-large span, .font-large button { font-size: 1.15rem !important; }

.font-huge {
  font-size: 21px;
}
.font-huge h1 { font-size: 1.7rem !important; }
.font-huge h2 { font-size: 1.5rem !important; }
.font-huge p, .font-huge span, .font-huge button { font-size: 1.35rem !important; }
</style>