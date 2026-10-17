/**
 * CowCare AI - LINE Alert Service
 * ระบบส่งข้อความแจ้งเตือนดัชนีความร้อนและสภาวะเครียดของโคนมสู่ LINE Messaging API
 * รองรับ Flex Message, สรุปรายวัน 20:00 น., และบันทึกประวัติการแจ้งเตือน
 */

const axios = require('axios')
const db = require('../config/db')

// เก็บ Alert Logs ในหน่วยความจำสำรองกรณีไม่มีตาราง tb_alerts
const inMemoryAlertLogs = []

/**
 * สร้าง Flex Message สำหรับแจ้งเตือน THI วิกฤต
 */
function createHeatStressFlexMessage(farmName, barnUnit, thi, temp, hum, advice, level) {
    const isCritical = level === 'critical' || thi >= 84.0
    const bannerColor = isCritical ? '#DC2626' : '#EA580C'
    const statusTitle = isCritical ? '🚨 วิกฤตความร้อนรุนแรง (Severe)' : '⚠️ เริ่มเฝ้าระวังความร้อน (Moderate)'
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
 */
async function getAlertLogs(limit = 50, farmId = null) {
    // รวม alerts จาก in-memory และ real telemetry readings ที่มี THI >= 76
    try {
        let query = `
            SELECT 
                sr.id_sensor_readings,
                sr.id_farms,
                f.name_farms AS farm_name,
                f.barn_unit,
                sr.temperature_c,
                sr.humidity_pct,
                sr.thi,
                sr.recorded_at AS created_at
            FROM tb_sensor_readings sr
            LEFT JOIN tb_farms f ON f.id_farms = sr.id_farms
            WHERE sr.thi >= 76.0
        `
        const params = [limit]
        if (farmId) {
            query += ` AND (sr.id_farms = $2 OR sr.id_devices IN (SELECT id_devices FROM tb_devices WHERE id_farms = $2))`
            params.push(farmId)
        }
        query += ` ORDER BY sr.recorded_at DESC LIMIT $1`

        const { rows } = await db.query(query, params)

        const dbAlerts = rows.map((r, idx) => {
            const thi = parseFloat(r.thi)
            const level = thi >= 84.0 ? 'critical' : thi >= 80.0 ? 'moderate' : 'warning'
            return {
                id: `db-alert-${r.id_sensor_readings || idx}`,
                farm_id: r.id_farms,
                farm_name: r.farm_name || 'ฟาร์มสาธิต CowCare AI',
                barn_unit: r.barn_unit || 'โรงเรือน 1',
                thi,
                temperature_c: parseFloat(r.temperature_c),
                humidity_pct: parseFloat(r.humidity_pct),
                level,
                advice: level === 'critical' 
                    ? '🚨 วิกฤตรุนแรง! เปิดพัดลมสูงสุดและสังเกตอาการหอบ งดพ่นหมอกหากความชื้นเกิน 75%' 
                    : '⚠️ เปิดพัดลมระบายอากาศเพื่อป้องกันน้ำนมลดลง',
                channel: 'SYSTEM_SENSOR',
                status: 'detected',
                created_at: r.created_at
            }
        })

        // กรอง memory logs ตาม farmId ถ้ามี
        const filteredMemLogs = farmId 
            ? inMemoryAlertLogs.filter(a => String(a.farm_id) === String(farmId))
            : inMemoryAlertLogs

        const combined = [...filteredMemLogs, ...dbAlerts]
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return combined.slice(0, limit)
    } catch (err) {
        console.warn('[getAlertLogs fallback]:', err.message)
        const filteredMemLogs = farmId 
            ? inMemoryAlertLogs.filter(a => String(a.farm_id) === String(farmId))
            : inMemoryAlertLogs
        return filteredMemLogs.slice(0, limit)
    }
}

/**
 * ดึงข้อมูลสรุปสถานะการแจ้งเตือนแยกตามรายฟาร์ม
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

        // สรุปจำนวนแจ้งเตือนของแต่ละฟาร์ม
        const results = await Promise.all(farms.map(async (farm) => {
            const { rows: alertCounts } = await db.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE thi >= 76.0) AS total_alerts,
                    COUNT(*) FILTER (WHERE thi >= 84.0) AS critical_alerts,
                    COUNT(*) FILTER (WHERE thi >= 80.0 AND thi < 84.0) AS moderate_alerts,
                    COUNT(*) FILTER (WHERE thi >= 76.0 AND thi < 80.0) AS mild_alerts,
                    MAX(recorded_at) FILTER (WHERE thi >= 76.0) AS last_alert_at
                FROM tb_sensor_readings
                WHERE (id_farms = $1 OR id_devices IN (SELECT id_devices FROM tb_devices WHERE id_farms = $1))
            `, [farm.id_farms])

            const countData = alertCounts[0] || {}
            const thi = farm.thi != null ? parseFloat(farm.thi) : null
            const isOnline = farm.last_seen_at && (now - new Date(farm.last_seen_at).getTime()) < 10 * 60 * 1000

            let alertStatus = 'normal'
            let statusText = 'ปกติ (Comfort)'
            if (thi != null) {
                if (thi >= 84.0) {
                    alertStatus = 'critical'
                    statusText = '🚨 วิกฤตรุนแรง (Severe)'
                } else if (thi >= 80.0) {
                    alertStatus = 'moderate'
                    statusText = '⚠️ เริ่มกระทบผลผลิต (Moderate)'
                } else if (thi >= 76.0) {
                    alertStatus = 'mild'
                    statusText = '🌤️ เริ่มเฝ้าระวัง (Mild)'
                }
            }

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
                current_temp: farm.temperature_c != null ? parseFloat(farm.temperature_c) : null,
                current_hum: farm.humidity_pct != null ? parseFloat(farm.humidity_pct) : null,
                last_reading_time: farm.last_reading_time,
                alert_status: alertStatus,
                status_text: statusText,
                total_alerts: parseInt(countData.total_alerts || 0, 10),
                critical_alerts: parseInt(countData.critical_alerts || 0, 10),
                moderate_alerts: parseInt(countData.moderate_alerts || 0, 10),
                mild_alerts: parseInt(countData.mild_alerts || 0, 10),
                last_alert_at: countData.last_alert_at
            }
        }))

        return results
    } catch (err) {
        console.error('[getFarmsAlertSummary Error]:', err.message)
        return []
    }
}

module.exports = {
    sendLineAlert,
    getAlertLogs,
    getFarmsAlertSummary,
    createHeatStressFlexMessage
}
