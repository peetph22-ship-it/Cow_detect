<template>
  <div class="login-page font-sans text-[#142820] selection:bg-[#D87939]/15 selection:text-[#142820]">
    
    <section class="login-shell">
      <!-- 🌟 Ambient Glow Effects ดั้งเดิม -->
      <span class="ambient ambient-one" />
      <span class="ambient ambient-two" />

      <!-- Top Floating Navigation Bar -->
      <header class="w-full max-w-[1280px] mx-auto px-4 sm:px-8 pt-6 pb-2 flex items-center justify-between relative z-10">
        <NuxtLink to="/" class="flex items-center gap-3 group text-decoration-none">
          <div class="w-9 h-9 rounded-xl bg-[#142820] flex items-center justify-center shadow-sm group-hover:bg-[#D87939] transition-colors duration-300">
            <img src="/images/logo/logo1.png" alt="CowCare AI" class="h-5 w-auto object-contain brightness-0 invert" />
          </div>
          <div class="flex flex-col">
            <span class="text-[15px] font-extrabold tracking-tight text-[#142820] leading-none">
              CowCare <span class="text-[#D87939]">AI</span>
            </span>
            <span class="text-[9px] font-bold tracking-[0.16em] text-[#52675D] uppercase mt-1">
              PH Detection System
            </span>
          </div>
        </NuxtLink>

        <NuxtLink 
          to="/" 
          class="px-4 py-2 rounded-full bg-white/85 backdrop-blur-md border border-[#142820]/10 hover:bg-white text-[#142820] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs text-decoration-none">
          <v-icon icon="mdi-arrow-left" size="15" />
          <span>กลับสู่หน้าหลัก</span>
        </NuxtLink>
      </header>

      <!-- Main Centered Split Glass Card -->
      <div class="w-full max-w-[980px] mx-auto my-auto px-4 py-8 relative z-10 flex items-center justify-center">
        <div class="w-full bg-[#FFFDF7]/90 backdrop-blur-xl rounded-[32px] border border-white/90 shadow-[0_30px_70px_rgba(36,67,58,0.18)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 card-enter">
          
          <!-- =============================================================== -->
          <!-- ฝั่งซ้าย: ฟอร์มเข้าสู่ระบบ (7 Cols)                              -->
          <!-- =============================================================== -->
          <div class="lg:col-span-7 p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
            
            <div class="mb-7">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#24433a]/10 text-[10px] font-extrabold tracking-wider text-[#d87939] uppercase mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#d87939]"></span>
                PH DETECTION SYSTEM
              </div>
              <h1 class="text-2xl sm:text-3xl font-extrabold text-[#24433a] tracking-tight">
                เข้าสู่ระบบ
              </h1>
              <p class="text-xs sm:text-sm text-[#5A6B63] mt-1.5">
                กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบเฝ้าระวังความเครียดความร้อนโคนม
              </p>
            </div>

            <!-- Error Alert Box -->
            <Transition name="fade">
              <div 
                v-if="errorMessage" 
                class="mb-5 p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <v-icon icon="mdi-alert-circle-outline" size="18" class="text-rose-600 shrink-0" />
                  <span>{{ errorMessage }}</span>
                </div>
                <button 
                  type="button" 
                  @click="errorMessage = ''" 
                  class="w-6 h-6 rounded-lg hover:bg-rose-100 flex items-center justify-center text-rose-500 cursor-pointer">
                  <v-icon icon="mdi-close" size="15" />
                </button>
              </div>
            </Transition>

            <!-- Login Form -->
            <form @submit.prevent="Login" class="space-y-4">
              
              <!-- Email Input -->
              <div>
                <label for="email-input" class="block text-xs font-bold text-[#24433a] mb-1.5">
                  Email:
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64766d] pointer-events-none">
                    <v-icon icon="mdi-email-outline" size="18" />
                  </span>
                  <input
                    id="email-input"
                    v-model.trim="email"
                    type="email"
                    required
                    autocomplete="email"
                    placeholder="name@example.com"
                    class="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/90 border border-[#24433a]/15 text-sm text-[#24433a] placeholder-[#8C9B93] focus:bg-white focus:outline-none focus:border-[#24433a] focus:ring-3 focus:ring-[#24433a]/10 transition-all"
                  />
                </div>
              </div>

              <!-- Password Input -->
              <div>
                <label for="password-input" class="block text-xs font-bold text-[#24433a] mb-1.5">
                  Password:
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64766d] pointer-events-none">
                    <v-icon icon="mdi-lock-outline" size="18" />
                  </span>
                  <input
                    id="password-input"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    autocomplete="current-password"
                    placeholder="กรอกรหัสผ่านของคุณ"
                    class="w-full pl-10 pr-11 py-3 rounded-2xl bg-white/90 border border-[#24433a]/15 text-sm text-[#24433a] placeholder-[#8C9B93] focus:bg-white focus:outline-none focus:border-[#24433a] focus:ring-3 focus:ring-[#24433a]/10 transition-all"
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64766d] hover:text-[#24433a] cursor-pointer"
                    :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'">
                    <v-icon :icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" size="18" />
                  </button>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="pt-3">
                <button
                  type="submit"
                  :disabled="loading"
                  class="w-full py-3.5 px-6 rounded-full bg-[#24433a] hover:bg-[#d87939] disabled:opacity-60 text-[#fffdf7] font-extrabold text-sm shadow-[0_10px_24px_rgba(36,67,58,0.22)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer group">
                  <v-progress-circular
                    v-if="loading"
                    indeterminate
                    size="18"
                    width="2"
                    color="white"
                  />
                  <span>{{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}</span>
                  <v-icon 
                    v-if="!loading" 
                    icon="mdi-arrow-right" 
                    size="17" 
                    class="group-hover:translate-x-1 transition-transform" 
                  />
                </button>
              </div>

            </form>

            <!-- Back Link & Role Info -->
            <div class="mt-7 pt-5 border-t border-[#24433a]/10 flex items-center justify-between text-xs text-[#64766d]">
              <NuxtLink to="/" class="font-bold hover:text-[#d87939] transition-colors flex items-center gap-1 text-decoration-none">
                <v-icon size="15" icon="mdi-arrow-left" />
                <span>กลับสู่หน้าหลัก</span>
              </NuxtLink>
              <span class="text-[11px] font-semibold">Admin • Expert • Farmer</span>
            </div>

          </div>

          <!-- =============================================================== -->
          <!-- ฝั่งขวา: แผงข้อมูลไฮไลต์ระบบ (5 Cols)                           -->
          <!-- =============================================================== -->
          <div class="lg:col-span-5 bg-[#24433a]/95 text-white p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            <div class="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-[#d87939]/25 blur-3xl pointer-events-none"></div>

            <div class="relative z-10 space-y-4">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#F2BD7C] text-[10px] font-bold tracking-wider uppercase">
                <span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                Heat Stress Intelligence
              </div>

              <h2 class="text-xl sm:text-2xl font-extrabold leading-snug text-white">
                ดูแลโคนมเชิงรุกด้วย Multimodal AI
              </h2>
              <p class="text-xs text-white/75 leading-relaxed">
                เชื่อมโยงเซนเซอร์ SHT40 (RS485), กล้องตรวจจับพฤติกรรม YOLO26m และโมเดลพยากรณ์ LSTM แจ้งเตือนล่วงหน้า 3–7 วัน
              </p>
            </div>

            <!-- Mini Telemetry Cards -->
            <div class="relative z-10 space-y-3 my-6">
              <div class="p-4 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-xs">
                <div class="flex items-center justify-between text-[11px] text-white/60 mb-1">
                  <span>เกณฑ์วิกฤตโคนมลูกผสมไทย</span>
                  <span class="text-[#10B981] font-mono font-bold">NRC 1971</span>
                </div>
                <div class="flex items-baseline justify-between">
                  <span class="text-2xl font-black text-white tabular-nums">THI 76.0</span>
                  <span class="text-xs text-[#F2BD7C] font-bold">ป้องกัน 5-Day Lag Effect</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-3.5 rounded-2xl bg-white/8 border border-white/10">
                  <span class="text-[10px] text-white/60 block">ความแม่นยำ LSTM</span>
                  <span class="text-lg font-extrabold text-[#10B981] tabular-nums mt-0.5 block">96.08%</span>
                </div>
                <div class="p-3.5 rounded-2xl bg-white/8 border border-white/10">
                  <span class="text-[10px] text-white/60 block">ลดมีเทนสะสม</span>
                  <span class="text-lg font-extrabold text-[#F2BD7C] tabular-nums mt-0.5 block">-17.5%</span>
                </div>
              </div>
            </div>

            <div class="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
              <span>ESP32-S3 • SHT40 • YOLO26m</span>
              <span class="text-white/90 font-bold">CowCare AI</span>
            </div>
          </div>

        </div>
      </div>

    </section>

    <AppFooter />

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import auth from '../API/auth'

definePageMeta({
  layout: false
})

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const Login = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const res = await auth.login({
      email: email.value,
      password: password.value,
    })
    console.log('API Response:', res.data)
    localStorage.setItem('token', res.data.token)
    if (res.data.user) {
      localStorage.setItem('user', JSON.stringify(res.data.user))
    }
    const useRole = res.data.user?.role
    if (useRole === 'admin') await navigateTo('/Admin')
    else if (useRole === 'farmer') await navigateTo('/Farmer')
    else await navigateTo('/Admin')
  } catch (err: any) {
    console.log('Login False!', err)
    errorMessage.value = err.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

useHead({ title: 'เข้าสู่ระบบ | PH Detection System' })
</script>

<style scoped>
:global(html) {
  scroll-behavior: auto;
}

:global(body) {
  background: #fffdf7;
  color: #24433a;
}

.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fffdf7;
}

/* 🎨 พื้นหลังดั้งเดิม (Gradient + /images/bg2.jpg) */
.login-shell {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-image: linear-gradient(rgba(255, 253, 247, 0.80), rgba(255, 253, 247, 0.92)), url('/images/bg2.jpg');
  background-position: center;
  background-size: cover;
  isolation: isolate;
  overflow: hidden;
}


@keyframes drift {
  to {
    transform: translate3d(24px, -15px, 0) scale(1.06);
  }
}

@keyframes cardRise {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.card-enter {
  animation: cardRise 0.55s cubic-bezier(0.22, 0.72, 0.26, 1) both;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>