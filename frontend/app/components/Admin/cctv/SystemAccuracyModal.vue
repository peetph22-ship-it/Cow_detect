<template>
  <v-dialog v-model="internalModel" max-width="880" transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_30px_90px_rgba(36,67,58,0.25)] border border-[#24433a]/10 font-sans">
      
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-[#1b342d] via-[#24433a] to-[#162e27] text-white p-6 sm:p-7 relative overflow-hidden">
        <!-- Ambient Background Glows -->
        <div class="absolute -right-10 -top-10 w-56 h-56 bg-[#d87939]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex items-start justify-between relative z-10">
          <div class="flex items-center gap-4">
            <div class="w-13 h-13 rounded-[20px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <v-icon icon="mdi-chart-bell-curve-cumulative" size="28" class="text-emerald-300" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-xl sm:text-2xl font-black tracking-tight text-white">
                  เกณฑ์ความแม่นยำระบบและการสอบเทียบโมเดล
                </h3>
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30 uppercase tracking-wider">
                  ARGON BENCHMARK v2.5
                </span>
              </div>
              <p class="text-xs sm:text-sm text-white/80 mt-1 font-medium">
                ผลประเมินสถิติเปรียบเทียบ Lab Simulation กับสภาพแวดล้อมจริงในโรงเรือนโคนมไทย (Reality Gap Calibration)
              </p>
            </div>
          </div>

          <!-- Close Button -->
          <button 
            type="button" 
            @click="closeModal" 
            class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
            <v-icon icon="mdi-close" size="18" class="text-white" />
          </button>
        </div>

        <!-- Quick KPI Bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div class="bg-white/10 backdrop-blur-md rounded-[18px] p-3 border border-white/10">
            <span class="text-[10px] text-white/70 uppercase tracking-wider font-bold block">Multimodal Fusion</span>
            <div class="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">99.21%</div>
            <span class="text-[10px] text-white/60 font-medium">Dual-System Reliability</span>
          </div>

          <div class="bg-white/10 backdrop-blur-md rounded-[18px] p-3 border border-white/10">
            <span class="text-[10px] text-white/70 uppercase tracking-wider font-bold block">Sensor Noise σ</span>
            <div class="text-lg sm:text-xl font-black text-cyan-300 mt-0.5">±0.42 THI</div>
            <span class="text-[10px] text-white/60 font-medium">Temp ±0.3°C | RH ±2.0%</span>
          </div>

          <div class="bg-white/10 backdrop-blur-md rounded-[18px] p-3 border border-white/10">
            <span class="text-[10px] text-white/70 uppercase tracking-wider font-bold block">Vision mAP@50</span>
            <div class="text-lg sm:text-xl font-black text-amber-300 mt-0.5">76.9%</div>
            <span class="text-[10px] text-white/60 font-medium">ByteTrack MOTA 81.2%</span>
          </div>

          <div class="bg-white/10 backdrop-blur-md rounded-[18px] p-3 border border-white/10">
            <span class="text-[10px] text-white/70 uppercase tracking-wider font-bold block">72h Bi-LSTM Error</span>
            <div class="text-lg sm:text-xl font-black text-orange-300 mt-0.5">±0.87 THI</div>
            <span class="text-[10px] text-white/60 font-medium">Day 1 MAE ±0.58 THI</span>
          </div>
        </div>
      </div>

      <!-- Modal Content Body -->
      <div class="p-6 sm:p-8 space-y-6 bg-[#fafcfb] max-h-[70vh] overflow-y-auto">
        
        <!-- Navigation Tabs -->
        <div class="flex items-center gap-2 p-1.5 bg-[#eef3f0] rounded-[20px] overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            type="button"
            :class="[
              activeTab === tab.id 
                ? 'bg-white text-[#24433a] shadow-sm font-black' 
                : 'text-[#61776c] hover:text-[#24433a] font-bold',
              'px-4 py-2 rounded-[16px] text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer'
            ]"
          >
            <v-icon :icon="tab.icon" size="16" />
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- TAB 1: Multimodal Fusion Gate & Fail-Safe -->
        <div v-if="activeTab === 'fusion'" class="space-y-4">
          <div class="bg-emerald-50/70 border border-emerald-200/80 rounded-[24px] p-5">
            <div class="flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <v-icon icon="mdi-shield-check" size="22" />
              </div>
              <div>
                <h4 class="text-sm font-black text-emerald-950">หลักการกู้ความแม่นยำด้วย Multimodal Cross-Validation Gate</h4>
                <p class="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                  เมื่อระบบเซ็นเซอร์ IoT หรือกล้อง AI ตัวใดตัวหนึ่งได้รับสัญญาณรบกวนหน้างาน (เช่น ฝุ่นเกาะเลนส์ แสงแดดส่องโดนเซ็นเซอร์) 
                  สถาปัตยกรรมจะนำ 2 สัญญาณมาตรวจสอบไขว้กันตามสมการความน่าเชื่อถือ:
                </p>
                <div class="mt-2 px-3.5 py-2 bg-white/90 rounded-xl border border-emerald-300 font-mono text-xs font-bold text-emerald-900 inline-block">
                  P_final = 1 - (1 - P_sensor) × (1 - P_vision) = 1 - (1 - 0.958) × (1 - 0.812) = 99.21%
                </div>
              </div>
            </div>
          </div>

          <!-- 4-Case Operational Matrix -->
          <h5 class="text-xs font-black text-[#24433a] uppercase tracking-wider">เมทริกซ์การตัดสินใจ 4 สถานการณ์ (Fail-Safe Matrix)</h5>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="p-4 rounded-[20px] bg-white border border-[#e2eae5] shadow-xs">
              <div class="flex items-center gap-2 text-emerald-700 font-black text-xs mb-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Case A: Multimodal Verified (99.2%)
              </div>
              <p class="text-xs text-[#4e6057] leading-relaxed">
                เซ็นเซอร์ THI ≥ 76.0 <strong>และ</strong> กล้องตรวจพบโคนมยืน/หอบ ≥ 30% → สั่งเดินพัดลม/สปริงเกลอร์เต็มกำลัง แจ้งเตือนวิกฤตล่วงหน้า
              </p>
            </div>

            <div class="p-4 rounded-[20px] bg-white border border-rose-200/80 shadow-xs bg-rose-50/20">
              <div class="flex items-center gap-2 text-rose-700 font-black text-xs mb-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Case B: Sensor Drift Suspected
              </div>
              <p class="text-xs text-[#4e6057] leading-relaxed">
                เซ็นเซอร์ THI ≥ 80.0 <strong>แต่</strong> กล้องพบโคนอนเคี้ยวเอื้องปกติ ≥ 70% (ไม่หอบ) → ระงับการเปิดสปริงเกลอร์พร่ำเพรื่อ แจ้งเตือนเช็ดหัววัด
              </p>
            </div>

            <div class="p-4 rounded-[20px] bg-white border border-amber-200/80 shadow-xs bg-amber-50/20">
              <div class="flex items-center gap-2 text-amber-700 font-black text-xs mb-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Case C: Fail-Safe Thai Heuristic
              </div>
              <p class="text-xs text-[#4e6057] leading-relaxed">
                กล้อง CCTV ออฟไลน์หรือมุมมองถูกบดบัง → สลับเข้าสู่ Fail-Safe Mode พึ่งพาเซ็นเซอร์ IoT และเกณฑ์ชีววิทยาโคนมไทย 100% ต่อเนื่อง
              </p>
            </div>

            <div class="p-4 rounded-[20px] bg-white border border-blue-200/80 shadow-xs bg-blue-50/20">
              <div class="flex items-center gap-2 text-blue-700 font-black text-xs mb-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Case D: Comfort Zone
              </div>
              <p class="text-xs text-[#4e6057] leading-relaxed">
                เซ็นเซอร์ THI &lt; 76.0 และโคนมมีสัดส่วนนอนพักผ่อนปกติ → สภาวะสบาย แม่โคผลิตน้ำนมได้เต็มศักยภาพ ไม่มีความเครียดความร้อน
              </p>
            </div>
          </div>
        </div>

        <!-- TAB 2: Computer Vision & YOLO26m -->
        <div v-if="activeTab === 'vision'" class="space-y-4">
          <div class="overflow-hidden bg-white border border-[#e2eae5] rounded-[24px]">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#f2f7f4] text-[#24433a] font-black border-b border-[#e2eae5]">
                <tr>
                  <th class="py-3 px-4">ท่าทางโคนม (Class)</th>
                  <th class="py-3 px-3 text-center">Precision</th>
                  <th class="py-3 px-3 text-center">Recall</th>
                  <th class="py-3 px-3 text-center">mAP@50</th>
                  <th class="py-3 px-4">กลไกฟื้นฟูความแม่นยำ (Recovery Mechanism)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#edf3f0] font-medium text-[#3b4c44]">
                <tr>
                  <td class="py-3 px-4 font-bold flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-orange-500"></span> ยืน (Standing)
                  </td>
                  <td class="py-3 px-3 text-center">84.2%</td>
                  <td class="py-3 px-3 text-center">81.6%</td>
                  <td class="py-3 px-3 text-center font-black text-emerald-600">85.4%</td>
                  <td class="py-3 px-4 text-[#61776c]">ตัวโคยกสูง ลำตัวชัดเจน ตรวจจับได้แม่นยำสูง</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-500"></span> นอนเคี้ยวเอื้อง (Lying)
                  </td>
                  <td class="py-3 px-3 text-center">80.5%</td>
                  <td class="py-3 px-3 text-center">78.9%</td>
                  <td class="py-3 px-3 text-center font-black text-emerald-600">82.1%</td>
                  <td class="py-3 px-4 text-[#61776c]">ลำตัวราบกับพื้นซองนอน รูปทรงเรขาคณิตเสถียร</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span> กินอาหาร (Feeding)
                  </td>
                  <td class="py-3 px-3 text-center">65.8%</td>
                  <td class="py-3 px-3 text-center">64.2%</td>
                  <td class="py-3 px-3 text-center font-black text-emerald-600">70.2%</td>
                  <td class="py-3 px-4 text-[#61776c]">
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Spatial Feed Bunk ROI Prior (+15%)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-bold flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-cyan-500"></span> ดื่มน้ำ (Drinking)
                  </td>
                  <td class="py-3 px-3 text-center">63.1%</td>
                  <td class="py-3 px-3 text-center">64.5%</td>
                  <td class="py-3 px-3 text-center font-black text-emerald-600">69.8%</td>
                  <td class="py-3 px-4 text-[#61776c]">
                    <span class="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold text-[10px]">
                      Spatial Water Trough ROI Prior (+15%)
                    </span>
                  </td>
                </tr>
                <tr class="bg-[#fbfdfc] font-black text-[#24433a]">
                  <td class="py-3 px-4">เฉลี่ยรวมทุกคลาส (Overall)</td>
                  <td class="py-3 px-3 text-center">73.4%</td>
                  <td class="py-3 px-3 text-center">72.3%</td>
                  <td class="py-3 px-3 text-center text-emerald-700">76.9%</td>
                  <td class="py-3 px-4 text-xs font-bold text-[#4e6057]">
                    ByteTrack MOTA: <strong>81.2%</strong> | IDF1: <strong>77.8%</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Active Learning Collector Note -->
          <div class="bg-amber-50/70 border border-amber-200/80 rounded-[20px] p-4 flex items-start gap-3">
            <v-icon icon="mdi-camera-retake-outline" size="22" class="text-amber-600 shrink-0 mt-0.5" />
            <div class="text-xs text-amber-900 leading-relaxed">
              <strong class="font-black text-amber-950">Active Learning Edge Collector:</strong> 
              ระบบบันทึกภาพอัตโนมัติเมื่อค่าความมั่นใจเฉลี่ยอยู่ในช่วง <code class="px-1.5 py-0.5 bg-amber-100 rounded text-amber-900 font-bold">0.20 &le; Conf &lt; 0.40</code> 
              (จำกัดสูงสุด 50 ภาพ/วัน/กล้อง) ส่งเข้าโฟลเดอร์รวบรวมเพื่อนำมา Fine-tune โมเดลในรอบถัดไป ปิดช่องว่าง Reality Gap อย่างต่อเนื่อง
            </div>
          </div>
        </div>

        <!-- TAB 3: 72h LSTM & Uncertainty Bands -->
        <div v-if="activeTab === 'lstm'" class="space-y-4">
          <div class="overflow-hidden bg-white border border-[#e2eae5] rounded-[24px]">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#f2f7f4] text-[#24433a] font-black border-b border-[#e2eae5]">
                <tr>
                  <th class="py-3 px-4">ช่วงเวลาพยากรณ์ (Horizon)</th>
                  <th class="py-3 px-3 text-center">THI MAE</th>
                  <th class="py-3 px-3 text-center">Milk Loss MAE</th>
                  <th class="py-3 px-3 text-center">Risk Accuracy</th>
                  <th class="py-3 px-4">ระดับความเชื่อมั่นและการนำไปใช้</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#edf3f0] font-medium text-[#3b4c44]">
                <tr>
                  <td class="py-3 px-4 font-black text-[#24433a]">Day +1 (พรุ่งนี้ +24 ชม.)</td>
                  <td class="py-3 px-3 text-center font-black text-emerald-600">±0.58 THI</td>
                  <td class="py-3 px-3 text-center font-bold text-emerald-700">±0.19 กก./ตัว/วัน</td>
                  <td class="py-3 px-3 text-center font-black text-emerald-600">95.8%</td>
                  <td class="py-3 px-4 text-[#61776c]">🟢 สูงมาก เทียบเท่าข้อมูล Real-time ใช้สั่งเปิดพัดลมล่วงหน้า</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-black text-[#24433a]">Day +2 (มะรืนนี้ +48 ชม.)</td>
                  <td class="py-3 px-3 text-center font-black text-emerald-600">±0.84 THI</td>
                  <td class="py-3 px-3 text-center font-bold text-emerald-700">±0.28 กก./ตัว/วัน</td>
                  <td class="py-3 px-3 text-center font-black text-emerald-600">91.2%</td>
                  <td class="py-3 px-4 text-[#61776c]">🟢 สูง ครอบคลุมรอบการสะสมความร้อนและการฟื้นตัวกลางคืน</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-black text-[#24433a]">Day +3 (3 วันข้างหน้า +72 ชม.)</td>
                  <td class="py-3 px-3 text-center font-black text-amber-600">±1.18 THI</td>
                  <td class="py-3 px-3 text-center font-bold text-amber-700">±0.39 กก./ตัว/วัน</td>
                  <td class="py-3 px-3 text-center font-black text-amber-600">86.4%</td>
                  <td class="py-3 px-4 text-[#61776c]">🟡 ปานกลาง-สูง เพียงพอสำหรับการวางแผนเตรียมน้ำและอาหารหยาบ</td>
                </tr>
                <tr class="bg-[#fbfdfc] font-black text-[#24433a]">
                  <td class="py-3 px-4">ค่าเฉลี่ย 3 วัน (Overall 72h)</td>
                  <td class="py-3 px-3 text-center text-emerald-700">±0.87 THI</td>
                  <td class="py-3 px-3 text-center text-emerald-700">±0.28 กก./ตัว/วัน</td>
                  <td class="py-3 px-3 text-center text-emerald-700">91.1%</td>
                  <td class="py-3 px-4 text-xs font-bold text-[#4e6057]">
                    ความคลาดเคลื่อนต่ำกว่า 1.0 THI (Misclassification Risk &lt; 9%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="bg-blue-50/70 border border-blue-200/80 rounded-[20px] p-4 flex items-start gap-3">
            <v-icon icon="mdi-water-sync" size="22" class="text-blue-600 shrink-0 mt-0.5" />
            <div class="text-xs text-blue-900 leading-relaxed">
              <strong class="font-black text-blue-950">Zero Manual Milk Yield Input (โมเดลลดภาระเกษตรกร):</strong> 
              คำนวณการสูญเสียน้ำนมเป็น Theoretical Risk Proxy อัตโนมัติด้วยสมการชีววิทยาโคนมไทย (Hasan et al., 2026; Abdourhamane, 2026) 
              <code class="px-1.5 py-0.5 bg-blue-100 rounded text-blue-900 font-bold">Max(0, (THI - 76.0) × 0.45 kg)</code> 
              โดยเกษตรกรสูงอายุไม่ต้องคีย์ตัวเลขผลผลิตรายวันเอง
            </div>
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="p-4 sm:p-5 bg-white border-t border-[#edf3f0] flex items-center justify-between">
        <div class="text-xs text-[#61776c] font-medium flex items-center gap-2">
          <v-icon icon="mdi-check-decagram" size="16" class="text-emerald-500" />
          <span>สอบเทียบมาตรฐานสำหรับโรงเรือนโคนมลูกผสมไทยขนาดเล็ก (Boonkum et al., 2024)</span>
        </div>
        <button
          type="button"
          @click="closeModal"
          class="px-5 py-2.5 rounded-[16px] bg-[#24433a] hover:bg-[#1a332c] text-white text-xs font-black transition-all cursor-pointer shadow-sm"
        >
          ปิดหน้ารายงาน
        </button>
      </div>

    </div>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const internalModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref('fusion')

const tabs = [
  { id: 'fusion', label: 'Multimodal Gate & Fail-Safe', icon: 'mdi-shield-check-outline' },
  { id: 'vision', label: 'Computer Vision & YOLO26m', icon: 'mdi-cctv' },
  { id: 'lstm', label: '72h LSTM & Uncertainty Bands', icon: 'mdi-chart-bell-curve-cumulative' }
]

const closeModal = () => {
  internalModel.value = false
}
</script>
