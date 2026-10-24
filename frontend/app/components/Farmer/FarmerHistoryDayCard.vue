<template>
  <article
    class="bg-[#FFFDF7] rounded-3xl p-5 sm:p-6 shadow-xs border-2 transition-all"
    :class="cardBorderClass">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <!-- วันที่ -->
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-base sm:text-lg font-black text-[#1B342D]">
            {{ day.is_today ? 'วันนี้' : thaiDate(day.date, { weekday: 'long', day: 'numeric', month: 'short' }) }}
          </h3>
          <span
            v-if="day.is_today"
            class="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#1B342D] text-[#FFFDF7]">
            วันนี้
          </span>
        </div>

        <!-- ป้ายสถานะภาษาชาวบ้าน -->
        <div class="mt-2 flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-black border"
            :class="badgeClass">
            <span class="w-2.5 h-2.5 rounded-full" :class="dotClass"></span>
            {{ statusText }}
          </span>
        </div>

        <!-- คำอธิบายรายวัน -->
        <p class="text-xs sm:text-sm text-[#3A5248] font-semibold mt-2.5 leading-relaxed">
          {{ descriptionText }}
        </p>
      </div>

      <!-- อุณหภูมิสูงสุด / ต่ำสุด -->
      <div
        v-if="day.has_data"
        class="text-right shrink-0 bg-white px-3.5 py-3 rounded-2xl border border-[#E6DEC8] shadow-2xs">
        <div class="text-[11px] font-extrabold text-[#4E655B]">ร้อนสุด</div>
        <div class="text-xl sm:text-2xl font-black text-[#1B342D] tabular-nums leading-none mt-1">
          {{ day.max_temp }}<span class="text-sm font-bold text-[#4E655B]">°C</span>
        </div>
        <div class="text-[11px] font-bold text-[#4E655B] mt-1.5 pt-1 border-t border-[#E6DEC8]">
          เย็นสุด {{ day.min_temp }}°C
        </div>
      </div>
    </div>

    <!-- รายละเอียด 3 ช่องด้านล่าง -->
    <div
      v-if="day.has_data"
      class="mt-4 pt-3 border-t border-[#E6DEC8] grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm">
      <div class="p-2.5 rounded-xl bg-white border border-[#E6DEC8]/70">
        <span class="text-[#4E655B] font-bold block text-[11px]">ช่วงร้อนที่สุดของวัน</span>
        <span class="font-black text-[#1B342D]">
          {{ day.peak_hour != null ? `ประมาณ ${day.peak_hour}:00 น.` : 'ไม่มีช่วงร้อน' }}
        </span>
      </div>

      <div class="p-2.5 rounded-xl bg-white border border-[#E6DEC8]/70">
        <span class="text-[#4E655B] font-bold block text-[11px]">ชั่วโมงที่อากาศร้อน</span>
        <span class="font-black text-[#1B342D]">
          {{ day.stress_hours > 0 ? `${day.stress_hours} ชั่วโมง` : 'ไม่มีเลย' }}
        </span>
      </div>

      <div class="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white border border-[#E6DEC8]/70">
        <span class="text-[#4E655B] font-bold block text-[11px]">การพักฟื้นตอนกลางคืน</span>
        <span
          class="font-black"
          :class="(day.night_relief_hours ?? 0) >= 3 ? 'text-[#15803D]' : 'text-[#B45309]'">
          {{ (day.night_relief_hours ?? 0) >= 3 ? 'วัวได้พักเต็มที่' : 'กลางคืนยังอบอ้าว' }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { thaiDate } from '~/composables/useFarmer'

const props = defineProps({
  day: {
    type: Object,
    required: true
  }
})

const cardBorderClass = computed(() => {
  if (!props.day.has_data) return 'border-[#E6DEC8] opacity-80'
  if (props.day.severe_hours > 0) return 'border-[#FCA5A5]'
  if (props.day.stress_hours > 0) return 'border-[#FDE68A]'
  return 'border-[#A7F3D0]'
})

const badgeClass = computed(() => {
  if (!props.day.has_data) return 'bg-gray-100 text-gray-600 border-gray-200'
  if (props.day.severe_hours > 0) return 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
  if (props.day.stress_hours > 0) return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
  return 'bg-[#ECFDF5] text-[#14532D] border-[#A7F3D0]'
})

const dotClass = computed(() => {
  if (!props.day.has_data) return 'bg-gray-400'
  if (props.day.severe_hours > 0) return 'bg-[#DC2626]'
  if (props.day.stress_hours > 0) return 'bg-[#D97706]'
  return 'bg-[#16A34A]'
})

const statusText = computed(() => {
  if (!props.day.has_data) return 'ไม่มีข้อมูลเซ็นเซอร์'
  if (props.day.senior_status) return props.day.senior_status
  if (props.day.severe_hours > 0) return `ร้อนจัด ${props.day.severe_hours} ชั่วโมง`
  if (props.day.stress_hours > 0) return `อากาศร้อน ${props.day.stress_hours} ชั่วโมง`
  return 'สบายดีตลอดวัน'
})

const descriptionText = computed(() => {
  if (!props.day.has_data) return 'กล่องเซ็นเซอร์ไม่ได้ส่งข้อมูลในวันนี้'
  if (props.day.senior_desc) return props.day.senior_desc
  if (props.day.severe_hours > 0) return 'มีช่วงที่อากาศร้อนจัด แม่วัวอาจหอบและกินอาหารลดลง ควรเปิดพัดลมและฉีดน้ำช่วย'
  if (props.day.stress_hours > 0) return 'มีช่วงที่อากาศอุ่นถึงร้อน แนะนำเปิดพัดลมช่วยระบายอากาศและเติมน้ำสะอาด'
  return 'สภาพอากาศในคอกร่มรื่น แม่วัวกินอาหารและนอนพักผ่อนได้ตามปกติ'
})
</script>
