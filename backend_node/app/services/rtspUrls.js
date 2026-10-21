/**
 * ที่อยู่ RTSP ตามยี่ห้อกล้อง (เดิมใช้รูปแบบ Hikvision กับทุกยี่ห้อ ทำให้กล้อง Dahua เปิดสตรีมไม่ได้)
 */
const STREAM_PATHS = {
    hikvision: (ch) => [`/Streaming/Channels/${ch}01`, `/Streaming/Channels/${ch}02`],
    dahua: (ch) => [`/cam/realmonitor?channel=${ch}&subtype=0`, `/cam/realmonitor?channel=${ch}&subtype=1`],
    // กล้อง Wi-Fi ราคาประหยัดที่ใช้แอป Yoosee (รวม FNKvision บางรุ่น) ข้อมูลจากชุมชนผู้ใช้ ต้องทดสอบกับกล้องจริง
    yoosee: () => ['/onvif1', '/onvif2']
}

const brandKey = (brand) => {
    const b = String(brand || '').toLowerCase()
    if (b.includes('dahua') || b.includes('imou')) return 'dahua'
    if (b.includes('yoosee') || b.includes('fnk')) return 'yoosee'
    return 'hikvision'
}

const buildRtspUrls = ({ brand, username, password, ip, port = 554, channel = 1 }) => {
    const auth = `${encodeURIComponent(username || '')}:${encodeURIComponent(password || '')}@`
    const [main, sub] = STREAM_PATHS[brandKey(brand)](Number(channel) || 1)
    const base = `rtsp://${auth}${ip}:${Number(port) || 554}`
    return { mainStreamUrl: base + main, subStreamUrl: base + sub }
}

module.exports = { buildRtspUrls, brandKey }
