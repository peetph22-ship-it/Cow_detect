<template>
  <header class="bg-[#1B342D] text-[#FFFDF7] sticky top-0 z-40 shadow-md border-b border-white/10">
    <div class="max-w-5xl mx-auto px-4 py-2.5 sm:py-3">
      <div class="flex items-center justify-between gap-2.5">
        <!-- ข้อมูลฟาร์มและตัวสลับฟาร์ม -->
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <NuxtLink
            to="/Farmer"
            class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#24433A] border border-white/15 flex items-center justify-center shrink-0 shadow-inner text-decoration-none">
            <v-icon icon="mdi-cow" size="26" class="text-[#F3C68F]" />
          </NuxtLink>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- กรณีมีหลายฟาร์ม แสดงตัวเลือกสลับฟาร์ม -->
              <div v-if="farms.length > 1" class="relative max-w-full">
                <select
                  :value="farm?.id"
                  @change="onSelectFarm($event)"
                  aria-label="เลือกฟาร์ม"
                  class="appearance-none bg-[#24433A] hover:bg-[#2D5448] text-[#FFFDF7] font-black text-base sm:text-lg rounded-xl pl-3 pr-8 py-1 border border-white/20 focus:outline-none focus:border-[#F3C68F] cursor-pointer truncate max-w-[210px] sm:max-w-xs">
                  <option v-for="f in farms" :key="f.id" :value="f.id" class="bg-[#1B342D] text-white">
                    {{ f.name }}
                  </option>
                </select>
                <v-icon
                  icon="mdi-chevron-down"
                  size="18"
                  class=" text-[#F3C68F] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <!-- กรณีมีฟาร์มเดียว -->
              <h1 v-else class="text-base sm:text-xl font-black leading-tight truncate text-[#FFFDF7] tracking-tight">
                {{ farm?.name || 'CowCare ฟาร์มโคนม' }}
              </h1>

              <!-- ป้ายสถานะเซ็นเซอร์ -->
              <span
                v-if="now"
                class="inline-flex text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full items-center gap-1.5 border shrink-0"
                :class="now.sensor_status === 'online'
                  ? 'bg-[#24433A] text-[#A7F3D0] border-[#34D399]/30'
                  : 'bg-[#7F1D1D] text-[#FECACA] border-[#F87171]/40'">
                <span
                  class="w-2 h-2 rounded-full"
                  :class="now.sensor_status === 'online' ? 'bg-[#34D399] animate-pulse' : 'bg-[#F87171]'"></span>
                <span>{{ now.sensor_status === 'online' ? 'กล่องออนไลน์' : 'สัญญาณเงียบ' }}</span>
              </span>
            </div>

            <div class="text-xs sm:text-sm text-[#CBE3DB] truncate mt-0.5 flex items-center gap-2">
              <span>{{ farm?.barn_unit || 'โรงเรือนโคนม' }}</span>
              <span v-if="farm?.province" class="opacity-75">· จ.{{ farm.province }}</span>
            </div>
          </div>
        </div>

        <!-- เครื่องมือช่วยเหลือผู้สูงอายุ (เสียงอ่าน + ขนาดตัวอักษร) -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <!-- ปุ่มฟังเสียงสรุป -->
          <button
            type="button"
            @click="$emit('toggle-voice')"
            class="h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border"
            :class="isSpeaking
              ? 'bg-[#D87939] text-white border-[#F3C68F] animate-pulse'
              : 'bg-[#24433A] hover:bg-[#2D5448] text-[#FFFDF7] border-white/15'"
            :title="isSpeaking ? 'กดเพื่อหยุดเสียงอ่าน' : 'กดเพื่อฟังเสียงสรุป'">
            <v-icon :icon="isSpeaking ? 'mdi-stop-circle-outline' : 'mdi-volume-high'" size="20" />
            <span class="hidden sm:inline">{{ isSpeaking ? 'หยุดพูด' : 'ฟังเสียง' }}</span>
          </button>

          <!-- ปุ่มปรับขนาดตัวอักษร ก / ก+ / ก++ -->
          <div class="flex items-center bg-[#12241F] p-1 rounded-xl border border-white/15" role="group" aria-label="ขนาดตัวอักษร">
            <button
              v-for="s in fontOptions"
              :key="s.key"
              type="button"
              @click="setFontSize(s.key)"
              class="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer"
              :class="fontSize === s.key
                ? 'bg-[#D87939] text-white shadow-2xs'
                : 'text-[#A3C1B7] hover:text-white'">
              {{ s.label }}
            </button>
          </div>

          <!-- ป้ายบอกเมื่อเชื่อมหลังบ้านเพื่อน (เฉพาะโหมดพัฒนา) -->
          <NuxtLink
            v-if="showBackendSwitch && isCustomBackend"
            to="/Farmer/me"
            class="hidden md:inline-flex text-xs font-bold px-2.5 py-1.5 rounded-xl items-center gap-1.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-decoration-none">
            <v-icon icon="mdi-server-network" size="15" />
            <span>หลังบ้านกำหนดเอง</span>
          </NuxtLink>

          <!-- ปุ่มกลับหน้าแอดมิน (เฉพาะ Admin บนจอใหญ่) -->
          <NuxtLink
            v-if="isAdmin"
            to="/Admin"
            class="hidden lg:inline-flex h-10 px-3 rounded-xl text-xs font-bold text-[#FFFDF7] bg-[#24433A] hover:bg-[#2D5448] border border-white/15 items-center gap-1.5 text-decoration-none">
            <v-icon icon="mdi-shield-account-outline" size="17" />
            <span>หน้าแอดมิน</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- แถบแจ้งเตือนเมื่อกล่องเซ็นเซอร์มีปัญหา -->
    <div
      v-if="deviceAlert"
      class="bg-[#B45309] text-white text-xs sm:text-sm font-bold px-4 py-2.5 border-t border-black/15">
      <div class="max-w-5xl mx-auto flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <v-icon :icon="deviceAlert.icon" size="20" class="shrink-0" />
          <span>{{ deviceAlert.text }}</span>
        </div>
        <NuxtLink
          to="/Farmer/alerts"
          class="text-xs font-extrabold underline text-white shrink-0">
          ดูรายละเอียด
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useFarmer, agoText } from '~/composables/useFarmer'
import { getCustomNodeApi, canSwitchBackend } from '~/API/baseAPI'

defineEmits(['toggle-voice'])

const {
  me,
  farm,
  farms,
  now,
  isAdmin,
  fontSize,
  setFontSize,
  isSpeaking,
  selectFarm
} = useFarmer()

const isCustomBackend = computed(() => Boolean(getCustomNodeApi()))
const showBackendSwitch = ref(false)
onMounted(() => {
  showBackendSwitch.value = canSwitchBackend()
})

const fontOptions = [
  { key: 'normal', label: 'ก' },
  { key: 'large', label: 'ก+' },
  { key: 'huge', label: 'ก++' }
]

const onSelectFarm = (event) => {
  const targetId = event.target?.value
  if (targetId) selectFarm(targetId)
}

const deviceAlert = computed(() => {
  const dev = me.value?.device
  if (dev?.status === 'sensor_fault') {
    return {
      icon: 'mdi-thermometer-off',
      text: 'กล่องส่งสัญญาณออนไลน์ แต่อ่านค่าหัววัดอุณหภูมิไม่ได้ กรุณาตรวจสายเซ็นเซอร์ในคอก'
    }
  }
  if (now.value && now.value.sensor_status === 'offline') {
    return {
      icon: 'mdi-wifi-off',
      text: `กล่องเซ็นเซอร์ไม่ได้ส่งข้อมูลมา ${agoText(now.value.minutes_ago)} กรุณาตรวจปลั๊กไฟและสัญญาณเน็ตที่โรงเรือน`
    }
  }
  return null
})
</script>
