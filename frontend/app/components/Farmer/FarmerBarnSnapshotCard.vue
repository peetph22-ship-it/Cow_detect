<template>
  <section
    v-if="hasToday || hasCamera"
    class="bg-[#FFFDF7] rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E6DEC8] space-y-5">
    <!-- ส่วนที่ 1: สรุปภาพรวมความร้อนวันนี้ & ความเครียดสะสม -->
    <div v-if="hasToday" class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base sm:text-lg font-black text-[#1B342D] flex items-center gap-2">
          <v-icon icon="mdi-chart-timeline-variant" class="text-[#2D6A4F]" size="24" />
          <span>สรุปสภาพคอกรอบ 24 ชั่วโมงล่าสุด</span>
        </h2>
        <NuxtLink
          to="/Farmer/history"
          class="text-xs sm:text-sm font-extrabold text-[#2D6A4F] hover:underline flex items-center gap-0.5 text-decoration-none">
          <span>ดูย้อนหลัง 7 วัน</span>
          <v-icon icon="mdi-chevron-right" size="18" />
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- ชั่วโมงที่อากาศร้อนวันนี้ -->
        <div class="p-4 rounded-2xl bg-white border border-[#E6DEC8] flex items-center gap-3.5">
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            :class="(today?.stress_hours || 0) > 0 ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#ECFDF5] text-[#16A34A]'">
            <v-icon icon="mdi-clock-alert-outline" size="24" />
          </div>
          <div>
            <div class="text-xs font-extrabold text-[#4E655B]">ชั่วโมงที่อากาศร้อน</div>
            <div class="text-xl sm:text-2xl font-black text-[#1B342D] tabular-nums leading-tight mt-0.5">
              {{ (today?.stress_hours || 0) > 0 ? `${today.stress_hours} ชม.` : 'ไม่มีเลย' }}
            </div>
            <div class="text-[11px] font-bold text-[#4E655B]">
              {{ (today?.severe_hours || 0) > 0 ? `(ร้อนจัด ${today.severe_hours} ชม.)` : 'อยู่ในเกณฑ์ดูแลได้' }}
            </div>
          </div>
        </div>

        <!-- การพักฟื้นช่วงกลางคืน -->
        <div class="p-4 rounded-2xl bg-white border border-[#E6DEC8] flex items-center gap-3.5">
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            :class="nightRestOk ? 'bg-[#ECFDF5] text-[#16A34A]' : 'bg-[#FFF7ED] text-[#EA580C]'">
            <v-icon icon="mdi-weather-night" size="24" />
          </div>
          <div>
            <div class="text-xs font-extrabold text-[#4E655B]">พักฟื้นตอนกลางคืน</div>
            <div
              class="text-base sm:text-lg font-black leading-tight mt-0.5"
              :class="nightRestOk ? 'text-[#15803D]' : 'text-[#C2410C]'">
              {{ nightRestOk ? 'วัวได้พักเต็มที่' : 'กลางคืนยังอบอ้าว' }}
            </div>
            <div class="text-[11px] font-bold text-[#4E655B]">
              {{ today?.night_relief_hours != null ? `อากาศเย็น ${today.night_relief_hours} ชม.` : 'ช่วง 22:00–06:00 น.' }}
            </div>
          </div>
        </div>

        <!-- ความร้อนสะสมต่อเนื่อง -->
        <div class="p-4 rounded-2xl bg-white border border-[#E6DEC8] flex items-center gap-3.5">
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            :class="streakDays >= 2 ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#F4EFE4] text-[#1B342D]'">
            <v-icon icon="mdi-fire" size="24" />
          </div>
          <div>
            <div class="text-xs font-extrabold text-[#4E655B]">ร้อนสะสมติดต่อกัน</div>
            <div class="text-xl sm:text-2xl font-black text-[#1B342D] tabular-nums leading-tight mt-0.5">
              {{ streakDays > 0 ? `${streakDays} วันติด` : 'ไม่สะสม' }}
            </div>
            <div class="text-[11px] font-bold text-[#4E655B]">
              {{ streakDays >= 3 ? 'ระวังแม่วัวกินอาหารลดลง' : 'แม่วัวฟื้นตัวได้ตามปกติ' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ส่วนที่ 2: พฤติกรรมแม่วัวจากกล้อง AI (แสดงเฉพาะเมื่อมีข้อมูลกล้องจริง) -->
    <div
      v-if="hasCamera"
      class="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6DEC8] space-y-3"
      :class="hasToday ? 'pt-4' : ''">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-xl bg-[#1B342D] text-[#F3C68F] flex items-center justify-center">
            <v-icon icon="mdi-cctv" size="20" />
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-black text-[#1B342D] leading-tight">
              พฤติกรรมแม่วัวจากกล้อง AI
            </h3>
            <p class="text-[11px] sm:text-xs text-[#4E655B] font-semibold">
              ตรวจพบในภาพ {{ camera.total }} ตัว
              <span v-if="camera.minutes_ago != null">· อัปเดต {{ agoText(camera.minutes_ago) }}</span>
            </p>
          </div>
        </div>

        <span
          class="text-xs font-black px-3 py-1 rounded-full border"
          :class="lyingPct >= 50
            ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'
            : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'">
          {{ lyingPct >= 50 ? 'ส่วนใหญ่นอนพักสบาย' : 'วัวยืนค่อนข้างมาก' }}
        </span>
      </div>

      <!-- แถบเปรียบเทียบสัดส่วนวัวนอนพัก vs ยืน -->
      <div class="space-y-1.5">
        <div class="flex justify-between text-xs sm:text-sm font-black">
          <span class="text-[#15803D] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
            นอนพัก {{ lyingPct }}%
          </span>
          <span class="text-[#D97706] flex items-center gap-1.5">
            ยืน {{ standingPct }}%
            <span class="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
          </span>
        </div>

        <div class="h-3.5 w-full rounded-full bg-[#ECE6D8] overflow-hidden flex p-0.5 gap-0.5">
          <div
            class="h-full bg-[#16A34A] rounded-l-full transition-all duration-300"
            :style="{ width: `${lyingPct}%` }"></div>
          <div
            class="h-full bg-[#F59E0B] rounded-r-full transition-all duration-300"
            :style="{ width: `${standingPct}%` }"></div>
        </div>

        <p class="text-xs text-[#4E655B] font-medium pt-0.5">
          แม่วัวที่สบายตัวจะนอนเคี้ยวเอื้องเป็นส่วนใหญ่ หากวัวยืนพร้อมกันหลายตัวในช่วงบ่าย มักเกิดจากกำลังยืนรับลมเพื่อระบายความร้อน
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useFarmer, agoText } from '~/composables/useFarmer'

const { today, streak, camera } = useFarmer()

const hasToday = computed(() => Boolean(today.value && today.value.data_hours > 0))
const hasCamera = computed(() => Boolean(camera.value && camera.value.total != null && camera.value.lying_pct != null))

const nightRestOk = computed(() => (today.value?.night_relief_hours ?? 0) >= 3)
const streakDays = computed(() => streak.value?.days || 0)

const lyingPct = computed(() => Math.round(Number(camera.value?.lying_pct || 0)))
const standingPct = computed(() => Math.round(Number(camera.value?.standing_pct ?? (100 - lyingPct.value))))
</script>
