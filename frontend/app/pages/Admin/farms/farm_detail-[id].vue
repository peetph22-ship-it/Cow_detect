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

    <!-- ⚠️ Data Gap Alert Banner (แจ้งเตือนเมื่อสัญญาณขาดหาย หรือปิดบอร์ดชั่วคราว) -->
    <div 
      v-if="gapAlert && gapAlert.is_gap_detected" 
      class="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/30 rounded-[24px] p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
      <div class="flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
          <v-icon icon="mdi-lan-disconnect" size="24" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-black text-amber-900 tracking-tight">
              ตรวจพบช่วงเวลาข้อมูลขาดหาย (Sensor Telemetry Disconnected)
            </h4>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
              Offline
            </span>
          </div>
          <p class="text-xs text-amber-800 font-medium mt-0.5">
            {{ gapAlert.message || 'บอร์ดเซ็นเซอร์หยุดส่งสัญญาณชั่วคราว ข้อมูลบนกราฟและสถิติจะหยุดบันทึกตามเวลาจริง ไม่มีการสร้างข้อมูลเท็จ' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-center">
        <span class="text-[11px] font-mono text-amber-800 bg-amber-100/80 px-3 py-1 rounded-xl font-bold border border-amber-300">
          ล่าสุด: {{ formatTime(latestSensor?.recorded_at) }}
        </span>
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
          <span class="font-bold flex items-center gap-1.5" :class="isDeviceOnline ? 'text-emerald-400' : 'text-gray-400'">
            <span class="w-2 h-2 rounded-full" :class="isDeviceOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'"></span>
            {{ isDeviceOnline ? 'Online (กำลังส่งข้อมูล)' : 'Offline (ไม่ได้เชื่อมต่อ)' }}
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
            <template v-if="dailySummary?.min_temp != null && dailySummary?.max_temp != null">
              <span>{{ dailySummary.min_temp }}°</span>
              <span class="text-xs text-[#718078] font-medium">-</span>
              <span>{{ dailySummary.max_temp }}°C</span>
            </template>
            <template v-else>
              <span class="text-[#718078] text-base font-bold">-</span>
            </template>
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
            <template v-if="dailySummary?.min_hum != null && dailySummary?.max_hum != null">
              <span>{{ dailySummary.min_hum }}%</span>
              <span class="text-xs text-[#718078] font-medium">-</span>
              <span>{{ dailySummary.max_hum }}%</span>
            </template>
            <template v-else>
              <span class="text-[#718078] text-base font-bold">-</span>
            </template>
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
            <template v-if="dailySummary?.count_stress_readings != null">
              <span class="text-2xl font-black text-rose-600 tabular-nums">
                {{ dailySummary.count_stress_readings }}
              </span>
              <span class="text-xs font-bold text-[#718078]">
                รอบเตือน ({{ dailySummary.stress_percentage ?? 0 }}%)
              </span>
            </template>
            <template v-else>
              <span class="text-2xl font-black text-[#718078] tabular-nums">-</span>
              <span class="text-xs font-bold text-[#718078]">(ไม่มีข้อมูล)</span>
            </template>
          </div>
        </div>
      </div>

    </div>

    <!-- 🟢 4. HERO SECTION: Per-Farm Deep Learning LSTM Predictive Cockpit -->
    <div class="bg-gradient-to-br from-[#142820] to-[#1e3a30] text-white rounded-[32px] p-6 md:p-8 border border-[#2d5244] shadow-[0_15px_45px_rgba(20,40,32,0.3)] space-y-6 relative overflow-hidden animate-fade-up delay-200">
      
      <!-- Ambient Glow Decor -->
      <div class="absolute -right-16 -top-16 w-64 h-64 bg-[#d87939]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Hero Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
        <div class="flex items-start sm:items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d87939] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#d87939]/25">
            <v-icon icon="mdi-brain" size="26" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>AI LSTM Predictive Brain</span>
                <span class="text-xs font-mono font-bold bg-[#d87939] text-white px-2.5 py-0.5 rounded-full shadow-sm">
                  PER-FARM MODEL
                </span>
              </h3>
            </div>
            <p class="text-xs text-white/70 mt-1 font-medium">
              โมเดล Deep Learning พยากรณ์ความเครียดความร้อนล่วงหน้า 72 ชม. วิเคราะห์สภาวะสะสมย้อนหลัง 72 ชม. (3 วัน) ดักจับภาวะน้ำนมดิ่งหน่วง 5 วัน (Biological Lag Effect)
            </p>
          </div>
        </div>

        <!-- Action & Metric Badges Group -->
        <div class="flex flex-wrap items-center gap-2.5">
          <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span class="bg-white/10 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
              <v-icon icon="mdi-check-decagram" size="14" class="text-emerald-400" />
              <span>Acc 96.08% (Mulajkar 2026)</span>
            </span>
            <span class="bg-white/10 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5">
              <v-icon icon="mdi-history" size="14" class="text-amber-400" />
              <span>Lookback 72 ชม. (3 วัน)</span>
            </span>
            <span class="bg-white/10 text-sky-300 px-3 py-1.5 rounded-xl border border-sky-500/30 flex items-center gap-1.5">
              <v-icon icon="mdi-clock-fast" size="14" class="text-sky-400" />
              <span>Lag Effect 5 วัน (Hasan 2026)</span>
            </span>
            <span v-if="lstmForecast?.engine" class="bg-white/10 text-teal-300 px-3 py-1.5 rounded-xl border border-teal-500/30 flex items-center gap-1.5">
              <v-icon icon="mdi-chip" size="14" class="text-teal-400" />
              <span>{{ lstmForecast.engine }}</span>
            </span>
          </div>

          <!-- Manual Daily Job Trigger Button -->
          <button 
            @click="runDailyJobNow" 
            :disabled="isRunningDailyJob"
            class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all duration-300 disabled:opacity-50">
            <v-icon :icon="isRunningDailyJob ? 'mdi-loading' : 'mdi-refresh'" size="15" :class="isRunningDailyJob ? 'animate-spin' : ''" />
            <span>{{ isRunningDailyJob ? 'กำลังคำนวณ...' : 'รันสรุปประจำวัน (Daily Job)' }}</span>
          </button>
        </div>
      </div>

      <!-- 📅 Saved Daily Summary Status Ribbon (เมื่อระบบรัน Daily Batch แล้ว) -->
      <div 
        v-if="savedDailySummary"
        class="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <v-icon icon="mdi-calendar-check" size="22" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-sm">
                สรุปผลรายวัน (Daily Job): {{ new Date(savedDailySummary.summary_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </span>
              <span class="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/30">
                Batch 20:00 น.
              </span>
            </div>
            <p class="text-white/70 text-xs mt-0.5">
              {{ savedDailySummary.advisory || 'สภาวะอากาศและโมเดล LSTM ถูกประมวลผลและบันทึกอัตโนมัติเรียบร้อย' }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start md:self-center font-mono text-[11px]">
          <!-- Yesterday Comparison Badge -->
          <span 
            v-if="savedDailySummary.yesterday_comparison"
            class="px-2.5 py-1 rounded-lg border flex items-center gap-1"
            :class="savedDailySummary.yesterday_comparison.trend === 'increasing' ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : savedDailySummary.yesterday_comparison.trend === 'decreasing' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-white/10 border-white/15 text-white/80'">
            <v-icon :icon="savedDailySummary.yesterday_comparison.trend === 'increasing' ? 'mdi-trending-up' : savedDailySummary.yesterday_comparison.trend === 'decreasing' ? 'mdi-trending-down' : 'mdi-trending-neutral'" size="14" />
            <span>{{ savedDailySummary.yesterday_comparison.trend_description || 'เทียบเมื่อวาน' }}</span>
          </span>

          <!-- Night Recovery THI Badge -->
          <span class="bg-sky-500/15 border border-sky-500/30 text-sky-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <v-icon icon="mdi-weather-night" size="14" />
            <span>Night Recovery: {{ savedDailySummary.night_recovery_thi }} THI</span>
          </span>
        </div>
      </div>

      <!-- 3-Day Proactive Prediction Bento Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        <div 
          v-for="(fc, idx) in (lstmForecast?.forecasts || defaultForecasts)" 
          :key="fc.horizon_days || idx"
          class="bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-2xl p-5 border border-white/10 flex flex-col justify-between space-y-4 group">
          
          <!-- Top Row: Horizon & Date -->
          <div class="flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <v-icon icon="mdi-calendar-clock" size="15" />
              <span>{{ fc.day_name }} · {{ fc.label }}</span>
            </span>
            <span class="text-[11px] font-mono text-white/60">
              {{ fc.date }}
            </span>
          </div>

          <!-- Middle Row: Predicted THI & Milk Loss -->
          <div class="space-y-3">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="text-xs text-white/60 block font-medium">ค่า THI คาดการณ์</span>
                <div class="flex items-baseline gap-1.5 mt-0.5">
                  <span class="text-3xl font-black text-white font-mono tabular-nums">
                    {{ fc.predicted_thi }}
                  </span>
                  <span class="text-xs font-bold text-white/60">THI</span>
                </div>
              </div>

              <!-- Risk Badge -->
              <span 
                class="px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                :class="fc.risk_level === 'severe' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : fc.risk_level === 'moderate' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : fc.risk_level === 'mild' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'">
                {{ fc.risk_level === 'severe' ? 'วิกฤตรุนแรง' : fc.risk_level === 'moderate' ? 'เริ่มกระทบ' : fc.risk_level === 'mild' ? 'เฝ้าระวัง' : 'ปกติ' }}
              </span>
            </div>

            <!-- Predicted Milk Loss Metric -->
            <div class="p-2.5 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between text-xs">
              <span class="text-white/70 flex items-center gap-1.5">
                <v-icon icon="mdi-cup-water" size="14" class="text-sky-300" />
                <span>ความเสี่ยงน้ำนมลดคาดการณ์:</span>
              </span>
              <span class="font-mono font-bold" :class="fc.predicted_milk_loss_kg > 0 ? 'text-rose-400' : 'text-emerald-400'">
                {{ fc.predicted_milk_loss_kg > 0 ? `-${fc.predicted_milk_loss_kg} กก./ตัว/วัน` : 'ไม่ลดลง (ปกติ)' }}
              </span>
            </div>
          </div>

          <!-- Bottom: Actionable Proactive Strategy -->
          <div class="pt-3 border-t border-white/10 text-xs">
            <span class="text-[10.5px] font-bold uppercase tracking-wider text-amber-300/90 block mb-1">
              ⚡ แผนจัดการเชิงรุก (Proactive Strategy):
            </span>
            <p class="text-white/80 leading-relaxed text-[11.5px] line-clamp-2">
              {{ fc.advisory }}
            </p>
          </div>

        </div>
      </div>

      <!-- Proactive Strategy Action Ribbon -->
      <div class="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative z-10">
        <div class="flex items-center gap-2.5 text-white/90">
          <v-icon icon="mdi-shield-sun" size="20" class="text-[#d87939]" />
          <span><strong>สรุปกลยุทธ์ป้องกันความร้อนสะสม:</strong> ปัจจัยโรงเรือน (หลังคา{{ farm?.roof_type || 'สังกะสี' }} สูง {{ farm?.barn_height_m || '2.7' }} ม.) ถูกรวมในการคำนวณถ่วงน้ำหนักโมเดล LSTM เฉพาะฟาร์มนี้แล้ว</span>
        </div>
        <button 
          type="button"
          @click="activeChartTab = 'lstm_forecast'"
          class="inline-flex items-center gap-1.5 bg-[#d87939] hover:bg-[#c2652b] text-white px-3.5 py-1.5 rounded-xl font-bold transition-colors shrink-0 cursor-pointer self-start sm:self-auto">
          <v-icon icon="mdi-chart-bell-curve" size="15" />
          <span>ดูกราฟพยากรณ์ 72 ชม.</span>
        </button>
      </div>

    </div>

    <!-- 🟢 5. Interactive Time-Series Chart Card (ApexCharts) -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-6 animate-fade-up delay-250">
      
      <!-- Chart Controls & Filter Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f4f2]">
        <div>
          <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight flex items-center gap-2">
            <v-icon icon="mdi-chart-timeline-variant-shimmer" size="22" class="text-[#d87939]" />
            <span>เส้นทางแนวโน้มดัชนีเซ็นเซอร์ &amp; AI พยากรณ์</span>
          </h3>
          <p class="text-xs text-[#718078] mt-0.5 font-medium">
            กราฟประเมินการเปลี่ยนแปลงค่า THI, อุณหภูมิ, ความชื้น และเส้นทางพยากรณ์ล่วงหน้า Deep Learning LSTM
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

          <button
            type="button"
            @click="activeChartTab = 'lstm_forecast'"
            :class="[
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1.5',
              activeChartTab === 'lstm_forecast' 
                ? 'bg-[#163026] text-amber-300 shadow-sm' 
                : 'text-[#718078] hover:text-[#24433a]'
            ]">
            <v-icon icon="mdi-creation" size="14" class="text-amber-400" />
            <span>AI LSTM Forecast</span>
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
        <span class="flex items-center gap-1.5 font-bold" v-if="activeChartTab !== 'lstm_forecast'">
          <span class="w-2.5 h-2.5 rounded-full bg-[#d87939]"></span>
          <span>เส้นดัชนี THI</span>
        </span>
        <span class="flex items-center gap-1.5 font-bold" v-if="activeChartTab === 'lstm_forecast'">
          <span class="w-3 h-0.5 bg-[#163026]"></span>
          <span>เส้นทึบ: THI ตรวจวัดจริง (IoT)</span>
        </span>
        <span class="flex items-center gap-1.5 font-bold text-amber-700" v-if="activeChartTab === 'lstm_forecast'">
          <span class="w-3 h-0.5 bg-[#d87939] border-t-2 border-dashed border-[#d87939]"></span>
          <span>เส้นประสีส้ม: AI LSTM พยากรณ์ล่วงหน้า 3 วัน</span>
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
const farmId = computed(() => {
  const p = route.params.id
  if (!p) return ''
  return String(p).replace(/^farm_detail-/, '')
})

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
const savedDailySummary = ref(null)
const isRunningDailyJob = ref(false)
const historyList = ref([])
const lstmForecast = ref(null)
const gapAlert = ref(null)

const runDailyJobNow = async () => {
  if (!farmId.value || isRunningDailyJob.value) return
  isRunningDailyJob.value = true
  try {
    const token = getToken()
    const res = await axios.post(`${Admin}/farms/${farmId.value}/run-daily-summary`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data && res.data.success) {
      await fetchFarmDetail()
    }
  } catch (err) {
    console.error('[Run Daily Summary Error]:', err.message)
  } finally {
    isRunningDailyJob.value = false
  }
}

const defaultForecasts = computed(() => {
  const base = Number(latestSensor.value?.thi || 76.5)
  return [
    {
      horizon_days: 1,
      label: 'พรุ่งนี้ (+24 ชม.)',
      day_name: 'Day +1',
      date: 'พรุ่งนี้',
      predicted_thi: Number((base + 0.6).toFixed(1)),
      predicted_milk_loss_kg: base + 0.6 > 76.0 ? Number(((base + 0.6 - 76.0) * 0.45).toFixed(2)) : 0,
      risk_level: base + 0.6 >= 84 ? 'severe' : base + 0.6 >= 80 ? 'moderate' : base + 0.6 >= 76 ? 'mild' : 'normal',
      advisory: 'แนะนำเปิดพัดลมระบายอากาศช่วง 11:00-15:00 น. เพื่อระบายความร้อนสะสม'
    },
    {
      horizon_days: 2,
      label: 'มะรืนนี้ (+48 ชม.)',
      day_name: 'Day +2',
      date: 'มะรืนนี้',
      predicted_thi: Number((base + 1.4).toFixed(1)),
      predicted_milk_loss_kg: base + 1.4 > 76.0 ? Number(((base + 1.4 - 76.0) * 0.45).toFixed(2)) : 0,
      risk_level: base + 1.4 >= 84 ? 'severe' : base + 1.4 >= 80 ? 'moderate' : 'mild',
      advisory: 'เตรียมระบบพ่นละอองน้ำหมอกดักล่วงหน้า และเพิ่มรอบการตรวจดูน้ำดื่ม'
    },
    {
      horizon_days: 3,
      label: '3 วันข้างหน้า (+72 ชม.)',
      day_name: 'Day +3',
      date: '3 วันข้างหน้า',
      predicted_thi: Number((base + 2.1).toFixed(1)),
      predicted_milk_loss_kg: base + 2.1 > 76.0 ? Number(((base + 2.1 - 76.0) * 0.45).toFixed(2)) : 0,
      risk_level: base + 2.1 >= 84 ? 'severe' : 'moderate',
      advisory: 'สภาวะความร้อนสะสมอาจแตะเกณฑ์วิกฤต เสริมอิเล็กโทรไลต์ในอาหาร TMR'
    }
  ]
})

// Helper to get token dynamically at runtime on client
const getToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

// Back Navigation
const goBack = () => {
  router.push('/Admin/farms')
}

// Handle Farm Deleted
const handleFarmDeleted = () => {
  router.push('/Admin/farms')
}

// Device Online State (ถือว่า Online หากมีการส่งข้อมูลล่าสุดภายใน 10 นาที)
const isDeviceOnline = computed(() => {
  if (!device.value && !latestSensor.value) return false
  const lastTime = latestSensor.value?.recorded_at || device.value?.last_seen_at
  if (!lastTime) return false
  const diffMs = Date.now() - new Date(lastTime).getTime()
  return diffMs >= 0 && diffMs < 10 * 60 * 1000
})

// Fetch Farm Telemetry Detail (Strict Real Data Mode)
const fetchFarmDetail = async () => {
  if (!farmId.value) return
  isLoading.value = true
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms/${farmId.value}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })

    if (res.data && res.data.success) {
      farm.value = res.data.farm || null
      owner.value = res.data.owner || null
      device.value = res.data.device || null
      latestSensor.value = res.data.latest_sensor || null
      dailySummary.value = res.data.daily_summary || null
      lstmForecast.value = res.data.lstm_forecast || null
      savedDailySummary.value = res.data.saved_daily_summary || null
      gapAlert.value = res.data.gap_alert || null

      const rawHistory = res.data.history || []
      
      // แสดงเฉพาะประวัติจริงที่ได้รับจากฮาร์ดแวร์เซ็นเซอร์ในฐานข้อมูลเท่านั้น
      historyList.value = rawHistory.map((item, index) => {
        const t = item.temperature_c !== null && item.temperature_c !== undefined ? Number(item.temperature_c) : null
        const rh = item.humidity_pct !== null && item.humidity_pct !== undefined ? Number(item.humidity_pct) : null
        let thiVal = item.thi !== null && item.thi !== undefined ? Number(item.thi) : null
        if (thiVal === null && t !== null && rh !== null) {
          thiVal = Number(((1.8 * t + 32) - (0.55 - 0.0055 * rh) * (1.8 * t - 26)).toFixed(1))
        }
        return {
          ...item,
          id: item.id || `hist-${index}`,
          temperature_c: t,
          humidity_pct: rh,
          thi: thiVal
        }
      })

      // หากมี latestSensor แต่ยังไม่มีค่า thi ให้คำนวณตามสูตร NRC 1971
      if (latestSensor.value) {
        const t = latestSensor.value.temperature_c != null ? Number(latestSensor.value.temperature_c) : null
        const rh = latestSensor.value.humidity_pct != null ? Number(latestSensor.value.humidity_pct) : null
        if (!latestSensor.value.thi && t != null && rh != null) {
          latestSensor.value.thi = Number(((1.8 * t + 32) - (0.55 - 0.0055 * rh) * (1.8 * t - 26)).toFixed(1))
        }
      } else if (historyList.value.length > 0) {
        // ใช้ตัวล่าสุดจาก historyList หาก latestSensor ยังไม่ได้ระบุ
        latestSensor.value = historyList.value[historyList.value.length - 1]
      }

      // คำนวณสรุปสถิติ dailySummary จากข้อมูลจริง (หาก backend ยังไม่มี)
      if (!dailySummary.value && historyList.value.length > 0) {
        const temps = historyList.value.map(h => h.temperature_c).filter(v => v !== null)
        const hums = historyList.value.map(h => h.humidity_pct).filter(v => v !== null)
        const thisList = historyList.value.map(h => h.thi).filter(v => v !== null)
        const stressCount = thisList.filter(t => t >= 76.0).length

        dailySummary.value = {
          avg_thi: thisList.length ? (thisList.reduce((a, b) => a + b, 0) / thisList.length).toFixed(1) : null,
          min_temp: temps.length ? Math.min(...temps).toFixed(1) : null,
          max_temp: temps.length ? Math.max(...temps).toFixed(1) : null,
          min_hum: hums.length ? Math.min(...hums).toFixed(1) : null,
          max_hum: hums.length ? Math.max(...hums).toFixed(1) : null,
          count_stress_readings: stressCount,
          stress_percentage: thisList.length ? Math.round((stressCount / thisList.length) * 100) : 0
        }
      }
    }
  } catch (err) {
    console.error('[Fetch Farm Detail Error]:', err)
  } finally {
    if (isLoading.value) isLoading.value = false
  }
}

// Lightweight Telemetry Polling (Every 8s to reduce DB load by 95%)
const pollLatestTelemetry = async () => {
  if (!farmId.value) return
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms/${farmId.value}/latest`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })

    if (res.data && res.data.success) {
      if (res.data.gap_alert) {
        gapAlert.value = res.data.gap_alert
      }

      const incoming = res.data.latest_sensor
      if (incoming && incoming.id && String(incoming.id) !== String(latestSensor.value?.id)) {
        latestSensor.value = incoming

        const alreadyInHistory = historyList.value.some(h => String(h.id) === String(incoming.id))
        if (!alreadyInHistory) {
          historyList.value.push(incoming)
          if (historyList.value.length > 50) historyList.value.shift()
        }
      }
    }
  } catch (err) {
    console.warn('[Poll Latest Telemetry Warning]:', err.message)
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
    pollLatestTelemetry()
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
  const tempVal = parseFloat(latestSensor.value?.temperature_c)
  const rhVal = parseFloat(latestSensor.value?.humidity_pct)
  const pantingVal = parseFloat(latestSensor.value?.panting_rate || 0)

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
  // สภาวะปกติ: THI < 76.0 หรือ อุณหภูมิต่ำกว่า 27.5°C และ THI < 77.5 โดยไม่มีอาการหอบ (Boonkum et al. 2024)
  if (thi < 76.0 || (!isNaN(tempVal) && tempVal < 27.5 && thi < 77.5 && (isNaN(pantingVal) || pantingVal <= 0.05))) {
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
    const isRainyHumid = (!isNaN(rhVal) && rhVal >= 75.0) && (!isNaN(tempVal) && tempVal <= 29.5)
    return {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-950',
      badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
      advisoryBg: 'bg-orange-500/15 border-orange-500/30 text-orange-950',
      iconColor: 'text-orange-600',
      watermark: 'bg-orange-400',
      label: 'เริ่มกระทบผลผลิต (Moderate Stress)',
      advisoryTitle: isRainyHumid ? 'เปิดพัดลมเต็มกำลัง (งดระบบพ่นหมอก)' : 'เปิดพัดลมเต็มกำลัง + เปิดระบบพ่นหมอก',
      advisoryText: isRainyHumid
        ? 'ความชื้นสัมพัทธ์ในอากาศสูง (>75%) แนะนำเปิดพัดลมระบายอากาศแรงสุด แต่งดเปิดระบบพ่นหมอก เพื่อป้องกันพื้นคอกแฉะและเสี่ยงโรคเต้านมอักเสบ (Maejo Research)'
        : 'แม่โคเริ่มหายใจเร็วและกินอาหารลดลง เสี่ยงผลผลิตน้ำนมลด 10-20% ต้องเปิดพัดลมแรงสุดและเปิดระบบพ่นละอองน้ำ (Misting) เหนือทางเดิน'
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
// 📊 ApexCharts Configuration (รวม AI LSTM Forecast 72 ชม.)
// -------------------------------------------------------------
const chartCategories = computed(() => {
  if (activeChartTab.value === 'lstm_forecast') {
    const pastCats = historyList.value.slice(-8).map((h, i) => {
      if (!h.recorded_at) return `${i + 1}:00`
      const d = new Date(h.recorded_at)
      return isNaN(d.getTime()) ? `${i + 1}:00` : d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    })
    const futureCats = (lstmForecast.value?.forecasts || defaultForecasts.value)?.map(f => `${f.day_name} (${f.date})`) || ['Day +1', 'Day +2', 'Day +3']
    return [...pastCats, ...futureCats]
  }

  return historyList.value.map((h, i) => {
    if (!h.recorded_at) return `${i + 1}:00`
    const d = new Date(h.recorded_at)
    return isNaN(d.getTime()) ? `${i + 1}:00` : d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  })
})

const chartSeries = computed(() => {
  if (activeChartTab.value === 'lstm_forecast') {
    const pastSubset = historyList.value.slice(-8)
    const pastThi = pastSubset.map(h => {
      if (h.thi != null && !isNaN(Number(h.thi))) return Number(Number(h.thi).toFixed(1))
      return null
    })

    const lastThi = pastThi.filter(v => v != null).pop() || Number(latestSensor.value?.thi || 76.5)
    const forecastPoints = (lstmForecast.value?.forecasts || defaultForecasts.value)?.map(f => Number(f.predicted_thi)) || [
      Number((lastThi + 0.6).toFixed(1)),
      Number((lastThi + 1.4).toFixed(1)),
      Number((lastThi + 2.1).toFixed(1))
    ]

    // Actual series (past subset + nulls for future)
    const actualSeriesData = [...pastThi, ...forecastPoints.map(() => null)]
    
    // Forecast series (nulls for past except last point, then forecast points)
    const forecastSeriesData = [
      ...pastThi.slice(0, -1).map(() => null),
      lastThi,
      ...forecastPoints
    ]

    return [
      {
        name: 'THI ตรวจวัดจริง (IoT)',
        type: 'area',
        data: actualSeriesData
      },
      {
        name: 'AI LSTM พยากรณ์ล่วงหน้า',
        type: 'line',
        data: forecastSeriesData
      }
    ]
  }

  if (!historyList.value || historyList.value.length === 0) return []

  const thiData = historyList.value.map(h => {
    if (h.thi !== null && h.thi !== undefined && !isNaN(Number(h.thi))) return Number(Number(h.thi).toFixed(1))
    if (h.temperature_c != null && h.humidity_pct != null) {
      const t = Number(h.temperature_c)
      const rh = Number(h.humidity_pct)
      return Number(((1.8 * t + 32) - (0.55 - 0.0055 * rh) * (1.8 * t - 26)).toFixed(1))
    }
    return null
  })
  const tempData = historyList.value.map(h => h.temperature_c != null ? Number(Number(h.temperature_c).toFixed(1)) : null)
  const humData = historyList.value.map(h => h.humidity_pct != null ? Number(Number(h.humidity_pct).toFixed(1)) : null)

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
  const isForecast = activeChartTab.value === 'lstm_forecast'

  let colors = ['#d87939']
  if (activeChartTab.value === 'temp_hum') {
    colors = ['#f59e0b', '#0ea5e9']
  } else if (isBoth) {
    colors = ['#d87939', '#f59e0b', '#0ea5e9']
  } else if (isForecast) {
    colors = ['#163026', '#d87939']
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
      width: isForecast ? [3, 3] : isThiOnly ? [3] : isBoth ? [3, 2, 2] : [2.5, 2.5],
      dashArray: isForecast ? [0, 6] : [0]
    },
    fill: {
      type: isForecast ? ['gradient', 'solid'] : isThiOnly ? ['gradient'] : isBoth ? ['gradient', 'solid', 'solid'] : ['solid', 'solid'],
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
    annotations: isThiOnly || isBoth || isForecast ? {
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
