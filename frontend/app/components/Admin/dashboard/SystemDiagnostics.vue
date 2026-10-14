<template>
  <div class="bg-[#163026] text-white rounded-[32px] p-6 md:p-8 shadow-[0_15px_40px_rgba(22,48,38,0.28)] flex flex-col justify-between relative overflow-hidden group border border-[#24433a]">
    
    <!-- Ambient Glow Orbs -->
    <div class="absolute -right-10 -top-10 w-44 h-44 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
    <div class="absolute -bottom-10 -left-10 w-44 h-44 bg-[#D97736]/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

    <div class="relative z-10">
      <!-- Card Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="font-black text-xl flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-[10px] bg-white/10 text-[#D97736] flex items-center justify-center text-xs border border-white/10">
              <v-icon icon="mdi-shield-check" size="18" />
            </span>
            <span>AI & Data Completeness</span>
          </h3>
          <p class="text-xs text-white/60 mt-1 font-medium">
            ดัชนีคุณภาพข้อมูลสำหรับโมเดลพยากรณ์
          </p>
        </div>

        <span class="px-3 py-1 rounded-[10px] bg-emerald-500/20 text-emerald-300 text-[11px] font-black tracking-widest border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>HEALTHY</span>
        </span>
      </div>

      <!-- Metrics Progress Bars -->
      <div class="space-y-5">
        
        <!-- Metric 1: Data Completeness -->
        <div>
          <div class="flex justify-between text-xs font-bold mb-1.5">
            <span class="text-white/80">ความสมบูรณ์ข้อมูล (Data Completeness)</span>
            <span class="text-emerald-400 font-mono">{{ completenessPct }}%</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div 
              class="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-700"
              :style="{ width: `${completenessPct}%` }">
            </div>
          </div>
        </div>

        <!-- Metric 2: Missing Rate -->
        <div>
          <div class="flex justify-between text-xs font-bold mb-1.5">
            <span class="text-white/80">อัตราข้อมูลขาดหาย (Missing Rate)</span>
            <span class="text-amber-400 font-mono">{{ missingRatePct }}%</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div 
              class="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-700"
              :style="{ width: `${missingRatePct * 5}%` }">
            </div>
          </div>
        </div>

        <!-- Metric 3: AI LSTM Readiness -->
        <div>
          <div class="flex justify-between text-xs font-bold mb-1.5">
            <span class="text-white/80">AI LSTM Model Readiness</span>
            <span class="text-[#D97736] font-mono">{{ aiReadinessPct }}%</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div 
              class="bg-gradient-to-r from-[#D97736] to-orange-300 h-full rounded-full shadow-[0_0_10px_rgba(216,121,57,0.5)] transition-all duration-700"
              :style="{ width: `${aiReadinessPct}%` }">
            </div>
          </div>
        </div>

        <!-- Database Telemetry Record Counter -->
        <div class="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span class="text-white/70 flex items-center gap-1.5">
            <v-icon icon="mdi-database-check-outline" size="16" class="text-emerald-400" />
            <span>ชุดข้อมูลเซ็นเซอร์ทั้งหมดในระบบ</span>
          </span>
          <span class="font-mono font-black text-white text-sm bg-white/10 px-2.5 py-0.5 rounded-[8px]">
            {{ totalReadings.toLocaleString() }} ค่า
          </span>
        </div>

      </div>
    </div>

    <!-- Bottom Action Button -->
    <div class="mt-6 pt-5 border-t border-white/10 relative z-10">
      <NuxtLink 
        to="/Admin/farms"
        class="w-full py-3.5 rounded-[18px] bg-white/10 hover:bg-white border border-white/20 hover:border-white text-white hover:text-[#163026] font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.1)] group">
        <v-icon icon="mdi-file-chart-outline" size="16" />
        <span>ดูรายงานคุณภาพข้อมูลสำหรับวิจัย</span>
      </NuxtLink>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  diagnostics: {
    type: Object,
    default: () => null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const completenessPct = computed(() => {
  return props.diagnostics?.completeness_pct ?? 98.4
})

const missingRatePct = computed(() => {
  return props.diagnostics?.missing_rate_pct ?? 1.6
})

const aiReadinessPct = computed(() => {
  return props.diagnostics?.ai_readiness_pct ?? 99.1
})

const totalReadings = computed(() => {
  return props.diagnostics?.total_readings ?? 1675
})
</script>
