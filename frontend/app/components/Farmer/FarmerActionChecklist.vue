<template>
  <section class="bg-[#FFFDF7] rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E6DEC8]">
    <!-- หัวข้อเช็กลิสต์ + ความคืบหน้า -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div>
        <h2 class="text-base sm:text-lg font-black text-[#1B342D] flex items-center gap-2">
          <v-icon icon="mdi-checkbox-marked-circle-outline" class="text-[#2D6A4F]" size="24" />
          <span>เช็กลิสต์ดูแลแม่วัววันนี้</span>
        </h2>
        <p class="text-xs sm:text-sm text-[#4E655B] font-medium mt-0.5">
          กดที่รายการเพื่อติ๊กช่วยจำเมื่อทำเสร็จแล้ว (บันทึกอัตโนมัติ)
        </p>
      </div>

      <span
        class="text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full border"
        :class="doneCount === actionList.length
          ? 'bg-[#1B342D] text-[#FFFDF7] border-[#1B342D]'
          : 'bg-[#E8F5E9] text-[#1B4332] border-[#BBF7D0]'">
        ทำแล้ว {{ doneCount }}/{{ actionList.length }} ข้อ
      </span>
    </div>

    <!-- แถบความคืบหน้า -->
    <div class="h-2.5 w-full rounded-full bg-[#ECE6D8] overflow-hidden mb-4">
      <div
        class="h-full bg-[#2D6A4F] transition-all duration-300 rounded-full"
        :style="{ width: `${progressPct}%` }"></div>
    </div>

    <!-- รายการสิ่งที่ควรทำ 4 ข้อ -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        v-for="act in actionList"
        :key="act.id"
        type="button"
        @click="toggleAction(act.id)"
        class="w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99]"
        :class="isDone(act.id)
          ? 'bg-[#ECFDF5] border-[#2D6A4F] text-[#1B342D]'
          : 'bg-white border-[#E6DEC8] hover:border-[#2D6A4F]/50 text-[#1B342D]'">
        <div class="flex items-start gap-3.5 min-w-0">
          <!-- ไอคอน -->
          <div
            class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors mt-0.5"
            :class="isDone(act.id)
              ? 'bg-[#2D6A4F] text-white shadow-2xs'
              : 'bg-[#F4EFE4] border border-[#E6DEC8] text-[#1B342D]'">
            <v-icon :icon="act.icon" size="24" />
          </div>

          <!-- ข้อความ -->
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                class="text-base font-black leading-snug"
                :class="isDone(act.id) ? 'line-through text-[#2D6A4F]' : 'text-[#1B342D]'">
                {{ act.title }}
              </span>
              <span
                v-if="act.recommended && !isDone(act.id)"
                class="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                แนะนำตอนนี้
              </span>
            </div>
            <p
              class="text-xs sm:text-sm mt-1 leading-snug font-medium"
              :class="isDone(act.id) ? 'text-[#2D6A4F]/80' : 'text-[#4E655B]'">
              {{ act.desc }}
            </p>
          </div>
        </div>

        <!-- วงกลมเครื่องหมายถูก -->
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all"
          :class="isDone(act.id)
            ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white'
            : 'border-[#CBD5E1] bg-white text-transparent'">
          <v-icon icon="mdi-check-bold" size="18" />
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

const { senior, cooling, doneActions, toggleAction } = useFarmer()

const actionList = computed(() => {
  const base = senior.value?.action_templates?.length
    ? senior.value.action_templates
    : [
        { id: 'fan', title: 'เปิดพัดลมในคอก', desc: 'ช่วยระบายอากาศร้อน ไม่ให้อากาศอับ', icon: 'mdi-fan', recommended: true },
        { id: 'water_spray', title: 'เปิดละอองน้ำ / สปริงเกลอร์', desc: 'ฉีดพ่นน้ำเป็นรอบๆ ช่วยลดอุณหภูมิร่างกายวัว', icon: 'mdi-sprinkler-variant', recommended: false },
        { id: 'fresh_water', title: 'เติมน้ำสะอาดให้เต็มราง', desc: 'แม่วัวกินน้ำเยอะขึ้นเมื่ออากาศร้อน ดื่มน้ำลดเครียด', icon: 'mdi-cup-water', recommended: true },
        { id: 'check_cow', title: 'สังเกตอาการแม่วัว (ไม่หอบ)', desc: 'ตรวจดูว่ามีตัวไหนยืนหอบ อ้าปาก หรือน้ำลายยืดหรือไม่', icon: 'mdi-cow', recommended: true }
      ]

  if (cooling.value?.humid) {
    return base.map(act => {
      if (act.id === 'water_spray') {
        return {
          ...act,
          title: 'ฉีดน้ำรดตัววัวสลับพัดลม (งดหมอกฝอย)',
          desc: 'อากาศชื้นสูง งดพ่นหมอกฝอย ให้ฉีดน้ำรดหลังและไหล่วัวช่วงสั้นๆ แล้วเป่าพัดลมให้แห้ง'
        }
      }
      return act
    })
  }
  return base
})

const isDone = (id) => doneActions.value.includes(id)
const doneCount = computed(() => actionList.value.filter(a => isDone(a.id)).length)
const progressPct = computed(() => {
  if (!actionList.value.length) return 0
  return Math.round((doneCount.value / actionList.value.length) * 100)
})
</script>
