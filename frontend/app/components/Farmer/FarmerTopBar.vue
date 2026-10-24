<template>
  <header class="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-[#E4E8E5] transition-all">
    <div class="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-3">
      <!-- ฝั่งซ้าย: ปุ่มเปิดเมนูมือถือ + ชื่อหน้าปัจจุบัน + ตัวสลับฟาร์ม -->
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <!-- ปุ่มเปิด Sidebar บนมือถือ/แท็บเล็ต -->
        <button
          type="button"
          @click="$emit('open-sidebar')"
          class="lg:hidden w-10 h-10 rounded-xl bg-[#F4F6F4] hover:bg-[#E6ECE8] text-[#142820] flex items-center justify-center shrink-0 cursor-pointer border border-[#E4E8E5]"
          aria-label="เปิดเมนูนำทาง">
          <v-icon icon="mdi-menu" size="22" />
        </button>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h1 class="text-base sm:text-xl font-black text-[#142820] tracking-tight truncate">
              {{ pageTitle }}
            </h1>

            <!-- ตัวสลับฟาร์มบนแถบหัวเว็บ (กรณีมีหลายฟาร์ม) -->
            <div v-if="farms.length > 1" class="relative">
              <select
                :value="farm?.id"
                @change="onSelectFarm($event)"
                aria-label="เลือกฟาร์ม"
                class="appearance-none bg-[#F4EFE4] hover:bg-[#EAE2D0] text-[#142820] font-extrabold text-xs sm:text-sm rounded-full pl-3.5 pr-8 py-1 border border-[#D8CEB8] focus:outline-none focus:border-[#D87939] cursor-pointer max-w-[180px] sm:max-w-[240px] truncate">
                <option v-for="f in farms" :key="f.id" :value="f.id">
                  {{ f.name }}
                </option>
              </select>
              <v-icon
                icon="mdi-chevron-down"
                size="16"
                class="text-[#D87939] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <span
              v-else-if="farm?.name"
              class="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-extrabold bg-[#F4EFE4] text-[#24433A] border border-[#E2D9C5]">
              <v-icon icon="mdi-barn" size="14" class="text-[#D87939]" />
              <span>{{ farm.name }}</span>
            </span>
          </div>

          <p class="text-[11px] sm:text-xs text-[#64766D] font-semibold truncate mt-0.5">
            {{ todayDateLabel }}
            <span v-if="farm?.barn_unit"> · {{ farm.barn_unit }}</span>
            <span v-if="farm?.province"> · จ.{{ farm.province }}</span>
          </p>
        </div>
      </div>

      <!-- ฝั่งขวา: สถานะกล่องเซ็นเซอร์ + ปุ่มฟังเสียงสรุป + ปุ่มรีเฟรช -->
      <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <!-- สถานะกล่องเซ็นเซอร์ -->
        <div
          class="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border"
          :class="sensorOnline
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-900 border-amber-200'">
          <span
            class="w-2 h-2 rounded-full"
            :class="sensorOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
          <span>{{ sensorOnline ? 'เซ็นเซอร์ออนไลน์' : 'ไม่มีข้อมูลสด' }}</span>
        </div>

        <!-- ป้ายบอกเมื่อเชื่อมหลังบ้านกำหนดเอง (เฉพาะโหมดพัฒนา) -->
        <NuxtLink
          v-if="showBackendSwitch && isCustomBackend"
          to="/Farmer/me"
          class="hidden md:inline-flex text-xs font-extrabold px-3 py-1.5 rounded-full items-center gap-1.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-decoration-none">
          <v-icon icon="mdi-server-network" size="15" />
          <span>หลังบ้านกำหนดเอง</span>
        </NuxtLink>

        <!-- ปุ่มกดฟังเสียงสรุป -->
        <button
          type="button"
          @click="$emit('toggle-voice')"
          class="h-10 sm:h-11 px-3.5 sm:px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          :class="isSpeaking
            ? 'bg-[#DC2626] text-white animate-pulse'
            : 'bg-[#142820] hover:bg-[#24433A] text-[#FFFDF7]'"
          :title="isSpeaking ? 'กดเพื่อหยุดเสียงอ่าน' : 'กดเพื่อฟังเสียงสรุป'">
          <v-icon :icon="isSpeaking ? 'mdi-stop-circle-outline' : 'mdi-volume-high'" size="19" class="text-[#F3C68F]" />
          <span>{{ isSpeaking ? 'หยุดพูด' : 'ฟังเสียงสรุป' }}</span>
        </button>

        <!-- ปุ่มรีเฟรชข้อมูล -->
        <button
          type="button"
          @click="refresh"
          :disabled="loading"
          class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#F4F6F4] hover:bg-[#E6ECE8] border border-[#E4E8E5] text-[#142820] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="อัปเดตข้อมูลล่าสุด">
          <v-icon icon="mdi-refresh" size="20" :class="loading ? 'animate-spin text-[#D87939]' : ''" />
        </button>
      </div>
    </div>

    <!-- แถบแจ้งเตือนเมื่อกล่องเซ็นเซอร์มีปัญหา -->
    <div
      v-if="deviceAlert"
      class="bg-gradient-to-r from-[#B45309] to-[#D97706] text-white text-xs sm:text-sm font-bold px-4 sm:px-8 py-2.5 border-t border-black/10">
      <div class="max-w-[1380px] mx-auto flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <v-icon :icon="deviceAlert.icon" size="20" class="shrink-0" />
          <span>{{ deviceAlert.text }}</span>
        </div>
        <NuxtLink
          to="/Farmer/alerts"
          class="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-extrabold text-white text-decoration-none shrink-0">
          ดูประวัติแจ้งเตือน
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useFarmer, agoText, thaiDate } from '~/composables/useFarmer'
import { getCustomNodeApi, canSwitchBackend } from '~/API/baseAPI'

defineEmits(['toggle-voice', 'open-sidebar'])

const route = useRoute()
const {
  me,
  farm,
  farms,
  now,
  loading,
  isSpeaking,
  selectFarm,
  refresh
} = useFarmer()

const isCustomBackend = computed(() => Boolean(getCustomNodeApi()))
const showBackendSwitch = ref(false)
onMounted(() => {
  showBackendSwitch.value = canSwitchBackend()
})

const sensorOnline = computed(() => now.value?.sensor_status === 'online')

const pageTitle = computed(() => {
  if (route.path.startsWith('/Farmer/history')) return 'ประวัติอากาศย้อนหลัง 7 วัน'
  if (route.path.startsWith('/Farmer/alerts')) return 'ศูนย์แจ้งเตือนความร้อนและอุปกรณ์'
  if (route.path.startsWith('/Farmer/me')) return 'ข้อมูลฟาร์มและตั้งค่าระบบ'
  return 'แดชบอร์ดดูแลโคนมประจำวัน'
})

const todayDateLabel = computed(() =>
  thaiDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
)

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
