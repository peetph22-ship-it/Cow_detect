/**
 * CowCare AI - Outdoor Weather Integration Service (Open-Meteo API)
 * 
 * วัตถุประสงค์:
 * - ดึงสภาพอากาศภายนอกโรงเรือนแบบ Real-time และรายชั่วโมง จาก Open-Meteo API (Open Data ฟรี ไม่ต้องใช้ API Key)
 * - ระบุพิกัดอัตโนมัติจาก อำเภอ (district) และ จังหวัด (province) ของฟาร์มใน tb_farms
 * - มีตารางพิกัดอำเภอโคนมหลักของไทยในตัว (Instant lookup 0ms) พร้อม Geocoding API fallback
 * - คำนวณ Outdoor THI ด้วยสูตร NRC (1971) ตัวเดียวกับระบบเซ็นเซอร์ในโรงเรือน (Single Source of Truth)
 * - วิเคราะห์ผลต่าง ในโรงเรือน vs ภายนอก (Delta THI, Delta Temp, Delta Hum) และประเมินการระบายอากาศ (Ventilation Status)
 * - มี In-memory Cache TTL 15 นาที เพื่อประหยัดแบนด์วิดท์และตอบสนองรวดเร็ว
 */

const axios = require('axios')
const { calcThi, getRiskLevel, getFarmProfile, RISK_LABELS_TH } = require('./heatStress')

// In-Memory Caches
const WEATHER_CACHE = new Map() // key -> { data, expiresAt, fetchedAt }
const GEOCODE_CACHE = new Map() // query -> { lat, lon, name }
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 นาที
const STALE_GRACE_MS = 2 * 60 * 60 * 1000 // ยอมใช้ข้อมูลเก่าได้ไม่เกิน 2 ชม. กรณีเน็ตหลุด

// WMO Weather Interpretation Codes (WW)
const WMO_WEATHER_CODES = {
    0: { desc: 'ท้องฟ้าแจ่มใส', icon: 'mdi-weather-sunny', status: 'clear' },
    1: { desc: 'ท้องฟ้าโปร่งส่วนใหญ่', icon: 'mdi-weather-partly-cloudy', status: 'mostly_clear' },
    2: { desc: 'มีเมฆบางส่วน', icon: 'mdi-weather-partly-cloudy', status: 'partly_cloudy' },
    3: { desc: 'มีเมฆหนาทึบ', icon: 'mdi-weather-cloudy', status: 'overcast' },
    45: { desc: 'มีหมอกหนา', icon: 'mdi-weather-fog', status: 'fog' },
    48: { desc: 'มีหมอกน้ำค้าง', icon: 'mdi-weather-fog', status: 'fog' },
    51: { desc: 'ละอองฝนเบาบาง', icon: 'mdi-weather-rainy', status: 'drizzle' },
    53: { desc: 'ละอองฝนปานกลาง', icon: 'mdi-weather-rainy', status: 'drizzle' },
    55: { desc: 'ละอองฝนหนาแน่น', icon: 'mdi-weather-pouring', status: 'drizzle' },
    61: { desc: 'ฝนตกเล็กน้อย', icon: 'mdi-weather-rainy', status: 'rain' },
    63: { desc: 'ฝนตกปานกลาง', icon: 'mdi-weather-rainy', status: 'rain' },
    65: { desc: 'ฝนตกหนัก', icon: 'mdi-weather-pouring', status: 'rain' },
    80: { desc: 'ฝนซู่กระจาย', icon: 'mdi-weather-rainy', status: 'shower' },
    81: { desc: 'ฝนซู่ปานกลาง', icon: 'mdi-weather-pouring', status: 'shower' },
    82: { desc: 'ฝนซู่รุนแรง', icon: 'mdi-weather-lightning-rainy', status: 'shower' },
    95: { desc: 'พายุฝนฟ้าคะนอง', icon: 'mdi-weather-lightning-rainy', status: 'thunderstorm' },
    96: { desc: 'พายุฝนฟ้าคะนองมีลูกเห็บเล็กน้อย', icon: 'mdi-weather-hail', status: 'thunderstorm' },
    99: { desc: 'พายุฝนฟ้าคะนองมีลูกเห็บรุนแรง', icon: 'mdi-weather-hail', status: 'thunderstorm' }
}

// ฐานข้อมูลพิกัดอำเภอแหล่งเลี้ยงโคนมสำคัญของไทย (Instant lookup 0ms)
const DISTRICT_COORDS = {
    // สระบุรี
    'มวกเหล็ก': { lat: 14.654, lon: 101.199, district: 'มวกเหล็ก', province: 'สระบุรี' },
    'วังม่วง': { lat: 14.845, lon: 101.134, district: 'วังม่วง', province: 'สระบุรี' },
    'แก่งคอย': { lat: 14.587, lon: 101.000, district: 'แก่งคอย', province: 'สระบุรี' },
    'พระพุทธบาท': { lat: 14.723, lon: 100.793, district: 'พระพุทธบาท', province: 'สระบุรี' },
    'หนองแค': { lat: 14.341, lon: 100.865, district: 'หนองแค', province: 'สระบุรี' },
    'วิหารแดง': { lat: 14.382, lon: 100.999, district: 'วิหารแดง', province: 'สระบุรี' },
    'เมืองสระบุรี': { lat: 14.529, lon: 100.910, district: 'เมืองสระบุรี', province: 'สระบุรี' },
    'เสาไห้': { lat: 14.551, lon: 100.856, district: 'เสาไห้', province: 'สระบุรี' },
    'บ้านหมอ': { lat: 14.614, lon: 100.725, district: 'บ้านหมอ', province: 'สระบุรี' },

    // นครราชสีมา
    'ปากช่อง': { lat: 14.706, lon: 101.416, district: 'ปากช่อง', province: 'นครราชสีมา' },
    'สีคิ้ว': { lat: 14.893, lon: 101.724, district: 'สีคิ้ว', province: 'นครราชสีมา' },
    'ด่านขุนทด': { lat: 15.214, lon: 101.769, district: 'ด่านขุนทด', province: 'นครราชสีมา' },
    'พิมาย': { lat: 15.221, lon: 102.493, district: 'พิมาย', province: 'นครราชสีมา' },
    'โชคชัย': { lat: 14.729, lon: 102.164, district: 'โชคชัย', province: 'นครราชสีมา' },
    'สูงเนิน': { lat: 14.901, lon: 101.821, district: 'สูงเนิน', province: 'นครราชสีมา' },
    'ปักธงชัย': { lat: 14.720, lon: 102.029, district: 'ปักธงชัย', province: 'นครราชสีมา' },
    'ขามทะเลสอ': { lat: 14.981, lon: 101.954, district: 'ขามทะเลสอ', province: 'นครราชสีมา' },
    'เมืองนครราชสีมา': { lat: 14.979, lon: 102.097, district: 'เมืองนครราชสีมา', province: 'นครราชสีมา' },

    // เชียงใหม่
    'แม่วาง': { lat: 18.604, lon: 98.672, district: 'แม่วาง', province: 'เชียงใหม่' },
    'สันกำแพง': { lat: 18.745, lon: 99.123, district: 'สันกำแพง', province: 'เชียงใหม่' },
    'สารภี': { lat: 18.708, lon: 99.034, district: 'สารภี', province: 'เชียงใหม่' },
    'สันทราย': { lat: 18.852, lon: 99.043, district: 'สันทราย', province: 'เชียงใหม่' },
    'ดอยสะเก็ด': { lat: 18.871, lon: 99.135, district: 'ดอยสะเก็ด', province: 'เชียงใหม่' },
    'หางดง': { lat: 18.687, lon: 98.918, district: 'หางดง', province: 'เชียงใหม่' },
    'จอมทอง': { lat: 18.416, lon: 98.679, district: 'จอมทอง', province: 'เชียงใหม่' },
    'ฝาง': { lat: 19.917, lon: 99.213, district: 'ฝาง', province: 'เชียงใหม่' },
    'เมืองเชียงใหม่': { lat: 18.788, lon: 98.985, district: 'เมืองเชียงใหม่', province: 'เชียงใหม่' },

    // เชียงราย
    'พาน': { lat: 19.553, lon: 99.742, district: 'พาน', province: 'เชียงราย' },
    'แม่สาย': { lat: 20.433, lon: 99.882, district: 'แม่สาย', province: 'เชียงราย' },
    'เวียงป่าเป้า': { lat: 19.349, lon: 99.505, district: 'เวียงป่าเป้า', province: 'เชียงราย' },
    'เมืองเชียงราย': { lat: 19.910, lon: 99.840, district: 'เมืองเชียงราย', province: 'เชียงราย' },

    // ลำพูน / ลำปาง
    'ป่าซาง': { lat: 18.524, lon: 98.939, district: 'ป่าซาง', province: 'ลำพูน' },
    'บ้านธิ': { lat: 18.650, lon: 99.133, district: 'บ้านธิ', province: 'ลำพูน' },
    'เมืองลำพูน': { lat: 18.577, lon: 99.008, district: 'เมืองลำพูน', province: 'ลำพูน' },
    'เกาะคา': { lat: 18.199, lon: 99.395, district: 'เกาะคา', province: 'ลำปาง' },
    'ห้างฉัตร': { lat: 18.321, lon: 99.336, district: 'ห้างฉัตร', province: 'ลำปาง' },
    'เมืองลำปาง': { lat: 18.291, lon: 99.492, district: 'เมืองลำปาง', province: 'ลำปาง' },

    // ราชบุรี
    'โพธาราม': { lat: 13.692, lon: 99.851, district: 'โพธาราม', province: 'ราชบุรี' },
    'บ้านโป่ง': { lat: 13.812, lon: 99.878, district: 'บ้านโป่ง', province: 'ราชบุรี' },
    'จอมบึง': { lat: 13.621, lon: 99.591, district: 'จอมบึง', province: 'ราชบุรี' },
    'ดำเนินสะดวก': { lat: 13.518, lon: 99.957, district: 'ดำเนินสะดวก', province: 'ราชบุรี' },
    'เมืองราชบุรี': { lat: 13.537, lon: 99.816, district: 'เมืองราชบุรี', province: 'ราชบุรี' },

    // นครปฐม
    'กำแพงแสน': { lat: 14.004, lon: 99.992, district: 'กำแพงแสน', province: 'นครปฐม' },
    'นครชัยศรี': { lat: 13.799, lon: 100.183, district: 'นครชัยศรี', province: 'นครปฐม' },
    'บางเลน': { lat: 14.020, lon: 100.169, district: 'บางเลน', province: 'นครปฐม' },
    'ดอนตูม': { lat: 13.947, lon: 100.081, district: 'ดอนตูม', province: 'นครปฐม' },
    'เมืองนครปฐม': { lat: 13.820, lon: 100.059, district: 'เมืองนครปฐม', province: 'นครปฐม' },

    // ลพบุรี
    'พัฒนานิคม': { lat: 14.957, lon: 100.916, district: 'พัฒนานิคม', province: 'ลพบุรี' },
    'โคกสำโรง': { lat: 15.074, lon: 100.722, district: 'โคกสำโรง', province: 'ลพบุรี' },
    'ชัยบาดาล': { lat: 15.201, lon: 101.134, district: 'ชัยบาดาล', province: 'ลพบุรี' },
    'ท่าวุ้ง': { lat: 14.819, lon: 100.513, district: 'ท่าวุ้ง', province: 'ลพบุรี' },
    'บ้านหมี่': { lat: 15.044, lon: 100.537, district: 'บ้านหมี่', province: 'ลพบุรี' },
    'เมืองลพบุรี': { lat: 14.799, lon: 100.653, district: 'เมืองลพบุรี', province: 'ลพบุรี' },

    // กาญจนบุรี
    'ท่าม่วง': { lat: 13.963, lon: 99.642, district: 'ท่าม่วง', province: 'กาญจนบุรี' },
    'พนมทวน': { lat: 14.127, lon: 99.697, district: 'พนมทวน', province: 'กาญจนบุรี' },
    'ท่ามะกา': { lat: 13.921, lon: 99.764, district: 'ท่ามะกา', province: 'กาญจนบุรี' },
    'เมืองกาญจนบุรี': { lat: 14.023, lon: 99.533, district: 'เมืองกาญจนบุรี', province: 'กาญจนบุรี' },

    // เพชรบุรี / ประจวบคีรีขันธ์
    'ชะอำ': { lat: 12.798, lon: 99.967, district: 'ชะอำ', province: 'เพชรบุรี' },
    'ท่ายาง': { lat: 12.966, lon: 99.980, district: 'ท่ายาง', province: 'เพชรบุรี' },
    'เขาย้อย': { lat: 13.240, lon: 99.824, district: 'เขาย้อย', province: 'เพชรบุรี' },
    'เมืองเพชรบุรี': { lat: 13.109, lon: 99.940, district: 'เมืองเพชรบุรี', province: 'เพชรบุรี' },
    'ปราณบุรี': { lat: 12.392, lon: 99.914, district: 'ปราณบุรี', province: 'ประจวบคีรีขันธ์' },
    'กุยบุรี': { lat: 12.083, lon: 99.873, district: 'กุยบุรี', province: 'ประจวบคีรีขันธ์' },
    'หัวหิน': { lat: 12.568, lon: 99.957, district: 'หัวหิน', province: 'ประจวบคีรีขันธ์' },
    'เมืองประจวบคีรีขันธ์': { lat: 11.808, lon: 99.797, district: 'เมืองประจวบคีรีขันธ์', province: 'ประจวบคีรีขันธ์' },

    // ขอนแก่น / อุดร / สกลนคร
    'น้ำพอง': { lat: 16.711, lon: 102.871, district: 'น้ำพอง', province: 'ขอนแก่น' },
    'อุบลรัตน์': { lat: 16.757, lon: 102.628, district: 'อุบลรัตน์', province: 'ขอนแก่น' },
    'ชุมแพ': { lat: 16.544, lon: 102.099, district: 'ชุมแพ', province: 'ขอนแก่น' },
    'เมืองขอนแก่น': { lat: 16.444, lon: 102.833, district: 'เมืองขอนแก่น', province: 'ขอนแก่น' },
    'กุมภวาปี': { lat: 17.114, lon: 103.018, district: 'กุมภวาปี', province: 'อุดรธานี' },
    'เมืองอุดรธานี': { lat: 17.414, lon: 102.786, district: 'เมืองอุดรธานี', province: 'อุดรธานี' },
    'พังโคน': { lat: 17.387, lon: 103.717, district: 'พังโคน', province: 'สกลนคร' },
    'เมืองสกลนคร': { lat: 17.155, lon: 104.148, district: 'เมืองสกลนคร', province: 'สกลนคร' },

    // พัทลุง / สงขลา
    'ควนขนุน': { lat: 7.734, lon: 100.009, district: 'ควนขนุน', province: 'พัทลุง' },
    'เมืองพัทลุง': { lat: 7.617, lon: 100.084, district: 'เมืองพัทลุง', province: 'พัทลุง' },
    'หาดใหญ่': { lat: 7.009, lon: 100.477, district: 'หาดใหญ่', province: 'สงขลา' },
    'เมืองสงขลา': { lat: 7.189, lon: 100.595, district: 'เมืองสงขลา', province: 'สงขลา' }
}

// พิกัดศูนย์กลางจังหวัด (Fallback เมื่อไม่พบอำเภอ)
const PROVINCE_COORDS = {
    'สระบุรี': { lat: 14.529, lon: 100.910 },
    'นครราชสีมา': { lat: 14.979, lon: 102.097 },
    'เชียงใหม่': { lat: 18.788, lon: 98.985 },
    'เชียงราย': { lat: 19.910, lon: 99.840 },
    'ลำพูน': { lat: 18.577, lon: 99.008 },
    'ลำปาง': { lat: 18.291, lon: 99.492 },
    'ราชบุรี': { lat: 13.537, lon: 99.816 },
    'นครปฐม': { lat: 13.820, lon: 100.059 },
    'ลพบุรี': { lat: 14.799, lon: 100.653 },
    'กาญจนบุรี': { lat: 14.023, lon: 99.533 },
    'เพชรบุรี': { lat: 13.109, lon: 99.940 },
    'ประจวบคีรีขันธ์': { lat: 11.808, lon: 99.797 },
    'ขอนแก่น': { lat: 16.444, lon: 102.833 },
    'อุดรธานี': { lat: 17.414, lon: 102.786 },
    'สกลนคร': { lat: 17.155, lon: 104.148 },
    'พัทลุง': { lat: 7.617, lon: 100.084 },
    'สงขลา': { lat: 7.189, lon: 100.595 },
    'กรุงเทพมหานคร': { lat: 13.756, lon: 100.502 },
    'กรุงเทพฯ': { lat: 13.756, lon: 100.502 }
}

/**
 * ตัดคำนำหน้าอำเภอ เช่น "อ.", "อำเภอ", "เมือง" ให้เหลือเฉพาะชื่อค้นหา
 */
function cleanDistrictName(district) {
    if (!district) return ''
    return String(district)
        .trim()
        .replace(/^(อำเภอ|อ\.)\s*/g, '')
        .trim()
}

/**
 * ตัดคำนำหน้าจังหวัด เช่น "จ.", "จังหวัด" ให้เหลือเฉพาะชื่อค้นหา
 */
function cleanProvinceName(province) {
    if (!province) return ''
    return String(province)
        .trim()
        .replace(/^(จังหวัด|จ\.)\s*/g, '')
        .trim()
}

/**
 * ค้นหาพิกัดละติจูด/ลองจิจูดจากข้อมูลฟาร์ม (อำเภอ + จังหวัด)
 * 1. ค้นหาใน Dictionary ท้องถิ่น (0ms)
 * 2. ค้นหาผ่าน Open-Meteo Geocoding API (Fallback)
 * 3. Fallback ไปยังศูนย์กลางจังหวัด หรือ สระบุรี/กรุงเทพฯ
 */
async function resolveCoordinates(farm) {
    const rawDistrict = farm?.district || ''
    const rawProvince = farm?.province || ''
    const district = cleanDistrictName(rawDistrict)
    const province = cleanProvinceName(rawProvince)

    // 1. ตรวจสอบใน DISTRICT_COORDS ตรงๆ
    if (district && DISTRICT_COORDS[district]) {
        return {
            ...DISTRICT_COORDS[district],
            source: 'dictionary',
            location_name: `อ.${district} จ.${province || DISTRICT_COORDS[district].province}`
        }
    }

    // ตรวจสอบแบบมีคำว่า "เมือง" นำหน้า
    if (district && DISTRICT_COORDS[`เมือง${district}`]) {
        return {
            ...DISTRICT_COORDS[`เมือง${district}`],
            source: 'dictionary',
            location_name: `อ.เมือง${district} จ.${province || DISTRICT_COORDS[`เมือง${district}`].province}`
        }
    }

    // 2. ตรวจสอบใน In-Memory Geocode Cache
    const cacheKey = `${district}_${province}`.trim().toLowerCase()
    if (cacheKey && GEOCODE_CACHE.has(cacheKey)) {
        return GEOCODE_CACHE.get(cacheKey)
    }

    // 3. เรียก Open-Meteo Geocoding API (ถ้ามีระบุอำเภอหรือจังหวัด)
    if (district || province) {
        const query = [district, province, 'Thailand'].filter(Boolean).join(' ')
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=th&format=json`
            const res = await axios.get(url, { timeout: 3500 })
            if (res.data && Array.isArray(res.data.results) && res.data.results.length > 0) {
                const item = res.data.results[0]
                const result = {
                    lat: parseFloat(Number(item.latitude).toFixed(3)),
                    lon: parseFloat(Number(item.longitude).toFixed(3)),
                    district: district || item.name,
                    province: province || item.admin1 || '',
                    source: 'open_meteo_geocoding',
                    location_name: `${district ? `อ.${district} ` : ''}จ.${province || item.admin1 || item.name}`
                }
                GEOCODE_CACHE.set(cacheKey, result)
                return result
            }
        } catch (geoErr) {
            console.warn(`[OutdoorWeather] Geocoding lookup failed for '${query}':`, geoErr.message)
        }
    }

    // 4. ตรวจสอบพิกัดระดับจังหวัด
    if (province && PROVINCE_COORDS[province]) {
        return {
            lat: PROVINCE_COORDS[province].lat,
            lon: PROVINCE_COORDS[province].lon,
            district: district || 'เมือง',
            province: province,
            source: 'province_center',
            location_name: `${district ? `อ.${district} ` : ''}จ.${province}`
        }
    }

    // 5. Fallback ขั้นสุดท้าย: ศูนย์กลางโคนมไทย อ.มวกเหล็ก จ.สระบุรี
    return {
        lat: 14.654,
        lon: 101.199,
        district: district || 'มวกเหล็ก',
        province: province || 'สระบุรี',
        source: 'default_fallback',
        location_name: district ? `อ.${district} จ.${province || 'สระบุรี'}` : 'อ.มวกเหล็ก จ.สระบุรี (ค่าเริ่มต้น)'
    }
}

/**
 * ดึงข้อมูลสภาพอากาศภายนอกโรงเรือนจาก Open-Meteo
 * พร้อมแคช 15 นาที และคำนวณ THI ตามสูตร NRC 1971
 */
async function fetchOutdoorWeather(lat, lon, profile = 'default') {
    const latRounded = Number(lat).toFixed(3)
    const lonRounded = Number(lon).toFixed(3)
    const cacheKey = `${latRounded}_${lonRounded}`

    const now = Date.now()
    const cached = WEATHER_CACHE.get(cacheKey)

    // ใช้ข้อมูลจากแคชถ้ายังไม่หมดอายุ
    if (cached && now < cached.expiresAt) {
        return {
            ...cached.data,
            from_cache: true
        }
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latRounded}&longitude=${lonRounded}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m&timezone=Asia%2FBangkok&forecast_days=1`
        const res = await axios.get(url, { timeout: 4000 })

        if (!res.data || !res.data.current) {
            throw new Error('Open-Meteo response missing current telemetry')
        }

        const current = res.data.current
        const hourly = res.data.hourly || {}

        const tempC = current.temperature_2m != null ? parseFloat(Number(current.temperature_2m).toFixed(1)) : null
        const humPct = current.relative_humidity_2m != null ? Math.round(Number(current.relative_humidity_2m)) : null
        const windKmh = current.wind_speed_10m != null ? parseFloat(Number(current.wind_speed_10m).toFixed(1)) : null
        const weatherCode = current.weather_code != null ? current.weather_code : 0

        // คำนวณ Outdoor THI ผ่าน Single Source of Truth
        const outdoorThi = calcThi(tempC, humPct)
        const outdoorRisk = getRiskLevel(outdoorThi, profile)

        const codeInfo = WMO_WEATHER_CODES[weatherCode] || { desc: 'มีเมฆบางส่วน', icon: 'mdi-weather-cloudy', status: 'cloudy' }

        // คำนวณ Min-Max อุณหภูมิและความชื้นภายนอกของวันนี้จาก hourly
        const hourlyTemps = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m.filter(v => v != null) : []
        const hourlyHums = Array.isArray(hourly.relative_humidity_2m) ? hourly.relative_humidity_2m.filter(v => v != null) : []

        const minTemp = hourlyTemps.length ? Math.min(...hourlyTemps).toFixed(1) : null
        const maxTemp = hourlyTemps.length ? Math.max(...hourlyTemps).toFixed(1) : null
        const minHum = hourlyHums.length ? Math.round(Math.min(...hourlyHums)) : null
        const maxHum = hourlyHums.length ? Math.round(Math.max(...hourlyHums)) : null

        const result = {
            temperature_c: tempC,
            humidity_pct: humPct,
            thi: outdoorThi,
            risk_level: outdoorRisk,
            risk_label_th: outdoorRisk ? RISK_LABELS_TH[outdoorRisk] : 'ปกติ',
            wind_speed_kmh: windKmh,
            weather_code: weatherCode,
            weather_desc: codeInfo.desc,
            weather_icon: codeInfo.icon,
            weather_condition: codeInfo.status,
            min_temp: minTemp ? parseFloat(minTemp) : null,
            max_temp: maxTemp ? parseFloat(maxTemp) : null,
            min_hum: minHum,
            max_hum: maxHum,
            recorded_at: current.time,
            provider: 'Open-Meteo (DWD/ICON open data)',
            api_status: 'online',
            from_cache: false,
            fetched_at: new Date().toISOString()
        }

        WEATHER_CACHE.set(cacheKey, {
            data: result,
            expiresAt: now + CACHE_TTL_MS,
            fetchedAt: now
        })

        return result
    } catch (apiErr) {
        console.warn(`[OutdoorWeather] Open-Meteo fetch error (${latRounded}, ${lonRounded}):`, apiErr.message)

        // ถ้ามีแคชเก่าที่ยังไม่เกิน Stale Grace ให้ใช้แทนชั่วคราว
        if (cached && (now - cached.fetchedAt) < STALE_GRACE_MS) {
            return {
                ...cached.data,
                from_cache: true,
                stale: true,
                warning: 'ใช้ข้อมูลสภาพอากาศภายนอกล่าสุดก่อนหน้า เนื่องจากสัญญาณ Open-Meteo ขัดข้องชั่วคราว'
            }
        }

        // หากไม่มีข้อมูลเลย ให้ส่ง fallback object ที่ไม่ทำให้หน้าเว็บพัง
        return {
            temperature_c: null,
            humidity_pct: null,
            thi: null,
            risk_level: null,
            risk_label_th: 'ไม่มีข้อมูล',
            wind_speed_kmh: null,
            weather_code: 0,
            weather_desc: 'ไม่สามารถดึงข้อมูลสภาพอากาศได้',
            weather_icon: 'mdi-cloud-off-outline',
            recorded_at: null,
            provider: 'Open-Meteo',
            api_status: 'offline',
            from_cache: false,
            error: apiErr.message
        }
    }
}

/**
 * เปรียบเทียบสภาพอากาศ ในโรงเรือน (เซ็นเซอร์ SHT20) vs ภายนอกโรงเรือน (Open-Meteo)
 * วิเคราะห์ Delta THI, Delta Temp, Delta RH และประเมินการสะสมความร้อน (Ventilation Assessment)
 */
function computeComparison(latestSensor, outdoorWeather) {
    if (!outdoorWeather || outdoorWeather.temperature_c == null || !latestSensor || latestSensor.temperature_c == null) {
        return {
            has_comparison: false,
            delta_thi: null,
            delta_temp: null,
            delta_hum: null,
            status: 'incomplete_data',
            status_th: 'ข้อมูลไม่ครบถ้วน',
            ventilation_insight: 'ยังไม่มีข้อมูลเซ็นเซอร์หรือสภาพอากาศภายนอกเพียงพอสำหรับเปรียบเทียบ'
        }
    }

    const inTemp = Number(latestSensor.temperature_c)
    const outTemp = Number(outdoorWeather.temperature_c)
    const inHum = Number(latestSensor.humidity_pct)
    const outHum = Number(outdoorWeather.humidity_pct)

    const inThi = latestSensor.thi != null ? Number(latestSensor.thi) : calcThi(inTemp, inHum)
    const outThi = outdoorWeather.thi != null ? Number(outdoorWeather.thi) : calcThi(outTemp, outHum)

    const deltaTemp = parseFloat((inTemp - outTemp).toFixed(1))
    const deltaHum = parseFloat((inHum - outHum).toFixed(1))
    const deltaThi = (inThi != null && outThi != null) ? parseFloat((inThi - outThi).toFixed(1)) : null

    // ประเมินการระบายอากาศและการสะสมความร้อน (อ้างอิง Tikul & Prachum, 2562: โรงเรือนไทยไม่มีฝ้า ร้อนกว่านอก +1.5 ถึง +2°C)
    let status = 'balanced'
    let statusTh = 'สมดุลใกล้เคียงภายนอก'
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200'
    let insight = 'อุณหภูมิในโรงเรือนใกล้เคียงกับภายนอก การถ่ายเทอากาศเป็นไปตามธรรมชาติปกติ'

    if (deltaTemp >= 1.5 || (deltaThi != null && deltaThi >= 2.0)) {
        status = 'heat_trapping'
        statusTh = 'โรงเรือนสะสมความร้อน (Heat Trapping)'
        badgeClass = 'bg-rose-100 text-rose-800 border-rose-300'
        insight = `ในโรงเรือนร้อนกว่าภายนอก +${deltaTemp}°C (+${deltaThi ?? 0} THI) สอดคล้องกับสภาพโรงเรือนไทยที่ระบายอากาศใต้หลังคาช้า แนะนำเปิดพัดลมระบายอากาศเร่งการไหลเวียน`
    } else if (deltaTemp <= -1.0 || (deltaThi != null && deltaThi <= -1.5)) {
        status = 'cooler_inside'
        statusTh = 'ในโรงเรือนเย็นกว่าภายนอก'
        badgeClass = 'bg-sky-100 text-sky-800 border-sky-300'
        insight = `ในโรงเรือนเย็นกว่าภายนอก ${deltaTemp}°C (${deltaThi ?? 0} THI) ระบบร่มเงาหรือพัดลมระบายอากาศในโรงเรือนช่วยลดอุณหภูมิได้มีประสิทธิภาพ`
    }

    return {
        has_comparison: true,
        delta_thi: deltaThi,
        delta_temp: deltaTemp,
        delta_hum: deltaHum,
        status,
        status_th: statusTh,
        badge_class: badgeClass,
        ventilation_insight: insight,
        in_barn: {
            temperature_c: inTemp,
            humidity_pct: inHum,
            thi: inThi
        },
        outdoor: {
            temperature_c: outTemp,
            humidity_pct: outHum,
            thi: outThi
        }
    }
}

/**
 * Entry Point หลักสำหรับ API: รับฟาร์มและข้อมูลเซ็นเซอร์ล่าสุด แล้วดึงสภาพอากาศภายนอกพร้อมบทวิเคราะห์
 */
async function getFarmOutdoorWeather(farm, latestSensor = null) {
    if (!farm) return null

    const profile = getFarmProfile(farm)
    const location = await resolveCoordinates(farm)
    const outdoor = await fetchOutdoorWeather(location.lat, location.lon, profile)
    const comparison = computeComparison(latestSensor, outdoor)

    return {
        location: {
            district: location.district,
            province: location.province,
            location_name: location.location_name,
            latitude: location.lat,
            longitude: location.lon,
            source: location.source
        },
        weather: outdoor,
        comparison,
        hf_profile: profile
    }
}

module.exports = {
    resolveCoordinates,
    fetchOutdoorWeather,
    computeComparison,
    getFarmOutdoorWeather,
    DISTRICT_COORDS,
    PROVINCE_COORDS,
    WMO_WEATHER_CODES
}
