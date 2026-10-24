<template>
  <div class="space-y-5">
    
    <!-- ส่วนหัว: สรุปประวัติ 7 วันแบบเข้าใจง่าย สไตล์ทันสมัย -->
    <section class="bg-white rounded-3xl p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#E5E9E5]">
      <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div class="w-12 h-12 rounded-2xl bg-[#EBF6EE] text-[#1B4332] flex items-center justify-center text-2xl font-bold border border-[#CDE8D5]">
          <v-icon icon="mdi-calendar-week" size="26" />
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-black text-[#15221B] leading-tight">
            ประวัติอากาศย้อนหลัง 7 วัน
          </h1>
          <p class="text-xs sm:text-sm text-[#64748B] mt-0.5">
            ตรวจดูว่าแม่วัวสบายดีหรือเจออากาศร้อนในแต่ละวันที่ผ่านมา
          </p>
        </div>
      </div>

      <!-- สรุปตัวเลขสำคัญ 3 ช่อง (เข้าใจทันทีใน 1 วินาที) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <!-- จำนวนวันที่สบายดี -->
        <div class="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
          <div class="text-xs font-bold text-[#15803D] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#22C55E]"></span>
            วันสบายดี
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#14532D] mt-1 tabular-nums">
            {{ goodDaysCount }} <span class="text-sm font-bold">วัน</span>
          </div>
        </div>

        <!-- จำนวนวันที่มีอากาศร้อนจัด -->
        <div class="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]">
          <div class="text-xs font-bold text-[#B91C1C] flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
            วันที่มีช่วงร้อนจัด
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#991B1B] mt-1 tabular-nums">
            {{ severeDaysCount }} <span class="text-sm font-bold">วัน</span>
          </div>
        </div>

        <!-- ร้อนสะสมติดต่อกัน -->
        <div class="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
          <div class="text-xs font-bold text-[#B45309] flex items-center gap-1.5">
            <v-icon icon="mdi-fire" size="16" />
            ร้อนสะสม
          </div>
          <div class="text-2xl sm:text-3xl font-black text-[#78350F] mt-1 tabular-nums">
            {{ streakDays }} <span class="text-sm font-bold">วันติด</span>
          </div>
        </div>
      </div>
    </section>

    <!-- กำลังโหลดข้อมูล -->
    <div v-if="loadingDays" class="py-16 text-center text-sm font-bold text-[#64748B] space-y-2">
      <v-icon icon="mdi-loading" class="animate-spin text-[#2D6A4F]" size="36" />
      <p>กำลังเปิดข้อมูลสภาพอากาศย้อนหลัง...</p>
    </div>

    <!-- กรณีไม่มีข้อมูลจริงในระบบ -->
    <div v-else-if="!days.length" class="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgba(15,41,30,0.04)] border border-[#E5ECE7] text-center space-y-3">
      <div class="w-16 h-16 rounded-3xl bg-[#F8F9F6] text-[#64748B] flex items-center justify-center mx-auto border border-gray-200">
        <v-icon icon="mdi-calendar-blank" size="36" />
      </div>
      <h2 class="text-lg sm:text-xl font-black text-[#15221B]">ยังไม่พบประวัติสภาพอากาศย้อนหลัง</h2>
      <p class="text-xs sm:text-sm text-[#64748B] max-w-sm mx-auto leading-relaxed">
        ระบบจะรวบรวมประวัติรายวันอัตโนมัติเมื่อกล่องเซ็นเซอร์ในโรงเรือนส่งข้อมูลเข้ามาครับ
      </p>
    </div>

    <!-- รายการการ์ดของแต่ละวัน (ข้อมูลจริงจากเซิร์ฟเวอร์) -->
    <div v-else class="space-y-3">
      <div
        v-for="d in days"
        :key="d.date"
        class="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border transition-all"
        :class="dayCardBorder(d)">
        
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <!-- วันที่ -->
            <div class="flex items-center gap-2">
              <span class="text-base sm:text-lg font-black text-[#15221B]">
                {{ d.is_today ? 'วันนี้' : thaiDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' }) }}
              </span>
              <span v-if="d.is_today" class="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#EBF6EE] text-[#1B4332] border border-[#CDE8D5]">
                วันนี้
              </span>
            </div>

            <!-- ป้ายสถานะแบบสีชัดเจน -->
            <div class="mt-2 flex items-center gap-2">
              <span 
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold border"
                :class="statusBadge(d)">
                <span class="w-2 h-2 rounded-full" :class="statusDot(d)"></span>
                {{ statusText(d) }}
              </span>
            </div>

            <!-- คำอธิบายภาษาไทยเข้าใจง่าย -->
            <p class="text-xs sm:text-sm text-[#475569] font-semibold mt-2.5 leading-relaxed">
              {{ descriptionText(d) }}
            </p>
          </div>

          <!-- กล่องตัวเลขอุณหภูมิสูงสุดของวัน -->
          <div v-if="d.has_data" class="text-right shrink-0 bg-[#F8F9F6] p-3 sm:p-3.5 rounded-2xl border border-[#E9EFEA]">
            <div class="text-[11px] font-bold text-[#64748B]">ร้อนสูงสุด</div>
            <div class="text-2xl sm:text-3xl font-black text-[#143225] tabular-nums mt-0.5">
              {{ d.max_temp ? Number(d.max_temp).toFixed(1) : '—' }}<span class="text-sm font-bold text-[#64748B]">°C</span>
            </div>
            <div class="text-[10px] font-medium text-[#64748B] mt-0.5">
              ความชื้นเฉลี่ย {{ d.avg_humidity_pct ? Math.round(d.avg_humidity_pct) : '—' }}%
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFarmer, thaiDate } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ประวัติย้อนหลัง 7 วัน | CowCare AI' })

const { request } = useFarmer()

const loadingDays = ref(true)
const days = ref([])
const streakDays = ref(0)

const goodDaysCount = computed(() => days.value.filter(d => d.has_data && (d.severe_hours || 0) === 0 && (d.stress_hours || 0) === 0).length)
const severeDaysCount = computed(() => days.value.filter(d => (d.severe_hours || 0) > 0).length)

const dayCardBorder = (d) => {
  if (!d.has_data) return 'border-[#E5E9E5]'
  if ((d.severe_hours || 0) > 0) return 'border-[#FECACA]'
  if ((d.stress_hours || 0) > 0) return 'border-[#FDE68A]'
  return 'border-[#BBF7D0]'
}

const statusBadge = (d) => {
  if (!d.has_data) return 'bg-gray-100 text-gray-600 border-gray-200'
  if ((d.severe_hours || 0) > 0) return 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
  if ((d.stress_hours || 0) > 0) return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
  return 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
}

const statusDot = (d) => {
  if (!d.has_data) return 'bg-gray-400'
  if ((d.severe_hours || 0) > 0) return 'bg-[#DC2626]'
  if ((d.stress_hours || 0) > 0) return 'bg-[#D97706]'
  return 'bg-[#22C55E]'
}

const statusText = (d) => {
  if (!d.has_data) return 'ไม่มีข้อมูลเซ็นเซอร์'
  if ((d.severe_hours || 0) > 0) return `มีช่วงร้อนจัด (${d.severe_hours} ชั่วโมง)`
  if ((d.stress_hours || 0) > 0) return `มีช่วงเริ่มร้อน (${d.stress_hours} ชั่วโมง)`
  return 'อากาศสบายดีทั้งวัน'
}

const descriptionText = (d) => {
  if (!d.has_data) return 'ไม่มีข้อมูลส่งมาจากโรงเรือนในวันนี้'
  if ((d.severe_hours || 0) > 0) return 'มีช่วงบ่ายที่อุณหภูมิและความชื้นสูงมาก แม่วัวอาจมีความเครียดสะสม ควรตรวจดูน้ำหนักและปริมาณน้ำนม'
  if ((d.stress_hours || 0) > 0) return 'มีช่วงอากาศอบอ้าวชั่วคราว การเปิดพัดลมช่วยระบายอากาศได้ดี'
  return 'สภาพอากาศในคอกเหมาะสมดี แม่วัวเคี้ยวเอื้องสบาย อารมณ์ดี ให้น้ำนมได้เต็มที่'
}

const loadHistory = async () => {
  loadingDays.value = true
  try {
    const res = await request('history', { days: 7 })
    if (res?.days && Array.isArray(res.days)) {
      days.value = res.days
      streakDays.value = res.streak_days || 0
    } else {
      days.value = []
    }
  } catch (e) {
    days.value = []
  } finally {
    loadingDays.value = false
  }
}

onMounted(loadHistory)
</script>