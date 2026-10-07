<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">
    
    <!-- 🟢 Header Section -->
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

    <!-- 🟢 Admin Provisioning Notice -->
    <div class="hidden md:flex bg-gradient-to-r from-[#edf3ed]/80 to-white/60 backdrop-blur-xl border border-white shadow-[0_4px_20px_rgba(36,67,58,0.03)] rounded-[24px] p-5 flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-fade-up delay-100">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-[16px] bg-white text-[#d87939] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(216,121,57,0.15)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5.5 h-5.5 flex-shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        </div>
        <div>
          <h4 class="text-[15px] font-black text-[#24433a] leading-tight">
            ระบบความปลอดภัย Admin Provisioning
          </h4>
          <p class="text-[13px] text-[#718078] mt-1 font-medium">
            เกษตรกรจะได้รับบัญชีและผูกเข้ากับเซ็นเซอร์ประจำฟาร์มโดยผู้ดูแลเท่านั้น เพื่อป้องกันข้อมูลสูญหายและรับรอง Data Completeness
          </p>
        </div>
      </div>
    </div>

    <!-- 🟢 4 Key Metrics Cards -->
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
          <div class="flex items-center text-[13px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-[8px]">
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
          <div class="flex items-center text-[12px] font-bold text-[#e04f4f] bg-[#e04f4f]/10 w-fit px-2.5 py-1 rounded-[8px]">
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
          <div class="flex items-center text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 w-fit px-2.5 py-1 rounded-[8px]">
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

    <!-- 🟢 Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-300">
      
      <!-- Area Chart (THI Trend + Forecast) -->
      <div class="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] p-8">
        <h3 class="font-black text-[#24433a] text-lg mb-1 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[#d87939]"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          THI Trend & Forecast (พยากรณ์ล่วงหน้า 3 วัน)
        </h3>
        <p class="text-[13px] text-[#718078] mb-6">โมเดล LSTM พยากรณ์ระดับความรุนแรงของ THI เพื่อเตรียมการรับมือ</p>
        <div class="h-[280px]">
          <ClientOnly>
            <ApexChart type="line" height="100%" :options="areaChartOptions" :series="areaSeries" />
            <template #fallback>
              <div class="w-full h-full flex items-center justify-center text-[#718078] bg-[#edf3ed]/30 rounded-2xl animate-pulse">
                กำลังโหลดโมเดล LSTM...
              </div>
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- Donut Chart (Farm Status) -->
      <div class="bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] p-8 flex flex-col">
        <h3 class="font-black text-[#24433a] text-lg mb-1 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[#d87939]"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          สัดส่วนสภาวะฟาร์ม
        </h3>
        <p class="text-[13px] text-[#718078] mb-6">แบ่งตามระดับความเสี่ยงแบบเรียลไทม์</p>
        <div class="flex-1 flex items-center justify-center relative">
          <ClientOnly>
            <ApexChart type="donut" width="100%" height="280" :options="donutOptions" :series="donutSeries" />
            <template #fallback>
              <div class="w-48 h-48 rounded-full border-8 border-[#edf3ed] border-t-[#d87939] animate-spin"></div>
            </template>
          </ClientOnly>
        </div>
      </div>

    </div>

    <!-- 🟢 Main Content Grid (Table + Diagnostics) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-300">
      
      <!-- Recent Alerts Table (Span 2) -->
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

      <!-- Right Column: System Status Panel -->
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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

definePageMeta({
  layout: 'admin'
})

// --- 📊 Data for ApexCharts ---

// 1. Line/Area Chart (THI Trend + Forecast)
const areaSeries = ref([
  {
    name: 'THI เฉลี่ย (ข้อมูลจริง)',
    type: 'area',
    data: [68, 71, 70, 72, 73, 75, 78, null, null, null, null] 
  },
  {
    name: 'LSTM พยากรณ์ล่วงหน้า',
    type: 'line',
    data: [null, null, null, null, null, null, 78, 80, 83, 85, 82] 
  }
])

const areaChartOptions = ref({
  chart: {
    type: 'line', // Mix of area and line
    fontFamily: 'inherit',
    toolbar: { show: false },
    zoom: { enabled: false },
    dropShadow: { enabled: true, top: 4, left: 0, blur: 4, opacity: 0.1 }
  },
  colors: ['#d87939', '#e04f4f'], // Brand Accent, Critical Red for forecast
  fill: {
    type: ['gradient', 'solid'],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.05,
      stops: [0, 100]
    }
  },
  dataLabels: { enabled: false },
  stroke: { 
    curve: 'smooth', 
    width: [3, 3],
    dashArray: [0, 6] // First series solid, second series dashed
  },
  annotations: {
    yaxis: [
      {
        y: 70,
        borderColor: '#f59e0b',
        strokeDashArray: 4,
        label: {
          borderColor: '#f59e0b',
          style: { color: '#fff', background: '#f59e0b', fontSize: '11px', fontWeight: 600, padding: { left: 8, right: 8, top: 4, bottom: 4 } },
          text: 'THI 70 (เกณฑ์อันตราย)'
        }
      },
      {
        y: 80,
        borderColor: '#e04f4f',
        strokeDashArray: 4,
        label: {
          borderColor: '#e04f4f',
          style: { color: '#fff', background: '#e04f4f', fontSize: '11px', fontWeight: 600, padding: { left: 8, right: 8, top: 4, bottom: 4 } },
          text: 'THI 80 (วิกฤตรุนแรง)'
        }
      }
    ]
  },
  xaxis: {
    categories: ['-6 วัน', '-5 วัน', '-4 วัน', '-3 วัน', '-2 วัน', 'เมื่อวาน', 'วันนี้', 'พรุ่งนี้', '+2 วัน', '+3 วัน', '+4 วัน'],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#718078', fontSize: '12px', fontWeight: 700 } }
  },
  yaxis: {
    min: 60,
    max: 90,
    labels: { style: { colors: '#718078', fontSize: '12px', fontWeight: 700 } }
  },
  grid: {
    borderColor: 'rgba(36, 67, 58, 0.06)',
    strokeDashArray: 4,
    yaxis: { lines: { show: true } },
    xaxis: { lines: { show: true } }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    labels: { colors: '#4e6057', useSeriesColors: false },
    itemMargin: { horizontal: 10 }
  },
  tooltip: {
    theme: 'light',
    y: { formatter: (val) => val ? val + " THI" : 'N/A' }
  }
})

// 2. Donut Chart (Farm Status Proportion)
const donutSeries = ref([28, 10, 4]) // Normal, Warning, Critical
const donutOptions = ref({
  chart: {
    type: 'donut',
    fontFamily: 'inherit',
  },
  labels: ['ปกติ (Normal)', 'เสี่ยงปานกลาง', 'วิกฤต (Severe)'],
  colors: ['#10b981', '#f59e0b', '#e04f4f'], // Emerald, Amber, Rose
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          name: { fontSize: '12px', color: '#718078', fontWeight: 700, offsetY: -5 },
          value: { fontSize: '32px', color: '#24433a', fontWeight: 900, offsetY: 10 },
          total: {
            show: true,
            label: 'ฟาร์มทั้งหมด',
            color: '#718078',
            fontSize: '13px',
            fontWeight: 800,
            formatter: function (w) {
              return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
            }
          }
        }
      }
    }
  },
  dataLabels: { enabled: false },
  stroke: { show: true, colors: '#ffffff', width: 4 },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    markers: { radius: 12 },
    itemMargin: { horizontal: 10, vertical: 8 },
    labels: { colors: '#4e6057', useSeriesColors: false }
  },
  tooltip: { theme: 'light' }
})
</script>

<style scoped>
@keyframes shine {
  100% { transform: translateX(100%); }
}
.animate-shine {
  animation: shine 2s ease-in-out infinite;
}
</style>
