<template>
  <div class="landing-page">
    <section class="hero section-shell">
      <span class="ambient ambient-one" />
      <span class="ambient ambient-two" />
      <v-container class="hero-grid px-5 px-md-8">
        <div class="hero-copy hero-enter">
          <div class="eyebrow"><span class="pulse-dot" /> PRECISION LIVESTOCK INTELLIGENCE SYSTEM</div>
          <div class="brand-mark">PLIS <span>PRECISION LIVESTOCK INTELLIGENCE</span></div>
          <h1><span>ระบบประเมินและเตือนภัย</span>ความเครียดจากความร้อนในโคนม</h1>
          <p class="hero-description">แพลตฟอร์มบริหารจัดการความเครียดจากความร้อน (Heat Stress) สำหรับฟาร์มโคนมรายย่อย บูรณาการเทคโนโลยีอินเทอร์เน็ตสรรพสิ่ง (IoT) ร่วมกับปัญญาประดิษฐ์ (YOLO และ LSTM) เพื่อวิเคราะห์สภาพแวดล้อมและพฤติกรรมสัตว์ สู่การแจ้งเตือนเชิงรุกเพื่อป้องกันความเสียหายต่อผลผลิตน้ำนม</p>
          <div class="hero-actions">
            <v-btn class="primary-btn" href="#solution" @click.prevent="scrollToSection('#solution')" size="large" rounded="pill" elevation="0">ศึกษาการทำงานของระบบ <v-icon end icon="mdi-arrow-down" /></v-btn>
            <v-btn class="text-btn" href="#research" @click.prevent="scrollToSection('#research')" variant="text" rounded="pill">กรอบแนวคิดและงานวิจัย <v-icon end icon="mdi-arrow-top-right" /></v-btn>
          </div>
          <div class="trust-row">
            <div class="cow-stack"><span>🐄</span><span>🐄</span><span>🐄</span></div>
            <p><strong>ออกแบบตามหลักเกษตรแม่นยำ (Precision Agriculture)</strong><br />มุ่งเน้นการใช้งานจริงสำหรับฟาร์มขนาดกลางและรายย่อย</p>
          </div>
        </div>

        <div class="hero-visual hero-enter-delay" aria-label="ตัวอย่างหน้าจอแสดงผลระบบประเมินภาวะความร้อน">
          <div class="visual-glow" />
          <div class="dashboard-card">
            <div class="dashboard-head">
              <div><span class="mini-label">INTERACTIVE DEMO</span><h2>ลองคำนวณค่า THI</h2></div>
              <span class="live-badge"><i /> ทดสอบด้วยตัวเอง</span>
            </div>
            <div class="risk-panel" :style="{ background: cur.bgColor }">
              <div class="risk-ring" :style="{ borderColor: cur.color }"><strong :style="{ color: cur.color }">{{ rounded }}</strong><small>THI</small></div>
              <div><span class="risk-label" :style="{ color: cur.color }">ระดับความเสี่ยง</span><h3 :style="{ color: cur.color }">{{ cur.name }}</h3><p>{{ cur.note }}</p></div>
            </div>
            <div class="tool-sliders">
              <label>อุณหภูมิ <b>{{ t.toFixed(1) }} °C</b><input v-model.number="t" type="range" min="20" max="40" step="0.5" /></label>
              <label>ความชื้นสัมพัทธ์ <b>{{ rh }} %</b><input v-model.number="rh" type="range" min="30" max="100" /></label>
            </div>
            <div class="scale-section">
              <div class="scale" aria-hidden="true"><i /><i /><i /><b :style="{ left: pos + '%' }" /></div>
              <div class="ticks" aria-hidden="true"><span style="left:33.3%">70</span><span style="left:40%">72</span></div>
            </div>
          </div>
          <div class="float-card behavior-card"><v-icon icon="mdi-video-outline" /><div><small>COMPUTER VISION</small><strong>กำลังวิเคราะห์พฤติกรรม</strong></div></div>
        </div>
      </v-container>
    </section>

    <section class="signal-strip">
      <v-container class="signal-grid px-5 px-md-8">
        <div><span>THI 70</span><p>เกณฑ์เริ่มต้นที่โคนม<br />เริ่มได้รับผลกระทบ</p></div>
        <div><span>5 วัน</span><p>ช่วงเวลาความหน่วงของผลผลิต<br />(Lag Effect ของผลผลิตน้ำนม)</p></div>
        <div><span>14 วัน</span><p>กรอบเวลาข้อมูลย้อนหลัง<br />สำหรับการประมวลผลของ AI</p></div>
        <div><span>3–7 วัน</span><p>ระยะเวลาการเตือนภัยล่วงหน้า<br />เพื่อการจัดการเชิงรุก</p></div>
      </v-container>
    </section>

    <section id="solution" class="content-section section-shell reveal">
      <v-container class="px-5 px-md-8">
        <div class="section-heading">
            <span class="eyebrow">THREE-LAYER ARCHITECTURE</span>
            <h2>สถาปัตยกรรมระบบ 3 ชั้น จากข้อมูลดิบสู่สินทรัพย์สารสนเทศ</h2>
            <p>ออกแบบภายใต้แนวคิด Edge-to-Cloud เพื่อเปลี่ยนข้อมูลด้านสิ่งแวดล้อมและพฤติกรรม ให้กลายเป็นคำแนะนำเชิงปฏิบัติที่มีหลักฐานอ้างอิงชัดเจน</p>
          </div>
        <div class="architecture-map" aria-label="สถาปัตยกรรมระบบ 3 ชั้น">
          <article>
            <span>01</span>
            <v-icon icon="mdi-radar" />
            <h3>Sense (การรับรู้ข้อมูล)</h3>
            <p>ตรวจวัดอุณหภูมิ ความชื้น และความดันบรรยากาศ พร้อมวิเคราะห์พฤติกรรมผ่านกล้องวงจรปิดแบบไม่สัมผัสตัวสัตว์</p>
          </article>
          <i />
          <article>
            <span>02</span>
            <v-icon icon="mdi-lightbulb-on-outline" />
            <h3>Recommend (การวิเคราะห์)</h3>
            <p>ประมวลผลด้วยโมเดล LSTM เพื่อคาดการณ์ความเสี่ยง และสังเคราะห์คำแนะนำที่สอดคล้องกับบริบทฟาร์ม</p>
          </article>
          <i />
          <article>
            <span>03</span>
            <v-icon icon="mdi-file-chart-outline" />
            <h3>Capitalize (การต่อยอด)</h3>
            <p>จัดเก็บข้อมูลเป็น Digital Logbook เพื่อสนับสนุนการบริหารจัดการฟาร์ม การขอสินเชื่อ และการทำประกันภัยอิงดัชนี</p>
          </article>
        </div>
        <div class="feature-grid">
          <article class="feature-card feature-primary"><div class="feature-icon"><v-icon icon="mdi-access-point" /></div><span class="card-number">01</span><h3>ระบบตรวจวัดสิ่งแวดล้อม IoT</h3><p>ใช้งานไมโครคอนโทรลเลอร์ ESP32-S3 ร่วมกับเซนเซอร์ AHT20 และ BMP280 เพื่อเก็บข้อมูลสภาพอากาศทั้งภายในและภายนอกโรงเรือน นำมาคำนวณค่าดัชนี THI อย่างแม่นยำ</p><div class="feature-tags"><span>ESP32-S3</span><span>AHT20</span><span>BMP280</span><span>THI Calculation</span></div></article>
          <article class="feature-card"><div class="feature-icon icon-sand"><v-icon icon="mdi-cctv" /></div><span class="card-number">02</span><h3>ระบบคอมพิวเตอร์วิทัศน์</h3><p>ประยุกต์ใช้โมเดล YOLOv8 เพื่อตรวจจับและติดตามพฤติกรรมบ่งชี้ความเครียด เช่น อัตราการยืน/นอน และการรวมกลุ่มกันบริเวณร่มเงา</p><div class="behavior-bars"><span /><span /><span /><span /></div></article>
          <article class="feature-card"><div class="feature-icon icon-blue"><v-icon icon="mdi-bell-outline" /></div><span class="card-number">03</span><h3>ระบบแจ้งเตือนเชิงรุก</h3><p>ส่งข้อความแจ้งเตือนผ่านช่องทาง LINE พร้อมข้อเสนอแนะในการจัดการฟาร์มที่ทำได้จริงและเหมาะสมตามระดับความรุนแรง</p><div class="mini-alert"><v-icon icon="mdi-check-circle-outline" /> แจ้งเตือนเฉพาะเมื่อข้ามเกณฑ์วิกฤต</div></article>
        </div>
      </v-container>
    </section>

    <section id="lstm" class="ai-section reveal">
      <v-container class="ai-grid px-5 px-md-8">
        <div class="ai-copy"><span class="eyebrow light-eyebrow">PREDICTIVE ANALYTICS</span><h2>การพยากรณ์ล่วงหน้าด้วยโครงข่ายประสาทเทียม <em>LSTM</em></h2><p>เนื่องจากผลกระทบจากความร้อนมีความหน่วงเวลา (Lag Effect) โมเดล LSTM จึงถูกพัฒนาขึ้นเพื่อเรียนรู้ข้อมูลอนุกรมเวลา (Time-series) ย้อนหลัง 14 วัน ช่วยให้ระบบสามารถแจ้งเตือนแนวโน้มความเสี่ยงล่วงหน้าได้ 3–7 วัน</p><div class="ai-stat"><strong>96.08%</strong><span>ความแม่นยำสูงสุดของโมเดล LSTM จากการทบทวนวรรณกรรมและงานวิจัยที่เกี่ยวข้อง<sup>1</sup></span></div></div>
        <div class="lstm-flow">
          <div class="flow-node"><v-icon icon="mdi-thermometer" /><span>อุณหภูมิ</span></div><i />
          <div class="flow-node"><v-icon icon="mdi-water-percent" /><span>ความชื้น</span></div><i />
          <div class="flow-node model-node"><v-icon icon="mdi-brain" /><strong>LSTM</strong><small>Time-Series Model</small></div><i />
          <div class="flow-node alert-node"><v-icon icon="mdi-shield-alert-outline" /><span>พยากรณ์<br />ล่วงหน้า</span></div>
        </div>
      </v-container>
    </section>

    <section class="logbook-section section-shell reveal">
      <v-container class="logbook-grid px-5 px-md-8">
        <div class="logbook-panel">
          <div class="logbook-head">
            <div><span class="mini-label">DIGITAL LOGBOOK</span><h3>บันทึกสถิติฟาร์ม</h3></div>
            <v-icon icon="mdi-shield-check-outline" />
          </div>
          <div class="log-row"><span>ค่า THI เฉลี่ยรอบสัปดาห์</span><strong>74.2</strong></div>
          <div class="log-row"><span>ชั่วโมงสะสมในระดับเสี่ยง</span><strong>18 ชม.</strong></div>
          <div class="log-row"><span>ความผิดปกติทางพฤติกรรม</span><strong>3 ครั้ง</strong></div>
          <div class="log-row positive"><span>สถานะการบันทึกประวัติ</span><strong>สมบูรณ์</strong></div>
        </div>
        <div class="logbook-copy">
          <span class="eyebrow">DATA THAT CREATES VALUE</span>
          <h2>ยกระดับข้อมูลฟาร์มสู่สินทรัพย์สารสนเทศ เพื่อการต่อยอดทางธุรกิจ</h2>
          <p>การจัดเก็บข้อมูลด้านสิ่งแวดล้อมและพฤติกรรมอย่างเป็นระบบ ช่วยสร้างฐานข้อมูลประวัติการจัดการฟาร์มที่โปร่งใสและน่าเชื่อถือ ซึ่งสามารถนำไปใช้เป็นเอกสารประกอบการประเมินเพื่อขอสินเชื่อทางการเกษตรหรือการทำประกันภัยอิงดัชนีในอนาคต</p>
        </div>
      </v-container>
    </section>

    <section id="research" class="research-section section-shell reveal">
      <v-container class="research-grid px-5 px-md-8">
        <div><span class="eyebrow">ACADEMIC FOUNDATION</span><h2>พัฒนาบนพื้นฐานงานวิจัยที่ตรวจสอบได้</h2></div>
        <div class="research-stack">
          <div class="citation-card"><span class="citation-mark">“</span><p>การบูรณาการข้อมูลสิ่งแวดล้อมและการวิเคราะห์อนุกรมเวลา ช่วยเพิ่มประสิทธิภาพในการตรวจจับและแจ้งเตือนภาวะเครียดจากความร้อนในปศุสัตว์ได้อย่างแม่นยำ</p><div><strong>Mulajkar et al. (2026)</strong><br /><span>AI-Driven Early Detection of Heat Stress and Environmental Hazards in Dairy Cattle</span></div></div>
          <div class="reference-grid">
            <div><strong>Environmental & Behavioral Integration</strong><span>ผสานตัวแปรด้านสภาพอากาศและพฤติกรรมสัตว์ เพื่อลดความคลาดเคลื่อนจากการสังเกตด้วยสายตา</span></div>
            <div><strong>Time-Series Forecasting</strong><span>ประยุกต์ใช้โมเดล LSTM เพื่อวิเคราะห์แนวโน้มและความต่อเนื่องของข้อมูลสภาพแวดล้อมย้อนหลัง</span></div>
          </div>
        </div>
      </v-container>
    </section>

    <section class="cta-section">
      <v-container class="cta-content px-5 px-md-8"><div><span class="eyebrow">PROACTIVE MANAGEMENT</span><h2>เตรียมพร้อมรับมือล่วงหน้า เพื่อรักษาเสถียรภาพผลผลิตฟาร์ม</h2></div><v-btn class="cta-button" href="#solution" @click.prevent="scrollToSection('#solution')" size="x-large" rounded="pill">ศึกษารายละเอียดระบบ <v-icon end icon="mdi-arrow-up" /></v-btn></v-container>
    </section>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const t = ref(27)
const rh = ref(65)
// สูตร THI (NRC) : (1.8T + 32) − (0.55 − 0.0055·RH)(1.8T − 26)
const thi = computed(() => (1.8 * t.value + 32) - (0.55 - 0.0055 * rh.value) * (1.8 * t.value - 26))
const rounded = computed(() => Math.round(thi.value))
const pos = computed(() => Math.min(100, Math.max(0, ((thi.value - 60) / 30) * 100)))

const states = [
  { name: 'ปกติ', color: '#3e7d4f', bgColor: '#e6f2e7', note: 'THI ต่ำกว่า 70 โคนมยังไม่ได้รับผลกระทบจากความร้อน' },
  { name: 'เริ่มได้รับผลกระทบ', color: '#cb6f33', bgColor: '#fffaf4', note: 'THI 70–72 ควรเริ่มระบายอากาศและเตรียมน้ำดื่มให้พอ' },
  { name: 'น้ำนมเริ่มลด', color: '#d2401f', bgColor: '#faece8', note: 'THI เกิน 72 ผลจะตามมาอีกราว 5 วัน ควรลดความร้อนทันที' },
]
const cur = computed(() => states[rounded.value < 70 ? 0 : rounded.value <= 72 ? 1 : 2])

let observer: IntersectionObserver | undefined

// ฟังก์ชันสำหรับเลื่อนหน้าจอแบบนุ่มนวล (Smooth Scroll) ด้วย JavaScript
const scrollToSection = (id: string) => {
  const element = document.querySelector(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(() => {
  // บังคับให้หน้าเว็บเริ่มที่บนสุดเสมอเวลารีเฟรช (ล้างค่า Scroll เดิมของเบราว์เซอร์)
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  window.scrollTo(0, 0)

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      }
    })
  }, { threshold: 0.14 })

  document.querySelectorAll('.reveal').forEach((element) => observer?.observe(element))
})

onBeforeUnmount(() => observer?.disconnect())

useHead({ title: 'CowCare AI | Heat Stress Intelligence' })
</script>

<style scoped>
:global(html) { scroll-behavior: auto; }
:global(body) { background: #fffdf7; color: #24433a; }
.landing-page { overflow: hidden; background: #fffdf7; font-family: "Noto Sans Thai", Inter, ui-sans-serif, system-ui, sans-serif; }.landing-page :where(p, h1, h2, h3, span, strong) { overflow-wrap: anywhere; }
.section-shell { position: relative; background-image: linear-gradient(rgba(255, 253, 247, .80), rgba(255, 253, 247, .92)), url('/images/bg2.jpg'); background-position: center; background-size: cover; }
.hero { min-height: min(760px, calc(100vh - 76px)); display: grid; align-items: center; isolation: isolate; }
.hero-grid { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(400px, .95fr); gap: clamp(40px, 5vw, 76px); align-items: center; padding-top: clamp(60px, 8vw, 92px); padding-bottom: clamp(60px, 8vw, 92px); }
.ambient { position: absolute; z-index: -1; display: block; border-radius: 50%; filter: blur(2px); animation: drift 9s ease-in-out infinite alternate; }.ambient-one { width: 330px; height: 330px; top: 8%; left: -120px; background: rgba(221, 179, 111, .26); }.ambient-two { width: 280px; height: 280px; bottom: 5%; right: -100px; background: rgba(97, 144, 122, .18); animation-delay: -4s; }
.eyebrow { display: flex; align-items: center; gap: 9px; color: #d87939; font-size: .69rem; font-weight: 850; letter-spacing: .14em; }.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #d87939; box-shadow: 0 0 0 6px rgba(216, 121, 57, .12); animation: pulse 2s infinite; }
h1, h2, h3, p { margin: 0; }.brand-mark { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 14px; color: #24433a; font-size: .72rem; font-weight: 900; letter-spacing: .11em; }.brand-mark::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: #d87939; box-shadow: 0 0 0 6px rgba(216, 121, 57, .10); }.brand-mark span { color: #849087; font-size: .57rem; letter-spacing: .08em; font-weight: 750; }.hero h1 { max-width: 780px; margin: 0 0 21px; color: #24433a; font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 700; line-height: 1.35; }.hero h1 span { display: block; color: #d87939; }.hero-description { max-width: 610px; color: #52675d; font-size: 1rem; line-height: 1.9; text-wrap: pretty; }.hero-actions { display: flex; align-items: center; gap: 10px; margin-top: 34px; }.primary-btn { padding-inline: 24px !important; color: white !important; background: #24433a !important; font-weight: 800; }.text-btn { color: #24433a !important; font-weight: 800; }.trust-row { display: flex; align-items: center; gap: 13px; margin-top: 40px; }.trust-row p { color: #67786f; font-size: .79rem; line-height: 1.5; }.trust-row strong { color: #24433a; }.cow-stack { display: flex; }.cow-stack span { display: grid; place-items: center; width: 32px; height: 32px; margin-left: -7px; background: #f5e8db; border: 2px solid #fffdf7; border-radius: 50%; font-size: .8rem; }.cow-stack span:first-child { margin-left: 0; }
.hero-visual { position: relative; min-height: 470px; }.visual-glow { position: absolute; inset: 40px 20px 0; border-radius: 42px; background: linear-gradient(135deg, #e0ab69, #b6d2bf); opacity: .46; transform: rotate(-5deg); }.dashboard-card { position: relative; width: min(100%, 480px); margin: 22px auto 0; padding: 28px; background: rgba(255, 253, 247, .9); border: 1px solid rgba(255,255,255,.86); border-radius: 28px; box-shadow: 0 30px 70px rgba(36, 67, 58, .18); backdrop-filter: blur(12px); }.dashboard-head, .forecast-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.mini-label { color: #849087; font-size: .6rem; font-weight: 850; letter-spacing: .11em; }.dashboard-head h2 { margin-top: 3px; font-size: 1.25rem; letter-spacing: -.04em; }.live-badge { display: flex; align-items: center; gap: 6px; padding: 7px 9px; color: #467153; background: #e6f2e7; border-radius: 99px; font-size: .66rem; font-weight: 800; }.live-badge i { width: 6px; height: 6px; background: #5eaa6d; border-radius: 50%; }.risk-panel { display: flex; align-items: center; gap: 20px; margin: 23px 0 15px; padding: 18px; background: linear-gradient(110deg, #f9e7d4, #faeee1); border-radius: 20px; }.risk-ring { display: grid; place-content: center; width: 82px; height: 82px; flex: 0 0 auto; text-align: center; background: #fffaf4; border: 7px solid #e7a560; border-radius: 50%; }.risk-ring strong { color: #cb6f33; font-size: 1.65rem; letter-spacing: -.08em; line-height: 1; }.risk-ring small { color: #8e7056; font-size: .57rem; font-weight: 850; }.risk-label { color: #9c6e45; font-size: .62rem; font-weight: 800; letter-spacing: .08em; }.risk-panel h3 { margin: 3px 0; color: #9d5526; font-size: 1rem; }.risk-panel p { color: #7f684f; font-size: .73rem; }.condition-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }.condition-grid div { display: grid; gap: 3px; padding: 11px 8px; border: 1px solid #edf0eb; border-radius: 13px; }.condition-grid .v-icon { color: #698d77; font-size: 16px; }.condition-grid span { color: #829087; font-size: .61rem; }.condition-grid strong { color: #294a3e; font-size: .85rem; }.forecast { margin-top: 18px; padding-top: 14px; border-top: 1px solid #ebeee8; }.forecast-title { color: #53675d; font-size: .74rem; font-weight: 800; }.forecast-title small { color: #d87939; font-size: .61rem; }.chart-lines { position: relative; height: 76px; margin-top: 5px; background: repeating-linear-gradient(to bottom, transparent 0 22px, #edf1ec 23px); }.chart-lines svg { width: 100%; height: 100%; }.sample-note { display: block; margin-top: 5px; color: #9aa49d; font-size: .55rem; text-align: right; }.float-card { position: absolute; right: -9px; bottom: 4px; display: flex; align-items: center; gap: 10px; padding: 13px; color: #24433a; background: #fffdf7; border-radius: 16px; box-shadow: 0 12px 30px rgba(36, 67, 58, .15); }.float-card .v-icon { padding: 8px; color: #d87939; background: #f9ebde; border-radius: 10px; }.float-card small { display: block; color: #d87939; font-size: .55rem; font-weight: 850; letter-spacing: .08em; }.float-card strong { display: block; margin-top: 2px; font-size: .68rem; }
.signal-strip { color: #f7f2e7; background: #24433a; }.signal-grid { display: grid; grid-template-columns: repeat(4, 1fr); }.signal-grid div { display: grid; align-content: center; gap: 8px; min-height: 116px; padding: 18px 23px; border-right: 1px solid rgba(255,255,255,.13); }.signal-grid div:first-child { border-left: 1px solid rgba(255,255,255,.13); }.signal-grid span { color: #dca067; font-size: 1.22rem; font-weight: 850; letter-spacing: -.03em; }.signal-grid p { max-width: 220px; font-size: .82rem; font-weight: 700; line-height: 1.45; }
.content-section { padding: clamp(90px, 9vw, 130px) 0; }.section-heading { max-width: 660px; }.section-heading h2, .research-section h2, .cta-section h2 { margin-top: 15px; max-width: 720px; color: #24433a; font-size: clamp(1.7rem, 3vw, 2.4rem); font-weight: 700; letter-spacing: -.02em; line-height: 1.35; }.section-heading p { max-width: 610px; margin-top: 19px; color: #64766d; line-height: 1.85; text-wrap: pretty; }.feature-grid { display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 18px; margin-top: 54px; }.feature-card { position: relative; min-height: 300px; padding: 28px; background: rgba(255,253,247,.87); border: 1px solid rgba(70,100,84,.1); border-radius: 22px; box-shadow: 0 12px 34px rgba(36,67,58,.05); transition: transform .35s ease, box-shadow .35s ease; }.feature-card:hover { box-shadow: 0 21px 42px rgba(36,67,58,.13); transform: translateY(-8px); }.feature-primary { color: white; background: #315c4d; border: 0; }.feature-icon { display: grid; place-items: center; width: 45px; height: 45px; color: #476956; background: #e0efdf; border-radius: 14px; }.feature-primary .feature-icon { color: #f6cc99; background: rgba(255,255,255,.12); }.icon-sand { color: #bf7040; background: #fae5d1; }.icon-blue { color: #4c7890; background: #dfedf0; }.card-number { position: absolute; top: 30px; right: 28px; color: #a6b5aa; font-size: .73rem; font-weight: 850; }.feature-primary .card-number { color: rgba(255,255,255,.5); }.feature-card h3 { margin-top: 22px; max-width: 270px; font-size: 1.22rem; letter-spacing: -.035em; line-height: 1.35; text-wrap: balance; }.feature-card p { margin-top: 10px; color: #687a70; font-size: .86rem; line-height: 1.8; text-wrap: pretty; }.feature-primary p { color: #dce9df; }.feature-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 20px; }.feature-tags span { padding: 5px 8px; color: #ddeddf; background: rgba(255,255,255,.1); border-radius: 5px; font-size: .61rem; font-weight: 700; }.behavior-bars { display: flex; align-items: end; gap: 7px; height: 38px; margin-top: 24px; }.behavior-bars span { display: block; width: 15%; border-radius: 6px 6px 0 0; background: #b6d1b8; }.behavior-bars span:nth-child(1) { height: 40%; }.behavior-bars span:nth-child(2) { height: 65%; background: #89ae8d; }.behavior-bars span:nth-child(3) { height: 90%; background: #d98549; }.behavior-bars span:nth-child(4) { height: 55%; }.mini-alert { display: flex; gap: 6px; align-items: center; margin-top: 23px; color: #577b63; font-size: .66rem; font-weight: 750; }
.architecture-map { display: grid; grid-template-columns: 1fr 52px 1fr 52px 1fr; align-items: stretch; margin-top: 48px; }.architecture-map article { position: relative; min-height: 218px; padding: 26px; color: #24433a; background: rgba(255,253,247,.82); border: 1px solid rgba(70,100,84,.11); border-radius: 22px; box-shadow: 0 14px 36px rgba(36,67,58,.06); }.architecture-map article:nth-of-type(2) { background: #f8ead9; }.architecture-map article:nth-of-type(3) { color: #fffdf7; background: #315c4d; }.architecture-map span { color: #d87939; font-size: .68rem; font-weight: 850; letter-spacing: .12em; }.architecture-map article:nth-of-type(3) span { color: #f2bd7c; }.architecture-map .v-icon { display: block; margin-top: 24px; color: #789983; font-size: 32px; }.architecture-map article:nth-of-type(2) .v-icon { color: #d87939; }.architecture-map article:nth-of-type(3) .v-icon { color: #f2bd7c; }.architecture-map h3 { margin-top: 15px; font-size: 1.2rem; letter-spacing: -.03em; line-height: 1.35; text-wrap: balance; }.architecture-map p { margin-top: 9px; color: #63766b; font-size: .83rem; line-height: 1.82; text-wrap: pretty; }.architecture-map article:nth-of-type(3) p { color: #dce9df; }.architecture-map > i { align-self: center; height: 2px; background: linear-gradient(90deg, rgba(216,121,57,.28), rgba(49,92,77,.6)); }
.ai-section { padding: 116px 0; color: #f7f2e7; background: #19362e; }.ai-grid { display: grid; grid-template-columns: .92fr 1.08fr; gap: 80px; align-items: center; }.light-eyebrow { color: #e6ac71; }.ai-copy h2 { margin-top: 15px; max-width: 640px; color: #fffdf7; font-size: clamp(1.7rem, 3vw, 2.4rem); font-weight: 700; letter-spacing: -.02em; line-height: 1.35; }.ai-copy h2 em { color: #e6ac71; font-style: normal; }.ai-copy p { max-width: 560px; margin-top: 20px; color: #c7d6ca; line-height: 1.9; text-wrap: pretty; }.ai-stat { display: flex; align-items: center; gap: 15px; margin-top: 35px; }.ai-stat strong { color: #f2bd7c; font-size: 2.1rem; letter-spacing: -.07em; }.ai-stat span { max-width: 185px; color: #b6c8ba; font-size: .69rem; line-height: 1.5; }.lstm-flow { display: flex; align-items: center; justify-content: center; }.flow-node { display: grid; place-items: center; width: 108px; height: 108px; padding: 10px; color: #cce0cf; text-align: center; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.11); border-radius: 18px; }.flow-node .v-icon { margin-bottom: 6px; color: #f2bd7c; }.flow-node span { font-size: .7rem; line-height: 1.35; }.lstm-flow > i { width: 38px; height: 1px; background: #617b6d; }.model-node { color: white; background: #d87939; border-color: #eaa56f; box-shadow: 0 0 0 9px rgba(216,121,57,.12); }.model-node .v-icon { color: white; }.model-node strong { font-size: 1.1rem; }.model-node small { font-size: .52rem; opacity: .85; }.alert-node { color: #fff0d8; background: #496e5b; }.alert-node .v-icon { color: #fff0d8; }
.farmer-section { padding: 122px 0; background: #fffdf7; }.farmer-grid { display: grid; grid-template-columns: .95fr 360px; gap: 84px; align-items: center; }.farmer-copy h2, .logbook-copy h2 { margin-top: 15px; max-width: 650px; color: #24433a; font-size: clamp(1.7rem, 3vw, 2.4rem); font-weight: 700; letter-spacing: -.02em; line-height: 1.35; }.farmer-copy p, .logbook-copy p { max-width: 620px; margin-top: 18px; color: #64766d; line-height: 1.9; text-wrap: pretty; }.persona-list { display: grid; gap: 12px; margin-top: 28px; }.persona-list div { display: flex; align-items: center; gap: 12px; color: #36564a; font-size: .91rem; font-weight: 720; }.persona-list .v-icon { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 auto; color: #d87939; background: #faeadb; border-radius: 12px; }.phone-alert { position: relative; padding: 22px; background: #1f3d34; border: 9px solid #142a24; border-radius: 34px; box-shadow: 0 24px 54px rgba(31,61,52,.24); }.phone-top { display: flex; justify-content: center; gap: 5px; margin-bottom: 24px; }.phone-top span { width: 6px; height: 6px; background: rgba(255,255,255,.35); border-radius: 50%; }.chat-bubble { width: fit-content; max-width: 100%; padding: 12px 14px; border-radius: 16px; font-size: .78rem; }.chat-bubble.system { margin-bottom: 10px; color: #bfd4c4; background: rgba(255,255,255,.08); }.chat-bubble.alert { margin-left: auto; color: #24433a; background: #fff7ea; border-bottom-right-radius: 5px; }.chat-bubble.alert strong { display: block; margin-bottom: 8px; color: #bf6230; font-size: .83rem; }.chat-bubble.alert p { color: #4f6358; line-height: 1.65; }.action-chip { display: flex; align-items: center; gap: 7px; width: fit-content; margin-top: 18px; padding: 9px 11px; color: #dce9df; background: rgba(255,255,255,.09); border-radius: 99px; font-size: .68rem; font-weight: 780; }
.logbook-section { padding: 116px 0; }.logbook-grid { display: grid; grid-template-columns: 420px 1fr; gap: 84px; align-items: center; }.logbook-panel { padding: 28px; background: rgba(255,253,247,.9); border: 1px solid rgba(70,100,84,.12); border-radius: 24px; box-shadow: 0 24px 58px rgba(36,67,58,.12); }.logbook-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 20px; }.logbook-head h3 { margin-top: 4px; color: #24433a; font-size: 1.15rem; letter-spacing: -.03em; line-height: 1.35; }.logbook-head .v-icon { display: grid; place-items: center; width: 48px; height: 48px; color: #fffdf7; background: #315c4d; border-radius: 15px; }.log-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0; color: #64766d; border-top: 1px solid #e7ece6; font-size: .84rem; }.log-row strong { color: #24433a; font-size: .98rem; white-space: nowrap; }.log-row.positive strong { color: #3f8352; }
.research-section { padding: 115px 0; }.research-grid { display: grid; grid-template-columns: .85fr 1.15fr; gap: 80px; align-items: center; }.research-stack { display: grid; gap: 14px; }.citation-card { position: relative; padding: 38px 42px 34px; background: rgba(255,253,247,.86); border: 1px solid rgba(71,100,84,.12); border-radius: 22px; box-shadow: 0 17px 45px rgba(36,67,58,.07); }.citation-mark { position: absolute; top: 13px; left: 24px; color: #e6ac71; font-family: Georgia, serif; font-size: 4.6rem; line-height: 1; }.citation-card p { position: relative; color: #355447; font-size: 1.02rem; font-weight: 650; letter-spacing: -.02em; line-height: 1.8; text-wrap: pretty; }.citation-card div { margin-top: 22px; padding-top: 18px; color: #687a70; border-top: 1px solid #e6ece6; font-size: .7rem; line-height: 1.55; }.citation-card strong { color: #d87939; }.reference-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }.reference-grid div { padding: 18px; background: rgba(255,253,247,.72); border: 1px solid rgba(70,100,84,.1); border-radius: 16px; }.reference-grid strong { display: block; color: #24433a; font-size: .86rem; }.reference-grid span { display: block; margin-top: 7px; color: #64766d; font-size: .73rem; line-height: 1.55; }
.cta-section { padding: 86px 0; background: #e9dcc6; }.cta-content { display: flex; align-items: center; justify-content: space-between; gap: 32px; }.cta-content > div { min-width: 0; }.cta-section h2 { max-width: 760px; }.cta-button { flex: 0 0 auto; padding-inline: 25px !important; color: white !important; background: #24433a !important; font-weight: 800; }
.hero-enter { animation: rise .8s cubic-bezier(.22, .72, .26, 1) .1s both; }.hero-enter-delay { animation: rise .9s cubic-bezier(.22, .72, .26, 1) .2s both; }.reveal { opacity: 0; transform: translate3d(0, 24px, 0); transition: opacity .56s ease-out, transform .56s cubic-bezier(.22, .72, .26, 1); will-change: opacity, transform; }.reveal.is-visible { opacity: 1; transform: translate3d(0, 0, 0); }#solution, #lstm, #research { scroll-margin-top: 88px; }@keyframes rise { from { opacity: 0; transform: translate3d(0, 28px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }@keyframes drift { to { transform: translate3d(26px, -17px, 0) scale(1.07); } }@keyframes pulse { 50% { box-shadow: 0 0 0 10px rgba(216,121,57,0); } }
.tool-sliders { margin: 20px 0; padding-top: 15px; border-top: 1px solid #edf0eb; }
.tool-sliders label { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; margin-bottom: 8px; font-size: .88rem; color: #52675d; }
.tool-sliders label b { font-variant-numeric: tabular-nums; color: #24433a; }
.tool-sliders input[type="range"] { grid-column: 1 / -1; width: 100%; accent-color: #24433a; margin-bottom: 12px; }
.scale-section { margin-top: 10px; }
.scale { position: relative; display: flex; height: 10px; border-radius: 99px; }
.scale i:nth-child(1) { flex: 33.3; background: #3e7d4f; border-radius: 99px 0 0 99px; }
.scale i:nth-child(2) { flex: 6.7; background: #e0a21f; }
.scale i:nth-child(3) { flex: 60; background: #d2401f; border-radius: 0 99px 99px 0; }
.scale b { position: absolute; top: -4px; width: 4px; height: 18px; margin-left: -2px; box-sizing: content-box; background: #24433a; border: 2px solid #fff; border-radius: 4px; transition: left .25s; }
.ticks { position: relative; height: 20px; margin-top: 6px; font-size: .7rem; color: #849087; font-weight: 700; }
.ticks span { position: absolute; transform: translateX(-50%); }
@media (min-width: 961px) {
  .hero-copy { padding-right: 12px; }
  .section-heading { max-width: 760px; }
  .feature-grid { align-items: stretch; }
}
@media (max-width: 960px) { .hero-grid, .ai-grid, .research-grid, .farmer-grid, .logbook-grid { grid-template-columns: 1fr; gap: 46px; }.hero { min-height: auto; }.hero-grid { padding-top: 68px; }.hero-copy { text-align: center; }.hero-copy .eyebrow, .hero-actions, .trust-row { justify-content: center; }.hero-description { margin-inline: auto; }.hero-visual { min-height: 425px; max-width: 550px; width: 100%; margin: auto; }.architecture-map { grid-template-columns: 1fr; gap: 14px; }.architecture-map > i { width: 2px; height: 24px; justify-self: center; background: linear-gradient(180deg, rgba(216,121,57,.28), rgba(49,92,77,.6)); }.feature-grid { grid-template-columns: 1fr; }.feature-card { min-height: 250px; }.ai-copy, .farmer-copy, .logbook-copy { text-align: center; }.ai-copy p, .farmer-copy p, .logbook-copy p { margin-inline: auto; }.ai-stat { justify-content: center; }.signal-grid { grid-template-columns: repeat(2, 1fr); }.signal-grid div:nth-child(3) { border-left: 1px solid rgba(255,255,255,.13); }.phone-alert, .logbook-panel { max-width: 420px; width: 100%; margin: auto; }.persona-list { max-width: 560px; margin-inline: auto; text-align: left; }.research-grid { text-align: center; }.citation-card { text-align: left; }.cta-content { align-items: flex-start; flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
@media (max-width: 600px) { .hero-grid { padding-top: 51px; padding-bottom: 60px; }.brand-mark { margin-bottom: 10px; font-size: .67rem; }.brand-mark span { display: none; }.hero h1 { font-size: clamp(1.8rem, 8vw, 2.2rem); line-height: 1.25; }.hero-description { font-size: .94rem; line-height: 1.85; }.hero-actions { flex-direction: column; }.hero-actions .v-btn { width: 100%; }.dashboard-card { padding: 20px; }.float-card { right: 0; bottom: -10px; }.signal-grid div { min-height: 118px; padding: 15px 12px; }.signal-grid span { font-size: 1rem; }.signal-grid p { font-size: .72rem; }.content-section, .research-section, .farmer-section, .logbook-section { padding: 78px 0; }.architecture-map article { min-height: auto; }.ai-section { padding: 78px 0; }.lstm-flow { flex-wrap: wrap; gap: 12px; }.lstm-flow > i { width: 16px; }.flow-node { width: 98px; height: 98px; }.research-grid { gap: 32px; }.citation-card { padding: 31px 25px 27px; }.citation-card p { font-size: 1rem; }.reference-grid { grid-template-columns: 1fr; }.log-row { align-items: flex-start; flex-direction: column; gap: 5px; } }
</style>
