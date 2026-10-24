# CowCare AI - Gemini AI Admin Integration Specification
**สเปกการบูรณาการระบบ Google Gemini Generative AI สำหรับระบบผู้ดูแล (Admin Portal)**  
*เอกสารจัดทำเมื่อ: 19 ตุลาคม 2026 | เวอร์ชัน: 1.0 (Draft Architecture)*

---

## 📌 1. วัตถุประสงค์ (Executive Objective)
ยกระดับระบบบริหารจัดการฟาร์มโคนมสำหรับผู้บริหารสหกรณ์และสัตวแพทย์ประจำพื้นที่ (แผนงานระยะถัดไปหลังติดตั้งภาคสนาม) โดยใช้ **Google Gemini GenAI (`gemini-2.5-flash`)** เปลี่ยนข้อมูลเซ็นเซอร์ IoT (SHT20 RS485) และการนับท่าวัวจากกล้องวงจรปิด (YOLO26m ONNX) ให้กลายเป็น:
1. **บทสรุปผู้บริหารและรายงานความเสี่ยง (Executive ESG Summary)**
2. **บทวิเคราะห์วินิจฉัยเชิงลึกรายฟาร์ม (Virtual Barn Consultant)**
3. **ข้อความสื่อสารเตือนภัยเกษตรกรผ่าน LINE (Smart Broadcast Generator)**
4. **ผู้ช่วยถาม-ตอบข้อมูลฟาร์มภาษาธรรมชาติ (Admin Natural Language Copilot)**

---

## 🏛️ 2. แผนการบูรณาการ 4 จุดหลักในระบบ Admin

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             COWCARE AI ADMIN PORTAL                         │
└──────┬──────────────────────┬──────────────────────┬──────────────────┬─────┘
       │                      │                      │                  │
       ▼                      ▼                      ▼                  ▼
[1. ESG & Coop Report] [2. Farm Deep Insights] [3. Smart LINE Alerts] [4. Admin AI Copilot]
• สรุปสถานการณ์รวมทุกฟาร์ม • วินิจฉัย Root Cause     • ร่างข้อความ Broadcast • ค้นหาข้อมูลภาษาธรรมชาติ
• ประเมินสินเชื่อ ธ.ก.ส.  • แนะนำการแก้ปัญหา 2 ขั้น • ภาษาชาวบ้าน เป็นกันเอง • ถามตอบสถานะฟาร์มด่วน
• Export บทวิเคราะห์ PDF   • ผสานข้อมูลกล้อง + เซ็นเซอร์• ส่งตรงเข้า LINE OA    • กรองฟาร์มเสี่ยงสูง
```

---

### จุดที่ 1: รายงานภาพรวมสหกรณ์ & สินเชื่อสีเขียว (Cooperative & ESG Digital Logbook)
* **ตำแหน่งหน้าเว็บ:** `frontend/app/pages/Admin/coop_report.vue`
* **Backend Endpoint:** `POST /api/Admin/coop-report/generate-ai-summary`
* **ข้อมูลที่ป้อนให้ Gemini (Input Payload):**
  - สถิติ THI ย้อนหลัง 7–30 วันของทุกฟาร์มในสหกรณ์
  - การประเมินน้ำนมลดสะสม (Estimated Herd Milk Loss ในหน่วย กก.)
  - ลักษณะโรงเรือนของแต่ละฟาร์ม (ความสูงหลังคา, ชนิดหลังคา สังกะสี/เมทัลชีท/กระเบื้อง)
  - พฤติกรรมการพักผ่อนของโคนมจากกล้อง (จำนวนวัวนอน ยืน กินอาหาร และดื่มน้ำ)
* **Prompt Logic & System Constraints:**
  - สรุปภาพรวมความเสี่ยงในรูปแบบภาษาทางการสำหรับผู้บริหาร
  - ชี้เป้าฟาร์มที่มีความเสี่ยงวิกฤต พร้อมระบุปัจจัยทางกายภาพของโรงเรือน
  - เสนอคำแนะนำเชิงนโยบาย เช่น การปล่อยสินเชื่อดอกเบี้ยต่ำเพื่อปรับปรุงหลังคา/พัดลม
* **ผลลัพธ์ที่ได้ (Output Format):**
  - Markdown Summary Card บนหน้าเว็บ
  - แนบเข้าเอกสาร PDF ตอนกด "Export ESG Cooperative Report"

---

### จุดที่ 2: บทวิเคราะห์วินิจฉัยเชิงลึกรายฟาร์ม (Virtual Barn Diagnostic Consultant)
* **ตำแหน่งหน้าเว็บ:** `frontend/app/pages/Admin/farms/farm_detail-[id].vue`
* **UI Component:** ปุ่ม `✨ วิเคราะห์ฟาร์มเชิงลึกด้วย Gemini AI` บน Header ของฟาร์ม
* **Backend Endpoint:** `POST /api/Admin/farms/:id/ai-diagnostic`
* **ข้อมูลที่ป้อนให้ Gemini (Input Payload):**
  - ข้อมูลฟาร์ม: ชื่อฟาร์ม, พิกัด, ขนาดโรงเรือน, หลังคา, ระบบระบายอากาศ
  - ข้อมูล Telemetry ล่าสุด: Temp, Humidity, THI (NRC 1971), ชั่วโมงพักกลางคืน และจำนวนวันเครียดสะสม
  - ข้อมูล Vision ล่าสุด: จำนวนวัวนอน (Lying), ยืน (Standing), กินอาหาร (Eating), ดื่มน้ำ (Drinking)
  - Multimodal Mismatch Status (เช่น เซ็นเซอร์ร้อนแต่วัวไม่ออกอาการ)
* **Prompt Logic & System Constraints:**
  - **ห้ามแนะนำการติดแอร์** ให้แนะนำตามบริบทฟาร์มรายย่อยไทย (Tikul & Prachum, 2019)
  - **Anti-Misting Hard Rule:** หากความชื้นสัมพัทธ์ $\ge 75\%$ สั่งห้ามพ่นหมอกเด็ดขาดเพื่อป้องกันเต้านมอักเสบ
  - แบ่งคำแนะนำเป็น 2 ระดับ:
    1. *มาตรการด่วน (งบ 0 บาท):* ปรับเวลาให้อาหาร, เพิ่มน้ำดื่มสะอาด, เปิดพัดลมช่วงบ่าย
    2. *มาตรการระยะยาว (ลงทุนต่ำ-ปานกลาง):* เสริมฉนวนกันความร้อน, ปรับระดับความสูงหลังคา
* **ผลลัพธ์ที่ได้ (Output Format):**
  - Modal / Drawer แสดงผลการวิเคราะห์ พร้อมแท็กระดับความเร่งด่วน

---

### จุดที่ 3: ระบบสร้างข้อความแจ้งเตือนอัจฉริยะ (Smart LINE Broadcast Generator)
* **ตำแหน่งหน้าเว็บ:** `frontend/app/pages/Admin/alerts.vue`
* **Backend Endpoint:** `POST /api/Admin/alerts/generate-broadcast-draft`
* **ฟังก์ชันการทำงาน:**
  - เมื่อเกิดเหตุการณ์ความร้อนสะสมหรือพยากรณ์พบล่วงหน้า 3 วันว่า THI $\ge 80.0$
  - Gemini จะอ่านพยากรณ์อากาศและลักษณะของฟาร์มในกลุ่มเสี่ยง แล้วร่างข้อความแจ้งเตือนสำหรับส่งเข้า LINE Official Account
  - **ลักษณะข้อความ:** ใช้ภาษาไทยที่เป็นกันเอง เข้าใจง่าย มี Emoji ชัดเจน ไม่ใช้ศัพท์เทคนิคที่เกษตรกรสับสน
  - **Human-in-the-Loop:** แอดมินสามารถอ่านทบทวน แก้ไขข้อความ และกดยืนยันปุ่มเดียวเพื่อส่ง Broadcast ถึงเกษตรกรทุกคนได้ทันที

---

### จุดที่ 4: ผู้ช่วยแอดมินอัจฉริยะ (Admin AI Copilot / Natural Language Query)
* **ตำแหน่งหน้าเว็บ:** Floating Chat Widget มุมขวาล่างของระบบ Admin ทุกหน้า
* **Backend Endpoint:** `POST /api/Admin/copilot/chat`
* **ฟังก์ชันการทำงาน:**
  - แอดมินพิมพ์ถามข้อมูลภาษาไทยได้ทันที เช่น:
    - *"มีฟาร์มไหนบ้างที่เครียดจากความร้อนติดต่อกันเกิน 3 วัน?"*
    - *"สรุปฟาร์มที่เซ็นเซอร์ออฟไลน์เกิน 24 ชั่วโมงให้หน่อย"*
    - *"เปรียบเทียบให้ดูหน่อยว่า ระหว่างฟาร์มหลังคาสังกะสีกับเมทัลชีท ฟาร์มไหนเสี่ยงน้ำนมลดมากกว่ากัน?"*
  - ระบบจะแปลงคำถามเป็น SQL Query (Read-only ปลอดภัย ไม่แก้ไขข้อมูล) ดึงข้อมูลจาก Supabase แล้วส่งให้ Gemini สรุปคำตอบพร้อมปุ่มกดลิงก์ไปยังฟาร์มนั้นๆ ทันที

---

## ⚙️ 3. สถาปัตยกรรมทางเทคนิคและการจัดการ Fail-Safe

```javascript
// ตัวอย่างโครงสร้างการเรียกใช้งาน geminiAdminService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function generateExecutiveReport(farmMetricsData) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });

        const prompt = buildExecutivePrompt(farmMetricsData);
        const result = await model.generateContent(prompt);
        return { success: true, analysis: result.response.text(), source: 'gemini_genai' };
    } catch (error) {
        console.warn('[Gemini AI Fallback] Error contacting Gemini:', error.message);
        // Fallback อัตโนมัติไปยัง Rule-Based Heuristic ตามงานวิจัย เพื่อไม่ให้ระบบล่ม
        return { 
            success: true, 
            analysis: generateHeuristicRuleBasedSummary(farmMetricsData), 
            source: 'deterministic_heuristic_fallback' 
        };
    }
}
```

### หลักการความปลอดภัยและความเสถียร (Guarantees):
1. **Graceful Fallback 100%:** หากโควตา API หมด หรือเน็ตมีปัญหา ระบบจะสลับไปใช้ **Deterministic Rule-Based Engine (อิงงานวิจัยไทย)** เสมอ หน้าเว็บจะไม่พังเด็ดขาด
2. **Context Guardrails:** ทุก Prompt มีการระบุ **Anti-Misting Rule** (ห้ามพ่นหมอกเมื่อความชื้นเกิน 75%) และบริบทสายพันธุ์โคนมลูกผสมไทยอย่างเข้มงวด
3. **Database Read-only:** สำหรับระบบ Copilot การแปลงภาษาธรรมชาติจะถูกจำกัดเฉพาะสิทธิ์ `SELECT` เท่านั้น ป้องกันการแก้ไขหรือลบข้อมูลโดยไม่ตั้งใจ

---

## 📅 4. แผนงานการติดตั้งในอนาคต (Roadmap Phase)
* **เฟสปัจจุบัน:** Deploy ระบบหลัก, เชื่อมต่อ ESP32-S3 ในห้อง, ตรวจสอบ Cloudflare Tunnel และ Real-time Dashboard
* **เฟสถัดไป (เมื่อระบบหลักนิ่ง):**
  1. สร้างไฟล์ `backend_node/app/services/geminiAdminService.js`
  2. เพิ่ม Endpoint ใน `coopReport.js` และ `farms.js`
  3. เพิ่ม UI Card บนหน้า `coop_report.vue` และ `farm_detail-[id].vue`
