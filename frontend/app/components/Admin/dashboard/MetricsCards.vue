<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up delay-200">
    <!-- Card 1: Farms -->
    <div class="bg-white/70 backdrop-blur-xl rounded-[28px] p-6 border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group">
      <div class="flex items-center justify-between mb-5">
        <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ฟาร์มในเครือข่าย</span>
        <div class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5.5 h-5.5 flex-shrink-0"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        </div>
      </div>
      <div>
        <div class="text-[40px] font-black text-[#24433a] leading-none mb-2">42</div>
        <div class="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-[8px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 mr-1 flex-shrink-0"><polyline points="18 15 12 9 6 15" /></svg>
          +3 เดือนนี้
        </div>
      </div>
    </div>

    <!-- Card 2: IoT Devices & Completeness -->
    <div class="bg-white/70 backdrop-blur-xl rounded-[28px] p-6 border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group">
      <div class="flex items-center justify-between mb-5">
        <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">Device Online Rate</span>
        <div class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5.5 h-5.5 flex-shrink-0"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /></svg>
        </div>
      </div>
      <div>
        <div class="flex items-baseline gap-1.5 mb-2">
          <span class="text-[40px] font-black text-[#24433a] leading-none">128</span>
          <span class="text-[14px] font-black text-[#718078]">/ 130</span>
        </div>
        <div class="flex items-center text-[10px] font-bold text-[#e04f4f] bg-[#e04f4f]/10 w-fit px-2.5 py-1 rounded-[8px]">
          <span class="w-2 h-2 rounded-full bg-[#e04f4f] mr-1.5 animate-pulse"></span>
          ขาดการติดต่อ 4 ชม. 12 นาที (2 เครื่อง)
        </div>
      </div>
    </div>

    <!-- Card 3: Barn Penalty -->
    <div class="bg-white/70 backdrop-blur-xl rounded-[28px] p-6 border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group">
      <div class="flex items-center justify-between mb-5">
        <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">Barn Penalty</span>
        <div class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5.5 h-5.5 flex-shrink-0"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" /><path d="M12 7v5" /></svg>
        </div>
      </div>
      <div>
        <div class="flex items-baseline gap-1 mb-2">
          <span class="text-[40px] font-black text-[#24433a] leading-none">+2.4</span>
          <span class="text-[14px] font-black text-[#718078]">THI</span>
        </div>
        <div class="flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 w-fit px-2.5 py-1 rounded-[8px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 mr-1 flex-shrink-0"><path d="m10.29 3.86 8.57 14.14a2 2 0 0 1-1.71 3h-10a2 2 0 0 1-1.71-3L3.71 3.86a2 2 0 0 1 3.42 0z" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="8" y1="17" x2="8.01" y2="17" /></svg>
          โรงเรือนสะสมความร้อน (THI ใน > นอก)
        </div>
      </div>
    </div>

    <!-- Card 4: Alert Workflow -->
    <div class="bg-gradient-to-br from-[#d87939] to-[#c2682b] rounded-[28px] p-6 text-white shadow-[0_10px_30px_rgba(216,121,57,0.3)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(216,121,57,0.4)] transition-all duration-500 flex flex-col justify-between relative overflow-hidden group">
      <div class="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
      <div class="flex items-center justify-between mb-5 relative z-10">
        <span class="text-[11px] font-black text-orange-100 uppercase tracking-[0.1em]">Alert Workflow</span>
        <div class="w-12 h-12 rounded-[16px] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5.5 h-5.5 flex-shrink-0 text-white"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        </div>
      </div>
      <div class="relative z-10">
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-[40px] font-black leading-none">4</span>
          <span class="text-[14px] font-bold opacity-80">รายการใหม่</span>
        </div>
        <div class="flex items-center text-[13px] font-bold text-[#d87939] bg-white w-fit px-2.5 py-1 rounded-[8px] shadow-sm">
          รอการกด Acknowledge
        </div>
      </div>
    </div>
  </div>
</template>
