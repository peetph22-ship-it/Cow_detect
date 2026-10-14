<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up delay-100">

    <!-- 🟢 Card 1: Total Farms in Network -->
    <div 
      class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group relative overflow-hidden">
      <div class="flex items-center justify-between mb-5">
        <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ฟาร์มในเครือข่าย</span>
        <div class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-700 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm">
          <v-icon icon="mdi-barn" size="24" />
        </div>
      </div>
      <div>
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-[40px] font-black text-[#24433a] leading-none">
            {{ farmsCount }}
          </span>
          <span class="text-[14px] font-bold text-[#718078]">ฟาร์ม</span>
        </div>
        <div class="flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 w-fit px-2.5 py-1 rounded-[8px]">
          <v-icon icon="mdi-trending-up" size="14" class="mr-1" />
          <span>{{ stats?.farms?.growth || '+1 ฟาร์มใหม่เดือนนี้' }}</span>
        </div>
      </div>
    </div>

    <!-- 🟢 Card 2: IoT Device Online Rate -->
    <div 
      class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group relative overflow-hidden">
      <div class="flex items-center justify-between mb-5">
        <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">อัตราการออนไลน์ IoT</span>
        <div class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-sky-50 to-blue-100/60 text-sky-700 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm">
          <v-icon icon="mdi-router-wireless" size="24" />
        </div>
      </div>
      <div>
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-[40px] font-black text-[#24433a] leading-none">
            {{ onlineRate }}
          </span>
          <span class="text-[20px] font-black text-[#24433a]">%</span>
        </div>

        <!-- Progress Bar for Online / Offline -->
        <div class="w-full bg-[#f0f4f2] h-2 rounded-full overflow-hidden mb-2">
          <div 
            class="bg-emerald-500 h-full rounded-full transition-all duration-700" 
            :style="{ width: `${onlineRate}%` }">
          </div>
        </div>

        <div class="flex items-center justify-between text-[11px] font-bold text-[#718078]">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :class="onlineDevices > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'"></span>
            ออนไลน์ {{ onlineDevices }} / {{ totalDevices }} เครื่อง
          </span>
          <span v-if="offlineDevices > 0" class="text-rose-600 font-bold">
            ออฟไลน์ {{ offlineDevices }}
          </span>
        </div>
      </div>
    </div>

    <!-- 🟢 Card 3: Network Average THI -->
    <div 
      class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group relative overflow-hidden">
      <div class="flex items-center justify-between mb-5">
        <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ค่า THI เฉลี่ยเครือข่าย</span>
        <div class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-amber-50 to-orange-100/60 text-[#d87939] flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-sm">
          <v-icon icon="mdi-thermometer-alert" size="24" />
        </div>
      </div>
      <div>
        <div class="flex items-baseline gap-1.5 mb-2">
          <span class="text-[40px] font-black text-[#24433a] leading-none">
            {{ avgThi.toFixed(1) }}
          </span>
          <span class="text-[14px] font-black text-[#718078]">THI</span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <span 
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-bold border"
            :class="thiBadgeClass">
            <span class="w-1.5 h-1.5 rounded-full" :class="thiDotClass"></span>
            {{ stats?.thi?.status || 'เฝ้าระวัง (Mild)' }}
          </span>
          <span class="text-[11px] text-[#718078] font-medium">
            {{ avgTemp }}°C • {{ avgHum }}%
          </span>
        </div>
      </div>
    </div>

    <!-- 🟢 Card 4: Active Thermal Alerts -->
    <div 
      class="bg-gradient-to-br from-[#d87939] to-[#bf6428] rounded-[28px] p-6 text-white shadow-[0_10px_30px_rgba(216,121,57,0.25)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(216,121,57,0.35)] transition-all duration-500 flex flex-col justify-between relative overflow-hidden group">
      <!-- Glow ambient orb -->
      <div class="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

      <div class="flex items-center justify-between mb-5 relative z-10">
        <span class="text-[11px] font-black text-orange-100 uppercase tracking-[0.1em]">การแจ้งเตือนความร้อน</span>
        <div class="w-12 h-12 rounded-[16px] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm">
          <v-icon icon="mdi-bell-ring-outline" size="24" class="text-white" />
        </div>
      </div>

      <div class="relative z-10">
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-[40px] font-black leading-none text-white">
            {{ activeAlertsCount }}
          </span>
          <span class="text-[14px] font-bold text-orange-100">รายการวิกฤต</span>
        </div>

        <div class="flex items-center text-[12px] font-bold text-[#d87939] bg-white w-fit px-2.5 py-1 rounded-[8px] shadow-sm">
          <v-icon icon="mdi-clock-outline" size="14" class="mr-1 text-[#d87939]" />
          <span>{{ pendingAckCount }} รายการรอรับทราบ</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Computed KPIs from Real Stats
const farmsCount = computed(() => {
  return props.stats?.farms?.total ?? 4
})

const totalDevices = computed(() => {
  return props.stats?.devices?.total ?? 1
})

const onlineDevices = computed(() => {
  return props.stats?.devices?.online ?? 1
})

const offlineDevices = computed(() => {
  return props.stats?.devices?.offline ?? 0
})

const onlineRate = computed(() => {
  return props.stats?.devices?.online_rate ?? 100
})

const avgThi = computed(() => {
  return Number(props.stats?.thi?.average ?? 78.5)
})

const avgTemp = computed(() => {
  return Number(props.stats?.thi?.temp_average ?? 28.5).toFixed(1)
})

const avgHum = computed(() => {
  return Number(props.stats?.thi?.hum_average ?? 65.0).toFixed(0)
})

const thiBadgeClass = computed(() => {
  const level = props.stats?.thi?.status_level || 'mild'
  if (level === 'normal') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (level === 'mild') return 'bg-amber-50 text-amber-800 border-amber-200'
  if (level === 'moderate') return 'bg-orange-50 text-orange-800 border-orange-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
})

const thiDotClass = computed(() => {
  const level = props.stats?.thi?.status_level || 'mild'
  if (level === 'normal') return 'bg-emerald-500'
  if (level === 'mild') return 'bg-amber-500'
  if (level === 'moderate') return 'bg-orange-500'
  return 'bg-rose-500'
})

const activeAlertsCount = computed(() => {
  return props.stats?.alerts?.active_count ?? 2
})

const pendingAckCount = computed(() => {
  return props.stats?.alerts?.pending_ack ?? 1
})
</script>
