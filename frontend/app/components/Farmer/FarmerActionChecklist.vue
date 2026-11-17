<template>
  <section class="h-full bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] flex flex-col justify-between space-y-4">
    <!-- หัวข้อคำแนะนำ (อ่านอย่างเดียว ไม่ต้องกดติ๊กเช็กลิสต์) -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-2xl bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] flex items-center justify-center shrink-0">
          <v-icon icon="mdi-lightbulb-on-outline" size="22" />
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-black text-[#142820] leading-tight">
            คำแนะนำการดูแลแม่วัวในคอก
          </h2>
          <p class="text-xs text-[#64766D] font-medium">
            แนวทางปฏิบัติตามสภาพอุณหภูมิและความชื้นของโรงเรือน
          </p>
        </div>
      </div>

      <span
        class="text-xs font-extrabold px-3 py-1 rounded-full bg-[#F4F6F4] text-[#24433A] border border-[#E4E8E5]">
        คำแนะนำอัตโนมัติ
      </span>
    </div>

    <!-- รายการคำแนะนำ 4 ข้อ (Read-only Cards) -->
    <!-- จอ lg การ์ดนี้กว้างแค่ครึ่งจอ 2 คอลัมน์จะบีบข้อความ: ใช้ 1 คอลัมน์ แล้วกลับเป็น 2 คอลัมน์ที่จอ 2xl -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-3">
      <div
        v-for="act in adviceList"
        :key="act.id"
        class="p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start gap-3"
        :class="act.highlight
          ? 'bg-[#FFFBEB] border-[#FDE68A]'
          : 'bg-[#F8FAF9] border-[#E4E8E5]'">
        <!-- ไอคอน -->
        <div
          class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          :class="act.highlight
            ? 'bg-[#D97706] text-white shadow-2xs'
            : 'bg-white border border-[#E4E8E5] text-[#142820]'">
          <v-icon :icon="act.icon" size="22" />
        </div>

        <!-- ข้อความคำแนะนำ -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <h3 class="text-sm sm:text-base font-black text-[#142820] leading-snug">
              {{ act.title }}
            </h3>
            <span
              v-if="act.highlight"
              class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              เน้นย้ำตอนนี้
            </span>
          </div>
          <p class="text-xs text-[#5A6B63] mt-1 leading-relaxed font-medium">
            {{ act.desc }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

const { now, senior, cooling } = useFarmer()

const hasFreshHeat = computed(() =>
  now.value?.sensor_status === 'online' && ['mild', 'moderate', 'severe'].includes(now.value?.risk_level)
)

const adviceList = computed(() => {
  const base = senior.value?.action_templates?.length
    ? senior.value.action_templates
    : [
        { id: 'fan', title: 'เปิดพัดลมระบายอากาศ', desc: 'ช่วยพัดไอร้อนออกจากตัววัวและลดความอับชื้นในโรงเรือน', icon: 'mdi-fan', recommended: true },
        { id: 'water_spray', title: 'ใช้น้ำลดความร้อนตามความชื้น', desc: 'พ่นน้ำหรือฉีดน้ำรดตัววัวเป็นรอบๆ สลับกับการเป่าพัดลม', icon: 'mdi-sprinkler-variant', recommended: false },
        { id: 'fresh_water', title: 'เตรียมน้ำสะอาดให้เต็มรางเสมอ', desc: 'แม่วัวดื่มน้ำมากขึ้นเมื่ออากาศร้อน น้ำเย็นสะอาดช่วยลดอุณหภูมิร่างกาย', icon: 'mdi-cup-water', recommended: true },
        { id: 'check_cow', title: 'สังเกตอาการหอบและการกินอาหาร', desc: 'ดูว่ามีแม่วัวยืนหอบ อ้าปาก น้ำลายยืด หรือกินอาหารลดลงผิดปกติหรือไม่', icon: 'mdi-cow', recommended: true }
      ]

  return base.map(act => {
    let title = act.title
    let desc = act.desc
    if (act.id === 'water_spray' && cooling.value?.humid) {
      title = 'ฉีดน้ำรดตัววัวสลับพัดลม (งดหมอกฝอย)'
      desc = 'เมื่อความชื้นสูง (≥75%) งดพ่นหมอกฝอย ให้ฉีดน้ำรดหลังและไหล่วัวช่วงสั้นๆ แล้วเป่าพัดลมให้แห้ง'
    }
    return {
      ...act,
      title,
      desc,
      highlight: Boolean(hasFreshHeat.value && act.recommended)
    }
  })
})
</script>
