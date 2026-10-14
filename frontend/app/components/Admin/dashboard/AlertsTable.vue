<template>
  <div class="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[32px] border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] overflow-hidden flex flex-col justify-between">
    
    <!-- Header -->
    <div class="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24433a]/5">
      <div>
        <h3 class="font-black text-[#24433a] text-lg md:text-xl flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-[10px] bg-[#d87939]/10 text-[#d87939] flex items-center justify-center text-xs">
            <v-icon icon="mdi-shield-alert-outline" size="18" />
          </span>
          <span>ระบบบริหารจัดการเหตุการณ์แจ้งเตือน (Alert Workflow)</span>
        </h3>
        <p class="text-[13px] text-[#718078] mt-1 font-medium">
          จัดการกระบวนการตอบสนองต่อสภาวะวิกฤตความร้อน (New &rarr; Acknowledged &rarr; Resolved)
        </p>
      </div>

      <NuxtLink 
        to="/Admin/farms" 
        class="text-xs font-bold text-[#d87939] hover:text-[#b85b20] transition-colors flex items-center gap-1 self-start sm:self-auto">
        <span>ดูฟาร์มทั้งหมด</span>
        <v-icon icon="mdi-arrow-right" size="14" />
      </NuxtLink>
    </div>

    <!-- Alert Items Table Container -->
    <div class="overflow-x-auto flex-1 p-2">
      <table class="w-full text-left whitespace-nowrap text-xs">
        <thead>
          <tr class="text-[#718078] font-black uppercase text-[11px] tracking-wider border-b border-[#f0f4f2]">
            <th class="px-6 py-4">ฟาร์ม / อุปกรณ์</th>
            <th class="px-6 py-4">สภาวะความร้อน (Thermal Issue)</th>
            <th class="px-6 py-4">ขั้นตอนรับมือ (Workflow)</th>
            <th class="px-6 py-4 text-right">เวลาตรวจพบ</th>
            <th class="px-4 py-4 text-center">ดูฟาร์ม</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#f0f4f2]">
          <tr 
            v-for="(alert, index) in localAlerts" 
            :key="alert.id || index"
            class="hover:bg-white/90 transition-colors group"
            :class="{ 'bg-rose-50/20': alert.status === 'new' && alert.level === 'critical' }">
            
            <!-- Farm Details -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-3.5">
                <div 
                  class="w-10 h-10 rounded-[12px] flex items-center justify-center font-black text-xs border shadow-sm flex-shrink-0"
                  :class="alert.level === 'critical' 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : alert.level === 'moderate' 
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'">
                  {{ alert.farm_code || 'F0' + (index + 1) }}
                </div>
                <div>
                  <p class="font-black text-[#24433a] text-[13.5px]">
                    {{ alert.name_farms }}
                  </p>
                  <p class="text-[11.5px] font-medium text-[#718078] mt-0.5 font-mono">
                    Node: {{ alert.serial_no }}
                  </p>
                </div>
              </div>
            </td>

            <!-- Issue Level Badge -->
            <td class="px-6 py-4">
              <span 
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-[11px] font-bold border"
                :class="getIssueBadgeClass(alert.level)">
                <span class="w-1.5 h-1.5 rounded-full" :class="getIssueDotClass(alert.level)"></span>
                <span>{{ alert.level_label }}</span>
              </span>
            </td>

            <!-- Interactive Workflow Status Button -->
            <td class="px-6 py-4">
              <!-- Case: New -->
              <button 
                v-if="alert.status === 'new'"
                type="button"
                @click="transitionAlert(alert, 'acknowledged')"
                title="คลิกเพื่อบันทึกว่ารับทราบเหตุการณ์แล้ว"
                class="px-3.5 py-1.5 rounded-full text-[11px] font-black bg-rose-500 hover:bg-rose-600 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <span>ใหม่ (คลิกรับทราบ)</span>
              </button>

              <!-- Case: Acknowledged -->
              <button 
                v-else-if="alert.status === 'acknowledged'"
                type="button"
                @click="transitionAlert(alert, 'resolved')"
                title="คลิกเมื่อดำเนินการแก้ไขเรียบร้อยแล้ว"
                class="px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 flex items-center gap-1.5 transition-all cursor-pointer">
                <v-icon icon="mdi-account-check-outline" size="14" />
                <span>รับทราบแล้ว (คลิกปิดงาน)</span>
              </button>

              <!-- Case: Resolved -->
              <span 
                v-else
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <v-icon icon="mdi-check-circle-outline" size="14" class="text-emerald-600" />
                <span>แก้ไขแล้ว (Resolved)</span>
              </span>
            </td>

            <!-- Time Detected -->
            <td class="px-6 py-4 text-right text-[#718078] text-[12px] font-bold">
              {{ formatAlertTime(alert.recorded_at) }}
            </td>

            <!-- View Farm Link -->
            <td class="px-4 py-4 text-center">
              <NuxtLink 
                :to="'/Admin/farm_detail-' + alert.id"
                title="ดูรายละเอียดฟาร์มนี้"
                class="w-8 h-8 rounded-[10px] bg-white border border-[#e5ece9] hover:border-[#24433a]/30 text-[#24433a] hover:bg-[#edf3ed] inline-flex items-center justify-center transition-all shadow-sm">
                <v-icon icon="mdi-chevron-right" size="18" />
              </NuxtLink>
            </td>

          </tr>

          <!-- Empty State -->
          <tr v-if="localAlerts.length === 0">
            <td colspan="5" class="py-12 text-center text-[#718078]">
              <v-icon icon="mdi-shield-check" size="36" class="text-emerald-500 block mx-auto mb-2" />
              <p class="font-bold text-[14px] text-[#24433a]">ทุกฟาร์มในระบบอยู่ในสภาวะปกติ</p>
              <p class="text-xs text-[#718078] mt-0.5">ไม่มีรายการแจ้งเตือนสภาวะความร้อนวิกฤตที่ค้างอยู่</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer Note -->
    <div class="px-8 py-3 bg-[#fbfdfc] border-t border-[#f0f4f2] flex items-center justify-between text-[11px] text-[#718078]">
      <span>* การกดเปลี่ยนสถานะจะบันทึก Audit Log เข้าสู่ระบบ AI ประจำฟาร์มโดยอัตโนมัติ</span>
      <span class="font-bold text-[#24433a]">ทั้งหมด {{ localAlerts.length }} รายการ</span>
    </div>

  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  alerts: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Local reactive array to allow instant interactive transition
const localAlerts = ref([])

watch(
  () => props.alerts,
  (newAlerts) => {
    if (newAlerts && newAlerts.length > 0) {
      localAlerts.value = JSON.parse(JSON.stringify(newAlerts))
    } else {
      localAlerts.value = []
    }
  },
  { immediate: true }
)

// Workflow transition trigger
const transitionAlert = (alert, nextStatus) => {
  alert.status = nextStatus
}

// Styling Helpers
const getIssueBadgeClass = (level) => {
  if (level === 'critical') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (level === 'moderate') return 'bg-orange-50 text-orange-700 border-orange-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

const getIssueDotClass = (level) => {
  if (level === 'critical') return 'bg-rose-500'
  if (level === 'moderate') return 'bg-orange-500'
  return 'bg-amber-500'
}

const formatAlertTime = (dateStr) => {
  if (!dateStr) return 'เมื่อสักครู่'
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
  } catch {
    return 'เมื่อสักครู่'
  }
}
</script>
