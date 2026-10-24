/**
 * CowCare AI - Heat Stress Single Source of Truth
 * สูตร THI และเกณฑ์ความเครียดความร้อนทั้งระบบต้อง import จากไฟล์นี้เท่านั้น ห้ามเขียนตัวเลขเกณฑ์ซ้ำในไฟล์อื่น
 *
 * สูตร THI: NRC (1971) ตัวเดียวกับที่งานวิจัยโคนมไทยใช้ (Sae-tiao et al., 2019, LRRD 31(12))
 * ไม่มีการปรับสูตรเฉพาะไทย: ความเป็นไทยอยู่ที่ "ค่าเกณฑ์" ไม่ใช่ตัวสูตร
 *
 * เกณฑ์อ้างอิงงานวิจัยโคนมลูกผสมไทย:
 * - Boonkum et al. (2011) J Dairy Sci 94:487 - น้ำนมเริ่มลดที่ THI 74 ในแม่โคท้อง 3+ สายเลือด HF >= 87.5%,
 *   ลดเร็วขึ้นเมื่อ THI > 82
 * - Boonkum et al. (2024) Animals 14(20):3026 - threshold ระดับประชากรที่ THI 76
 * - Duangjinda et al. (ICAR Technical Series 23) - moderate > 74, severe > 80
 *
 * หมายเหตุ: งานข้างต้นใช้ THI เฉลี่ยรายวันจากสถานีอุตุฯ (นอกโรงเรือน) การนำมาใช้กับค่ารายชั่วโมงในโรงเรือน
 * ยังต้องยืนยันกับผู้เชี่ยวชาญ
 */

const RISK_LEVELS = ['normal', 'mild', 'moderate', 'severe']

// ค่า = จุดเริ่มของแต่ละระดับ (THI >= ค่านี้)
const PROFILES = {
    // ค่าเริ่มต้นระดับประชากรโคนมลูกผสมไทย
    default: { mild: 74, moderate: 76, severe: 82 },
    // ฝูงสายเลือด HF สูง (>= 87.5%) หรือแม่โคหลายท้อง ทนร้อนได้น้อยกว่า
    high_hf: { mild: 72, moderate: 74, severe: 80 }
}

const PROFILE_LABELS = {
    default: 'ค่าเริ่มต้น (โคนมลูกผสมไทยทั่วไป)',
    high_hf: 'สายเลือดโฮลสไตน์สูง (≥87.5%) / แม่โคหลายท้อง'
}

const RISK_LABELS_TH = {
    normal: 'ปกติ',
    mild: 'เฝ้าระวัง',
    moderate: 'เครียดจากความร้อน',
    severe: 'วิกฤต'
}

// ระดับที่ใช้ในระบบแจ้งเตือน (alerts / LINE)
const ALERT_LEVEL = { normal: null, mild: 'warning', moderate: 'moderate', severe: 'critical' }

const normalizeProfile = (profile) => (PROFILES[profile] ? profile : 'default')

// รับได้ทั้ง row ของ tb_farms หรือชื่อ profile
const getFarmProfile = (farmOrProfile) => {
    if (farmOrProfile && typeof farmOrProfile === 'object') return normalizeProfile(farmOrProfile.hf_profile)
    return normalizeProfile(farmOrProfile)
}

const getThresholds = (profile) => PROFILES[normalizeProfile(profile)]

// สูตรเดียวทั้งระบบ: NRC (1971)
const calcThi = (t, rh) => {
    if (t == null || rh == null) return null
    const temp = Number(t)
    const hum = Number(rh)
    if (!Number.isFinite(temp) || !Number.isFinite(hum)) return null
    return parseFloat(((1.8 * temp + 32) - (0.55 - 0.0055 * hum) * (1.8 * temp - 26)).toFixed(1))
}

// นิพจน์ SQL ของสูตรเดียวกัน คำนวณจาก temperature_c / humidity_pct ไม่พึ่งคอลัมน์ thi ใน DB
const thiSql = (alias = 'sr') =>
    `((1.8 * ${alias}.temperature_c + 32) - (0.55 - 0.0055 * ${alias}.humidity_pct) * (1.8 * ${alias}.temperature_c - 26))`

const getRiskLevel = (thi, profile = 'default') => {
    if (thi == null || !Number.isFinite(Number(thi))) return null
    const val = Number(thi)
    const t = getThresholds(profile)
    if (val >= t.severe) return 'severe'
    if (val >= t.moderate) return 'moderate'
    if (val >= t.mild) return 'mild'
    return 'normal'
}

const toAlertLevel = (riskLevel) => ALERT_LEVEL[riskLevel] || null

// จุดต่ำสุดของระดับเฝ้าระวังในทุก profile ใช้กรองข้อมูลใน SQL ก่อนจัดระดับรายฟาร์มใน JS
const MIN_ALERT_THI = Math.min(...Object.values(PROFILES).map(p => p.mild))

/**
 * ความชื้นที่ถือว่า "ชื้นมาก" สำหรับคำแนะนำเรื่องน้ำ (ค่าแนวทางของระบบ ยังไม่พบเกณฑ์ทางการของไทย)
 * หลักฐาน: อากาศชื้น การพ่นหมอกฝอย (ลดความร้อนของอากาศ) แทบไม่ได้ผลและเพิ่มความชื้น
 * แต่การฉีดน้ำเม็ดใหญ่ให้ตัวโคเปียกเป็นช่วงๆ ร่วมกับพัดลมแรง ยังช่วยได้ (Penn State Extension; รายงานภาคสนาม)
 */
const HUMID_RH = 75

const getCoolingAdvice = (rh) => {
    const humid = rh != null && Number(rh) >= HUMID_RH
    const pct = rh != null ? `${Math.round(Number(rh))}%` : ''
    return humid ? {
        humid: true,
        title: 'งดพ่นหมอกฝอย ใช้ฉีดน้ำตัวโคแทน',
        detail: `ความชื้นสูง (${pct}) หมอกฝอยทำให้อากาศชื้นขึ้นแต่ไม่ช่วยลดร้อน ถ้ามีหัวฉีด ให้ฉีดน้ำที่หลังและไหล่ให้เปียกช่วงสั้นๆ (เลี่ยงเต้านม) แล้วเปิดพัดลมเป่าให้แห้ง`,
        short: `งดพ่นหมอก (ความชื้น ${pct}) ใช้ฉีดน้ำตัวโคเป็นช่วงๆ ร่วมกับพัดลม`
    } : {
        humid: false,
        title: 'พ่นหมอกร่วมกับพัดลมได้',
        detail: 'อากาศไม่ชื้นเกินไป พ่นหมอกร่วมกับพัดลมได้ หรือฉีดน้ำที่หลังและไหล่ให้เปียกแล้วเปิดพัดลม (เลี่ยงเต้านม)',
        short: 'พ่นหมอกหรือฉีดน้ำตัวโค ร่วมกับเปิดพัดลม'
    }
}

/**
 * วิธีคำนวณและที่มา สำหรับแสดงบนหน้าเว็บ (ทุกหน้าใช้ข้อความชุดนี้ ไม่เขียนซ้ำใน frontend)
 */
const getMethod = (profile = 'default') => {
    const t = getThresholds(profile)
    return {
        formula: 'THI = (1.8 × T + 32) − (0.55 − 0.0055 × RH) × (1.8 × T − 26)',
        formula_note: 'T = อุณหภูมิ (°C), RH = ความชื้นสัมพัทธ์ (%) วัดในโรงเรือนด้วยเซ็นเซอร์ของฟาร์ม',
        thresholds: { ...t },
        thresholds_note: `เฝ้าระวัง ≥ ${t.mild} · เครียด ≥ ${t.moderate} · วิกฤต ≥ ${t.severe} (เกณฑ์โคนมลูกผสมไทย ${PROFILE_LABELS[normalizeProfile(profile)]})`,
        steps: [
            'เฉลี่ยค่าเซ็นเซอร์ทุก 5 นาที แล้วคำนวณ THI',
            'ชั่วโมงเครียด = จำนวนช่วง 5 นาทีที่ THI ถึงระดับเครียด × 5 นาที (ช่วงที่ไม่มีข้อมูลไม่ถูกนับ)',
            'ความครบถ้วน = ชั่วโมงที่มีข้อมูล ÷ ชั่วโมงในช่วงที่สรุป',
            'ระดับรายวัน = จาก THI เฉลี่ยทั้งวัน เพื่อเทียบกับวิธีของงานวิจัย ส่วนค่ารายชั่วโมงใช้เตือนช่วงที่ร้อน',
            `พักกลางคืน = ชั่วโมงช่วง 22:00–06:00 ที่ THI ต่ำกว่า ${t.mild}`,
            `เครียดติดต่อกัน = จำนวนวันล่าสุดที่ THI เฉลี่ยรายวัน ≥ ${t.moderate} (นับเฉพาะวันที่มีข้อมูลอย่างน้อย 12 ชม.)`
        ],
        caveats: [
            'เกณฑ์ในงานวิจัยกำหนดจาก THI เฉลี่ยรายวันของสถานีอุตุนิยมวิทยา (นอกโรงเรือน) ระบบนี้วัดในโรงเรือนซึ่งมักร้อนกว่า จึงควรดูระดับรายวันประกอบ',
            'เซ็นเซอร์ SHT20 (โมดูล RS485 ตระกูล XY-MD02) ความแม่นยำตามสเปก ±0.3°C / ±3% RH ทำให้ THI คลาดได้ประมาณ ±0.7',
            'ยังไม่ประเมินปริมาณน้ำนมที่ลดลง (ระบบไม่มีข้อมูลน้ำนม)',
            `เกณฑ์ความชื้น ${HUMID_RH}% สำหรับงดพ่นหมอกเป็นค่าแนวทางของระบบ ยังไม่พบเกณฑ์ทางการของไทย`,
            'ช่วงเวลาในคำแนะนำ (ช่วงร้อนที่สุด/เย็นที่สุด) คำนวณจากข้อมูลของโรงเรือนนี้ 3 วันล่าสุด ไม่ใช่เวลาตายตัว'
        ],
        references: [
            'NRC (1971). A Guide to Environmental Research on Animals. National Academy of Sciences, Washington DC. (สูตร THI)',
            'Sae-tiao et al. (2019). Livestock Research for Rural Development 31(12). (ใช้สูตร NRC กับโคนมไทย)',
            'Boonkum et al. (2011). Journal of Dairy Science 94:487. (น้ำนมเริ่มลดที่ THI 74 ในโคสายเลือด HF สูง)',
            'Boonkum et al. (2024). Animals 14(20):3026. (เกณฑ์ระดับประชากรที่ THI 76)',
            'Duangjinda et al. ICAR Technical Series 23. (moderate > 74, severe > 80)',
            'Igono et al. (1992). Environmental profile and critical temperature effects on milk production of Holstein cows in desert climate. International Journal of Biometeorology 36:77–87. (แนวคิดว่าความเย็นกลางคืนช่วยให้โคฟื้นตัว ค่า 74 เป็นเกณฑ์ของระบบ)',
            'Penn State Extension. Heat Stress Abatement Techniques for Dairy Cattle. (การฉีดน้ำตัวโคต้องคู่กับการระบายอากาศ)'
        ]
    }
}

module.exports = {
    RISK_LEVELS,
    PROFILES,
    PROFILE_LABELS,
    RISK_LABELS_TH,
    MIN_ALERT_THI,
    normalizeProfile,
    getFarmProfile,
    getThresholds,
    calcThi,
    thiSql,
    getRiskLevel,
    toAlertLevel,
    getMethod,
    HUMID_RH,
    getCoolingAdvice
}
