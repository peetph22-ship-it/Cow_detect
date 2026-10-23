<template>
  <div>
    <!-- ส่วนบนเขียวเข้ม: สภาพในโรงเรือนตอนนี้ -->
    <section class="bg-[#142820] text-white">
      <div class="max-w-5xl mx-auto px-4 pb-6 pt-2">
        <div class="bg-[#24433a] rounded-[24px] p-5 md:p-6 md:grid md:grid-cols-[1.2fr_1fr] md:gap-8 md:items-center">
          <div>
            <div class="flex items-center justify-between text-xs text-[#9FB5AA]">
              <span>ตอนนี้ในโรงเรือน</span>
              <span v-if="now">อัปเดต {{ agoText(now.minutes_ago) }}</span>
            </div>
            <div class="mt-3">
              <span class="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full" :class="now ? riskStyle(level).solid : 'bg-[#36584d] text-white'">
                <v-icon :icon="statusIcon" size="16" />
                {{ now ? riskLabel(level) : 'ยังไม่มีข้อมูล' }}
              </span>
            </div>
            <p class="text-[15px] text-[#d5e2db] mt-3 leading-relaxed">{{ statusText }}</p>
          </div>

          <div class="mt-5 md:mt-0">
            <div class="flex gap-8 items-end">
              <div>
                <div class="text-[40px] font-bold leading-none tabular-nums">{{ now ? Number(now.temperature_c).toFixed(1) : '—' }}<span class="text-lg text-[#9FB5AA] font-semibold">°C</span></div>
                <div class="text-xs text-[#9FB5AA] mt-1.5">อุณหภูมิ</div>
              </div>
              <div>
                <div class="text-[40px] font-bold leading-none tabular-nums">{{ now ? Math.round(now.humidity_pct) : '—' }}<span class="text-lg text-[#9FB5AA] font-semibold">%</span></div>
                <div class="text-xs text-[#9FB5AA] mt-1.5">ความชื้น</div>
              </div>
            </div>
            <!-- แถบระดับความร้อน: ช่วงสบาย / เฝ้าระวัง / เครียด / วิกฤต -->
            <div class="mt-5">
              <div class="flex gap-1">
                <div v-for="seg in scale" :key="seg.key" class="h-1.5 rounded-full" :style="{ flex: seg.flex, background: seg.key === level ? riskStyle(seg.key).bar : '#36584d' }"></div>
              </div>
              <div class="flex justify-between text-[11px] mt-1.5 text-[#9FB5AA]">
                <span v-for="seg in scale" :key="seg.key" :class="seg.key === level ? 'text-[#F2BD7C] font-semibold' : ''">{{ seg.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="max-w-5xl mx-auto px-4 py-5 md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
      <!-- สิ่งที่ควรทำ -->
      <section class="bg-[#fffdf7] border border-[#EFE6D6] rounded-[22px] px-4 py-2 md:row-span-3 self-start">
        <h2 class="text-xs font-semibold text-[#718078] pt-2 pb-1">สิ่งที่ควรทำตอนนี้</h2>
        <div v-for="(a, i) in actions" :key="a.key" class="flex gap-3 items-start py-3" :class="i < actions.length - 1 ? 'border-b border-[#EFE6D6]' : ''">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="i === 0 && hot ? 'bg-[#D87939] text-white' : 'bg-[#e6f2e7] text-[#3e7d4f]'">
            <v-icon :icon="a.icon" size="20" />
          </div>
          <div>
            <div class="text-[15px] font-semibold leading-snug">{{ a.title }}</div>
            <div class="text-[13px] text-[#718078] mt-0.5">{{ a.detail }}</div>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-2 gap-3">
        <!-- 24 ชม. -->
        <section class="bg-[#e6f2e7] border border-[#cfe5d2] rounded-[22px] p-4">
          <div class="text-xs text-[#3e7d4f] font-semibold">24 ชม. ที่ผ่านมา</div>
          <template v-if="today">
            <div class="mt-1 tabular-nums"><span class="text-[26px] font-bold">{{ Math.round(today.stress_hours) }}</span> <span class="text-xs text-[#3e7d4f]">ชม. เครียด</span></div>
            <div class="text-xs text-[#4e6b59] mt-1">สูงสุด {{ today.max_temp }}°C</div>
          </template>
          <div v-else class="text-sm text-[#4e6b59] mt-2">ยังไม่มีข้อมูล</div>
        </section>
        <!-- พรุ่งนี้ -->
        <section class="rounded-[22px] p-4" :class="tomorrow ? riskStyle(tomorrow.risk_level).solid : 'bg-[#36584d] text-white'">
          <div class="text-xs font-semibold opacity-90">พรุ่งนี้</div>
          <template v-if="tomorrow">
            <div class="text-[17px] font-bold mt-1 flex items-center gap-1.5"><v-icon :icon="tomorrow.risk_level === 'normal' ? 'mdi-weather-partly-cloudy' : 'mdi-white-balance-sunny'" size="18" />{{ riskShort(tomorrow.risk_level) }}</div>
            <div class="text-xs opacity-90 mt-1">{{ tomorrow.risk_level === 'normal' ? 'อากาศสบาย' : 'เตรียมพัดลมและน้ำ' }}</div>
          </template>
          <div v-else class="text-xs opacity-90 mt-2">{{ me?.forecast?.insufficient_data ? 'ข้อมูลยังไม่พอคาดการณ์' : 'ยังไม่มีคาดการณ์' }}</div>
        </section>
      </div>

      <!-- กล้อง -->
      <section v-if="camera" class="bg-[#fffdf7] border border-[#EFE6D6] rounded-[22px] p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-[#142820] text-[#F2BD7C] flex items-center justify-center shrink-0"><v-icon icon="mdi-cctv" size="20" /></div>
        <div class="flex-1 min-w-0">
          <div class="text-[15px] font-semibold">
            <template v-if="camera.total > 0">เห็นวัว {{ camera.total }} ตัว · นอนพัก {{ Math.round(camera.lying_pct ?? 0) }}%</template>
            <template v-else>ไม่เห็นวัวในภาพล่าสุด</template>
          </div>
          <div class="text-xs mt-0.5" :class="camera.status === 'online' ? 'text-[#718078]' : 'text-[#a4521c] font-semibold'">
            {{ camera.status === 'online' ? `ภาพจากกล้อง ${agoText(camera.minutes_ago)}` : `กล้องไม่ได้ส่งภาพ ${agoText(camera.minutes_ago)}` }}
          </div>
        </div>
      </section>

      <!-- รายละเอียด -->
      <section class="bg-[#fffdf7] border border-[#EFE6D6] rounded-[22px] overflow-hidden">
        <button type="button" @click="showDetails = !showDetails" class="w-full px-4 py-3.5 flex items-center justify-between text-sm font-semibold cursor-pointer">
          <span>รายละเอียด</span>
          <v-icon :icon="showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" class="text-[#718078]" />
        </button>
        <div v-if="showDetails" class="px-4 pb-4 text-[13px] text-[#4e6057] space-y-1.5 border-t border-[#EFE6D6] pt-3">
          <div class="flex justify-between gap-3"><span>ดัชนีความร้อนชื้น (THI)</span><span class="font-semibold text-[#142820] tabular-nums">{{ now?.thi ?? '—' }}</span></div>
          <div class="flex justify-between gap-3"><span>THI เฉลี่ย 24 ชม.</span><span class="tabular-nums">{{ today?.avg_thi ?? '—' }}</span></div>
          <div class="flex justify-between gap-3"><span>เกณฑ์ เฝ้าระวัง / เครียด / วิกฤต</span><span class="tabular-nums">{{ thresholds.mild }} / {{ thresholds.moderate }} / {{ thresholds.severe }}</span></div>
          <div class="flex justify-between gap-3"><span>เกณฑ์ที่ใช้</span><span class="text-right">{{ PROFILE_LABELS[farm?.profile] }}</span></div>
          <div v-if="camera?.cci != null" class="flex justify-between gap-3"><span>ดัชนีความสบายจากกล้อง</span><span class="tabular-nums">{{ camera.cci }}%</span></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useFarmer, riskStyle, riskLabel, riskShort, agoText } from '~/composables/useFarmer'
import { PROFILE_LABELS } from '~/utils/heatStress'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'ตอนนี้ | CowCare AI' })

const { me, farm, now, thresholds } = useFarmer()
const showDetails = ref(false)

const level = computed(() => now.value?.risk_level || null)
const hot = computed(() => level.value === 'moderate' || level.value === 'severe')
const today = computed(() => me.value?.today || null)
const camera = computed(() => me.value?.camera || null)
const tomorrow = computed(() => me.value?.forecast?.days?.find(d => d.horizon_days === 1) || null)

// ความกว้างแต่ละช่วงตามเกณฑ์ของฟาร์ม (ช่วงเครียดกว้างสุด เพราะเป็นช่วงที่พบบ่อยในโรงเรือนไทย)
const scale = computed(() => {
  const t = thresholds.value
  return [
    { key: 'normal', label: 'สบาย', flex: 3 },
    { key: 'mild', label: 'เฝ้าระวัง', flex: Math.max(1, t.moderate - t.mild) },
    { key: 'moderate', label: 'เครียด', flex: Math.max(1, t.severe - t.moderate) / 2 },
    { key: 'severe', label: 'วิกฤต', flex: 2 }
  ]
})

const statusIcon = computed(() => ({ severe: 'mdi-fire', moderate: 'mdi-thermometer-alert', mild: 'mdi-weather-sunny' }[level.value] || 'mdi-check-circle-outline'))

const statusText = computed(() => ({
  severe: 'แม่โคเสี่ยงหอบและหยุดกินอาหาร ช่วยระบายความร้อนทันที',
  moderate: 'น้ำนมอาจเริ่มลด ควรเปิดพัดลมช่วยระบายความร้อน',
  mild: 'อากาศเริ่มอบอ้าว เปิดพัดลมให้อากาศถ่ายเท',
  normal: 'อากาศในโรงเรือนเหมาะกับแม่โค'
}[level.value] || 'ตรวจว่ากล่องเซ็นเซอร์เสียบไฟและต่ออินเทอร์เน็ตอยู่'))

const actions = computed(() => {
  const lvl = level.value
  const hum = now.value?.humidity_pct
  const list = [{
    key: 'fan', icon: 'mdi-fan',
    title: hot.value ? 'เปิดพัดลมเต็มกำลังทุกตัว' : lvl === 'mild' ? 'เปิดพัดลมระบายอากาศ' : 'เปิดพัดลมตามปกติ',
    detail: 'ลมช่วยไล่ความร้อนและความชื้นออกจากตัวแม่โค'
  }]
  if (hum != null && (hot.value || lvl === 'mild')) {
    list.push(hum >= 75
      ? { key: 'mist', icon: 'mdi-water-off', title: 'ยังไม่ควรพ่นหมอกน้ำ', detail: `ความชื้นสูง (${Math.round(hum)}%) ใช้พัดลมแทน` }
      : { key: 'mist', icon: 'mdi-weather-fog', title: 'พ่นหมอกสลับกับเปิดพัดลมได้', detail: 'อากาศไม่ชื้นเกินไป ละอองน้ำช่วยลดความร้อน' })
  }
  list.push({
    key: 'water', icon: 'mdi-cup-water',
    title: hot.value ? 'เติมน้ำให้เต็มราง ตรวจบ่อยขึ้น' : 'ตรวจน้ำในรางให้สะอาดและมีตลอด',
    detail: hot.value ? 'แม่โคที่ร้อนจะกินน้ำมากขึ้นมาก' : 'แม่โคต้องมีน้ำสะอาดกินได้ตลอดเวลา'
  })
  if (lvl === 'severe') {
    list.push({ key: 'vet', icon: 'mdi-stethoscope', title: 'สังเกตแม่โคที่หอบหนักหรือไม่ลุก', detail: 'ถ้าพบอาการผิดปกติ ควรให้สัตวแพทย์ตรวจ' })
  }
  return list
})
</script>
