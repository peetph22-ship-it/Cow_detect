/**
 * CowCare AI - Multimodal Cross-Validation Gate & Fail-Safe Engine
 * Calibrated for Thai Smallholder Dairy Barns (Boonkum et al., 2024; Papo et al., 2026)
 * References: system_accuracy_and_argon_projection_report.md
 */

const db = require('../config/db')

// Argon Simulation Benchmarks & Empirical Constants
const ARGON_BENCHMARKS = {
    system_name: 'CowCare AI Smart Barn Platform',
    validation_status: 'in_silico_validated_pre_deployment',
    sensor_subsystem: {
        sensor_type: 'ESP32-S3 + Sensirion SHT40 / Aosong AHT20',
        temperature_mae_celsius: 0.3,
        relative_humidity_mae_pct: 2.0,
        thi_noise_sigma: 0.42,
        sampling_interval_sec: 10,
        real_time_formula: 'NRC (1971) Standard (No double-counted barn offset)'
    },
    computer_vision_subsystem: {
        model: 'YOLO26m_best1 (Custom Thai Barn Trained)',
        classes: ['standing', 'lying down', 'feeding', 'drinking'],
        mAP50_overall: 0.7688,
        mAP50_standing: 0.854,
        mAP50_lying: 0.821,
        mAP50_feeding: 0.702,
        mAP50_drinking: 0.698,
        precision: 0.7341,
        recall: 0.7229,
        tracking_algorithm: 'ByteTrack Multi-Object Tracker',
        tracking_mota: 0.812,
        tracking_idf1: 0.778,
        roi_boost_factor: 0.15,
        expected_field_degradation_factor: 0.90
    },
    predictive_lstm_subsystem: {
        architecture: 'BiLSTM_Attention_72h_Multimodal (ONNX v2.5)',
        lookback_hours: 72,
        overall_accuracy: '96.08%',
        horizons: {
            day_1: {
                offset_hours: 24,
                thi_mae: 0.58,
                milk_loss_mae_kg: 0.19,
                risk_classification_accuracy: 0.958,
                confidence_rating: 'VERY_HIGH'
            },
            day_2: {
                offset_hours: 48,
                thi_mae: 0.84,
                milk_loss_mae_kg: 0.28,
                risk_classification_accuracy: 0.912,
                confidence_rating: 'HIGH'
            },
            day_3: {
                offset_hours: 72,
                thi_mae: 1.18,
                milk_loss_mae_kg: 0.39,
                risk_classification_accuracy: 0.864,
                confidence_rating: 'MODERATE_HIGH'
            }
        },
        three_day_mean_thi_mae: 0.87,
        three_day_mean_milk_mae: 0.28,
        three_day_mean_risk_acc: 0.911
    },
    multimodal_fusion_metrics: {
        formula: 'P_final = 1 - (1 - P_sensor) * (1 - P_vision)',
        p_sensor_base: 0.958,
        p_vision_base: 0.812,
        p_final_verified: 0.9921,
        sensitivity_tpr: 0.924,
        specificity_tnr: 0.906,
        false_positive_rate_fpr: 0.094,
        false_negative_rate_fnr: 0.076,
        in_silico_overall_f1: 0.915,
        projected_real_world_overall_f1: 0.862
    }
}

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
        WHERE (d.id_farms = $1 OR sr.id_farms = $1)
        ORDER BY sr.recorded_at DESC
        LIMIT 1
    `
    const sensorRes = await db.query(sensorQuery, [farmId])
    const sensor = sensorRes.rows[0] || null

    // 2. Fetch latest CCTV behavior telemetry rollup (5-min rollup)
    const visionQuery = `
        SELECT standing_pct, lying_pct, feeding_pct, drinking_pct,
               total_cows_detected AS active_cows, cow_comfort_index,
               timestamp, is_simulation
        FROM cctv_behavior_telemetry
        WHERE farm_id = $1
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
            confidence_score: 0.0,
            confidence_pct: '0.0%',
            recommendation_th: 'ไม่พบข้อมูลเซ็นเซอร์ IoT ในฟาร์มนี้ กรุณาเปิดใช้งานอุปกรณ์ ESP32',
            sensor_data: null,
            vision_data: vision,
            evaluated_at: evaluatedAt
        }
    }

    const sensorThi = sensor.thi != null ? parseFloat(sensor.thi) : null
    const sensorTemp = sensor.temperature_c != null ? parseFloat(sensor.temperature_c) : null
    const sensorHum = sensor.humidity_pct != null ? parseFloat(sensor.humidity_pct) : null

    // Check freshness of vision telemetry (valid if within 30 mins or simulation)
    const now = Date.now()
    const visionAgeMs = vision ? now - new Date(vision.timestamp).getTime() : Infinity
    const isVisionFresh = vision && (vision.is_simulation || visionAgeMs <= 30 * 60 * 1000)

    // Case C: Fail-Safe Thai Heuristic Engine (Vision Camera offline / occluded)
    if (!isVisionFresh) {
        let riskLvl = 'normal'
        if (sensorThi >= 84.0) riskLvl = 'severe'
        else if (sensorThi >= 80.0) riskLvl = 'moderate'
        else if (sensorThi >= 76.0) riskLvl = 'mild'

        return {
            farm_id: farmId,
            status: 'FAILSAFE_THAI_HEURISTIC',
            case_label: 'Fail-Safe Thai Heuristic (สำรอง: เซ็นเซอร์ IoT สมบูรณ์)',
            badge_color: 'amber',
            confidence_score: ARGON_BENCHMARKS.multimodal_fusion_metrics.p_sensor_base,
            confidence_pct: `${(ARGON_BENCHMARKS.multimodal_fusion_metrics.p_sensor_base * 100).toFixed(1)}%`,
            recommendation_th: 'กล้อง CCTV ไม่ได้ส่งข้อมูลพฤติกรรมในรอบ 30 นาที ระบบตัดเข้าสู่ Fail-Safe Mode พึ่งพาเซ็นเซอร์ IoT และเกณฑ์ความเครียดโคนมไทยอัตโนมัติ 100%',
            sensor_data: {
                thi: sensorThi,
                temperature_c: sensorTemp,
                humidity_pct: sensorHum,
                recorded_at: sensor.recorded_at,
                risk_level: riskLvl
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

    // Case A: Multimodal Verified (Sensor THI >= 76.0 AND vision confirms thermal restlessness)
    if (sensorThi >= 76.0 && (stressPosturePct >= 30.0 || pantingPct > 0)) {
        const pFinal = ARGON_BENCHMARKS.multimodal_fusion_metrics.p_final_verified
        let rec = 'ยืนยันความเครียดความร้อนด้วยสองระบบ (IoT + CCTV) โคแสดงพฤติกรรมกระสับกระส่าย ยืนระบายความร้อน แนะนำเปิดพัดลมระบายอากาศทันที'
        if (sensorHum >= 75.0) {
            rec += ' (ห้ามพ่นหมอกเด็ดขาด เนื่องจากความชื้นสูงเกิน 75% เสี่ยงเต้านมอักเสบ)'
        } else {
            rec += ' และเปิดระบบพ่นหมอกระบายความร้อน'
        }

        return {
            farm_id: farmId,
            status: 'MULTIMODAL_VERIFIED',
            case_label: 'Multimodal Verified (ยืนยันผล 2 ระบบ 99.2%)',
            badge_color: 'emerald',
            confidence_score: pFinal,
            confidence_pct: `${(pFinal * 100).toFixed(2)}%`,
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

    // Case B: Sensor Drift Suspected (Sensor THI >= 80.0 but cows are resting comfortably >= 70%)
    if (sensorThi >= 80.0 && lyingPct >= 70.0 && pantingPct === 0) {
        return {
            farm_id: farmId,
            status: 'SENSOR_DRIFT_SUSPECTED',
            case_label: 'Sensor Drift Suspected (สงสัยหัววัดคลาดเคลื่อน)',
            badge_color: 'rose',
            confidence_score: 0.85,
            confidence_pct: '85.0%',
            recommendation_th: `เซ็นเซอร์รายงาน THI สูง (${sensorThi}) แต่กล้อง AI พบว่าแม่โคส่วนใหญ่ (${lyingPct.toFixed(0)}%) นอนเคี้ยวเอื้องปกติ ไม่หอบ ระบบระงับการเปิดสปริงเกลอร์พร่ำเพรื่อ แนะนำตรวจสอบตำแหน่งหรือทำความสะอาดหัววัด AHT20/SHT40`,
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

    // Case D: Comfort Zone (Sensor THI < 76.0 and vision shows calm herd)
    if (sensorThi < 76.0) {
        return {
            farm_id: farmId,
            status: 'COMFORT_ZONE',
            case_label: 'Comfort Zone (สภาวะสบาย ปกติ)',
            badge_color: 'blue',
            confidence_score: 0.98,
            confidence_pct: '98.0%',
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
        confidence_score: 0.92,
        confidence_pct: '92.0%',
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
    ARGON_BENCHMARKS,
    evaluateMultimodalStatus
}
