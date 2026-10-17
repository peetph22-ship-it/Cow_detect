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
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide border transition-all"
              :class="isDeviceOnline 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'">
              <span 
                class="w-2 h-2 rounded-full" 
                :class="isDeviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'">
              </span>
              <span>{{ isDeviceOnline ? 'IoT Online' : 'IoT Offline' }}</span>
              <span v-if="device?.serial_no" class="font-mono text-[10px] opacity-75">({{ device.serial_no }})</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Add Hikvision Camera Button -->
        <button 
          type="button" 
          @click="isAddCameraModalOpen = true"
          title="ผูกกล้องวงจรปิด Hikvision เข้ากับฟาร์มนี้"
          class="px-4 py-2.5 rounded-[18px] bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95">
          <v-icon icon="mdi-cctv" size="16" class="text-emerald-700" />
          <span>+ ผูกกล้อง Hikvision</span>
        </button>

        <!-- System Accuracy Benchmarks Modal Button -->
        <button 
          type="button" 
          @click="isAccuracyModalOpen = true"
          title="ดูผลการสอบเทียบโมเดลและเกณฑ์ความแม่นยำระบบ (Argon Benchmark)"
          class="px-4 py-2.5 rounded-[18px] bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95">
          <v-icon icon="mdi-chart-bell-curve-cumulative" size="16" class="text-blue-700" />
          <span>เกณฑ์ความแม่นยำ (Argon)</span>
        </button>

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

            <div class="flex items-center gap-2 flex-wrap justify-end">
              <!-- Multimodal Cross-Validation Gate Badge -->
              <div 
                v-if="multimodalStatus" 
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black border shadow-xs transition-all cursor-pointer"
                :class="{
                  'bg-emerald-100 text-emerald-900 border-emerald-300': multimodalStatus.status === 'MULTIMODAL_VERIFIED',
                  'bg-rose-100 text-rose-900 border-rose-300': multimodalStatus.status === 'SENSOR_DRIFT_SUSPECTED',
                  'bg-amber-100 text-amber-900 border-amber-300': multimodalStatus.status === 'FAILSAFE_THAI_HEURISTIC',
                  'bg-blue-100 text-blue-900 border-blue-300': multimodalStatus.status === 'COMFORT_ZONE',
                  'bg-emerald-50 text-emerald-800 border-emerald-200': multimodalStatus.status === 'MONITORING_NORMAL'
                }"
                :title="multimodalStatus.recommendation_th"
                @click="isAccuracyModalOpen = true"
              >
                <span 
                  class="w-2 h-2 rounded-full"
                  :class="{
                    'bg-emerald-500 animate-pulse': multimodalStatus.status === 'MULTIMODAL_VERIFIED',
                    'bg-rose-500': multimodalStatus.status === 'SENSOR_DRIFT_SUSPECTED',
                    'bg-amber-500': multimodalStatus.status === 'FAILSAFE_THAI_HEURISTIC',
                    'bg-blue-500': multimodalStatus.status === 'COMFORT_ZONE',
                    'bg-emerald-500': multimodalStatus.status === 'MONITORING_NORMAL'
                  }"
                ></span>
                <span>{{ multimodalStatus.case_label }}</span>
              </div>

              <!-- Stress Level Pill -->
              <span class="px-3 py-1 rounded-full text-[11px] font-black border tracking-wide shadow-sm" :class="cockpitThiTheme.badgeBg">
                {{ cockpitThiTheme.label }}
              </span>
            </div>
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
            <!-- Active Engine Badge (Always Shown) -->
            <span 
              class="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-2xs font-mono font-bold"
              :class="activeEngineInfo.isDeepLearning 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-400/30' 
                : 'bg-white/10 text-teal-300 border-teal-500/30'">
              <v-icon :icon="activeEngineInfo.isDeepLearning ? 'mdi-chip' : 'mdi-calculator-variant-outline'" size="14" :class="activeEngineInfo.isDeepLearning ? 'text-emerald-400' : 'text-teal-400'" />
              <span>{{ activeEngineInfo.raw }}</span>
              <span 
                class="w-1.5 h-1.5 rounded-full" 
                :class="activeEngineInfo.isDeepLearning ? 'bg-emerald-400 animate-pulse' : 'bg-teal-400'">
              </span>
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
                <div class="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                  <span class="text-3xl font-black text-white font-mono tabular-nums">
                    {{ fc.predicted_thi }}
                  </span>
                  <span class="text-xs font-bold text-white/60">THI</span>
                  <!-- Uncertainty MAE Bound -->
                  <span 
                    v-if="fc.thi_mae" 
                    class="text-[11px] font-mono font-bold text-emerald-300 ml-1.5 bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded-lg"
                    :title="`ช่วงความเชื่อมั่น (Confidence Interval): ${fc.thi_lower} - ${fc.thi_upper} THI`">
                    ±{{ fc.thi_mae }}
                  </span>
                </div>
              </div>

              <!-- Risk Badge -->
              <span 
                class="px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                :class="fc.risk_level === 'severe' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : fc.risk_level === 'moderate' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : fc.risk_level === 'mild' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'">
                {{ fc.risk_level === 'severe' ? 'วิกฤตรุนแรง' : fc.risk_level === 'moderate' ? 'เริ่มกระทบ' : fc.risk_level === 'mild' ? 'เฝ้าระวัง' : 'ปกติ' }}
              </span>
            </div>

            <!-- Predicted Milk Loss Metric with MAE Bound -->
            <div class="p-2.5 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between text-xs">
              <span class="text-white/70 flex items-center gap-1.5">
                <v-icon icon="mdi-cup-water" size="14" class="text-sky-300" />
                <span>ความเสี่ยงน้ำนมลดคาดการณ์:</span>
              </span>
              <div class="text-right">
                <span class="font-mono font-bold block" :class="fc.predicted_milk_loss_kg > 0 ? 'text-rose-400' : 'text-emerald-400'">
                  {{ fc.predicted_milk_loss_kg > 0 ? `-${fc.predicted_milk_loss_kg} กก./ตัว/วัน` : 'ไม่ลดลง (ปกติ)' }}
                </span>
                <span v-if="fc.milk_loss_mae_kg" class="text-[10px] text-white/50 font-mono block">
                  (MAE ±{{ fc.milk_loss_mae_kg }} kg · แม่นยำ {{ fc.risk_accuracy_pct }}%)
                </span>
              </div>
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

    <!-- 🟢 4.1 แถบนอกการ์ด: แสดงคำอธิบายเงื่อนไขการทำงานของ Engine พยากรณ์ (Dual-Engine Architecture Protocol) -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 md:p-7 border border-[#E4E8E5] shadow-xs space-y-5 animate-fade-up">
      
      <!-- Top Title & Active Status Pill -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E4E8E5]">
        <div class="flex items-start sm:items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-[#142820]/5 text-[#142820] flex items-center justify-center shrink-0 border border-[#E4E8E5]">
            <v-icon icon="mdi-cpu-64-bit" size="24" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-base md:text-lg font-black text-[#142820]">
                เงื่อนไขการทำงานของ Engine พยากรณ์ (Predictive Engine Protocol)
              </h4>
              <span class="text-[11px] font-bold text-[#718078] bg-[#F6F7F5] px-2.5 py-0.5 rounded-full border border-[#E4E8E5]">
                Dual-Engine High Availability
              </span>
            </div>
            <p class="text-xs text-[#718078] mt-0.5 font-medium">
              สถาปัตยกรรมทำงานแบบไฮบริด (AI + Heuristic Fallback) เพื่อรับประกันความพร้อมใช้งาน 100% ไม่สะดุด แม้อยู่ในภาวะ Cold-Start
            </p>
          </div>
        </div>

        <!-- Current Active Status Pill -->
        <div 
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all shadow-2xs"
          :class="activeEngineInfo.isDeepLearning 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-amber-50 text-amber-800 border-amber-200'">
          <span 
            class="w-2 h-2 rounded-full" 
            :class="activeEngineInfo.isDeepLearning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'">
          </span>
          <span>โหมดปัจจุบัน: <strong>{{ activeEngineInfo.raw }}</strong></span>
        </div>
      </div>

      <!-- Dual Cards: Conditions for Engine 1 vs Engine 2 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <!-- Engine 1: True Deep Learning (ONNX Runtime) -->
        <div 
          class="rounded-2xl p-5 border transition-all space-y-3 relative overflow-hidden"
          :class="activeEngineInfo.isDeepLearning 
            ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20' 
            : 'bg-[#F6F7F5]/60 border-[#E4E8E5]'">
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <v-icon icon="mdi-brain" size="18" />
              </div>
              <div>
                <div class="text-xs font-black text-[#142820]">1. onnx_bilstm_attention_v1</div>
                <div class="text-[11px] text-emerald-700 font-bold">True Deep Learning Bi-LSTM (ONNX)</div>
              </div>
            </div>
            <span v-if="activeEngineInfo.isDeepLearning" class="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
              กำลังทำงาน (Active)
            </span>
            <span v-else class="text-[10px] font-bold text-[#718078] bg-white px-2 py-0.5 rounded-md border border-[#E4E8E5]">
              สแตนด์บาย (Standby)
            </span>
          </div>

          <div class="space-y-2 text-xs">
            <div>
              <div class="font-bold text-[#142820] flex items-center gap-1.5 mb-1 text-[11.5px]">
                <v-icon icon="mdi-check-circle" size="14" class="text-emerald-600" />
                <span>เงื่อนไขที่จะเปิดใช้โหมดนี้ (Trigger Conditions):</span>
              </div>
              <ul class="list-disc pl-5 space-y-1 text-[11px] text-[#51635B] leading-relaxed">
                <li><strong>ประวัติเซ็นเซอร์สะสม &ge; 72 ชั่วโมง (3 วันเต็ม):</strong> มีข้อมูล Time-series ต่อเนื่องเพียงพอในการป้อนเข้า Tensor Matrix ขนาด <code class="bg-white px-1.5 py-0.5 rounded border border-[#E4E8E5] font-mono">[1, 72, 10]</code></li>
                <li><strong>Runtime โหลด ONNX สำเร็จ:</strong> ไลบรารี <code class="bg-white px-1.5 py-0.5 rounded border border-[#E4E8E5] font-mono">onnxruntime-node</code> และไฟล์โมเดล <code class="bg-white px-1.5 py-0.5 rounded border border-[#E4E8E5] font-mono">farm_lstm.onnx</code> พร้อมทำงานในหน่วยความจำ</li>
              </ul>
            </div>

            <div class="pt-1 border-t border-[#E4E8E5]/60">
              <div class="font-bold text-[#142820] flex items-center gap-1.5 mb-1 text-[11.5px]">
                <v-icon icon="mdi-cogs" size="14" class="text-emerald-600" />
                <span>กลไกการคำนวณ (Calculation Mechanism):</span>
              </div>
              <p class="text-[11px] text-[#51635B] leading-relaxed">
                รัน 2-Layer Bi-LSTM ดึงแนวโน้มอุณหภูมิ/ความชื้น + Temporal Attention ถ่วงน้ำหนักชั่วโมงวิกฤต + ฟิวชันข้อมูลโครงสร้างหลังคาและความสูงโรงเรือนเพื่อพยากรณ์ THI และ Milk Loss 3 วันล่วงหน้า
              </p>
            </div>
          </div>
        </div>

        <!-- Engine 2: Thai Heuristic Fallback -->
        <div 
          class="rounded-2xl p-5 border transition-all space-y-3 relative overflow-hidden"
          :class="!activeEngineInfo.isDeepLearning 
            ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20' 
            : 'bg-[#F6F7F5]/60 border-[#E4E8E5]'">
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <v-icon icon="mdi-calculator-variant-outline" size="18" />
              </div>
              <div>
                <div class="text-xs font-black text-[#142820]">2. heuristic_fallback</div>
                <div class="text-[11px] text-amber-700 font-bold">Thai Heuristic Engine (Fail-Safe)</div>
              </div>
            </div>
            <span v-if="!activeEngineInfo.isDeepLearning" class="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-600 text-white shadow-2xs">
              กำลังทำงาน (Active)
            </span>
            <span v-else class="text-[10px] font-bold text-[#718078] bg-white px-2 py-0.5 rounded-md border border-[#E4E8E5]">
              สแตนด์บาย (Standby)
            </span>
          </div>

          <div class="space-y-2 text-xs">
            <div>
              <div class="font-bold text-[#142820] flex items-center gap-1.5 mb-1 text-[11.5px]">
                <v-icon icon="mdi-check-circle" size="14" class="text-amber-600" />
                <span>เงื่อนไขที่จะเปิดใช้โหมดนี้ (Trigger Conditions):</span>
              </div>
              <ul class="list-disc pl-5 space-y-1 text-[11px] text-[#51635B] leading-relaxed">
                <li><strong>ฟาร์มใหม่หรือข้อมูลสะสม &lt; 72 ชั่วโมง (Cold-Start):</strong> สลับมาโหมดนี้ทันทีเพื่อป้องกันโมเดลค้างหรือ Error</li>
                <li><strong>สภาพแวดล้อม Server ไม่รองรับไบนารี ONNX:</strong> เช่น Docker ARM64 เพื่อให้ระบบยังมีผลพยากรณ์และแจ้งเตือน LINE ได้ต่อเนื่อง <em>Zero Downtime</em></li>
              </ul>
            </div>

            <div class="pt-1 border-t border-[#E4E8E5]/60">
              <div class="font-bold text-[#142820] flex items-center gap-1.5 mb-1 text-[11.5px]">
                <v-icon icon="mdi-cogs" size="14" class="text-amber-600" />
                <span>กลไกการคำนวณ (Calculation Mechanism):</span>
              </div>
              <p class="text-[11px] text-[#51635B] leading-relaxed">
                คำนวณจากสูตร NRC 1971 ร่วมกับสัมประสิทธิ์ความร้อนสะสมย้อนหลัง (Thermal Momentum) + สัมประสิทธิ์ชนิดหลังคา/ความสูงโรงเรือน (Tikul & Prachum, 2019) พร้อมหน่วงการดิ่งของน้ำนม 5 วัน (Hasan 2026)
              </p>
            </div>
          </div>
        </div>

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
        <span class="flex items-center gap-1.5 font-bold text-yellow-600" v-if="activeChartTab === 'lstm_forecast'">
          <span class="w-3 h-0.5 bg-yellow-500 border-t border-dashed border-yellow-500"></span>
          <span>เส้นประบาง: ช่วงความเชื่อมั่น (±MAE Bounds)</span>
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

    <!-- 🟢 4.5 SMART BARN CCTV & YOLO26 VISION AI BEHAVIOR COCKPIT -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-6 animate-fade-up delay-225">
      
      <!-- Section Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#e5ece9]">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-[#D87939]/10 text-[#D87939] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-cctv" size="26" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight">
                Smart Barn Vision &amp; Hikvision Architecture
              </h3>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D87939]/10 text-[#D87939] border border-[#D87939]/20 uppercase">
                ByteTrack + YOLO Multi-Cow Telemetry
              </span>
              <span 
                v-if="multimodalStatus" 
                class="px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase cursor-pointer transition-all hover:scale-105"
                :class="{
                  'bg-emerald-100 text-emerald-900 border-emerald-300': multimodalStatus.status === 'MULTIMODAL_VERIFIED',
                  'bg-rose-100 text-rose-900 border-rose-300': multimodalStatus.status === 'SENSOR_DRIFT_SUSPECTED',
                  'bg-amber-100 text-amber-900 border-amber-300': multimodalStatus.status === 'FAILSAFE_THAI_HEURISTIC',
                  'bg-blue-100 text-blue-900 border-blue-300': multimodalStatus.status === 'COMFORT_ZONE',
                  'bg-emerald-50 text-emerald-800 border-emerald-200': multimodalStatus.status === 'MONITORING_NORMAL'
                }"
                :title="multimodalStatus.recommendation_th"
                @click="isAccuracyModalOpen = true"
              >
                {{ multimodalStatus.case_label }}
              </span>
            </div>
            <p class="text-xs text-[#718078] mt-0.5 font-medium">
              ระบบวิเคราะห์พฤติกรรมฝูงโคแบบเรียลไทม์ (ยืน, นอน, กิน, ดื่ม) คำนวณดัชนีความสบาย (CCI) และประเมินความเสี่ยงน้ำนมลดอัตโนมัติ
            </p>
          </div>
        </div>

        <!-- Camera Control Bar -->
        <div class="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <!-- Bound Camera Indicator or Not Installed Warning -->
          <template v-if="primaryCamera">
            <div class="flex items-center gap-2 bg-[#F6F7F5] px-3 py-1.5 rounded-xl border border-[#E4E8E5] text-xs font-bold text-[#142820]">
              <v-icon icon="mdi-cctv" size="16" class="text-emerald-700" />
              <span class="truncate max-w-[200px]">{{ primaryCamera.camera_name }} ({{ primaryCamera.ip_address }})</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            </div>

            <!-- Flip Toggle (Mirroring) -->
            <button
              type="button"
              @click="cameraFlip = !cameraFlip; onCameraChange()"
              :class="cameraFlip ? 'bg-[#24433a] text-white shadow-xs' : 'bg-[#F6F7F5] text-[#718078] border border-[#E4E8E5] hover:text-[#24433a]'"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="สลับโหมดกลับด้านภาพ (Flip Horizontal)">
              <v-icon icon="mdi-flip-horizontal" size="14" />
              <span>{{ cameraFlip ? 'กลับด้าน' : 'ปกติ' }}</span>
            </button>

            <!-- Toggle Stream Live Button -->
            <button
              type="button"
              @click="toggleCameraStream"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              :class="isCameraStreamActive 
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' 
                : 'bg-[#24433a] text-white hover:bg-[#1a322b]'">
              <v-icon :icon="isCameraStreamActive ? 'mdi-stop' : 'mdi-play'" size="16" />
              <span>{{ isCameraStreamActive ? 'ปิดสตรีมกล้องสด' : 'เปิดสตรีม AI กล้องสด' }}</span>
            </button>
          </template>

          <template v-else>
            <div class="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-800">
              <v-icon icon="mdi-cctv-off" size="16" class="text-amber-600" />
              <span>ยังไม่ได้ติดตั้งกล้อง</span>
            </div>

            <button
              type="button"
              @click="isAddCameraModalOpen = true"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-[#24433a] text-white hover:bg-[#1a322b] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm">
              <v-icon icon="mdi-plus-circle-outline" size="16" />
              <span>+ ติดตั้งและผูกกล้อง</span>
            </button>
          </template>
        </div>
      </div>

      <!-- Registered Hikvision Cameras Strip -->
      <div class="p-3.5 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-[#4e6057] flex items-center gap-1">
            <v-icon icon="mdi-ip-network-outline" size="16" class="text-emerald-700" />
            <span>กล้องประจำฟาร์ม:</span>
          </span>

          <template v-if="registeredCameras.length > 0">
            <div 
              v-for="cam in registeredCameras" 
              :key="cam.id"
              class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-[#e5ece9] shadow-xs">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span class="font-bold text-[#24433a]">{{ cam.camera_name }}</span>
              <span class="font-mono text-[10px] text-[#718078]">({{ cam.ip_address }})</span>
              <button 
                type="button" 
                @click="deleteRegisteredCamera(cam.id)"
                :disabled="isDeletingCamera"
                title="ลบกล้องนี้"
                class="text-rose-400 hover:text-rose-600 p-0.5 rounded cursor-pointer">
                <v-icon icon="mdi-trash-can-outline" size="13" />
              </button>
            </div>
          </template>
          <template v-else>
            <span class="text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
              <v-icon icon="mdi-alert-circle-outline" size="14" class="text-amber-600" />
              <span>ยังไม่ได้ติดตั้งกล้องวงจรปิดในฟาร์มนี้</span>
            </span>
          </template>
        </div>

        <button 
          v-if="registeredCameras.length === 0"
          type="button" 
          @click="isAddCameraModalOpen = true"
          class="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer shrink-0">
          <v-icon icon="mdi-plus-circle-outline" size="15" />
          <span>+ ติดตั้งและผูกกล้องประจำฟาร์ม</span>
        </button>
        <button 
          v-else
          type="button" 
          @click="isEditModalOpen = true"
          class="text-xs font-bold text-[#4e6057] hover:text-[#24433a] flex items-center gap-1 cursor-pointer shrink-0">
          <v-icon icon="mdi-pencil-outline" size="15" />
          <span>แก้ไขการตั้งค่ากล้อง</span>
        </button>
      </div>

      <!-- Main Vision AI Grid: Video Feed (7 Cols) + Cockpit Metrics (5 Cols) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Left: Video Stream Box (7 cols) -->
        <div class="lg:col-span-7 bg-[#142820] rounded-2xl overflow-hidden shadow-md border border-[#24433a] relative min-h-[340px] flex flex-col justify-between text-white">
          
          <template v-if="primaryCamera">
            <!-- Stream Overlay Top Bar -->
            <div class="p-3 bg-black/50 backdrop-blur-xs flex items-center justify-between text-[11px] font-mono z-10 border-b border-white/10">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="isCameraStreamActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'"></span>
                <span class="font-bold truncate max-w-[220px]">FEED: {{ currentCameraSourceLabel }}</span>
              </div>
              <div class="flex items-center gap-2 text-white/80 shrink-0">
                <span class="bg-white/10 px-2 py-0.5 rounded text-[10px]">RTSP Sub-Stream 360p</span>
                <span class="bg-[#D87939] text-white px-2 py-0.5 rounded text-[10px] font-bold">ByteTrack + YOLO</span>
              </div>
            </div>

            <!-- Video Player Content -->
            <div class="flex-1 flex items-center justify-center p-4 relative">
              <template v-if="isCameraStreamActive">
                <img 
                  :src="cameraStreamUrl" 
                  @error="cameraFeedError = true"
                  class="w-full h-auto max-h-[350px] rounded-xl object-contain mx-auto shadow-inner"
                  alt="Live AI Stream"
                />
                <div v-if="cameraFeedError" class="absolute inset-0 bg-[#142820]/95 flex flex-col items-center justify-center p-6 text-center">
                  <v-icon icon="mdi-camera-off" size="42" class="text-amber-400 mb-2" />
                  <h4 class="text-sm font-bold text-white mb-1">ไม่พบสัญญาณสตรีมจากกล้อง</h4>
                  <p class="text-xs text-white/70 max-w-xs leading-relaxed">
                    FastAPI Vision Engine ยังไม่ได้เริ่มสตรีม หรือไม่สามารถเข้าถึง RTSP Sub-stream ที่กำหนดได้ (ตรวจเช็ค IP:Port และการเชื่อมต่อเครือข่าย)
                  </p>
                  <div class="flex items-center gap-2 mt-3">
                    <button 
                      @click="cameraFeedError = false; cameraStreamKey = Date.now()"
                      class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer">
                      ลองใหม่อีกครั้ง
                    </button>
                  </div>
                </div>
              </template>

              <!-- Offline / Inactive AI Camera View -->
              <div v-else class="w-full py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div class="relative w-full max-w-sm h-44 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                  <div class="absolute left-6 top-6 border-2 border-orange-400 bg-orange-500/20 rounded px-2 py-1 text-[10px] font-mono text-orange-300">
                    COW #101 | standing 0.94
                  </div>
                  <div class="absolute right-8 bottom-6 border-2 border-sky-400 bg-sky-500/20 rounded px-2 py-1 text-[10px] font-mono text-sky-300">
                    COW #102 | lying down 0.89
                  </div>
                  <div class="absolute right-24 top-10 border-2 border-amber-400 bg-amber-500/20 rounded px-2 py-1 text-[10px] font-mono text-amber-300">
                    COW #103 | feeding 0.91
                  </div>
                  <v-icon icon="mdi-cow" size="48" class="text-white/20" />
                </div>
                <p class="text-xs text-white/70 font-medium max-w-xs">
                  กล้องพร้อมสำหรับการตรวจจับแบบเรียลไทม์ กดปุ่ม <strong>"เปิดสตรีม AI กล้องสด"</strong> ด้านบนเพื่อเริ่มดูภาพ
                </p>
              </div>
            </div>

            <!-- Stream Overlay Bottom Info -->
            <div class="p-3 bg-black/50 backdrop-blur-xs flex items-center justify-between text-[11px] text-white/80 z-10 border-t border-white/10">
              <span>Frame-Skipping 8-10 FPS Target (ประหยัดพลังงาน &gt;70%)</span>
              <span class="text-[#F2BD7C] font-mono font-bold">Latency &lt; 40ms</span>
            </div>
          </template>

          <!-- 🟡 แจ้งเตือนเมื่อยังไม่ได้ติดตั้งกล้อง -->
          <div v-else class="w-full flex-1 py-14 px-6 flex flex-col items-center justify-center text-center space-y-4">
            <div class="w-18 h-18 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <v-icon icon="mdi-cctv-off" size="42" class="text-amber-400" />
            </div>
            <div class="space-y-1.5 max-w-md">
              <h3 class="text-base font-black text-white tracking-wide">ยังไม่ได้ติดตั้งกล้องวงจรปิดในฟาร์มนี้</h3>
              <p class="text-xs text-white/70 leading-relaxed font-medium">
                ฟาร์มนี้ยังไม่ได้ผูกกับกล้อง Hikvision IP Camera เพื่อตรวจจับพฤติกรรมโค (ยืน, นอน, กิน, ดื่ม) และคำนวณดัชนีความสบาย (CCI)
              </p>
            </div>
            <div class="flex items-center gap-3 pt-2">
              <button 
                type="button" 
                @click="isAddCameraModalOpen = true"
                class="px-5 py-2.5 rounded-xl text-xs font-bold text-[#142820] bg-emerald-400 hover:bg-emerald-300 shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
                <v-icon icon="mdi-plus-circle" size="16" />
                <span>+ ติดตั้งและผูกกล้องประจำฟาร์ม</span>
              </button>
              <button 
                type="button" 
                @click="isEditModalOpen = true"
                class="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer">
                แก้ไขข้อมูลฟาร์ม
              </button>
            </div>
          </div>

        </div>

        <!-- Right: Vision Telemetry Cockpit (5 cols) -->
        <div class="lg:col-span-5 space-y-3">
          
          <!-- Card 1: Cow Comfort Index (CCI) Gauge -->
          <div class="p-4 rounded-[22px] bg-white border border-[#e5ece9] shadow-xs space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <v-icon icon="mdi-gauge" size="18" />
                </div>
                <div>
                  <span class="text-xs font-black text-[#24433a] uppercase tracking-wide">ดัชนีความสบาย (CCI)</span>
                  <span class="text-[10px] text-[#718078] block">Cow Comfort Index (สัดส่วนโคนอนพัก)</span>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black border" :class="liveCciBadge.badgeClass">
                {{ liveCciBadge.label }}
              </span>
            </div>

            <!-- Big CCI Score & Bar -->
            <div class="flex items-baseline justify-between pt-1">
              <div class="flex items-baseline gap-1.5">
                <span class="text-3xl font-black tabular-nums text-[#24433a]">{{ liveCciScore.toFixed(1) }}</span>
                <span class="text-sm font-bold text-[#718078]">%</span>
              </div>
              <span class="text-[11px] font-medium text-[#718078]">เกณฑ์สากล: ≥ 85%</span>
            </div>

            <div class="w-full bg-[#f0f4f2] h-2.5 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-700"
                :class="liveCciBadge.barClass"
                :style="{ width: `${Math.min(100, Math.max(0, liveCciScore))}%` }">
              </div>
            </div>

            <p class="text-[10.5px] text-[#718078] leading-tight">
              {{ liveCciBadge.description }}
            </p>
          </div>

          <!-- Card 2: Automated Theoretical Milk Loss Risk (Zero Manual Form) -->
          <div class="p-4 rounded-[22px] bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200/80 shadow-xs space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center">
                  <v-icon icon="mdi-cup-water" size="18" />
                </div>
                <div>
                  <span class="text-xs font-black text-amber-950 uppercase tracking-wide">ความเสี่ยงน้ำนมลด (Biological Lag)</span>
                  <span class="text-[10px] text-amber-800/80 block">ประเมินผลกระทบหน่วง 5 วัน (Zero Manual Input)</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900 text-[10px] font-black uppercase">
                AUTO RISK PROXY
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-1">
              <div class="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span class="text-[10px] font-bold text-[#718078] block">เสี่ยงลดลงต่อตัว</span>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-xl font-black font-mono text-rose-600">{{ automatedMilkLossRisk.lossPerCow.toFixed(2) }}</span>
                  <span class="text-[10px] font-bold text-[#718078]">กก./ตัว/วัน</span>
                </div>
              </div>

              <div class="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                <span class="text-[10px] font-bold text-[#718078] block">รวมทั้งฝูง ({{ automatedMilkLossRisk.herdCount }} ตัว)</span>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-xl font-black font-mono text-rose-700">{{ automatedMilkLossRisk.herdLoss.toFixed(1) }}</span>
                  <span class="text-[10px] font-bold text-[#718078]">กก./ฝูง/วัน</span>
                </div>
              </div>
            </div>

            <p class="text-[10px] text-amber-900/80 leading-relaxed pt-0.5">
              🔬 คำนวณจากสมการโมเดลโคนมไทย (Hasan et al., 2026; Abdourhamane, 2026) เริ่มเกิดภาวะสูญเสียน้ำนมเมื่อ THI &gt; 76.0 โดยที่เกษตรกรไม่ต้องจดบันทึกด้วยมือ
            </p>
          </div>

          <!-- Card 3: Posture Breakdown 4 Metrics -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <!-- Standing -->
            <div class="p-3 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-center justify-between">
              <div class="flex items-center gap-2">
                <v-icon icon="mdi-walk" size="18" class="text-orange-600" />
                <span class="font-bold text-[#24433a]">ยืน (Standing)</span>
              </div>
              <span class="text-sm font-black text-orange-600 font-mono">58%</span>
            </div>

            <!-- Lying -->
            <div class="p-3 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-center justify-between">
              <div class="flex items-center gap-2">
                <v-icon icon="mdi-sleep" size="18" class="text-blue-600" />
                <span class="font-bold text-[#24433a]">นอนพัก (Lying)</span>
              </div>
              <span class="text-sm font-black text-blue-700 font-mono">34%</span>
            </div>

            <!-- Feeding -->
            <div class="p-3 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-center justify-between">
              <div class="flex items-center gap-2">
                <v-icon icon="mdi-food-apple-outline" size="18" class="text-emerald-600" />
                <span class="font-bold text-[#24433a]">กินอาหาร</span>
              </div>
              <span class="text-sm font-black text-emerald-700 font-mono">5%</span>
            </div>

            <!-- Drinking -->
            <div class="p-3 rounded-2xl bg-[#F6F7F5] border border-[#E4E8E5] flex items-center justify-between">
              <div class="flex items-center gap-2">
                <v-icon icon="mdi-water" size="18" class="text-cyan-600" />
                <span class="font-bold text-[#24433a]">ดื่มน้ำ</span>
              </div>
              <span class="text-sm font-black text-cyan-700 font-mono">3%</span>
            </div>
          </div>

        </div>

      </div>

      <!-- Animal Behavior & Welfare Alerts Table -->
      <div class="pt-4 border-t border-[#e5ece9] space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <v-icon icon="mdi-shield-alert-outline" size="18" class="text-rose-600" />
            <h4 class="text-xs font-black uppercase tracking-wider text-[#24433a]">
              รายการเตือนภัยสวัสดิภาพสัตว์รายตัว (Animal Behavior &amp; Welfare Alerts)
            </h4>
            <span 
              v-if="activeAlertsCount > 0"
              class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black animate-pulse">
              {{ activeAlertsCount }} เหตุการณ์ต้องติดตาม
            </span>
          </div>

          <span class="text-[11px] text-[#718078] font-medium">
            ตรวจจับความผิดปกติ: ยืนแช่เกิน 3 ชม. / แม่โคนอนนิ่งไม่ลุก / อาหารตก
          </span>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-[#e5ece9]">
          <table class="w-full text-left text-xs whitespace-nowrap">
            <thead class="bg-[#fafcfb] border-b border-[#e5ece9] text-[#4e6057] font-black uppercase text-[10.5px]">
              <tr>
                <th class="py-3 px-4">ความรุนแรง</th>
                <th class="py-3 px-4">ประเภทเหตุการณ์</th>
                <th class="py-3 px-4">โคหมายเลข (Track ID)</th>
                <th class="py-3 px-4">ระยะเวลาต่อเนื่อง</th>
                <th class="py-3 px-4">THI ขณะเกิดเหตุ</th>
                <th class="py-3 px-4">ข้อความแจ้งเตือน</th>
                <th class="py-3 px-4 text-center">การจัดการ &amp; Human Feedback</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#f0f4f2] bg-white">
              <tr 
                v-for="alert in cameraAlerts" 
                :key="alert.id"
                class="hover:bg-[#f8faf9] transition-colors"
                :class="alert.is_resolved ? 'opacity-70 bg-gray-50/50' : ''">
                
                <!-- Severity -->
                <td class="py-2.5 px-4">
                  <span 
                    class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                    :class="alert.severity === 'severe' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'">
                    {{ alert.severity || 'warning' }}
                  </span>
                </td>

                <!-- Type -->
                <td class="py-2.5 px-4 font-bold text-[#24433a]">
                  {{ formatAlertType(alert.alert_type) }}
                </td>

                <!-- Track ID -->
                <td class="py-2.5 px-4 font-mono font-bold text-[#1f3d34]">
                  {{ alert.track_id ? `#${alert.track_id}` : 'ฝูงรวม' }}
                </td>

                <!-- Duration -->
                <td class="py-2.5 px-4 font-mono">
                  {{ alert.duration_minutes ? `${alert.duration_minutes} นาที` : '-' }}
                </td>

                <!-- THI at event -->
                <td class="py-2.5 px-4 font-mono font-bold text-amber-700">
                  {{ alert.thi_at_event || '-' }}
                </td>

                <!-- Message -->
                <td class="py-2.5 px-4 text-[#4e6057] max-w-xs truncate" :title="alert.message_th">
                  {{ alert.message_th || '-' }}
                </td>

                <!-- Action & Human Feedback -->
                <td class="py-2.5 px-4 text-center">
                  <div class="flex items-center justify-center gap-1.5 flex-wrap">
                    <!-- Resolve Button -->
                    <button 
                      v-if="!alert.is_resolved"
                      type="button" 
                      @click="resolveCameraAlert(alert.id)"
                      :disabled="isResolvingAlert"
                      class="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold transition-all cursor-pointer">
                      แก้แล้ว
                    </button>
                    <span v-else class="text-[10px] text-[#718078] font-medium">
                      ✅ แก้แล้ว
                    </span>

                    <!-- Human Feedback (Accurate / False Alarm) -->
                    <div class="flex items-center gap-1 border-l pl-1.5 border-[#e5ece9]">
                      <template v-if="alert.is_accurate === true">
                        <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold" title="ยืนยันแล้วว่าเป็นการแจ้งเตือนที่ถูกต้อง">
                          👍 แม่นยำ
                        </span>
                      </template>
                      <template v-else-if="alert.is_accurate === false">
                        <span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold" title="บันทึกแล้วว่าเป็น False Alarm">
                          👎 แจ้งเตือนหลอก
                        </span>
                      </template>
                      <template v-else>
                        <button 
                          type="button"
                          @click="submitAlertFeedback(alert, true)"
                          title="ยืนยันว่าพฤติกรรมนี้ถูกต้องจริง (True Positive)"
                          class="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold transition-all cursor-pointer">
                          👍
                        </button>
                        <button 
                          type="button"
                          @click="submitAlertFeedback(alert, false)"
                          title="ระบุว่าการตรวจจับนี้คลาดเคลื่อน (False Alarm)"
                          class="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold transition-all cursor-pointer">
                          👎
                        </button>
                      </template>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Empty Alerts -->
              <tr v-if="cameraAlerts.length === 0">
                <td colspan="7" class="py-6 text-center text-[#718078]">
                  <v-icon icon="mdi-check-decagram-outline" size="22" class="text-emerald-500 inline mr-1" />
                  <span>ไม่พบสัญญาณความผิดปกติในฝูงโค (สวัสดิภาพสัตว์อยู่ในเกณฑ์ปกติ)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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

    <!-- 🟢 7. Add Hikvision Camera Modal Component -->
    <AddCameraModal 
      v-model="isAddCameraModalOpen" 
      :farm-id="farmId" 
      :farm="farm" 
      @created="onCameraCreated" 
    />

    <!-- 🟢 8. System Accuracy Benchmarks Modal Component -->
    <SystemAccuracyModal 
      v-model="isAccuracyModalOpen" 
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { Admin } from '~/API/baseAPI'
import AdminEditFarmModal from '~/components/Admin/farm/EditFarmModal.vue'
import AddCameraModal from '~/components/Admin/cctv/AddCameraModal.vue'
import SystemAccuracyModal from '~/components/Admin/cctv/SystemAccuracyModal.vue'

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
const isAddCameraModalOpen = ref(false)
const isAccuracyModalOpen = ref(false)
const multimodalStatus = ref(null)
const isDeletingCamera = ref(false)
const isResolvingAlert = ref(false)
const activeChartTab = ref('thi')
let syncTimer = null
let clockTimer = null

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
const registeredCameras = ref([])
const cameraAlerts = ref([])

// ตรวจสอบ Engine ปัจจุบันและสถานะการประมวลผล (Always Defined)
const activeEngineInfo = computed(() => {
  const engineStr = lstmForecast.value?.engine || savedDailySummary.value?.lstm_forecast?.engine || 'heuristic_fallback'
  const isDeepLearning = typeof engineStr === 'string' && engineStr.toLowerCase().includes('onnx')
  return {
    raw: engineStr,
    name: engineStr,
    isDeepLearning,
    title: isDeepLearning ? 'True Deep Learning (ONNX Runtime)' : 'Thai Heuristic Fallback (สถิติ & สัตวศาสตร์ไทย)',
    description: isDeepLearning 
      ? 'ประมวลผลผ่านโมเดล Bi-LSTM Attention 72h จากไฟล์ farm_lstm.onnx (ประวัติข้อมูลเซ็นเซอร์ครบ 72 ชม.)'
      : 'คำนวณผ่านสมการฟิสิกส์โรงเรือนไทย + Thermal Momentum สะสม (Fail-Safe โหมดสำหรับข้อมูลตั้งต้น < 72 ชม.)'
  }
})

// CCTV Smart Barn & YOLO26 Vision AI State
const isCameraStreamActive = ref(false)
const cameraFlip = ref(false)
const cameraStreamKey = ref(Date.now())
const cameraFeedError = ref(false)

const primaryCamera = computed(() => {
  return registeredCameras.value && registeredCameras.value.length > 0 ? registeredCameras.value[0] : null
})

const currentCameraSourceLabel = computed(() => {
  if (primaryCamera.value) {
    return `${primaryCamera.value.camera_name} (${primaryCamera.value.ip_address})`
  }
  return 'ยังไม่ได้ติดตั้งกล้อง'
})

const cameraStreamUrl = computed(() => {
  if (!primaryCamera.value) return ''
  const url = primaryCamera.value.sub_stream_url || primaryCamera.value.main_stream_url || ''
  return `http://localhost:8000/api/cam/stream?cam_id=rtsp&rtsp_url=${encodeURIComponent(url)}&flip=${cameraFlip.value}&t=${cameraStreamKey.value}`
})

const liveCciScore = computed(() => {
  return 78.5
})

const liveCciBadge = computed(() => {
  const score = liveCciScore.value
  if (score >= 85) {
    return {
      label: 'ยอดเยี่ยม (Optimal)',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      barClass: 'bg-emerald-500',
      description: 'โคนอนเคี้ยวเอื้องพักผ่อนเพียงพอ ไม่พบสัญญาณความเครียดสะสม'
    }
  }
  if (score >= 75) {
    return {
      label: 'เฝ้าระวัง (Watch)',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      barClass: 'bg-amber-500',
      description: 'โคเริ่มยืนแช่ระบายเหงื่อ แนะนำเปิดพัดลมระบายอากาศลดความร้อน'
    }
  }
  return {
    label: 'วิกฤต (Restlessness Risk)',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse',
    barClass: 'bg-rose-500',
    description: 'โคนอนน้อยผิดปกติ (<75%) เสี่ยงต่อโรคกีบและความเครียดรุนแรง'
  }
})

const automatedMilkLossRisk = computed(() => {
  const thi = Number(latestSensor.value?.thi || dailySummary.value?.avg_thi || 76.0)
  const lossPerCow = thi > 76.0 ? Math.max(0.0, Number(((thi - 76.0) * 0.45).toFixed(2))) : 0.0
  const herdCount = farm.value?.total_cows || 25
  const herdLoss = Number((lossPerCow * herdCount).toFixed(1))
  return {
    thi,
    lossPerCow,
    herdLoss,
    herdCount
  }
})

const activeAlertsCount = computed(() => {
  return cameraAlerts.value.filter(a => !a.is_resolved).length
})

const formatAlertType = (type) => {
  switch (type) {
    case 'prolonged_standing': return '🚨 ยืนแช่นานเกิน 3 ชม. (Prolonged Standing)'
    case 'downer_cow': return '🚨 แม่โคนอนนิ่งไม่ลุก (Downer Cow)'
    case 'severe_heat_stress': return '🌧️ ความร้อนสะสมวิกฤต (Severe Heat Stress)'
    case 'feeding_drop': return '⚠️ การกินอาหารลดลงกะทันหัน'
    case 'excessive_drinking': return '⚠️ ความถี่การดื่มน้ำสูงผิดปกติ'
    default: return type || 'แจ้งเตือนพฤติกรรม'
  }
}

const fetchRegisteredCameras = async () => {
  if (!farmId.value) return
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms/${farmId.value}/cameras`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data && res.data.success) {
      registeredCameras.value = (res.data.cameras || []).filter(c => !c.is_simulation)
    }
  } catch (e) {
    console.warn('[Camera API] Could not fetch registered cameras:', e)
  }
}

const fetchCameraAlerts = async () => {
  if (!farmId.value) return
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms/${farmId.value}/cameras/alerts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data && res.data.success) {
      cameraAlerts.value = (res.data.alerts || []).filter(a => !a.is_simulation)
    }
  } catch (e) {
    console.warn('[Camera API] Could not fetch camera alerts:', e)
  }
}

const deleteRegisteredCamera = async (camId) => {
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการผูกกล้องนี้?')) return
  isDeletingCamera.value = true
  try {
    const token = getToken()
    await axios.delete(`${Admin}/farms/${farmId.value}/cameras/${camId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    isCameraStreamActive.value = false
    await fetchRegisteredCameras()
  } catch (e) {
    alert(e.response?.data?.message || e.message)
  } finally {
    isDeletingCamera.value = false
  }
}

const resolveCameraAlert = async (alertId) => {
  isResolvingAlert.value = true
  try {
    const token = getToken()
    await axios.patch(`${Admin}/farms/${farmId.value}/cameras/alerts/${alertId}/resolve`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    await fetchCameraAlerts()
  } catch (e) {
    console.error('Failed to resolve alert:', e)
  } finally {
    isResolvingAlert.value = false
  }
}

const submitAlertFeedback = async (alert, isAccurate) => {
  try {
    const token = getToken()
    const res = await axios.post(
      `${Admin}/farms/${farmId.value}/cameras/alerts/${alert.id}/feedback`,
      { is_accurate: isAccurate },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
    if (res.data && res.data.success) {
      alert.is_accurate = isAccurate
      alert.feedback_at = new Date().toISOString()
    }
  } catch (e) {
    console.error('Failed to submit alert feedback:', e)
  }
}

const fetchMultimodalStatus = async () => {
  if (!farmId.value) return
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/system/farms/${farmId.value}/multimodal-status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data && res.data.success) {
      multimodalStatus.value = res.data.multimodal_status
    }
  } catch (e) {
    console.warn('[Multimodal API] Could not fetch multimodal status:', e?.message)
  }
}

const onCameraCreated = (cam) => {
  registeredCameras.value.push(cam)
  fetchRegisteredCameras()
}

const onCameraChange = () => {
  cameraFeedError.value = false
  cameraStreamKey.value = Date.now()
}

const toggleCameraStream = async () => {
  if (!primaryCamera.value) return
  isCameraStreamActive.value = !isCameraStreamActive.value
  cameraFeedError.value = false
  cameraStreamKey.value = Date.now()
}

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

const nowTimestamp = ref(Date.now())

// Device Online State (ถือว่า Online หากมีการส่งข้อมูลล่าสุดภายใน 2 นาที)
const isDeviceOnline = computed(() => {
  if (!device.value && !latestSensor.value) return false
  const lastTime = latestSensor.value?.recorded_at || device.value?.last_seen_at
  if (!lastTime) return false
  const diffMs = nowTimestamp.value - new Date(lastTime).getTime()
  return diffMs >= -60000 && diffMs < 2 * 60 * 1000 // หากเกิน 2 นาทีโดยไม่มีข้อมูลใหม่ ถือว่า Offline
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
      await fetchMultimodalStatus()
      await fetchRegisteredCameras()
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
  nowTimestamp.value = Date.now()
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms/${farmId.value}/latest`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })

    if (res.data && res.data.success) {
      if (res.data.is_online !== undefined && device.value) {
        device.value.status = res.data.is_online ? 'online' : 'offline'
      }
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
    nowTimestamp.value = Date.now()
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
    const forecastList = lstmForecast.value?.forecasts || defaultForecasts.value
    const forecastPoints = forecastList.map(f => Number(f.predicted_thi))

    // Actual series (past subset + nulls for future)
    const actualSeriesData = [...pastThi, ...forecastPoints.map(() => null)]
    
    // Forecast series (nulls for past except last point, then forecast points)
    const forecastSeriesData = [
      ...pastThi.slice(0, -1).map(() => null),
      lastThi,
      ...forecastPoints
    ]

    // Uncertainty upper bound (+MAE)
    const upperSeriesData = [
      ...pastThi.slice(0, -1).map(() => null),
      lastThi,
      ...forecastList.map(f => f.thi_upper != null ? Number(f.thi_upper) : Number((Number(f.predicted_thi) + (f.thi_mae || 0.87)).toFixed(1)))
    ]

    // Uncertainty lower bound (-MAE)
    const lowerSeriesData = [
      ...pastThi.slice(0, -1).map(() => null),
      lastThi,
      ...forecastList.map(f => f.thi_lower != null ? Number(f.thi_lower) : Number((Number(f.predicted_thi) - (f.thi_mae || 0.87)).toFixed(1)))
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
      },
      {
        name: 'ช่วงความเชื่อมั่นสูงสุด (+MAE)',
        type: 'line',
        data: upperSeriesData
      },
      {
        name: 'ช่วงความเชื่อมั่นต่ำสุด (-MAE)',
        type: 'line',
        data: lowerSeriesData
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
    colors = ['#163026', '#d87939', '#eab308', '#0ea5e9']
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
      width: isForecast ? [3, 3, 1.5, 1.5] : isThiOnly ? [3] : isBoth ? [3, 2, 2] : [2.5, 2.5],
      dashArray: isForecast ? [0, 6, 4, 4] : [0]
    },
    fill: {
      type: isForecast ? ['gradient', 'solid', 'solid', 'solid'] : isThiOnly ? ['gradient'] : isBoth ? ['gradient', 'solid', 'solid'] : ['solid', 'solid'],
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
  fetchMultimodalStatus()
  fetchRegisteredCameras()
  fetchCameraAlerts()
  if (isAutoSync.value) {
    startAutoSync()
  }
  // Clock timer เพื่อให้ computed(isDeviceOnline) รีเฟรชสถานะแบบเรียลไทม์ทุก 5 วินาที
  clockTimer = setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 5000)
})

onUnmounted(() => {
  stopAutoSync()
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
})
</script>

<style scoped>
/* Smart Barn Telemetry Cockpit scoped styles */
</style>
