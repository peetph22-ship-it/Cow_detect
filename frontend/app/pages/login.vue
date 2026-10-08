<template>
    <div class="login-page">
        <section class="login-shell">
            <!-- Ambient Glow Effects ด้านหลัง -->
            <span class="ambient ambient-one" />
            <span class="ambient ambient-two" />

            <v-container class="login-container">
                <div class="login-card">
                    <div class="login-header text-center">
                        <div class="mx-auto mb-3">
                            <!-- <v-icon icon="mdi-cow" size="32" color="#d87939" /> -->
                            <center><img src="/images/logo/logo1.png" alt="Error Logo!" style="width:30%"></center>
                        </div>
                        <span class="eyebrow">PH Detection System</span>
                        <h1 class="login-title">เข้าสู่ระบบ</h1>
                        <!-- <p class="login-subtitle">PH</p> -->
                    </div>

                    <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4" closable
                        @click:close="errorMessage = ''">
                        {{ errorMessage }}
                    </v-alert>

                    <v-form @submit.prevent="Login">
                        <div class="input-group mb-4">
                            <label class="input-label">Email:</label>
                            <v-text-field v-model="email" placeholder="name@example.com" type="email" variant="outlined"
                                density="comfortable" hide-details="auto" prepend-inner-icon="mdi-email-outline"
                                required class="custom-input" />
                        </div>

                        <div class="input-group mb-5">
                            <label class="input-label">Password:</label>
                            <v-text-field v-model="password" :type="showPassword ? 'text' : 'password'"
                                placeholder="กรอกรหัสผ่านของคุณ" variant="outlined" density="comfortable"
                                hide-details="auto" prepend-inner-icon="mdi-lock-outline"
                                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                                @click:append-inner="showPassword = !showPassword" required class="custom-input" />
                        </div>

                        <v-btn type="submit" block size="large" rounded="pill" class="login-btn mb-4" :loading="loading">
                            เข้าสู่ระบบ
                            <v-icon end icon="mdi-arrow-right" />
                        </v-btn>
                    </v-form>

                    <div class="login-footer text-center">
                        <NuxtLink to="/" class="back-link">
                            <v-icon size="small" icon="mdi-arrow-left" class="mr-1" />
                            กลับสู่หน้าหลัก
                        </NuxtLink>
                    </div>
                </div>
            </v-container>
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
// const role = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const Login = async () => {
    if (!email.value || !password.value) {
        return errorMessage.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    }
    loading.value = true
    errorMessage.value = ''
    try{
        const res = await auth.login({
            email:email.value,
            password:password.value,
        })
        console.log('API Response:',res.data)
        localStorage.setItem('token',res.data.token)
        if (res.data.user) {
            localStorage.setItem('user', JSON.stringify(res.data.user))
        }
        const useRole = res.data.user?.role
        if(useRole === 'admin') await navigateTo('/Admin')
        else if(useRole === 'farmer') await navigateTo('/Farmer')
    }catch(err:any){
        console.log("Login False!",err)
        errorMessage.value = err.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ'
    }finally{
        loading.value = false
    }
}

// const handleLogin = async () => {
//     if (!email.value || !password.value) {
//         errorMessage.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
//         return
//     }

//     loading.value = true
//     errorMessage.value = ''

//     try {
//         // ยิงไปที่ Node.js Backend API
//         const response: any = await $fetch('http://localhost:4001/api/auth/login', {
//             method: 'POST',
//             body: {
//                 email: email.value,
//                 password: password.value
//             }
//         })

//         if (response.success && response.token) {
//             // บันทึก Token ลง Cookie สำหรับใช้งานต่อ
//             const authToken = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 })
//             authToken.value = response.token

//             const authUser = useCookie('auth_user', { maxAge: 60 * 60 * 24 * 7 })
//             authUser.value = JSON.stringify(response.user)

//             // เปลี่ยนเส้นทางไปหน้า Dashboard หรือหน้าแรก
//             router.push('/')
//         } else {
//             errorMessage.value = response.message || 'เข้าสู่ระบบไม่สำเร็จ'
//         }
//     } catch (err: any) {
//         errorMessage.value = err.data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือเซิร์ฟเวอร์ขัดข้อง'
//     } finally {
//         loading.value = false
//     }
// }

useHead({ title: 'เข้าสู่ระบบ | PH Deetection System' })
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
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

/* พื้นหลังดั้งเดิม (Gradient + bg2.jpg) */
.login-shell {
    position: relative;
    flex: 1;
    display: grid;
    place-items: center;
    background-image: linear-gradient(rgba(255, 253, 247, .80), rgba(255, 253, 247, .92)), url('/images/bg2.jpg');
    background-position: center;
    background-size: cover;
    padding: 40px 16px;
    isolation: isolate;
}

/* เอฟเฟกต์ลูกบอลแสง Ambient */
.ambient {
    position: absolute;
    z-index: -1;
    display: block;
    border-radius: 50%;
    filter: blur(2px);
    animation: drift 9s ease-in-out infinite alternate;
}

.ambient-one {
    width: 320px;
    height: 320px;
    top: 10%;
    left: 5%;
    background: rgba(221, 179, 111, .26);
}

.ambient-two {
    width: 280px;
    height: 280px;
    bottom: 8%;
    right: 8%;
    background: rgba(97, 144, 122, .18);
    animation-delay: -4s;
}

/* ตัวการ์ด Glassmorphism */
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
}

.login-card {
    width: 100%;
    max-width: 440px;
    padding: 38px 32px;
    background: rgba(255, 253, 247, .90);
    border: 1px solid rgba(255, 255, 255, .86);
    border-radius: 28px;
    box-shadow: 0 30px 70px rgba(36, 67, 58, .18);
    backdrop-filter: blur(14px);
}

.logo-box {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    background: #faeedf;
    border-radius: 18px;
}

.eyebrow {
    color: #d87939;
    font-size: .68rem;
    font-weight: 850;
    letter-spacing: .12em;
}

.login-title {
    margin: 6px 0 4px;
    color: #24433a;
    font-size: 1.85rem;
    font-weight: 850;
    letter-spacing: -.03em;
}

.login-subtitle {
    color: #64766d;
    font-size: .86rem;
    margin-bottom: 24px;
}

.input-label {
    display: block;
    font-size: .78rem;
    font-weight: 750;
    color: #385549;
    margin-bottom: 6px;
}

.custom-input :deep(.v-field) {
    border-radius: 14px;
    background: #fffdf9;
    border-color: rgba(70, 100, 84, .18);
}

.login-btn {
    background: #24433a !important;
    color: #fffdf7 !important;
    font-weight: 800;
    letter-spacing: .02em;
    box-shadow: 0 10px 24px rgba(36, 67, 58, .22);
}

.back-link {
    display: inline-flex;
    align-items: center;
    color: #64766d;
    font-size: .8rem;
    font-weight: 700;
    text-decoration: none;
    transition: color .2s ease;
}

.back-link:hover {
    color: #d87939;
}



@keyframes drift {
    to {
        transform: translate3d(24px, -15px, 0) scale(1.06);
    }
}
</style>