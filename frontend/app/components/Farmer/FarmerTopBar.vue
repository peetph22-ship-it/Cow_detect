<template>
  <header class="h-16 sm:h-[68px] bg-white/90 backdrop-blur-xl border-b border-[#E4E8E5] shrink-0 z-30 transition-all">
    <div class="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">
      <!-- ฝั่งซ้าย: ปุ่ม Hamburger สไลด์เปิด-ปิด Sidebar + ชื่อหน้าปัจจุบัน + ตัวสลับฟาร์ม -->
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <!-- ปุ่ม Hamburger ใช้ได้ทั้งบนคอมและมือถือ -->
        <button
          type="button"
          @click="$emit('toggle-sidebar')"
          class="w-10 h-10 rounded-xl bg-white hover:bg-[#F2F4F2] text-[#142820] flex items-center justify-center shrink-0 cursor-pointer border border-[#E4E8E5] shadow-2xs transition-colors"
          :title="sidebarOpen ? 'ซ่อนแถบเมนูด้านซ้าย' : 'เปิดแถบเมนูด้านซ้าย'"
          aria-label="สลับแถบเมนูด้านซ้าย">
          <v-icon :icon="sidebarOpen ? 'mdi-menu-open' : 'mdi-menu'" size="21" />
        </button>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h1 class="text-base sm:text-lg font-black text-[#142820] tracking-tight truncate">
              {{ pageTitle }}
            </h1>

            <!-- ตัวสลับฟาร์มบนแถบหัวเว็บ (กรณีมีหลายฟาร์ม) -->
            <div v-if="farms.length > 1" class="relative">
              <select
                :value="farm?.id"
                @change="onSelectFarm($event)"
                aria-label="เลือกฟาร์ม"
                class="appearance-none bg-[#F4EFE4] hover:bg-[#EAE2D0] text-[#142820] font-extrabold text-xs rounded-full pl-3 pr-7 py-1 border border-[#D8CEB8] focus:outline-none focus:border-[#D87939] cursor-pointer max-w-[160px] sm:max-w-[220px] truncate">
                <option v-for="f in farms" :key="f.id" :value="f.id">
                  {{ f.name }}
                </option>
              </select>
              <v-icon
                icon="mdi-chevron-down"
                size="15"
                class="text-[#D87939] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
            </div>

            <span
              v-else-if="farm?.name"
              class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#F4EFE4] text-[#24433A] border border-[#E2D9C5]">
              <v-icon icon="mdi-barn" size="14" class="text-[#D87939]" />
              <span>{{ farm.name }}</span>
            </span>
          </div>

          <p class="text-[11px] text-[#64766D] font-semibold truncate hidden sm:block">
            {{ todayDateLabel }}
            <span v-if="farm?.barn_unit"> · {{ farm.barn_unit }}</span>
            <span v-if="farm?.province"> · จ.{{ farm.province }}</span>
          </p>
        </div>
      </div>

      <!-- ฝั่งขวา: สถานะกล่องเซ็นเซอร์ + ปุ่มรีเฟรช -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- สถานะกล่องเซ็นเซอร์ -->
        <div
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border"
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

        <!-- ปุ่มรีเฟรชข้อมูล -->
        <button
          type="button"
          @click="refresh"
          :disabled="loading"
          class="w-10 h-10 rounded-xl bg-[#F4F6F4] hover:bg-[#E6ECE8] border border-[#E4E8E5] text-[#142820] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="อัปเดตข้อมูลล่าสุด">
          <v-icon icon="mdi-refresh" size="19" :class="loading ? 'animate-spin text-[#D87939]' : ''" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useFarmer, thaiDate } from '~/composables/useFarmer'
import { getCustomNodeApi, canSwitchBackend } from '~/API/baseAPI'

defineProps({
  sidebarOpen: {
    type: Boolean,
    default: true
  }
})

defineEmits(['toggle-sidebar'])

const route = useRoute()
const {
  farm,
  farms,
  now,
  loading,
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
</script>
