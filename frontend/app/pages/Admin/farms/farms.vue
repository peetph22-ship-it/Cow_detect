<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">

    <!-- 🟢 1. Header & Live Control Bar -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
      <div>
        <h1 class="text-[32px] md:text-[40px] font-black text-[#163026] tracking-tight leading-tight mb-2 flex items-center gap-3">
          Network Farm Roster
          <span class="px-3 py-1 bg-[#d87939]/10 text-[#d87939] rounded-[12px] text-xs font-bold uppercase tracking-wider border border-[#d87939]/20">
            Farms
          </span>
        </h1>
        <p class="text-[#718078] text-[15px] font-medium max-w-2xl">
          จัดการเครือข่ายฟาร์มโคนม ตรวจสอบสถานะการเชื่อมต่อ IoT และเฝ้าระวังดัชนีความเครียดจากความร้อน (THI) แบบเรียลไทม์
        </p>

        <!-- Online & Offline Status Pill -->
        <div class="mt-3 flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-sm">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ออนไลน์ {{ onlineFarmsCount }} จากทั้งหมด {{ farmData.length }} ฟาร์ม</span>
          </span>
          <span v-if="farmData.length - onlineFarmsCount > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f1f5f3] text-[#718078] border border-[#e5ece9]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            <span>ออฟไลน์ {{ farmData.length - onlineFarmsCount }}</span>
          </span>
        </div>
      </div>

      <!-- Action Controls -->
      <div class="flex items-center gap-3 flex-wrap">
        <!-- Live Telemetry (8s) Toggle Button -->
        <button 
          type="button"
          @click="toggleLiveSync"
          :title="isLiveSync ? 'คลิกเพื่อหยุดการอัปเดตอัตโนมัติ' : 'คลิกเพื่อเปิดการอัปเดตอัตโนมัติทุก 8 วินาที'"
          class="px-4 py-2.5 rounded-[16px] text-xs font-bold border transition-all duration-300 flex items-center gap-2.5 cursor-pointer shadow-sm select-none"
          :class="isLiveSync 
            ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200 shadow-[0_4px_12px_rgba(16,185,129,0.12)]' 
            : 'bg-white text-[#718078] border-[#e5ece9] hover:border-[#163026]/30'">
          <span 
            class="w-2.5 h-2.5 rounded-full transition-all duration-300"
            :class="isLiveSync ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-200/50' : 'bg-gray-400'"></span>
          <span>{{ isLiveSync ? 'Live Telemetry (8s)' : 'Telemetry พักการทำงาน' }}</span>
        </button>

        <!-- Manual Refresh Button -->
        <button 
          type="button" 
          @click="fetchFarms(true)"
          :disabled="isLoading"
          title="รีเฟรชข้อมูลตอนนี้"
          class="w-10 h-10 rounded-[16px] bg-white border border-[#e5ece9] hover:border-[#163026]/30 text-[#163026] shadow-sm hover:shadow flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-95">
          <v-icon :class="{ 'animate-spin': isLoading }" icon="mdi-refresh" size="18" />
        </button>

        <!-- ➕ Add Farm Button in #163026 -->
        <button
          type="button"
          @click="isAddModalOpen = true"
          class="bg-[#163026] hover:bg-[#0f221b] text-white px-5 py-2.5 rounded-[16px] font-bold shadow-[0_4px_14px_rgba(22,48,38,0.2)] hover:shadow-[0_8px_22px_rgba(22,48,38,0.28)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 text-sm cursor-pointer active:scale-95">
          <v-icon icon="mdi-plus" size="18" />
          <span>เพิ่มฟาร์มใหม่</span>
        </button>
      </div>
    </div>

    <!-- 🟢 2. Interactive THI Filter Strip (4 Cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-up delay-100">

      <!-- Card 1: Total Farms -->
      <div 
        @click="currentFilter = 'all'"
        class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(36,67,58,0.08)] transition-all duration-300 group cursor-pointer relative overflow-hidden"
        :class="currentFilter === 'all' ? 'ring-2 ring-[#163026] border-[#163026] bg-white' : 'border-white/90'">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ฟาร์มทั้งหมด</span>
          <div class="w-11 h-11 rounded-[14px] bg-[#163026]/10 text-[#163026] flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm">
            <v-icon icon="mdi-home-analytics" size="22" />
          </div>
        </div>
        <div>
          <div class="text-[36px] font-black text-[#163026] leading-none mb-1.5 tabular-nums">
            {{ farmData.length }}
          </div>
          <div class="flex items-center text-[11.5px] font-bold text-[#718078] bg-[#f8faf9] w-fit px-2.5 py-0.5 rounded-[8px] border border-[#e5ece9]">
            เครือข่ายฟาร์มในระบบ
          </div>
        </div>
      </div>

      <!-- Card 2: Comfort Zone (THI < 76.0) -->
      <div 
        @click="currentFilter = 'comfort'"
        class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(36,67,58,0.08)] transition-all duration-300 group cursor-pointer relative overflow-hidden"
        :class="currentFilter === 'comfort' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-white' : 'border-white/90'">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">สภาวะปกติ (Comfort)</span>
          <div class="w-11 h-11 rounded-[14px] bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
            <v-icon icon="mdi-shield-check-outline" size="22" />
          </div>
        </div>
        <div>
          <div class="text-[36px] font-black text-emerald-600 leading-none mb-1.5 tabular-nums">
            {{ countComfort }}
          </div>
          <div class="flex items-center text-[11.5px] font-bold text-emerald-700 bg-emerald-50 w-fit px-2.5 py-0.5 rounded-[8px] border border-emerald-100">
            THI &lt; 76.0 (สภาวะเหมาะสม)
          </div>
        </div>
      </div>

      <!-- Card 3: Vigilance & Moderate Stress (THI 76.0 - 83.9) -->
      <div 
        @click="currentFilter = 'warning'"
        class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(36,67,58,0.08)] transition-all duration-300 group cursor-pointer relative overflow-hidden"
        :class="currentFilter === 'warning' ? 'ring-2 ring-amber-500 border-amber-500 bg-white' : 'border-white/90'">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">เฝ้าระวัง (Vigilance)</span>
          <div class="w-11 h-11 rounded-[14px] bg-gradient-to-br from-amber-50 to-orange-100/60 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm">
            <v-icon icon="mdi-alert-outline" size="22" />
          </div>
        </div>
        <div>
          <div class="text-[36px] font-black text-amber-600 leading-none mb-1.5 tabular-nums">
            {{ countWarning }}
          </div>
          <div class="flex items-center text-[11.5px] font-bold text-amber-800 bg-amber-50 w-fit px-2.5 py-0.5 rounded-[8px] border border-amber-200">
            THI 76.0 - 83.9 (เริ่มมีผลกระทบ)
          </div>
        </div>
      </div>

      <!-- Card 4: Severe Stress (THI >= 84.0) -->
      <div 
        @click="currentFilter = 'severe'"
        class="bg-white/80 backdrop-blur-xl rounded-[24px] p-5 border shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(36,67,58,0.08)] transition-all duration-300 group cursor-pointer relative overflow-hidden"
        :class="currentFilter === 'severe' ? 'ring-2 ring-rose-500 border-rose-500 bg-white' : 'border-white/90'">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ภาวะวิกฤต (Severe)</span>
          <div class="w-11 h-11 rounded-[14px] bg-gradient-to-br from-rose-50 to-rose-100/60 text-rose-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
            <v-icon icon="mdi-fire-alert" size="22" />
          </div>
        </div>
        <div>
          <div class="text-[36px] font-black text-rose-600 leading-none mb-1.5 tabular-nums">
            {{ countSevere }}
          </div>
          <div class="flex items-center text-[11.5px] font-bold text-rose-700 bg-rose-50 w-fit px-2.5 py-0.5 rounded-[8px] border border-rose-200">
            THI &ge; 84.0 (ความร้อนวิกฤต)
          </div>
        </div>
      </div>

    </div>

    <!-- 🟢 2.5 Status Category Tabs (รองรับแท็บฟาร์มที่ยังไม่มีค่าอุปกรณ์/ข้อผิดพลาด) -->
    <div class="flex items-center gap-2 border-b border-[#e5ece9] pb-3 overflow-x-auto animate-fade-up delay-150">
      <button
        type="button"
        @click="statusTab = 'all'"
        :class="statusTab === 'all' ? 'bg-[#163026] text-white shadow-sm' : 'bg-white text-[#718078] hover:text-[#163026] border border-[#e5ece9]'"
        class="px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap">
        <v-icon icon="mdi-view-grid" size="16" />
        <span>ฟาร์มทั้งหมด</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono" :class="statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-[#edf3ed] text-[#163026]'">
          {{ farmData.length }}
        </span>
      </button>

      <button
        type="button"
        @click="statusTab = 'active'"
        :class="statusTab === 'active' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-[#718078] hover:text-emerald-700 border border-[#e5ece9]'"
        class="px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>ออนไลน์ / รับส่งข้อมูลปกติ</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono" :class="statusTab === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-800'">
          {{ activeFarmsCount }}
        </span>
      </button>

      <button
        type="button"
        @click="statusTab = 'pending'"
        :class="statusTab === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-[#718078] hover:text-amber-700 border border-[#e5ece9]'"
        class="px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap">
        <v-icon icon="mdi-alert-circle-outline" size="16" />
        <span>รอเชื่อมต่อ / อุปกรณ์ขัดข้อง</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono" :class="statusTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-800'">
          {{ pendingFarmsCount }}
        </span>
      </button>
    </div>

    <!-- 🟢 3. View Switcher & Search Toolbar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-up delay-200">

      <!-- Left: Minimal Search Bar -->
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="w-full md:w-[360px]">
          <v-text-field
            v-model="searchQuery"
            placeholder="ค้นหาชื่อฟาร์ม, โรงเรือนย่อย, สมาชิก, จังหวัด..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            rounded="xl"
            color="#163026"
            bg-color="white"
            clearable
            hide-details
            class="farm-vsearch-input"
          />
        </div>
        <span class="text-xs font-bold text-[#718078] whitespace-nowrap hidden lg:inline-block">
          แสดง {{ filteredFarms.length }} จาก {{ farmData.length }} ฟาร์ม
        </span>
      </div>

      <!-- Right: View Switcher (Table View vs Bento Grid View) -->
      <div class="flex items-center justify-end gap-3">
        <div class="inline-flex items-center p-1 bg-white rounded-xl border border-[#e5ece9] shadow-sm">
          <button 
            type="button"
            @click="viewMode = 'table'"
            :class="viewMode === 'table' ? 'bg-[#163026] text-white shadow-sm' : 'text-[#718078] hover:text-[#163026] hover:bg-gray-50'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
            <v-icon icon="mdi-table-large" size="16" />
            <span>ตารางข้อมูล</span>
          </button>
          <button 
            type="button"
            @click="viewMode = 'grid'"
            :class="viewMode === 'grid' ? 'bg-[#163026] text-white shadow-sm' : 'text-[#718078] hover:text-[#163026] hover:bg-gray-50'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
            <v-icon icon="mdi-view-grid-outline" size="16" />
            <span>การ์ดสมาร์ทฟาร์ม</span>
          </button>
        </div>
      </div>

    </div>

    <!-- 🟢 4. Data Presentation (Dual View Support) -->

    <!-- VIEW A: Table View (Borderless Vertical Glass Table) -->
    <div 
      v-if="viewMode === 'table'"
      class="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] overflow-hidden animate-fade-up delay-300 relative">
      <div class="overflow-x-auto p-2">
        <v-table hover class="modern-farm-vtable bg-transparent w-full text-left whitespace-nowrap">
          <thead>
            <tr>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5 text-center w-16">
                ลำดับ
              </th>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5">
                ข้อมูลฟาร์ม (Farm)
              </th>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5">
                อุปกรณ์ IoT ประจำฟาร์ม
              </th>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5 text-center">
                อุณหภูมิ (°C)
              </th>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5 text-center">
                ความชื้น (%RH)
              </th>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5 text-center">
                ค่า THI
              </th>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5 text-center">
                สถานะสภาวะ
              </th>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5 text-center">
                การจัดการ
              </th>
              <th class="px-6 py-5 text-[11px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#163026]/5 text-center">
                รายละเอียด
              </th>
            </tr>
          </thead>
          <tbody class="text-[#4e6057]">
            <tr 
              v-for="(item, index) in filteredFarms" 
              :key="item.id_farms || index"
              class="hover:bg-white/95 transition-colors group border-b border-[#f0f4f2] last:border-0">
              
              <!-- Index -->
              <td class="px-6 py-4 text-center text-[#718078] font-bold text-xs">
                {{ index + 1 }}
              </td>

              <!-- Farm Info (ชื่อฟาร์ม, โรงเรือนย่อย, สมาชิกเจ้าของฟาร์ม) -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-[14px] bg-[#163026]/10 text-[#163026] flex items-center justify-center font-black text-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <v-icon icon="mdi-barn" size="20" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="font-black text-[#163026] text-[14.5px] leading-snug group-hover:text-[#d87939] transition-colors">
                        {{ item.name_farms }}
                      </p>
                      <span class="px-2 py-0.5 rounded-[8px] bg-[#d87939]/10 text-[#d87939] text-[10.5px] font-bold border border-[#d87939]/20">
                        {{ item.barn_unit || 'โรงเรือนหลัก (Unit 1)' }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p class="text-[12px] font-medium text-[#718078] flex items-center gap-1">
                        <v-icon icon="mdi-map-marker-outline" size="14" class="text-[#a6b5aa]" />
                        <span>{{ item.province || 'ไม่ระบุจังหวัด' }}</span>
                        <span v-if="item.district" class="text-[#cbd5e1]">•</span>
                        <span v-if="item.district">{{ item.district }}</span>
                      </p>
                      <span v-if="item.owner_name" class="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        สมาชิก: {{ item.owner_name }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- IoT Device (รองรับหลายอุปกรณ์ต่อฟาร์ม) -->
              <td class="px-6 py-4">
                <div v-if="item.total_devices > 0" class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-mono font-bold bg-[#edf3ed] text-[#163026] border border-[#163026]/10">
                      {{ item.serial_no || 'DEVICE' }}
                    </span>
                    <span 
                      class="w-2 h-2 rounded-full"
                      :class="item.device_status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'"
                      :title="item.device_status === 'online' ? 'อุปกรณ์ออนไลน์' : 'อุปกรณ์ออฟไลน์'">
                    </span>
                    <span v-if="item.total_devices > 1" class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      +{{ item.total_devices - 1 }} อุปกรณ์
                    </span>
                  </div>
                  <span class="text-[11.5px] text-[#718078] font-medium mt-1 truncate max-w-[200px]">
                    {{ item.name_devices || 'ESP32 Telemetry Node' }}
                  </span>
                </div>
                <div v-else class="text-amber-700 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-[10px] text-xs font-medium inline-flex items-center gap-1.5 w-fit">
                  <v-icon icon="mdi-lan-disconnect" size="14" class="text-amber-600" />
                  <span>ยังไม่มีอุปกรณ์</span>
                </div>
              </td>

              <!-- Temperature -->
              <td class="px-6 py-4 text-center">
                <span v-if="item.temperature_c" class="font-extrabold text-[#163026] text-[14px]">
                  {{ Number(item.temperature_c).toFixed(1) }}
                  <span class="text-[11px] font-bold text-[#718078]">°C</span>
                </span>
                <span v-else class="text-[#a6b5aa] font-mono text-xs">-</span>
              </td>

              <!-- Humidity -->
              <td class="px-6 py-4 text-center">
                <span v-if="item.humidity_pct" class="font-extrabold text-sky-700 text-[14px]">
                  {{ Number(item.humidity_pct).toFixed(1) }}
                  <span class="text-[11px] font-bold text-[#718078]">%</span>
                </span>
                <span v-else class="text-[#a6b5aa] font-mono text-xs">-</span>
              </td>

              <!-- THI -->
              <td class="px-6 py-4 text-center">
                <span v-if="item.thi" class="font-black text-[15px]" :class="getThiStatus(item.thi).textClass">
                  {{ Number(item.thi).toFixed(1) }}
                </span>
                <span v-else class="text-[#a6b5aa] font-mono text-xs">-</span>
              </td>

              <!-- Status Badge -->
              <td class="px-6 py-4 text-center">
                <span v-if="item.thi"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border tracking-wide"
                  :class="getThiStatus(item.thi).badgeClass">
                  <span class="w-1.5 h-1.5 rounded-full" :class="getThiStatus(item.thi).dotClass"></span>
                  {{ getThiStatus(item.thi).label }}
                </span>
                <span v-else-if="item.total_devices > 0" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  รอสัญญาณแรก
                </span>
                <span v-else class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  ไม่มีอุปกรณ์
                </span>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-end gap-1.5">

                  <!-- Edit Farm Button -->
                  <button
                    type="button"
                    @click="openEditModal(item)"
                    title="แก้ไขข้อมูลฟาร์ม"
                    class="w-8 h-8 rounded-[10px] bg-white border border-[#e5ece9] hover:bg-amber-50 hover:border-amber-200 text-[#718078] hover:text-amber-700 inline-flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer">
                    <v-icon icon="mdi-pencil-outline" size="15" />
                  </button>

                  <!-- Delete Farm Button -->
                  <button
                    type="button"
                    @click="openDeleteDialog(item)"
                    title="ลบฟาร์มนี้"
                    class="w-8 h-8 rounded-[10px] bg-white border border-[#e5ece9] hover:bg-rose-50 hover:border-rose-200 text-[#718078] hover:text-rose-700 inline-flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer">
                    <v-icon icon="mdi-trash-can-outline" size="15" />
                  </button>
                  <!-- View Details Button -->
                  
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <NuxtLink
                    :to="'/Admin/farm_detail-' + item.id_farms"
                    class="px-3 py-1.5 rounded-[12px] bg-[#163026] hover:bg-[#0f221b] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_4px_12px_rgba(22,48,38,0.15)] hover:shadow-[0_6px_16px_rgba(22,48,38,0.25)] hover:-translate-y-0.5 transition-all duration-200">
                    <v-icon icon="mdi-chart-timeline-variant" size="15" />
                    <span>รายละเอียด</span>
                  </NuxtLink>
              </td>

            </tr>
          </tbody>
        </v-table>
      </div>

      <!-- Empty State Table -->
      <div v-if="filteredFarms.length === 0 && !isLoading" class="p-12 text-center flex flex-col items-center justify-center">
        <div class="w-16 h-16 rounded-full bg-[#edf3ed] flex items-center justify-center text-[#a6b5aa] mb-4">
          <v-icon icon="mdi-barn" size="32" />
        </div>
        <h4 class="text-[#163026] font-black text-[16px]">ไม่พบข้อมูลฟาร์ม</h4>
        <p class="text-[#718078] text-[13px] mt-1 mb-4">
          {{ searchQuery ? 'ไม่พบฟาร์มที่ตรงกับคำค้นหา "' + searchQuery + '"' : 'ไม่มีรายการฟาร์มในสถานะตัวกรองนี้' }}
        </p>
        <button 
          @click="resetFilters"
          class="px-5 py-2 rounded-xl bg-[#163026] text-white text-xs font-bold hover:bg-[#0f221b] transition-all cursor-pointer shadow-sm">
          ล้างตัวกรองทั้งหมด
        </button>
      </div>
    </div>

    <!-- VIEW B: Bento Grid View (3-Column Responsive Cards) -->
    <div v-else class="space-y-6">
      <div 
        v-if="filteredFarms.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up delay-300">
        
        <div 
          v-for="item in filteredFarms" 
          :key="'grid-' + (item.id_farms || item.serial_no)"
          class="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(22,48,38,0.08)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between group">
          
          <!-- Top Risk Color Bar -->
          <div class="h-2 w-full transition-colors" :class="getThiStatus(item.thi).barClass"></div>

          <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
            
            <!-- Farm Header & IoT Badge -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-[14px] bg-[#163026]/10 text-[#163026] flex items-center justify-center font-black flex-shrink-0 group-hover:scale-105 transition-transform">
                  <v-icon icon="mdi-barn" size="22" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-black text-[#163026] text-[16px] leading-snug truncate group-hover:text-[#d87939] transition-colors">
                    {{ item.name_farms }}
                  </h3>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span class="px-2 py-0.5 rounded-[6px] bg-[#d87939]/10 text-[#d87939] text-[10.5px] font-bold border border-[#d87939]/20 truncate">
                      {{ item.barn_unit || 'โรงเรือนหลัก (Unit 1)' }}
                    </span>
                    <span v-if="item.owner_name" class="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 truncate">
                      {{ item.owner_name }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- IoT Status Pill -->
              <div class="flex-shrink-0">
                <span 
                  v-if="item.total_devices > 0" 
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                  :class="item.device_status === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'">
                  <span class="w-1.5 h-1.5 rounded-full" :class="item.device_status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'"></span>
                  {{ item.device_status === 'online' ? 'Online' : 'Offline' }}
                  <span v-if="item.total_devices > 1" class="text-[9.5px] font-mono font-bold bg-blue-100 text-blue-800 px-1 rounded">
                    {{ item.total_devices }} ตัว
                  </span>
                </span>
                <span 
                  v-else 
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <v-icon icon="mdi-lan-disconnect" size="13" />
                  ไม่มีอุปกรณ์
                </span>
              </div>
            </div>

            <!-- Large Centered THI Display -->
            <div class="bg-gradient-to-b from-[#f8faf9] to-[#ffffff] rounded-[20px] p-4 text-center border border-[#e5ece9]/80 flex flex-col items-center justify-center shadow-inner">
              <span class="text-[11px] font-black text-[#718078] uppercase tracking-wider mb-1">
                ดัชนี THI ปัจจุบัน
              </span>
              <div class="text-[44px] font-black tabular-nums leading-none tracking-tight my-1" :class="item.thi ? getThiStatus(item.thi).textClass : 'text-gray-400'">
                {{ item.thi ? Number(item.thi).toFixed(1) : '--' }}
              </div>
              <span v-if="item.thi"
                class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black border tracking-wide mt-1"
                :class="getThiStatus(item.thi).badgeClass">
                <span class="w-1.5 h-1.5 rounded-full" :class="getThiStatus(item.thi).dotClass"></span>
                {{ getThiStatus(item.thi).label }}
              </span>
              <span v-else-if="item.total_devices > 0" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mt-1">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                รอรับสัญญาณแรก
              </span>
              <span v-else class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200 mt-1">
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                ยังไม่ผูกอุปกรณ์
              </span>
            </div>

            <!-- Microclimate Dual Row (Temp & Humidity) -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Temperature Box -->
              <div class="p-3 bg-[#f8faf9] rounded-[16px] border border-[#e5ece9]/70">
                <div class="flex items-center gap-1.5 text-[#718078] text-[11px] font-bold mb-1">
                  <v-icon icon="mdi-thermometer" size="15" class="text-[#d87939]" />
                  <span>อุณหภูมิ</span>
                </div>
                <div class="text-sm font-extrabold text-[#163026] tabular-nums">
                  <span v-if="item.temperature_c">{{ Number(item.temperature_c).toFixed(1) }} <span class="text-xs text-[#718078]">°C</span></span>
                  <span v-else class="text-[#a6b5aa]">--</span>
                </div>
              </div>

              <!-- Humidity Box -->
              <div class="p-3 bg-[#f8faf9] rounded-[16px] border border-[#e5ece9]/70">
                <div class="flex items-center gap-1.5 text-[#718078] text-[11px] font-bold mb-1">
                  <v-icon icon="mdi-water-percent" size="16" class="text-sky-600" />
                  <span>ความชื้น</span>
                </div>
                <div class="text-sm font-extrabold text-[#163026] tabular-nums">
                  <span v-if="item.humidity_pct">{{ Number(item.humidity_pct).toFixed(1) }} <span class="text-xs text-[#718078]">%</span></span>
                  <span v-else class="text-[#a6b5aa]">--</span>
                </div>
              </div>
            </div>

            <!-- Device Code & Barn Meta Note -->
            <div class="text-[11px] text-[#718078] font-mono flex items-center justify-between px-1">
              <span>{{ item.serial_no ? 'SN: ' + item.serial_no : 'SN: ไม่ระบุ' }}</span>
              <span v-if="item.cooling_system" class="text-[10.5px] font-sans px-2 py-0.5 rounded-md bg-[#edf3ed] text-[#163026]">
                {{ item.cooling_system }}
              </span>
            </div>

          </div>

          <!-- Bento Card Footer Actions -->
          <div class="p-4 bg-[#fafcfb] border-t border-[#f0f4f2] flex items-center gap-2">
            <!-- Link to Detail Cockpit -->
            <NuxtLink
              :to="'/Admin/farm_detail-' + item.id_farms"
              class="flex-1 py-2.5 px-3 rounded-[14px] bg-[#163026] hover:bg-[#0f221b] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(22,48,38,0.15)] hover:shadow-[0_6px_16px_rgba(22,48,38,0.25)] transition-all cursor-pointer">
              <v-icon icon="mdi-view-dashboard-outline" size="15" />
              <span>เข้าสู่หน้าควบคุมฟาร์ม</span>
            </NuxtLink>

            <!-- Edit Button -->
            <button
              type="button"
              @click="openEditModal(item)"
              title="แก้ไขข้อมูลฟาร์ม"
              class="w-9 h-9 rounded-[14px] bg-white border border-[#e5ece9] hover:bg-amber-50 hover:border-amber-200 text-[#718078] hover:text-amber-700 flex items-center justify-center shadow-sm transition-all cursor-pointer">
              <v-icon icon="mdi-pencil-outline" size="16" />
            </button>

            <!-- Delete Button -->
            <button
              type="button"
              @click="openDeleteDialog(item)"
              title="ลบฟาร์มนี้"
              class="w-9 h-9 rounded-[14px] bg-white border border-[#e5ece9] hover:bg-rose-50 hover:border-rose-200 text-[#718078] hover:text-rose-700 flex items-center justify-center shadow-sm transition-all cursor-pointer">
              <v-icon icon="mdi-trash-can-outline" size="16" />
            </button>
          </div>

        </div>

      </div>

      <!-- Empty State Grid -->
      <div v-else-if="!isLoading" class="bg-white/80 backdrop-blur-xl rounded-[28px] p-12 text-center flex flex-col items-center justify-center border border-white/90 shadow-[0_8px_30px_rgba(36,67,58,0.04)]">
        <div class="w-16 h-16 rounded-full bg-[#edf3ed] flex items-center justify-center text-[#a6b5aa] mb-4">
          <v-icon icon="mdi-barn" size="32" />
        </div>
        <h4 class="text-[#163026] font-black text-[16px]">ไม่พบข้อมูลฟาร์ม</h4>
        <p class="text-[#718078] text-[13px] mt-1 mb-4">
          {{ searchQuery ? 'ไม่พบฟาร์มที่ตรงกับคำค้นหา "' + searchQuery + '"' : 'ไม่มีรายการฟาร์มในสถานะตัวกรองนี้' }}
        </p>
        <button 
          @click="resetFilters"
          class="px-5 py-2 rounded-xl bg-[#163026] text-white text-xs font-bold hover:bg-[#0f221b] transition-all cursor-pointer shadow-sm">
          ล้างตัวกรองทั้งหมด
        </button>
      </div>
    </div>

    <!-- Loading State Overlay -->
    <div v-if="isLoading && farmData.length === 0" class="p-16 text-center flex flex-col items-center justify-center bg-white/70 backdrop-blur-xl rounded-[28px] border border-white/90 shadow-sm">
      <v-icon icon="mdi-loading" size="36" class="animate-spin text-[#163026] mb-3" />
      <p class="text-sm font-bold text-[#163026]">กำลังโหลดข้อมูลฟาร์มและ IoT Telemetry...</p>
    </div>

    <!-- 🟢 5. Dialogs & Modals Integration -->
    
    <!-- Add Farm Modal -->
    <AdminAddFarmModal 
      v-model="isAddModalOpen" 
      @success="handleFarmAdded" 
    />

    <!-- Edit Farm Modal -->
    <AdminEditFarmModal 
      v-model="isEditModalOpen" 
      :farm="selectedFarm" 
      @updated="handleFarmUpdated" 
      @deleted="handleFarmDeleted" 
    />

    <!-- 🔴 Custom Delete Confirmation Dialog (Replacing native confirm) -->
    <v-dialog v-model="isDeleteConfirmOpen" max-width="440" persistent transition="dialog-bottom-transition">
      <div class="bg-white rounded-[28px] overflow-hidden shadow-[0_25px_70px_rgba(225,29,72,0.18)] border border-rose-100 font-sans">
        
        <!-- Top Accent Danger Line -->
        <div class="h-1.5 bg-gradient-to-r from-rose-500 to-amber-500 w-full"></div>

        <div class="p-6 md:p-8 text-center relative overflow-hidden">
          <div class="w-16 h-16 rounded-[20px] bg-rose-50 border border-rose-100 text-rose-500 mx-auto flex items-center justify-center mb-4 shadow-sm">
            <v-icon icon="mdi-trash-can-alert-outline" size="30" class="text-rose-500" />
          </div>

          <h3 class="text-lg font-black text-[#163026] tracking-tight mb-2">
            ยืนยันการลบข้อมูลฟาร์ม
          </h3>
          <p class="text-xs text-[#718078] font-medium max-w-xs mx-auto mb-3">
            คุณแน่ใจหรือไม่ว่าต้องการลบฟาร์มนี้ออกจากระบบเครือข่ายอย่างถาวร?
          </p>

          <!-- Farm Target Chip -->
          <div class="bg-[#f8faf9] border border-[#e5ece9] py-2.5 px-4 rounded-[14px] inline-flex items-center gap-2.5 my-1 max-w-full">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span class="text-sm font-black text-[#163026] truncate">
              {{ farmToDelete?.name_farms || 'ฟาร์มที่เลือก' }}
            </span>
          </div>

          <p class="text-[11px] text-rose-500 font-semibold mt-3">
            * การลบฟาร์มจะยกเลิกการผูกอุปกรณ์ IoT และประวัติ Telemetry ที่เกี่ยวข้อง
          </p>
        </div>

        <!-- Footer Buttons -->
        <div class="p-4 bg-[#fafcfb] border-t border-[#eef2f0] flex items-center justify-end gap-2.5">
          <button 
            type="button" 
            @click="isDeleteConfirmOpen = false" 
            :disabled="isDeleting"
            class="px-4 py-2 rounded-[14px] text-xs font-bold text-[#718078] hover:text-[#163026] hover:bg-[#edf3ed] transition-all cursor-pointer">
            ยกเลิก
          </button>
          <button 
            type="button" 
            @click="confirmDeleteFarm" 
            :disabled="isDeleting"
            class="px-5 py-2 rounded-[14px] text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-[0_4px_14px_rgba(225,29,72,0.25)] hover:shadow-[0_6px_18px_rgba(225,29,72,0.35)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <v-icon v-if="isDeleting" icon="mdi-loading" class="animate-spin" size="16" />
            <v-icon v-else icon="mdi-trash-can-outline" size="16" />
            <span>{{ isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ' }}</span>
          </button>
        </div>

      </div>
    </v-dialog>

    <!-- 🟢 Custom Feedback Snackbar (Replacing native alerts) -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3200"
      rounded="pill"
      location="top right"
      elevation="6"
    >
      <div class="flex items-center gap-2 text-xs font-bold">
        <v-icon 
          :icon="snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'" 
          size="18" 
          class="text-white" 
        />
        <span>{{ snackbar.text }}</span>
      </div>
    </v-snackbar>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { Admin } from '~/API/baseAPI'
import AdminAddFarmModal from '~/components/Admin/farm/AddFarmModal.vue'
import AdminEditFarmModal from '~/components/Admin/farm/EditFarmModal.vue'

definePageMeta({
  layout: 'admin',
  alias: ['/Admin/farms']
})

useHead({ title: 'Network Farm Roster | CowCare AI' })

// Reactive Data State
const farmData = ref([])
const isLoading = ref(false)
const isLiveSync = ref(true)
let syncInterval = null

// View & Filter States
const viewMode = ref('table') // 'table' | 'grid'
const searchQuery = ref('')
const currentFilter = ref('all') // 'all' | 'comfort' | 'warning' | 'severe'
const statusTab = ref('all') // 'all' | 'active' | 'pending'

// Modals & Dialogs States
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const selectedFarm = ref(null)

const isDeleteConfirmOpen = ref(false)
const farmToDelete = ref(null)
const isDeleting = ref(false)

// Custom Snackbar Feedback State
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
})

const showSnackbar = (text, color = 'success') => {
  snackbar.value = {
    show: true,
    text,
    color
  }
}

// Token helper
const getToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

// THI Computation Helper
const getThiNumber = (val) => {
  if (val === null || val === undefined || val === '') return null
  const num = parseFloat(val)
  return isNaN(num) ? null : num
}

const getThiStatus = (val) => {
  const thi = getThiNumber(val)
  if (thi === null) {
    return {
      label: 'ไม่มีข้อมูล',
      level: 'none',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      dotClass: 'bg-gray-400',
      textClass: 'text-gray-400',
      barClass: 'bg-gray-300'
    }
  }
  if (thi < 76.0) {
    return {
      label: 'ปกติ (Comfort)',
      level: 'comfort',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-600',
      barClass: 'bg-emerald-500'
    }
  }
  if (thi < 80.0) {
    return {
      label: 'เฝ้าระวัง (Mild)',
      level: 'mild',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-600',
      barClass: 'bg-amber-500'
    }
  }
  if (thi < 84.0) {
    return {
      label: 'เริ่มกระทบ (Moderate)',
      level: 'moderate',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      dotClass: 'bg-orange-500',
      textClass: 'text-orange-600',
      barClass: 'bg-orange-500'
    }
  }
  return {
    label: 'วิกฤต (Severe)',
    level: 'severe',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-600',
    barClass: 'bg-rose-500'
  }
}

// Summary KPIs & Status Counts
const onlineFarmsCount = computed(() => {
  return farmData.value.filter(f => f.device_status === 'online').length
})

const activeFarmsCount = computed(() => {
  return farmData.value.filter(f => f.id_devices && f.id_sensor_readings && f.device_status === 'online').length
})

const pendingFarmsCount = computed(() => {
  return farmData.value.filter(f => !f.id_devices || !f.id_sensor_readings || f.device_status !== 'online').length
})

const countComfort = computed(() => {
  return farmData.value.filter(f => {
    const t = getThiNumber(f.thi)
    return t !== null && t < 76.0
  }).length
})

const countWarning = computed(() => {
  return farmData.value.filter(f => {
    const t = getThiNumber(f.thi)
    return t !== null && t >= 76.0 && t < 84.0
  }).length
})

const countSevere = computed(() => {
  return farmData.value.filter(f => {
    const t = getThiNumber(f.thi)
    return t !== null && t >= 84.0
  }).length
})

// Filtered Farms Computed
const filteredFarms = computed(() => {
  return farmData.value.filter(item => {
    // 0. Status Category Tab Matching
    if (statusTab.value === 'active') {
      if (!item.id_devices || !item.id_sensor_readings || item.device_status !== 'online') return false
    } else if (statusTab.value === 'pending') {
      if (item.id_devices && item.id_sensor_readings && item.device_status === 'online') return false
    }

    // 1. Filter Strip Matching
    if (currentFilter.value === 'comfort') {
      const t = getThiNumber(item.thi)
      if (t === null || t >= 76.0) return false
    } else if (currentFilter.value === 'warning') {
      const t = getThiNumber(item.thi)
      if (t === null || t < 76.0 || t >= 84.0) return false
    } else if (currentFilter.value === 'severe') {
      const t = getThiNumber(item.thi)
      if (t === null || t < 84.0) return false
    }

    // 2. Search Query Matching
    if (!searchQuery.value || !searchQuery.value.trim()) return true
    const q = searchQuery.value.trim().toLowerCase()
    const nameMatch = (item.name_farms || '').toLowerCase().includes(q)
    const barnMatch = (item.barn_unit || '').toLowerCase().includes(q)
    const ownerMatch = (item.owner_name || '').toLowerCase().includes(q)
    const provinceMatch = (item.province || '').toLowerCase().includes(q)
    const districtMatch = (item.district || '').toLowerCase().includes(q)
    const serialMatch = (item.serial_no || '').toLowerCase().includes(q)
    const deviceMatch = (item.name_devices || '').toLowerCase().includes(q)

    return nameMatch || barnMatch || ownerMatch || provinceMatch || districtMatch || serialMatch || deviceMatch
  })
})

// Reset Filters
const resetFilters = () => {
  currentFilter.value = 'all'
  statusTab.value = 'all'
  searchQuery.value = ''
}

// Fetch Farms Telemetry Roster
const fetchFarms = async (showLoading = true) => {
  if (showLoading) isLoading.value = true
  try {
    const token = getToken()
    const res = await axios.get(`${Admin}/farms/all`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data && res.data.rows) {
      farmData.value = res.data.rows
    }
  } catch (err) {
    console.error('[Fetch Farms Roster Error]:', err)
  } finally {
    if (showLoading) isLoading.value = false
  }
}

// Modal Handlers
const openEditModal = (farm) => {
  selectedFarm.value = farm
  isEditModalOpen.value = true
}

const handleFarmAdded = () => {
  fetchFarms(false)
  showSnackbar('เพิ่มฟาร์มใหม่สำเร็จเรียบร้อยแล้ว', 'success')
}

const handleFarmUpdated = () => {
  fetchFarms(false)
  showSnackbar('อัปเดตข้อมูลฟาร์มสำเร็จเรียบร้อยแล้ว', 'success')
}

const handleFarmDeleted = () => {
  fetchFarms(false)
  showSnackbar('ลบข้อมูลฟาร์มสำเร็จเรียบร้อยแล้ว', 'success')
}

// Delete Confirmation Dialog Handlers
const openDeleteDialog = (farm) => {
  farmToDelete.value = farm
  isDeleteConfirmOpen.value = true
}

const confirmDeleteFarm = async () => {
  if (!farmToDelete.value?.id_farms) return
  isDeleting.value = true
  try {
    const token = getToken()
    const res = await axios.delete(`${Admin}/farms/${farmToDelete.value.id_farms}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (res.data?.success) {
      showSnackbar(res.data.message || 'ลบข้อมูลฟาร์มสำเร็จ!', 'success')
      fetchFarms(false)
    } else {
      showSnackbar(res.data?.message || 'เกิดข้อผิดพลาดในการลบฟาร์ม', 'error')
    }
  } catch (err) {
    console.error('[Delete Farm Error]:', err)
    showSnackbar(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบฟาร์ม', 'error')
  } finally {
    isDeleting.value = false
    isDeleteConfirmOpen.value = false
    farmToDelete.value = null
  }
}

// Live Sync Timer Controls
const toggleLiveSync = () => {
  isLiveSync.value = !isLiveSync.value
  if (isLiveSync.value) {
    startLiveSync()
    showSnackbar('เปิดการอัปเดตข้อมูลอัตโนมัติ (Live Telemetry 8s)', 'success')
  } else {
    stopLiveSync()
    showSnackbar('หยุดการอัปเดตข้อมูลอัตโนมัติชั่วคราว', 'info')
  }
}

const startLiveSync = () => {
  stopLiveSync()
  syncInterval = setInterval(() => {
    fetchFarms(false)
  }, 8000)
}

const stopLiveSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// Lifecycle Hooks
onMounted(() => {
  fetchFarms(true)
  if (isLiveSync.value) {
    startLiveSync()
  }
})

onUnmounted(() => {
  stopLiveSync()
})
</script>

<style scoped>
/* 🟢 Minimalist Search Input */
:deep(.farm-vsearch-input .v-field) {
  border-radius: 16px !important;
  background-color: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid #e5ece9 !important;
  box-shadow: 0 1px 3px rgba(22, 48, 38, 0.04) !important;
  transition: all 0.2s ease !important;
}

:deep(.farm-vsearch-input .v-field--focused) {
  border-color: #163026 !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(22, 48, 38, 0.08) !important;
}

:deep(.farm-vsearch-input .v-field__outline) {
  display: none !important;
}

:deep(.farm-vsearch-input input) {
  font-size: 13.5px !important;
  font-weight: 500 !important;
  color: #163026 !important;
  padding-top: 7px !important;
  padding-bottom: 7px !important;
}

/* 🟢 Borderless Glass Table Styling */
:deep(.modern-farm-vtable) {
  background: transparent !important;
}

:deep(.modern-farm-vtable .v-table__wrapper) {
  overflow-x: auto !important;
}

:deep(.modern-farm-vtable table) {
  width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
}

:deep(.modern-farm-vtable th) {
  background-color: transparent !important;
}
</style>
