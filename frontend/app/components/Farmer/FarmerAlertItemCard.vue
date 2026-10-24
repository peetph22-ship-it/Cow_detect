<template>
  <article
    class="p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 transition-all border-2"
    :class="cardClass">
    <!-- ไอคอนเหตุการณ์ -->
    <div
      class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold shadow-2xs"
      :class="iconClass">
      <v-icon :icon="iconName" size="26" />
    </div>

    <!-- รายละเอียดเหตุการณ์ -->
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-base sm:text-lg font-black text-[#1B342D] leading-snug">
          {{ eventTitle }}
        </h3>
        <span
          v-if="event.ongoing"
          class="text-xs font-black px-3 py-0.5 rounded-full bg-[#DC2626] text-white shrink-0 animate-pulse">
          กำลังเกิดเหตุตอนนี้
        </span>
      </div>

      <div class="text-xs sm:text-sm text-[#3A5248] font-bold mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span>เวลา {{ thaiTime(event.start) }} – {{ event.end ? thaiTime(event.end) : 'ปัจจุบัน' }} น.</span>
        <span>·</span>
        <span>ต่อเนื่อง {{ durationText(event.duration_min) }}</span>
      </div>

      <div
        v-if="event.type === 'heat'"
        class="mt-2 pt-2 border-t border-black/10 text-xs sm:text-sm font-bold"
        :class="event.level === 'severe' ? 'text-[#991B1B]' : 'text-[#92400E]'">
        <span v-if="event.peak_temp != null">อุณหภูมิสูงสุด {{ event.peak_temp }}°C · </span>
        <span>{{ event.level === 'severe' ? 'ควรเร่งเปิดพัดลมระบายอากาศและดูแลน้ำดื่มแม่วัวทันที' : 'ควรเปิดพัดลมระบายอากาศในโรงเรือน' }}</span>
      </div>

      <div
        v-else-if="event.type === 'sensor_offline'"
        class="mt-2 pt-2 border-t border-black/10 text-xs sm:text-sm font-semibold text-[#4E655B]">
        กล่องเซ็นเซอร์ขาดการส่งข้อมูลชั่วคราว แนะนำตรวจสอบปลั๊กไฟและสัญญาณอินเทอร์เน็ตที่โรงเรือน
      </div>
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
  if (props.event.type === 'sensor_offline') return 'กล่องเซ็นเซอร์หยุดส่งสัญญาณชั่วคราว'
  if (props.event.level === 'severe') return 'อากาศในคอกร้อนจัดถึงระดับวิกฤต!'
  return 'อากาศในคอกเริ่มร้อน แม่วัวเริ่มอึดอัด'
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
