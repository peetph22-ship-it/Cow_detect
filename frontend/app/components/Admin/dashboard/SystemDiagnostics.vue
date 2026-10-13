<template>
  <div class="bg-[#24433a] rounded-[32px] p-8 shadow-[0_15px_40px_rgba(36,67,58,0.2)] flex flex-col justify-between text-white relative overflow-hidden group">
    <!-- Decoration -->
    <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
    <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-[#d87939]/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>

    <div class="relative z-10">
      <div class="flex items-center justify-between mb-8">
        <h3 class="font-black text-xl flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[#d87939]"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          Data Quality
        </h3>
        <span class="px-3 py-1.5 rounded-[10px] bg-emerald-500/20 text-emerald-300 text-[11px] font-black tracking-widest border border-emerald-500/30">
          HEALTHY
        </span>
      </div>

      <div class="space-y-6">
        <!-- Metric 1: Completeness -->
        <div>
          <div class="flex justify-between text-[13px] font-bold mb-2">
            <span class="text-white/80">Data Completeness (ความสมบูรณ์ข้อมูล)</span>
            <span class="text-emerald-400">95%</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-2.5 overflow-hidden backdrop-blur-sm">
            <div class="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full w-[95%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          </div>
        </div>

        <!-- Metric 2: Missing Rate -->
        <div>
          <div class="flex justify-between text-[13px] font-bold mb-2">
            <span class="text-white/80">Missing Rate (อัตราข้อมูลขาดหาย)</span>
            <span class="text-amber-400">5%</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-2.5 overflow-hidden backdrop-blur-sm">
            <div class="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full w-[5%] shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
          </div>
        </div>

        <!-- Metric 3: LSTM -->
        <div>
          <div class="flex justify-between text-[13px] font-bold mb-2">
            <span class="text-white/80">AI LSTM Readiness</span>
            <span class="text-[#d87939]">98%</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-2.5 overflow-hidden backdrop-blur-sm">
            <div class="bg-gradient-to-r from-[#d87939] to-orange-400 h-full rounded-full w-[98%] shadow-[0_0_10px_rgba(216,121,57,0.5)]"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-10 pt-6 border-t border-white/10 relative z-10">
      <button class="w-full py-4 rounded-[18px] bg-white/10 hover:bg-white border border-white/20 hover:border-white text-white hover:text-[#24433a] font-bold text-[14px] transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_4px_15px_rgba(0,0,0,0.1)] group">
        ดูรายงานคุณภาพข้อมูลสำหรับวิจัย
      </button>
    </div>
  </div>
</template>
