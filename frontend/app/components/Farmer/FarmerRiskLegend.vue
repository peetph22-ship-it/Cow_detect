<template>
  <!-- คำอธิบายสีพื้นหลังของกราฟ THI พร้อมช่วงตัวเลขตามเกณฑ์ของฟาร์ม -->
  <div class="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-bold text-[#4E655B]">
    <span v-for="it in items" :key="it.level" class="inline-flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-[4px]" :style="{ background: it.color, opacity: 0.55 }" />
      <span class="text-[#142820] font-extrabold">{{ it.name }}</span>
      <span class="tabular-nums">{{ it.range }}</span>
    </span>
  </div>
</template>

<script setup>
import { useFarmer, RISK_SHORT } from '~/composables/useFarmer'
import { LEVEL_COLOR } from '~/utils/farmerCharts'

const { thresholds } = useFarmer()
const items = computed(() => {
  const t = thresholds.value
  return [
    { level: 'normal', range: `ต่ำกว่า ${t.mild}` },
    { level: 'mild', range: `${t.mild}–${t.moderate}` },
    { level: 'moderate', range: `${t.moderate}–${t.severe}` },
    { level: 'severe', range: `${t.severe} ขึ้นไป` }
  ].map(i => ({ ...i, name: RISK_SHORT[i.level], color: LEVEL_COLOR[i.level] }))
})
</script>
