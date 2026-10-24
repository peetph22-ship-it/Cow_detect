<template>
  <div class="space-y-5">
    
    <!-- ส่วนหัว: ประวัติ 7 วันแบบเข้าใจง่าย -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-[#E5E7EB]">
      <div class="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div class="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#1B4332] flex items-center justify-center text-2xl font-bold">
          <v-icon icon="mdi-calendar-week" size="26" />
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-[#15221B] leading-tight">
            ประวัติอากาศย้อนหลัง 7 วัน
          </h1>
          <p class="text-xs sm:text-sm text-[#64748B] mt-0.5">
            ดูว่าแม่วัวสบายดีหรือเจออากาศร้อนในแต่ละวัน
          </p>
        </div>
      </div>

      <!-- สรุปสั้นๆ สำหรับคนแก่เข้าใจง่าย -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <!-- จำนวนวันที่สบายดี -->
        <div class="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
          <div class="text-xs font-bold text-[#15803D] flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-full bg-[#22C55E]"></span>
            วันสบายดี
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#14532D] mt-1 tabular-nums">
            {{ goodDaysCount }} <span class="text-sm font-semibold">วัน</span>
          </div>
        </div>

        <!-- จำนวนวันที่มีอากาศร้อน -->
        <div class="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]">
          <div class="text-xs font-bold text-[#B91C1C] flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
            วันที่มีช่วงร้อนจัด
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#991B1B] mt-1 tabular-nums">
            {{ severeDaysCount }} <span class="text-sm font-semibold">วัน</span>
          </div>
        </div>

        <!-- ความร้อนสะสมติดต่อกัน -->
        <div class="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
          <div class="text-xs font-bold text-[#B45309] flex items-center gap-1">
            <v-icon icon="mdi-fire" size="16" />
            ร้อนสะสม
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#78350F] mt-1 tabular-nums">
            {{ streakDays }} <span class="text-sm font-semibold">วันติด</span>
          </div>
        </div>
      </div>
    </section>

    <!-- รายการการ์ดของแต่ละวัน (ใหญ่ ชัดเจน มีสีเขียว-เหลือง-แดง บ่งบอกทันที) -->
    <div v-if="loadingDays" class="py-12 text-center text-sm font-bold text-[#64748B]">
      <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F] mb-2" size="32" />
      <p>กำลังเปิดข้อมูลย้อนหลัง...</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="d in days"
        :key="d.date"
        class="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border transition-all"
        :class="d.has_data ? (d.severe_hours > 0 ? 'border-[#FECACA]' : (d.stress_hours > 0 ? 'border-[#FDE68A]' : 'border-[#BBF7D0]')) : 'border-[#E5E7EB]'">
        
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <!-- วันที่ -->
            <div class="flex items-center gap-2">
              <span class="text-base sm:text-lg font-bold text-[#15221B]">
                {{ d.is_today ? 'วันนี้' : thaiDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' }) }}
              </span>
              <span v-if="d.is_today" class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#1B4332]">
                วันนี้
              </span>
            </div>

            <!-- สถานะภาษาชาวบ้าน -->
            <div class="mt-1 flex items-center gap-2">
              <span 
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold border"
                :class="statusBadge(d)">
                <span class="w-2 h-2 rounded-full" :class="statusDot(d)"></span>
                {{ statusText(d) }}
              </span>
            </div>

            <!-- คำอธิบายภาษาไทย -->
            <p class="text-xs sm:text-sm text-[#475569] font-medium mt-2 leading-relaxed">
              {{ descriptionText(d) }}
            </p>
          </div>

          <!-- ตัวเลขอุณหภูมิสูงสุด -->
          <div v-if="d.has_data" class="text-right shrink-0 bg-[#F8F9F5] p-3 rounded-2xl border border-[#E5E7EB]">
            <div class="text-[11px] font-bold text-[#64748B]">ร้อนสุด</div>
            <div class="text-xl sm:text-2xl font-black text-[#15221B] tabular-nums leading-none mt-0.5">
              {{ d.max_temp }}<span class="text-sm font-semibold text-[#64748B]">°C</span>
            </div>
            <div class="text-[11px] text-[#64748B] mt-1">
              เย็นสุด {{ d.min_temp }}°C
            </div>
          </div>
        </div>

        <!-- รายละเอียดเพิ่มเติมแบบมินิมอล -->
        <div v-if="d.has_data" class="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-[#475569]">
          <div>
            <span class="text-[#94A3B8] block text-[11px]">ช่วงร้อนของวัน</span>
            <span class="font-bold text-[#15221B]">{{ d.peak_hour != null ? `ช่วง ${d.peak_hour}:00 น.` : '—' }}</span>
          </div>
          <div>
            <span class="text-[#94A3B8] block text-[11px]">ชั่วโมงที่อากาศร้อน</span>
            <span class="font-bold text-[#15221B]">{{ d.stress_hours > 0 ? `${d.stress_hours} ชม.` : 'ไม่มี' }}</span>
          </div>
          <div class="col-span-2 sm:col-span-1">
            <span class="text-[#94A3B8] block text-[11px]">พักสบายตอนกลางคืน</span>
            <span class="font-bold" :class="(d.night_relief_hours ?? 0) >= 3 ? 'text-[#15803D]' : 'text-[#B45309]'">
              {{ (d.night_relief_hours ?? 0) >= 3 ? 'วัวได้พักเต็มที่' : 'กลางคืนยังอบอ้าว' }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { useFarmer, thaiDate } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ประวัติย้อนหลัง 7 วัน | CowCare ฟาร์มโคนม' })

const { request } = useFarmer()
const days = ref([])
const streakDays = ref(0)
const loadingDays = ref(true)

const loadHistory = async () => {
  loadingDays.value = true
  try {
    const res = await request('history')
    days.value = res?.days || []
    streakDays.value = res?.streak?.days || 0
  } catch (err) {
    console.error('Error loading history:', err.message)
  } finally {
    loadingDays.value = false
  }
}

const goodDaysCount = computed(() => 
  days.value.filter(d => d.has_data && (d.stress_hours || 0) === 0).length
)

const severeDaysCount = computed(() => 
  days.value.filter(d => d.has_data && (d.severe_hours || 0) > 0).length
)

const statusBadge = (d) => {
  if (!d.has_data) return 'bg-gray-100 text-gray-500 border-gray-200'
  if (d.severe_hours > 0) return 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
  if (d.stress_hours > 0) return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
  return 'bg-[#F0FDF4] text-[#14532D] border-[#BBF7D0]'
}

const statusDot = (d) => {
  if (!d.has_data) return 'bg-gray-400'
  if (d.severe_hours > 0) return 'bg-[#DC2626]'
  if (d.stress_hours > 0) return 'bg-[#D97706]'
  return 'bg-[#16A34A]'
}

const statusText = (d) => {
  if (!d.has_data) return 'ไม่มีข้อมูล'
  if (d.severe_hours > 0) return `ร้อนจัด ${d.severe_hours} ชั่วโมง`
  if (d.stress_hours > 0) return `เริ่มร้อน ${d.stress_hours} ชั่วโมง`
  return 'สบายดีตลอดวัน'
}

const descriptionText = (d) => {
  if (!d.has_data) return 'กล่องเซ็นเซอร์ไม่ได้เชื่อมต่อในวันนี้'
  if (d.severe_hours > 0) return 'มีช่วงอากาศร้อนจัดมาก แม่วัวอาจเครียดจนกินอาหารน้อยลง'
  if (d.stress_hours > 0) return 'มีช่วงอากาศเริ่มร้อนขึ้น ควรเปิดพัดลมช่วยระบายอากาศ'
  return 'อากาศในคอกร่มรื่น แม่วัวไม่เครียด กินอาหารและพักผ่อนได้ดี'
}

onMounted(loadHistory)
</script>
