<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">
    <AdminHeaderArea />

    <AdminProvisioningNotice />

    <AdminMetricsCards />

    <AdminDashboardCharts />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-300">
      <AdminAlertsTable />
      <AdminSystemDiagnostics />
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'admin'
})
</script>

<style scoped>
@keyframes shine {
  100% { transform: translateX(100%); }
}
.animate-shine {
  animation: shine 2s ease-in-out infinite;
}
</style>
