<template>
  <div class="space-y-6 pb-12 font-sans">
    
    <!-- 🟢 1. Top Navigation & Simulation Sandbox Context Header -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-4">
      
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-500/25 flex items-center justify-center shrink-0 shadow-xs">
            <v-icon icon="mdi-flask" size="30" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-2xl md:text-3xl font-black text-[#24433a] tracking-tight">
                สภาพแวดล้อมจำลอง (Simulation Sandbox)
              </h1>
              <span class="px-3 py-1 rounded-full text-[11px] font-black bg-amber-500 text-black border border-amber-600/30 uppercase tracking-wider shadow-xs">
                SANDBOX MODE (is_simulation = true)
              </span>
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ระบบแยกฐานข้อมูลอิสระ 100%</span>
              </span>
            </div>
            <p class="text-xs md:text-sm text-[#718078] mt-1 font-medium">
              ห้องปฏิบัติการทดสอบระบบกล้อง AI ตรวจจับพฤติกรรมโค (YOLO26 + ByteTrack) และจำลองสภาวะแวดล้อมโรงเรือนไทยโดยไม่ต้องเชื่อมต่อฮาร์ดแวร์จริง
            </p>
          </div>
        </div>

        <!-- Quick Actions & Reset -->
        <div class="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <NuxtLink 
            v-if="selectedFarmId"
            :to="`/Admin/farms/farm_detail-${selectedFarmId}`"
            class="px-4 py-2 rounded-xl bg-white hover:bg-[#f0f4f2] text-[#24433a] border border-[#e5ece9] text-xs font-bold transition-all flex items-center gap-1.5 text-decoration-none shadow-xs cursor-pointer">
            <v-icon icon="mdi-barn" size="16" class="text-emerald-700" />
            <span>ดูแดชบอร์ดฟาร์มจริง ↗</span>
          </NuxtLink>

          <button 
            type="button" 
            @click="resetToDefaults"
            class="px-4 py-2 rounded-xl bg-[#F6F7F5] hover:bg-[#e8ecea] text-[#4e6057] border border-[#E4E8E5] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs">
            <v-icon icon="mdi-refresh" size="16" />
            <span>รีเซ็ตค่ามาตรฐาน</span>
          </button>
        </div>
      </div>

      <!-- Farm Selection Bar -->
      <div class="pt-4 border-t border-[#e5ece9] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3 flex-wrap">
          <label class="text-xs font-black uppercase tracking-wider text-[#4e6057] flex items-center gap-1.5 shrink-0">
            <v-icon icon="mdi-home-analytics" size="18" class="text-emerald-700" />
            <span>เลือกฟาร์มที่ต้องการจำลอง:</span>
          </label>

          <div class="relative min-w-[260px] max-w-sm">
            <select 
              v-model="selectedFarmId"
              @change="onFarmSelected"
              class="w-full bg-[#fafcfb] border border-[#d2ddd7] text-[#24433a] text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs">
              <option v-for="f in farmsList" :key="f.id_farms" :value="f.id_farms">
                {{ f.name_farms }} ({{ f.total_cows || 25 }} โค)
              </option>
              <option v-if="farmsList.length === 0" value="sandbox-default">
                ฟาร์มตัวอย่างจำลอง Smart Barn A
              </option>
            </select>
          </div>
        </div>

        <div v-if="currentFarm" class="flex items-center gap-3 text-xs text-[#718078] flex-wrap">
          <span class="flex items-center gap-1 font-bold text-[#24433a]">
            <v-icon icon="mdi-account" size="14" class="text-[#718078]" />
            เจ้าของ: {{ currentFarm.owner_name || 'สหกรณ์โคนม' }}
          </span>
          <span class="text-[#cbd5e1]">•</span>
          <span class="flex items-center gap-1 font-bold text-[#24433a]">
            <v-icon icon="mdi-cow" size="14" class="text-amber-700" />
            ฝูงโค: {{ currentFarm.total_cows || 25 }} ตัว
          </span>
          <span class="text-[#cbd5e1]">•</span>
          <span class="flex items-center gap-1 font-bold text-[#24433a]">
            <v-icon icon="mdi-fan" size="14" class="text-sky-700" />
            ระบายความร้อน: {{ currentFarm.cooling_system || 'พัดลม + ละอองหมอก' }}
          </span>
        </div>
      </div>

    </div>

    <!-- 🟢 2. Key Microclimate & Comfort Telemetry Ribbon (4 Cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Card 1: Simulated Temperature -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#718078] block">อุณหภูมิจำลอง (Sim Temp)</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-2xl md:text-3xl font-black font-mono" :class="simTemp >= 32.0 ? 'text-rose-600' : 'text-[#24433a]'">
              {{ simTemp.toFixed(1) }}
            </span>
            <span class="text-xs font-bold text-[#718078]">°C</span>
          </div>
          <span class="text-[10px] text-[#718078] block">จำลองในคอกโรงเรือน</span>
        </div>
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" :class="simTemp >= 32.0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'">
          <v-icon icon="mdi-thermometer" size="24" />
        </div>
      </div>

      <!-- Card 2: Simulated Humidity -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#718078] block">ความชื้นจำลอง (Sim RH)</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-2xl md:text-3xl font-black font-mono text-sky-800">
              {{ simHum }}
            </span>
            <span class="text-xs font-bold text-[#718078]">%RH</span>
          </div>
          <span v-if="simHum >= 75" class="text-[10px] text-amber-700 font-bold block">
            ⚠️ เกิน 75% (Maejo Rule)
          </span>
          <span v-else class="text-[10px] text-emerald-700 font-medium block">
            ความชื้นเหมาะสม
          </span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
          <v-icon icon="mdi-water-percent" size="24" />
        </div>
      </div>

      <!-- Card 3: Thai-Relief THI -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#718078] block">ค่า THI ปรับปรุงไทย</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-2xl md:text-3xl font-black font-mono text-amber-900">
              {{ thaiThi.toFixed(1) }}
            </span>
            <span class="text-xs font-bold text-[#718078]">THI</span>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block" :class="riskBadgeClass">
            {{ riskLabel }}
          </span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
          <v-icon icon="mdi-fire" size="24" />
        </div>
      </div>

      <!-- Card 4: Cow Comfort Index (CCI) -->
      <div class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#718078] block">ดัชนีความสบาย (CCI)</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-2xl md:text-3xl font-black font-mono text-[#24433a]">
              {{ simCci.toFixed(1) }}
            </span>
            <span class="text-xs font-bold text-[#718078]">%</span>
          </div>
          <span class="text-[10px] text-rose-600 font-bold block">
            เสี่ยงลด {{ simMilkLoss.toFixed(2) }} กก./ตัว/วัน
          </span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
          <v-icon icon="mdi-gauge" size="24" />
        </div>
      </div>

    </div>

    <!-- 🟢 3. Main Sandbox Workspace: Vision AI Stream (7 Cols) + Control Panel (5 Cols) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- Left: Smart Barn Vision AI Camera Stream (7 Cols) -->
      <div class="lg:col-span-7 bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-7 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-5">
        
        <!-- Stream Header & Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5ece9]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#D87939]/15 text-[#D87939] flex items-center justify-center shrink-0">
              <v-icon icon="mdi-cctv" size="22" />
            </div>
            <div>
              <h3 class="text-base font-black text-[#24433a]">
                สภาพแวดล้อมจำลอง กล้อง (Camera & Vision AI)
              </h3>
              <p class="text-[11px] text-[#718078]">
                สตรีมภาพสดพร้อมกล่องตรวจจับพฤติกรรม ByteTrack + YOLO26m Multi-Cow Telemetry
              </p>
            </div>
          </div>

          <!-- Flip & Stream Toggle -->
          <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              @click="cameraFlip = !cameraFlip; cameraStreamKey = Date.now()"
              :class="cameraFlip ? 'bg-[#24433a] text-white' : 'bg-[#F6F7F5] text-[#718078] border border-[#E4E8E5] hover:text-[#24433a]'"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="สลับโหมดกลับด้านภาพ (Flip Horizontal)">
              <v-icon icon="mdi-flip-horizontal" size="14" />
              <span>{{ cameraFlip ? 'กลับด้าน' : 'ปกติ' }}</span>
            </button>

            <button
              type="button"
              @click="toggleCameraStream"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              :class="isCameraStreamActive 
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' 
                : 'bg-[#24433a] text-white hover:bg-[#1a322b]'">
              <v-icon :icon="isCameraStreamActive ? 'mdi-stop' : 'mdi-play'" size="15" />
              <span>{{ isCameraStreamActive ? 'ปิดสตรีมกล้อง' : 'เปิดสตรีม AI กล้องจำลอง' }}</span>
            </button>
          </div>
        </div>

        <!-- Camera Source Dropdown Selector -->
        <div class="p-3 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] flex items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <v-icon icon="mdi-video-input-antenna" size="16" class="text-emerald-700 shrink-0" />
            <span class="font-bold text-[#4e6057] shrink-0">แหล่งสัญญาณภาพ:</span>
            <select 
              v-model="selectedCameraSource"
              @change="onCameraSourceChange"
              class="bg-transparent text-[#142820] font-bold focus:outline-none cursor-pointer flex-1 truncate">
              <optgroup label="🎬 สภาพแวดล้อมจำลอง (Sandbox)">
                <option value="simulation">🎬 วิดีโอจำลองฝูงโค (sample_barn.mp4 - โคในโรงเรือนไทย)</option>
              </optgroup>
              <optgroup v-if="registeredCameras.length > 0" label="📹 กล้อง Hikvision IP Camera ของฟาร์ม">
                <option v-for="cam in registeredCameras" :key="'rtsp-' + cam.id" :value="'rtsp-' + cam.id">
                  {{ cam.camera_name }} ({{ cam.ip_address }})
                </option>
              </optgroup>
              <optgroup label="💻 กล้อง USB / Local Webcams">
                <option v-for="cam in detectedCameras" :key="'usb-' + cam.index" :value="'usb-' + cam.index">
                  {{ cam.label }}
                </option>
              </optgroup>
            </select>
          </div>

          <button 
            type="button" 
            @click="fetchCameraDevices"
            title="ค้นหากล้องใหม่"
            class="text-[#718078] hover:text-[#24433a] p-1 rounded hover:bg-white transition-colors cursor-pointer shrink-0">
            <v-icon icon="mdi-refresh" size="14" />
          </button>
        </div>

        <!-- Video Player Box -->
        <div class="bg-[#142820] rounded-2xl overflow-hidden shadow-inner border border-[#24433a] relative min-h-[350px] flex flex-col justify-between text-white">
          
          <!-- Stream Overlay Top Bar -->
          <div class="p-3 bg-black/60 backdrop-blur-xs flex items-center justify-between text-[11px] font-mono z-10 border-b border-white/10">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="isCameraStreamActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'"></span>
              <span class="font-bold truncate max-w-[240px]">FEED: {{ currentCameraSourceLabel }}</span>
            </div>
            <div class="flex items-center gap-2 text-white/80 shrink-0">
              <span class="bg-white/10 px-2 py-0.5 rounded text-[10px]">FastAPI Sub-Stream</span>
              <span class="bg-[#D87939] text-white px-2 py-0.5 rounded text-[10px] font-bold">ByteTrack + YOLO26</span>
            </div>
          </div>

          <!-- Video Stream Content -->
          <div class="flex-1 flex items-center justify-center p-4 relative">
            <template v-if="isCameraStreamActive">
              <img 
                :src="cameraStreamUrl" 
                @error="cameraFeedError = true"
                class="w-full h-auto max-h-[340px] rounded-xl object-contain mx-auto shadow-inner"
                alt="Live AI Simulation Stream"
              />
              
              <!-- Feed Error Modal -->
              <div v-if="cameraFeedError" class="absolute inset-0 bg-[#142820]/95 flex flex-col items-center justify-center p-6 text-center">
                <v-icon icon="mdi-camera-off" size="42" class="text-amber-400 mb-2" />
                <h4 class="text-sm font-bold text-white mb-1">ยังไม่ได้เริ่มสตรีมจาก FastAPI Vision Engine</h4>
                <p class="text-xs text-white/70 max-w-xs leading-relaxed">
                  กรุณาตรวจสอบว่า FastAPI ที่พอร์ต 8000 กำลังทำงาน หรือสลับเป็นวิดีโอจำลอง sample_barn.mp4
                </p>
                <div class="flex items-center gap-2 mt-3">
                  <button 
                    @click="cameraFeedError = false; cameraStreamKey = Date.now()"
                    class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer">
                    ลองใหม่อีกครั้ง
                  </button>
                  <button 
                    @click="selectedCameraSource = 'simulation'; cameraFeedError = false; cameraStreamKey = Date.now()"
                    class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-black cursor-pointer">
                    ใช้วิดีโอจำลอง
                  </button>
                </div>
              </div>
            </template>

            <!-- Offline Preview / Bounding Box Mockup -->
            <div v-else class="w-full py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div class="relative w-full max-w-sm h-48 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                <div class="absolute left-4 top-4 border-2 border-orange-400 bg-orange-500/20 rounded px-2 py-1 text-[10px] font-mono text-orange-300">
                  COW #101 | standing 0.94
                </div>
                <div class="absolute right-6 bottom-4 border-2 border-sky-400 bg-sky-500/20 rounded px-2 py-1 text-[10px] font-mono text-sky-300">
                  COW #102 | lying down 0.89
                </div>
                <div class="absolute right-20 top-8 border-2 border-amber-400 bg-amber-500/20 rounded px-2 py-1 text-[10px] font-mono text-amber-300">
                  COW #103 | feeding 0.91
                </div>
                <v-icon icon="mdi-cow" size="54" class="text-white/20" />
              </div>
              <p class="text-xs text-white/75 font-medium max-w-xs">
                กล้องจำลองพร้อมใช้งาน กดปุ่ม <strong>"เปิดสตรีม AI กล้องจำลอง"</strong> ด้านบนเพื่อดูภาพและการตรวจจับกล่องสีรอบตัวโค
              </p>
            </div>
          </div>

          <!-- Stream Overlay Bottom Info -->
          <div class="p-3 bg-black/60 backdrop-blur-xs flex items-center justify-between text-[11px] text-white/80 z-10 border-t border-white/10">
            <span>Frame-Skipping 8-10 FPS (ประหยัดพลังงาน &gt;70%)</span>
            <span class="text-[#F2BD7C] font-mono font-bold">Latency &lt; 40ms</span>
          </div>

        </div>

        <!-- 4 Herd Posture Telemetry Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div class="p-3 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] text-center">
            <span class="text-[10px] font-bold text-[#718078] block">ยืน (Standing)</span>
            <span class="text-base font-black font-mono text-orange-700">{{ simStandingPct }}%</span>
            <span class="text-[10px] text-[#718078] block">ตรวจจับได้ {{ Math.round((simStandingPct / 100) * totalCows) }} ตัว</span>
          </div>

          <div class="p-3 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] text-center">
            <span class="text-[10px] font-bold text-[#718078] block">นอนพัก (Lying)</span>
            <span class="text-base font-black font-mono text-blue-700">{{ simLyingPct }}%</span>
            <span class="text-[10px] text-[#718078] block">ตรวจจับได้ {{ Math.round((simLyingPct / 100) * totalCows) }} ตัว</span>
          </div>

          <div class="p-3 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] text-center">
            <span class="text-[10px] font-bold text-[#718078] block">กินอาหาร (Feeding)</span>
            <span class="text-base font-black font-mono text-amber-700">{{ simFeedingPct }}%</span>
            <span class="text-[10px] text-[#718078] block">ROI โซนรางอาหาร</span>
          </div>

          <div class="p-3 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] text-center">
            <span class="text-[10px] font-bold text-[#718078] block">ดื่มน้ำ (Drinking)</span>
            <span class="text-base font-black font-mono text-sky-700">{{ simDrinkingPct }}%</span>
            <span class="text-[10px] text-[#718078] block">ROI โซนอ่างน้ำ</span>
          </div>
        </div>

        <!-- Multimodal Cross-Validation Gate Demonstration Panel -->
        <div class="p-4 rounded-2xl bg-gradient-to-br from-[#fafcfb] to-[#f4f7f5] border border-[#dce6e1] space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <v-icon icon="mdi-shield-sync-outline" size="20" class="text-emerald-800" />
              <h4 class="text-xs font-black uppercase tracking-wider text-[#24433a]">
                Multimodal Cross-Validation Gate (การผสานเซ็นเซอร์และกล้อง AI)
              </h4>
            </div>
            <span class="text-[10px] font-black px-2 py-0.5 rounded-full border uppercase" :class="multimodalGateBadge.badgeClass">
              {{ multimodalGateBadge.status }}
            </span>
          </div>

          <p class="text-xs text-[#4e6057] leading-relaxed">
            {{ multimodalGateBadge.description }}
          </p>

          <!-- Interactive Gate Simulation Switcher -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button 
              type="button"
              @click="applyGateScenario('CaseA')"
              class="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-left"
              :class="activeScenario === 'CaseA' ? 'bg-emerald-100 border-emerald-300 text-emerald-950 shadow-xs' : 'bg-white border-[#e5ece9] text-[#4e6057] hover:bg-[#f0f4f2]'">
              <div class="font-black">Case A: Multimodal Verified</div>
              <div class="text-[9.5px] opacity-75">เซ็นเซอร์ร้อน + โคหอบยืนแช่</div>
            </button>

            <button 
              type="button"
              @click="applyGateScenario('CaseB')"
              class="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-left"
              :class="activeScenario === 'CaseB' ? 'bg-rose-100 border-rose-300 text-rose-950 shadow-xs' : 'bg-white border-[#e5ece9] text-[#4e6057] hover:bg-[#f0f4f2]'">
              <div class="font-black">Case B: แดดส่องเซ็นเซอร์</div>
              <div class="text-[9.5px] opacity-75">เซ็นเซอร์ THI 82 แต่วัวนอนสบาย</div>
            </button>

            <button 
              type="button"
              @click="applyGateScenario('CaseC')"
              class="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-left"
              :class="activeScenario === 'CaseC' ? 'bg-amber-100 border-amber-300 text-amber-950 shadow-xs' : 'bg-white border-[#e5ece9] text-[#4e6057] hover:bg-[#f0f4f2]'">
              <div class="font-black">Case C: กล้องขัดข้อง</div>
              <div class="text-[9.5px] opacity-75">Fail-Safe 100% Uptime</div>
            </button>
          </div>
        </div>

      </div>

      <!-- Right: Interactive Microclimate & Behavior Controls (5 Cols) -->
      <div class="lg:col-span-5 space-y-5">
        
        <!-- Control Card 1: Microclimate Sliders -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-[#e5ece9]">
            <h4 class="text-xs font-black uppercase tracking-wider text-[#4e6057] flex items-center gap-1.5">
              <v-icon icon="mdi-tune-vertical" size="18" class="text-amber-600" />
              <span>1. ปรับสภาพอากาศโรงเรือน (Microclimate Sliders)</span>
            </h4>
            <span class="text-[10px] font-mono font-bold bg-[#f0f4f2] text-[#4e6057] px-2 py-0.5 rounded-lg">
              Dynamic Real-time
            </span>
          </div>

          <!-- Temp Slider -->
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs font-bold">
              <span class="text-[#718078]">อุณหภูมิโรงเรือน (Temperature)</span>
              <span class="font-mono text-[#24433a] font-black text-sm">{{ simTemp.toFixed(1) }} °C</span>
            </div>
            <input 
              v-model.number="simTemp" 
              type="range" 
              min="20" 
              max="42" 
              step="0.5"
              class="w-full accent-amber-600 cursor-pointer"
            />
          </div>

          <!-- Humidity Slider -->
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs font-bold">
              <span class="text-[#718078]">ความชื้นสัมพัทธ์ (Relative Humidity)</span>
              <span class="font-mono text-sky-800 font-black text-sm">{{ simHum }} %RH</span>
            </div>
            <input 
              v-model.number="simHum" 
              type="range" 
              min="30" 
              max="99" 
              step="1"
              class="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <!-- Formula Results -->
          <div class="grid grid-cols-2 gap-2 pt-1 text-center text-xs">
            <div class="p-2.5 rounded-xl bg-[#fafcfb] border border-[#e5ece9]">
              <span class="text-[10px] text-[#718078] block font-bold">NRC Raw THI</span>
              <span class="text-base font-black font-mono text-[#24433a]">{{ rawThi.toFixed(1) }}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-[#fafcfb] border border-[#e5ece9]">
              <span class="text-[10px] text-[#718078] block font-bold">Thai-Relief THI</span>
              <span class="text-base font-black font-mono text-amber-700">{{ thaiThi.toFixed(1) }}</span>
            </div>
          </div>

          <!-- Maejo Anti-Misting Rule Notice -->
          <div 
            v-if="simHum >= 75" 
            class="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2.5 animate-fade-in">
            <v-icon icon="mdi-fan-alert" size="20" class="text-sky-600 shrink-0 mt-0.5" />
            <div class="space-y-0.5">
              <span class="font-black block">🌧️ กฎป้องกันความชื้นสูง (Maejo Anti-Misting Rule):</span>
              <p class="text-[11px] text-sky-800 leading-relaxed">
                ความชื้น {{ simHum }}% (≥75%) แนะนำ <strong>เปิดพัดลมเท่านั้น (ห้ามพ่นหมอก)</strong> เพื่อป้องกันคอกแฉะและโรคเต้านมอักเสบ
              </p>
            </div>
          </div>
        </div>

        <!-- Control Card 2: Herd Posture Sliders -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-[#e5ece9]">
            <h4 class="text-xs font-black uppercase tracking-wider text-[#4e6057] flex items-center gap-1.5">
              <v-icon icon="mdi-cow" size="18" class="text-[#24433a]" />
              <span>2. จำลองสัดส่วนพฤติกรรมฝูง (Herd Posture Sliders)</span>
            </h4>
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-lg border" :class="cciBadgeClass">
              CCI: {{ simCci.toFixed(1) }}%
            </span>
          </div>

          <!-- Standing vs Lying Sliders -->
          <div class="space-y-3">
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-orange-700">ยืน (Standing %)</span>
                <span class="font-mono">{{ simStandingPct }}%</span>
              </div>
              <input 
                v-model.number="simStandingPct" 
                type="range" 
                min="0" 
                max="100" 
                class="w-full accent-orange-600 cursor-pointer"
                @input="simLyingPct = Math.max(0, 100 - simStandingPct)"
              />
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-blue-700">นอนเคี้ยวเอื้อง (Lying %)</span>
                <span class="font-mono">{{ simLyingPct }}%</span>
              </div>
              <input 
                v-model.number="simLyingPct" 
                type="range" 
                min="0" 
                max="100" 
                class="w-full accent-blue-600 cursor-pointer"
                @input="simStandingPct = Math.max(0, 100 - simLyingPct)"
              />
            </div>
          </div>

          <div class="p-3 rounded-xl bg-[#fafcfb] border border-[#e5ece9] text-[11px] text-[#718078] leading-relaxed">
            <strong>Cow Comfort Index (CCI):</strong> โคควรนอนพักผ่อนอย่างน้อย 85% ของโคนที่ไม่ได้กำลังกินอาหาร หาก CCI ต่ำกว่า 75% แสดงว่ามีความร้อนสะสมทำให้วัวยืนแช่ระบายเหงื่อ หรือพื้นคอกแฉะไม่สบาย
          </div>
        </div>

        <!-- Control Card 3: One-Click Anomaly Triggers -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-[#e5ece9]">
            <h4 class="text-xs font-black uppercase tracking-wider text-[#4e6057] flex items-center gap-1.5">
              <v-icon icon="mdi-bell-ring-outline" size="18" class="text-rose-600" />
              <span>3. ยิงสัญญาณแจ้งเตือนฉุกเฉิน (One-Click Triggers)</span>
            </h4>
            <span class="text-[10px] text-[#718078]">is_simulation = true</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <!-- Button 1: Prolonged Standing -->
            <button 
              type="button" 
              @click="triggerAlert('prolonged_standing')" 
              :disabled="isTriggering"
              class="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition-all cursor-pointer group active:scale-95 disabled:opacity-50">
              <div class="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center mb-1.5 shadow-xs">
                <v-icon icon="mdi-timer-alert-outline" size="16" />
              </div>
              <div class="text-xs font-black text-amber-900 leading-tight">วัวยืนแช่นานเกิน 3 ชม.</div>
              <div class="text-[10px] text-amber-800/80 mt-0.5">Prolonged Standing (&gt;180 น.)</div>
            </button>

            <!-- Button 2: Downer Cow -->
            <button 
              type="button" 
              @click="triggerAlert('downer_cow')" 
              :disabled="isTriggering"
              class="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left transition-all cursor-pointer group active:scale-95 disabled:opacity-50">
              <div class="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                <v-icon icon="mdi-alert-octagon" size="16" />
              </div>
              <div class="text-xs font-black text-rose-900 leading-tight">แม่โคนอนนิ่งไม่ลุก</div>
              <div class="text-[10px] text-rose-800/80 mt-0.5">Downer Cow (&gt;240 น.)</div>
            </button>

            <!-- Button 3: Rainy Heat Stress -->
            <button 
              type="button" 
              @click="triggerAlert('severe_heat_stress')" 
              :disabled="isTriggering"
              class="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-left transition-all cursor-pointer group active:scale-95 disabled:opacity-50">
              <div class="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                <v-icon icon="mdi-weather-pouring" size="16" />
              </div>
              <div class="text-xs font-black text-sky-900 leading-tight">วิกฤตความร้อนฤดูฝน</div>
              <div class="text-[10px] text-sky-800/80 mt-0.5">RH &gt; 75% + THI &ge; 84.0</div>
            </button>

            <!-- Button 4: Panting Spike -->
            <button 
              type="button" 
              @click="triggerAlert('panting_spike')" 
              :disabled="isTriggering"
              class="p-3 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-left transition-all cursor-pointer group active:scale-95 disabled:opacity-50">
              <div class="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                <v-icon icon="mdi-weather-dust" size="16" />
              </div>
              <div class="text-xs font-black text-orange-900 leading-tight">โคหอบถี่ผิดปกติ</div>
              <div class="text-[10px] text-orange-800/80 mt-0.5">Panting Rate &gt; 60 ครั้ง/น.</div>
            </button>
          </div>

          <!-- Publish Telemetry Action Button -->
          <div class="pt-2">
            <button 
              type="button" 
              @click="publishSimulationTelemetry"
              :disabled="isPublishing"
              class="w-full py-2.5 rounded-xl bg-[#24433a] hover:bg-[#1a322b] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <v-icon icon="mdi-cloud-upload-outline" size="16" />
              <span>{{ isPublishing ? 'กำลังบันทึกเทเลเมทรีจำลอง...' : 'บันทึกเทเลเมทรีจำลองเข้าสู่ฐานข้อมูล (Publish)' }}</span>
            </button>
          </div>
        </div>

      </div>

    </div>

    <!-- 🟢 4. Simulated Behavioral Alerts Audit Table (ประวัติการแจ้งเตือนจำลอง) -->
    <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] space-y-4">
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5ece9]">
        <div>
          <h3 class="text-lg md:text-xl font-black text-[#24433a] tracking-tight flex items-center gap-2">
            <v-icon icon="mdi-history" size="22" class="text-amber-600" />
            <span>ประวัติการแจ้งเตือนจำลอง (Simulated Behavioral Alerts Log)</span>
          </h3>
          <p class="text-xs text-[#718078] mt-0.5 font-medium">
            รายการแจ้งเตือนที่เกิดจากการทดสอบสภาพแวดล้อมจำลอง (is_simulation = true) ไม่ปนเปื้อนข้อมูลจริงของฟาร์ม
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-[#718078] bg-[#f0f4f2] px-3 py-1.5 rounded-xl font-mono">
            ทั้งหมด {{ simulationAlerts.length }} รายการ
          </span>
          <button 
            type="button" 
            @click="fetchSimulationAlerts"
            class="text-xs font-bold text-emerald-800 hover:text-emerald-950 p-1.5 rounded-lg border border-[#e5ece9] bg-white cursor-pointer"
            title="รีเฟรชประวัติแจ้งเตือน">
            <v-icon icon="mdi-refresh" size="16" />
          </button>
        </div>
      </div>

      <!-- Alerts Table -->
      <div class="overflow-x-auto rounded-2xl border border-[#e5ece9]">
        <table class="w-full text-left text-xs whitespace-nowrap">
          <thead class="bg-[#fafcfb] border-b border-[#e5ece9] text-[#4e6057] font-black uppercase text-[11px]">
            <tr>
              <th class="py-3 px-4">วันและเวลาจำลอง</th>
              <th class="py-3 px-4">ประเภทเหตุการณ์</th>
              <th class="py-3 px-4 text-center">ระดับ</th>
              <th class="py-3 px-4 text-center">รหัสโค</th>
              <th class="py-3 px-4 text-center">THI ขณะเกิดเหตุ</th>
              <th class="py-3 px-4">ข้อความแจ้งเตือน</th>
              <th class="py-3 px-4 text-center">การจัดการ & Feedback</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f0f4f2] bg-white">
            <tr 
              v-for="alert in simulationAlerts" 
              :key="alert.id"
              class="hover:bg-[#fafcfb] transition-colors">
              
              <!-- Time -->
              <td class="py-3 px-4 font-mono text-[11px] text-[#718078]">
                {{ formatDateTime(alert.created_at) }}
              </td>

              <!-- Alert Type -->
              <td class="py-3 px-4 font-bold text-[#24433a]">
                {{ formatAlertType(alert.alert_type) }}
              </td>

              <!-- Severity Badge -->
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="alert.severity === 'severe' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'">
                  {{ alert.severity }}
                </span>
              </td>

              <!-- Track ID -->
              <td class="py-3 px-4 text-center font-mono font-bold text-[#24433a]">
                #{{ alert.track_id || '-' }}
              </td>

              <!-- THI -->
              <td class="py-3 px-4 text-center font-mono font-bold" :class="Number(alert.thi_at_event) >= 80 ? 'text-rose-600' : 'text-amber-700'">
                {{ alert.thi_at_event ? Number(alert.thi_at_event).toFixed(1) : '-' }}
              </td>

              <!-- Message -->
              <td class="py-3 px-4 text-[#4e6057] max-w-xs truncate" :title="alert.message_th">
                {{ alert.message_th || '-' }}
              </td>

              <!-- Actions & Feedback -->
              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5 flex-wrap">
                  <button 
                    v-if="!alert.is_resolved"
                    type="button" 
                    @click="resolveAlert(alert.id)"
                    class="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold transition-all cursor-pointer">
                    แก้แล้ว
                  </button>
                  <span v-else class="text-[10px] text-[#718078] font-medium">
                    ✅ แก้แล้ว
                  </span>

                  <!-- Human Feedback -->
                  <div class="flex items-center gap-1 border-l pl-1.5 border-[#e5ece9]">
                    <template v-if="alert.is_accurate === true">
                      <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        👍 แม่นยำ
                      </span>
                    </template>
                    <template v-else-if="alert.is_accurate === false">
                      <span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                        👎 หลอก
                      </span>
                    </template>
                    <template v-else>
                      <button 
                        type="button"
                        @click="submitFeedback(alert, true)"
                        title="ยืนยันแม่นยำ"
                        class="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold cursor-pointer">
                        👍
                      </button>
                      <button 
                        type="button"
                        @click="submitFeedback(alert, false)"
                        title="ระบุว่าแจ้งเตือนหลอก"
                        class="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer">
                        👎
                      </button>
                    </template>
                  </div>
                </div>
              </td>

            </tr>

            <tr v-if="simulationAlerts.length === 0">
              <td colspan="7" class="py-8 text-center text-[#718078] italic">
                ยังไม่มีรายการแจ้งเตือนจำลองในระบบ กดปุ่ม "ยิงสัญญาณแจ้งเตือนฉุกเฉิน" ด้านบนเพื่อทดสอบสร้างการแจ้งเตือน
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { Admin } from '~/API/baseAPI'

definePageMeta({
  layout: 'admin',
  alias: ['/Admin/simulation', '/Admin/simulator']
})

useHead({
  title: 'สภาพแวดล้อมจำลอง (Simulation Sandbox) | CowCare AI'
})

const route = useRoute()
const router = useRouter()

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
const farmsList = ref([])
const selectedFarmId = ref('')
const currentFarm = ref(null)
const registeredCameras = ref([])
const detectedCameras = ref([
  { index: 0, label: 'กล้อง 0: HD Webcam C615 (USB Webcam)', is_usb: true, name: 'HD Webcam C615' },
  { index: 1, label: 'กล้อง 1: กล้อง FaceTime แบบ HD (MacBook)', is_usb: false, name: 'FaceTime HD' }
])

const isCameraStreamActive = ref(false)
const selectedCameraSource = ref('simulation')
const cameraFlip = ref(false)
const cameraStreamKey = ref(Date.now())
const cameraFeedError = ref(false)

// Environmental Sim Values
const simTemp = ref(32.0)
const simHum = ref(82)

// Posture Sim Values
const simStandingPct = ref(65)
const simLyingPct = ref(35)
const simFeedingPct = ref(15)
const simDrinkingPct = ref(8)

// Scenario & Trigger State
const activeScenario = ref('CaseA')
const isTriggering = ref(false)
const isPublishing = ref(false)
const simulationAlerts = ref([])

// -------------------------------------------------------------
// Computations (Thai Tropical Calibration: Boonkum et al. 2024)
// -------------------------------------------------------------
const rawThi = computed(() => {
  const t = simTemp.value
  const rh = simHum.value
  return (1.8 * t + 32) - (0.55 - 0.0055 * rh) * (1.8 * t - 26)
})

const thaiThi = computed(() => {
  const raw = rawThi.value
  if (simTemp.value < 27.5) {
    return raw - 0.6 * (27.5 - simTemp.value)
  }
  return raw
})

const riskLabel = computed(() => {
  const val = thaiThi.value
  if (val >= 84.0) return 'วิกฤต (Severe)'
  if (val >= 80.0) return 'กระทบปานกลาง (Moderate)'
  if (val >= 76.0) return 'เริ่มเฝ้าระวัง (Mild)'
  return 'ปกติ (Normal)'
})

const riskBadgeClass = computed(() => {
  const val = thaiThi.value
  if (val >= 84.0) return 'bg-rose-100 text-rose-800 border border-rose-300'
  if (val >= 80.0) return 'bg-orange-100 text-orange-800 border border-orange-300'
  if (val >= 76.0) return 'bg-amber-100 text-amber-800 border border-amber-300'
  return 'bg-emerald-100 text-emerald-800 border border-emerald-300'
})

const simMilkLoss = computed(() => {
  const thi = thaiThi.value
  return thi > 76.0 ? Math.max(0.0, (thi - 76.0) * 0.45) : 0.0
})

const totalCows = computed(() => {
  return currentFarm.value?.total_cows || 25
})

const simCci = computed(() => {
  const total = simLyingPct.value + simStandingPct.value
  if (total === 0) return 85.0
  return (simLyingPct.value / total) * 100
})

const cciBadgeClass = computed(() => {
  if (simCci.value >= 85) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (simCci.value >= 75) return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
})

// Camera Labels & URLs
const currentCameraSourceLabel = computed(() => {
  if (selectedCameraSource.value === 'simulation') {
    return 'จำลอง: sample_barn.mp4'
  }
  if (selectedCameraSource.value.startsWith('rtsp-')) {
    const camId = selectedCameraSource.value.replace('rtsp-', '')
    const cam = registeredCameras.value.find(c => String(c.id) === String(camId))
    return cam ? `${cam.camera_name} (${cam.ip_address})` : 'Hikvision RTSP'
  }
  const idx = parseInt(selectedCameraSource.value.replace('usb-', '') || '0', 10)
  const found = detectedCameras.value.find(d => d.index === idx)
  return found ? (found.name || found.label) : `USB Cam ${idx}`
})

const cameraStreamUrl = computed(() => {
  if (selectedCameraSource.value === 'simulation') {
    return `http://localhost:8000/api/cam/stream?cam_id=simulation&sample_video=sample_barn.mp4&flip=${cameraFlip.value}&t=${cameraStreamKey.value}`
  }
  if (selectedCameraSource.value.startsWith('rtsp-')) {
    const camId = selectedCameraSource.value.replace('rtsp-', '')
    const cam = registeredCameras.value.find(c => String(c.id) === String(camId))
    const url = cam ? (cam.sub_stream_url || cam.main_stream_url) : ''
    return `http://localhost:8000/api/cam/stream?cam_id=rtsp&rtsp_url=${encodeURIComponent(url)}&flip=${cameraFlip.value}&t=${cameraStreamKey.value}`
  }
  const idx = parseInt(selectedCameraSource.value.replace('usb-', '') || '0', 10)
  return `http://localhost:8000/api/cam/stream?cam_id=${idx}&flip=${cameraFlip.value}&t=${cameraStreamKey.value}`
})

// Multimodal Gate Status Badge
const multimodalGateBadge = computed(() => {
  if (activeScenario.value === 'CaseA') {
    return {
      status: 'MULTIMODAL_VERIFIED',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      description: 'Case A (Concordant Multimodal Synergy): เซ็นเซอร์สิ่งแวดล้อมและกล้อง AI เห็นตรงกันว่าโคเกิดภาวะความเครียด (THI ≥ 76.0 และ CCI < 70%) คำนวณความมั่นใจรวมด้วยทฤษฎีความน่าจะเป็นอิสระ final_confidence = 1 - (1 - p_s)*(1 - p_v)'
    }
  }
  if (activeScenario.value === 'CaseB') {
    return {
      status: 'SENSOR_DRIFT_SUSPECTED',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
      description: 'Case B (Sensor False-Positive Guard): เซ็นเซอร์รายงาน THI สูงเกิน 80.0 แต่กล้อง AI ยืนยันว่าโคนอนพักผ่อนสบาย (CCI ≥ 75% และไม่หอบ) ระบบตรวจจับว่าเป็น Artifact จากแดดส่องกล่องเซ็นเซอร์ และระงับการพ่นหมอกฉุกเฉินอัตโนมัติ'
    }
  }
  return {
    status: 'FAILSAFE_THAI_HEURISTIC',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Case C (Camera False-Negative Fail-Safe): กล้องออฟไลน์หรือเลนส์มัวฝุ่น แต่เซ็นเซอร์รายงาน THI ≥ 80.0 ระบบสลับเข้าโหมด Fail-Safe ส่งการแจ้งเตือนสัตวศาสตร์ไทยต่อไปอย่างต่อเนื่อง 100% Uptime'
  }
})

// -------------------------------------------------------------
// Methods & Actions
// -------------------------------------------------------------
const getToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

const toggleCameraStream = () => {
  cameraFeedError.value = false
  isCameraStreamActive.value = !isCameraStreamActive.value
  if (isCameraStreamActive.value) {
    cameraStreamKey.value = Date.now()
  }
}

const onCameraSourceChange = () => {
  cameraFeedError.value = false
  cameraStreamKey.value = Date.now()
}

const resetToDefaults = () => {
  simTemp.value = 32.0
  simHum.value = 82
  simStandingPct.value = 65
  simLyingPct.value = 35
  simFeedingPct.value = 15
  simDrinkingPct.value = 8
  activeScenario.value = 'CaseA'
}

const applyGateScenario = (sc) => {
  activeScenario.value = sc
  if (sc === 'CaseA') {
    simTemp.value = 33.5
    simHum.value = 80
    simStandingPct.value = 75
    simLyingPct.value = 25
  } else if (sc === 'CaseB') {
    simTemp.value = 34.0
    simHum.value = 85
    simStandingPct.value = 15
    simLyingPct.value = 85
  } else if (sc === 'CaseC') {
    simTemp.value = 32.5
    simHum.value = 78
    isCameraStreamActive.value = false
  }
}

const fetchFarms = async () => {
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data && res.data.rows && res.data.rows.length > 0) {
      farmsList.value = res.data.rows
      
      const queryFarmId = route.query.farm_id
      if (queryFarmId && farmsList.value.some(f => String(f.id_farms) === String(queryFarmId))) {
        selectedFarmId.value = queryFarmId
      } else {
        selectedFarmId.value = farmsList.value[0].id_farms
      }
      onFarmSelected()
    } else {
      // Mock sandbox farm fallback
      farmsList.value = [
        {
          id_farms: 'sandbox-default',
          name_farms: 'ฟาร์มตัวอย่างจำลอง Smart Barn A',
          total_cows: 25,
          owner_name: 'สหกรณ์โคนมตัวอย่าง',
          cooling_system: 'พัดลมระบายอากาศ 36 นิ้ว + พ่นหมอก'
        }
      ]
      selectedFarmId.value = 'sandbox-default'
      onFarmSelected()
    }
  } catch (err) {
    console.error('Failed to load farms:', err)
  }
}

const onFarmSelected = async () => {
  const found = farmsList.value.find(f => String(f.id_farms) === String(selectedFarmId.value))
  currentFarm.value = found || null
  if (selectedFarmId.value && selectedFarmId.value !== 'sandbox-default') {
    await fetchRegisteredCameras()
    await fetchSimulationAlerts()
  }
}

const fetchCameraDevices = async () => {
  try {
    const res = await axios.get('http://localhost:8000/api/cam/devices', { timeout: 3000 })
    if (res.data && res.data.devices && res.data.devices.length > 0) {
      detectedCameras.value = res.data.devices
    }
  } catch (e) {
    console.warn('[Camera API] Fallback to mock device list')
  }
}

const fetchRegisteredCameras = async () => {
  if (!selectedFarmId.value || selectedFarmId.value === 'sandbox-default') return
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms/${selectedFarmId.value}/cameras`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data && res.data.cameras) {
      registeredCameras.value = res.data.cameras
    }
  } catch (e) {
    console.warn('Could not fetch registered cameras:', e)
  }
}

const fetchSimulationAlerts = async () => {
  if (!selectedFarmId.value || selectedFarmId.value === 'sandbox-default') return
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms/${selectedFarmId.value}/cameras/alerts`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data && res.data.alerts) {
      // Only show simulated alerts
      simulationAlerts.value = res.data.alerts.filter(a => a.is_simulation === true)
    }
  } catch (e) {
    console.warn('Could not fetch simulation alerts:', e)
  }
}

// -------------------------------------------------------------
// One-Click Anomaly Triggers
// -------------------------------------------------------------
const triggerAlert = async (type) => {
  if (isTriggering.value) return
  isTriggering.value = true

  let payload = {}
  if (type === 'prolonged_standing') {
    payload = {
      alert_type: 'prolonged_standing',
      severity: 'severe',
      track_id: 102,
      duration_minutes: 195,
      message_th: 'ตรวจพบโคหมายเลข #102 ยืนแช่ต่อเนื่อง 195 นาทีโดยไม่ยอมนอนพัก เสี่ยงต่อโรคกีบและความเครียดรุนแรง',
      thi_at_event: parseFloat(thaiThi.value.toFixed(1)),
      is_simulation: true
    }
  } else if (type === 'downer_cow') {
    payload = {
      alert_type: 'downer_cow',
      severity: 'severe',
      track_id: 105,
      duration_minutes: 260,
      message_th: 'ตรวจพบโคหมายเลข #105 นอนนิ่งต่อเนื่อง 260 นาที ไม่ลุกมากินอาหารหรือดื่มน้ำ เสี่ยงภาวะไข้น้ำนมหรือเจ็บป่วยรุนแรง',
      thi_at_event: parseFloat(thaiThi.value.toFixed(1)),
      is_simulation: true
    }
  } else if (type === 'severe_heat_stress') {
    payload = {
      alert_type: 'severe_heat_stress',
      severity: 'severe',
      duration_minutes: 120,
      message_th: `ตรวจพบวิกฤตความร้อนสะสม THI ${thaiThi.value.toFixed(1)} ท่ามกลางความชื้น ${simHum.value}% โคหอบรุนแรง (ห้ามพ่นหมอกเด็ดขาด ให้เปิดพัดลมเป่าระบายอากาศสูงสุด)`,
      thi_at_event: parseFloat(thaiThi.value.toFixed(1)),
      is_simulation: true
    }
  } else if (type === 'panting_spike') {
    payload = {
      alert_type: 'panting_spike',
      severity: 'moderate',
      track_id: 108,
      duration_minutes: 45,
      message_th: 'ตรวจพบอัตราการหายใจหอบสูงผิดปกติ (Panting Rate > 65 bpm) แสดงถึงการระบายความร้อนทางปอดทำงานหนักเกินขีดจำกัด',
      thi_at_event: parseFloat(thaiThi.value.toFixed(1)),
      is_simulation: true
    }
  }

  try {
    const token = getToken()
    if (selectedFarmId.value && selectedFarmId.value !== 'sandbox-default') {
      const res = await axios.post(`${Admin}/farms/${selectedFarmId.value}/cameras/alerts`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.data && res.data.alert) {
        simulationAlerts.value.unshift(res.data.alert)
      }
    } else {
      // Local mockup alert
      simulationAlerts.value.unshift({
        id: 'sim-' + Date.now(),
        ...payload,
        created_at: new Date().toISOString(),
        is_resolved: false
      })
    }
  } catch (e) {
    console.error('Trigger alert failed:', e)
  } finally {
    isTriggering.value = false
  }
}

// Publish Telemetry to DB
const publishSimulationTelemetry = async () => {
  if (isPublishing.value) return
  isPublishing.value = true
  try {
    const token = getToken()
    const payload = {
      total_cows_detected: totalCows.value,
      standing_count: Math.round((simStandingPct.value / 100) * totalCows.value),
      lying_count: Math.round((simLyingPct.value / 100) * totalCows.value),
      feeding_count: Math.round((simFeedingPct.value / 100) * totalCows.value),
      drinking_count: Math.round((simDrinkingPct.value / 100) * totalCows.value),
      standing_pct: simStandingPct.value,
      lying_pct: simLyingPct.value,
      feeding_pct: simFeedingPct.value,
      drinking_pct: simDrinkingPct.value,
      cow_comfort_index: parseFloat(simCci.value.toFixed(1)),
      ai_confidence_avg: 0.91,
      active_track_ids: [101, 102, 103, 104, 105],
      is_simulation: true
    }

    if (selectedFarmId.value && selectedFarmId.value !== 'sandbox-default') {
      await axios.post(`${Admin}/farms/${selectedFarmId.value}/cameras/telemetry`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
    }
    alert('บันทึกข้อมูลเทเลเมทรีจำลองเข้าสู่ตาราง cctv_behavior_telemetry (is_simulation = true) เรียบร้อยแล้ว')
  } catch (e) {
    console.error('Publish telemetry failed:', e)
  } finally {
    isPublishing.value = false
  }
}

const resolveAlert = async (alertId) => {
  try {
    const token = getToken()
    if (selectedFarmId.value && selectedFarmId.value !== 'sandbox-default') {
      await axios.patch(`${Admin}/farms/${selectedFarmId.value}/cameras/alerts/${alertId}/resolve`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
    }
    const found = simulationAlerts.value.find(a => a.id === alertId)
    if (found) found.is_resolved = true
  } catch (e) {
    console.error('Failed to resolve alert:', e)
  }
}

const submitFeedback = async (alert, isAccurate) => {
  try {
    const token = getToken()
    if (selectedFarmId.value && selectedFarmId.value !== 'sandbox-default') {
      await axios.post(
        `${Admin}/farms/${selectedFarmId.value}/cameras/alerts/${alert.id}/feedback`,
        { is_accurate: isAccurate },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
    }
    alert.is_accurate = isAccurate
    alert.feedback_at = new Date().toISOString()
  } catch (e) {
    console.error('Feedback failed:', e)
  }
}

const formatAlertType = (type) => {
  switch (type) {
    case 'prolonged_standing': return '🚨 ยืนแช่นานเกิน 3 ชม.'
    case 'downer_cow': return '🚨 แม่โคนอนนิ่งไม่ลุก'
    case 'severe_heat_stress': return '🌧️ วิกฤตความร้อนสะสม'
    case 'panting_spike': return '💨 โคหอบถี่ผิดปกติ'
    default: return type || 'แจ้งเตือนพฤติกรรม'
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return dateStr
  }
}

// -------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------
onMounted(() => {
  fetchFarms()
  fetchCameraDevices()
})

onUnmounted(() => {
  isCameraStreamActive.value = false
})
</script>

<style scoped>
/* Custom accent styles */
input[type=range] {
  height: 6px;
  border-radius: 9999px;
}
</style>
