/**
 * CowCare AI - LINE Alert Service
 * ระบบส่งข้อความแจ้งเตือนดัชนีความร้อนและสภาวะเครียดของโคนมสู่ LINE Messaging API
 * รองรับ Flex Message, สรุปรายวัน 20:00 น., และบันทึกประวัติการแจ้งเตือน
 */

const axios = require('axios')
const db = require('../config/db')
const { getRiskLevel, getFarmProfile, toAlertLevel, calcThi } = require('./heatStress')
const { loadFarmEvents, connectionStatus } = require('./heatEvents')

// เก็บ Alert Logs ในหน่วยความจำสำรองกรณีไม่มีตาราง tb_alerts
const inMemoryAlertLogs = []

/**
 * สร้าง Flex Message สำหรับแจ้งเตือน THI วิกฤต
 */
function createHeatStressFlexMessage(farmName, barnUnit, thi, temp, hum, advice, level) {
    // level มาจาก toAlertLevel() ตามเกณฑ์ของฟาร์ม ไม่ตัดสินจากค่า THI ตรงนี้
    const isCritical = level === 'critical'
    const bannerColor = isCritical ? '#DC2626' : '#EA580C'
    const statusTitle = isCritical
        ? '🚨 วิกฤตความร้อน (Severe)'
        : level === 'moderate' ? '⚠️ เครียดจากความร้อน (Moderate)' : '🌤️ เฝ้าระวังความร้อน (Mild)'
    const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })

    return {
        type: 'flex',
        altText: `[CowCare AI] ${statusTitle} - ${farmName} (THI: ${thi})`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: bannerColor,
                paddingAll: '16px',
                contents: [
                    {
                        type: 'text',
                        text: 'CowCare AI • แจ้งเตือนสภาวะโคนม',
                        color: '#FFFFFFCC',
                        size: 'xs',
                        weight: 'bold'
                    },
                    {
                        type: 'text',
                        text: statusTitle,
                        color: '#FFFFFF',
                        size: 'md',
                        weight: 'bold',
                        margin: 'xs'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: '16px',
                contents: [
                    {
                        type: 'box',
                        layout: 'baseline',
                        contents: [
                            { type: 'text', text: 'ฟาร์ม:', color: '#718078', size: 'xs', flex: 2 },
                            { type: 'text', text: `${farmName} (${barnUnit || 'โรงเรือน 1'})`, weight: 'bold', size: 'xs', color: '#142820', flex: 5 }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#F6F7F5',
                                cornerRadius: '8px',
                                paddingAll: '8px',
                                flex: 1,
                                contents: [
                                    { type: 'text', text: 'ดัชนี THI', size: 'xxs', color: '#718078' },
                                    { type: 'text', text: `${thi}`, size: 'lg', weight: 'bold', color: bannerColor }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#F6F7F5',
                                cornerRadius: '8px',
                                paddingAll: '8px',
                                flex: 1,
                                contents: [
                                    { type: 'text', text: 'อุณหภูมิ', size: 'xxs', color: '#718078' },
                                    { type: 'text', text: `${temp} °C`, size: 'sm', weight: 'bold', color: '#142820' }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#F6F7F5',
                                cornerRadius: '8px',
                                paddingAll: '8px',
                                flex: 1,
                                contents: [
                                    { type: 'text', text: 'ความชื้น RH', size: 'xxs', color: '#718078' },
                                    { type: 'text', text: `${hum}%`, size: 'sm', weight: 'bold', color: '#142820' }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: '#FFF7ED',
                        cornerRadius: '8px',
                        paddingAll: '10px',
                        borderWidth: '1px',
                        borderColor: '#FFEDD5',
                        contents: [
                            { type: 'text', text: 'คำแนะนำการจัดการด่วน:', size: 'xs', weight: 'bold', color: '#C2410C' },
                            { type: 'text', text: advice || 'เปิดพัดลมระบายอากาศทันที ตรวจสอบน้ำดื่มสะอาด และสังเกตการหอบของแม่โค', size: 'xxs', color: '#431407', wrap: true, margin: 'xs' }
                        ]
                    },
                    {
                        type: 'text',
                        text: `เวลาที่ตรวจวัด: ${nowStr}`,
                        size: 'xxs',
                        color: '#9CA3AF',
                        align: 'center'
                    }
                ]
            }
        }
    }
}

/**
 * ส่งแจ้งเตือนผ่าน LINE
 */
async function sendLineAlert({ farmId, farmName, barnUnit, thi, temp, hum, advice, level = 'warning', recipientToken = null }) {
    const channelToken = recipientToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_NOTIFY_TOKEN
    const messageId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    const timestamp = new Date().toISOString()

    const logEntry = {
        id: messageId,
        farm_id: farmId,
        farm_name: farmName || 'ฟาร์มสาธิต CowCare AI',
        barn_unit: barnUnit || 'โรงเรือนหลัก',
        thi: parseFloat(thi),
        temperature_c: parseFloat(temp),
        humidity_pct: parseFloat(hum),
        level,
        advice: advice || 'เปิดพัดลมระบายอากาศทันที',
        channel: channelToken ? 'LINE_MESSAGING_API' : 'MOCK_DISPATCH_LOG',
        status: channelToken ? 'sent' : 'simulated_success',
        created_at: timestamp
    }

    inMemoryAlertLogs.unshift(logEntry)
    if (inMemoryAlertLogs.length > 200) inMemoryAlertLogs.pop()

    // ถ้ามีการตั้งค่า LINE TOKEN ให้ส่งจริง
    if (channelToken && channelToken.trim() !== '') {
        try {
            const flexMsg = createHeatStressFlexMessage(farmName, barnUnit, thi, temp, hum, advice, level)
            const lineUserId = process.env.LINE_USER_ID // หรือ Broadcast
            
            if (lineUserId) {
                await axios.post('https://api.line.me/v2/bot/message/push', {
                    to: lineUserId,
                    messages: [flexMsg]
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${channelToken}`
                    },
                    timeout: 5000
                })
                console.log(`[LINE Alert Service] Sent push alert to user ${lineUserId} successfully!`)
            } else {
                // ถ้าไม่มี LINE_USER_ID ให้ใช้ Broadcast
                await axios.post('https://api.line.me/v2/bot/message/broadcast', {
                    messages: [flexMsg]
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${channelToken}`
                    },
                    timeout: 5000
                })
                console.log(`[LINE Alert Service] Broadcasted alert successfully!`)
            }
        } catch (err) {
            console.warn('[LINE Alert Service Warning] Failed to dispatch via LINE API:', err.response?.data || err.message)
            logEntry.status = 'failed'
            logEntry.error = err.message
        }
    } else {
        console.log(`[LINE Alert Service Simulation] Dispatched alert for ${farmName} (THI: ${thi}) to Alert Center log.`)
    }

    return logEntry
}

/**
 * ดึงรายการ Alert Logs ล่าสุด (รองรับการกรองตาม farmId)
 * ใช้เหตุการณ์ความร้อนย้อนหลัง 7 วัน (กฎเดียวกับหน้าเกษตรกร) ไม่นับทุกแถวดิบของเซ็นเซอร์
 */
async function getAlertLogs(limit = 50, farmId = null) {
    try {
        const params = []
        let whereClause = ''
        if (farmId) {
            whereClause = 'WHERE f.id_farms = $1'
            params.push(farmId)
        }
        const { rows: farms } = await db.query(`
            SELECT f.id_farms, f.name_farms, f.barn_unit, to_jsonb(f)->>'hf_profile' AS hf_profile
            FROM tb_farms f
            ${whereClause}
            ORDER BY f.created_at ASC
        `, params)

        const perFarm = await Promise.all(farms.map(async (farm) => {
            const events = await loadFarmEvents(farm, 7)
            return events
                .filter(e => e.type === 'heat')
                .map(e => {
                    const level = toAlertLevel(e.level) // moderate -> 'moderate', severe -> 'critical'
                    return {
                        id: `heat-${farm.id_farms}-${new Date(e.start).toISOString()}`,
                        farm_id: farm.id_farms,
                        farm_name: farm.name_farms || 'ฟาร์มไม่ระบุชื่อ',
                        barn_unit: farm.barn_unit || 'โรงเรือน 1',
                        thi: e.peak_thi,
                        temperature_c: e.peak_temp,
                        humidity_pct: null,
                        level,
                        advice: level === 'critical'
                            ? '🚨 วิกฤต! เปิดพัดลมสูงสุดและสังเกตอาการหอบ งดพ่นหมอกหากความชื้นเกิน 75%'
                            : '⚠️ เปิดพัดลมระบายอากาศเพื่อป้องกันความร้อนสะสม',
                        channel: 'SYSTEM_SENSOR',
                        status: e.ongoing ? 'ongoing' : 'ended',
                        created_at: e.start,
                        start: e.start,
                        end: e.end,
                        duration_min: e.duration_min,
                        ongoing: e.ongoing
                    }
                })
        }))
        const dbAlerts = perFarm.flat()

        // กรอง memory logs ตาม farmId ถ้ามี
        const filteredMemLogs = farmId 
            ? inMemoryAlertLogs.filter(a => String(a.farm_id) === String(farmId))
            : inMemoryAlertLogs

        const combined = [...filteredMemLogs, ...dbAlerts]
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return combined.slice(0, limit)
    } catch (err) {
        console.warn('[getAlertLogs error]:', err.message)
        // ห้ามคืนเฉพาะ log ในหน่วยความจำ เพราะหน้าแอดมินจะดูเหมือนไม่มีเหตุการณ์ ทั้งที่จริงคือดึงข้อมูลไม่ได้
        throw err
    }
}

/**
 * ดึงข้อมูลสรุปสถานะการแจ้งเตือนแยกตามรายฟาร์ม (นับเหตุการณ์ความร้อนย้อนหลัง 7 วัน)
 */
async function getFarmsAlertSummary() {
    try {
        const { rows: farms } = await db.query(`
            SELECT 
                f.id_farms,
                f.name_farms,
                f.province,
                f.district,
                COALESCE(f.barn_unit, 'โรงเรือนหลัก (Unit 1)') AS barn_unit,
                to_jsonb(f)->>'hf_profile' AS hf_profile,
                u.name_users AS farmer_name,
                u.phone AS farmer_phone,
                d.id_devices,
                d.name_devices,
                d.serial_no,
                d.status AS device_status,
                d.last_seen_at,
                sr.temperature_c,
                sr.humidity_pct,
                sr.thi,
                sr.recorded_at AS last_reading_time
            FROM tb_farms f
            LEFT JOIN tb_users u ON u.id_users = f.id_users
            LEFT JOIN LATERAL (
                SELECT d1.*
                FROM tb_devices d1
                WHERE d1.id_farms = f.id_farms
                ORDER BY d1.last_seen_at DESC NULLS LAST
                LIMIT 1
            ) d ON true
            LEFT JOIN LATERAL (
                SELECT s.*
                FROM tb_sensor_readings s
                WHERE s.id_devices = d.id_devices OR s.id_farms = f.id_farms
                ORDER BY s.recorded_at DESC
                LIMIT 1
            ) sr ON true
            ORDER BY f.created_at DESC
        `)

        const now = Date.now()

        // สรุปจำนวนเหตุการณ์ความร้อนย้อนหลัง 7 วันของแต่ละฟาร์ม (กฎเดียวกับหน้าเกษตรกร)
        const results = await Promise.all(farms.map(async (farm) => {
            const profile = getFarmProfile(farm)
            const events = await loadFarmEvents(farm, 7)
            const heatEvents = events.filter(e => e.type === 'heat')
            const offlineEvents = events.filter(e => e.type === 'sensor_offline')
            const connection = connectionStatus(farm.last_reading_time, now)
            const criticalAlerts = heatEvents.filter(e => e.level === 'severe').length
            const moderateAlerts = heatEvents.filter(e => e.level === 'moderate').length
            const lastAlertAt = heatEvents[0]?.start || null

            const thi = calcThi(farm.temperature_c, farm.humidity_pct)
            const isOnline = farm.last_seen_at && (now - new Date(farm.last_seen_at).getTime()) < 10 * 60 * 1000

            const riskLevel = getRiskLevel(thi, profile)
            const STATUS = {
                normal: ['normal', 'ปกติ (Comfort)'],
                mild: ['mild', '🌤️ เฝ้าระวัง (Mild)'],
                moderate: ['moderate', '⚠️ เครียดจากความร้อน (Moderate)'],
                severe: ['critical', '🚨 วิกฤต (Severe)']
            }
            // กล่องเงียบ: ห้ามสรุประดับความร้อนจากค่าเก่า (อาจเก่าหลายวัน) ให้แสดงว่าขาดการติดต่อแทน
            const [alertStatus, statusText] = connection.status === 'live'
                ? (STATUS[riskLevel] || STATUS.normal)
                : connection.status === 'offline' ? ['offline', '📡 ขาดการติดต่อ'] : ['never', 'ยังไม่มีข้อมูล']

            return {
                id_farms: farm.id_farms,
                name_farms: farm.name_farms,
                barn_unit: farm.barn_unit,
                province: farm.province,
                district: farm.district,
                farmer_name: farm.farmer_name || 'เกษตรกรสมาชิก',
                farmer_phone: farm.farmer_phone,
                device_serial: farm.serial_no || 'N/A',
                is_online: Boolean(isOnline),
                current_thi: thi,
                hf_profile: profile,
                current_temp: farm.temperature_c != null ? parseFloat(farm.temperature_c) : null,
                current_hum: farm.humidity_pct != null ? parseFloat(farm.humidity_pct) : null,
                last_reading_time: farm.last_reading_time,
                alert_status: alertStatus,
                status_text: statusText,
                total_alerts: heatEvents.length,
                critical_alerts: criticalAlerts,
                moderate_alerts: moderateAlerts,
                mild_alerts: 0,
                last_alert_at: lastAlertAt,
                // สถานะการส่งข้อมูล + ช่วงขาดการติดต่อ 7 วัน (นับแยกจากเหตุการณ์ความร้อน)
                connection,
                offline_events: offlineEvents.length,
                offline_ongoing: offlineEvents.some(e => e.ongoing)
            }
        }))

        return results
    } catch (err) {
        console.error('[getFarmsAlertSummary Error]:', err.message)
        // ห้ามคืน [] เพราะหน้าแอดมินจะแสดงว่า "ไม่มีฟาร์ม" ทั้งที่จริงคือดึงข้อมูลไม่ได้
        throw err
    }
}

module.exports = {
    sendLineAlert,
    getAlertLogs,
    getFarmsAlertSummary,
    createHeatStressFlexMessage
}
