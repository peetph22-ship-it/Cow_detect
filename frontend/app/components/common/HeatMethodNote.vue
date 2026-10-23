<template>
  <!-- วิธีคำนวณและที่มา: ข้อความทั้งหมดมาจาก backend (heatStress.getMethod) ไม่เขียนซ้ำในหน้าเว็บ -->
  <details v-if="method" class="group rounded-[20px] border" :class="boxClass">
    <summary class="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-2 text-sm font-semibold select-none">
      <span class="flex items-center gap-2">
        <v-icon icon="mdi-function-variant" size="18" :class="iconClass" />
        {{ title }}
      </span>
      <v-icon icon="mdi-chevron-down" size="20" class="transition-transform group-open:rotate-180 opacity-60" />
    </summary>
    <div class="px-4 pb-4 space-y-3 text-[13px] leading-relaxed">
      <div>
        <div class="text-xs font-semibold opacity-70 mb-1">สูตร THI (NRC, 1971)</div>
        <div class="font-mono text-[12px] px-3 py-2 rounded-xl" :class="codeClass">{{ method.formula }}</div>
        <div class="text-xs opacity-70 mt-1">{{ method.formula_note }}</div>
      </div>
      <div>
        <div class="text-xs font-semibold opacity-70 mb-1">เกณฑ์</div>
        <div>{{ method.thresholds_note }}</div>
      </div>
      <div>
        <div class="text-xs font-semibold opacity-70 mb-1">วิธีนับ</div>
        <ul class="list-disc pl-5 space-y-0.5">
          <li v-for="s in method.steps" :key="s">{{ s }}</li>
        </ul>
      </div>
      <div>
        <div class="text-xs font-semibold opacity-70 mb-1">ข้อควรทราบ</div>
        <ul class="list-disc pl-5 space-y-0.5">
          <li v-for="c in method.caveats" :key="c">{{ c }}</li>
        </ul>
      </div>
      <div>
        <div class="text-xs font-semibold opacity-70 mb-1">อ้างอิง</div>
        <ol class="list-decimal pl-5 space-y-0.5 text-xs">
          <li v-for="r in method.references" :key="r">{{ r }}</li>
        </ol>
      </div>
    </div>
  </details>
</template>

<script setup>
const props = defineProps({
  method: { type: Object, default: null },
  title: { type: String, default: 'วิธีคำนวณและที่มาของตัวเลข' },
  // farmer = โทนงาช้างของหน้าเกษตรกร, admin = การ์ดขาวของหน้าแอดมิน
  tone: { type: String, default: 'admin' }
})
const boxClass = computed(() => (props.tone === 'farmer' ? 'bg-[#fffdf7] border-[#EFE6D6] text-[#142820]' : 'bg-white border-[#e5ece9] text-[#24433a]'))
const codeClass = computed(() => (props.tone === 'farmer' ? 'bg-[#F6F7F5]' : 'bg-[#f6f7f5]'))
const iconClass = computed(() => (props.tone === 'farmer' ? 'text-[#D87939]' : 'text-[#d87939]'))
</script>
