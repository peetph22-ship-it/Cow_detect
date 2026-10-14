<template>
  <div class="landing-page bg-[#FAF9F5] text-[#142820] overflow-x-hidden">
    
    <!-- ========================================================================= -->
    <!-- 🟢 SECTION 1: AIRY HERO & INTERACTIVE THI SIMULATOR                       -->
    <!-- ========================================================================= -->
    <section class="relative pt-32 pb-20 lg:pt-36 lg:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <!-- Subtle Background Grid & Soft Radial Glow -->
      <div class="absolute inset-0 bg-[radial-gradient(#142820_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.03] pointer-events-none"></div>
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#D87939]/10 to-transparent blur-3xl pointer-events-none"></div>

      <div class="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center relative z-10">
        
        <!-- Left Column: Clean Typography & Value Prop (7 Cols) -->
        <div class="lg:col-span-7 space-y-7 hero-enter">
          
          <!-- Minimal Pill Badge -->
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#142820]/10 shadow-[0_2px_10px_rgba(20,40,32,0.03)]">
            <span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span class="text-[11px] font-bold tracking-wider text-[#142820] uppercase">Multimodal AI for Thai Dairy Farms</span>
          </div>

          <!-- Modern Balanced Headline -->
          <h1 class="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-[#142820] leading-[1.18] tracking-tight">
            ดูแลโคนมก่อนเกิดวิกฤตความร้อน 
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#142820] via-[#2B5946] to-[#D87939] block mt-1">
              ด้วยระบบพยากรณ์ล่วงหน้าอัจฉริยะ
            </span>
          </h1>

          <!-- Easy-to-read Subtitle -->
          <p class="text-base sm:text-lg text-[#5A6B63] leading-relaxed max-w-xl font-normal">
            ผสานเซนเซอร์ <span class="text-[#142820] font-semibold">IoT (SHT40)</span>, กล้องตรวจจับพฤติกรรม <span class="text-[#142820] font-semibold">YOLO26m</span> และโมเดล <span class="text-[#142820] font-semibold">LSTM</span> เพื่อแจ้งเตือนล่วงหน้า 3–7 วัน ป้องกันน้ำนมตกจากภาวะความหน่วง 5 วัน (Lag Effect)
          </p>

          <!-- Clean Inline Highlights instead of Heavy Boxes -->
          <div class="grid grid-cols-3 gap-4 pt-1 max-w-lg">
            <div class="border-l-2 border-[#D87939] pl-3">
              <div class="text-xl font-extrabold text-[#142820] tabular-nums">THI 76</div>
              <div class="text-xs text-[#6E7E76]">เกณฑ์วิกฤตโคนมไทย</div>
            </div>
            <div class="border-l-2 border-[#142820]/20 pl-3">
              <div class="text-xl font-extrabold text-[#142820] tabular-nums">3–7 วัน</div>
              <div class="text-xs text-[#6E7E76]">เตือนล่วงหน้าผ่าน LINE</div>
            </div>
            <div class="border-l-2 border-[#10B981] pl-3">
              <div class="text-xl font-extrabold text-[#142820] tabular-nums">-17.5%</div>
              <div class="text-xs text-[#6E7E76]">ลดมีเทนต่อ กก.น้ำนม</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-3.5 pt-2">
            <NuxtLink
              to="/login"
              class="px-7 py-3.5 rounded-full bg-[#142820] hover:bg-[#D87939] text-white font-bold text-sm shadow-[0_10px_25px_rgba(20,40,32,0.15)] transition-all duration-300 flex items-center gap-2 text-decoration-none group">
              <span>เริ่มต้นใช้งานระบบ</span>
              <v-icon icon="mdi-arrow-right" size="16" class="group-hover:translate-x-1 transition-transform" />
            </NuxtLink>

            <button
              type="button"
              @click="scrollToSection('#solution')"
              class="px-6 py-3.5 rounded-full bg-white hover:bg-[#F2F4F2] text-[#142820] border border-[#142820]/10 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer">
              <span>ดูหลักการทำงาน</span>
            </button>
          </div>

        </div>

        <!-- Right Column: Sleek Interactive THI Widget (5 Cols) -->
        <div id="sandbox-card" class="lg:col-span-5 hero-enter-delay">
          <div class="bg-white rounded-[28px] p-6 sm:p-7 border border-[#142820]/8 shadow-[0_24px_60px_rgba(20,40,32,0.06)] relative">
            
            <!-- Widget Header -->
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-base font-extrabold text-[#142820]">เครื่องจำลองดัชนีความร้อน (THI)</h2>
                <p class="text-xs text-[#6E7E76]">ปรับค่าหรือเลือกสภาพอากาศเพื่อดูคำแนะนำทันที</p>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F2F4F2] text-[#142820]">
                NRC 1971
              </span>
            </div>

            <!-- Interactive Weather Chips -->
            <div class="flex flex-wrap gap-1.5 mb-5">
              <button
                v-for="(p, idx) in presets"
                :key="idx"
                type="button"
                @click="applyPreset(p, idx)"
                class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                :class="activePresetIdx === idx 
                  ? 'bg-[#142820] text-white shadow-sm' 
                  : 'bg-[#F5F7F6] text-[#5A6B63] hover:bg-[#EAECEB]'">
                {{ p.icon }} {{ p.name }}
              </button>
            </div>

            <!-- Live THI Score Display -->
            <div 
              class="p-5 rounded-2xl transition-colors duration-300 mb-5"
              :style="{ backgroundColor: riskState.bgColor }">
              <div class="flex items-baseline justify-between">
                <div>
                  <span class="text-[11px] font-bold uppercase tracking-wider" :style="{ color: riskState.color }">
                    {{ riskState.name }}
                  </span>
                  <div class="text-5xl font-black tabular-nums tracking-tight mt-0.5" :style="{ color: riskState.color }">
                    {{ roundedThi }}
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-[11px] text-[#6E7E76] block">ผลกระทบน้ำนม</span>
                  <span class="text-sm font-extrabold" :style="{ color: riskState.color }">
                    {{ riskState.milkImpact }}
                  </span>
                </div>
              </div>

              <!-- Smooth Progress Bar -->
              <div class="mt-4">
                <div class="relative h-2 w-full rounded-full bg-black/10 overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-300"
                    :style="{ width: gaugePos + '%', backgroundColor: riskState.color }">
                  </div>
                </div>
                <div class="flex justify-between text-[10px] text-[#6E7E76] font-semibold mt-1.5">
                  <span>ปกติ (&lt;76)</span>
                  <span>เริ่มเครียด (76)</span>
                  <span>ปานกลาง (80)</span>
                  <span>วิกฤต (84+)</span>
                </div>
              </div>
            </div>

            <!-- Clean Sliders -->
            <div class="space-y-4 mb-5">
              <div>
                <div class="flex justify-between text-xs mb-1.5">
                  <span class="text-[#5A6B63] font-medium">อุณหภูมิอากาศ (T)</span>
                  <span class="font-bold text-[#142820] tabular-nums">{{ t.toFixed(1) }} °C</span>
                </div>
                <input 
                  type="range" 
                  v-model.number="t" 
                  @input="activePresetIdx = null"
                  min="20" max="42" step="0.5" 
                  class="w-full accent-[#142820] cursor-pointer h-1.5 bg-[#EAECEB] rounded-lg appearance-none" 
                />
              </div>

              <div>
                <div class="flex justify-between text-xs mb-1.5">
                  <span class="text-[#5A6B63] font-medium">ความชื้นสัมพัทธ์ (RH)</span>
                  <span class="font-bold text-[#142820] tabular-nums">{{ rh }} %</span>
                </div>
                <input 
                  type="range" 
                  v-model.number="rh" 
                  @input="activePresetIdx = null"
                  min="30" max="100" step="1" 
                  class="w-full accent-[#142820] cursor-pointer h-1.5 bg-[#EAECEB] rounded-lg appearance-none" 
                />
              </div>
            </div>

            <!-- Minimal Advisory Footer -->
            <div class="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#142820]/6 flex items-start gap-3">
              <div 
                class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                :style="{ backgroundColor: riskState.color + '20', color: riskState.color }">
                <v-icon icon="mdi-lightbulb-on-outline" size="15" />
              </div>
              <div class="text-xs text-[#4A5A52] leading-relaxed">
                <strong class="text-[#142820] block mb-0.5">คำแนะนำจาก AI:</strong>
                {{ riskState.action }}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>


    <!-- ========================================================================= -->
    <!-- 🟢 SECTION 2: INTERACTIVE 3-LAYER ARCHITECTURE (SWITCHABLE SHOWCASE)      -->
    <!-- ========================================================================= -->
    <section id="solution" class="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-[1280px] mx-auto reveal">
      
      <div class="text-center max-w-2xl mx-auto mb-12">
        <span class="text-xs font-bold text-[#D87939] uppercase tracking-widest">HOW IT WORKS</span>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-[#142820] tracking-tight mt-2">
          ทำงานครบวงจรใน 3 ขั้นตอนอัจฉริยะ
        </h2>
        <p class="text-sm sm:text-base text-[#5A6B63] mt-2">
          คลิกเลือกแต่ละชั้นเพื่อดูว่าเรานำข้อมูลจากโรงเรือนมาแปลงเป็นคำแนะนำได้อย่างไร
        </p>
      </div>

      <!-- Interactive Layer Selector Pills -->
      <div class="flex flex-wrap justify-center gap-2 mb-10">
        <button
          v-for="(layer, idx) in archLayers"
          :key="layer.id"
          type="button"
          @click="activeLayer = idx"
          class="px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-2.5 cursor-pointer"
          :class="activeLayer === idx 
            ? 'bg-[#142820] text-white shadow-md scale-[1.02]' 
            : 'bg-white text-[#5A6B63] border border-[#142820]/8 hover:bg-[#F2F4F2]'">
          <span 
            class="w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-extrabold"
            :class="activeLayer === idx ? 'bg-[#D87939] text-white' : 'bg-[#F2F4F2] text-[#142820]'">
            0{{ idx + 1 }}
          </span>
          <span>{{ layer.tabTitle }}</span>
        </button>
      </div>

      <!-- Active Layer Content Panel -->
      <div class="bg-white rounded-[32px] p-6 sm:p-10 lg:p-12 border border-[#142820]/8 shadow-[0_16px_40px_rgba(20,40,32,0.04)]">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          <!-- Left Description (6 Cols) -->
          <div class="lg:col-span-6 space-y-5">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF9F5] text-[#D87939] border border-[#D87939]/20">
              <v-icon :icon="archLayers[activeLayer].icon" size="16" />
              <span>{{ archLayers[activeLayer].badge }}</span>
            </div>
            
            <h3 class="text-2xl sm:text-3xl font-extrabold text-[#142820] leading-snug">
              {{ archLayers[activeLayer].title }}
            </h3>
            
            <p class="text-sm sm:text-base text-[#5A6B63] leading-relaxed">
              {{ archLayers[activeLayer].desc }}
            </p>

            <ul class="space-y-2.5 pt-2">
              <li 
                v-for="(point, pIdx) in archLayers[activeLayer].points" 
                :key="pIdx"
                class="flex items-start gap-2.5 text-xs sm:text-sm text-[#142820] font-medium">
                <v-icon icon="mdi-check-circle" size="18" class="text-[#10B981] shrink-0 mt-0.5" />
                <span>{{ point }}</span>
              </li>
            </ul>
          </div>

          <!-- Right Interactive Visual Preview (6 Cols) -->
          <div class="lg:col-span-6">
            
            <!-- Visual 0: SENSE (Camera + IoT Preview) -->
            <div v-if="activeLayer === 0" class="bg-[#142820] text-white rounded-3xl p-6 space-y-4">
              <div class="flex items-center justify-between text-xs text-white/70 pb-3 border-b border-white/10">
                <span class="flex items-center gap-2 font-mono">
                  <span class="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
                  YOLO26m Vision + SHT40 Sensor
                </span>
                <span class="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono">RS485 Modbus</span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div 
                  v-for="cow in cowBehaviors" 
                  :key="cow.id"
                  class="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div class="flex justify-between items-center text-[11px] text-white/60 font-mono mb-1">
                    <span>{{ cow.id }}</span>
                    <span class="text-[#10B981]">{{ cow.conf }}</span>
                  </div>
                  <div class="text-sm font-bold text-white">{{ cow.label }}</div>
                  <div class="text-[11px] text-white/60 mt-0.5">{{ cow.sub }}</div>
                </div>
              </div>
            </div>

            <!-- Visual 1: RECOMMEND (LINE Proactive Chat) -->
            <div v-else-if="activeLayer === 1" class="bg-[#FAF9F5] rounded-3xl p-6 border border-[#142820]/8 space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-2xl bg-[#06C755] text-white flex items-center justify-center font-black text-xs">
                    LINE
                  </div>
                  <div>
                    <div class="text-xs font-extrabold text-[#142820]">CowCare AI Assistant</div>
                    <div class="text-[11px] text-[#6E7E76]">ส่งแจ้งเตือนล่วงหน้าอัตโนมัติ</div>
                  </div>
                </div>
                <span class="text-[11px] font-bold text-[#D87939] bg-[#FFF7ED] px-2.5 py-1 rounded-full">
                  ล่วงหน้า 3 วัน
                </span>
              </div>

              <div class="p-4 rounded-2xl bg-white border border-[#142820]/6 text-xs text-[#142820] leading-relaxed shadow-sm space-y-2">
                <div class="font-bold text-[#D87939]">⚠️ พยากรณ์อากาศร้อนสะสม (17–19 ต.ค.)</div>
                <p class="text-[#4A5A52]">
                  ระบบคาดการณ์ว่าค่า THI ในโรงเรือนจะแตะระดับ <strong>82.4 (เครียดปานกลาง)</strong> ในอีก 3 วันข้างหน้า
                </p>
                <div class="p-2.5 rounded-xl bg-[#FAF9F5] text-[11.5px] font-medium text-[#142820]">
                  ✅ <strong>สิ่งที่ควรทำดักล่วงหน้า:</strong> เปิดพัดลมระบายอากาศและสเปรย์พ่นหมอกช่วง 11:30–15:30 น. เพื่อป้องกันน้ำนมตกในสัปดาห์หน้า
                </div>
              </div>
            </div>

            <!-- Visual 2: CAPITALIZE (ESG & Digital Logbook) -->
            <div v-else class="bg-[#FAF9F5] rounded-3xl p-6 border border-[#142820]/8 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-extrabold text-[#142820]">Digital Farm Logbook</div>
                  <div class="text-xs text-[#6E7E76]">รายงานความยั่งยืนและสุขภาพโคนมรายสัปดาห์</div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#047857]">
                  ESG Ready
                </span>
              </div>

              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="p-3 bg-white rounded-2xl border border-[#142820]/6">
                  <span class="text-[10px] text-[#6E7E76] block">THI เฉลี่ย</span>
                  <span class="text-lg font-extrabold text-[#142820] tabular-nums">74.8</span>
                </div>
                <div class="p-3 bg-white rounded-2xl border border-[#142820]/6">
                  <span class="text-[10px] text-[#6E7E76] block">ลดมีเทนสะสม</span>
                  <span class="text-lg font-extrabold text-[#10B981] tabular-nums">-17.5%</span>
                </div>
                <div class="p-3 bg-white rounded-2xl border border-[#142820]/6">
                  <span class="text-[10px] text-[#6E7E76] block">ความครบถ้วน</span>
                  <span class="text-lg font-extrabold text-[#142820] tabular-nums">98.4%</span>
                </div>
              </div>

              <!-- Clean Sparkline -->
              <div class="p-4 bg-white rounded-2xl border border-[#142820]/6">
                <svg viewBox="0 0 320 60" class="w-full h-14 overflow-visible">
                  <line x1="0" y1="25" x2="320" y2="25" stroke="#D87939" stroke-width="1" stroke-dasharray="4,4" />
                  <polyline
                    fill="none"
                    stroke="#142820"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    points="0,45 53,40 106,32 160,22 213,16 266,30 320,42"
                  />
                  <circle cx="213" cy="16" r="4" fill="#D87939" />
                </svg>
                <div class="flex justify-between text-[10px] text-[#6E7E76] mt-1">
                  <span>จันทร์</span>
                  <span>พุธ</span>
                  <span class="text-[#D87939] font-bold">ศุกร์ (เตือนล่วงหน้าสำเร็จ)</span>
                  <span>อาทิตย์</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

    </section>


    <!-- ========================================================================= -->
    <!-- 🟢 SECTION 3: INTERACTIVE REACTIVE VS PROACTIVE COMPARISON (#LSTM)        -->
    <!-- ========================================================================= -->
    <section id="lstm" class="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-[#142820] text-white reveal">
      <div class="max-w-[1280px] mx-auto">
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <!-- Left: Explanation & Interactive Mode Switcher (6 Cols) -->
          <div class="lg:col-span-6 space-y-6">
            <span class="text-xs font-bold text-[#F2BD7C] uppercase tracking-widest">5-DAY LAG EFFECT PROTECTION</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              ทำไมการรอดูอาการวัวหอบ ถึงสายเกินไปเสมอ?
            </h2>
            <p class="text-sm sm:text-base text-white/75 leading-relaxed">
              งานวิจัยพบว่าหลังโคนมเผชิญความร้อนสะสม น้ำนมจะดิ่งลงต่ำสุดในอีก <strong>5 วันถัดมา</strong> โมเดล <strong>LSTM (ความแม่นยำ 96.08%)</strong> ของเราจึงจดจำข้อมูลย้อนหลัง 14 วัน เพื่อเตือนให้คุณเปิดพัดลมและพ่นหมอกดักล่วงหน้า
            </p>

            <!-- Toggle Switch: Reactive vs Proactive -->
            <div class="inline-flex p-1.5 rounded-2xl bg-white/10 border border-white/10">
              <button
                type="button"
                @click="comparisonMode = 'proactive'"
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="comparisonMode === 'proactive' 
                  ? 'bg-[#10B981] text-[#142820] shadow-sm' 
                  : 'text-white/70 hover:text-white'">
                ✨ ใช้ CowCare AI (เชิงรุก)
              </button>
              <button
                type="button"
                @click="comparisonMode = 'reactive'"
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="comparisonMode === 'reactive' 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'text-white/70 hover:text-white'">
                ⚠️ ฟาร์มทั่วไป (ตั้งรับ)
              </button>
            </div>
          </div>

          <!-- Right: Dynamic Comparison Outcome Card (6 Cols) -->
          <div class="lg:col-span-6">
            <div class="rounded-[28px] p-6 sm:p-8 bg-white/5 border border-white/10 backdrop-blur-sm space-y-6">
              
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs uppercase tracking-wider font-bold" :class="comparisonMode === 'proactive' ? 'text-[#10B981]' : 'text-rose-400'">
                    {{ comparisonMode === 'proactive' ? 'PROACTIVE FARMING' : 'REACTIVE MANAGEMENT' }}
                  </span>
                  <h3 class="text-xl font-extrabold text-white mt-0.5">
                    {{ comparisonMode === 'proactive' ? 'ป้องกันน้ำนมตกได้ก่อนเกิดวิกฤต' : 'สูญเสียน้ำนมสะสมต่อเนื่อง 5 วัน' }}
                  </h3>
                </div>
                <div 
                  class="px-3.5 py-1.5 rounded-full text-xs font-extrabold"
                  :class="comparisonMode === 'proactive' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-rose-500/20 text-rose-300'">
                  {{ comparisonMode === 'proactive' ? 'น้ำนมคงที่ 100%' : 'น้ำนมลด -15 ถึง -25%' }}
                </div>
              </div>

              <!-- Timeline Steps -->
              <div class="space-y-3">
                <div 
                  v-for="(step, sIdx) in activeComparisonSteps" 
                  :key="sIdx"
                  class="p-4 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/10 text-[#F2BD7C]">
                      {{ step.day }}
                    </span>
                    <span class="text-xs sm:text-sm font-medium text-white/90">{{ step.event }}</span>
                  </div>
                  <span class="text-xs font-bold" :class="step.statusClass">{{ step.outcome }}</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>


    <!-- ========================================================================= -->
    <!-- 🟢 SECTION 4: PEER-REVIEWED RESEARCH FOUNDATION                           -->
    <!-- ========================================================================= -->
    <section id="research" class="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-[1280px] mx-auto reveal">
      
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
        <div>
          <span class="text-xs font-bold text-[#D87939] uppercase tracking-widest">SCIENTIFIC BACKING</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-[#142820] tracking-tight mt-1">
            อ้างอิงจากงานวิจัยโคนมระดับนานาชาติ
          </h2>
        </div>
        <p class="text-xs sm:text-sm text-[#5A6B63] max-w-md">
          ทุกตัวแปรในระบบถูกออกแบบตามหลักสรีรวิทยาของโคนมลูกผสมไทยและงานวิจัยล่าสุดปี 2024–2026
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          v-for="(paper, idx) in citations" 
          :key="idx"
          class="bg-white rounded-3xl p-6 border border-[#142820]/8 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(20,40,32,0.06)] transition-all duration-300 flex flex-col justify-between">
          <div>
            <span class="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FAF9F5] text-[#D87939] border border-[#D87939]/20 mb-3">
              {{ paper.journal }}
            </span>
            <h3 class="text-base font-extrabold text-[#142820] mb-2">
              {{ paper.metric }}
            </h3>
            <p class="text-xs text-[#5A6B63] leading-relaxed">
              {{ paper.summary }}
            </p>
          </div>
          <div class="pt-4 mt-4 border-t border-[#142820]/6 text-[11px] font-bold text-[#142820]">
            {{ paper.authors }}
          </div>
        </div>
      </div>

    </section>


    <!-- ========================================================================= -->
    <!-- 🟢 SECTION 5: MINIMAL CALL TO ACTION & FOOTER                             -->
    <!-- ========================================================================= -->
    <section class="pb-20 px-4 sm:px-6 lg:px-8 max-w-[1280px] mx-auto">
      <div class="bg-[#142820] rounded-[32px] p-8 sm:p-12 lg:p-14 text-white flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div class="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-[#D87939]/20 blur-3xl pointer-events-none"></div>

        <div class="space-y-2 text-center lg:text-left max-w-xl relative z-10">
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
            พร้อมยกระดับการดูแลฟาร์มโคนมของคุณหรือยัง?
          </h2>
          <p class="text-xs sm:text-sm text-white/75">
            เข้าสู่ระบบเพื่อตรวจสอบค่า THI แบบเรียลไทม์ ดูกราฟพยากรณ์ล่วงหน้า และจัดการอุปกรณ์ IoT ในเครือข่าย
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3 relative z-10 shrink-0">
          <NuxtLink
            to="/login"
            class="px-7 py-3.5 rounded-full bg-[#D87939] hover:bg-[#c56728] text-white font-bold text-sm transition-all flex items-center gap-2 text-decoration-none shadow-lg">
            <span>เข้าสู่ระบบใช้งาน</span>
            <v-icon icon="mdi-arrow-right" size="16" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <AppFooter />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

useHead({
  title: 'CowCare AI — ระบบพยากรณ์และป้องกันความเครียดความร้อนในโคนม',
  meta: [
    { name: 'description', content: 'ยกระดับการจัดการฟาร์มโคนมไทยด้วย IoT + Computer Vision YOLO26m + LSTM AI Forecast' }
  ]
})

// 1. THI Simulator State
const t = ref(31.5)
const rh = ref(75)
const activePresetIdx = ref(2)

const presets = [
  { name: 'เชียงใหม่ (หนาว)', icon: '🌤️', t: 24.0, rh: 55 },
  { name: 'สระบุรี (ร้อน)', icon: '☀️', t: 34.0, rh: 60 },
  { name: 'ปากช่อง (ฝนชื้น)', icon: '🌧️', t: 31.5, rh: 82 },
  { name: 'คลื่นความร้อนจัด', icon: '🔥', t: 36.5, rh: 78 }
]

const applyPreset = (preset, idx) => {
  t.value = preset.t
  rh.value = preset.rh
  activePresetIdx.value = idx
}

const thi = computed(() => {
  return (1.8 * t.value + 32) - (0.55 - 0.0055 * rh.value) * (1.8 * t.value - 26)
})

const roundedThi = computed(() => Number(thi.value.toFixed(1)))

const gaugePos = computed(() => {
  const clamped = Math.min(92, Math.max(62, roundedThi.value))
  return ((clamped - 62) / (92 - 62)) * 100
})

const riskState = computed(() => {
  const val = roundedThi.value
  if (val < 76.0) {
    return {
      name: 'สภาวะปกติ (Comfort Zone)',
      color: '#059669',
      bgColor: '#ECFDF5',
      milkImpact: 'ปกติ (ไม่สูญเสียน้ำนม)',
      action: 'โคนมกินอาหารและพักผ่อนได้ตามปกติ ดูแลน้ำดื่มสะอาดตามรอบเวลา'
    }
  }
  if (val < 80.0) {
    return {
      name: 'เริ่มเครียด (Mild Stress)',
      color: '#D97706',
      bgColor: '#FFFBEB',
      milkImpact: 'ลดลง -0.28 กก./THI',
      action: 'เปิดพัดลมระบายอากาศเพื่อเร่งการไหลเวียนลมในโรงเรือนทันที'
    }
  }
  if (val < 84.0) {
    return {
      name: 'เครียดปานกลาง (Moderate)',
      color: '#EA580C',
      bgColor: '#FFF7ED',
      milkImpact: 'ลดลง 2 เท่า (-0.56 กก./วัน)',
      action: 'เปิดพัดลมคู่กับระบบสเปรย์พ่นหมอก และหลีกเลี่ยงการผสมเทียมช่วงบ่าย'
    }
  }
  return {
    name: 'วิกฤตรุนแรง (Severe Stress)',
    color: '#E11D48',
    bgColor: '#FFF1F2',
    milkImpact: 'ดิ่งลงหนัก (-0.42 กก./THI)',
    action: 'พ่นหมอกระบายความร้อนเต็มกำลัง และเสริมสารบัฟเฟอร์ Sodium Bicarbonate ในอาหาร'
  }
})

// 2. Interactive 3-Layer Tabs Data
const activeLayer = ref(0)
const archLayers = [
  {
    id: 'sense',
    tabTitle: 'รับรู้สภาพแวดล้อม (Sense)',
    badge: 'LAYER 01 • EDGE & IOT SENSING',
    icon: 'mdi-access-point',
    title: 'เก็บข้อมูลแม่นยำโดยไม่ต้องติดอุปกรณ์บนตัววัว',
    desc: 'ลดต้นทุนให้เกษตรกรรายย่อยด้วยการใช้กล้องวงจรปิดร่วมกับโมเดล YOLO26m ตรวจจับพฤติกรรมโคนม และใช้เซนเซอร์ SHT40 เกรดอุตสาหกรรมวัดอุณหภูมิ-ความชื้นผ่านสาย RS485',
    points: [
      'ตรวจจับ 4 พฤติกรรมหลัก: ยืน, นอนพัก, กินน้ำ, กินอาหาร แบบเรียลไทม์',
      'ไม่ต้องซื้อปลอกคออัจฉริยะราคาแพง ไม่ทำให้วัวเครียด',
      'ส่งข้อมูลเสถียร ทนทานต่อความชื้นและก๊าซแอมโมเนียในโรงเรือน'
    ]
  },
  {
    id: 'recommend',
    tabTitle: 'วิเคราะห์และเตือนล่วงหน้า (Recommend)',
    badge: 'LAYER 02 • PREDICTIVE AI & LINE BOT',
    icon: 'mdi-brain',
    title: 'แปลงข้อมูลซับซ้อนเป็นคำแนะนำภาษาไทยส่งตรงถึง LINE',
    desc: 'โมเดล Deep Learning (LSTM) วิเคราะห์ความร้อนสะสมย้อนหลัง 14 วัน เพื่อพยากรณ์ล่วงหน้า 3–7 วัน พร้อมใช้ Gemini AI สรุปวิธีจัดการโรงเรือนที่เข้าใจง่าย',
    points: [
      'แจ้งเตือนก่อนเกิดผลกระทบน้ำนมตก 5 วัน (5-Day Lag Effect)',
      'ปรับคำแนะนำตามโครงสร้างโรงเรือนจริงของแต่ละฟาร์ม',
      'ใช้งานง่ายผ่าน LINE เหมาะสำหรับเกษตรกรทุกวัย'
    ]
  },
  {
    id: 'capitalize',
    tabTitle: 'ต่อยอดมูลค่าข้อมูล (Capitalize)',
    badge: 'LAYER 03 • DIGITAL LOGBOOK & ESG',
    icon: 'mdi-leaf-circle-outline',
    title: 'สร้างสมุดบันทึกดิจิทัลเพื่อสินเชื่อสีเขียวและความยั่งยืน',
    desc: 'ข้อมูลทุกจุดถูกจัดเก็บลงฐานข้อมูลคลาวด์อย่างเป็นระบบ ช่วยให้ฟาร์มมีหลักฐานยืนยันการจัดการสวัสดิภาพสัตว์และการลดก๊าซเรือนกระจก',
    points: [
      'ลดการปล่อยก๊าซมีเทนต่อกิโลกรัมนม (Methane Intensity) ลงได้ถึง 17.5%',
      'ใช้เป็นหลักฐานประกอบการขอสินเชื่อฟาร์มยั่งยืน (ESG Finance)',
      'รองรับการเคลมประกันภัยโคนมอิงดัชนีสภาพอากาศในอนาคต'
    ]
  }
]

const cowBehaviors = [
  { id: 'COW #102', label: 'Standing (ยืนปกติ)', sub: 'บริเวณรางอาหาร', conf: '94.2%' },
  { id: 'COW #105', label: 'Lying (นอนพักเคี้ยวเอื้อง)', sub: 'ซองนอนโซน B', conf: '91.8%' },
  { id: 'COW #107', label: 'Drinking (ดื่มน้ำ)', sub: 'อ่างน้ำอัตโนมัติ', conf: '89.4%' },
  { id: 'COW #108', label: 'Feeding (กินอาหาร)', sub: 'รางอาหารหลัก', conf: '88.5%' }
]

// 3. Reactive vs Proactive Interactive Comparison
const comparisonMode = ref('proactive')
const activeComparisonSteps = computed(() => {
  if (comparisonMode.value === 'proactive') {
    return [
      { day: 'ล่วงหน้า 3 วัน', event: 'LSTM แจ้งเตือนผ่าน LINE ว่าค่า THI จะพุ่งแตะ 82', outcome: 'เตรียมพร้อมทันที', statusClass: 'text-[#10B981]' },
      { day: 'วันที่อากาศร้อน', event: 'เปิดพัดลมและพ่นหมอกดักล่วงหน้าตามคำแนะนำ AI', outcome: 'วัวไม่เครียดสะสม', statusClass: 'text-[#10B981]' },
      { day: '5 วันถัดมา', event: 'โคนมกินอาหารปกติ อัตราการให้น้ำนมเสถียรต่อเนื่อง', outcome: 'น้ำนมไม่ตก 100%', statusClass: 'text-[#F2BD7C]' }
    ]
  }
  return [
    { day: 'ล่วงหน้า 3 วัน', event: 'ไม่มีระบบพยากรณ์ เกษตรกรไม่ทราบล่วงหน้า', outcome: 'ไม่ได้เตรียมการ', statusClass: 'text-white/50' },
    { day: 'วันที่อากาศร้อน', event: 'รอจนวัวยืนหอบและไม่กินอาหารจึงเพิ่งเปิดพัดลม', outcome: 'เกิดความเครียดสะสม', statusClass: 'text-rose-400' },
    { day: '5 วันถัดมา', event: 'เกิด Lag Effect น้ำนมดิ่งลงและเสี่ยงภาวะกระเพาะเป็นกรด', outcome: 'สูญเสียรายได้หนัก', statusClass: 'text-rose-400' }
  ]
})

// 4. Citations
const citations = [
  {
    journal: 'Animals (MDPI, 2024)',
    metric: 'เกณฑ์วิกฤต THI 76',
    summary: 'พิสูจน์ว่าโคนมลูกผสมไทยเริ่มสูญเสียน้ำนม (-0.28 กก./THI) และอัตราผสมติดลดลงเมื่อค่า THI แตะระดับ 76',
    authors: 'Boonkum et al. (2024)'
  },
  {
    journal: 'Comp. & Elec. in Agr. (2026)',
    metric: '5-Day Lag Effect',
    summary: 'ศึกษาโคนมกว่า 82,000 ตัว พบว่าผลผลิตน้ำนมจะดิ่งลงต่ำสุดใน 5 วันหลังจากสัมผัสความร้อนสะสม',
    authors: 'Hasan et al. (2026)'
  },
  {
    journal: 'J. of Dairy Science (2026)',
    metric: 'Methane +17.5%',
    summary: 'ความเครียดจากความร้อนทำให้โคนมปล่อยก๊าซมีเทนต่อกิโลกรัมนมสูงขึ้นถึง 17.5% การลดความร้อนจึงช่วยโลกได้จริง',
    authors: 'Onan-Martinez et al. (2026)'
  },
  {
    journal: 'J. Anim. Environ. (2026)',
    metric: 'LSTM แม่นยำ 96.08%',
    summary: 'ยืนยันการใช้โมเดล LSTM จดจำข้อมูลย้อนหลัง 14 วัน ร่วมกับ Edge AI ช่วยเตือนภัยความร้อนล่วงหน้าได้แม่นยำสูง',
    authors: 'Mulajkar & Abdourhamane (2026)'
  }
]

const scrollToSection = (selector) => {
  const el = document.querySelector(selector)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let observer = null

onMounted(() => {
  if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1 })

  document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el))
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
@keyframes rise {
  from { opacity: 0; transform: translate3d(0, 18px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
.hero-enter { animation: rise 0.6s ease-out both; }
.hero-enter-delay { animation: rise 0.7s ease-out 0.15s both; }

.reveal {
  opacity: 0;
  transform: translate3d(0, 20px, 0);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}
.reveal.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

#solution, #lstm, #research, #sandbox-card {
  scroll-margin-top: 90px;
}
</style>