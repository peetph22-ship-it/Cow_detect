<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">
    
    <!-- 🟢 1. Header Command Area -->
    <AdminHeaderArea 
      :stats="dashboardStats" 
      :is-loading="isLoading" 
      :last-updated="lastUpdatedStr"
      @refresh="fetchStats(true)" 
    />

    <!-- 🟢 2. System Provisioning Notice (Collapsible Banner) -->
    <AdminProvisioningNotice />

    <!-- 🟢 3. Bento KPI Row (4 Cards) -->
    <AdminMetricsCards 
      :stats="dashboardStats" 
      :is-loading="isLoading" 
    />

    <!-- 🟢 4. Analytics & AI Forecast Bento Row (2/3 + 1/3) -->
    <AdminDashboardCharts 
      :stats="dashboardStats" 
      :is-loading="isLoading" 
    />

    <!-- 🟢 5. Operations & System Health Row (2/3 + 1/3) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-300">
      <AdminAlertsTable 
        :alerts="dashboardStats?.alerts?.items || []" 
        :is-loading="isLoading" 
      />
      
      <AdminSystemDiagnostics 
        :diagnostics="dashboardStats?.diagnostics" 
        :is-loading="isLoading" 
      />
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '../../API/baseAPI'
import { calcThi, getRiskLevel, RISK_LABELS_TH } from '~/utils/heatStress'

import AdminHeaderArea from '../../components/Admin/dashboard/HeaderArea.vue'
import AdminProvisioningNotice from '../../components/Admin/dashboard/ProvisioningNotice.vue'
import AdminMetricsCards from '../../components/Admin/dashboard/MetricsCards.vue'
import AdminDashboardCharts from '../../components/Admin/dashboard/DashboardCharts.vue'
import AdminAlertsTable from '../../components/Admin/dashboard/AlertsTable.vue'
import AdminSystemDiagnostics from '../../components/Admin/dashboard/SystemDiagnostics.vue'

definePageMeta({
  layout: 'admin'
})

// States
const dashboardStats = ref(null)
const isLoading = ref(false)
const lastUpdatedStr = ref('')
let pollTimer = null

// อ่าน base ตอน setup: ใน setInterval เรียก useRuntimeConfig ไม่ได้ (จะตกไปใช้ URL production)
const ADMIN_API = `${getNodeApiBase()}/Admin`
const token = process.client ? localStorage.getItem('token') : null

// Format current time
const updateTimestamp = () => {
  const now = new Date()
  lastUpdatedStr.value = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + ' น.'
}

// Fetch Real Aggregated Dashboard Stats from Backend
const fetchStats = async (showLoading = false) => {
  if (showLoading) isLoading.value = true
  try {
    const res = await axios.get(`${ADMIN_API}/farms/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data && res.data.success && res.data.stats) {
      dashboardStats.value = res.data.stats
      updateTimestamp()
    }
  } catch (err) {
    console.warn('[Fetch Dashboard Stats Error, falling back to /farms/all]:', err.message)
    // Fallback: If dashboard-stats fails or returns 500, calculate from /farms/all
    try {
      const fallbackRes = await axios.get(`${ADMIN_API}/farms/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (fallbackRes.data && fallbackRes.data.rows) {
        const rows = fallbackRes.data.rows
        // คำนวณจากข้อมูลจริงเท่านั้น ค่าที่ไม่รู้ให้เป็น null (ไม่เติมค่าสมมติ)
        const withThi = rows.map(r => ({ ...r, _thi: calcThi(r.temperature_c, r.humidity_pct) ?? (r.thi != null ? parseFloat(r.thi) : null) }))
        const levels = withThi.map(r => getRiskLevel(r._thi, r.hf_profile)).filter(Boolean)
        const thiVals = withThi.map(r => r._thi).filter(v => v != null)
        const avgT = thiVals.length ? +(thiVals.reduce((a, b) => a + b, 0) / thiVals.length).toFixed(1) : null
        const avgLevel = getRiskLevel(avgT, 'default')
        const count = (lvl) => levels.filter(l => l === lvl).length

        dashboardStats.value = {
          farms: { total: rows.length, growth: '' },
          devices: { total: null, online: null, offline: null, online_rate: null },
          thi: {
            average: avgT,
            temp_average: null,
            hum_average: null,
            status: avgLevel ? RISK_LABELS_TH[avgLevel] : 'ยังไม่มีข้อมูล',
            status_level: avgLevel
          },
          alerts: { active_count: levels.filter(l => l !== 'normal').length, pending_ack: null, items: [] },
          distribution: {
            normal: count('normal'),
            mild: count('mild'),
            moderate: count('moderate'),
            severe: count('severe')
          },
          diagnostics: { total_readings: null, completeness_pct: null, missing_rate_pct: null }
        }
        updateTimestamp()
      }
    } catch (fbErr) {
      console.error('[Dashboard Fallback Error]:', fbErr)
    }
  } finally {
    if (showLoading) isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchStats(true)
  // Background polling every 12 seconds
  pollTimer = setInterval(() => {
    fetchStats(false)
  }, 12000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
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
