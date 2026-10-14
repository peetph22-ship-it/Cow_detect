<template>
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
    <div>
      <div class="flex items-center gap-2.5 mb-2">
        <span class="px-3 py-1 bg-[#24433a] text-white rounded-[12px] text-[11px] font-black uppercase tracking-wider shadow-sm">
          Command Center
        </span>
        <span class="px-3 py-1 bg-[#d87939]/10 text-[#d87939] rounded-[12px] text-[11px] font-black uppercase tracking-wider border border-[#d87939]/20">
          Executive Bento
        </span>
        <span class="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-[12px] text-[11px] font-black tracking-wider border border-emerald-200 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>LIVE TELEMETRY</span>
        </span>
      </div>

      <h1 class="text-[32px] md:text-[40px] font-black text-[#24433a] tracking-tight leading-tight mb-2">
        ศูนย์ควบคุมและพยากรณ์ความร้อนโคนม
      </h1>
      <p class="text-[#718078] text-[15px] font-medium max-w-3xl">
        ศูนย์กลางวิเคราะห์สภาวะอากาศแบบรวมศูนย์ ประเมินดัชนีความเครียดจากความร้อน (THI) พร้อมพยากรณ์ล่วงหน้า 3 วันด้วย AI
      </p>
    </div>

    <!-- Actions Area -->
    <div class="flex items-center gap-3">
      <!-- Last updated caption -->
      <span v-if="lastUpdated" class="text-xs text-[#718078] font-medium hidden sm:inline-block">
        อัปเดตล่าสุด: <strong class="text-[#24433a]">{{ lastUpdated }}</strong>
      </span>

      <!-- Refresh Button -->
      <button 
        type="button" 
        @click="$emit('refresh')"
        :disabled="isLoading"
        title="รีเฟรชข้อมูลแดชบอร์ด"
        class="w-11 h-11 rounded-[18px] bg-white/80 backdrop-blur-md border border-[#e5ece9] hover:border-[#24433a]/30 text-[#24433a] shadow-sm hover:shadow-md flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-95">
        <v-icon :class="{ 'animate-spin': isLoading }" icon="mdi-refresh" size="20" />
      </button>

      <!-- Quick Export / Action -->
      <NuxtLink 
        to="/Admin/farms"
        class="bg-[#24433a] hover:bg-[#1a322b] text-white px-5 py-3 rounded-[20px] font-bold shadow-[0_8px_20px_rgba(36,67,58,0.15)] hover:shadow-[0_12px_25px_rgba(36,67,58,0.25)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 text-sm cursor-pointer">
        <v-icon icon="mdi-barn" size="18" />
        <span>จัดการฟาร์ม</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    default: () => null
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: String,
    default: ''
  }
})

defineEmits(['refresh'])
</script>
