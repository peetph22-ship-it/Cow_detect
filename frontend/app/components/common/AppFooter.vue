<template>
  <footer class="bg-[#142820] text-white/70 border-t border-white/10 py-5 px-4 sm:px-8 font-sans">
    <div class="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      
      <!-- Left: Mini Brand + Copyright -->
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <img src="/images/logo/logo1.png" alt="CowCare AI" class="h-4 w-auto object-contain brightness-0 invert" />
        </div>
        <span class="text-xs font-medium text-white/80">
          © {{ new Date().getFullYear() }} <strong class="text-white font-bold">CowCare AI</strong> · Heat Stress Intelligence for Dairy Farms
        </span>
      </div>

      <!-- Right: Status Pill & Tagline -->
      <div class="flex items-center gap-3 text-xs">
        <span class="hidden md:inline text-white/60">IoT ที่ออกแบบเพื่อเกษตรกรรายย่อย</span>
        <span class="hidden md:inline text-white/20">|</span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#F2BD7C] font-semibold">
          <span class="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
          THI 76 Standard
        </span>
      </div>

    </div>
  </footer>
</template>