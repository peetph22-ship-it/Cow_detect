<template>
  <article
    class="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center justify-between gap-3 transition-all border"
    :class="cardClass">
    <!-- ซ้าย: ไอคอน + ชื่อเหตุการณ์และช่วงเวลา -->
    <div class="flex items-center gap-3 min-w-0">
      <div
        class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
        :class="iconClass">
        <v-icon :icon="iconName" size="20" />
      </div>

      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-sm font-black text-[#1B342D] leading-tight truncate">
            {{ eventTitle }}
          </h3>
          <span
            v-if="event.ongoing"
            class="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#DC2626] text-white shrink-0 animate-pulse">
            กำลังเกิดเหตุ
          </span>
        </div>

        <div class="text-xs text-[#4E655B] font-bold mt-0.5 flex items-center gap-1.5 tabular-nums">
          <span>{{ thaiTime(event.start) }} – {{ event.end ? thaiTime(event.end) : 'ปัจจุบัน' }} น.</span>
        </div>
      </div>
    </div>

    <!-- ขวา: ค่าสูงสุด + ระยะเวลา (จัดเป็นป้ายสั้นกระชับ) -->
    <div class="flex items-center gap-1.5 shrink-0">
      <span
        v-if="event.type === 'heat' && event.peak_temp != null"
        class="px-2.5 py-1 rounded-lg text-xs font-black tabular-nums"
        :class="event.level === 'severe' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FEF3C7] text-[#92400E]'">
        สูงสุด {{ event.peak_temp }}°C
      </span>
      <span
        class="px-2.5 py-1 rounded-lg text-xs font-extrabold tabular-nums bg-white/80 border border-black/10 text-[#1B342D]">
        {{ durationText(event.duration_min) }}
      </span>
    </div>
  </article>
</template>

<script setup>
import { thaiTime } from '~/composables/useFarmer'

const props = defineProps({
  event: {
    type: Object,
    required: true
  }
})

const cardClass = computed(() => {
  if (props.event.type === 'heat') {
    return props.event.level === 'severe'
      ? 'bg-[#FEF2F2] border-[#FCA5A5]'
      : 'bg-[#FFFBEB] border-[#FDE68A]'
  }
  return 'bg-white border-[#E6DEC8]'
})

const iconClass = computed(() => {
  if (props.event.type === 'sensor_offline') return 'bg-[#ECE6D8] text-[#1B342D]'
  if (props.event.level === 'severe') return 'bg-[#DC2626] text-white'
  return 'bg-[#D97706] text-white'
})

const iconName = computed(() => {
  if (props.event.type === 'sensor_offline') return 'mdi-wifi-off'
  if (props.event.level === 'severe') return 'mdi-fire-alert'
  return 'mdi-thermometer-alert'
})

const eventTitle = computed(() => {
  if (props.event.type === 'sensor_offline') return 'สัญญาณขาดหายชั่วคราว'
  if (props.event.level === 'severe') return 'อากาศร้อนจัด'
  return 'อากาศร้อน'
})

const durationText = (min) => {
  if (!min) return 'ไม่กี่นาที'
  if (min >= 60) {
    const hrs = Math.floor(min / 60)
    const rem = min % 60
    return `${hrs} ชม.${rem ? ` ${rem} นาที` : ''}`
  }
  return `${min} นาที`
}
</script>
