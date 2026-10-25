<template>
  <section class="h-full bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] flex flex-col justify-between space-y-4">
    <!-- หัวข้อการ์ด -->
    <div>
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#D87939] border border-[#FED7AA] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-fan-alert" size="22" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-black text-[#142820] leading-tight">
              คำแนะนำคลายร้อน & ช่วงเวลาสำคัญ
            </h2>
            <p class="text-xs text-[#64766D] font-medium">
              เลือกวิธีใช้น้ำและพัดลมตามความชื้นในคอก
            </p>
          </div>
        </div>
      </div>

      <!-- กล่องคำแนะนำการใช้น้ำคลายร้อน (แสดงเสมอ แม้กล่องออฟไลน์ก็บอกหลักการปฏิบัติ) -->
      <div
        v-if="hasFreshCooling"
        class="p-4 rounded-2xl border-2 flex items-start gap-3.5"
        :class="cooling.humid
          ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#78350F]'
          : 'bg-[#ECFDF5] border-[#6EE7B7] text-[#14532D]'">
        <div
          class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-2xs"
          :class="cooling.humid ? 'bg-[#D97706]' : 'bg-[#16A34A]'">
          <v-icon :icon="cooling.humid ? 'mdi-water-off-outline' : 'mdi-sprinkler-variant'" size="24" />
        </div>

        <div class="min-w-0 flex-1">
          <span
            class="inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full"
            :class="cooling.humid ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' : 'bg-[#DCFCE7] text-[#166534]'">
            {{ cooling.humid ? 'ความชื้นสูง · งดพ่นหมอกฝอย' : 'ความชื้นเหมาะสม · พ่นหมอกได้' }}
          </span>
          <h3 class="text-sm sm:text-base font-black mt-1.5 leading-snug">
            {{ cooling.title }}
          </h3>
          <p class="text-xs font-semibold mt-1 leading-relaxed opacity-95">
            {{ cooling.detail }}
          </p>
        </div>
      </div>

      <!-- กรณีกล่องเซ็นเซอร์ออฟไลน์: แสดงหลักการเลือกวิธีคลายร้อนตามความชื้น -->
      <div
        v-else
        class="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E4E8E5] space-y-2">
        <div class="flex items-center gap-2 text-xs font-black text-[#142820]">
          <v-icon icon="mdi-information-outline" size="18" class="text-[#D87939]" />
          <span>รอค่าความชื้นล่าสุดจากกล่องเซ็นเซอร์</span>
        </div>
        <p class="text-xs text-[#4E655B] font-semibold leading-relaxed">
          • หากอากาศร้อนและ<strong>ไม่ชื้นอับ (&lt;75%)</strong>: เปิดพ่นหมอกคู่กับพัดลมได้<br />
          • หากอากาศ<strong>ชื้นอบอ้าว (≥75%)</strong>: งดพ่นหมอกฝอย ให้ฉีดน้ำรดหลังวัวช่วงสั้นๆ แล้วเป่าพัดลมให้แห้งแทน
        </p>
      </div>
    </div>

    <!-- 2 ช่วงเวลาสำคัญของโรงเรือนนี้ -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
      <!-- ช่วงที่มักร้อนที่สุด -->
      <div class="p-3.5 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#EA580C]/15 text-[#EA580C] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-weather-sunny-alert" size="22" />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] font-extrabold text-[#9A3412]">ช่วงที่คอกนี้มักร้อนที่สุด</div>
          <div class="text-sm sm:text-base font-black text-[#7C2D12] mt-0.5">
            {{ peakWindowLabel ? `ประมาณ ${peakWindowLabel}` : 'รอสะสมข้อมูล 3 วัน' }}
          </div>
          <p class="text-[11px] font-semibold text-[#9A3412] mt-0.5 leading-snug">
            เตรียมเปิดพัดลมระบายอากาศล่วงหน้า
          </p>
        </div>
      </div>

      <!-- ช่วงอากาศเย็นเหมาะให้อาหาร -->
      <div class="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#059669]/15 text-[#059669] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-grass" size="22" />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] font-extrabold text-[#065F46]">ช่วงอากาศเย็นเหมาะให้อาหาร</div>
          <div class="text-sm sm:text-base font-black text-[#064E3B] mt-0.5">
            {{ coolWindowLabel ? `ประมาณ ${coolWindowLabel}` : 'ช่วงเช้ามืด / หัวค่ำ' }}
          </div>
          <p class="text-[11px] font-semibold text-[#047857] mt-0.5 leading-snug">
            แม่วัวกินอาหารข้นได้ดี ลดความร้อนสะสม
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

const { now, cooling, forecast } = useFarmer()

const hasFreshCooling = computed(() => Boolean(cooling.value && now.value?.sensor_status === 'online'))
const peakWindowLabel = computed(() => forecast.value?.peak_window?.label || '')
const coolWindowLabel = computed(() => forecast.value?.cool_window?.label || '')
</script>
