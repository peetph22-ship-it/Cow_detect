<template>
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
    <div>
      <h1 class="text-[32px] md:text-[40px] font-black text-[#24433a] tracking-tight leading-tight mb-2 flex items-center gap-3">
        ภาพรวมระบบ
        <span class="px-3 py-1 bg-[#d87939]/10 text-[#d87939] rounded-[12px] text-xs font-bold uppercase tracking-wider border border-[#d87939]/20">Overview</span>
        <span class="px-3 py-1 bg-purple-500/10 text-purple-600 rounded-[12px] text-xs font-black uppercase tracking-wider border border-purple-500/20 animate-pulse">
          DEMO MODE
        </span>
      </h1>
      <p class="text-[#718078] text-[15px] font-medium max-w-2xl">
        ศูนย์ควบคุมและมอนิเตอร์สภาวะความร้อนเครือข่ายฟาร์มโคนมแบบเรียลไทม์
      </p>
    </div>

    <div class="flex items-center gap-3">
      <button class="bg-white/80 backdrop-blur-md border border-white hover:bg-white text-[#4e6057] px-6 py-3.5 rounded-[20px] font-bold shadow-[0_4px_15px_rgba(36,67,58,0.05)] hover:shadow-[0_8px_25px_rgba(36,67,58,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2.5 text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4.5 h-4.5 flex-shrink-0 text-[#24433a]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
        ส่งออกรายงาน
      </button>
    </div>
  </div>
</template>
