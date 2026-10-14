<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">
    
    <!-- 🟢 1. Top Navigation & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#24433a]/10 animate-fade-up">
      <div class="flex items-center gap-3.5">
        <!-- Back button -->
        <button 
          type="button" 
          @click="goBack" 
          class="w-11 h-11 rounded-[16px] bg-white border border-[#e5ece9] hover:border-[#24433a]/30 text-[#24433a] shadow-sm hover:shadow-md flex items-center justify-center transition-all cursor-pointer group active:scale-95">
          <v-icon icon="mdi-arrow-left" size="20" class="group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div>
          <!-- Breadcrumbs -->
          <div class="flex items-center gap-2 text-xs font-bold text-[#718078] mb-0.5">
            <NuxtLink to="/Admin" class="hover:text-[#24433a] transition-colors">Command Center</NuxtLink>
            <v-icon icon="mdi-chevron-right" size="14" class="opacity-40" />
            <NuxtLink to="/Admin/farms" class="hover:text-[#24433a] transition-colors">รายการฟาร์ม</NuxtLink>
            <v-icon icon="mdi-chevron-right" size="14" class="opacity-40" />
            <span class="text-[#24433a] font-black">Smart Barn Cockpit</span>
          </div>

          <!-- Farm Title & Live IoT Status Badge -->
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-2xl md:text-3xl font-black text-[#24433a] tracking-tight">
              {{ farm?.name_farms || 'กำลังโหลดข้อมูลฟาร์ม...' }}
            </h1>
            <span 
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide border"
              :class="device?.status === 'online' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-gray-100 text-gray-700 border-gray-200'">
              <span 
                class="w-2 h-2 rounded-full" 
                :class="device?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'">
              </span>
              <span>{{ device?.status === 'online' ? 'IoT Online' : 'IoT Offline' }}</span>
              <span v-if="device?.serial_no" class="font-mono text-[10px] opacity-75">({{ device.serial_no }})</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Live Polling Toggle (8s) -->
        <button 
          type="button" 
          @click="toggleAutoSync"
          :title="isAutoSync ? 'คลิกเพื่อหยุดการอัปเดตอัตโนมัติ' : 'คลิกเพื่อเปิดการอัปเดตอัตโนมัติทุก 8 วินาที'"
          class="px-4 py-2.5 rounded-[18px] text-xs font-bold border transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm"
          :class="isAutoSync 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-emerald-500/10' 
            : 'bg-white text-[#718078] border-[#e5ece9] hover:border-[#24433a]/30'">
          <span class="relative flex h-2 w-2">
            <span v-if="isAutoSync" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2" :class="isAutoSync ? 'bg-emerald-500' : 'bg-gray-400'"></span>
          </span>
          <span>{{ isAutoSync ? 'Live Sync (8s)' : 'Sync พักอยู่' }}</span>
        </button>

        <!-- Manual Refresh Button -->
        <button 
          type="button" 
          @click="fetchFarmDetail" 
          :disabled="isLoading"
          title="รีเฟรชข้อมูลเซ็นเซอร์ตอนนี้"
          class="w-10 h-10 rounded-[16px] bg-white border border-[#e5ece9] hover:border-[#24433a]/30 text-[#24433a] shadow-sm hover:shadow-md flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-95">
          <v-icon :class="{ 'animate-spin': isLoading }" icon="mdi-refresh" size="18" />
        </button>

        <!-- Edit Farm & Barn Specs Button -->
        <button 
          type="button" 
          @click="isEditModalOpen = true"
          class="px-4 py-2.5 rounded-[18px] bg-[#24433a] hover:bg-[#1a322b] text-white text-xs font-bold shadow-[0_4px_14px_rgba(36,67,58,0.2)] hover:shadow-[0_6px_20px_rgba(36,67,58,0.3)] hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
          <v-icon icon="mdi-pencil-outline" size="16" />
          <span>แก้ไขข้อมูลฟาร์ม</span>
        </button>
      </div>
    </div>

    <!-- 🟢 2. Hero Telemetry Cockpit (Bento Grid 12 Columns) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-up delay-100">

      <!-- 2.1 Left Bento Card (5 Cols): Primary THI Status & Advisory -->
      <div 
        class="lg:col-span-5 rounded-[32px] p-6 md:p-8 border shadow-[0_10px_35px_rgba(36,67,58,0.06)] backdrop-blur-xl flex flex-col justify-between relative overflow-hidden transition-all duration-500"
        :class="[cockpitThiTheme.bg, cockpitThiTheme.border]">
        
        <!-- Ambient Watermark -->
        <div class="absolute -right-8 -top-8 w-44 h-44 rounded-full opacity-20 blur-2xl pointer-events-none" :class="cockpitThiTheme.watermark"></div>

        <div>
          <!-- Header of Card -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-[10px] bg-white/70 shadow-sm flex items-center justify-center">
                <v-icon icon="mdi-fire-alert" size="18" :class="cockpitThiTheme.iconColor" />
              </span>
              <span class="text-xs font-black uppercase tracking-wider text-[#718078]">
                ดัชนีความร้อนสะสม THI ปัจจุบัน
              </span>
            </div>

            <!-- Stress Level Pill -->
            <span class="px-3 py-1 rounded-full text-[11px] font-black border tracking-wide shadow-sm" :class="cockpitThiTheme.badgeBg">
              {{ cockpitThiTheme.label }}
            </span>
          </div>

          <!-- Giant THI Number Display -->
          <div class="my-4 flex items-baseline gap-3">
            <span class="text-6xl md:text-7xl font-black tabular-nums tracking-tight leading-none" :class="cockpitThiTheme.text">
              {{ latestSensor?.thi ? Number(latestSensor.thi).toFixed(1) : '-' }}
            </span>
            <div class="flex flex-col">
              <span class="text-xs font-black uppercase tracking-widest text-[#718078]">หน่วย THI</span>
              <span class="text-[11px] font-medium text-[#718078]/80">NRC Equation</span>
            </div>
          </div>

          <!-- Color-coded THI Risk Thresholds Bar -->
          <div class="w-full bg-white/60 h-2.5 rounded-full overflow-hidden flex shadow-inner mb-6">
            <div class="bg-emerald-500 h-full" style="width: 45%;" title="ปกติ (<76)"></div>
            <div class="bg-amber-400 h-full" style="width: 15%;" title="เฝ้าระวัง (76-79.9)"></div>
            <div class="bg-orange-500 h-full" style="width: 15%;" title="เริ่มกระทบ (80-83.9)"></div>
            <div class="bg-rose-500 h-full" style="width: 25%;" title="วิกฤต (≥84)"></div>
          </div>
        </div>

        <!-- Actionable Recommendation Box -->
        <div class="p-4 rounded-[22px] border backdrop-blur-md shadow-sm transition-all" :class="cockpitThiTheme.advisoryBg">
          <div class="flex items-start gap-3">
            <v-icon icon="mdi-lightbulb-on-outline" size="20" class="shrink-0 mt-0.5" />
            <div>
              <p class="font-black text-xs uppercase tracking-wide">
                {{ cockpitThiTheme.advisoryTitle }}
              </p>
              <p class="text-xs font-medium leading-relaxed mt-1 opacity-90">
                {{ cockpitThiTheme.advisoryText }}
              </p>
            </div>
          </div>
        </div>

      </div>

      <!-- 2.2 Middle Bento Card (4 Cols): Microclimate Metrics (Temp & Humidity) -->
      <div class="lg:col-span-4 bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xs font-black uppercase tracking-wider text-[#718078] flex items-center gap-1.5">
              <v-icon icon="mdi-weather-partly-cloudy" size="18" class="text-[#24433a]" />
              <span>สภาพอากาศในโรงเรือน (Microclimate)</span>
            </h3>
            <span class="text-[10px] font-bold text-[#718078] bg-[#f0f4f2] px-2 py-0.5 rounded-[6px]">
              IoT Telemetry
            </span>
          </div>

          <!-- Metric Block 1: Temperature -->
          <div class="p-4 rounded-[22px] bg-[#f8faf9] border border-[#e5ece9] mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-[#4e6057] flex items-center gap-1.5">
                <v-icon icon="mdi-thermometer" size="16" class="text-amber-500" />
                <span>อุณหภูมิอากาศ (Temperature)</span>
              </span>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-[6px] border" :class="tempStatusBadge.class">
                {{ tempStatusBadge.label }}
              </span>
            </div>

            <div class="flex items-baseline gap-2 mb-2">
              <span class="text-4xl font-black text-[#24433a] tabular-nums tracking-tight">
                {{ latestSensor?.temperature_c ? Number(latestSensor.temperature_c).toFixed(1) : '-' }}
              </span>
              <span class="text-sm font-black text-[#718078]">°C</span>
            </div>

            <!-- Mini Intensity Bar for Temp (15°C to 45°C range) -->
            <div class="w-full bg-[#e5ece9] h-2 rounded-full overflow-hidden">
              <div 
                class="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-700" 
                :style="{ width: `${tempPercent}%` }">
              </div>
            </div>
          </div>

          <!-- Metric Block 2: Relative Humidity -->
          <div class="p-4 rounded-[22px] bg-[#f8faf9] border border-[#e5ece9]">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-[#4e6057] flex items-center gap-1.5">
                <v-icon icon="mdi-water-percent" size="16" class="text-sky-600" />
                <span>ความชื้นสัมพัทธ์ (Relative Humidity)</span>
              </span>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-[6px] border" :class="humStatusBadge.class">
                {{ humStatusBadge.label }}
              </span>
            </div>

            <div class="flex items-baseline gap-2 mb-2">
              <span class="text-4xl font-black text-sky-800 tabular-nums tracking-tight">
                {{ latestSensor?.humidity_pct ? Number(latestSensor.humidity_pct).toFixed(1) : '-' }}
              </span>
              <span class="text-sm font-black text-[#718078]">%RH</span>
            </div>

            <!-- Mini Intensity Bar for Humidity (0% to 100%) -->
            <div class="w-full bg-[#e5ece9] h-2 rounded-full overflow-hidden">
              <div 
                class="bg-gradient-to-r from-sky-400 to-blue-600 h-full rounded-full transition-all duration-700" 
                :style="{ width: `${humPercent}%` }">
              </div>
            </div>
          </div>
        </div>

        <p class="text-[11px] text-[#718078] font-medium mt-3 pt-2 border-t border-[#f0f4f2] text-right">
          ตรวจวัดล่าสุด: {{ formatTime(latestSensor?.recorded_at) }}
        </p>
      </div>

      <!-- 2.3 Right Bento Card (3 Cols): Barn & Hardware Profile -->
      <div class="lg:col-span-3 bg-[#163026] text-white rounded-[32px] p-6 md:p-8 border border-[#24433a] shadow-[0_15px_40px_rgba(22,48,38,0.25)] flex flex-col justify-between relative overflow-hidden group">
        
        <!-- Ambient Decor -->
        <div class="absolute -right-8 -top-8 w-36 h-36 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

        <div>
          <!-- Header -->
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <span class="text-xs font-black uppercase tracking-wider text-white/70 flex items-center gap-1.5">
              <v-icon icon="mdi-home-analytics" size="18" class="text-[#D97736]" />
              <span>Barn & Hardware</span>
            </span>
            <span class="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-white/80">
              PROFILED
            </span>
          </div>

          <!-- Barn Specifications List -->
          <div class="space-y-3.5 text-xs">
            
            <!-- Height -->
            <div class="flex items-center justify-between">
              <span class="text-white/60">ความสูงโรงเรือน:</span>
              <span class="font-bold text-white font-mono">
                {{ farm?.barn_height_m ? Number(farm.barn_height_m).toFixed(1) + ' ม.' : '2.7 ม.' }}
              </span>
            </div>

            <!-- Roof -->
            <div class="flex items-center justify-between">
              <span class="text-white/60">วัสดุมุงหลังคา:</span>
              <span class="font-bold text-white truncate max-w-[130px]">
                {{ farm?.roof_type || 'สังกะสี (Zinc)' }}
              </span>
            </div>

            <!-- Ventilation -->
            <div class="flex items-center justify-between">
              <span class="text-white/60">ระบบระบายอากาศ:</span>
              <span class="font-bold text-white truncate max-w-[130px]">
                {{ farm?.cooling_system || 'พัดลมระบายอากาศ' }}
              </span>
            </div>

            <!-- Location -->
            <div class="flex items-center justify-between pt-2 border-t border-white/10">
              <span class="text-white/60">ที่ตั้งฟาร์ม:</span>
              <span class="font-bold text-white">
                {{ farm?.province || 'เชียงใหม่' }}
              </span>
            </div>

            <!-- Hardware Node Serial -->
            <div class="flex items-center justify-between pt-2 border-t border-white/10">
              <span class="text-white/60">โหนดตรวจวัด:</span>
              <span class="font-mono font-bold text-emerald-400 bg-white/10 px-2 py-0.5 rounded">
                {{ device?.serial_no || latestSensor?.serial_no || 'ESP32-S3-01' }}
              </span>
            </div>

          </div>
        </div>

        <!-- Node Status Tag at Bottom -->
        <div class="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
          <span>สถานะการเชื่อมต่อ:</span>
          <span class="font-bold flex items-center gap-1.5" :class="device?.status === 'online' ? 'text-emerald-400' : 'text-gray-400'">
            <span class="w-2 h-2 rounded-full" :class="device?.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'"></span>
            {{ device?.status === 'online' ? 'Connected (ปกติ)' : 'Disconnected' }}
          </span>
        </div>

      </div>

    </div>

    <!-- 🟢 3. 24-Hour Rolling Summary Ribbon -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-150">

      <!-- Ribbon Card 1: 24h Average THI -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex items-center gap-4">
        <div class="w-12 h-12 rounded-[16px] bg-[#d87939]/10 text-[#d87939] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-chart-line" size="24" />
        </div>
        <div>
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-wider block">
            ค่าเฉลี่ย THI (รอบ 24 ชม.)
          </span>
          <div class="flex items-baseline gap-1.5 mt-0.5">
            <span class="text-2xl font-black text-[#24433a] tabular-nums">
              {{ dailySummary?.avg_thi || (latestSensor?.thi ? Number(latestSensor.thi).toFixed(1) : '-') }}
            </span>
            <span class="text-xs font-bold text-[#718078]">THI</span>
          </div>
        </div>
      </div>

      <!-- Ribbon Card 2: Temperature Range (Min - Max) -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex items-center gap-4">
        <div class="w-12 h-12 rounded-[16px] bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
          <v-icon icon="mdi-thermometer-chevron-up" size="24" />
        </div>
        <div>
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-wider block">
            ช่วงอุณหภูมิ (Min - Max)
          </span>
          <div class="flex items-baseline gap-1 mt-0.5 font-black text-[#24433a] text-xl tabular-nums">
            <span>{{ dailySummary?.min_temp || '26.8' }}°</span>
            <span class="text-xs text-[#718078] font-medium">-</span>
            <span>{{ dailySummary?.max_temp || '30.2' }}°C</span>
          </div>
        </div>
      </div>

      <!-- Ribbon Card 3: Humidity Range (Min - Max) -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex items-center gap-4">
        <div class="w-12 h-12 rounded-[16px] bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
          <v-icon icon="mdi-water-sync" size="24" />
        </div>
        <div>
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-wider block">
            ช่วงความชื้น (Min - Max)
          </span>
          <div class="flex items-baseline gap-1 mt-0.5 font-black text-sky-900 text-xl tabular-nums">
            <span>{{ dailySummary?.min_hum || '58.1' }}%</span>
            <span class="text-xs text-[#718078] font-medium">-</span>
            <span>{{ dailySummary?.max_hum || '76.7' }}%</span>
          </div>
        </div>
      </div>

      <!-- Ribbon Card 4: Heat Stress Exposure Count / Hours -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex items-center gap-4">
        <div class="w-12 h-12 rounded-[16px] bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
          <v-icon icon="mdi-timer-alert-outline" size="24" />
        </div>
        <div>
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-wider block">
            สภาวะความร้อนสะสม
          </span>
          <div class="flex items-baseline gap-1.5 mt-0.5">
            <span class="text-2xl font-black text-rose-600 tabular-nums">
              {{ dailySummary?.count_stress_readings ?? 279 }}
            </span>
            <span class="text-xs font-bold text-[#718078]">
              รอบเตือน ({{ dailySummary?.stress_percentage ?? 78 }}%)
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- 🟢 4. Interactive Time-Series Chart Card (ApexCharts) -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-6 animate-fade-up delay-200">
      
      <!-- Chart Controls & Filter Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f4f2]">
        <div>
          <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight flex items-center gap-2">
            <v-icon icon="mdi-chart-timeline-variant-shimmer" size="22" class="text-[#d87939]" />
            <span>เส้นทางแนวโน้มดัชนีเซ็นเซอร์ (IoT Sensor Trends)</span>
          </h3>
          <p class="text-xs text-[#718078] mt-0.5 font-medium">
            กราฟประเมินการเปลี่ยนแปลงค่า THI, อุณหภูมิ และความชื้นสัมพัทธ์ในโรงเรือน
          </p>
        </div>

        <!-- Mode Toggle Segmented Control -->
        <div class="inline-flex items-center p-1 bg-[#f0f4f2] rounded-2xl border border-[#e5ece9] self-start sm:self-auto">
          <button
            type="button"
            @click="activeChartTab = 'thi'"
            :class="[
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
              activeChartTab === 'thi' 
                ? 'bg-white text-[#24433a] shadow-sm' 
                : 'text-[#718078] hover:text-[#24433a]'
            ]">
            THI Focus
          </button>
          
          <button
            type="button"
            @click="activeChartTab = 'temp_hum'"
            :class="[
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
              activeChartTab === 'temp_hum' 
                ? 'bg-white text-[#24433a] shadow-sm' 
                : 'text-[#718078] hover:text-[#24433a]'
            ]">
            Temp &amp; RH
          </button>

          <button
            type="button"
            @click="activeChartTab = 'both'"
            :class="[
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
              activeChartTab === 'both' 
                ? 'bg-white text-[#24433a] shadow-sm' 
                : 'text-[#718078] hover:text-[#24433a]'
            ]">
            All Combined
          </button>
        </div>
      </div>

      <!-- ApexChart Area -->
      <div class="h-[340px] md:h-[380px] w-full">
        <ClientOnly>
          <ApexChart 
            v-if="chartSeries.length > 0 && chartSeries[0].data.length > 0"
            :key="activeChartTab + '-' + historyList.length"
            type="line" 
            height="100%" 
            :options="chartOptions" 
            :series="chartSeries" 
          />
          <div v-else class="w-full h-full flex flex-col items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl">
            <v-icon icon="mdi-chart-timeline-variant" size="48" class="text-[#a6b5aa] mb-2" />
            <p class="text-sm font-bold">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</p>
            <p class="text-xs text-[#718078]">เมื่อเซ็นเซอร์ IoT ประจำฟาร์มส่งข้อมูลเข้ามา กราฟจะแสดงผลโดยอัตโนมัติ</p>
          </div>
          <template #fallback>
            <div class="w-full h-full flex items-center justify-center text-[#718078] bg-[#f8faf9] rounded-2xl animate-pulse">
              <v-icon icon="mdi-loading" size="24" class="animate-spin mr-2" />
              กำลังโหลดกราฟ...
            </div>
          </template>
        </ClientOnly>
      </div>

      <!-- Chart Legend Notes -->
      <div class="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#718078] pt-2 border-t border-[#f0f4f2]">
        <span class="flex items-center gap-1.5 font-bold">
          <span class="w-2.5 h-2.5 rounded-full bg-[#d87939]"></span>
          <span>เส้นดัชนี THI</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-0.5 bg-amber-400"></span>
          <span>เกณฑ์ 76 (เริ่มเฝ้าระวัง)</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-0.5 bg-orange-500"></span>
          <span>เกณฑ์ 80 (เริ่มกระทบผลผลิต)</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-0.5 bg-rose-500"></span>
          <span>เกณฑ์ 84 (วิกฤตรุนแรง)</span>
        </span>
      </div>

    </div>

    <!-- 🟢 5. 50-Point Telemetry Audit Table (ประวัติการตรวจวัด) -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-4 animate-fade-up delay-250">
      
      <!-- Table Header Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5ece9]">
        <div>
          <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight flex items-center gap-2">
            <v-icon icon="mdi-history" size="22" class="text-[#24433a]" />
            <span>ประวัติการตรวจวัดจากเซ็นเซอร์ (50-Point Telemetry Audit)</span>
          </h3>
          <p class="text-xs text-[#718078] mt-0.5 font-medium">
            รายการบันทึกย้อนหลัง 50 รายการล่าสุดจากอุปกรณ์เซ็นเซอร์ IoT ประจำฟาร์ม
          </p>
        </div>

        <span class="text-xs font-bold text-[#718078] bg-[#f0f4f2] px-3 py-1.5 rounded-xl self-start sm:self-auto font-mono">
          ทั้งหมด {{ historyList.length }} รายการ
        </span>
      </div>

      <!-- Borderless Glass Table -->
      <div class="overflow-x-auto rounded-2xl border border-[#e5ece9]">
        <table class="w-full text-left text-xs whitespace-nowrap">
          <thead class="bg-[#fafcfb] border-b border-[#e5ece9] text-[#4e6057] font-black uppercase text-[11px]">
            <tr>
              <th class="py-3.5 px-4 text-center w-12">#</th>
              <th class="py-3.5 px-5">วันและเวลาตรวจวัด</th>
              <th class="py-3.5 px-5 text-right">อุณหภูมิ (°C)</th>
              <th class="py-3.5 px-5 text-right">ความชื้น (%RH)</th>
              <th class="py-3.5 px-5 text-right">ค่า THI</th>
              <th class="py-3.5 px-5 text-center">ระดับความเครียด</th>
              <th class="py-3.5 px-5">อุปกรณ์ (Device)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f0f4f2] bg-white">
            <tr 
              v-for="(row, idx) in historyList" 
              :key="row.id || idx" 
              class="hover:bg-[#f8faf9] transition-colors relative">
              
              <!-- Left Mini Color Accent Bar according to THI Risk Level -->
              <td class="py-3 px-4 text-center text-[#718078] font-bold relative">
                <span 
                  class="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                  :class="getRowAccentBarClass(row.thi)">
                </span>
                <span class="font-mono tabular-nums">{{ historyList.length - idx }}</span>
              </td>

              <!-- Date & Time -->
              <td class="py-3 px-5 font-bold text-[#1f3d34] font-mono tabular-nums">
                {{ formatDateTime(row.recorded_at) }}
              </td>

              <!-- Temperature -->
              <td class="py-3 px-5 text-right font-black text-[#24433a] font-mono tabular-nums text-sm">
                {{ row.temperature_c ? Number(row.temperature_c).toFixed(1) : '-' }}
                <span class="text-[11px] text-[#718078] font-medium font-sans">°C</span>
              </td>

              <!-- Humidity -->
              <td class="py-3 px-5 text-right font-black text-sky-800 font-mono tabular-nums text-sm">
                {{ row.humidity_pct ? Number(row.humidity_pct).toFixed(1) : '-' }}
                <span class="text-[11px] text-[#718078] font-medium font-sans">%</span>
              </td>

              <!-- THI Index -->
              <td class="py-3 px-5 text-right font-black text-[#d87939] font-mono tabular-nums text-[15px]">
                {{ row.thi ? Number(row.thi).toFixed(1) : '-' }}
              </td>

              <!-- Stress Level Badge -->
              <td class="py-3 px-5 text-center">
                <span 
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border"
                  :class="getHistoryStatusClass(row.thi)">
                  <span class="w-1.5 h-1.5 rounded-full" :class="getHistoryDotClass(row.thi)"></span>
                  {{ getHistoryStatusText(row.thi) }}
                </span>
              </td>

              <!-- Hardware Device Serial -->
              <td class="py-3 px-5 text-[#718078] font-mono text-xs">
                {{ row.serial_no || device?.serial_no || '-' }}
              </td>
            </tr>

            <!-- Empty Row -->
            <tr v-if="historyList.length === 0">
              <td colspan="7" class="py-10 text-center text-[#718078] font-medium">
                <v-icon icon="mdi-database-off-outline" size="32" class="text-[#a6b5aa] block mx-auto mb-2" />
                ยังไม่มีประวัติการตรวจวัดจากเซ็นเซอร์สำหรับฟาร์มนี้
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- 🟢 6. Edit Farm Modal Component Integration -->
    <AdminEditFarmModal 
      v-model="isEditModalOpen" 
      :farm="farm" 
      @updated="fetchFarmDetail" 
      @deleted="handleFarmDeleted" 
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { Admin } from '~/API/baseAPI'
import AdminEditFarmModal from '~/components/Admin/farm/EditFarmModal.vue'

definePageMeta({
  layout: 'admin',
  alias: ['/Admin/farm_detail-:id', '/Admin/farms/:id']
})

const route = useRoute()
const router = useRouter()
const farmId = computed(() => route.params.id)

// State
const isLoading = ref(false)
const isAutoSync = ref(true)
const isEditModalOpen = ref(false)
const activeChartTab = ref('thi')
let syncTimer = null

const farm = ref(null)
const owner = ref(null)
const device = ref(null)
const latestSensor = ref(null)
const dailySummary = ref(null)
const historyList = ref([])

const token = process.client ? localStorage.getItem('token') : null

// Back Navigation
const goBack = () => {
  router.push('/Admin/farms')
}

// Handle Farm Deleted
const handleFarmDeleted = () => {
  router.push('/Admin/farms')
}

// Fetch Farm Telemetry Detail
const fetchFarmDetail = async () => {
  if (!farmId.value) return
  isLoading.value = true
  try {
    const res = await axios.get(`${Admin}/farms/${farmId.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data && res.data.success) {
      farm.value = res.data.farm || null
      owner.value = res.data.owner || null
      device.value = res.data.device || null
      latestSensor.value = res.data.latest_sensor || null
      dailySummary.value = res.data.daily_summary || null
      historyList.value = res.data.history || []
    }
  } catch (err) {
    console.error('[Fetch Farm Detail Error]:', err)
  } finally {
    if (isLoading.value) isLoading.value = false
  }
}

// Auto Sync Control
const toggleAutoSync = () => {
  isAutoSync.value = !isAutoSync.value
  if (isAutoSync.value) {
    startAutoSync()
  } else {
    stopAutoSync()
  }
}

const startAutoSync = () => {
  stopAutoSync()
  syncTimer = setInterval(() => {
    fetchFarmDetail()
  }, 8000)
}

const stopAutoSync = () => {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}

// Formatting Helpers
const formatTime = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return dateStr
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// -------------------------------------------------------------
// 🟢 Cockpit THI Theme & Actionable Recommendation Logic
// -------------------------------------------------------------
const cockpitThiTheme = computed(() => {
  const thi = parseFloat(latestSensor.value?.thi)
  if (isNaN(thi)) {
    return {
      bg: 'bg-white/80',
      border: 'border-white/90',
      text: 'text-[#24433a]',
      badgeBg: 'bg-gray-100 text-gray-700 border-gray-200',
      advisoryBg: 'bg-gray-50 border-gray-200 text-gray-700',
      iconColor: 'text-gray-500',
      watermark: 'bg-gray-200',
      label: 'ไม่มีข้อมูลเซ็นเซอร์',
      advisoryTitle: 'รอข้อมูลการตรวจวัด',
      advisoryText: 'ยังไม่พบข้อมูลจากเซ็นเซอร์ IoT ประจำฟาร์ม ระบบจะประเมินความเสี่ยงและคำแนะนำเมื่อมีข้อมูลส่งเข้ามา'
    }
  }
  if (thi < 76.0) {
    return {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-950',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      advisoryBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-950',
      iconColor: 'text-emerald-600',
      watermark: 'bg-emerald-400',
      label: 'สภาวะปกติ (Comfort Zone)',
      advisoryTitle: 'สภาวะอากาศปกติ แม่โคไม่เครียด',
      advisoryText: 'สภาพอากาศในโรงเรือนอยู่ในเกณฑ์ปลอดภัย แม่โคกินอาหารและเคี้ยวเอื้องได้ตามปกติ ดูแลรักษาการระบายอากาศตามรอบปกติ'
    }
  }
  if (thi < 80.0) {
    return {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-950',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      advisoryBg: 'bg-amber-500/15 border-amber-500/30 text-amber-950',
      iconColor: 'text-amber-600',
      watermark: 'bg-amber-400',
      label: 'เริ่มเฝ้าระวัง (Mild Stress)',
      advisoryTitle: 'ความร้อนเริ่มสะสม แนะนำเปิดพัดลม',
      advisoryText: 'อุณหภูมิและความชื้นสัมพัทธ์เริ่มสูงขึ้น แนะนำให้เปิดพัดลมระบายอากาศในโรงเรือนเพื่อเร่งการระบายความร้อนออกจากตัวโค'
    }
  }
  if (thi < 84.0) {
    return {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-950',
      badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
      advisoryBg: 'bg-orange-500/15 border-orange-500/30 text-orange-950',
      iconColor: 'text-orange-600',
      watermark: 'bg-orange-400',
      label: 'เริ่มกระทบผลผลิต (Moderate Stress)',
      advisoryTitle: 'เปิดพัดลมเต็มกำลัง + เปิดระบบพ่นหมอก',
      advisoryText: 'แม่โคเริ่มหายใจเร็วและกินอาหารลดลง เสี่ยงผลผลิตน้ำนมลด 10-20% ต้องเปิดพัดลมแรงสุดและเปิดระบบพ่นละอองน้ำ (Misting) เหนือทางเดิน'
    }
  }
  return {
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    text: 'text-rose-950',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse',
    advisoryBg: 'bg-rose-500/20 border-rose-500/40 text-rose-950',
    iconColor: 'text-rose-600',
    watermark: 'bg-rose-500',
    label: 'ภาวะวิกฤตรุนแรง (Severe Heat Stress)',
    advisoryTitle: '🚨 ฉุกเฉิน: เสี่ยงผสมไม่ติดและแม่โคหอบรุนแรง!',
    advisoryText: 'แม่โคตกอยู่ในภาวะความเครียดความร้อนวิกฤต ต้องเปิดพัดลมพ่นน้ำต่อเนื่อง เตรียมน้ำดื่มเย็นไม่อั้น และเลื่อนการผสมเทียมออกไป'
  }
})

// Temperature & Humidity Bar Percentages
const tempPercent = computed(() => {
  const t = parseFloat(latestSensor.value?.temperature_c)
  if (isNaN(t)) return 0
  // Map 15°C to 45°C
  const pct = ((t - 15) / (45 - 15)) * 100
  return Math.max(5, Math.min(100, Math.round(pct)))
})

const humPercent = computed(() => {
  const h = parseFloat(latestSensor.value?.humidity_pct)
  if (isNaN(h)) return 0
  return Math.max(5, Math.min(100, Math.round(h)))
})

const tempStatusBadge = computed(() => {
  const t = parseFloat(latestSensor.value?.temperature_c)
  if (isNaN(t)) return { label: '-', class: 'bg-gray-100 text-gray-600 border-gray-200' }
  if (t < 25) return { label: 'อากาศเย็น', class: 'bg-sky-50 text-sky-700 border-sky-200' }
  if (t <= 30) return { label: 'เหมาะสม (25-30°C)', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  return { label: 'อากาศร้อน (>30°C)', class: 'bg-rose-50 text-rose-700 border-rose-200' }
})

const humStatusBadge = computed(() => {
  const h = parseFloat(latestSensor.value?.humidity_pct)
  if (isNaN(h)) return { label: '-', class: 'bg-gray-100 text-gray-600 border-gray-200' }
  if (h < 50) return { label: 'แห้ง (<50%)', class: 'bg-amber-50 text-amber-700 border-amber-200' }
  if (h <= 75) return { label: 'ปานกลาง (50-75%)', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  return { label: 'ความชื้นสูง (>75%)', class: 'bg-blue-50 text-blue-700 border-blue-200' }
})

// Audit Table Helpers
const getHistoryStatusText = (thi) => {
  const t = parseFloat(thi)
  if (isNaN(t)) return '-'
  if (t < 76) return 'ปกติ'
  if (t < 80) return 'เฝ้าระวัง'
  if (t < 84) return 'กระทบ'
  return 'วิกฤต'
}

const getHistoryStatusClass = (thi) => {
  const t = parseFloat(thi)
  if (isNaN(t)) return 'bg-gray-50 text-gray-600 border-gray-200'
  if (t < 76) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (t < 80) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (t < 84) return 'bg-orange-50 text-orange-700 border-orange-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

const getHistoryDotClass = (thi) => {
  const t = parseFloat(thi)
  if (isNaN(t)) return 'bg-gray-400'
  if (t < 76) return 'bg-emerald-500'
  if (t < 80) return 'bg-amber-500'
  if (t < 84) return 'bg-orange-500'
  return 'bg-rose-500'
}

const getRowAccentBarClass = (thi) => {
  const t = parseFloat(thi)
  if (isNaN(t)) return 'bg-gray-300'
  if (t < 76) return 'bg-emerald-500'
  if (t < 80) return 'bg-amber-400'
  if (t < 84) return 'bg-orange-500'
  return 'bg-rose-500'
}

// -------------------------------------------------------------
// 📊 ApexCharts Configuration (ไม่มีความดันอากาศ)
// -------------------------------------------------------------
const chartCategories = computed(() => {
  return historyList.value.map(h => {
    if (!h.recorded_at) return ''
    const d = new Date(h.recorded_at)
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  })
})

const chartSeries = computed(() => {
  if (!historyList.value || historyList.value.length === 0) return []

  const thiData = historyList.value.map(h => h.thi ? Number(h.thi) : null)
  const tempData = historyList.value.map(h => h.temperature_c ? Number(h.temperature_c) : null)
  const humData = historyList.value.map(h => h.humidity_pct ? Number(h.humidity_pct) : null)

  if (activeChartTab.value === 'thi') {
    return [
      {
        name: 'ค่า THI',
        type: 'area',
        data: thiData
      }
    ]
  }

  if (activeChartTab.value === 'temp_hum') {
    return [
      {
        name: 'อุณหภูมิ (°C)',
        type: 'line',
        data: tempData
      },
      {
        name: 'ความชื้น (%RH)',
        type: 'line',
        data: humData
      }
    ]
  }

  // both
  return [
    {
      name: 'ค่า THI',
      type: 'area',
      data: thiData
    },
    {
      name: 'อุณหภูมิ (°C)',
      type: 'line',
      data: tempData
    },
    {
      name: 'ความชื้น (%RH)',
      type: 'line',
      data: humData
    }
  ]
})

const chartOptions = computed(() => {
  const isThiOnly = activeChartTab.value === 'thi'
  const isBoth = activeChartTab.value === 'both'

  let colors = ['#d87939']
  if (activeChartTab.value === 'temp_hum') {
    colors = ['#f59e0b', '#0ea5e9']
  } else if (isBoth) {
    colors = ['#d87939', '#f59e0b', '#0ea5e9']
  }

  return {
    chart: {
      fontFamily: 'inherit',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: colors,
    stroke: {
      curve: 'smooth',
      width: isThiOnly ? [3] : isBoth ? [3, 2, 2] : [2.5, 2.5]
    },
    fill: {
      type: isThiOnly ? ['gradient'] : isBoth ? ['gradient', 'solid', 'solid'] : ['solid', 'solid'],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 95]
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartCategories.value,
      labels: {
        style: { fontSize: '11px', colors: '#718078' },
        rotate: -30
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#718078' },
        formatter: (val) => val != null ? Number(val).toFixed(1) : ''
      }
    },
    annotations: isThiOnly || isBoth ? {
      yaxis: [
        {
          y: 76,
          borderColor: '#f59e0b',
          strokeDashArray: 4,
          label: {
            borderColor: '#f59e0b',
            style: { color: '#fff', background: '#f59e0b', fontSize: '10px', fontWeight: 700 },
            text: 'THI 76 (เฝ้าระวัง)'
          }
        },
        {
          y: 80,
          borderColor: '#ea580c',
          strokeDashArray: 4,
          label: {
            borderColor: '#ea580c',
            style: { color: '#fff', background: '#ea580c', fontSize: '10px', fontWeight: 700 },
            text: 'THI 80 (เริ่มกระทบน้ำนม)'
          }
        },
        {
          y: 84,
          borderColor: '#e11d48',
          strokeDashArray: 4,
          label: {
            borderColor: '#e11d48',
            style: { color: '#fff', background: '#e11d48', fontSize: '10px', fontWeight: 700 },
            text: 'THI 84 (วิกฤตรุนแรง)'
          }
        }
      ]
    } : {},
    tooltip: {
      theme: 'light',
      shared: true
    },
    grid: {
      borderColor: '#f0f4f2',
      strokeDashArray: 4
    }
  }
})

// Lifecycle
onMounted(() => {
  fetchFarmDetail()
  if (isAutoSync.value) {
    startAutoSync()
  }
})

onUnmounted(() => {
  stopAutoSync()
})
</script>

<style scoped>
/* Smart Barn Telemetry Cockpit scoped styles */
</style>
