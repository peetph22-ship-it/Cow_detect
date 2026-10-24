<template>
  <section v-if="vetPhoneDisplay || showEmptyHint" class="w-full">
    <a
      v-if="vetPhoneDisplay"
      :href="`tel:${vetPhoneClean}`"
      class="w-full min-h-[72px] px-5 py-4 rounded-3xl bg-[#D87939] hover:bg-[#C2672B] text-white flex items-center justify-between gap-3 font-black text-base sm:text-lg shadow-sm transition-all text-decoration-none active:scale-[0.99] border border-[#B85D23]">
      <div class="flex items-center gap-3.5 min-w-0">
        <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <v-icon icon="mdi-phone-in-talk" size="26" />
        </div>
        <div class="text-left min-w-0">
          <div class="text-xs sm:text-sm text-[#FFF3E6] font-bold">
            {{ subtitle }}
          </div>
          <div class="leading-tight truncate text-base sm:text-xl">
            โทรหาสัตวแพทย์: {{ vetPhoneDisplay }}
          </div>
        </div>
      </div>
      <div class="px-3 py-1.5 rounded-xl bg-white/20 text-xs sm:text-sm font-extrabold shrink-0">
        กดโทรออก
      </div>
    </a>

    <div
      v-else-if="showEmptyHint"
      class="p-4 rounded-2xl bg-[#FAF6EC] border border-[#E6DEC8] text-[#5C4D3C] text-xs sm:text-sm font-semibold flex items-center gap-3">
      <v-icon icon="mdi-phone-plus-outline" size="22" class="text-[#D87939] shrink-0" />
      <span>ยังไม่ได้บันทึกเบอร์สัตวแพทย์ประจำฟาร์ม สามารถแจ้งเจ้าหน้าที่สหกรณ์เพื่อเพิ่มเบอร์โทรด่วนได้</span>
    </div>
  </section>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

defineProps({
  subtitle: {
    type: String,
    default: 'เมื่อแม่วัวมีอาการผิดปกติ หรือต้องการปรึกษาด่วน'
  },
  showEmptyHint: {
    type: Boolean,
    default: false
  }
})

const { farm } = useFarmer()

const vetPhoneDisplay = computed(() => farm.value?.vet_phone || '')
const vetPhoneClean = computed(() => vetPhoneDisplay.value.replace(/[^0-9+]/g, ''))
</script>
