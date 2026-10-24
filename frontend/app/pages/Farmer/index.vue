<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- 1. การ์ดหลัก: สถานะความร้อนในคอกตอนนี้ อุณหภูมิ ความชื้น มาตรวัด THI และปุ่มฟังเสียง -->
    <FarmerHeroStatusCard @play-voice="playVoice" />

    <!-- 2. คำแนะนำวิธีคลายร้อนตามความชื้นจริง (พ่นหมอก vs ฉีดน้ำตัววัว) & ช่วงเวลาร้อนสุด/เย็นสุดของคอก -->
    <FarmerCoolingAdviceCard />

    <!-- 3. เช็กลิสต์ดูแลแม่วัวประจำวัน 4 ข้อ (กดติ๊กง่าย ซิงค์กับระบบ) -->
    <FarmerActionChecklist />

    <!-- 4. สรุปภาพรวมวันนี้ (ชั่วโมงร้อน / พักกลางคืน / สะสมกี่วัน) & พฤติกรรมวัวจากกล้อง AI -->
    <FarmerBarnSnapshotCard />

    <!-- 5. พยากรณ์อากาศในคอกล่วงหน้า 3 วัน -->
    <FarmerForecastStrip />

    <!-- 6. ปุ่มโทรด่วนหาสัตวแพทย์ประจำฟาร์ม (แสดงเฉพาะเมื่อมีเบอร์จริงในระบบ) -->
    <FarmerVetCallButton />
  </div>
</template>

<script setup>
import { useFarmer } from '~/composables/useFarmer'

definePageMeta({ layout: 'farmer' })
useHead({ title: 'สภาพในคอกตอนนี้ | CowCare ฟาร์มโคนม' })

const {
  now,
  senior,
  cooling,
  isSpeaking,
  speakThai,
  stopSpeech
} = useFarmer()

const playVoice = () => {
  if (isSpeaking.value) {
    stopSpeech()
    return
  }
  const baseText = senior.value?.voice_text ||
    `สภาพอากาศในคอกวัวตอนนี้ อุณหภูมิ ${now.value ? Number(now.value.temperature_c).toFixed(1) : '31'} องศาเซลเซียส ความชื้น ${now.value ? Math.round(now.value.humidity_pct) : '70'} เปอร์เซ็นต์`
  const coolingNote = cooling.value?.short ? ` คำแนะนำการคลายร้อนคือ ${cooling.value.short}` : ''
  speakThai(`${baseText}${coolingNote}`)
}
</script>
