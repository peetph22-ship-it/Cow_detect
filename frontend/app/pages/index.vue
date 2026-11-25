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
            รู้ว่าคอกร้อนแค่ไหน
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#142820] via-[#2B5946] to-[#D87939] block mt-1">
              และนอน ยืน กิน นานเท่าไหร่
            </span>
          </h1>

          <!-- Easy-to-read Subtitle -->
          <p class="text-base sm:text-lg text-[#5A6B63] leading-relaxed max-w-xl font-normal">
            วัดอุณหภูมิ ความชื้น และ <span class="text-[#142820] font-semibold">THI</span> ในคอกด้วยเซ็นเซอร์ SHT40 พยากรณ์ล่วงหน้า 3 วัน (ECMWF + ปรับค่าเพี้ยนจากเซ็นเซอร์ฟาร์ม) และ<span class="text-[#142820] font-semibold">ติดตามท่าทางวัวเป้าหมาย 1 ตัว</span>จากกล้องวงจรปิดด้วย YOLO26m — คลิกเลือกวัวบนภาพครั้งเดียว ทุกช่วงพฤติกรรมบันทึก THI ขณะนั้น <span class="text-[#142820] font-semibold">· ต้นแบบ อยู่ระหว่างเตรียมทดลองในฟาร์ม</span>
          </p>

          <!-- Clean Inline Highlights instead of Heavy Boxes -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 max-w-2xl">
            <div class="border-l-2 border-[#D87939] pl-3">
              <div class="text-xl font-extrabold text-[#142820] tabular-nums">THI 74–76</div>
              <div class="text-xs text-[#6E7E76]">จุดเริ่มเครียดโคนมลูกผสมไทย</div>
            </div>
            <div class="border-l-2 border-[#142820]/20 pl-3">
              <div class="text-xl font-extrabold text-[#142820] tabular-nums">3 วัน</div>
              <div class="text-xs text-[#6E7E76]">แนวโน้มความร้อนล่วงหน้า</div>
            </div>
            <div class="border-l-2 border-[#2B5946] pl-3">
              <div class="text-xl font-extrabold text-[#142820]">วัว 1 ตัว</div>
              <div class="text-xs text-[#6E7E76]">คลิกเลือกบนภาพ ผูกเบอร์หู</div>
            </div>
            <div class="border-l-2 border-[#10B981] pl-3">
              <div class="text-xl font-extrabold text-[#142820] tabular-nums">ไม่แตะตัววัว</div>
              <div class="text-xs text-[#6E7E76]">เซ็นเซอร์ + กล้องวงจรปิด</div>
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
                <p class="text-xs text-[#6E7E76]">ปรับค่าหรือเลือกสภาพอากาศตัวอย่างเพื่อทดลองคำนวณ (ข้อมูลจำลอง)</p>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F2F4F2] text-[#142820]">
                NRC 1971 · ตัวอย่าง
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
                  <span class="text-[11px] text-[#6E7E76] block">ผลต่อแม่โค</span>
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
                  <span v-for="lbl in gaugeLabels" :key="lbl">{{ lbl }}</span>
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
                <strong class="text-[#142820] block mb-0.5">คำแนะนำของระบบ:</strong>
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
                  <span class="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  YOLO26m · SHT40
                </span>
                <span class="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-white/80">
                  ตัวอย่างการแสดงผล (ข้อมูลจำลอง)
                </span>
              </div>

              <!-- ตัวอย่างไทม์ไลน์วัวเป้าหมาย 1 ตัว (ข้อมูลจำลอง) -->
              <div class="flex items-center justify-between">
                <div class="text-sm font-bold text-white">วัวเป้าหมาย <span class="font-mono text-[#F2BD7C]">#1023</span></div>
                <div class="text-[11px] text-white/60">09:00–15:00 น.</div>
              </div>
              <div class="flex h-7 rounded-lg overflow-hidden text-[10px] font-bold">
                <div
                  v-for="(b, bIdx) in demoBouts"
                  :key="bIdx"
                  class="flex items-center justify-center"
                  :style="{ width: b.pct + '%', background: b.color, color: '#fff' }"
                  :title="`${b.label} ${b.min} นาที · THI ${b.thi}`">
                  {{ b.pct >= 12 ? b.short : '' }}
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div v-for="t in demoTotals" :key="t.label" class="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div class="text-[11px] text-white/60">{{ t.label }}</div>
                  <div class="text-sm font-bold text-white tabular-nums">{{ t.value }}</div>
                  <div class="text-[11px] text-[#F2BD7C] tabular-nums">{{ t.sub }}</div>
                </div>
              </div>
            </div>

            <!-- Visual 1: ANALYZE (คำแนะนำบนหน้าเว็บ) -->
            <div v-else-if="activeLayer === 1" class="bg-[#FAF9F5] rounded-3xl p-6 border border-[#142820]/8 space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-2xl bg-[#142820] text-white flex items-center justify-center">
                    <v-icon icon="mdi-weather-sunny-alert" size="18" />
                  </div>
                  <div>
                    <div class="text-xs font-extrabold text-[#142820]">หน้าเกษตรกร CowCare AI</div>
                    <div class="text-[11px] text-[#6E7E76]">คำแนะนำบนหน้าเว็บ (ตัวอย่างข้อความ)</div>
                  </div>
                </div>
                <span class="text-[11px] font-bold text-[#D87939] bg-[#FFF7ED] px-2.5 py-1 rounded-full">
                  ข้อมูลจำลอง
                </span>
              </div>

              <div class="p-4 rounded-2xl bg-white border border-[#142820]/6 text-xs text-[#142820] leading-relaxed shadow-sm space-y-2">
                <div class="font-bold text-[#D87939]">⚠️ ตัวอย่างคำแนะนำ (ข้อมูลจำลอง)</div>
                <p class="text-[#4A5A52]">
                  พยากรณ์ THI เฉลี่ยรายวันล่วงหน้าอยู่ที่ <strong>78.5 (เครียดจากความร้อน)</strong> แนวโน้มยังร้อนต่อเนื่อง
                </p>
                <div class="p-2.5 rounded-xl bg-[#FAF9F5] text-[11.5px] font-medium text-[#142820]">
                  ✅ <strong>สิ่งที่ควรทำดักล่วงหน้า:</strong> เปิดพัดลมระบายอากาศช่วง 11:00–15:00 น. (งดพ่นหมอกถ้าความชื้นเกิน 75%) เพื่อลดความร้อนสะสม
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
                  ตัวอย่างหน้าจอ (ข้อมูลจำลอง)
                </span>
              </div>

              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="p-3 bg-white rounded-2xl border border-[#142820]/6">
                  <span class="text-[10px] text-[#6E7E76] block">THI เฉลี่ย</span>
                  <span class="text-lg font-extrabold text-[#142820] tabular-nums">74.8</span>
                </div>
                <div class="p-3 bg-white rounded-2xl border border-[#142820]/6">
                  <span class="text-[10px] text-[#6E7E76] block">ชั่วโมงวิกฤต</span>
                  <span class="text-lg font-extrabold text-[#10B981] tabular-nums">0 ชม.</span>
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
            <span class="text-xs font-bold text-[#F2BD7C] uppercase tracking-widest">3-DAY HYBRID THI FORECAST (ECMWF + SENSOR BIAS)</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              ทำไมการรอดูอาการวัวหอบ ถึงสายเกินไปเสมอ?
            </h2>
            <p class="text-sm sm:text-base text-white/75 leading-relaxed">
              ระบบพยากรณ์ THI เฉลี่ยรายวันล่วงหน้า <strong>3 วัน</strong> ด้วยข้อมูลพยากรณ์อากาศ Open-Meteo ECMWF ร่วมกับการปรับค่าเพี้ยนจากเซ็นเซอร์จริงของฟาร์มย้อนหลัง 3–14 วัน และติดตามชั่วโมงพักกลางคืน (22:00–06:00 น. ที่ THI &lt; 74 ซึ่งเป็นเกณฑ์เฝ้าระวังของระบบ; แนวคิดการพักฟื้นกลางคืนจาก Igono et al., 1992) เพื่อช่วยวางแผนเปิดพัดลมระบายอากาศดักไว้ก่อน <span class="text-white/50">(ตัวอย่างเปรียบเทียบแนวทางการจัดการ)</span>
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
                    {{ comparisonMode === 'proactive' ? 'ลดความร้อนก่อนเกิดวิกฤต' : 'ความร้อนสะสมโดยไม่รู้ตัว' }}
                  </h3>
                </div>
                <div 
                  class="px-3.5 py-1.5 rounded-full text-xs font-extrabold"
                  :class="comparisonMode === 'proactive' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-rose-500/20 text-rose-300'">
                  {{ comparisonMode === 'proactive' ? 'ลดความเสี่ยงล่วงหน้า' : 'เสี่ยงน้ำนมลดหลายวัน' }}
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
          ทุกตัวแปรในระบบอ้างอิงตามหลักสรีรวิทยาของโคนมลูกผสมไทยและงานวิจัยที่ตรวจสอบได้
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
            เข้าสู่ระบบเพื่อดูค่า THI แบบเรียลไทม์ กราฟพยากรณ์ล่วงหน้า และไทม์ไลน์พฤติกรรมของวัวเป้าหมาย
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
import { calcThi, getRiskLevel, thresholdLabels } from '~/utils/heatStress'

useHead({
  title: 'CowCare AI — ความร้อนในคอกและพฤติกรรมโคนมรายตัว',
  meta: [
    { name: 'description', content: 'ต้นแบบระบบวัดความร้อนในคอก (THI) พยากรณ์ 3 วัน และติดตามท่าทางวัวเป้าหมายรายตัวจากกล้องวงจรปิด สำหรับฟาร์มโคนมไทย (อยู่ระหว่างทดสอบภาคสนาม)' }
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

const roundedThi = computed(() => calcThi(t.value, rh.value))
const gaugeLabels = thresholdLabels('default')

const gaugePos = computed(() => {
  const clamped = Math.min(92, Math.max(62, roundedThi.value))
  return ((clamped - 62) / (92 - 62)) * 100
})

// ระดับตามเกณฑ์ค่าเริ่มต้นของโคนมลูกผสมไทย (utils/heatStress.ts) ไม่แสดงตัวเลข กก. น้ำนม เพราะยังไม่มีค่าที่วัดจากโคไทย
const RISK_STATES = {
  normal: {
    name: 'สภาวะปกติ (Comfort Zone)',
    color: '#059669',
    bgColor: '#ECFDF5',
    milkImpact: 'ปกติ',
    action: 'โคนมกินอาหารและพักผ่อนได้ตามปกติ ดูแลน้ำดื่มสะอาดตามรอบเวลา'
  },
  mild: {
    name: 'เฝ้าระวัง (Mild)',
    color: '#D97706',
    bgColor: '#FFFBEB',
    milkImpact: 'เริ่มอบอ้าว',
    action: 'เปิดพัดลมระบายอากาศเพื่อเร่งการไหลเวียนลมในโรงเรือน'
  },
  moderate: {
    name: 'เครียดจากความร้อน (Moderate)',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    milkImpact: 'เริ่มกระทบการกินและน้ำนม',
    action: 'เปิดพัดลมเต็มที่ (ความชื้นต่ำกว่า 75% พ่นหมอกได้ ถ้าชื้นกว่านั้นใช้ฉีดน้ำตัวโคเป็นช่วงๆ) และหลีกเลี่ยงการผสมเทียมช่วงร้อนที่สุดของวัน'
  },
  severe: {
    name: 'วิกฤต (Severe)',
    color: '#E11D48',
    bgColor: '#FFF1F2',
    milkImpact: 'เสี่ยงหอบ เสี่ยงน้ำนมลด',
    action: 'ลดความร้อนฉุกเฉิน เปิดพัดลมเต็มกำลัง จัดน้ำเย็นให้กิน และปรึกษาสัตวแพทย์เรื่องการเสริมสารบัฟเฟอร์'
  }
}
const riskState = computed(() => RISK_STATES[getRiskLevel(roundedThi.value, 'default') || 'normal'])

// 2. Interactive 3-Layer Tabs Data
const activeLayer = ref(0)
const archLayers = [
  {
    id: 'sense',
    tabTitle: 'รับรู้สภาพแวดล้อม (Sense)',
    badge: 'LAYER 01 • EDGE & IOT SENSING',
    icon: 'mdi-access-point',
    title: 'วัดความร้อนในคอก และติดตามวัวเป้าหมายโดยไม่แตะตัววัว',
    desc: 'เซ็นเซอร์ SHT40 (I2C, ±0.2°C / ±1.8% RH ตามสเปก) วัดอุณหภูมิ-ความชื้นทุก 15 วินาที และกล้องวงจรปิด Dahua ส่งภาพตามรอบที่ตั้งจากหน้าเว็บ โมเดล YOLO26m ตรวจท่าของวัวทุกตัวในภาพ แล้วระบบติดตามวัวเป้าหมาย 1 ตัวที่คุณคลิกเลือก',
    points: [
      'ตรวจจับ 4 ท่า (นอน ยืน กิน ดื่ม) ของวัวทุกตัว ทุก 1–10 นาที ตั้งรอบถ่ายภาพจากหน้าเว็บได้',
      'คลิกเลือกวัวเป้าหมายบนภาพล่าสุดหรือภาพย้อนหลัง ผูกเบอร์หู แล้วระบบติดตามต่อจากตำแหน่ง ถ้าไม่แน่ใจจะบอกว่า "ไม่เห็นในภาพ" ไม่เดา',
      'ไม่ต้องใช้ปลอกคออัจฉริยะ เน็ตหลุดเก็บข้อมูลไว้ในกล่องแล้วส่งย้อนหลัง พร้อมแจ้งเตือนเมื่อกล่องขาดการติดต่อ'
    ]
  },
  {
    id: 'recommend',
    tabTitle: 'วิเคราะห์และเตือนล่วงหน้า (Analyze)',
    badge: 'LAYER 02 • 3-DAY FORECAST & ADVISORY',
    icon: 'mdi-brain',
    title: 'พยากรณ์ล่วงหน้า 3 วันและแนะนำตามบริบทโรงเรือนไทย',
    desc: 'พยากรณ์ THI เฉลี่ยรายวันล่วงหน้า 3 วันจาก Open-Meteo ECMWF ร่วมกับการหักลบค่าเพี้ยนจากเซ็นเซอร์จริงของฟาร์มย้อนหลัง 3–14 วัน ตามเกณฑ์โคนมลูกผสมไทย (THI 74 / 76 / 82) พร้อมคำนวณช่วงร้อนที่สุดและเย็นที่สุดจากข้อมูลจริงของฟาร์ม',
    points: [
      'ทุกช่วงนอน/ยืน/กินของวัวเป้าหมายมี THI ขณะนั้น เห็นว่าวัวนอนพักน้อยลงตอนคอกร้อนหรือไม่',
      'พยากรณ์ THI ล่วงหน้า 3 วัน (ECMWF + ปรับค่าเพี้ยนจากเซ็นเซอร์ฟาร์ม 3–14 วัน)',
      'ใช้เกณฑ์โคนมลูกผสมไทย (THI 74 / 76 / 82) และคำนวณช่วงร้อนสุดจากข้อมูลฟาร์มจริง',
      'ความชื้นตั้งแต่ 75% ขึ้นไป แนะนำราดน้ำตัววัวร่วมกับพัดลม แทนการพ่นหมอก'
    ]
  },
  {
    id: 'capitalize',
    tabTitle: 'ต่อยอดมูลค่าข้อมูล (Capitalize)',
    badge: 'LAYER 03 • COOPERATIVE LOGBOOK',
    icon: 'mdi-leaf-circle-outline',
    title: 'สมุดบันทึกสหกรณ์ดิจิทัลที่ตรวจสอบความครบถ้วนได้',
    desc: 'ข้อมูลทุกจุดถูกจัดเก็บลงฐานข้อมูลคลาวด์อย่างเป็นระบบ แสดงความครบถ้วนของข้อมูลจริงและช่วงที่เซ็นเซอร์ขาดหายอย่างตรงไปตรงมา',
    points: [
      'บันทึกชั่วโมงความเครียดจากความร้อนและชั่วโมงกลางคืนที่วัวได้พัก (22:00–06:00 น.)',
      'แสดงความครบถ้วนของข้อมูลและจำนวนวันเครียดติดต่อกันในสมุดสหกรณ์',
      'มีปุ่มโทรด่วนหาสัตวแพทย์หรือสหกรณ์ในหน้าเกษตรกรทันทีเมื่อเกิดวิกฤต'
    ]
  }
]

// ตัวอย่างไทม์ไลน์วัวเป้าหมาย 6 ชม. (ข้อมูลจำลอง ไม่ใช่ผลวัดจริง) สีตรงกับการ์ดพฤติกรรมในหน้า farm_detail
const BEHAVIOR_COLOR = { lying: '#3b82f6', standing: '#f97316', feeding: '#10b981' }
const demoBouts = [
  { label: 'นอน', short: 'นอน', key: 'lying', min: 95, thi: 74 },
  { label: 'กิน', short: 'กิน', key: 'feeding', min: 30, thi: 76 },
  { label: 'ยืน', short: 'ยืน', key: 'standing', min: 120, thi: 79 },
  { label: 'นอน', short: 'นอน', key: 'lying', min: 40, thi: 80 },
  { label: 'ยืน', short: 'ยืน', key: 'standing', min: 75, thi: 81 }
].map(b => ({ ...b, color: BEHAVIOR_COLOR[b.key], pct: (b.min / 360) * 100 }))
const demoTotals = [
  { label: 'นอน', value: '2 ชม. 15 น.', sub: 'THI เฉลี่ย 75.8' },
  { label: 'ยืน', value: '3 ชม. 15 น.', sub: 'THI เฉลี่ย 79.8' },
  { label: 'กิน', value: '30 นาที', sub: 'THI เฉลี่ย 76.0' }
]

// 3. Reactive vs Proactive Interactive Comparison
const comparisonMode = ref('proactive')
const activeComparisonSteps = computed(() => {
  if (comparisonMode.value === 'proactive') {
    return [
      { day: 'ล่วงหน้า', event: 'ดูพยากรณ์ THI ล่วงหน้า 3 วันบนหน้าเว็บ', outcome: 'เตรียมพร้อมทันที', statusClass: 'text-[#10B981]' },
      { day: 'วันที่อากาศร้อน', event: 'เปิดพัดลมดักไว้ก่อนตามคำแนะนำช่วงเวลาร้อนสุดของฟาร์ม', outcome: 'ลดความเครียดสะสม', statusClass: 'text-[#10B981]' },
      { day: 'หลายวันถัดมา', event: 'โคนมมีโอกาสกินอาหารและพักผ่อนได้ใกล้เคียงปกติ', outcome: 'ลดความเสี่ยงน้ำนมลด', statusClass: 'text-[#F2BD7C]' }
    ]
  }
  return [
    { day: 'ล่วงหน้า', event: 'ไม่มีข้อมูลความร้อนสะสม เกษตรกรไม่ทราบล่วงหน้า', outcome: 'ไม่ได้เตรียมการ', statusClass: 'text-white/50' },
    { day: 'วันที่อากาศร้อน', event: 'รอจนวัวยืนหอบและไม่กินอาหารจึงเพิ่งเปิดพัดลม', outcome: 'เกิดความเครียดสะสม', statusClass: 'text-rose-400' },
    { day: 'หลายวันถัดมา', event: 'ความร้อนสะสมต่อเนื่องกระทบการกินอาหารและน้ำนม', outcome: 'เสี่ยงสูญเสียรายได้', statusClass: 'text-rose-400' }
  ]
})

// 4. Citations
const citations = [
  {
    journal: 'J. of Dairy Science (2011)',
    metric: 'เริ่มเครียดที่ THI 74',
    summary: 'ศึกษาโคนมลูกผสมไทย: แม่โคท้องที่ 3 ขึ้นไปที่มีสายเลือดโฮลสไตน์ ≥87.5% น้ำนมเริ่มลดที่ THI เฉลี่ยรายวัน 74 และลดเร็วขึ้นเมื่อเกิน 82',
    authors: 'Boonkum et al. (2011)'
  },
  {
    journal: 'Animals (MDPI, 2024)',
    metric: 'เกณฑ์ประชากร THI 76',
    summary: 'ศึกษาโคนมลูกผสมไทยระดับประชากร พบจุดเริ่มเครียดที่ THI เฉลี่ยรายวัน 76 ซึ่งผลผลิตน้ำนม สัดส่วนไขมันต่อโปรตีน และอัตราผสมติดเริ่มลดลง',
    authors: 'Boonkum et al. (2024)'
  },
  {
    journal: 'Int. J. of Biometeorology (1992)',
    metric: 'การพักฟื้นตอนกลางคืน',
    summary: 'ความเย็นในช่วงเวลากลางคืนช่วยให้แม่โคระบายความร้อนสะสมจากช่วงกลางวันได้ ระบบจึงนับชั่วโมงช่วง 22:00–06:00 น. ที่ THI ต่ำกว่า 74',
    authors: 'Igono et al. (1992)'
  },
  {
    journal: 'NRC (1971) & LRRD 31(12) (2019)',
    metric: 'สมการมาตรฐาน THI',
    summary: 'ใช้สมการดัชนีอุณหภูมิและความชื้นของ NRC (1971) ตัวเดียวกับที่งานวิจัยโคนมในประเทศไทยใช้อ้างอิง โดยปรับใช้ที่ค่าเกณฑ์ของโคนมลูกผสมไทย',
    authors: 'NRC (1971); Sae-tiao et al. (2019)'
  },
  {
    journal: 'Scientific Reports (2024)',
    metric: 'ชุดข้อมูลพฤติกรรมวัว CBVD-5',
    summary: 'ภาพจากกล้องวงจรปิดในคอก 7 ตัว ตีกรอบท่ายืน นอน กิน ดื่ม ใช้ฝึกและทดสอบโมเดลตรวจท่าทาง โดยแยกมุมกล้องที่ใช้ทดสอบออกจากชุดฝึก',
    authors: 'Li et al. (2024)'
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