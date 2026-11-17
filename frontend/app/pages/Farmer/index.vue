<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- 1. ตอนนี้เป็นยังไง: สถานะคอก + คำแนะนำคลายร้อนตามความชื้น -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
      <div class="lg:col-span-7">
        <FarmerHeroStatusCard />
      </div>
      <div class="lg:col-span-5">
        <FarmerCoolingAdviceCard />
      </div>
    </div>

    <!-- 2. วันนี้ร้อนช่วงไหน: กราฟ THI รายชั่วโมง 24 ชม. -->
    <FarmerThi24hChart />

    <!-- 3. อีก 3 วันจะเป็นยังไง: กราฟ 7 วันจริงต่อพยากรณ์ + การ์ดรายวัน -->
    <FarmerForecastStrip />

    <!-- 4. ต้องทำอะไร + กล้อง AI -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
      <div class="lg:col-span-6">
        <FarmerActionChecklist />
      </div>
      <div class="lg:col-span-6">
        <FarmerBarnSnapshotCard />
      </div>
    </div>

    <!-- 5. สัปดาห์นี้เป็นยังไง: ชั่วโมงร้อนรายวัน -->
    <FarmerWeekHeatChart />

    <FarmerVetCallButton />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'farmer' })
useHead({ title: 'แดชบอร์ดดูแลโคนมประจำวัน | CowCare ฟาร์มโคนม' })
</script>
