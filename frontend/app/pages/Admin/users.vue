<template>
  <div class="max-w-[1400px] mx-auto space-y-8 font-sans relative pb-12">

    <!-- 🟢 Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-up">
      <div>
        <h1
          class="text-[32px] md:text-[40px] font-black text-[#24433a] tracking-tight leading-tight mb-2 flex items-center gap-3">
          การจัดการสมาชิก
          <span
            class="px-3 py-1 bg-[#d87939]/10 text-[#d87939] rounded-[12px] text-xs font-bold uppercase tracking-wider border border-[#d87939]/20">Users</span>
        </h1>
        <p class="text-[#718078] text-[15px] font-medium max-w-2xl">
          จัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง และข้อมูลการติดต่อของบุคลากรในเครือข่าย
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="isModalOpen = true"
          class="bg-[#24433a] hover:bg-[#1a322b] text-white px-6 py-3.5 rounded-[20px] font-bold shadow-[0_8px_20px_rgba(36,67,58,0.15)] hover:shadow-[0_12px_25px_rgba(36,67,58,0.25)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2.5 text-sm cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4.5 h-4.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          เพิ่มสมาชิกใหม่
        </button>
      </div>
    </div>

    <!-- 🟢 Summary Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up delay-100">

      <!-- Card 1: All Users -->
      <div @click="currentFilter = 'all'"
        class="bg-white/70 backdrop-blur-xl rounded-[28px] p-6 border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group cursor-pointer"
        :class="{ 'ring-2 ring-[#24433a] bg-white': currentFilter === 'all' }">
        <div class="flex items-center justify-between mb-5">
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ผู้ใช้งานทั้งหมด</span>
          <div
            class="w-12 h-12 rounded-[16px] bg-[#24433a]/10 text-[#24433a] flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              class="w-5.5 h-5.5 flex-shrink-0">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
        </div>
        <div>
          <div class="text-[40px] font-black text-[#24433a] leading-none mb-2">{{ users.length }}</div>
          <div
            class="flex items-center text-[12px] font-bold text-[#718078] bg-white w-fit px-2.5 py-1 rounded-[8px] shadow-sm border border-[#24433a]/5">
            บัญชีในระบบ
          </div>
        </div>
      </div>

      <!-- Card 2: Farmers -->
      <div @click="currentFilter = 'farmer'"
        class="bg-white/70 backdrop-blur-xl rounded-[28px] p-6 border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group cursor-pointer"
        :class="{ 'ring-2 ring-emerald-500 bg-white': currentFilter === 'farmer' }">
        <div class="flex items-center justify-between mb-5">
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">เกษตรกร (Farmer)</span>
          <div
            class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              class="w-5.5 h-5.5 flex-shrink-0">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
            </svg>
          </div>
        </div>
        <div>
          <div class="text-[40px] font-black text-[#24433a] leading-none mb-2">{{ countByRole('farmer') }}</div>
          <div
            class="flex items-center text-[12px] font-bold text-emerald-700 bg-emerald-50 w-fit px-2.5 py-1 rounded-[8px] border border-emerald-100">
            เจ้าของฟาร์มเครือข่าย
          </div>
        </div>
      </div>

      <!-- Card 3: Experts/Vets -->
      <div @click="currentFilter = 'expert'"
        class="bg-white/70 backdrop-blur-xl rounded-[28px] p-6 border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group cursor-pointer"
        :class="{ 'ring-2 ring-blue-500 bg-white': currentFilter === 'expert' }">
        <div class="flex items-center justify-between mb-5">
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ผู้เชี่ยวชาญ/หมอ</span>
          <div
            class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              class="w-5.5 h-5.5 flex-shrink-0">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
        </div>
        <div>
          <div class="text-[40px] font-black text-[#24433a] leading-none mb-2">{{ countByRole('expert') }}</div>
          <div
            class="flex items-center text-[12px] font-bold text-blue-700 bg-blue-50 w-fit px-2.5 py-1 rounded-[8px] border border-blue-100">
            ทีมสนับสนุนสุขภาพ
          </div>
        </div>
      </div>

      <!-- Card 4: Admins -->
      <div @click="currentFilter = 'admin'"
        class="bg-white/70 backdrop-blur-xl rounded-[28px] p-6 border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(36,67,58,0.08)] transition-all duration-500 group cursor-pointer"
        :class="{ 'ring-2 ring-purple-500 bg-white': currentFilter === 'admin' }">
        <div class="flex items-center justify-between mb-5">
          <span class="text-[11px] font-black text-[#718078] uppercase tracking-[0.1em]">ผู้ดูแลระบบ (Admin)</span>
          <div
            class="w-12 h-12 rounded-[16px] bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              class="w-5.5 h-5.5 flex-shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
        </div>
        <div>
          <div class="text-[40px] font-black text-[#24433a] leading-none mb-2">{{ countByRole('admin') }}</div>
          <div
            class="flex items-center text-[12px] font-bold text-purple-700 bg-purple-50 w-fit px-2.5 py-1 rounded-[8px] border border-purple-100">
            สิทธิ์ควบคุมสูงสุด
          </div>
        </div>
      </div>
    </div>

    <!-- 🟢 Filter Tabs & Search Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fade-up delay-200">

      <!-- Pill Tabs -->
      <div class="flex items-center gap-2 max-w-full overflow-x-auto pb-1 -mb-1">
        <button v-for="filter in filterOptions" :key="filter.value" @click="currentFilter = filter.value" :class="[
          'group flex items-center gap-2.5 pl-3.5 pr-2.5 py-2 rounded-full text-[13.5px] font-bold transition-all duration-300 whitespace-nowrap flex-shrink-0 cursor-pointer select-none border',
          currentFilter === filter.value
            ? 'bg-[#24433a] text-white border-[#24433a] shadow-[0_8px_20px_rgba(36,67,58,0.22)] -translate-y-0.5'
            : 'bg-white/80 backdrop-blur text-[#4e6057] border-[#e5ece9] hover:border-[#24433a]/30 hover:bg-white hover:-translate-y-0.5'
        ]">
          <span :class="['w-2 h-2 rounded-full flex-shrink-0 transition-colors', filterDot(filter.value, currentFilter === filter.value)]"></span>
          <span>{{ filter.label }}</span>
          <span :class="[
            'min-w-[24px] text-center px-2 py-0.5 rounded-full text-[11px] font-black transition-colors',
            currentFilter === filter.value
              ? 'bg-white/20 text-white'
              : 'bg-[#f1f5f3] text-[#718078] group-hover:bg-[#e5ece9]'
          ]">
            {{ filter.count }}
          </span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full lg:w-[340px]">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a6b5aa]">
          <v-icon icon="mdi-magnify" size="18" class="text-[#a6b5aa]" />
        </div>
        <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล หรือสังกัด..."
          class="w-full bg-white/80 backdrop-blur border border-[#e5ece9] rounded-full pl-11 pr-10 py-2.5 text-[13.5px] font-medium text-[#1f3d34] placeholder-[#a6b5aa] shadow-sm hover:border-[#24433a]/30 focus:outline-none focus:bg-white focus:border-[#24433a] focus:ring-4 focus:ring-[#24433a]/8 transition-all">
        <button v-if="searchQuery" @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f1f5f3] hover:bg-[#e5ece9] text-[#718078] hover:text-[#1f3d34] flex items-center justify-center transition-colors cursor-pointer">
          <v-icon icon="mdi-close" size="14" />
        </button>
      </div>
    </div>

    <!-- 🟢 Data Table -->
    <div
      class="bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_8px_30px_rgba(36,67,58,0.04)] overflow-hidden animate-fade-up delay-300 relative">
      <div class="overflow-x-auto p-2">
        <table class="w-full text-left whitespace-nowrap">
          <thead>
            <tr>
              <th
                class="px-6 py-5 text-[12px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#24433a]/5">
                ชื่อ-นามสกุล</th>
              <th
                class="px-6 py-5 text-[12px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#24433a]/5">
                บทบาท (Role)</th>
              <th
                class="px-6 py-5 text-[12px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#24433a]/5">
                ข้อมูลการติดต่อ</th>
              <th
                class="px-6 py-5 text-[12px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#24433a]/5">
                สถานะ</th>
              <th
                class="px-6 py-5 text-[12px] font-black text-[#718078] uppercase tracking-[0.1em] border-b border-[#24433a]/5 text-right">
                จัดการ</th>
            </tr>
          </thead>
          <tbody class="text-[#4e6057]">
            <tr v-for="user in filteredUsers" :key="user.id"
              class="hover:bg-white transition-colors group border-b border-[#24433a]/5 last:border-0">

              <!-- Name & Avatar -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <div
                    class="w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center font-black text-sm text-white shadow-sm flex-shrink-0"
                    :class="getAvatarColor(user.role)">
                    {{ getInitials(user.full_name || user.name) }}
                  </div>
                  <div>
                    <p class="font-black text-[#24433a] text-[14px]">{{ user.full_name || user.name }}</p>
                    <p class="text-[12px] font-medium text-[#718078] mt-0.5">{{ user.organization || user.org || '-' }}</p>
                  </div>
                </div>
              </td>

              <!-- Role Badge -->
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center px-3 py-1.5 rounded-[10px] text-[11px] font-black tracking-wide border"
                  :class="getRoleBadge(user.role)">
                  {{ getRoleName(user.role) }}
                </span>
              </td>

              <!-- Contact -->
              <td class="px-6 py-4">
                <p class="text-[13px] font-bold text-[#4e6057]">{{ user.email || '-' }}</p>
                <p class="text-[12px] text-[#718078] mt-0.5">{{ user.phone || '-' }}</p>
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-[11.5px] font-black border"
                  :class="getStatusBadgeClass(user.status)">
                  <span class="w-1.5 h-1.5 rounded-full" :class="getStatusDotClass(user.status)"></span>
                  {{ getStatusText(user.status) }}
                </span>
              </td>

              <!-- Action -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Edit Button -->
                  <button
                    @click="openEditModal(user)"
                    title="แก้ไขข้อมูล"
                    class="w-8 h-8 rounded-[10px] hover:bg-amber-50 text-[#718078] hover:text-amber-600 inline-flex items-center justify-center transition-all duration-200 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      <path d="m15 5 4 4"/>
                    </svg>
                  </button>

                  <!-- Delete Button -->
                  <button
                    @click="openDeleteDialog(user)"
                    title="ลบผู้ใช้งาน"
                    class="w-8 h-8 rounded-[10px] hover:bg-rose-50 text-[#718078] hover:text-rose-600 inline-flex items-center justify-center transition-all duration-200 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-if="filteredUsers.length === 0" class="p-12 text-center flex flex-col items-center justify-center">
        <div class="w-16 h-16 rounded-full bg-[#edf3ed] flex items-center justify-center text-[#a6b5aa] mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h4 class="text-[#24433a] font-black text-[15px]">ไม่พบข้อมูลสมาชิก</h4>
        <p class="text-[#718078] text-[13px] mt-1 mb-4">ไม่พบรายชื่อที่ตรงกับคำค้นหาหรือบทบาทที่เลือก</p>
        <button @click="resetFilters"
          class="px-4 py-2 rounded-xl bg-[#24433a] text-white text-xs font-bold hover:bg-[#1a322b] transition-all cursor-pointer">
          ล้างตัวกรองทั้งหมด
        </button>
      </div>
    </div>
  </div>

  <!-- 🟢 Add User Modal -->
  <AdminAddUserModal v-model="isModalOpen" @submit="handleAddUser" />

  <!-- 🟢 Edit User Modal -->
  <AdminEditUserModal v-model="isEditModalOpen" :user="selectedUser" @updated="handleUserUpdated" />

  <!-- 🟢 Delete Confirmation Dialog -->
  <v-dialog v-model="isDeleteDialogOpen" max-width="460" persistent transition="dialog-bottom-transition">
    <div class="bg-white rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(225,29,72,0.18)] border border-rose-100 font-sans">
      
      <!-- Top Accent Bar -->
      <div class="h-2 bg-gradient-to-r from-rose-500 to-amber-500 w-full"></div>

      <div class="p-6 md:p-8 text-center relative overflow-hidden">
        <!-- Glow -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-rose-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <!-- Warning Icon Circle -->
        <div class="w-16 h-16 rounded-[22px] bg-rose-50 border border-rose-100 text-rose-500 mx-auto flex items-center justify-center mb-4 shadow-sm">
          <v-icon icon="mdi-trash-can-alert-outline" size="32" class="text-rose-500" />
        </div>

        <h3 class="text-xl font-black text-[#24433a] tracking-tight mb-2">ยืนยันการลบสมาชิก</h3>
        <p class="text-xs text-[#718078] font-medium max-w-xs mx-auto mb-3">
          คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสมาชิกนี้ออกจากระบบอย่างถาวร?
        </p>

        <!-- User Target Chip -->
        <div class="bg-[#f8faf9] border border-[#e5ece9] py-3 px-4 rounded-[16px] inline-flex items-center gap-2.5 my-1 max-w-full">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span class="text-sm font-black text-[#24433a] truncate">
            {{ userToDelete?.full_name || userToDelete?.name || 'ผู้ใช้งานนี้' }}
          </span>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-white text-[#718078] font-bold border border-[#e5ece9]">
            {{ getRoleName(userToDelete?.role) }}
          </span>
        </div>

        <p class="text-[11px] text-rose-500/80 font-bold mt-3">
          * ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนกลับมาได้
        </p>
      </div>

      <!-- Footer Buttons -->
      <div class="p-5 bg-[#fafcfb] border-t border-[#eef2f0] flex items-center justify-end gap-3">
        <button 
          type="button" 
          @click="isDeleteDialogOpen = false" 
          :disabled="isDeleting"
          class="px-5 py-2.5 rounded-[16px] text-sm font-bold text-[#718078] hover:text-[#24433a] hover:bg-[#edf3ed] transition-all cursor-pointer">
          ยกเลิก
        </button>
        <button 
          type="button" 
          @click="confirmDeleteUser" 
          :disabled="isDeleting"
          class="px-6 py-2.5 rounded-[18px] text-sm font-black bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-[0_6px_18px_rgba(225,29,72,0.25)] hover:shadow-[0_10px_22px_rgba(225,29,72,0.35)] hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
          <svg v-if="isDeleting" class="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <v-icon v-else icon="mdi-trash-can-outline" size="18" class="text-white" />
          <span>{{ isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ' }}</span>
        </button>
      </div>

    </div>
  </v-dialog>

</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { api, Admin } from '../../API/baseAPI'

definePageMeta({
  layout: 'admin'
})

useHead({ title: 'User Management | CowCare AI' })
const users = ref([])
const isLoading = ref(false)

// --- State ---
const currentFilter = ref('all')
const searchQuery = ref('')
const isModalOpen = ref(false)

const handleAddUser = (data) => {
  users.value.unshift({
    id: data.id || Date.now(),
    name: data.name,
    full_name: data.name,
    role: data.role,
    org: data.org || "-",
    organization: data.org || "-",
    email: data.email || "-",
    phone: data.phone,
    status: data.status || 'active',
    active: (data.status || 'active') === 'active'
  })
}

// --- Edit User State & Handlers ---
const isEditModalOpen = ref(false)
const selectedUser = ref(null)

const openEditModal = (user) => {
  selectedUser.value = { ...user }
  isEditModalOpen.value = true
}

const handleUserUpdated = (updatedUser) => {
  const idx = users.value.findIndex(u => u.id === updatedUser.id)
  if (idx !== -1) {
    users.value[idx] = { ...users.value[idx], ...updatedUser }
  } else {
    fetchUsers()
  }
}

// --- Delete User State & Handlers ---
const isDeleteDialogOpen = ref(false)
const userToDelete = ref(null)
const isDeleting = ref(false)

const openDeleteDialog = (user) => {
  userToDelete.value = user
  isDeleteDialogOpen.value = true
}

const confirmDeleteUser = async () => {
  if (!userToDelete.value) return
  isDeleting.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const id = userToDelete.value.id

    // ยิง DELETE API: รองรับทั้ง /api/Admin/users/:id และ fallback /api/Admin/users/users/:id
    try {
      await axios.delete(`${api}/Admin/users/${id}`, { headers })
    } catch (delErr) {
      if (delErr.response?.status === 404) {
        await axios.delete(`${api}/Admin/users/users/${id}`, { headers })
      } else {
        throw delErr
      }
    }

    users.value = users.value.filter(u => u.id !== id)
    isDeleteDialogOpen.value = false
    userToDelete.value = null
  } catch (err) {
    console.error("Delete User Error:", err)
    alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน กรุณาลองใหม่อีกครั้ง')
  } finally {
    isDeleting.value = false
  }
}

const isUserActive = (user) => {
  return user?.status === 'active' || user?.active === true
}

const getStatusText = (status) => {
  switch (status) {
    case 'active': return 'Active'
    case 'pending': return 'Pending'
    case 'suspended': return 'Suspended'
    default: return status || 'Inactive'
  }
}

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200/80'
    case 'suspended':
      return 'bg-rose-50 text-rose-700 border-rose-200/80'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

const getStatusDotClass = (status) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-500 animate-pulse-soft'
    case 'pending':
      return 'bg-amber-500'
    case 'suspended':
      return 'bg-rose-500'
    default:
      return 'bg-gray-400'
  }
}

const countByRole = (role) => {
  if (!Array.isArray(users.value)) return 0
  return users.value.filter(u => u.role === role).length
}

const filterOptions = computed(() => [
  { label: 'ทั้งหมด', value: 'all', count: Array.isArray(users.value) ? users.value.length : 0 },
  { label: 'เกษตรกร', value: 'farmer', count: countByRole('farmer') },
  { label: 'ผู้เชี่ยวชาญ/หมอ', value: 'expert', count: countByRole('expert') },
  { label: 'ผู้ดูแลระบบ', value: 'admin', count: countByRole('admin') }
])

const filteredUsers = computed(() => {
  if (!Array.isArray(users.value)) return []
  return users.value.filter(u => {
    const matchesRole = currentFilter.value === 'all' || u.role === currentFilter.value
    const query = searchQuery.value.trim().toLowerCase()
    const name = (u.full_name || u.name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const org = (u.organization || u.org || '').toLowerCase()
    const phone = (u.phone || '').toLowerCase()
    const matchesSearch = !query ||
      name.includes(query) ||
      email.includes(query) ||
      org.includes(query) ||
      phone.includes(query)
    return matchesRole && matchesSearch
  })
})

const filterDot = (value, active) => {
  if (active) return 'bg-white'
  switch (value) {
    case 'farmer': return 'bg-emerald-500'
    case 'expert': return 'bg-blue-500'
    case 'admin': return 'bg-purple-500'
    default: return 'bg-[#a6b5aa]'
  }
}

const resetFilters = () => {
  currentFilter.value = 'all'
  searchQuery.value = ''
}

// --- UI Helpers ---
const getInitials = (name) => {
  if (!name) return 'U'
  const clean = name.replace('น.สพ.', '').replace('สพ.ญ.', '').trim()
  return clean.charAt(0) || 'U'
}

const getAvatarColor = (role) => {
  switch (role) {
    case 'admin': return 'from-purple-500 to-indigo-600'
    case 'expert': return 'from-blue-500 to-cyan-600'
    case 'farmer': return 'from-emerald-500 to-[#d87939]'
    default: return 'from-gray-400 to-gray-500'
  }
}

const getRoleBadge = (role) => {
  switch (role) {
    case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200/60'
    case 'expert': return 'bg-blue-50 text-blue-700 border-blue-200/60'
    case 'farmer': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
    default: return 'bg-gray-50 text-gray-700 border-gray-200/60'
  }
}

const fetchUsers = async () => {
  isLoading.value = true
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    // ลองดึงจาก /api/Admin/users/users (ตาม express router ปัจจุบัน) และ fallback /api/Admin/users
    let m
    try {
      m = await axios.get(`${api}/Admin/users/users`, { headers })
    } catch (routeErr) {
      if (routeErr.response?.status === 404) {
        m = await axios.get(`${api}/Admin/users`, { headers })
      } else {
        throw routeErr
      }
    }

    if (m?.data) {
      if (Array.isArray(m.data.rows)) {
        users.value = m.data.rows
      } else if (Array.isArray(m.data)) {
        users.value = m.data
      } else {
        users.value = []
      }
    }
  } catch (err) {
    console.error("Error!, Fetching Users:", err.response?.data?.message || err.message)
  } finally {
    isLoading.value = false
  }
}

const getRoleName = (role) => {
  switch (role) {
    case 'admin': return 'ผู้ดูแลระบบ (Admin)'
    case 'expert': return 'ผู้เชี่ยวชาญ/สัตวแพทย์'
    case 'farmer': return 'เกษตรกร (Farmer)'
    default: return 'Unknown'
  }
}

onMounted(() => {
  fetchUsers()
})
</script>
