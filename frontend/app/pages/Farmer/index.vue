<template>
  <div class="space-y-5 sm:space-y-6">
    <!-- แถวที่ 1 (Bento Row 1): การ์ดสถานะคอกตอนนี้ (7 คอลัมน์) + คำแนะนำคลายร้อนและช่วงเวลาสำคัญ (5 คอลัมน์) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
      <div class="lg:col-span-7">
        <FarmerHeroStatusCard />
      </div>
      <div class="lg:col-span-5">
        <FarmerCoolingAdviceCard />
      </div>
    </div>

    <!-- แถวที่ 2 (Bento Row 2): คำแนะนำการดูแลแม่วัวในคอก (6 คอลัมน์) + สรุป 24 ชม. และกล้อง AI (6 คอลัมน์) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
      <div class="lg:col-span-6">
        <FarmerActionChecklist />
      </div>
      <div class="lg:col-span-6">
        <FarmerBarnSnapshotCard />
      </div>
    </div>

    <!-- แถวที่ 3 (Bento Row 3): พยากรณ์ล่วงหน้า 3 วัน + ปุ่มโทรด่วนหาสัตวแพทย์ -->
    <FarmerForecastStrip />
    <FarmerVetCallButton />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'farmer' })
useHead({ title: 'แดชบอร์ดดูแลโคนมประจำวัน | CowCare ฟาร์มโคนม' })
</script>
