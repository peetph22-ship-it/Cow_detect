<template>
  <section class="bg-[#FFFDF7] rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E6DEC8]">
    <!-- หัวข้อคำแนะนำ (อ่านอย่างเดียว ไม่ต้องติ๊ก) -->
    <div class="mb-4">
      <h2 class="text-base sm:text-lg font-black text-[#1B342D] flex items-center gap-2">
        <v-icon icon="mdi-lightbulb-on-outline" class="text-[#2D6A4F]" size="24" />
        <span>คำแนะนำดูแลแม่วัววันนี้</span>
      </h2>
    </div>

    <!-- รายการคำแนะนำ -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="act in adviceList"
        :key="act.id"
        class="p-4 rounded-2xl border-2 bg-white border-[#E6DEC8] text-[#1B342D] flex items-start gap-3.5">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#F4EFE4] border border-[#E6DEC8] text-[#1B342D] mt-0.5">
          <v-icon :icon="act.icon" size="24" />
        </div>

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-base font-black leading-snug">{{ act.title }}</span>
            <span
              v-if="act.recommended"
              class="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              แนะนำตอนนี้
            </span>
          </div>
          <p class="text-xs sm:text-sm mt-1 leading-snug font-medium text-[#4E655B]">
            {{ act.desc }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

const { senior, cooling } = useFarmer()

const adviceList = computed(() => {
  const base = senior.value?.action_templates?.length
    ? senior.value.action_templates
    : [
        { id: 'fan', title: 'เปิดพัดลมในคอก', desc: 'ช่วยระบายอากาศร้อน ไม่ให้อากาศอับ', icon: 'mdi-fan', recommended: true },
        { id: 'water_spray', title: 'เปิดละอองน้ำ / สปริงเกลอร์', desc: 'ฉีดพ่นน้ำเป็นรอบๆ ช่วยลดอุณหภูมิร่างกายวัว', icon: 'mdi-sprinkler-variant', recommended: false },
        { id: 'fresh_water', title: 'เติมน้ำสะอาดให้เต็มราง', desc: 'แม่วัวกินน้ำเยอะขึ้นเมื่ออากาศร้อน ดื่มน้ำลดเครียด', icon: 'mdi-cup-water', recommended: true },
        { id: 'check_cow', title: 'สังเกตอาการแม่วัว (ไม่หอบ)', desc: 'ตรวจดูว่ามีตัวไหนยืนหอบ อ้าปาก หรือน้ำลายยืดหรือไม่', icon: 'mdi-cow', recommended: true }
      ]

  if (!cooling.value?.humid) return base
  return base.map(act => act.id === 'water_spray'
    ? {
        ...act,
        title: 'ฉีดน้ำรดตัววัวสลับพัดลม (งดหมอกฝอย)',
        desc: 'อากาศชื้นสูง งดพ่นหมอกฝอย ให้ฉีดน้ำรดหลังและไหล่วัวช่วงสั้นๆ แล้วเป่าพัดลมให้แห้ง'
      }
    : act)
})
</script>
