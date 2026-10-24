/**
 * CowCare AI - อากาศภายนอกโรงเรือนจาก Open-Meteo (ฟรี ไม่ต้องใช้ API key, CC BY 4.0)
 *
 * ข้อควรรู้: Open-Meteo เป็นค่าจาก "แบบจำลองพยากรณ์อากาศ" ที่จุดพิกัด ไม่ใช่สถานีวัดจริง
 * ค่าจากแบบจำลองในพื้นที่หนึ่งอาจต่างจากของจริงได้ราว 1-2°C จึงไม่ตัดสินจากค่าขณะเดียว
 *
 * วิธีเทียบ (ค่าเฉลี่ยรายชั่วโมงแบบเดียวกันทั้งสองฝั่ง)
 * - ในโรงเรือน: ค่าเฉลี่ย 5 นาทีจาก heatMetrics รวมเป็นรายชั่วโมง (ชั่วโมงที่มีข้อมูลอย่างน้อย 30 นาที)
 * - ภายนอก: ค่ารายชั่วโมงย้อนหลัง 72 ชม. ของ Open-Meteo ที่พิกัดฟาร์ม
 * - จับคู่ชั่วโมงเดียวกัน แล้วดูผลต่างเฉลี่ยช่วงบ่าย 12:00-16:59 (ช่วงที่หลังคารับความร้อนมากสุด)
 * - ต่างไม่เกิน ±2°C = ถือว่าใกล้เคียง (เกณฑ์ของระบบ เผื่อความคลาดเคลื่อนของแบบจำลอง)
 *
 * พิกัด: ใช้พิกัดฟาร์มที่ admin กรอก ถ้าไม่มี ใช้จุดกลางอำเภอ (ต้องเป็นอำเภอในจังหวัดนั้นจริง) หรือจุดกลางจังหวัด
 * หาไม่ได้ = ไม่ดึงอากาศ (ไม่เดาพิกัดจากที่อื่น)
 */

const axios = require('axios')
const { calcThi, getRiskLevel, getFarmProfile, RISK_LABELS_TH } = require('./heatStress')
const { loadBuckets, bkkDate, bkkHour, round1 } = require('./heatMetrics')

const WEATHER_CACHE = new Map()                 // "lat_lon" -> { data, expiresAt, fetchedAt }
const CACHE_TTL_MS = 30 * 60 * 1000             // ค่าจากแบบจำลองอัปเดตรายชั่วโมง แคช 30 นาทีช่วยลดโอกาสโดนจำกัด (429)
const STALE_GRACE_MS = 2 * 60 * 60 * 1000       // เน็ตหลุด: ใช้ค่าเดิมได้ไม่เกิน 2 ชม.
const PAST_HOURS = 72
const MIN_BUCKETS_PER_HOUR = 6                  // 6 x 5 นาที = มีข้อมูลอย่างน้อย 30 นาทีในชั่วโมงนั้น
const AFTERNOON = { from: 12, to: 16 }          // 12:00-16:59
const MIN_AFTERNOON_HOURS = 8                   // อย่างน้อย ~2 บ่าย
const TOLERANCE_C = 2.0                         // เกณฑ์ของระบบ ไม่ใช่ค่าจากงานวิจัย
const INDOOR_FRESH_MIN = 30

const SOURCE = {
    provider: 'Open-Meteo',
    kind_th: 'ค่าจากแบบจำลองพยากรณ์อากาศที่พิกัดฟาร์ม ไม่ใช่สถานีวัดจริง',
    attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
    url: 'https://open-meteo.com/'
}

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

const cleanDistrictName = (d) => String(d || '').trim().replace(/^(อำเภอ|อ\.)\s*/, '').trim()
const cleanProvinceName = (p) => String(p || '').trim().replace(/^(จังหวัด|จ\.)\s*/, '').trim()

/**
 * หาพิกัดของฟาร์ม คืน null ถ้าหาไม่ได้ (ไม่เดาพิกัดจากจังหวัดอื่น)
 */
const resolveLocation = (farm) => {
    const lat = farm?.latitude != null ? Number(farm.latitude) : NaN
    const lon = farm?.longitude != null ? Number(farm.longitude) : NaN
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { latitude: lat, longitude: lon, source: 'farm_coordinates', approximate: false, label: 'พิกัดฟาร์ม' }
    }
    const district = cleanDistrictName(farm?.district)
    const province = cleanProvinceName(farm?.province)
    const d = DISTRICT_COORDS[district] || DISTRICT_COORDS[`เมือง${district}`]
    // อำเภอต้องอยู่ในจังหวัดของฟาร์มจริง (กันกรณีข้อมูลฟาร์มอำเภอ/จังหวัดไม่ตรงกัน)
    if (d && (!province || d.province === province)) {
        return { latitude: d.lat, longitude: d.lon, source: 'district_center', approximate: true, label: `จุดกลาง อ.${d.district} จ.${d.province} (โดยประมาณ)` }
    }
    if (province && PROVINCE_COORDS[province]) {
        const p = PROVINCE_COORDS[province]
        return { latitude: p.lat, longitude: p.lon, source: 'province_center', approximate: true, label: `ตัวเมือง จ.${province} (โดยประมาณ)` }
    }
    return null
}

const locationProblem = (farm) => {
    const district = cleanDistrictName(farm?.district)
    const province = cleanProvinceName(farm?.province)
    const d = DISTRICT_COORDS[district]
    if (d && province && d.province !== province) {
        return `อำเภอ "${district}" ไม่ได้อยู่ใน จ.${province} ตรวจข้อมูลฟาร์ม หรือใส่พิกัดฟาร์มในหน้าแก้ไขฟาร์ม`
    }
    return 'ยังไม่ได้ใส่พิกัดฟาร์ม และไม่พบอำเภอ/จังหวัดในตารางพิกัด ใส่พิกัดฟาร์มในหน้าแก้ไขฟาร์ม'
}

// โฮสต์หลัก + โฮสต์สำรอง: ทั้งสองรับ query เดียวกันและตอบรูปแบบเดียวกัน (current + hourly)
// previous-runs-api คือโฮสต์ที่ forecastService ใช้อยู่และเรียกจาก Render ได้ จึงใช้เป็นตัวสำรองเมื่อโฮสต์หลักล้มเหลว
const OPEN_METEO_HOSTS = [
    { name: 'forecast', url: 'https://api.open-meteo.com/v1/forecast' },
    { name: 'previous_runs', url: 'https://previous-runs-api.open-meteo.com/v1/forecast' }
]
const OPEN_METEO_TIMEOUT_MS = 10000
// โฮสต์ที่ตอบ 429 จะถูกข้ามชั่วคราว 1 ชม. (Render ใช้ IP ขาออกร่วมกับเว็บอื่น โควตาจึงหมดบ่อย)
// เรียกโฮสต์สำรองตรงๆ แทน หน้าโหลดเร็วขึ้นและไม่เปลืองคำขอ
const RATE_LIMIT_COOLDOWN_MS = 60 * 60 * 1000
const HOST_COOLDOWN = new Map()                 // host name -> เวลา (ms) ที่จะกลับมาลองใหม่
const bkkClock = (ms) => new Date(ms).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })

// แปลง error ของ axios เป็นรหัสสถานะ + เหตุผลภาษาไทยที่แอดมินอ่านเข้าใจ (ใช้ทั้งใน log และหน้าเว็บ)
const describeFetchError = (err) => {
    const status = err.response?.status ?? null
    const code = err.code || null
    let reason_th
    if (status === 429) reason_th = 'Open-Meteo จำกัดจำนวนครั้งการเรียก (HTTP 429)'
    else if (status && status >= 500) reason_th = `Open-Meteo ขัดข้อง (HTTP ${status})`
    else if (status) reason_th = `Open-Meteo ปฏิเสธคำขอ (HTTP ${status})`
    else if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') reason_th = `Open-Meteo ตอบช้าเกิน ${OPEN_METEO_TIMEOUT_MS / 1000} วินาที`
    else if (code) reason_th = `เซิร์ฟเวอร์เชื่อมต่อ Open-Meteo ไม่ได้ (${code})`
    else reason_th = `ข้อมูลจาก Open-Meteo ไม่ครบ (${err.message})`
    return { status, code, reason_th }
}

/**
 * ดึงค่าปัจจุบัน + รายชั่วโมงย้อนหลัง 72 ชม. (เวลาไทย) แคช 30 นาที
 * ลองโฮสต์หลักก่อน ถ้าล้มเหลวลองโฮสต์สำรอง ถ้าล้มทั้งคู่ส่งเหตุผลของแต่ละโฮสต์กลับไปแสดงในหน้า
 */
const fetchOpenMeteo = async (lat, lon, { refresh = false } = {}) => {
    const key = `${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}`
    const now = Date.now()
    const cached = WEATHER_CACHE.get(key)
    if (!refresh && cached && now < cached.expiresAt) return { ...cached.data, from_cache: true }

    const query = `?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}`
        + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m'
        + '&hourly=temperature_2m,relative_humidity_2m'
        + '&past_days=3&forecast_days=1&timezone=Asia%2FBangkok'
    const errors = []
    for (const [i, host] of OPEN_METEO_HOSTS.entries()) {
        const until = HOST_COOLDOWN.get(host.name) || 0
        const isLast = i === OPEN_METEO_HOSTS.length - 1
        if (now < until && !isLast) {
            errors.push({ host: host.name, skipped: true, status: 429, code: null,
                reason_th: `ตอบ HTTP 429 ก่อนหน้านี้ จึงข้ามไว้ถึง ${bkkClock(until)} น.` })
            continue
        }
        try {
            const { data } = await axios.get(host.url + query, { timeout: OPEN_METEO_TIMEOUT_MS })
            if (!data?.current || !data?.hourly?.time) throw new Error('response missing current/hourly')
            const h = data.hourly
            const hourly = h.time.map((t, i) => ({
                key: t.slice(0, 13),                   // "YYYY-MM-DDTHH" เวลาไทย
                temp: h.temperature_2m?.[i],
                hum: h.relative_humidity_2m?.[i]
            })).filter(x => x.temp != null && x.hum != null)
            const result = {
                current: data.current, hourly, model_elevation_m: data.elevation ?? null,
                api_status: 'online', api_host: host.name, fetched_at: new Date(now).toISOString(),
                // โฮสต์หลักล้มแต่สำรองได้: เก็บเหตุผลไว้ให้แอดมินเห็นว่าใช้ตัวสำรองอยู่เพราะอะไร
                fallback_reason_th: errors.length ? errors.map(e => e.reason_th).join(' · ') : null
            }
            HOST_COOLDOWN.delete(host.name)
            WEATHER_CACHE.set(key, { data: result, expiresAt: now + CACHE_TTL_MS, fetchedAt: now })
            return { ...result, from_cache: false }
        } catch (err) {
            const e = { host: host.name, ...describeFetchError(err) }
            if (e.status === 429) HOST_COOLDOWN.set(host.name, now + RATE_LIMIT_COOLDOWN_MS)
            errors.push(e)
            console.warn(`[OutdoorWeather] Open-Meteo ${host.name} failed (${key}): status=${e.status ?? '-'} code=${e.code ?? '-'} ${err.message}`)
        }
    }
    const error_th = errors.map(e => e.reason_th).join(' · ')
    if (cached && now - cached.fetchedAt < STALE_GRACE_MS) return { ...cached.data, from_cache: true, api_status: 'stale', error_th }
    return { current: null, hourly: [], api_status: 'offline', errors, error_th }
}

const hourKey = (d) => `${bkkDate(d)}T${String(bkkHour(d)).padStart(2, '0')}`
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)

// ค่าเฉลี่ยรายชั่วโมงในโรงเรือน (เฉพาะชั่วโมงที่มีข้อมูลพอ)
const indoorHourly = (buckets) => {
    const by = new Map()
    for (const b of buckets) {
        const k = hourKey(b.t)
        if (!by.has(k)) by.set(k, { temp: [], hum: [], thi: [], hour: bkkHour(b.t) })
        const v = by.get(k)
        v.temp.push(b.temp); v.hum.push(b.hum); v.thi.push(b.thi)
    }
    const out = new Map()
    for (const [k, v] of by) {
        if (v.temp.length < MIN_BUCKETS_PER_HOUR) continue
        out.set(k, { hour: v.hour, temp: mean(v.temp), hum: mean(v.hum), thi: mean(v.thi) })
    }
    return out
}

/**
 * เทียบรายชั่วโมงที่ตรงกัน (pure function ทดสอบได้โดยไม่ต้องมี DB/เน็ต)
 */
const comparePeriod = (indoor, outdoorHourly, nowKey) => {
    const pairs = []
    for (const o of outdoorHourly) {
        if (o.key >= nowKey) continue              // ข้ามชั่วโมงปัจจุบันและค่าพยากรณ์ล่วงหน้า
        const i = indoor.get(o.key)
        if (!i) continue
        const outThi = calcThi(o.temp, o.hum)
        pairs.push({ hour: i.hour, dTemp: i.temp - o.temp, dThi: i.thi - outThi, inThi: i.thi, outThi })
    }
    const aft = pairs.filter(p => p.hour >= AFTERNOON.from && p.hour <= AFTERNOON.to)
    const base = {
        window_hours: PAST_HOURS,
        matched_hours: pairs.length,
        afternoon_hours: aft.length,
        mean_delta_temp: round1(mean(pairs.map(p => p.dTemp))),
        mean_delta_thi: round1(mean(pairs.map(p => p.dThi))),
        afternoon_delta_temp: round1(mean(aft.map(p => p.dTemp))),
        afternoon_delta_thi: round1(mean(aft.map(p => p.dThi))),
        indoor_mean_thi: round1(mean(pairs.map(p => p.inThi))),
        outdoor_mean_thi: round1(mean(pairs.map(p => p.outThi))),
        tolerance_c: TOLERANCE_C
    }
    if (aft.length < MIN_AFTERNOON_HOURS) {
        return {
            ...base,
            status: 'insufficient',
            status_th: 'ข้อมูลยังไม่พอเปรียบเทียบ',
            note_th: `ต้องมีข้อมูลช่วงบ่ายในโรงเรือนตรงกับข้อมูลภายนอกอย่างน้อย ${MIN_AFTERNOON_HOURS} ชม. (ตอนนี้ ${aft.length} ชม.)`
        }
    }
    const d = base.afternoon_delta_temp
    if (d >= TOLERANCE_C) {
        return {
            ...base,
            status: 'hotter_inside',
            status_th: 'ช่วงบ่ายในโรงเรือนร้อนกว่าภายนอกชัดเจน',
            note_th: `ช่วงบ่ายในโรงเรือนร้อนกว่าภายนอกเฉลี่ย +${d}°C (${aft.length} ชม.) เกินช่วงที่แบบจำลองอาจคลาด (±${TOLERANCE_C}°C) อาจเกิดจากความร้อนใต้หลังคาหรือลมผ่านน้อย ควรตรวจการระบายอากาศช่วงบ่าย`
        }
    }
    if (d <= -TOLERANCE_C) {
        return {
            ...base,
            status: 'cooler_inside',
            status_th: 'ช่วงบ่ายในโรงเรือนเย็นกว่าภายนอก',
            note_th: `ช่วงบ่ายในโรงเรือนเย็นกว่าภายนอกเฉลี่ย ${d}°C (${aft.length} ชม.) อาจเป็นผลจากร่มเงาของหลังคา หรือเซ็นเซอร์อยู่จุดที่เย็นกว่าบริเวณที่วัวอยู่`
        }
    }
    return {
        ...base,
        status: 'similar',
        status_th: 'ใกล้เคียงภายนอก',
        note_th: `ช่วงบ่ายต่างกันเฉลี่ย ${d > 0 ? '+' : ''}${d}°C ไม่เกิน ±${TOLERANCE_C}°C ซึ่งอยู่ในช่วงที่แบบจำลองอาจคลาด ยังสรุปไม่ได้ว่าโรงเรือนร้อนหรือเย็นกว่าภายนอก`
    }
}

/**
 * ค่าปัจจุบัน: เทียบเฉพาะเมื่อเซ็นเซอร์ในโรงเรือนส่งค่ามาไม่เกิน 30 นาที (ใช้ดูคร่าวๆ ไม่ใช้ตัดสิน)
 */
const compareNow = (latestBucket, current, nowMs) => {
    if (!current || current.temperature_2m == null) return { has: false, reason: 'ไม่มีค่าภายนอกตอนนี้' }
    if (!latestBucket) return { has: false, reason: 'ยังไม่มีค่าเซ็นเซอร์ในโรงเรือน' }
    const ageMin = Math.round((nowMs - latestBucket.t.getTime()) / 60000)
    if (ageMin > INDOOR_FRESH_MIN) return { has: false, reason: `เซ็นเซอร์ในโรงเรือนไม่ได้ส่งค่ามา ${ageMin} นาที`, indoor_age_min: ageMin }
    const outThi = calcThi(current.temperature_2m, current.relative_humidity_2m)
    return {
        has: true,
        indoor_age_min: ageMin,
        delta_temp: round1(latestBucket.temp - current.temperature_2m),
        delta_hum: round1(latestBucket.hum - current.relative_humidity_2m),
        delta_thi: outThi != null ? round1(latestBucket.thi - outThi) : null
    }
}

const summarizeOutdoor = (om, profile, nowKey) => {
    const c = om.current
    if (!c) return null
    const past24 = om.hourly.filter(h => h.key < nowKey).slice(-24)
    const today = om.hourly.filter(h => h.key.slice(0, 10) === nowKey.slice(0, 10))
    const thi = calcThi(c.temperature_2m, c.relative_humidity_2m)
    const mean24 = past24.length >= 20 ? round1(mean(past24.map(h => calcThi(h.temp, h.hum)))) : null
    const code = WMO_WEATHER_CODES[c.weather_code] || { desc: 'ไม่ทราบสภาพท้องฟ้า', icon: 'mdi-weather-cloudy' }
    return {
        temperature_c: round1(c.temperature_2m),
        humidity_pct: c.relative_humidity_2m != null ? Math.round(c.relative_humidity_2m) : null,
        thi,
        risk_level: getRiskLevel(thi, profile),
        risk_label_th: thi != null ? RISK_LABELS_TH[getRiskLevel(thi, profile)] : 'ไม่มีข้อมูล',
        // เกณฑ์ในงานวิจัยกำหนดจาก THI เฉลี่ยรายวันของสถานีภายนอก จึงแสดงค่าเฉลี่ย 24 ชม. ภายนอกให้เทียบด้วย
        mean_thi_24h: mean24,
        mean_level_24h: mean24 != null ? getRiskLevel(mean24, profile) : null,
        wind_speed_kmh: c.wind_speed_10m != null ? round1(c.wind_speed_10m) : null,
        weather_desc: code.desc,
        weather_icon: code.icon,
        min_temp: today.length ? round1(Math.min(...today.map(h => h.temp))) : null,
        max_temp: today.length ? round1(Math.max(...today.map(h => h.temp))) : null,
        min_hum: today.length ? Math.round(Math.min(...today.map(h => h.hum))) : null,
        max_hum: today.length ? Math.round(Math.max(...today.map(h => h.hum))) : null,
        observed_at: c.time
    }
}

/**
 * Entry point: อากาศภายนอก + การเทียบกับในโรงเรือนของฟาร์ม
 */
const getFarmOutdoorComparison = async (farm, { refresh = false, now = new Date() } = {}) => {
    const profile = getFarmProfile(farm)
    const location = resolveLocation(farm)
    if (!location) {
        return { location: { status: 'missing', note_th: locationProblem(farm) }, weather: null, comparison: null, source: SOURCE, api_status: 'not_requested' }
    }
    const [om, buckets] = await Promise.all([
        fetchOpenMeteo(location.latitude, location.longitude, { refresh }),
        loadBuckets(farm.id_farms, new Date(now.getTime() - PAST_HOURS * 3600e3), now)
    ])
    const nowKey = hourKey(now)
    return {
        location: { status: 'ok', ...location },
        weather: summarizeOutdoor(om, profile, nowKey),
        comparison: om.current ? {
            now: compareNow(buckets[buckets.length - 1], om.current, now.getTime()),
            period: comparePeriod(indoorHourly(buckets), om.hourly, nowKey)
        } : null,
        source: SOURCE,
        api_status: om.api_status,
        api_host: om.api_host || null,
        // เหตุผลที่ดึงไม่สำเร็จ (offline/stale) หรือเหตุผลที่ต้องใช้โฮสต์สำรอง แสดงในหน้ารายละเอียดฟาร์ม
        api_error_th: om.error_th || null,
        fallback_reason_th: om.fallback_reason_th || null,
        from_cache: Boolean(om.from_cache),
        fetched_at: om.fetched_at || null
    }
}

module.exports = {
    resolveLocation,
    fetchOpenMeteo,
    describeFetchError,
    OPEN_METEO_HOSTS,
    HOST_COOLDOWN,
    indoorHourly,
    comparePeriod,
    compareNow,
    getFarmOutdoorComparison,
    TOLERANCE_C,
    DISTRICT_COORDS,
    PROVINCE_COORDS,
    WMO_WEATHER_CODES
}
