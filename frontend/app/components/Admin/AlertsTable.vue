<template>
  <div class="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] overflow-hidden flex flex-col relative">
    <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>

    <div class="px-8 py-7 flex items-center justify-between relative z-10 border-b border-[#24433a]/5">
      <div>
        <h3 class="font-black text-[#24433a] text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[#d87939] w-5 h-5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
          ระบบบริหารจัดการข้อแจ้งเตือน (Alert Workflow)
        </h3>
        <p class="text-[13px] text-[#718078] mt-1 font-medium">ติดตามสถานะการแจ้งเตือนและบันทึกประวัติ (Audit Log)</p>
      </div>
      <button class="text-sm font-bold text-[#d87939] hover:text-[#c2682b] transition-colors">
        ดูประวัติทั้งหมด &rarr;
      </button>
    </div>

    <div class="overflow-x-auto flex-1 p-2">
      <table class="w-full text-left whitespace-nowrap">
        <thead>
          <tr>
            <th class="px-6 py-4 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ฟาร์ม / เกษตรกร</th>
            <th class="px-6 py-4 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">สถานะสภาวะ (Issue)</th>
            <th class="px-6 py-4 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">Workflow Status</th>
            <th class="px-6 py-4 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] text-right">เวลา</th>
          </tr>
        </thead>
        <tbody class="text-[#4e6057]">
          <!-- Row 1: New -->
          <tr class="hover:bg-white transition-colors group cursor-pointer border-b border-[#24433a]/5 last:border-0 rounded-2xl bg-red-50/30">
            <td class="px-6 py-4 rounded-l-2xl">
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-[14px] bg-[#edf3ed] text-[#24433a] flex items-center justify-center font-black text-xs border border-white shadow-sm group-hover:scale-110 transition-transform">
                  F01
                </div>
                <div>
                  <p class="font-black text-[#24433a] text-[15px]">ฟาร์มสมชาย โคนมไทย</p>
                  <p class="text-[13px] font-medium text-[#718078] mt-0.5">สมชาย มั่งมี (ESP32-01)</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-3 py-1.5 rounded-[10px] text-[12px] font-bold bg-[#fff0f0] text-[#e04f4f] border border-[#e04f4f]/20">
                วิกฤต THI 84 (Severe)
              </span>
            </td>
            <td class="px-6 py-4">
              <button class="px-4 py-1.5 rounded-full text-[12px] font-bold bg-[#e04f4f] text-white shadow-sm hover:bg-[#c43a3a] transition-colors flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                ใหม่ (New)
              </button>
            </td>
            <td class="px-6 py-4 text-right text-[#718078] text-[13px] font-bold rounded-r-2xl">2 นาทีที่แล้ว</td>
          </tr>
          <!-- Row 2: Ack -->
          <tr class="hover:bg-white transition-colors group cursor-pointer border-b border-[#24433a]/5 last:border-0 rounded-2xl">
            <td class="px-6 py-4 rounded-l-2xl">
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-[14px] bg-[#edf3ed] text-[#24433a] flex items-center justify-center font-black text-xs border border-white shadow-sm group-hover:scale-110 transition-transform">
                  F12
                </div>
                <div>
                  <p class="font-black text-[#24433a] text-[15px]">โคนมแสงทอง สหกรณ์</p>
                  <p class="text-[13px] font-medium text-[#718078] mt-0.5">แสงดาว ศรีสุข (ESP32-12)</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-3 py-1.5 rounded-[10px] text-[12px] font-bold bg-[#d87939]/10 text-[#d87939] border border-[#d87939]/20">
                เสี่ยงปานกลาง THI 76
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                รับทราบแล้ว (Ack)
              </span>
            </td>
            <td class="px-6 py-4 text-right text-[#718078] text-[13px] font-bold rounded-r-2xl">45 นาทีที่แล้ว</td>
          </tr>
          <!-- Row 3: Resolved -->
          <tr class="hover:bg-white transition-colors group cursor-pointer border-b border-[#24433a]/5 last:border-0 rounded-2xl opacity-70">
            <td class="px-6 py-4 rounded-l-2xl">
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-[14px] bg-[#edf3ed]/50 text-[#24433a]/50 flex items-center justify-center font-black text-xs border border-white">
                  F08
                </div>
                <div>
                  <p class="font-black text-[#24433a] text-[15px]">ฟาร์มลุงบุญมี เจริญฟาร์ม</p>
                  <p class="text-[13px] font-medium text-[#718078] mt-0.5">บุญมี รักวัว (ESP32-08)</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-3 py-1.5 rounded-[10px] text-[12px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                อุปกรณ์ออฟไลน์
              </span>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><polyline points="20 6 9 17 4 12" /></svg>
                แก้ไขแล้ว (Resolved)
              </span>
            </td>
            <td class="px-6 py-4 text-right text-[#718078] text-[13px] font-bold rounded-r-2xl">3 ชม. ที่แล้ว</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
