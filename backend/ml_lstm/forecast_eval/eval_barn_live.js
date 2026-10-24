#!/usr/bin/env node
/**
 * CowCare AI - วัดความแม่นยำการพยากรณ์ THI 3 วันในโรงเรือนจริง (SELECT อย่างเดียว)
 *
 * เทียบค่า predicted_thi ที่บันทึกไว้จริงใน tb_farm_daily_summaries.lstm_forecast
 * (version = 'hybrid-ecmwf-bias-v1', บันทึกทุกวันเวลา 20:00 น.)
 * กับ THI เฉลี่ยรายวันจริงของฟาร์มจาก heatMetrics.dailySeries (เฉพาะวันที่จบแล้วและมีข้อมูล >= 20 ชม.)
 * พร้อมเทียบกับวิธีเดิม (ค่าเฉลี่ย THI 72 ชม. ย้อนหลัง ณ เวลาออกพยากรณ์)
 *
 * วิธีรัน:
 *   node backend/ml_lstm/forecast_eval/eval_barn_live.js
 *   node backend/ml_lstm/forecast_eval/eval_barn_live.js --farm=<id_farms>
 */

const path = require('path')
const backendNodeDir = path.resolve(__dirname, '../../../backend_node')

// โหลด dotenv จาก backend_node/node_modules และไฟล์ .env ใน backend_node
const dotenv = require(path.join(backendNodeDir, 'node_modules/dotenv'))
dotenv.config({ path: path.join(backendNodeDir, '.env') })

const db = require(path.join(backendNodeDir, 'app/config/db'))
const { dailySeries, bkkDate } = require(path.join(backendNodeDir, 'app/services/heatMetrics'))
const { getFarmProfile, getRiskLevel } = require(path.join(backendNodeDir, 'app/services/heatStress'))
const {
    FORECAST_VERSION,
    EVALUATION,
    fetchHourlyThi,
    buildBaselineForecast,
    isCurrentForecast
} = require(path.join(backendNodeDir, 'app/services/forecastService'))

const MIN_EVAL_DATA_HOURS = 20
const HORIZONS = [1, 2, 3]

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
const fmt = (v, digits = 2) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toFixed(digits))

const parseArgs = () => {
    const args = process.argv.slice(2)
    let farmId = null
    for (const a of args) {
        if (a.startsWith('--farm=')) farmId = a.slice('--farm='.length).trim()
    }
    return { farmId }
}

const addDaysStr = (dateStr, n) =>
    new Date(Date.parse(`${dateStr}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)

const toDateStr = (val) => {
    if (!val) return null
    if (typeof val === 'string') return val.slice(0, 10)
    if (val instanceof Date) return bkkDate(val)
    return String(val).slice(0, 10)
}

const initBuckets = () => ({
    1: { hybridAbs: [], hybridSigned: [], hybridLevelMatch: [], rawAbs: [], base72Abs: [], base72LevelMatch: [], pairs: [] },
    2: { hybridAbs: [], hybridSigned: [], hybridLevelMatch: [], rawAbs: [], base72Abs: [], base72LevelMatch: [], pairs: [] },
    3: { hybridAbs: [], hybridSigned: [], hybridLevelMatch: [], rawAbs: [], base72Abs: [], base72LevelMatch: [], pairs: [] }
})

const summarizeHorizon = (b) => {
    const n = b.hybridAbs.length
    if (!n) {
        return {
            n: 0,
            hybrid_mae: null,
            hybrid_bias: null,
            hybrid_level_match_pct: null,
            raw_mae: null,
            base72_mae: null,
            base72_level_match_pct: null
        }
    }
    const levelPct = (arr) => (arr.length ? Math.round((arr.filter(Boolean).length / arr.length) * 100) : null)
    return {
        n,
        hybrid_mae: mean(b.hybridAbs),
        hybrid_bias: mean(b.hybridSigned),
        hybrid_level_match_pct: levelPct(b.hybridLevelMatch),
        raw_mae: b.rawAbs.length ? mean(b.rawAbs) : null,
        base72_mae: b.base72Abs.length ? mean(b.base72Abs) : null,
        base72_level_match_pct: levelPct(b.base72LevelMatch)
    }
}

const printTable = (title, buckets) => {
    console.log(`\n=== ${title} ===`)
    console.log('ระยะ | จำนวนวัน (n) | MAE Hybrid | Bias Hybrid | % ระดับตรง (Hybrid) | MAE เฉลี่ย 72 ชม. | % ระดับตรง (72 ชม.) | สถานีสนามบิน (อ้างอิง)')
    console.log('-----|--------------|------------|-------------|---------------------|-------------------|---------------------|------------------------')
    for (const h of HORIZONS) {
        const s = summarizeHorizon(buckets[h])
        const stationRef = `${fmt(EVALUATION.mae[h])} (72h: ${fmt(EVALUATION.mae_previous_baseline_72h[h])})`
        console.log(
            `+${h} วัน | ${String(s.n).padStart(12)} | ${fmt(s.hybrid_mae).padStart(10)} | ${fmt(s.hybrid_bias).padStart(11)} | ` +
            `${(s.hybrid_level_match_pct != null ? `${s.hybrid_level_match_pct}%` : '—').padStart(19)} | ` +
            `${fmt(s.base72_mae).padStart(17)} | ` +
            `${(s.base72_level_match_pct != null ? `${s.base72_level_match_pct}%` : '—').padStart(19)} | ${stationRef}`
        )
    }
}

async function main() {
    const { farmId } = parseArgs()

    const farmsQuery = farmId
        ? { text: 'SELECT * FROM tb_farms WHERE id_farms = $1 ORDER BY id_farms ASC', values: [farmId] }
        : { text: 'SELECT * FROM tb_farms ORDER BY id_farms ASC', values: [] }

    const { rows: farms } = await db.query(farmsQuery.text, farmsQuery.values)
    if (!farms.length) {
        console.log('ไม่พบข้อมูลฟาร์มใน tb_farms')
        return
    }

    console.log(`ตรวจสอบความแม่นยำการพยากรณ์ในโรงเรือนจริง (เฉพาะ version = ${FORECAST_VERSION}, วันที่มีข้อมูลจริง >= ${MIN_EVAL_DATA_HOURS} ชม.)`)
    console.log(`จำนวนฟาร์มที่ตรวจ: ${farms.length} ฟาร์ม`)

    // แยกผลตามแหล่งค่าเพี้ยน (farm = ปรับตามโรงเรือน, regional = ค่าเพี้ยนพื้นที่, none = ไม่ปรับ)
    // นับเฉพาะผลจากพยากรณ์อากาศจริง (engine openmeteo_*) ผลจากวิธีสำรองค่าเฉลี่ย 72 ชม. ไม่นับรวม
    const overallBySource = {}
    const skipped = { not_hybrid: 0, not_created_on_issue_day: 0, no_base72: 0 }

    for (const farm of farms) {
        const profile = getFarmProfile(farm)

        // ดึงบันทึกสรุปรายวันทั้งหมดของฟาร์มนี้ (SELECT อย่างเดียว)
        const { rows: summaries } = await db.query(
            `SELECT summary_date, lstm_forecast, created_at
             FROM tb_farm_daily_summaries
             WHERE id_farms = $1
               AND lstm_forecast IS NOT NULL
             ORDER BY summary_date ASC`,
            [farm.id_farms]
        )

        const validSummaries = summaries.filter(r => isCurrentForecast(r.lstm_forecast) && Array.isArray(r.lstm_forecast?.forecasts))

        // คำนวณจำนวนวันย้อนหลังที่ต้องดึงจาก dailySeries ให้ครอบคลุมตั้งแต่ summary แรกสุด (หรืออย่างน้อย 30 วัน)
        let lookbackDays = 30
        if (validSummaries.length) {
            const earliestStr = toDateStr(validSummaries[0].summary_date)
            const diffDays = Math.ceil((Date.now() - Date.parse(`${earliestStr}T00:00:00+07:00`)) / 86400e3) + 7
            lookbackDays = Math.max(30, diffDays)
        }

        const series = await dailySeries(farm.id_farms, profile, lookbackDays)
        // เฉพาะวันที่จบแล้ว (!is_today) และมีข้อมูลจริง >= 20 ชม.
        const actualByDate = new Map()
        for (const d of series) {
            if (!d.is_today && d.has_data && d.data_hours >= MIN_EVAL_DATA_HOURS && d.avg_thi != null) {
                actualByDate.set(d.date, d)
            }
        }

        console.log(`\n------------------------------------------------------------`)
        console.log(`ฟาร์ม: ${farm.name_farms} (ID: ${farm.id_farms}, โปรไฟล์: ${profile})`)
        console.log(`- วันที่จบแล้วและมีข้อมูลเซ็นเซอร์ >= ${MIN_EVAL_DATA_HOURS} ชม. (ในรอบ ${lookbackDays} วัน): ${actualByDate.size} วัน`)
        console.log(`- บันทึกผลพยากรณ์ ${FORECAST_VERSION} ใน tb_farm_daily_summaries: ${validSummaries.length} วัน (จากทั้งหมด ${summaries.length} แถว)`)

        if (!validSummaries.length) {
            console.log(`  -> ยังไม่มีผลพยากรณ์รุ่น ${FORECAST_VERSION} ที่บันทึกไว้ใน tb_farm_daily_summaries`)
            continue
        }

        const farmBySource = {}

        for (const row of validSummaries) {
            const issueDate = toDateStr(row.summary_date)
            const fcObj = row.lstm_forecast
            const issueTime = new Date(`${issueDate}T20:00:00+07:00`)
            const engine = String(fcObj.engine || '')
            if (!engine.startsWith('openmeteo_')) { skipped.not_hybrid++; continue }
            // พยากรณ์ต้องถูกสร้างในวันออกพยากรณ์ (เวลาไทย) ไม่ใช่สรุปย้อนหลังที่สร้างทีหลัง
            if (!row.created_at || bkkDate(new Date(row.created_at)) !== issueDate) { skipped.not_created_on_issue_day++; continue }
            const source = (engine.match(/_(farm|regional|none)_bias$/) || [])[1] || 'unknown'
            if (!farmBySource[source]) farmBySource[source] = initBuckets()
            if (!overallBySource[source]) overallBySource[source] = initBuckets()

            // คำนวณค่าเฉลี่ย 72 ชม. ย้อนหลัง ณ เวลา 20:00 น. ของวันออกพยากรณ์เพื่อเทียบบนวันเดียวกัน
            const hourly72 = await fetchHourlyThi(farm.id_farms, issueTime, 72)
            const base72 = buildBaselineForecast({ farm, hourly: hourly72, now: issueTime })
            const base72Thi = !base72.insufficient_data ? base72.peak_predicted_thi : null

            for (const item of fcObj.forecasts) {
                const h = Number(item.horizon_days)
                if (!HORIZONS.includes(h)) continue
                const targetDate = item.target_date || addDaysStr(issueDate, h)
                const actual = actualByDate.get(targetDate)
                if (!actual) continue

                const predThi = Number(item.predicted_thi)
                if (!Number.isFinite(predThi)) continue
                // เทียบกับค่าเฉลี่ย 72 ชม. บนวันเดียวกันเท่านั้น (ชุดวันเดียวกันทั้งสองวิธี)
                if (base72Thi == null || !Number.isFinite(Number(base72Thi))) { skipped.no_base72++; continue }

                const actualThi = Number(actual.avg_thi)
                const actualLevel = actual.daily_mean_level || getRiskLevel(actualThi, profile)
                const predLevel = item.risk_level || getRiskLevel(predThi, profile)

                const absErr = Math.abs(predThi - actualThi)
                const signedErr = predThi - actualThi
                const levelMatch = predLevel === actualLevel

                for (const target of [farmBySource[source][h], overallBySource[source][h]]) {
                    target.hybridAbs.push(absErr)
                    target.hybridSigned.push(signedErr)
                    target.hybridLevelMatch.push(levelMatch)
                    if (item.raw_forecast_thi != null && Number.isFinite(Number(item.raw_forecast_thi))) {
                        target.rawAbs.push(Math.abs(Number(item.raw_forecast_thi) - actualThi))
                    }
                    target.base72Abs.push(Math.abs(base72Thi - actualThi))
                    target.base72LevelMatch.push(getRiskLevel(base72Thi, profile) === actualLevel)
                    target.pairs.push({
                        issue_date: issueDate,
                        target_date: targetDate,
                        predicted_thi: predThi,
                        actual_thi: actualThi,
                        base72_thi: base72Thi,
                        pred_level: predLevel,
                        actual_level: actualLevel
                    })
                }
            }
        }

        const sources = Object.keys(farmBySource)
        const totalMatched = sources.reduce((acc, src) => acc + HORIZONS.reduce((s2, h) => s2 + farmBySource[src][h].hybridAbs.length, 0), 0)
        if (!totalMatched) {
            console.log(`  -> ยังไม่มีคู่ (target_date) ที่ตรงกับวันที่มีข้อมูลจริง >= ${MIN_EVAL_DATA_HOURS} ชม. (ต้องรอให้วันพยากรณ์มาถึงและมีข้อมูลครบวัน)`)
        } else {
            for (const src of sources) printTable(`ผลวัดรายฟาร์ม: ${farm.name_farms} (ค่าเพี้ยนแบบ ${src})`, farmBySource[src])
        }
    }

    console.log(`\nไม่นับ: ผลจากวิธีสำรอง ${skipped.not_hybrid} แถว, สร้างย้อนหลัง (ไม่ใช่วันออกพยากรณ์) ${skipped.not_created_on_issue_day} แถว, ไม่มีค่าเฉลี่ย 72 ชม. ให้เทียบ ${skipped.no_base72} คู่`)
    const farmSrc = overallBySource.farm
    const overallMatched = farmSrc ? HORIZONS.reduce((s2, h) => s2 + farmSrc[h].hybridAbs.length, 0) : 0
    for (const src of Object.keys(overallBySource)) printTable(`สรุปรวมทุกฟาร์ม (ค่าเพี้ยนแบบ ${src})`, overallBySource[src])
    if (overallMatched > 0) {
        // เทียบกับผลทดสอบสถานี เฉพาะกรณีปรับตามโรงเรือน (farm) ซึ่งเป็นกรณีเดียวกับ EVALUATION.mae
        for (const h of HORIZONS) {
            const s = summarizeHorizon(farmSrc[h])
            if (s.n > 0 && Math.abs(s.hybrid_mae - EVALUATION.mae[h]) >= 0.3) {
                console.log(
                    `[หมายเหตุ +${h} วัน]: MAE ในโรงเรือนจริง (${fmt(s.hybrid_mae)}) ต่างจากผลทดสอบสถานีสนามบินเชียงใหม่ (${fmt(EVALUATION.mae[h])}) ` +
                    `อยู่ ${fmt(s.hybrid_mae - EVALUATION.mae[h])} THI (จำนวนตัวอย่าง n=${s.n})`
                )
            }
        }
    } else {
        console.log('\nสรุปรวม: ยังไม่มีวันในโรงเรือนที่มีทั้งผลพยากรณ์ hybrid-ecmwf-bias-v1 และข้อมูลวัดจริงครบ >= 20 ชม. สำหรับเปรียบเทียบ')
        console.log('กรุณารันสคริปต์นี้อีกครั้งหลังติดตั้งและเก็บข้อมูลในโรงเรือนจริงอย่างน้อย 2 สัปดาห์ (ห้ามแก้ตัวเลขใน EVALUATION จนกว่าจะมีผลวัดจริงและผู้ใช้อนุมัติ)')
    }
}

main()
    .catch((err) => {
        console.error('เกิดข้อผิดพลาดในการรัน eval_barn_live:', err.message)
        process.exitCode = 1
    })
    .finally(async () => {
        await db.pool.end().catch(() => {})
    })
