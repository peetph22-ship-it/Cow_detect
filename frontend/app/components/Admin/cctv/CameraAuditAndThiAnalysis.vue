<template>
  <div class="pt-5 border-t border-[#e5ece9] space-y-6">

    <!-- ส่วนหัว: สลับแท็บระหว่าง 1) นับเทียบภาพตัวอย่าง และ 2) วิเคราะห์ % วัวนอนเทียบ THI -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-[#24433a]/10 text-[#24433a] flex items-center justify-center">
          <v-icon icon="mdi-ClipboardCheckOutline" size="20" />
        </div>
        <div>
          <h4 class="text-sm font-black text-[#24433a]">
            ตรวจสอบความแม่นยำกล้อง &amp; วิเคราะห์ % วัวนอนเทียบ THI
          </h4>
          <p class="text-[11px] text-[#718078] font-medium">
            นับเทียบภาพตัวอย่างรายชั่วโมงจาก bucket <code class="font-mono text-[10px] bg-[#f0f4f2] px-1.5 py-0.5 rounded">camera-samples</code> และวิเคราะห์จุดหัก (Broken-line Regression)
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 bg-[#f0f4f2] p-1 rounded-xl self-start sm:self-auto">
        <button
          type="button"
          @click="activeTab = 'audit'"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          :class="activeTab === 'audit' ? 'bg-[#24433a] text-white shadow-xs' : 'text-[#4e6057] hover:text-[#24433a]'">
          1. นับเทียบความแม่นยำ (Model Audit)
        </button>
        <button
          type="button"
          @click="activeTab = 'analysis'"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          :class="activeTab === 'analysis' ? 'bg-[#24433a] text-white shadow-xs' : 'text-[#4e6057] hover:text-[#24433a]'">
          2. วิเคราะห์ % วัวนอนเทียบ THI
        </button>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- แท็บ 1: หน้า Admin นับเทียบภาพตัวอย่าง (Model Audit) -->
    <!-- ========================================================= -->
    <div v-if="activeTab === 'audit'" class="space-y-4">

      <!-- แจ้งเตือนกรณีตาราง tb_camera_sample_audits ยังไม่ได้รัน migration -->
      <div
        v-if="samplesData.migration_required"
        class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
        <v-icon icon="mdi-database-alert-outline" size="18" class="text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span class="font-black">ยังไม่ได้สร้างตารางเก็บผลนับเทียบในฐานข้อมูล:</span>
          กรุณานำไฟล์ <code class="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">{{ samplesData.migration_file }}</code>
          ไปรันใน Supabase SQL Editor ก่อนบันทึกผลการนับเทียบ
        </div>
      </div>

      <!-- การ์ดสรุปความคลาดเคลื่อนของโมเดล (แสดงจากข้อมูลที่นับเทียบจริงเท่านั้น) -->
      <div class="p-4 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-[#24433a]">สรุปความแม่นยำจากการนับเทียบจริง</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f0ec] text-[#24433a]">
              ตรวจแล้ว {{ samplesData.summary?.audited_count || 0 }} ภาพ
            </span>
          </div>
          <button
            type="button"
            @click="loadSamples"
            :disabled="isLoadingSamples"
            class="px-2.5 py-1 rounded-lg bg-white hover:bg-[#f0f4f2] border border-[#dce4e0] text-[11px] font-bold text-[#24433a] cursor-pointer">
            {{ isLoadingSamples ? 'กำลังโหลด...' : 'รีเฟรชรายการภาพ' }}
          </button>
        </div>

        <div v-if="samplesData.summary?.audited_count > 0 && samplesData.summary?.metrics" class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div
            v-for="key in ['lying', 'standing', 'total']"
            :key="key"
            class="p-3 rounded-xl bg-white border border-[#e5ece9] space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-[#4e6057]">{{ samplesData.summary.metrics[key]?.label_th }}</span>
              <span class="text-[10px] font-mono text-[#718078]">n={{ samplesData.summary.metrics[key]?.n || 0 }}</span>
            </div>
            <div class="text-lg font-black text-[#24433a] font-mono">
              คลาดเฉลี่ย {{ samplesData.summary.metrics[key]?.mae ?? '—' }} <span class="text-xs font-normal text-[#718078]">ตัว/ภาพ</span>
            </div>
            <div
              class="text-[11px] font-bold"
              :class="(samplesData.summary.metrics[key]?.bias || 0) > 0.1 ? 'text-amber-700' : (samplesData.summary.metrics[key]?.bias || 0) < -0.1 ? 'text-rose-700' : 'text-emerald-700'">
              {{ samplesData.summary.metrics[key]?.direction_th || '—' }}
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-[#718078]">
          ยังไม่มีข้อมูลการนับเทียบจากผู้ดูแลระบบ (เลือกภาพตัวอย่างด้านล่างแล้วกรอกจำนวนวัวที่เห็นจริงเพื่อเริ่มคำนวณค่าคลาดเคลื่อน)
        </p>
      </div>

      <!-- ส่วนแสดงภาพตัวอย่าง + กรอบ YOLO + ฟอร์มกรอกจำนวนจริง -->
      <div v-if="samplesData.samples && samplesData.samples.length > 0" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        <!-- ซ้าย: เลือกภาพ + ภาพตัวอย่างพร้อมกรอบ SVG (7 คอลัมน์) -->
        <div class="lg:col-span-7 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-[#24433a]">เลือกชั่วโมงภาพตัวอย่าง:</label>
              <select
                v-model="selectedSamplePath"
                class="text-xs font-mono font-bold bg-white border border-[#dce4e0] rounded-xl px-3 py-1.5 text-[#24433a]">
                <option
                  v-for="s in samplesData.samples"
                  :key="s.sample_path"
                  :value="s.sample_path">
                  {{ s.hour_label }} · โมเดลนับได้ {{ s.model_counts?.total ?? 0 }} ตัว {{ s.audit ? '✓ (ตรวจแล้ว)' : '' }}
                </option>
              </select>
            </div>

            <button
              type="button"
              @click="showBoxes = !showBoxes"
              class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer"
              :class="showBoxes ? 'bg-[#24433a] text-white border-[#24433a]' : 'bg-white text-[#24433a] border-[#dce4e0]'">
              {{ showBoxes ? 'ซ่อนกรอบ YOLO (เพื่อนับเอง)' : 'แสดงกรอบ YOLO' }}
            </button>
          </div>

          <!-- กรอบแสดงภาพ + SVG Overlay วาดกรอบตามพิกัด 0..1 จาก JSON -->
          <div v-if="currentSample" class="relative rounded-2xl overflow-hidden bg-[#142820] border border-[#24433a] min-h-[260px] flex items-center justify-center">
            <div v-if="currentSample.image_url" class="relative w-full inline-block">
              <img
                :src="currentSample.image_url"
                :alt="currentSample.hour_label"
                class="w-full h-auto block select-none"
              />
              <svg
                v-if="showBoxes && currentSample.boxes && currentSample.boxes.length"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                class="absolute inset-0 w-full h-full pointer-events-none">
                <g v-for="(b, idx) in currentSample.boxes" :key="idx">
                  <rect
                    :x="b.x1 * 1000"
                    :y="b.y1 * 1000"
                    :width="Math.max(4, (b.x2 - b.x1) * 1000)"
                    :height="Math.max(4, (b.y2 - b.y1) * 1000)"
                    fill="none"
                    :stroke="boxColor(b.cls)"
                    stroke-width="4"
                  />
                  <rect
                    :x="b.x1 * 1000"
                    :y="Math.max(0, b.y1 * 1000 - 28)"
                    width="190"
                    height="26"
                    :fill="boxColor(b.cls)"
                  />
                  <text
                    :x="b.x1 * 1000 + 6"
                    :y="Math.max(18, b.y1 * 1000 - 9)"
                    fill="#ffffff"
                    font-size="18"
                    font-family="monospace"
                    font-weight="bold">
                    {{ boxLabelTh(b.cls) }} {{ Math.round((b.score || 0) * 100) }}%
                  </text>
                </g>
              </svg>
            </div>
            <div v-else class="p-8 text-center text-xs text-white/70">
              ไม่สามารถสร้างลิงก์ภาพตัวอย่างได้
            </div>
          </div>

          <!-- คำอธิบายสีกรอบ -->
          <div class="flex flex-wrap items-center gap-3 text-[11px] text-[#4e6057]">
            <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block"></span> นอน (Lying)</span>
            <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-orange-500 inline-block"></span> ยืน (Standing)</span>
            <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span> กินอาหาร (Feeding)</span>
            <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-cyan-500 inline-block"></span> ดื่มน้ำ (Drinking)</span>
          </div>
        </div>

        <!-- ขวา: ตารางเทียบค่าที่โมเดลนับได้ กับ ช่องกรอกจำนวนจริงของ Admin (5 คอลัมน์) -->
        <div v-if="currentSample" class="lg:col-span-5 p-4 rounded-2xl bg-white border border-[#e5ece9] space-y-3.5">
          <div class="flex items-center justify-between border-b border-[#f0f4f2] pb-2.5">
            <div>
              <h5 class="text-xs font-black text-[#24433a]">บันทึกจำนวนวัวที่เห็นจริงในภาพ</h5>
              <span class="text-[11px] text-[#718078] font-mono">{{ currentSample.hour_label }}</span>
            </div>
            <span
              v-if="currentSample.audit"
              class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
              ตรวจแล้ว
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2 text-xs font-bold text-[#4e6057] bg-[#f8faf9] p-2 rounded-xl text-center">
            <span class="text-left pl-1">ท่าทาง</span>
            <span>YOLO นับได้</span>
            <span>เห็นจริง (ตัว)</span>
          </div>

          <!-- นอน -->
          <div class="grid grid-cols-3 gap-2 items-center text-xs">
            <span class="font-bold text-blue-800">นอนพัก (Lying) *</span>
            <span class="text-center font-mono font-black text-blue-700 bg-blue-50 py-1.5 rounded-lg">
              {{ currentSample.model_counts?.lying ?? 0 }}
            </span>
            <input
              v-model.number="auditForm.human_lying"
              type="number"
              min="0"
              max="500"
              class="w-full border border-[#dce4e0] rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-[#24433a]"
            />
          </div>

          <!-- ยืน -->
          <div class="grid grid-cols-3 gap-2 items-center text-xs">
            <span class="font-bold text-orange-800">ยืน (Standing) *</span>
            <span class="text-center font-mono font-black text-orange-700 bg-orange-50 py-1.5 rounded-lg">
              {{ currentSample.model_counts?.standing ?? 0 }}
            </span>
            <input
              v-model.number="auditForm.human_standing"
              type="number"
              min="0"
              max="500"
              class="w-full border border-[#dce4e0] rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-[#24433a]"
            />
          </div>

          <!-- กินอาหาร -->
          <div class="grid grid-cols-3 gap-2 items-center text-xs">
            <span class="font-bold text-emerald-800">กินอาหาร (Feeding)</span>
            <span class="text-center font-mono font-black text-emerald-700 bg-emerald-50 py-1.5 rounded-lg">
              {{ currentSample.model_counts?.feeding ?? 0 }}
            </span>
            <input
              v-model.number="auditForm.human_feeding"
              type="number"
              min="0"
              max="500"
              class="w-full border border-[#dce4e0] rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-[#24433a]"
            />
          </div>

          <!-- ดื่มน้ำ -->
          <div class="grid grid-cols-3 gap-2 items-center text-xs">
            <span class="font-bold text-cyan-800">ดื่มน้ำ (Drinking)</span>
            <span class="text-center font-mono font-black text-cyan-700 bg-cyan-50 py-1.5 rounded-lg">
              {{ currentSample.model_counts?.drinking ?? 0 }}
            </span>
            <input
              v-model.number="auditForm.human_drinking"
              type="number"
              min="0"
              max="500"
              class="w-full border border-[#dce4e0] rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-[#24433a]"
            />
          </div>

          <!-- หมายเหตุ -->
          <div class="space-y-1 pt-1">
            <label class="text-[11px] font-bold text-[#4e6057]">หมายเหตุ (เช่น มีวัวซ้อนกันมุมมืด / แสงย้อน):</label>
            <input
              v-model="auditForm.note"
              type="text"
              placeholder="ไม่บังคับ"
              class="w-full border border-[#dce4e0] rounded-lg px-3 py-1.5 text-xs text-[#24433a]"
            />
          </div>

          <div v-if="auditMessage" class="text-xs font-bold px-3 py-2 rounded-xl" :class="auditSuccess ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'">
            {{ auditMessage }}
          </div>

          <button
            type="button"
            @click="submitAudit"
            :disabled="isSavingAudit"
            class="w-full py-2.5 rounded-xl bg-[#24433a] hover:bg-[#1b342d] text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50">
            {{ isSavingAudit ? 'กำลังบันทึก...' : 'บันทึกผลการนับเทียบภาพนี้' }}
          </button>
        </div>

      </div>

      <!-- กรณีไม่มีภาพตัวอย่างใน bucket camera-samples -->
      <div v-else class="p-6 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] text-center space-y-1.5">
        <v-icon icon="mdi-image-off-outline" size="28" class="text-[#718078] mx-auto" />
        <p class="text-xs font-bold text-[#24433a]">ยังไม่มีภาพตัวอย่างรายชั่วโมงใน bucket <code class="font-mono">camera-samples</code> สำหรับฟาร์มนี้</p>
        <p class="text-[11px] text-[#718078]">
          เมื่อ ESP32 ส่งภาพจากกล้องเข้ามา ระบบจะเก็บภาพตัวอย่างชั่วโมงละ 1 รูปพร้อมไฟล์ <code class="font-mono">HH.json</code> ให้อัตโนมัติ
        </p>
      </div>

    </div>

    <!-- ========================================================= -->
    <!-- แท็บ 2: หน้าวิเคราะห์ % วัวนอนรายชั่วโมงเทียบ THI -->
    <!-- ========================================================= -->
    <div v-else class="space-y-4">

      <!-- ป้ายกำกับบังคับ: ผลนำร่องในฟาร์มเดียว -->
      <div class="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs text-amber-950">
          <v-icon icon="mdi-flask-outline" size="18" class="text-amber-700 shrink-0" />
          <span class="font-black">{{ analysisData?.scope_label_th || 'ผลนำร่องในฟาร์มเดียว (Single-Farm Pilot Analysis) — ไม่ใช่เกณฑ์มาตรฐานใหม่ของโคนมไทย' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <select
            v-model.number="analysisDays"
            @change="loadAnalysis"
            class="text-xs font-bold bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-[#24433a]">
            <option :value="14">ย้อนหลัง 14 วัน</option>
            <option :value="21">ย้อนหลัง 21 วัน</option>
            <option :value="30">ย้อนหลัง 30 วัน</option>
            <option :value="60">ย้อนหลัง 60 วัน</option>
          </select>
          <button
            type="button"
            @click="loadAnalysis"
            :disabled="isLoadingAnalysis"
            class="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100/60 border border-amber-300 text-[11px] font-bold text-amber-950 cursor-pointer">
            {{ isLoadingAnalysis ? 'กำลังคำนวณ...' : 'รีเฟรช' }}
          </button>
        </div>
      </div>

      <!-- สถานะความพร้อมของข้อมูล -->
      <div v-if="analysisData" class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-white border border-[#e5ece9]">
          <span class="text-[11px] text-[#718078] block">ชั่วโมงที่มีทั้งกล้อง + THI</span>
          <span class="text-base font-black font-mono text-[#24433a]">{{ analysisData.total_paired_hours }} ชม.</span>
        </div>
        <div class="p-3 rounded-xl bg-white border border-[#e5ece9]">
          <span class="text-[11px] text-[#718078] block">ตัดช่วงรีดนม/ให้อาหารออก</span>
          <span class="text-base font-black font-mono text-amber-700">{{ analysisData.excluded_routine_hours_count }} ชม.</span>
          <span class="text-[10px] text-[#718078] block truncate" :title="(analysisData.routine_labels || []).join(', ')">
            {{ analysisData.routine_labels?.length ? analysisData.routine_labels.join(', ') : 'ยังไม่ได้ตั้งเวลาในข้อมูลฟาร์ม' }}
          </span>
        </div>
        <div class="p-3 rounded-xl bg-white border border-[#e5ece9]">
          <span class="text-[11px] text-[#718078] block">ชั่วโมงที่ใช้คำนวณจริง</span>
          <span class="text-base font-black font-mono" :class="analysisData.analyzed_hours >= analysisData.min_required_hours ? 'text-emerald-700' : 'text-rose-700'">
            {{ analysisData.analyzed_hours }} / {{ analysisData.min_required_hours }} ชม.
          </span>
        </div>
        <div class="p-3 rounded-xl bg-white border border-[#e5ece9]">
          <span class="text-[11px] text-[#718078] block">ช่วงค่า THI ที่พบจริง</span>
          <span class="text-base font-black font-mono text-[#24433a]">
            {{ analysisData.thi_range?.min != null ? `${analysisData.thi_range.min}–${analysisData.thi_range.max}` : '—' }}
          </span>
          <span class="text-[10px] text-[#718078] block">กว้าง {{ analysisData.thi_range?.span ?? 0 }} หน่วย (ขั้นต่ำ {{ analysisData.min_required_thi_span }})</span>
        </div>
      </div>

      <!-- กรณีข้อมูลพอ: แสดงผล Broken-line Regression พร้อม 95% CI และกราฟ -->
      <div v-if="analysisData?.sufficient_data && analysisData?.broken_line" class="p-5 rounded-2xl bg-white border border-[#e5ece9] space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div class="p-3.5 rounded-xl bg-[#f8faf9] border border-[#e5ece9]">
            <span class="text-[11px] text-[#718078] block">จุดหัก (Breakpoint THI)</span>
            <span class="text-xl font-black font-mono text-[#d87939]">{{ analysisData.broken_line.breakpoint_thi }}</span>
            <span class="text-[11px] font-mono text-[#4e6057] block">
              95% CI: {{ analysisData.broken_line.ci95_low ?? '—' }} – {{ analysisData.broken_line.ci95_high ?? '—' }}
            </span>
          </div>
          <div class="p-3.5 rounded-xl bg-[#f8faf9] border border-[#e5ece9]">
            <span class="text-[11px] text-[#718078] block">ความชันก่อนจุดหัก</span>
            <span class="text-base font-black font-mono text-[#24433a]">
              {{ analysisData.broken_line.slope_before_per_thi > 0 ? `+${analysisData.broken_line.slope_before_per_thi}` : analysisData.broken_line.slope_before_per_thi }}% / THI
            </span>
          </div>
          <div class="p-3.5 rounded-xl bg-[#f8faf9] border border-[#e5ece9]">
            <span class="text-[11px] text-[#718078] block">ความชันหลังจุดหัก</span>
            <span class="text-base font-black font-mono" :class="analysisData.broken_line.slope_after_per_thi < 0 ? 'text-rose-700' : 'text-[#24433a]'">
              {{ analysisData.broken_line.slope_after_per_thi > 0 ? `+${analysisData.broken_line.slope_after_per_thi}` : analysisData.broken_line.slope_after_per_thi }}% / THI
            </span>
          </div>
          <div class="p-3.5 rounded-xl bg-[#f8faf9] border border-[#e5ece9]">
            <span class="text-[11px] text-[#718078] block">ความสอดคล้อง (R²)</span>
            <span class="text-base font-black font-mono text-[#24433a]">{{ analysisData.broken_line.r_squared }}</span>
            <span class="text-[10px] text-[#718078] block">ควบคุมอิทธิพลชั่วโมงของวันแล้ว</span>
          </div>
        </div>

        <!-- กราฟ SVG แสดงจุดข้อมูลรายชั่วโมง + เส้นหัก Broken-line -->
        <div class="rounded-xl border border-[#e5ece9] bg-[#fafcfb] p-3">
          <svg viewBox="0 0 600 220" class="w-full h-48 overflow-visible">
            <!-- เส้นประแสดงจุดหัก -->
            <line
              :x1="thiToX(analysisData.broken_line.breakpoint_thi)"
              y1="15"
              :x2="thiToX(analysisData.broken_line.breakpoint_thi)"
              y2="195"
              stroke="#d87939"
              stroke-width="2"
              stroke-dasharray="4 4"
            />
            <!-- เส้น Broken-line -->
            <polyline
              :points="brokenLinePolyline"
              fill="none"
              stroke="#24433a"
              stroke-width="2.5"
            />
            <!-- จุดข้อมูลรายชั่วโมง (ปรับตามชั่วโมงของวันแล้ว) -->
            <circle
              v-for="(pt, idx) in analysisData.points"
              :key="idx"
              :cx="thiToX(pt.thi)"
              :cy="pctToY(pt.adjusted_lying_pct)"
              r="3.2"
              fill="#2563eb"
              fill-opacity="0.55">
              <title>{{ pt.hour_key }} · THI {{ pt.thi }} · นอนจริง {{ pt.lying_pct }}% (ปรับตามชั่วโมง: {{ pt.adjusted_lying_pct }}%)</title>
            </circle>
          </svg>
          <div class="flex justify-between text-[10px] text-[#718078] font-mono pt-1">
            <span>THI {{ analysisData.thi_range?.min }}</span>
            <span>แกนตั้ง: % วัวนอนรายชั่วโมง (ควบคุมอิทธิพลชั่วโมงของวันแล้ว 0–100%) · เส้นประสีส้ม = จุดหัก THI {{ analysisData.broken_line.breakpoint_thi }}</span>
            <span>THI {{ analysisData.thi_range?.max }}</span>
          </div>
        </div>

        <p class="text-xs text-[#24433a] font-medium bg-[#f0f4f2] p-3 rounded-xl">
          {{ analysisData.broken_line.interpretation_th }}
        </p>
      </div>

      <!-- กรณีข้อมูลยังไม่พอ: แสดงเหตุผลตามจริง ไม่แสดงกราฟสมมติ -->
      <div v-else class="p-6 rounded-2xl bg-[#fafcfb] border border-[#e5ece9] text-center space-y-2">
        <v-icon icon="mdi-chart-timeline-variant" size="28" class="text-[#718078] mx-auto" />
        <p class="text-xs font-bold text-[#24433a]">
          {{ analysisData?.reason_th || 'ยังไม่มีข้อมูลรายชั่วโมงเพียงพอสำหรับการวิเคราะห์จุดหัก (Broken-line Regression)' }}
        </p>
        <p class="text-[11px] text-[#718078] max-w-xl mx-auto">
          ระบบจะแสดงเส้นวิเคราะห์และจุดหักเฉพาะเมื่อมีข้อมูลจริงหลังตัดช่วงรีดนม/ให้อาหารอย่างน้อย {{ analysisData?.min_required_hours || 48 }} ชั่วโมง
          และมีช่วงค่า THI กว้างอย่างน้อย {{ analysisData?.min_required_thi_span || 6 }} หน่วย (แนะนำให้ดูผลหลังติดตั้งและเก็บข้อมูลครบ 2–3 สัปดาห์)
        </p>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { getNodeApiBase } from '~/API/baseAPI'

const props = defineProps({
  farmId: {
    type: String,
    required: true
  }
})

// อ่าน API base ตอน setup เท่านั้น ห้ามเรียกใน callback/setInterval
const Admin = `${getNodeApiBase()}/Admin`

const activeTab = ref('audit')
const showBoxes = ref(true)

// State สำหรับแท็บ 1 (Model Audit)
const isLoadingSamples = ref(false)
const isSavingAudit = ref(false)
const samplesData = ref({
  storage_configured: false,
  migration_required: false,
  migration_file: 'backend_node/migrations/20261028_camera_sample_audits.sql',
  summary: { audited_count: 0, metrics: null },
  samples: []
})
const selectedSamplePath = ref('')
const auditForm = ref({
  human_lying: 0,
  human_standing: 0,
  human_feeding: 0,
  human_drinking: 0,
  note: ''
})
const auditMessage = ref('')
const auditSuccess = ref(false)

// State สำหรับแท็บ 2 (Lying % vs THI Analysis)
const isLoadingAnalysis = ref(false)
const analysisDays = ref(30)
const analysisData = ref(null)

const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const currentSample = computed(() => {
  const list = samplesData.value.samples || []
  return list.find(s => s.sample_path === selectedSamplePath.value) || list[0] || null
})

watch(currentSample, (s) => {
  auditMessage.value = ''
  if (!s) return
  if (s.audit) {
    auditForm.value = {
      human_lying: s.audit.human_lying ?? 0,
      human_standing: s.audit.human_standing ?? 0,
      human_feeding: s.audit.human_feeding ?? (s.model_counts?.feeding ?? 0),
      human_drinking: s.audit.human_drinking ?? (s.model_counts?.drinking ?? 0),
      note: s.audit.note || ''
    }
  } else {
    auditForm.value = {
      human_lying: s.model_counts?.lying ?? 0,
      human_standing: s.model_counts?.standing ?? 0,
      human_feeding: s.model_counts?.feeding ?? 0,
      human_drinking: s.model_counts?.drinking ?? 0,
      note: ''
    }
  }
})

const boxColor = (cls) => {
  if (cls === 'lying down' || cls === 'lying') return '#3b82f6'
  if (cls === 'standing') return '#f97316'
  if (cls === 'feeding') return '#10b981'
  if (cls === 'drinking') return '#06b6d4'
  return '#eab308'
}

const boxLabelTh = (cls) => {
  if (cls === 'lying down' || cls === 'lying') return 'นอน'
  if (cls === 'standing') return 'ยืน'
  if (cls === 'feeding') return 'กิน'
  if (cls === 'drinking') return 'ดื่ม'
  return cls
}

const loadSamples = async () => {
  if (!props.farmId) return
  isLoadingSamples.value = true
  try {
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cameras/samples`, {
      headers: getAuthHeaders()
    })
    if (res.data?.success) {
      samplesData.value = res.data
      if (!selectedSamplePath.value && res.data.samples?.length) {
        selectedSamplePath.value = res.data.samples[0].sample_path
      }
    }
  } catch (err) {
    console.warn('[Model Audit] Could not load camera samples:', err.response?.data?.message || err.message)
  } finally {
    isLoadingSamples.value = false
  }
}

const submitAudit = async () => {
  const s = currentSample.value
  if (!s || !props.farmId) return
  isSavingAudit.value = true
  auditMessage.value = ''
  try {
    const payload = {
      sample_path: s.sample_path,
      captured_at: s.captured_at,
      model_lying: s.model_counts?.lying ?? 0,
      model_standing: s.model_counts?.standing ?? 0,
      model_feeding: s.model_counts?.feeding ?? 0,
      model_drinking: s.model_counts?.drinking ?? 0,
      model_total: s.model_counts?.total ?? 0,
      human_lying: Number(auditForm.value.human_lying),
      human_standing: Number(auditForm.value.human_standing),
      human_feeding: Number(auditForm.value.human_feeding || 0),
      human_drinking: Number(auditForm.value.human_drinking || 0),
      note: auditForm.value.note
    }
    const res = await axios.post(`${Admin}/farms/${props.farmId}/cameras/samples/audit`, payload, {
      headers: getAuthHeaders()
    })
    if (res.data?.success) {
      auditSuccess.value = true
      auditMessage.value = res.data.message || 'บันทึกผลการนับเทียบสำเร็จ'
      await loadSamples()
    }
  } catch (err) {
    auditSuccess.value = false
    auditMessage.value = err.response?.data?.message || 'บันทึกไม่สำเร็จ'
  } finally {
    isSavingAudit.value = false
  }
}

const loadAnalysis = async () => {
  if (!props.farmId) return
  isLoadingAnalysis.value = true
  try {
    const res = await axios.get(`${Admin}/farms/${props.farmId}/cameras/lying-thi-analysis?days=${analysisDays.value}`, {
      headers: getAuthHeaders()
    })
    if (res.data?.success) {
      analysisData.value = res.data.analysis
    }
  } catch (err) {
    console.warn('[Lying-THI Analysis] Could not load analysis:', err.response?.data?.message || err.message)
  } finally {
    isLoadingAnalysis.value = false
  }
}

const thiToX = (thi) => {
  const min = analysisData.value?.thi_range?.min ?? 65
  const max = analysisData.value?.thi_range?.max ?? 85
  const span = Math.max(1, max - min)
  return 30 + ((thi - min) / span) * 540
}

const pctToY = (pct) => {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0))
  return 195 - (clamped / 100) * 180
}

const brokenLinePolyline = computed(() => {
  const bl = analysisData.value?.broken_line
  const range = analysisData.value?.thi_range
  if (!bl || !range || range.min == null || range.max == null) return ''
  const tau = bl.breakpoint_thi
  const b0 = bl.intercept_at_breakpoint
  const yMin = b0 + bl.slopeBefore * (range.min - tau)
  const yTau = b0
  const yMax = b0 + bl.slopeAfter * (range.max - tau)
  const y1 = bl.slope_before_per_thi != null ? b0 + bl.slope_before_per_thi * (range.min - tau) : yMin
  const y2 = bl.slope_after_per_thi != null ? b0 + bl.slope_after_per_thi * (range.max - tau) : yMax
  return `${thiToX(range.min)},${pctToY(y1)} ${thiToX(tau)},${pctToY(yTau)} ${thiToX(range.max)},${pctToY(y2)}`
})

watch(() => props.farmId, (id) => {
  if (id) {
    loadSamples()
    loadAnalysis()
  }
})

onMounted(() => {
  if (props.farmId) {
    loadSamples()
    loadAnalysis()
  }
})
</script>
