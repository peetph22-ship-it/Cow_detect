<template>
  <div class="landing-page">
    <section class="hero section-shell">
      <span class="ambient ambient-one" />
      <span class="ambient ambient-two" />
      <v-container class="hero-grid px-5 px-md-8">
        <div class="hero-copy hero-enter">
          <div class="eyebrow"><span class="pulse-dot" /> TRUE AI FOR ALL · AGRICULTURE & FOOD</div>
          <h1>CowCare AI<br /><span>เตือนความร้อน</span><br />ก่อนน้ำนมลด</h1>
          <p class="hero-description">ระบบเตือนภาวะ Heat Stress สำหรับฟาร์มโคนมรายย่อย ใช้ IoT ราคาจับต้องได้ร่วมกับ YOLO และ LSTM เพื่อแปลงอุณหภูมิ ความชื้น ความดัน และพฤติกรรมโคให้เป็นคำแนะนำที่ทำตามได้ทันที</p>
          <div class="hero-actions">
            <v-btn class="primary-btn" href="#solution" @click.prevent="scrollToSection('#solution')" size="large" rounded="pill" elevation="0">สำรวจการทำงาน <v-icon end icon="mdi-arrow-down" /></v-btn>
            <v-btn class="text-btn" href="#research" @click.prevent="scrollToSection('#research')" variant="text" rounded="pill">อ้างอิงงานวิจัย <v-icon end icon="mdi-arrow-top-right" /></v-btn>
          </div>
          <div class="trust-row">
            <div class="cow-stack"><span>🐄</span><span>🐄</span><span>🐄</span></div>
            <p><strong>ออกแบบให้เข้าใจง่าย</strong><br />สำหรับเกษตรกรรายย่อยและฟาร์มจริง</p>
          </div>
        </div>

        <div class="hero-visual hero-enter-delay" aria-label="ตัวอย่างแดชบอร์ด Heat Stress">
          <div class="visual-glow" />
          <div class="dashboard-card">
            <div class="dashboard-head">
              <div><span class="mini-label">FARM ENVIRONMENT</span><h2>ภาพรวมวันนี้</h2></div>
              <span class="live-badge"><i /> กำลังวิเคราะห์</span>
            </div>
            <div class="risk-panel">
              <div class="risk-ring"><strong>76</strong><small>THI</small></div>
              <div><span class="risk-label">ระดับเฝ้าระวัง</span><h3>เริ่มมีความเสี่ยง</h3><p>แนะนำเปิดพัดลมและเพิ่มน้ำสะอาด</p></div>
            </div>
            <div class="condition-grid">
              <div><v-icon icon="mdi-thermometer" /><span>อุณหภูมิ</span><strong>32.4°C</strong></div>
              <div><v-icon icon="mdi-water-percent" /><span>ความชื้น</span><strong>68%</strong></div>
              <div><v-icon icon="mdi-cow" /><span>พฤติกรรม</span><strong>ปกติ</strong></div>
            </div>
            <div class="forecast">
              <div class="forecast-title"><span>แนวโน้ม 3-7 วัน</span><small>คาดการณ์โดย LSTM</small></div>
              <div class="chart-lines" aria-hidden="true"><span /><svg viewBox="0 0 320 72" preserveAspectRatio="none"><path d="M0 58 C25 50 34 59 59 43 S94 49 119 32 S151 43 177 26 S211 30 236 16 S273 23 320 4" fill="none" stroke="#d87939" stroke-width="3" stroke-linecap="round" /><path d="M0 70 L0 58 C25 50 34 59 59 43 S94 49 119 32 S151 43 177 26 S211 30 236 16 S273 23 320 4 L320 70 Z" fill="url(#fade)" /><defs><linearGradient id="fade" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#d87939" stop-opacity=".2" /><stop offset="1" stop-color="#d87939" stop-opacity="0" /></linearGradient></defs></svg></div>
            </div>
            <small class="sample-note">ข้อมูลสาธิตเพื่อแสดงแนวทางการใช้งาน</small>
          </div>
          <div class="float-card behavior-card"><v-icon icon="mdi-video-outline" /><div><small>VISION AI</small><strong>กำลังติดตามพฤติกรรม</strong></div></div>
        </div>
      </v-container>
    </section>

    <section class="signal-strip">
      <v-container class="signal-grid px-5 px-md-8">
        <div><span>&gt;20%</span><p>ความเสี่ยงผลผลิตน้ำนมลด<br />เมื่อโคเครียดจากความร้อน</p></div>
        <div><span>THI 70</span><p>จุดเริ่มต้นที่ควร<br />เฝ้าระวังความเสี่ยง</p></div>
        <div><span>5 วัน</span><p>ผลกระทบอาจเกิดแบบ<br />หน่วงเวลาในฟาร์ม</p></div>
        <div><span>3-7 วัน</span><p>ระยะเตือนล่วงหน้า<br />ด้วยโมเดล LSTM</p></div>
      </v-container>
    </section>

    <section id="solution" class="content-section section-shell reveal">
      <v-container class="px-5 px-md-8">
        <div class="section-heading"><span class="eyebrow">THREE-LAYER ARCHITECTURE</span><h2>จากการวัดหน้างาน<br />สู่คำแนะนำและหลักฐาน</h2><p>โปรเจกต์ถูกออกแบบเป็น 3 ชั้น เพื่อให้ไม่ใช่แค่แดชบอร์ดดูค่าอากาศ แต่เป็นเครื่องมือช่วยตัดสินใจสำหรับฟาร์มรายย่อย</p></div>
        <div class="architecture-map" aria-label="สถาปัตยกรรมระบบ 3 ชั้น">
          <article>
            <span>01</span>
            <v-icon icon="mdi-radar" />
            <h3>Sense</h3>
            <p>เก็บอุณหภูมิ ความชื้น ความดัน และพฤติกรรมโคแบบไม่ต้องสวมอุปกรณ์บนตัวสัตว์</p>
          </article>
          <i />
          <article>
            <span>02</span>
            <v-icon icon="mdi-lightbulb-on-outline" />
            <h3>Recommend</h3>
            <p>ใช้ LSTM คาดการณ์ความเสี่ยง แล้วแปลงผลเป็นคำแนะนำภาษาไทยที่เข้าใจง่าย</p>
          </article>
          <i />
          <article>
            <span>03</span>
            <v-icon icon="mdi-file-chart-outline" />
            <h3>Capitalize</h3>
            <p>บันทึกข้อมูลเป็น Digital Logbook เพื่อใช้ประกอบการจัดการฟาร์ม สินเชื่อ หรือประกันภัยอิงดัชนี</p>
          </article>
        </div>
        <div class="feature-grid">
          <article class="feature-card feature-primary"><div class="feature-icon"><v-icon icon="mdi-access-point" /></div><span class="card-number">01</span><h3>รับข้อมูลจาก IoT</h3><p>ESP32-S3 N16R8 รับค่าอุณหภูมิ ความชื้น และความดันจาก AHT20 และ BMP280 เพื่อนำไปคำนวณ THI อย่างต่อเนื่อง</p><div class="feature-tags"><span>ESP32-S3 N16R8</span><span>AHT20</span><span>BMP280</span><span>THI</span></div></article>
          <article class="feature-card"><div class="feature-icon icon-sand"><v-icon icon="mdi-cctv" /></div><span class="card-number">02</span><h3>มองพฤติกรรมโคนม</h3><p>AI Vision ช่วยติดตามการยืน นอน กิน และดื่ม เพื่อใช้เป็นสัญญาณประกอบการประเมิน</p><div class="behavior-bars"><span /><span /><span /><span /></div></article>
          <article class="feature-card"><div class="feature-icon icon-blue"><v-icon icon="mdi-bell-outline" /></div><span class="card-number">03</span><h3>แนะนำสิ่งที่ทำได้ทันที</h3><p>แปลงข้อมูลเป็นคำแนะนำ เช่น เพิ่มลม เปิดระบบพ่นน้ำ หรือเตรียมน้ำสะอาดให้เพียงพอ</p><div class="mini-alert"><v-icon icon="mdi-check-circle-outline" /> พร้อมแจ้งเตือนตามระดับความเสี่ยง</div></article>
        </div>
      </v-container>
    </section>

    <section id="lstm" class="ai-section reveal">
      <v-container class="ai-grid px-5 px-md-8">
        <div class="ai-copy"><span class="eyebrow light-eyebrow">PREDICT, NOT JUST DETECT</span><h2>AI ที่มองเห็น<br /><em>แนวโน้มของความร้อน</em></h2><p>โมเดล LSTM เรียนรู้ข้อมูลที่เปลี่ยนต่อเนื่องตามเวลา ทั้งอุณหภูมิ ความชื้น ความดัน ค่า THI และสัญญาณจากฟาร์ม เพื่อช่วยเตือนก่อนช่วงที่ผลผลิตอาจเริ่มเสียหาย</p><div class="ai-stat"><strong>96.08%</strong><span>ความแม่นยำของ LSTM ที่รายงานในงานวิจัยอ้างอิง<sup>1</sup></span></div></div>
        <div class="lstm-flow">
          <div class="flow-node"><v-icon icon="mdi-thermometer" /><span>อุณหภูมิ</span></div><i />
          <div class="flow-node"><v-icon icon="mdi-water-percent" /><span>ความชื้น</span></div><i />
          <div class="flow-node model-node"><v-icon icon="mdi-brain" /><strong>LSTM</strong><small>Time-series model</small></div><i />
          <div class="flow-node alert-node"><v-icon icon="mdi-shield-alert-outline" /><span>ความเสี่ยง<br />ล่วงหน้า</span></div>
        </div>
      </v-container>
    </section>

    <section class="farmer-section reveal">
      <v-container class="farmer-grid px-5 px-md-8">
        <div class="farmer-copy">
          <span class="eyebrow">DESIGNED FOR THAI SMALLHOLDERS</span>
          <h2>หน้าจอที่ต้องอ่านง่าย<br />ไม่ใช่ตัวเลขที่ต้องตีความเอง</h2>
          <p>กลุ่มเป้าหมายคือเกษตรกรโคนมรายย่อย โดยเฉพาะผู้สูงวัยที่อาจไม่ถนัดเครื่องมือดิจิทัล ระบบจึงเน้นข้อความสั้น สีระดับความเสี่ยงชัด และแจ้งเตือนผ่านช่องทางที่ใช้จริงอย่าง LINE หรือ Telegram</p>
          <div class="persona-list">
            <div><v-icon icon="mdi-format-font-size-increase" /><span>ตัวอักษรใหญ่ อ่านง่ายบนมือถือ</span></div>
            <div><v-icon icon="mdi-message-text-outline" /><span>คำแนะนำเป็นภาษาคน ไม่ใช่ค่าทางสถิติอย่างเดียว</span></div>
            <div><v-icon icon="mdi-cash-check" /><span>ฮาร์ดแวร์ต้นทุนต่ำ เพื่อให้ทดลองใช้ได้จริง</span></div>
          </div>
        </div>
        <div class="phone-alert" aria-label="ตัวอย่างข้อความแจ้งเตือน">
          <div class="phone-top"><span /> <span /> <span /></div>
          <div class="chat-bubble system">CowCare AI</div>
          <div class="chat-bubble alert">
            <strong>แจ้งเตือนความเสี่ยง Heat Stress</strong>
            <p>พรุ่งนี้ช่วง 12:00-15:00 ค่า THI อาจสูงถึง 78 ควรเปิดพัดลมก่อนเที่ยง เพิ่มจุดน้ำ และสังเกตการหอบของโค</p>
          </div>
          <div class="action-chip"><v-icon icon="mdi-check" /> บันทึกลงสมุดพกความเสี่ยงแล้ว</div>
        </div>
      </v-container>
    </section>

    <section class="logbook-section section-shell reveal">
      <v-container class="logbook-grid px-5 px-md-8">
        <div class="logbook-panel">
          <div class="logbook-head">
            <div><span class="mini-label">DIGITAL LOGBOOK</span><h3>สมุดพกความเสี่ยงฟาร์ม</h3></div>
            <v-icon icon="mdi-shield-check-outline" />
          </div>
          <div class="log-row"><span>ค่า THI เฉลี่ยสัปดาห์นี้</span><strong>74.2</strong></div>
          <div class="log-row"><span>จำนวนชั่วโมงระดับเสี่ยง</span><strong>18 ชม.</strong></div>
          <div class="log-row"><span>พฤติกรรมผิดปกติที่ตรวจพบ</span><strong>3 ครั้ง</strong></div>
          <div class="log-row positive"><span>การตอบสนองของฟาร์ม</span><strong>บันทึกครบ</strong></div>
        </div>
        <div class="logbook-copy">
          <span class="eyebrow">DATA THAT CREATES VALUE</span>
          <h2>ข้อมูลฟาร์มควรต่อยอดได้<br />มากกว่าแค่แจ้งเตือน</h2>
          <p>เมื่อระบบบันทึกสภาพแวดล้อม พฤติกรรม และการจัดการของฟาร์มอย่างต่อเนื่อง ข้อมูลเหล่านี้สามารถใช้เป็นหลักฐานประกอบการคุยกับสหกรณ์ หน่วยงานสนับสนุน สินเชื่อ หรือประกันภัยปศุสัตว์อิงดัชนีในอนาคต โดยไม่สัญญาแทนสถาบันการเงิน แต่ช่วยให้เกษตรกรมีข้อมูลที่น่าเชื่อถือขึ้น</p>
        </div>
      </v-container>
    </section>

    <section id="research" class="research-section section-shell reveal">
      <v-container class="research-grid px-5 px-md-8">
        <div><span class="eyebrow">RESEARCH FOUNDATION</span><h2>ออกแบบบนแนวคิด<br />ที่ตรวจสอบได้</h2></div>
        <div class="research-stack">
          <div class="citation-card"><span class="citation-mark">“</span><p>งานวิจัยเสนอการผสานข้อมูลสิ่งแวดล้อม พฤติกรรม และการพยากรณ์เชิงเวลา เพื่อเตือนความเสี่ยง Heat Stress ได้ตั้งแต่ระยะเริ่มต้น</p><div><strong>Mulajkar et al. (2026)</strong><br /><span>Artificial Intelligence for Early Detection of Heat Stress and Environmental Hazards in Dairy Animals</span></div></div>
          <div class="reference-grid">
            <div><strong>THI + Behavior</strong><span>ใช้ข้อมูลอากาศร่วมกับพฤติกรรมเพื่อลดการพึ่งพาการคาดเดาด้วยสายตา</span></div>
            <div><strong>Time-series AI</strong><span>LSTM เหมาะกับข้อมูลที่มีลำดับเวลา เช่น ค่าอากาศย้อนหลังและแนวโน้มความเสี่ยง</span></div>
          </div>
        </div>
      </v-container>
    </section>

    <section class="cta-section">
      <v-container class="cta-content px-5 px-md-8"><div><span class="eyebrow">CARE STARTS EARLY</span><h2>เทคโนโลยีที่เข้าถึงได้<br />เพื่อฟาร์มที่ดูแลได้จริง</h2></div><v-btn class="cta-button" href="#solution" @click.prevent="scrollToSection('#solution')" size="x-large" rounded="pill">ดูภาพรวมระบบ <v-icon end icon="mdi-arrow-up" /></v-btn></v-container>
    </section>

    <footer><v-container class="footer-content px-5 px-md-8"><span>© 2026 CowCare AI · Heat Stress Intelligence for Dairy Farms</span><span>IoT ที่ออกแบบเพื่อเกษตรกรรายย่อย</span></v-container></footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

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
.landing-page { overflow: hidden; background: #fffdf7; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.section-shell { position: relative; background-image: linear-gradient(rgba(255, 253, 247, .80), rgba(255, 253, 247, .92)), url('/images/bg2.jpg'); background-position: center; background-size: cover; }
.hero { min-height: min(790px, calc(100vh - 76px)); display: grid; align-items: center; isolation: isolate; }
.hero-grid { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(420px, .98fr); gap: 70px; align-items: center; padding-top: 86px; padding-bottom: 86px; }
.ambient { position: absolute; z-index: -1; display: block; border-radius: 50%; filter: blur(2px); animation: drift 9s ease-in-out infinite alternate; }.ambient-one { width: 330px; height: 330px; top: 8%; left: -120px; background: rgba(221, 179, 111, .26); }.ambient-two { width: 280px; height: 280px; bottom: 5%; right: -100px; background: rgba(97, 144, 122, .18); animation-delay: -4s; }
.eyebrow { display: flex; align-items: center; gap: 9px; color: #d87939; font-size: .69rem; font-weight: 850; letter-spacing: .14em; }.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #d87939; box-shadow: 0 0 0 6px rgba(216, 121, 57, .12); animation: pulse 2s infinite; }
h1, h2, h3, p { margin: 0; }.hero h1 { max-width: 640px; margin: 21px 0; color: #24433a; font-size: clamp(3rem, 5.4vw, 5.5rem); font-weight: 850; letter-spacing: -.03em; line-height: 1.35; }.hero h1 span { color: #d87939; }.hero-description { max-width: 565px; color: #52675d; font-size: 1.05rem; line-height: 1.8; }.hero-actions { display: flex; align-items: center; gap: 10px; margin-top: 34px; }.primary-btn { padding-inline: 24px !important; color: white !important; background: #24433a !important; font-weight: 800; }.text-btn { color: #24433a !important; font-weight: 800; }.trust-row { display: flex; align-items: center; gap: 13px; margin-top: 40px; }.trust-row p { color: #67786f; font-size: .79rem; line-height: 1.5; }.trust-row strong { color: #24433a; }.cow-stack { display: flex; }.cow-stack span { display: grid; place-items: center; width: 32px; height: 32px; margin-left: -7px; background: #f5e8db; border: 2px solid #fffdf7; border-radius: 50%; font-size: .8rem; }.cow-stack span:first-child { margin-left: 0; }
.hero-visual { position: relative; min-height: 470px; }.visual-glow { position: absolute; inset: 40px 20px 0; border-radius: 42px; background: linear-gradient(135deg, #e0ab69, #b6d2bf); opacity: .46; transform: rotate(-5deg); }.dashboard-card { position: relative; width: min(100%, 480px); margin: 22px auto 0; padding: 28px; background: rgba(255, 253, 247, .9); border: 1px solid rgba(255,255,255,.86); border-radius: 28px; box-shadow: 0 30px 70px rgba(36, 67, 58, .18); backdrop-filter: blur(12px); }.dashboard-head, .forecast-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.mini-label { color: #849087; font-size: .6rem; font-weight: 850; letter-spacing: .11em; }.dashboard-head h2 { margin-top: 3px; font-size: 1.25rem; letter-spacing: -.04em; }.live-badge { display: flex; align-items: center; gap: 6px; padding: 7px 9px; color: #467153; background: #e6f2e7; border-radius: 99px; font-size: .66rem; font-weight: 800; }.live-badge i { width: 6px; height: 6px; background: #5eaa6d; border-radius: 50%; }.risk-panel { display: flex; align-items: center; gap: 20px; margin: 23px 0 15px; padding: 18px; background: linear-gradient(110deg, #f9e7d4, #faeee1); border-radius: 20px; }.risk-ring { display: grid; place-content: center; width: 82px; height: 82px; flex: 0 0 auto; text-align: center; background: #fffaf4; border: 7px solid #e7a560; border-radius: 50%; }.risk-ring strong { color: #cb6f33; font-size: 1.65rem; letter-spacing: -.08em; line-height: 1; }.risk-ring small { color: #8e7056; font-size: .57rem; font-weight: 850; }.risk-label { color: #9c6e45; font-size: .62rem; font-weight: 800; letter-spacing: .08em; }.risk-panel h3 { margin: 3px 0; color: #9d5526; font-size: 1rem; }.risk-panel p { color: #7f684f; font-size: .73rem; }.condition-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }.condition-grid div { display: grid; gap: 3px; padding: 11px 8px; border: 1px solid #edf0eb; border-radius: 13px; }.condition-grid .v-icon { color: #698d77; font-size: 16px; }.condition-grid span { color: #829087; font-size: .61rem; }.condition-grid strong { color: #294a3e; font-size: .85rem; }.forecast { margin-top: 18px; padding-top: 14px; border-top: 1px solid #ebeee8; }.forecast-title { color: #53675d; font-size: .74rem; font-weight: 800; }.forecast-title small { color: #d87939; font-size: .61rem; }.chart-lines { position: relative; height: 76px; margin-top: 5px; background: repeating-linear-gradient(to bottom, transparent 0 22px, #edf1ec 23px); }.chart-lines svg { width: 100%; height: 100%; }.sample-note { display: block; margin-top: 5px; color: #9aa49d; font-size: .55rem; text-align: right; }.float-card { position: absolute; right: -9px; bottom: 4px; display: flex; align-items: center; gap: 10px; padding: 13px; color: #24433a; background: #fffdf7; border-radius: 16px; box-shadow: 0 12px 30px rgba(36, 67, 58, .15); }.float-card .v-icon { padding: 8px; color: #d87939; background: #f9ebde; border-radius: 10px; }.float-card small { display: block; color: #d87939; font-size: .55rem; font-weight: 850; letter-spacing: .08em; }.float-card strong { display: block; margin-top: 2px; font-size: .68rem; }
.signal-strip { color: #f7f2e7; background: #24433a; }.signal-grid { display: grid; grid-template-columns: repeat(4, 1fr); }.signal-grid div { display: grid; align-content: center; gap: 8px; min-height: 116px; padding: 18px 23px; border-right: 1px solid rgba(255,255,255,.13); }.signal-grid div:first-child { border-left: 1px solid rgba(255,255,255,.13); }.signal-grid span { color: #dca067; font-size: 1.22rem; font-weight: 850; letter-spacing: -.03em; }.signal-grid p { max-width: 220px; font-size: .82rem; font-weight: 700; line-height: 1.45; }
.content-section { padding: 130px 0; }.section-heading { max-width: 660px; }.section-heading h2, .research-section h2, .cta-section h2 { margin-top: 15px; color: #24433a; font-size: clamp(2.25rem, 4vw, 3.6rem); font-weight: 850; letter-spacing: -.03em; line-height: 1.35; }.section-heading p { max-width: 560px; margin-top: 19px; color: #64766d; line-height: 1.75; }.feature-grid { display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 18px; margin-top: 54px; }.feature-card { position: relative; min-height: 318px; padding: 28px; background: rgba(255,253,247,.87); border: 1px solid rgba(70,100,84,.1); border-radius: 22px; box-shadow: 0 12px 34px rgba(36,67,58,.05); transition: transform .35s ease, box-shadow .35s ease; }.feature-card:hover { box-shadow: 0 21px 42px rgba(36,67,58,.13); transform: translateY(-8px); }.feature-primary { color: white; background: #315c4d; border: 0; }.feature-icon { display: grid; place-items: center; width: 45px; height: 45px; color: #476956; background: #e0efdf; border-radius: 14px; }.feature-primary .feature-icon { color: #f6cc99; background: rgba(255,255,255,.12); }.icon-sand { color: #bf7040; background: #fae5d1; }.icon-blue { color: #4c7890; background: #dfedf0; }.card-number { position: absolute; top: 30px; right: 28px; color: #a6b5aa; font-size: .73rem; font-weight: 850; }.feature-primary .card-number { color: rgba(255,255,255,.5); }.feature-card h3 { margin-top: 66px; font-size: 1.35rem; letter-spacing: -.04em; }.feature-card p { margin-top: 10px; color: #687a70; font-size: .87rem; line-height: 1.7; }.feature-primary p { color: #dce9df; }.feature-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 20px; }.feature-tags span { padding: 5px 8px; color: #ddeddf; background: rgba(255,255,255,.1); border-radius: 5px; font-size: .61rem; font-weight: 700; }.behavior-bars { display: flex; align-items: end; gap: 7px; height: 38px; margin-top: 24px; }.behavior-bars span { display: block; width: 15%; border-radius: 6px 6px 0 0; background: #b6d1b8; }.behavior-bars span:nth-child(1) { height: 40%; }.behavior-bars span:nth-child(2) { height: 65%; background: #89ae8d; }.behavior-bars span:nth-child(3) { height: 90%; background: #d98549; }.behavior-bars span:nth-child(4) { height: 55%; }.mini-alert { display: flex; gap: 6px; align-items: center; margin-top: 23px; color: #577b63; font-size: .66rem; font-weight: 750; }
.architecture-map { display: grid; grid-template-columns: 1fr 52px 1fr 52px 1fr; align-items: stretch; margin-top: 48px; }.architecture-map article { position: relative; min-height: 218px; padding: 26px; color: #24433a; background: rgba(255,253,247,.82); border: 1px solid rgba(70,100,84,.11); border-radius: 22px; box-shadow: 0 14px 36px rgba(36,67,58,.06); }.architecture-map article:nth-of-type(2) { background: #f8ead9; }.architecture-map article:nth-of-type(3) { color: #fffdf7; background: #315c4d; }.architecture-map span { color: #d87939; font-size: .68rem; font-weight: 850; letter-spacing: .12em; }.architecture-map article:nth-of-type(3) span { color: #f2bd7c; }.architecture-map .v-icon { display: block; margin-top: 24px; color: #789983; font-size: 32px; }.architecture-map article:nth-of-type(2) .v-icon { color: #d87939; }.architecture-map article:nth-of-type(3) .v-icon { color: #f2bd7c; }.architecture-map h3 { margin-top: 15px; font-size: 1.35rem; letter-spacing: -.03em; }.architecture-map p { margin-top: 9px; color: #63766b; font-size: .84rem; line-height: 1.72; }.architecture-map article:nth-of-type(3) p { color: #dce9df; }.architecture-map > i { align-self: center; height: 2px; background: linear-gradient(90deg, rgba(216,121,57,.28), rgba(49,92,77,.6)); }
.ai-section { padding: 116px 0; color: #f7f2e7; background: #19362e; }.ai-grid { display: grid; grid-template-columns: .92fr 1.08fr; gap: 80px; align-items: center; }.light-eyebrow { color: #e6ac71; }.ai-copy h2 { margin-top: 15px; color: #fffdf7; font-size: clamp(2.3rem, 4.2vw, 4rem); font-weight: 850; letter-spacing: -.03em; line-height: 1.35; }.ai-copy h2 em { color: #e6ac71; font-style: normal; }.ai-copy p { max-width: 510px; margin-top: 20px; color: #c7d6ca; line-height: 1.8; }.ai-stat { display: flex; align-items: center; gap: 15px; margin-top: 35px; }.ai-stat strong { color: #f2bd7c; font-size: 2.1rem; letter-spacing: -.07em; }.ai-stat span { max-width: 185px; color: #b6c8ba; font-size: .69rem; line-height: 1.5; }.lstm-flow { display: flex; align-items: center; justify-content: center; }.flow-node { display: grid; place-items: center; width: 108px; height: 108px; padding: 10px; color: #cce0cf; text-align: center; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.11); border-radius: 18px; }.flow-node .v-icon { margin-bottom: 6px; color: #f2bd7c; }.flow-node span { font-size: .7rem; line-height: 1.35; }.lstm-flow > i { width: 38px; height: 1px; background: #617b6d; }.model-node { color: white; background: #d87939; border-color: #eaa56f; box-shadow: 0 0 0 9px rgba(216,121,57,.12); }.model-node .v-icon { color: white; }.model-node strong { font-size: 1.1rem; }.model-node small { font-size: .52rem; opacity: .85; }.alert-node { color: #fff0d8; background: #496e5b; }.alert-node .v-icon { color: #fff0d8; }
.farmer-section { padding: 122px 0; background: #fffdf7; }.farmer-grid { display: grid; grid-template-columns: .95fr 360px; gap: 84px; align-items: center; }.farmer-copy h2, .logbook-copy h2 { margin-top: 15px; color: #24433a; font-size: clamp(2.2rem, 3.8vw, 3.45rem); font-weight: 850; letter-spacing: -.03em; line-height: 1.35; }.farmer-copy p, .logbook-copy p { max-width: 620px; margin-top: 18px; color: #64766d; line-height: 1.8; }.persona-list { display: grid; gap: 12px; margin-top: 28px; }.persona-list div { display: flex; align-items: center; gap: 12px; color: #36564a; font-size: .91rem; font-weight: 720; }.persona-list .v-icon { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 auto; color: #d87939; background: #faeadb; border-radius: 12px; }.phone-alert { position: relative; padding: 22px; background: #1f3d34; border: 9px solid #142a24; border-radius: 34px; box-shadow: 0 24px 54px rgba(31,61,52,.24); }.phone-top { display: flex; justify-content: center; gap: 5px; margin-bottom: 24px; }.phone-top span { width: 6px; height: 6px; background: rgba(255,255,255,.35); border-radius: 50%; }.chat-bubble { width: fit-content; max-width: 100%; padding: 12px 14px; border-radius: 16px; font-size: .78rem; }.chat-bubble.system { margin-bottom: 10px; color: #bfd4c4; background: rgba(255,255,255,.08); }.chat-bubble.alert { margin-left: auto; color: #24433a; background: #fff7ea; border-bottom-right-radius: 5px; }.chat-bubble.alert strong { display: block; margin-bottom: 8px; color: #bf6230; font-size: .83rem; }.chat-bubble.alert p { color: #4f6358; line-height: 1.65; }.action-chip { display: flex; align-items: center; gap: 7px; width: fit-content; margin-top: 18px; padding: 9px 11px; color: #dce9df; background: rgba(255,255,255,.09); border-radius: 99px; font-size: .68rem; font-weight: 780; }
.logbook-section { padding: 116px 0; }.logbook-grid { display: grid; grid-template-columns: 420px 1fr; gap: 84px; align-items: center; }.logbook-panel { padding: 28px; background: rgba(255,253,247,.9); border: 1px solid rgba(70,100,84,.12); border-radius: 24px; box-shadow: 0 24px 58px rgba(36,67,58,.12); }.logbook-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 20px; }.logbook-head h3 { margin-top: 4px; color: #24433a; font-size: 1.2rem; letter-spacing: -.03em; }.logbook-head .v-icon { display: grid; place-items: center; width: 48px; height: 48px; color: #fffdf7; background: #315c4d; border-radius: 15px; }.log-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0; color: #64766d; border-top: 1px solid #e7ece6; font-size: .84rem; }.log-row strong { color: #24433a; font-size: .98rem; white-space: nowrap; }.log-row.positive strong { color: #3f8352; }
.research-section { padding: 115px 0; }.research-grid { display: grid; grid-template-columns: .85fr 1.15fr; gap: 80px; align-items: center; }.research-stack { display: grid; gap: 14px; }.citation-card { position: relative; padding: 38px 42px 34px; background: rgba(255,253,247,.86); border: 1px solid rgba(71,100,84,.12); border-radius: 22px; box-shadow: 0 17px 45px rgba(36,67,58,.07); }.citation-mark { position: absolute; top: 13px; left: 24px; color: #e6ac71; font-family: Georgia, serif; font-size: 4.6rem; line-height: 1; }.citation-card p { position: relative; color: #355447; font-size: 1.13rem; font-weight: 650; letter-spacing: -.025em; line-height: 1.6; }.citation-card div { margin-top: 22px; padding-top: 18px; color: #687a70; border-top: 1px solid #e6ece6; font-size: .7rem; line-height: 1.55; }.citation-card strong { color: #d87939; }.reference-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }.reference-grid div { padding: 18px; background: rgba(255,253,247,.72); border: 1px solid rgba(70,100,84,.1); border-radius: 16px; }.reference-grid strong { display: block; color: #24433a; font-size: .86rem; }.reference-grid span { display: block; margin-top: 7px; color: #64766d; font-size: .73rem; line-height: 1.55; }
.cta-section { padding: 86px 0; background: #e9dcc6; }.cta-content { display: flex; align-items: center; justify-content: space-between; gap: 32px; }.cta-button { padding-inline: 25px !important; color: white !important; background: #24433a !important; font-weight: 800; }footer { padding: 25px 0; color: #a8b6aa; background: #19362e; font-size: .65rem; }.footer-content { display: flex; justify-content: space-between; gap: 20px; }
.hero-enter { animation: rise .8s cubic-bezier(.22, .72, .26, 1) .1s both; }.hero-enter-delay { animation: rise .9s cubic-bezier(.22, .72, .26, 1) .2s both; }.reveal { opacity: 0; transform: translate3d(0, 24px, 0); transition: opacity .56s ease-out, transform .56s cubic-bezier(.22, .72, .26, 1); will-change: opacity, transform; }.reveal.is-visible { opacity: 1; transform: translate3d(0, 0, 0); }#solution, #lstm, #research { scroll-margin-top: 88px; }@keyframes rise { from { opacity: 0; transform: translate3d(0, 28px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }@keyframes drift { to { transform: translate3d(26px, -17px, 0) scale(1.07); } }@keyframes pulse { 50% { box-shadow: 0 0 0 10px rgba(216,121,57,0); } }
@media (max-width: 960px) { .hero-grid, .ai-grid, .research-grid, .farmer-grid, .logbook-grid { grid-template-columns: 1fr; gap: 46px; }.hero { min-height: auto; }.hero-grid { padding-top: 68px; }.hero-copy { text-align: center; }.hero-copy .eyebrow, .hero-actions, .trust-row { justify-content: center; }.hero-description { margin-inline: auto; }.hero-visual { min-height: 425px; max-width: 550px; width: 100%; margin: auto; }.architecture-map { grid-template-columns: 1fr; gap: 14px; }.architecture-map > i { width: 2px; height: 24px; justify-self: center; background: linear-gradient(180deg, rgba(216,121,57,.28), rgba(49,92,77,.6)); }.feature-grid { grid-template-columns: 1fr; }.feature-card { min-height: 250px; }.ai-copy, .farmer-copy, .logbook-copy { text-align: center; }.ai-copy p, .farmer-copy p, .logbook-copy p { margin-inline: auto; }.ai-stat { justify-content: center; }.signal-grid { grid-template-columns: repeat(2, 1fr); }.signal-grid div:nth-child(3) { border-left: 1px solid rgba(255,255,255,.13); }.phone-alert, .logbook-panel { max-width: 420px; width: 100%; margin: auto; }.persona-list { max-width: 560px; margin-inline: auto; text-align: left; }.research-grid { text-align: center; }.citation-card { text-align: left; }.cta-content { align-items: flex-start; flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
@media (max-width: 600px) { .hero-grid { padding-top: 51px; padding-bottom: 60px; }.hero h1 { font-size: 3.05rem; }.hero-description { font-size: .94rem; }.hero-actions { flex-direction: column; }.hero-actions .v-btn { width: 100%; }.dashboard-card { padding: 20px; }.float-card { right: 0; bottom: -10px; }.signal-grid div { min-height: 118px; padding: 15px 12px; }.signal-grid span { font-size: 1rem; }.signal-grid p { font-size: .72rem; }.content-section, .research-section, .farmer-section, .logbook-section { padding: 78px 0; }.architecture-map article { min-height: auto; }.ai-section { padding: 78px 0; }.lstm-flow { flex-wrap: wrap; gap: 12px; }.lstm-flow > i { width: 16px; }.flow-node { width: 98px; height: 98px; }.research-grid { gap: 32px; }.citation-card { padding: 31px 25px 27px; }.citation-card p { font-size: 1rem; }.reference-grid { grid-template-columns: 1fr; }.log-row { align-items: flex-start; flex-direction: column; gap: 5px; }.footer-content { flex-direction: column; } }
</style>
