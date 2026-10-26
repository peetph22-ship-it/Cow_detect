<template>
  <section class="h-full bg-white rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(20,40,32,0.04)] border border-[#E4E8E5] flex flex-col justify-between space-y-5">
    <!-- ส่วนที่ 1: สรุปภาพรวมความร้อนรอบ 24 ชั่วโมง -->
    <div class="space-y-3.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-chart-timeline-variant" size="22" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-black text-[#142820] leading-tight">
              สรุปสภาพคอก 24 ชม. & กล้อง AI
            </h2>
            <p class="text-xs text-[#64766D] font-medium">
              ชั่วโมงความร้อนสะสมและพฤติกรรมการพักผ่อนของแม่วัว
            </p>
          </div>
        </div>

        <NuxtLink
          to="/Farmer/history"
          class="px-3 py-1.5 rounded-full bg-[#F4F6F4] hover:bg-[#E6ECE8] text-xs font-extrabold text-[#142820] flex items-center gap-1 text-decoration-none shrink-0">
          <span>ดู 7 วัน</span>
          <v-icon icon="mdi-arrow-right" size="14" />
        </NuxtLink>
      </div>

      <!-- 3 กล่องสรุป 24 ชม. -->
      <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
        <!-- ชั่วโมงที่อากาศร้อน -->
        <div class="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E4E8E5]">
          <div class="text-[11px] font-extrabold text-[#4E655B]">ชั่วโมงร้อนวันนี้</div>
          <div class="text-lg sm:text-2xl font-black text-[#142820] tabular-nums leading-tight mt-1">
            <template v-if="hasToday">
              {{ (today?.stress_hours || 0) > 0 ? `${today.stress_hours} ชม.` : '0 ชม.' }}
            </template>
            <template v-else>—</template>
          </div>
          <div class="text-[10px] font-bold text-[#64766D] mt-1 truncate">
            <template v-if="hasToday">
              {{ (today?.severe_hours || 0) > 0 ? `ร้อนจัด ${today.severe_hours} ชม.` : 'ไม่ถึงเกณฑ์วิกฤต' }}
            </template>
            <template v-else>รอข้อมูลวันนี้</template>
          </div>
        </div>

        <!-- การพักฟื้นช่วงกลางคืน -->
        <div class="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E4E8E5]">
          <div class="text-[11px] font-extrabold text-[#4E655B]">พักกลางคืน</div>
          <div
            class="text-sm sm:text-lg font-black leading-tight mt-1"
            :class="!hasToday ? 'text-[#142820]' : (nightRestOk ? 'text-[#15803D]' : 'text-[#C2410C]')">
            <template v-if="hasToday">
              {{ nightRestOk ? 'พักเต็มที่' : 'ยังอบอ้าว' }}
            </template>
            <template v-else>—</template>
          </div>
          <div class="text-[10px] font-bold text-[#64766D] mt-1 truncate">
            <template v-if="hasToday && today?.night_relief_hours != null">
              เย็น {{ today.night_relief_hours }} ชม.
            </template>
            <template v-else>22:00–06:00 น.</template>
          </div>
        </div>

        <!-- ร้อนสะสมต่อเนื่อง -->
        <div class="p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E4E8E5]">
          <div class="text-[11px] font-extrabold text-[#4E655B]">ร้อนสะสม</div>
          <div class="text-lg sm:text-2xl font-black text-[#142820] tabular-nums leading-tight mt-1">
            {{ streakDays > 0 ? `${streakDays} วัน` : '0 วัน' }}
          </div>
          <div class="text-[10px] font-bold text-[#64766D] mt-1 truncate">
            {{ streakDays >= 2 ? 'เฝ้าระวังใกล้ชิด' : 'ไม่สะสมต่อเนื่อง' }}
          </div>
        </div>
      </div>
    </div>

    <!-- ส่วนที่ 2: พฤติกรรมแม่วัวจากกล้อง AI (แสดงทั้งเมื่อมีข้อมูลกล้อง และเมื่อยังไม่มีข้อมูล) -->
    <div class="p-4 rounded-2xl bg-[#F4EFE4]/60 border border-[#E2D9C5] space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-[#142820] text-[#F3C68F] flex items-center justify-center shrink-0">
            <v-icon icon="mdi-cctv" size="19" />
          </div>
          <div>
            <h3 class="text-sm font-black text-[#142820] leading-tight">
              พฤติกรรมโคนมจากกล้อง AI (YOLO26m)
            </h3>
            <p class="text-[11px] text-[#5A6B63] font-semibold">
              <template v-if="hasCamera">
                ตรวจพบในภาพ {{ camera.total }} ตัว
                <span v-if="camera.minutes_ago != null">· อัปเดต {{ agoText(camera.minutes_ago) }}</span>
              </template>
              <template v-else>
                ตรวจจับสัดส่วนวัวนอนพักและวัวยืนอัตโนมัติ
              </template>
            </p>
          </div>
        </div>

        <span
          v-if="hasCows"
          class="text-[11px] font-black px-2.5 py-0.5 rounded-full border"
          :class="lyingPct >= 50
            ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'
            : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'">
          {{ lyingPct >= 50 ? 'ส่วนใหญ่นอนพักสบาย' : 'วัวยืนค่อนข้างมาก' }}
        </span>
      </div>

      <!-- กรณีมีข้อมูลกล้องจริงและพบวัวในภาพ -->
      <div v-if="hasCows" class="space-y-1.5">
        <div class="flex justify-between text-xs font-black">
          <span class="text-[#15803D] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
            นอนพัก {{ lyingPct }}%
          </span>
          <span class="text-[#D97706] flex items-center gap-1.5">
            ยืน {{ standingPct }}%
            <span class="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
          </span>
        </div>

        <div class="h-3 w-full rounded-full bg-white overflow-hidden flex p-0.5 gap-0.5 border border-[#E2D9C5]">
          <div
            class="h-full bg-[#16A34A] rounded-l-full transition-all duration-300"
            :style="{ width: `${lyingPct}%` }"></div>
          <div
            class="h-full bg-[#F59E0B] rounded-r-full transition-all duration-300"
            :style="{ width: `${standingPct}%` }"></div>
        </div>
      </div>

      <!-- กล้องส่งภาพมาแต่ไม่พบวัว: สัดส่วน 0% ไม่มีความหมาย จึงไม่สรุปว่าวัวยืนหรือนอน -->
      <div v-else-if="hasCamera" class="text-xs text-[#5A6B63] font-semibold bg-white/80 rounded-xl px-3.5 py-2.5 border border-[#E2D9C5]/80">
        ภาพล่าสุดไม่พบวัวในมุมกล้อง จึงยังบอกสัดส่วนวัวนอนพักและวัวยืนไม่ได้ (ถ้าวัวอยู่ในคอก ให้ตรวจมุมกล้อง)
      </div>

      <!-- กรณีโรงเรือนยังไม่มีข้อมูลภาพล่าสุดจากกล้อง -->
      <div v-else class="text-xs text-[#5A6B63] font-semibold bg-white/80 rounded-xl px-3.5 py-2.5 border border-[#E2D9C5]/80">
        ยังไม่มีข้อมูลภาพล่าสุดจากกล้องในโรงเรือนนี้ (เมื่อกล้องส่งผลวิเคราะห์ ระบบจะแสดง % วัวนอนพักและวัวยืนที่นี่)
      </div>
    </div>
  </section>
</template>

<script setup>
import { useFarmer, agoText } from '~/composables/useFarmer'

const { today, streak, camera } = useFarmer()

const hasToday = computed(() => Boolean(today.value && today.value.data_hours > 0))
const hasCamera = computed(() => Boolean(camera.value && camera.value.total != null && camera.value.lying_pct != null))
// ภาพที่ไม่พบวัวเลยได้ % เป็น 0 ทุกท่า ห้ามนำไปสรุปว่า "วัวยืนค่อนข้างมาก"
const hasCows = computed(() => hasCamera.value && Number(camera.value.total) > 0)

const nightRestOk = computed(() => (today.value?.night_relief_hours ?? 0) >= 3)
const streakDays = computed(() => streak.value?.days || 0)

const lyingPct = computed(() => Math.round(Number(camera.value?.lying_pct || 0)))
const standingPct = computed(() => Math.round(Number(camera.value?.standing_pct ?? (100 - lyingPct.value))))
</script>
