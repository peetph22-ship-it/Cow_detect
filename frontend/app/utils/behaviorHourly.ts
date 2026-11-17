/**
 * นาทีของแต่ละท่าในแต่ละชั่วโมง (0–23) จากช่วงพฤติกรรม ใช้วาดกราฟแท่งซ้อนรายชั่วโมงของวัว 1 ตัว
 * ช่วงที่ไม่มีข้อมูลจะไม่ถูกนับ แท่งของชั่วโมงนั้นจึงสั้นกว่า 60 นาที (ไม่เดาค่า)
 */
export interface Bout { key: string; startMs: number; endMs: number }

export const hourlyMinutes = (bouts: Bout[], dayStartMs: number, keys: string[]): Record<string, number[]> => {
  const out: Record<string, number[]> = Object.fromEntries(keys.map(k => [k, Array(24).fill(0)]))
  for (const b of bouts) {
    if (!out[b.key]) continue
    for (let h = 0; h < 24; h++) {
      const s = Math.max(b.startMs, dayStartMs + h * 3600e3)
      const e = Math.min(b.endMs, dayStartMs + (h + 1) * 3600e3)
      if (e > s) out[b.key][h] += (e - s) / 60e3
    }
  }
  for (const k of keys) out[k] = out[k].map(v => Math.round(v * 10) / 10)
  return out
}

// ตั้งค่า ApexCharts กราฟแท่งซ้อน 24 ชม. (แกนตั้ง 0–60 นาที)
export const hourlyBarOptions = (colors: string[], labelWidth = 44) => ({
  chart: { fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false }, stacked: true },
  colors,
  plotOptions: { bar: { columnWidth: '78%' } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`),
    labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '10px', colors: '#718078' } }
  },
  yaxis: { min: 0, max: 60, tickAmount: 4, title: { text: 'นาที', style: { fontSize: '11px', color: '#718078', fontWeight: 700 } }, labels: { minWidth: labelWidth, maxWidth: labelWidth, formatter: (v: number) => String(Math.round(v)), style: { colors: '#718078' } } },
  legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' },
  tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => `${Math.round(v)} นาที` } },
  grid: { borderColor: '#f0f4f2', strokeDashArray: 4 }
})
