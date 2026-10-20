<template>
  <v-dialog v-model="internalModel" max-width="880" transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_30px_90px_rgba(36,67,58,0.25)] border border-[#24433a]/10 font-sans">

      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-[#1b342d] via-[#24433a] to-[#162e27] text-white p-6 sm:p-7 relative overflow-hidden">
        <div class="absolute -right-10 -top-10 w-56 h-56 bg-[#d87939]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex items-start justify-between relative z-10">
          <div class="flex items-center gap-4">
            <div class="w-13 h-13 rounded-[20px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
              <v-icon icon="mdi-scale-balance" size="28" class="text-emerald-300" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-xl sm:text-2xl font-black tracking-tight text-white">
                  วิธีคำนวณ เกณฑ์ และสถานะการทดสอบ
                </h3>
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-black border border-amber-400/30 uppercase tracking-wider">
                  {{ VALIDATION_NOTE }}
                </span>
              </div>
              <p class="text-xs sm:text-sm text-white/80 mt-1 font-medium">
                ระบบยังไม่มีตัวเลขความแม่นยำจากข้อมูลภาคสนาม หน้านี้จึงแสดงเฉพาะสิ่งที่ตรวจสอบได้
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="closeModal"
            class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
            <v-icon icon="mdi-close" size="18" class="text-white" />
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="p-6 sm:p-8 space-y-6 bg-[#fafcfb] max-h-[70vh] overflow-y-auto text-sm text-[#24433a]">

        <section class="space-y-2">
          <h4 class="font-black">1. สูตร THI</h4>
          <p class="font-mono text-xs bg-white border border-[#e5ece9] rounded-xl p-3">
            THI = (1.8T + 32) − (0.55 − 0.0055RH)(1.8T − 26) · NRC (1971)
          </p>
          <p class="text-xs text-[#61776c]">ใช้สูตรเดียวกับงานวิจัยโคนมไทย ไม่มีการปรับสูตรเฉพาะ ความเป็นบริบทไทยอยู่ที่ค่าเกณฑ์</p>
        </section>

        <section class="space-y-2">
          <h4 class="font-black">2. เกณฑ์ความเครียดจากความร้อน</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-xs bg-white border border-[#e5ece9] rounded-xl">
              <thead class="bg-[#f0f4f2]">
                <tr>
                  <th class="text-left p-2">ชุดเกณฑ์</th>
                  <th class="p-2">เฝ้าระวัง</th>
                  <th class="p-2">เครียด</th>
                  <th class="p-2">วิกฤต</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, key) in PROFILES" :key="key" class="border-t border-[#e5ece9]">
                  <td class="p-2 font-bold">{{ PROFILE_LABELS[key] }}</td>
                  <td class="p-2 text-center">≥ {{ t.mild }}</td>
                  <td class="p-2 text-center">≥ {{ t.moderate }}</td>
                  <td class="p-2 text-center">≥ {{ t.severe }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-[#61776c]">
            อ้างอิง: Boonkum et al. (2011) J Dairy Sci · Boonkum et al. (2024) Animals · Duangjinda et al. (ICAR)
            งานเหล่านี้ใช้ THI เฉลี่ยรายวันจากสถานีอุตุฯ การนำมาใช้กับค่าในโรงเรือนยังต้องยืนยันกับผู้เชี่ยวชาญ
          </p>
        </section>

        <section class="space-y-2">
          <h4 class="font-black">3. การพยากรณ์ 3 วัน</h4>
          <ul class="list-disc pl-5 text-xs space-y-1">
            <li><strong>ใช้งานอยู่:</strong> ค่าเฉลี่ย THI 72 ชั่วโมงล่าสุด (baseline)</li>
            <li><strong>Bi-LSTM:</strong> ปิดไว้ เทรนจากข้อมูลสังเคราะห์ วัดผลแล้วแพ้ baseline (MAE ~0.87 เทียบ ~0.45 บนข้อมูลสังเคราะห์ชุดเดียวกัน)</li>
            <li>ยังไม่ได้ใช้พยากรณ์อากาศ และยังไม่มีผลทดสอบภาคสนาม</li>
          </ul>
        </section>

        <section class="space-y-2">
          <h4 class="font-black">4. กล้องและการตรวจจับพฤติกรรม</h4>
          <ul class="list-disc pl-5 text-xs space-y-1">
            <li>โมเดล YOLO26m fine-tune ด้วยชุดข้อมูล Roboflow (CC BY 4.0) ไม่ใช่ภาพจากโรงเรือนไทย</li>
            <li>4 คลาส: ยืน, นอน, กินอาหาร, ดื่มน้ำ (ยังไม่มีคลาสหอบ)</li>
            <li>ยังไม่ได้ทดสอบกับกล้องในฟาร์มจริง จึงยังไม่รายงานค่า mAP</li>
          </ul>
        </section>
      </div>

      <div class="p-5 border-t border-[#e5ece9] flex justify-end bg-white">
        <button
          type="button"
          @click="closeModal"
          class="px-5 py-2.5 rounded-[16px] bg-[#24433a] hover:bg-[#1a332c] text-white text-xs font-black transition-all cursor-pointer shadow-sm"
        >
          ปิด
        </button>
      </div>

    </div>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { PROFILES, PROFILE_LABELS, VALIDATION_NOTE } from '~/utils/heatStress'

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

const closeModal = () => {
  internalModel.value = false
}
</script>
