const assert = require('assert')
// ทดสอบ services/forecastService.js แบบไม่ต้องมี DB/เน็ต: node backend_node/scripts/test_hybrid_forecast.js
const BN = require('path').resolve(__dirname, '..')
// mock DB (baseline fallback + dailySeries) and axios
let dbRows = []
const dbPath = require.resolve(BN + '/app/config/db')
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async () => ({ rows: dbRows }) } }
let axiosImpl = async () => { throw new Error('no network in test') }
const axPath = require.resolve(BN + '/node_modules/axios')
require.cache[axPath] = { id: axPath, filename: axPath, loaded: true, exports: { get: (...a) => axiosImpl(...a) } }
const fs = require(BN + '/app/services/forecastService.js')
const { calcThi } = require(BN + '/app/services/heatStress.js')

const now = new Date('2026-10-24T13:00:00+07:00')  // today (BKK) = 2026-10-24
const days = (from, n) => Array.from({ length: n }, (_, i) => new Date(Date.parse(from + 'T00:00:00Z') + i * 86400e3).toISOString().slice(0, 10))
// synthetic Open-Meteo: past 15 days + 4 days ahead, T = 28 + 5*sin, RH 70; previous_dayK = same but 1.5 C colder
const TRUTH = new Map()
const mkOm = () => {
  const time = [], T = [], R = [], P = { 1: [], 2: [], 3: [] }
  for (const d of days('2026-10-09', 19)) for (let h = 0; h < 24; h++) {
    time.push(`${d}T${String(h).padStart(2, '0')}:00`)
    const t = 28 + 5 * Math.sin((h - 9) / 24 * 2 * Math.PI) + (d.endsWith('6') ? 1 : 0)   // some day-to-day variation
    // the model runs 1.5 C cold for every lead: past runs AND the current run for days ahead
    const future = d >= '2026-10-25'
    T.push(future ? t - 1.5 : t); R.push(70); for (const k of [1, 2, 3]) P[k].push(t - 1.5)
    TRUTH.set(`${d}T${String(h).padStart(2, '0')}`, t)
  }
  const hourly = { time, temperature_2m: T, relative_humidity_2m: R }
  for (const k of [1, 2, 3]) { hourly[`temperature_2m_previous_day${k}`] = P[k]; hourly[`relative_humidity_2m_previous_day${k}`] = R }
  return { hourly }
}
const om = mkOm()
// daily mean THI of the "truth" (= current-run values) for past days
const truthDaily = (d) => { const v = [...TRUTH].filter(([k]) => k.startsWith(d)).map(([, t]) => calcThi(t, 70)); return v.reduce((a, b) => a + b, 0) / v.length }
const farm = { id_farms: 'f1', province: 'เชียงใหม่', district: 'สันทราย' }

// 1) full farm data (14 days): bias learned from farm, predictions = forecast - bias (farm runs +1 THI hotter than outdoor)
const farmDays14 = days('2026-10-10', 14).map(d => ({ date: d, avg_thi: truthDaily(d) + 1, data_hours: 24, has_data: true }))
let r = fs.buildHybridForecast({ farm, om, farmDays: farmDays14, now, location: { source: 'district_center', approximate: true, label: 'x' } })
assert.ok(r && r.adjusted, 'adjusted with 14 days')
assert.strictEqual(r.bias_days_used, 14)
assert.deepStrictEqual(r.forecasts.map(f => f.target_date), ['2026-10-25', '2026-10-26', '2026-10-27'])
for (const f of r.forecasts) {
  const expected = Math.round((truthDaily(f.target_date) + 1) * 10) / 10   // farm runs 1 THI hotter than truth
  assert.ok(Math.abs(f.predicted_thi - expected) <= 0.15, `h${f.horizon_days} ${f.predicted_thi} vs ${expected}`)
  for (const k of ['horizon_days', 'label', 'day_name', 'date', 'predicted_thi', 'risk_level', 'advisory', 'badge_class']) assert.ok(f[k] != null, k)
}
for (const k of ['model_name', 'version', 'engine', 'method_th', 'evaluation_note', 'thresholds', 'hf_profile', 'peak_predicted_thi']) assert.ok(r[k] != null, k)
assert.strictEqual(r.version, fs.FORECAST_VERSION); assert.strictEqual(r.insufficient_data, false)
assert.ok(r.peak_window && r.cool_window, 'windows from forecast hours')
assert.strictEqual(r.engine, 'openmeteo_ecmwf_farm_bias')

// 2) only 2 farm days -> regional bias, adjusted false, still a forecast
r = fs.buildHybridForecast({ farm, om, farmDays: farmDays14.slice(-2), now })
assert.ok(r && !r.adjusted && r.engine === 'openmeteo_ecmwf_regional_bias')
assert.strictEqual(r.bias_by_horizon[1].source, 'regional'); assert.ok(/ยังไม่ได้ปรับตามโรงเรือน/.test(r.method_th))
// days with < 20 h data are ignored; today never used
r = fs.buildHybridForecast({ farm, om, farmDays: farmDays14.map((d, i) => ({ ...d, data_hours: i < 11 ? 10 : 24 })).concat([{ date: '2026-10-24', avg_thi: 99, data_hours: 13, is_today: true }]), now })
assert.strictEqual(r.bias_days_used, 3); assert.ok(r.adjusted)

// 3) forecast hours missing for day+3 -> null (caller falls back)
const short = JSON.parse(JSON.stringify(om)); const cut = short.hourly.time.findIndex(t => t.startsWith('2026-10-27T12'))
for (const k of Object.keys(short.hourly)) short.hourly[k] = short.hourly[k].slice(0, cut)
assert.strictEqual(fs.buildHybridForecast({ farm, om: short, farmDays: farmDays14, now }), null)

;(async () => {
  // 4) no coordinates -> baseline fallback with reason
  dbRows = []
  r = await fs.generateBaselineForecast({ id_farms: 'f2', province: 'ไม่มีจริง', district: '' })
  assert.ok(/baseline/.test(r.engine) && /พิกัด/.test(r.fallback_reason), JSON.stringify(r).slice(0, 200))
  // 5) API down -> baseline fallback
  axiosImpl = async () => { throw new Error('timeout of 5000ms exceeded') }
  r = await fs.generateBaselineForecast(farm)
  assert.ok(/baseline/.test(r.engine) && /เชื่อมต่อพยากรณ์อากาศไม่ได้/.test(r.fallback_reason))
  // 6) API ok + DB (dailySeries) returns no rows -> hybrid with regional bias; URL uses previous-runs, ecmwf, timezone
  let calledUrl = null
  axiosImpl = async (url, opts) => { calledUrl = url; assert.strictEqual(opts.timeout, 5000); return { data: om } }
  const realNow = Date.now; Date.now = () => now.getTime()
  r = await fs.generateBaselineForecast({ ...farm, id_farms: 'f3', latitude: 18.8, longitude: 99.0 }, now)
  Date.now = realNow
  assert.ok(calledUrl.startsWith('https://previous-runs-api.open-meteo.com/v1/forecast') && /models=ecmwf_ifs025/.test(calledUrl) && /timezone=Asia%2FBangkok/.test(calledUrl) && /past_days=15/.test(calledUrl), calledUrl)
  assert.strictEqual(r.engine, 'openmeteo_ecmwf_regional_bias'); assert.strictEqual(r.location.source, 'farm_coordinates')
  // 7) old endTime (backfill) -> baseline
  r = await fs.generateBaselineForecast(farm, new Date(Date.now() - 3 * 86400e3))
  assert.ok(/baseline/.test(r.engine))
  // 8) isCurrentForecast rejects old version
  assert.strictEqual(fs.isCurrentForecast({ version: 'baseline-72h-mean-v2' }), false)
  console.log('hybrid_forecast_test: all passed')
})().catch(e => { console.error(e); process.exit(1) })
