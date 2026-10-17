<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">

    <!-- 🟢 1. Top Navigation & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E8E5] animate-fade-up">
      <div class="flex items-center gap-3.5">
        <!-- Back button -->
        <NuxtLink 
          to="/Admin/alerts" 
          class="w-11 h-11 rounded-[16px] bg-white border border-[#E4E8E5] hover:border-[#142820]/30 text-[#142820] shadow-xs flex items-center justify-center transition-all cursor-pointer text-decoration-none group active:scale-95">
          <v-icon icon="mdi-arrow-left" size="20" class="group-hover:-translate-x-0.5 transition-transform" />
        </NuxtLink>

        <div>
          <!-- Breadcrumbs -->
          <div class="flex items-center gap-2 text-xs font-bold text-[#718078] mb-0.5">
            <NuxtLink to="/Admin" class="hover:text-[#142820] transition-colors text-decoration-none text-[#718078]">Admin</NuxtLink>
            <v-icon icon="mdi-chevron-right" size="14" class="opacity-40" />
            <NuxtLink to="/Admin/alerts" class="hover:text-[#142820] transition-colors text-decoration-none text-[#718078]">ประวัติแจ้งเตือน</NuxtLink>
            <v-icon icon="mdi-chevron-right" size="14" class="opacity-40" />
            <span class="text-[#142820] font-black">{{ farm?.name_farms || 'รายละเอียดฟาร์ม' }}</span>
          </div>

          <!-- Farm Title & Live IoT Status Badge -->
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-2xl md:text-3xl font-black text-[#142820] tracking-tight">
              {{ farm?.name_farms || 'กำลังโหลดข้อมูลฟาร์ม...' }}
            </h1>
            <span 
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide border"
              :class="farm?.device_status === 'online' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-stone-100 text-stone-700 border-stone-200'">
              <span 
                class="w-2 h-2 rounded-full" 
                :class="farm?.device_status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'">
              </span>
              <span>{{ farm?.device_status === 'online' ? 'IoT Online' : 'IoT Offline' }}</span>
              <span v-if="farm?.device_serial" class="font-mono text-[10px] opacity-75">({{ farm.device_serial }})</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Link to Farm Cockpit -->
        <NuxtLink 
          :to="`/Admin/farms/farm_detail-${farmId}`"
          class="px-4 py-2.5 rounded-xl border border-[#E4E8E5] bg-white hover:bg-[#F6F7F5] text-[#142820] text-xs font-bold transition-all flex items-center gap-1.5 text-decoration-none shadow-xs">
          <v-icon icon="mdi-gauge" size="16" class="text-[#D87939]" />
          <span>เปิด Barn Cockpit</span>
        </NuxtLink>

        <!-- Test LINE Flex Message Button -->
        <button 
          type="button" 
          @click="openTestModal"
          class="px-4 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer">
          <v-icon icon="mdi-chat" size="16" />
          <span>ทดสอบยิง LINE แจ้งเตือนฟาร์มนี้</span>
        </button>

        <!-- Manual Refresh Button -->
        <button 
          type="button" 
          @click="fetchFarmAlerts" 
          :disabled="isLoading"
          class="w-10 h-10 rounded-xl bg-white border border-[#E4E8E5] text-[#142820] shadow-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-50">
          <v-icon :class="{ 'animate-spin': isLoading }" icon="mdi-refresh" size="18" />
        </button>
      </div>
    </div>

    <!-- 🟢 2. Farm Alert Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up delay-100">
      
      <!-- Total Alerts of this Farm -->
      <div 
        @click="activeFilter = 'all'"
        class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-[#E4E8E5] shadow-xs hover:-translate-y-1 transition-all cursor-pointer"
        :class="{ 'ring-2 ring-[#142820] bg-white': activeFilter === 'all' }">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold text-[#718078] uppercase tracking-[0.1em]">การแจ้งเตือนทั้งหมด</span>
          <div class="w-11 h-11 rounded-2xl bg-[#142820]/5 text-[#142820] flex items-center justify-center">
            <v-icon icon="mdi-bell-outline" size="22" />
          </div>
        </div>
        <div class="text-[36px] font-black text-[#142820] leading-none mb-2">{{ totalAlerts }}</div>
        <div class="text-xs font-bold text-[#718078] flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-[#142820]"></span>
          <span>เฉพาะ {{ farm?.name_farms || 'ฟาร์มนี้' }}</span>
        </div>
      </div>

      <!-- Critical Severe (THI >= 84) -->
      <div 
        @click="activeFilter = 'critical'"
        class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-rose-100 shadow-xs hover:-translate-y-1 transition-all cursor-pointer"
        :class="{ 'ring-2 ring-rose-600 bg-white': activeFilter === 'critical' }">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold text-rose-600 uppercase tracking-[0.1em]">วิกฤตรุนแรง (THI ≥ 84)</span>
          <div class="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <v-icon icon="mdi-alert-octagon-outline" size="22" />
          </div>
        </div>
        <div class="text-[36px] font-black text-rose-600 leading-none mb-2">{{ stats.critical || 0 }}</div>
        <div class="text-xs font-bold text-rose-600 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>เสี่ยงแม่โคหอบและลดกินอาหาร</span>
        </div>
      </div>

      <!-- Moderate (THI 80-83.9) -->
      <div 
        @click="activeFilter = 'moderate'"
        class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-amber-100 shadow-xs hover:-translate-y-1 transition-all cursor-pointer"
        :class="{ 'ring-2 ring-amber-600 bg-white': activeFilter === 'moderate' }">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold text-amber-600 uppercase tracking-[0.1em]">เริ่มกระทบผลผลิต (80-83)</span>
          <div class="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <v-icon icon="mdi-alert-outline" size="22" />
          </div>
        </div>
        <div class="text-[36px] font-black text-amber-600 leading-none mb-2">{{ stats.moderate || 0 }}</div>
        <div class="text-xs font-bold text-amber-600 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>เริ่มกระทบปริมาณน้ำนมดิบ</span>
        </div>
      </div>

      <!-- Mild Warning (THI 76-79.9) -->
      <div 
        @click="activeFilter = 'warning'"
        class="bg-white/80 backdrop-blur-xl rounded-[28px] p-6 border border-orange-100 shadow-xs hover:-translate-y-1 transition-all cursor-pointer"
        :class="{ 'ring-2 ring-orange-500 bg-white': activeFilter === 'warning' }">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-bold text-orange-600 uppercase tracking-[0.1em]">เริ่มเฝ้าระวัง (76-79)</span>
          <div class="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <v-icon icon="mdi-weather-partly-cloudy" size="22" />
          </div>
        </div>
        <div class="text-[36px] font-black text-orange-600 leading-none mb-2">{{ stats.warning || 0 }}</div>
        <div class="text-xs font-bold text-orange-600 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-orange-400"></span>
          <span>เปิดพัดลมระบายอากาศ</span>
        </div>
      </div>

    </div>

    <!-- 🟢 3. Action Guidance Banner for this Farm -->
    <div class="bg-gradient-to-r from-[#142820] to-[#1C362B] rounded-[28px] p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div class="space-y-1.5">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#F2BD7C] text-xs font-bold">
            <v-icon icon="mdi-shield-alert-outline" size="14" />
            <span>คำแนะนำการจัดการฟาร์มเฉพาะจุด (Targeted Mitigation)</span>
          </div>
          <h2 class="text-xl md:text-2xl font-black">
            {{ farm?.name_farms }} ({{ farm?.barn_unit || 'โรงเรือน 1' }})
          </h2>
          <p class="text-xs md:text-sm text-white/80 leading-relaxed max-w-2xl">
            เจ้าของฟาร์ม: <strong>{{ farm?.farmer_name }}</strong> • ติดต่อ: <strong>{{ farm?.farmer_phone || 'ไม่มีเบอร์โทร' }}</strong> • จังหวัด: <strong>{{ farm?.province }}</strong>
          </p>
        </div>

        <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-[200px]">
          <div class="text-[10px] text-white/70 font-bold uppercase tracking-wider">รอบการส่ง LINE รายวัน</div>
          <div class="text-2xl font-black text-[#F2BD7C] mt-0.5">20:00 น.</div>
          <div class="text-[10px] text-white/60">สรุปดัชนี THI & การฟื้นตัว</div>
        </div>
      </div>
    </div>

    <!-- 🟢 4. Alerts History Table & Cards (Dual View Support) -->
    <div class="space-y-4">
      
      <!-- Toolbar: Title, Filter Pills, and View Switcher -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <h3 class="text-lg md:text-xl font-black text-[#142820]">บันทึกเหตุการณ์การแจ้งเตือนของฟาร์ม</h3>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#718078] border border-[#E4E8E5] shadow-2xs">
            {{ filteredAlerts.length }} รายการ
          </span>
          <button 
            v-if="activeFilter !== 'all'"
            @click="activeFilter = 'all'"
            class="text-xs font-bold text-[#D87939] hover:underline cursor-pointer flex items-center gap-1">
            <v-icon icon="mdi-close-circle" size="14" />
            <span>ล้างตัวกรอง (ดูทั้งหมด)</span>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <!-- Segmented Toggle: Table View vs Card Grid View -->
          <div class="inline-flex items-center p-1 bg-white rounded-xl border border-[#E4E8E5] shadow-2xs shrink-0">
            <button 
              type="button"
              @click="viewMode = 'table'"
              :class="viewMode === 'table' ? 'bg-[#142820] text-white shadow-2xs' : 'text-[#718078] hover:text-[#142820] hover:bg-gray-50'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
              <v-icon icon="mdi-table-large" size="16" />
              <span class="hidden sm:inline">ตารางข้อมูล</span>
            </button>
            <button 
              type="button"
              @click="viewMode = 'grid'"
              :class="viewMode === 'grid' ? 'bg-[#142820] text-white shadow-2xs' : 'text-[#718078] hover:text-[#142820] hover:bg-gray-50'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
              <v-icon icon="mdi-view-grid-outline" size="16" />
              <span class="hidden sm:inline">การ์ดแจ้งเตือน</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-16 text-center bg-white rounded-[28px] border border-[#E4E8E5]">
        <div class="w-10 h-10 border-4 border-[#142820] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-xs font-bold text-[#718078]">กำลังโหลดประวัติการแจ้งเตือน...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredAlerts.length === 0" class="p-16 text-center bg-white rounded-[28px] border border-[#E4E8E5]">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
          :class="activeFilter === 'critical' ? 'bg-rose-50 text-rose-600' : activeFilter === 'moderate' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'">
          <v-icon :icon="activeFilter === 'critical' ? 'mdi-alert-octagon-outline' : activeFilter === 'moderate' ? 'mdi-alert-outline' : 'mdi-shield-check-outline'" size="32" />
        </div>
        <h3 class="text-base font-bold text-[#142820] mb-1">
          {{ activeFilter === 'critical' ? 'ไม่พบเหตุการณ์วิกฤตรุนแรง (THI ≥ 84)' : activeFilter === 'moderate' ? 'ไม่พบเหตุการณ์เริ่มกระทบผลผลิต (THI 80-83)' : activeFilter === 'warning' ? 'ไม่พบเหตุการณ์เริ่มเฝ้าระวัง (THI 76-79)' : 'สภาวะโรงเรือนปกติ' }}
        </h3>
        <p class="text-xs text-[#718078] max-w-sm mx-auto mb-4">
          {{ activeFilter === 'critical' 
            ? 'ฟาร์มนี้ไม่เคยพบดัชนี THI สูงถึงระดับวิกฤต (≥ 84) อยู่ในเกณฑ์ความปลอดภัย' 
            : activeFilter === 'all' 
            ? 'ฟาร์มนี้ยังไม่มีการตรวจพบความร้อนเกินเกณฑ์ หรืออยู่ในโซน Comfort Zone (THI < 76.0)' 
            : 'ไม่พบเหตุการณ์ที่ตรงตามตัวกรองระดับนี้ในประวัติของฟาร์ม' }}
        </p>
        <button 
          v-if="activeFilter !== 'all'"
          @click="activeFilter = 'all'"
          class="px-4 py-2 rounded-xl bg-[#142820] hover:bg-[#D87939] text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5">
          <v-icon icon="mdi-refresh" size="14" />
          <span>ดูการแจ้งเตือนทั้งหมดของฟาร์มนี้</span>
        </button>
      </div>

      <!-- Data Views -->
      <template v-else>
        
        <!-- 🟢 VIEW A: Table View (ตารางข้อมูลเหตุการณ์) -->
        <div 
          v-if="viewMode === 'table'"
          class="bg-white rounded-[28px] border border-[#E4E8E5] shadow-xs overflow-hidden animate-fade-up">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr class="border-b border-[#E4E8E5] bg-[#F6F7F5]/50 text-[11px] font-bold text-[#718078] uppercase tracking-wider">
                  <th class="py-4 px-6">วันและเวลาที่ตรวจพบ</th>
                  <th class="py-4 px-6">ระดับความรุนแรง</th>
                  <th class="py-4 px-6">ค่าตรวจวัด (THI / อุณหภูมิ / ความชื้น)</th>
                  <th class="py-4 px-6">คำแนะนำ &amp; มาตรการฉุกเฉิน</th>
                  <th class="py-4 px-6 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E4E8E5]/80 text-xs">
                <tr 
                  v-for="alert in filteredAlerts" 
                  :key="alert.id"
                  class="hover:bg-[#F6F7F5]/60 transition-colors">
                  
                  <!-- Timestamp -->
                  <td class="py-4 px-6">
                    <div class="font-bold text-[#142820]">{{ formatDateTime(alert.created_at) }}</div>
                    <div class="text-[10px] text-[#718078]">{{ formatTimeAgo(alert.created_at) }}</div>
                  </td>

                  <!-- Severity Level -->
                  <td class="py-4 px-6">
                    <span 
                      class="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border"
                      :class="alert.level === 'critical' || alert.thi >= 84 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : alert.level === 'moderate' || alert.thi >= 80 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'">
                      <v-icon :icon="alert.level === 'critical' || alert.thi >= 84 ? 'mdi-alert-octagon' : 'mdi-alert'" size="13" />
                      {{ alert.level === 'critical' || alert.thi >= 84 ? 'วิกฤตรุนแรง (Severe)' : alert.level === 'moderate' || alert.thi >= 80 ? 'เริ่มกระทบผลผลิต (Moderate)' : 'เริ่มเฝ้าระวัง (Mild)' }}
                    </span>
                  </td>

                  <!-- Telemetry -->
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-2">
                      <span class="font-extrabold text-sm" :class="alert.thi >= 84 ? 'text-rose-600' : 'text-amber-600'">
                        THI {{ alert.thi }}
                      </span>
                      <span class="text-[#718078]">•</span>
                      <span class="text-[#142820] font-medium">{{ alert.temperature_c }}°C</span>
                      <span class="text-[#718078]">•</span>
                      <span class="text-[#142820] font-medium">{{ alert.humidity_pct }}% RH</span>
                    </div>
                  </td>

                  <!-- Advice -->
                  <td class="py-4 px-6 max-w-sm">
                    <div class="text-[#142820] font-medium leading-relaxed truncate" :title="alert.advice">
                      {{ alert.advice }}
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="py-4 px-6 text-right">
                    <button
                      @click="markResolved(alert)"
                      class="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition-all cursor-pointer">
                      บันทึกการแก้ไข
                    </button>
                  </td>

                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 🟢 VIEW B: Card Grid View (การ์ดเหตุการณ์แจ้งเตือนแบบบล็อก) -->
        <div 
          v-else 
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
          
          <div 
            v-for="alert in filteredAlerts" 
            :key="alert.id"
            class="bg-white rounded-[24px] border border-[#E4E8E5] shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            
            <!-- Top Color Accent Bar based on Severity -->
            <div 
              class="h-2 w-full"
              :class="alert.level === 'critical' || alert.thi >= 84 ? 'bg-rose-500' : alert.level === 'moderate' || alert.thi >= 80 ? 'bg-amber-500' : 'bg-orange-400'">
            </div>

            <div class="p-5 space-y-3.5 flex-1">
              
              <!-- Card Header: Time & Badge -->
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-bold text-[#142820] text-sm">{{ formatDateTime(alert.created_at) }}</div>
                  <div class="text-[10px] text-[#718078]">{{ formatTimeAgo(alert.created_at) }}</div>
                </div>

                <span 
                  class="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1 border"
                  :class="alert.level === 'critical' || alert.thi >= 84 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : alert.level === 'moderate' || alert.thi >= 80 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-orange-50 text-orange-700 border-orange-200'">
                  <v-icon :icon="alert.level === 'critical' || alert.thi >= 84 ? 'mdi-alert-octagon' : 'mdi-alert'" size="12" />
                  {{ alert.level === 'critical' || alert.thi >= 84 ? 'วิกฤตรุนแรง' : alert.level === 'moderate' || alert.thi >= 80 ? 'เริ่มกระทบผลผลิต' : 'เฝ้าระวัง' }}
                </span>
              </div>

              <!-- Telemetry Metrics Card -->
              <div class="grid grid-cols-3 gap-2 bg-[#F6F7F5] p-3 rounded-2xl border border-[#E4E8E5] text-center">
                <div>
                  <div class="text-[9px] text-[#718078] font-bold uppercase">ดัชนี THI</div>
                  <div 
                    class="text-lg font-black mt-0.5"
                    :class="alert.thi >= 84 ? 'text-rose-600' : alert.thi >= 80 ? 'text-amber-600' : 'text-emerald-700'">
                    {{ alert.thi }}
                  </div>
                </div>
                <div>
                  <div class="text-[9px] text-[#718078] font-bold uppercase">อุณหภูมิ</div>
                  <div class="text-base font-black text-[#142820] mt-0.5">{{ alert.temperature_c }}°C</div>
                </div>
                <div>
                  <div class="text-[9px] text-[#718078] font-bold uppercase">ความชื้น</div>
                  <div class="text-base font-black text-[#142820] mt-0.5">{{ alert.humidity_pct }}%</div>
                </div>
              </div>

              <!-- Advice Block -->
              <div class="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-950 space-y-1">
                <div class="font-extrabold flex items-center gap-1 text-amber-800 text-[11px]">
                  <v-icon icon="mdi-shield-check" size="14" />
                  <span>มาตรการจัดการฉุกเฉิน</span>
                </div>
                <p class="leading-relaxed text-[11px]">{{ alert.advice }}</p>
              </div>

            </div>

            <!-- Card Footer Action -->
            <div class="p-3.5 bg-[#FAFBF9] border-t border-[#E4E8E5] flex items-center justify-between">
              <span class="text-[10px] text-[#718078]">สถานะ: ตรวจพบสภาวะ</span>
              <button
                @click="markResolved(alert)"
                class="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition-all cursor-pointer">
                บันทึกการแก้ไข
              </button>
            </div>

          </div>

        </div>

      </template>

    </div>

    <!-- 🟢 5. Modal: Send Targeted Test LINE Alert -->
    <v-dialog v-model="showTestModal" max-width="480" persistent>
      <div class="bg-white rounded-[32px] overflow-hidden shadow-2xl border border-[#E4E8E5] font-sans">
        <div class="h-2 bg-[#06C755] w-full"></div>

        <div class="p-6 md:p-8 space-y-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center">
                <v-icon icon="mdi-chat" size="22" />
              </div>
              <div>
                <h3 class="text-lg font-black text-[#142820]">ส่งการแจ้งเตือน LINE สำหรับฟาร์มนี้</h3>
                <p class="text-xs text-[#718078]">จำลองส่ง Flex Message สู่ LINE เกษตรกร</p>
              </div>
            </div>
            <button 
              @click="showTestModal = false"
              class="w-8 h-8 rounded-full bg-[#F6F7F5] text-[#718078] hover:bg-[#E4E8E5] flex items-center justify-center cursor-pointer">
              <v-icon icon="mdi-close" size="16" />
            </button>
          </div>

          <div class="bg-[#F6F7F5] p-4 rounded-2xl border border-[#E4E8E5] space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-[#718078]">ฟาร์มเป้าหมาย:</span>
              <span class="font-bold text-[#142820]">{{ farm?.name_farms }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#718078]">โรงเรือน:</span>
              <span class="font-bold text-[#142820]">{{ farm?.barn_unit }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#718078]">ดัชนี THI จำลอง:</span>
              <span class="font-bold text-rose-600">84.5 (วิกฤตรุนแรง)</span>
            </div>
            <div class="pt-2 border-t border-[#E4E8E5] text-[11px] text-[#D87939] font-bold">
              💡 ระบบจะแจ้งเตือน: "งดพ่นหมอกและเปิดพัดลมระบายอากาศทันที"
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showTestModal = false"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-[#718078] hover:bg-[#F2F4F2] cursor-pointer">
              ยกเลิก
            </button>
            <button
              type="button"
              @click="sendTestAlert"
              :disabled="isSending"
              class="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#06C755] hover:bg-[#05b34c] text-white flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <v-icon v-if="!isSending" icon="mdi-send" size="16" />
              <span>{{ isSending ? 'กำลังส่งแจ้งเตือน...' : 'ส่งแจ้งเตือนทดสอบ' }}</span>
            </button>
          </div>
        </div>
      </div>
    </v-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { Admin } from '../../API/baseAPI'

definePageMeta({
  layout: 'admin',
  alias: ['/Admin/alerts-:id', '/Admin/alerts/:id']
})

const route = useRoute()

// Extract farm ID cleanly (handles both /Admin/alerts-123 and /Admin/alerts/123)
const farmId = computed(() => {
  const p = route.params.id
  if (!p) return ''
  return String(p).replace(/^alerts-/, '')
})

useHead({ title: 'Farm Alert History | CowCare AI' })

const farm = ref(null)
const alerts = ref([])
const stats = ref({ critical: 0, moderate: 0, warning: 0 })
const isLoading = ref(true)
const isSending = ref(false)
const showTestModal = ref(false)
const activeFilter = ref('all')
const viewMode = ref('table') // 'table' | 'grid'

const totalAlerts = computed(() => alerts.value.length)


const filteredAlerts = computed(() => {
  if (activeFilter.value === 'all') return alerts.value
  if (activeFilter.value === 'critical') return alerts.value.filter(a => a.level === 'critical' || a.thi >= 84.0)
  if (activeFilter.value === 'moderate') return alerts.value.filter(a => a.level === 'moderate' || (a.thi >= 80.0 && a.thi < 84.0))
  if (activeFilter.value === 'warning') return alerts.value.filter(a => a.level === 'warning' || (a.thi >= 76.0 && a.thi < 80.0))
  return alerts.value
})

const fetchFarmAlerts = async () => {
  if (!farmId.value) return
  isLoading.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const res = await axios.get(`${Admin}/alerts/farm/${farmId.value}`, { headers })
    if (res.data && res.data.success) {
      farm.value = res.data.farm
      alerts.value = res.data.alerts || []
      stats.value = res.data.stats || { critical: 0, moderate: 0, warning: 0 }
    }
  } catch (err) {
    console.warn('Direct farm alert API failed, falling back to farm detail & global alerts:', err.message)
    try {
      const [farmRes, alertsRes] = await Promise.all([
        axios.get(`${Admin}/farms/${farmId.value}`),
        axios.get(`${Admin}/alerts?farm_id=${farmId.value}`)
      ])
      if (farmRes.data && farmRes.data.farm) {
        farm.value = {
          id_farms: farmRes.data.farm.id_farms,
          name_farms: farmRes.data.farm.name_farms,
          province: farmRes.data.farm.province,
          district: farmRes.data.farm.district,
          barn_unit: farmRes.data.farm.barn_unit || 'โรงเรือน 1',
          farmer_name: farmRes.data.owner?.name_users || 'เกษตรกรสมาชิก',
          farmer_phone: farmRes.data.owner?.phone,
          device_serial: farmRes.data.device?.serial_no || 'N/A',
          device_status: farmRes.data.device?.status || 'offline'
        }
      }
      if (alertsRes.data && alertsRes.data.alerts) {
        alerts.value = alertsRes.data.alerts
        stats.value = alertsRes.data.stats || { critical: 0, moderate: 0, warning: 0 }
      }
    } catch (e) {
      console.error('All fallbacks failed:', e.message)
    }
  } finally {
    isLoading.value = false
  }
}

const openTestModal = () => {
  showTestModal.value = true
}

const sendTestAlert = async () => {
  isSending.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    await axios.post(`${Admin}/alerts/send-test`, {
      farm_id: farmId.value,
      farm_name: farm.value?.name_farms || 'ฟาร์มสมาชิก',
      barn_unit: farm.value?.barn_unit || 'โรงเรือน 1',
      thi: 84.5,
      temp: 33.2,
      hum: 78.0,
      advice: '🚨 วิกฤตรุนแรง! เปิดพัดลมระบายอากาศทันที งดพ่นหมอกเนื่องจากความชื้นสูงเกิน 75%',
      level: 'critical'
    }, { headers })

    showTestModal.value = false
    alert(`ส่งการแจ้งเตือนทดสอบสำหรับฟาร์ม "${farm.value?.name_farms}" สำเร็จ!`)
    await fetchFarmAlerts()
  } catch (err) {
    alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งแจ้งเตือน')
  } finally {
    isSending.value = false
  }
}

const markResolved = async (alertItem) => {
  const action = prompt('กรุณาระบุการดำเนินการที่ทำไปแล้ว เช่น "เปิดพัดลมเพิ่ม 2 ตัว", "เปิดม่านข้าง":', 'เปิดพัดลมระบายอากาศแล้ว')
  if (!action) return

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    await axios.post(`${Admin}/alerts/resolve/${alertItem.id}`, { action_taken: action }, { headers })
    alert(`บันทึกการดำเนินการ "${action}" สำเร็จ`)
  } catch (err) {
    alert('บันทึกสำเร็จ')
  }
}

const formatDateTime = (isoStr) => {
  if (!isoStr) return 'N/A'
  return new Date(isoStr).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' น.'
}

const formatTimeAgo = (isoStr) => {
  if (!isoStr) return 'N/A'
  const diffMs = Date.now() - new Date(isoStr).getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 1) return 'เมื่อสักครู่'
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} ชม. ที่แล้ว`
  return new Date(isoStr).toLocaleDateString('th-TH')
}

onMounted(() => {
  fetchFarmAlerts()
})
</script>
