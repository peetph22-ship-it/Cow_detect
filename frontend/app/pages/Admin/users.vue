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

      <!-- Minimalist Segmented Tabs -->
      <div
        class="inline-flex items-center gap-1 bg-[#f4f7f6] p-1.5 rounded-[16px] border border-[#e5ece9] max-w-full overflow-x-auto">
        <button v-for="filter in filterOptions" :key="filter.value" @click="currentFilter = filter.value" :class="[
          'flex items-center gap-2.5 px-4 py-2 rounded-[12px] text-[14px] font-bold transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer select-none',
          currentFilter === filter.value
            ? 'bg-white text-[#1f3d34] border border-[#e5ece9] shadow-sm'
            : 'text-[#64766d] border border-transparent hover:text-[#1f3d34]'
        ]">
          <span>{{ filter.label }}</span>
          <span :class="[
            'px-2 py-0.5 rounded-full text-[11px] font-black transition-colors',
            currentFilter === filter.value
              ? 'bg-[#1f3d34] text-white'
              : 'bg-white text-[#718078] shadow-sm'
          ]">
            {{ filter.count }}
          </span>
        </button>
      </div>

      <!-- Minimalist Search Input Box -->
      <div class="relative w-full lg:w-[320px]">
        <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ, อีเมล หรือสังกัดฟาร์ม..."
          class="w-full bg-white border border-[#e5ece9] rounded-[6px] px-4 py-2.5 text-[14px] font-medium text-[#1f3d34] placeholder-[#a6b5aa] focus:outline-none focus:ring-1 focus:ring-[#1f3d34]/40 transition-colors">
        <button v-if="searchQuery" @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-[#a6b5aa] hover:text-[#1f3d34] p-1 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
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
                    {{ getInitials(user.name) }}
                  </div>
                  <div>
                    <p class="font-black text-[#24433a] text-[14px]">{{ user.name }}</p>
                    <p class="text-[12px] font-medium text-[#718078] mt-0.5">{{ user.org || '-' }}</p>
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
                <p class="text-[13px] font-bold text-[#4e6057]">{{ user.email }}</p>
                <p class="text-[12px] text-[#718078] mt-0.5">{{ user.phone }}</p>
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full"
                    :class="user.active ? 'bg-emerald-500 animate-pulse-soft' : 'bg-gray-400'"></div>
                  <span class="text-[13px] font-bold" :class="user.active ? 'text-[#24433a]' : 'text-[#a6b5aa]'">
                    {{ user.active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </td>

              <!-- Action -->
              <td class="px-6 py-4 text-right">
                <button
                  class="w-8 h-8 rounded-[10px] hover:bg-[#edf3ed] text-[#718078] hover:text-[#24433a] inline-flex items-center justify-center transition-colors cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                  </svg>
                </button>
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

</template>

<script setup>
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'admin'
})

useHead({ title: 'User Management | CowCare AI' })

// --- State ---
const currentFilter = ref('all')
const searchQuery = ref('')
const isModalOpen = ref(false)
const handleAddUser = (data) => {
  users.value.unshift({
    id: Date.now(),
    name: data.name,
    role: data.role,
    org: data.org || "-",
    email: "-",
    phone: data.phone,
    active: true
  })
}


// --- Mock Data ---
const users = ref([])

const countByRole = (role) => {
  return users.value.filter(u => u.role === role).length
}

const filterOptions = computed(() => [
  { label: 'ทั้งหมด', value: 'all', count: users.value.length },
  { label: 'เกษตรกร', value: 'farmer', count: countByRole('farmer') },
  { label: 'ผู้เชี่ยวชาญ/หมอ', value: 'expert', count: countByRole('expert') },
  { label: 'ผู้ดูแลระบบ', value: 'admin', count: countByRole('admin') }
])

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const matchesRole = currentFilter.value === 'all' || u.role === currentFilter.value
    const query = searchQuery.value.trim().toLowerCase()
    const matchesSearch = !query ||
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.org && u.org.toLowerCase().includes(query))
    return matchesRole && matchesSearch
  })
})

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

const getRoleName = (role) => {
  switch (role) {
    case 'admin': return 'ผู้ดูแลระบบ (Admin)'
    case 'expert': return 'ผู้เชี่ยวชาญ/สัตวแพทย์'
    case 'farmer': return 'เกษตรกร (Farmer)'
    default: return 'Unknown'
  }
}
</script>
