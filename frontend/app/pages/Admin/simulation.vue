<template>
  <div class="space-y-6 pb-12 font-sans">
    <div class="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 md:p-8 border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)]">
      <div class="flex items-center gap-3.5">
        <div class="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-500/25 flex items-center justify-center shrink-0 shadow-xs">
          <v-icon icon="mdi-flask" size="30" />
        </div>
        <div>
          <h1 class="text-2xl md:text-3xl font-black text-[#24433a] tracking-tight">
            สภาพแวดล้อมจำลอง (Simulation)
          </h1>
          <p class="text-xs md:text-sm text-[#718078] mt-1 font-medium">
            อัปโหลดวิดีโอโรงเรือนเพื่อทดสอบโมเดล YOLO ตรวจจับพฤติกรรมโค (นอน ยืน กิน ดื่ม) ในเบราว์เซอร์ ผลไม่ถูกบันทึกลงระบบ
          </p>
        </div>
      </div>
    </div>

    <VideoDetectionPanel />
  </div>
</template>

<script setup>
import VideoDetectionPanel from '~/components/Admin/simulation/VideoDetectionPanel.vue'

definePageMeta({ layout: 'admin', alias: ['/Admin/simulation', '/Admin/simulator'] })

useHead({ title: 'สภาพแวดล้อมจำลอง (Simulation) | CowCare AI' })
</script>
