<template>
  <section
    v-if="cooling || peakWindowLabel || coolWindowLabel"
    class="bg-[#FFFDF7] rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E6DEC8] space-y-4">
    <!-- หัวข้อการ์ด -->
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-base sm:text-lg font-black text-[#1B342D] flex items-center gap-2">
        <v-icon icon="mdi-fan-alert" class="text-[#D87939]" size="24" />
        <span>วิธีคลายร้อนและช่วงเวลาสำคัญของคอกนี้</span>
      </h2>
    </div>

    <!-- คำแนะนำการใช้น้ำ/พัดลมตามความชื้นจริง (จาก me.cooling) -->
    <div
      v-if="cooling"
      class="p-4 sm:p-5 rounded-2xl border-2 flex items-start gap-3.5"
      :class="cooling.humid
        ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#78350F]'
        : 'bg-[#F0FDF4] border-[#86EFAC] text-[#14532D]'">
      <div
        class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-2xs"
        :class="cooling.humid ? 'bg-[#D97706]' : 'bg-[#16A34A]'">
        <v-icon :icon="cooling.humid ? 'mdi-water-off-outline' : 'mdi-sprinkler-variant'" size="26" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="text-xs font-black px-2.5 py-0.5 rounded-full"
            :class="cooling.humid ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' : 'bg-[#DCFCE7] text-[#166534]'">
            {{ cooling.humid ? 'ข้อควรระวังเมื่ออากาศชื้นสูง' : 'คำแนะนำการใช้น้ำคลายร้อน' }}
          </span>
        </div>
        <h3 class="text-base sm:text-lg font-black mt-1.5 leading-snug">
          {{ cooling.title }}
        </h3>
        <p class="text-xs sm:text-sm font-semibold mt-1 leading-relaxed opacity-95">
          {{ cooling.detail }}
        </p>
      </div>
    </div>

    <!-- ช่วงเวลาร้อนที่สุด & ช่วงเวลาเย็นเหมาะให้อาหาร (คำนวณจากโรงเรือนนี้ 3 วันล่าสุด) -->
    <div v-if="peakWindowLabel || coolWindowLabel" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <!-- ช่วงร้อนที่สุดของคอก -->
      <div
        v-if="peakWindowLabel"
        class="p-4 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl bg-[#EA580C]/15 text-[#EA580C] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-weather-sunny-alert" size="24" />
        </div>
        <div class="min-w-0">
          <div class="text-xs font-extrabold text-[#9A3412]">ช่วงที่คอกนี้มักร้อนที่สุด</div>
          <div class="text-base sm:text-lg font-black text-[#7C2D12] mt-0.5">
            ประมาณ {{ peakWindowLabel }}
          </div>
          <p class="text-xs font-semibold text-[#9A3412] mt-0.5 leading-snug">
            ควรเปิดพัดลมระบายอากาศล่วงหน้าก่อนถึงเวลานี้
          </p>
        </div>
      </div>

      <!-- ช่วงเย็นสบายเหมาะแก่การให้อาหาร -->
      <div
        v-if="coolWindowLabel"
        class="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl bg-[#059669]/15 text-[#059669] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-grass" size="24" />
        </div>
        <div class="min-w-0">
          <div class="text-xs font-extrabold text-[#065F46]">ช่วงอากาศเย็น เหมาะให้อาหาร</div>
          <div class="text-base sm:text-lg font-black text-[#064E3B] mt-0.5">
            ประมาณ {{ coolWindowLabel }}
          </div>
          <p class="text-xs font-semibold text-[#047857] mt-0.5 leading-snug">
            แม่วัวจะกินอาหารข้นและหญ้าได้มาก ไม่เกิดความร้อนสะสมช่วงบ่าย
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

const { cooling, forecast } = useFarmer()

const peakWindowLabel = computed(() => forecast.value?.peak_window?.label || '')
const coolWindowLabel = computed(() => forecast.value?.cool_window?.label || '')
</script>
