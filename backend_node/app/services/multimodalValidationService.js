/**
 * CowCare AI - Multimodal Cross-Validation Gate & Fail-Safe Engine
 * เกณฑ์ THI มาจาก heatStress.js (ตาม profile ของฟาร์ม)
 */

const db = require('../config/db')

const { calcThi, getRiskLevel, getFarmProfile } = require('./heatStress')

// ยังไม่มีการวัดความแม่นยำของการยืนยันผลสองระบบกับข้อมูลภาคสนาม จึงไม่รายงานค่า confidence
const NO_CONFIDENCE = { confidence_score: null, confidence_pct: null, confidence_note: 'ยังไม่มีผลทดสอบภาคสนาม' }

/**
 * Cross-validate Real-Time IoT Sensor Telemetry with CCTV Behavioral Rollup
 * @param {string} farmId - UUID of the farm
 */
const evaluateMultimodalStatus = async (farmId) => {
    // 1. Fetch latest IoT sensor reading for the farm
    const sensorQuery = `
        SELECT sr.temperature_c, sr.humidity_pct, sr.thi, sr.recorded_at, d.name_devices
        FROM tb_sensor_readings sr
        LEFT JOIN tb_devices d ON d.id_devices = sr.id_devices
        WHERE sr.id_farms = $1
        ORDER BY sr.recorded_at DESC
        LIMIT 1
    `
    const sensorRes = await db.query(sensorQuery, [farmId])
    const sensor = sensorRes.rows[0] || null

    const farmRes = await db.query(`SELECT * FROM tb_farms WHERE id_farms = $1`, [farmId])
    const profile = getFarmProfile(farmRes.rows[0])

    // 2. Fetch latest CCTV behavior telemetry rollup (5-min rollup)
    const visionQuery = `
        SELECT standing_pct, lying_pct, feeding_pct, drinking_pct,
               total_cows_detected AS active_cows, cow_comfort_index,
               timestamp, is_simulation
        FROM cctv_behavior_telemetry
        WHERE farm_id = $1
          AND is_simulation = false
        ORDER BY timestamp DESC
        LIMIT 1
    `
    const visionRes = await db.query(visionQuery, [farmId])
    const vision = visionRes.rows[0] || null

    const evaluatedAt = new Date().toISOString()

    // If no sensor data is found at all
    if (!sensor) {
        return {
            farm_id: farmId,
            status: 'NO_DATA',
            case_label: 'ไม่มีข้อมูลเซ็นเซอร์ (Sensor Offline)',
            badge_color: 'gray',
            ...NO_CONFIDENCE,
            recommendation_th: 'ไม่พบข้อมูลเซ็นเซอร์ IoT ในฟาร์มนี้ กรุณาเปิดใช้งานอุปกรณ์ ESP32',
            sensor_data: null,
            vision_data: vision,
            evaluated_at: evaluatedAt
        }
    }

    const sensorTemp = sensor.temperature_c != null ? parseFloat(sensor.temperature_c) : null
    const sensorHum = sensor.humidity_pct != null ? parseFloat(sensor.humidity_pct) : null
    const sensorThi = calcThi(sensorTemp, sensorHum) ?? (sensor.thi != null ? parseFloat(sensor.thi) : null)
    const sensorRisk = getRiskLevel(sensorThi, profile)
    const isStressed = sensorRisk === 'moderate' || sensorRisk === 'severe'

    // Check freshness of vision telemetry (valid if within 30 mins; ข้อมูลจำลองถูกกรองออกใน query แล้ว)
    const now = Date.now()
    const visionAgeMs = vision ? now - new Date(vision.timestamp).getTime() : Infinity
    const isVisionFresh = vision && visionAgeMs <= 30 * 60 * 1000
    const simTag = vision && vision.is_simulation ? ' [ข้อมูลกล้องจำลอง]' : ''

    // Case C: Fail-Safe Thai Heuristic Engine (Vision Camera offline / occluded)
    if (!isVisionFresh) {
        return {
            farm_id: farmId,
            status: 'FAILSAFE_THAI_HEURISTIC',
            case_label: 'ใช้เซ็นเซอร์อย่างเดียว (ไม่มีข้อมูลกล้อง)',
            badge_color: 'amber',
            ...NO_CONFIDENCE,
            recommendation_th: 'ไม่มีข้อมูลพฤติกรรมจากกล้องในรอบ 30 นาที ระบบประเมินจากเซ็นเซอร์อุณหภูมิและความชื้นตามเกณฑ์ THI ของฟาร์มเท่านั้น',
            sensor_data: {
                thi: sensorThi,
                temperature_c: sensorTemp,
                humidity_pct: sensorHum,
                recorded_at: sensor.recorded_at,
                risk_level: sensorRisk
            },
            vision_data: null,
            evaluated_at: evaluatedAt
        }
    }

    const standingPct = vision.standing_pct != null ? parseFloat(vision.standing_pct) : 0
    const lyingPct = vision.lying_pct != null ? parseFloat(vision.lying_pct) : 0
    const feedingPct = vision.feeding_pct != null ? parseFloat(vision.feeding_pct) : 0
    const drinkingPct = vision.drinking_pct != null ? parseFloat(vision.drinking_pct) : 0
    const pantingPct = vision.panting_pct != null ? parseFloat(vision.panting_pct) : 0
    const stressPosturePct = standingPct + pantingPct

    // Case A: Multimodal Verified (เซ็นเซอร์ระดับ moderate ขึ้นไป AND กล้องยืนยันว่าโคกระสับกระส่าย)
    if (isStressed && (stressPosturePct >= 30.0 || pantingPct > 0)) {
        let rec = 'ยืนยันความเครียดความร้อนด้วยสองระบบ (IoT + CCTV) โคแสดงพฤติกรรมกระสับกระส่าย ยืนระบายความร้อน แนะนำเปิดพัดลมระบายอากาศทันที'
        if (sensorHum >= 75.0) {
            rec += ' (ห้ามพ่นหมอกเด็ดขาด เนื่องจากความชื้นสูงเกิน 75% เสี่ยงเต้านมอักเสบ)'
        } else {
            rec += ' และเปิดระบบพ่นหมอกระบายความร้อน'
        }

        return {
            farm_id: farmId,
            status: 'MULTIMODAL_VERIFIED',
            case_label: `Multimodal Verified (เซ็นเซอร์และกล้องตรงกัน)${simTag}`,
            badge_color: 'emerald',
            ...NO_CONFIDENCE,
            recommendation_th: rec,
            sensor_data: {
                thi: sensorThi,
                temperature_c: sensorTemp,
                humidity_pct: sensorHum,
                recorded_at: sensor.recorded_at
            },
            vision_data: {
                standing_pct: standingPct,
                lying_pct: lyingPct,
                feeding_pct: feedingPct,
                drinking_pct: drinkingPct,
                panting_pct: pantingPct,
                active_cows: vision.active_cows,
                cow_comfort_index: vision.cow_comfort_index,
                recorded_at: vision.timestamp,
                is_simulation: vision.is_simulation
            },
            evaluated_at: evaluatedAt
        }
    }

    // Case B: Sensor Drift Suspected (เซ็นเซอร์ระดับ moderate ขึ้นไป แต่โคนอนพัก >= 70%)
    if (isStressed && lyingPct >= 70.0 && pantingPct === 0) {
        return {
            farm_id: farmId,
            status: 'SENSOR_DRIFT_SUSPECTED',
            case_label: `Sensor Drift Suspected (เซ็นเซอร์กับกล้องไม่ตรงกัน)${simTag}`,
            badge_color: 'rose',
            ...NO_CONFIDENCE,
            recommendation_th: `เซ็นเซอร์รายงาน THI สูง (${sensorThi}) แต่กล้องพบแม่โคส่วนใหญ่ (${lyingPct.toFixed(0)}%) นอนพักและไม่หอบ แนะนำตรวจสอบตำแหน่งหรือทำความสะอาดหัววัด ระหว่างนี้ยังคงระบายความร้อนตามระดับ THI`,
            sensor_data: {
                thi: sensorThi,
                temperature_c: sensorTemp,
                humidity_pct: sensorHum,
                recorded_at: sensor.recorded_at
            },
            vision_data: {
                standing_pct: standingPct,
                lying_pct: lyingPct,
                feeding_pct: feedingPct,
                drinking_pct: drinkingPct,
                panting_pct: pantingPct,
                active_cows: vision.active_cows,
                recorded_at: vision.timestamp
            },
            evaluated_at: evaluatedAt
        }
    }

    // Case D: Comfort Zone (เซ็นเซอร์ระดับ normal/mild)
    if (sensorRisk === 'normal' || sensorRisk === 'mild') {
        return {
            farm_id: farmId,
            status: 'COMFORT_ZONE',
            case_label: `Comfort Zone (สภาวะสบาย ปกติ)${simTag}`,
            badge_color: 'blue',
            ...NO_CONFIDENCE,
            recommendation_th: 'สภาวะแวดล้อมและพฤติกรรมโคนมอยู่ในเกณฑ์ปกติ โคนมเคี้ยวเอื้องและพักผ่อนได้ดี ไม่มีความเครียดความร้อน',
            sensor_data: {
                thi: sensorThi,
                temperature_c: sensorTemp,
                humidity_pct: sensorHum,
                recorded_at: sensor.recorded_at
            },
            vision_data: {
                standing_pct: standingPct,
                lying_pct: lyingPct,
                feeding_pct: feedingPct,
                drinking_pct: drinkingPct,
                panting_pct: pantingPct,
                active_cows: vision.active_cows,
                recorded_at: vision.timestamp
            },
            evaluated_at: evaluatedAt
        }
    }

    // Default / Balanced Monitoring
    return {
        farm_id: farmId,
        status: 'MONITORING_NORMAL',
        case_label: 'เฝ้าระวังปกติ (Active Monitoring)',
        badge_color: 'emerald',
        ...NO_CONFIDENCE,
        recommendation_th: 'ระบบเฝ้าระวังค่าดัชนีความร้อนและพฤติกรรมตามปกติ',
        sensor_data: {
            thi: sensorThi,
            temperature_c: sensorTemp,
            humidity_pct: sensorHum,
            recorded_at: sensor.recorded_at
        },
        vision_data: {
            standing_pct: standingPct,
            lying_pct: lyingPct,
            feeding_pct: feedingPct,
            drinking_pct: drinkingPct,
            panting_pct: pantingPct,
            active_cows: vision.active_cows,
            recorded_at: vision.timestamp
        },
        evaluated_at: evaluatedAt
    }
}

module.exports = {
    evaluateMultimodalStatus
}
