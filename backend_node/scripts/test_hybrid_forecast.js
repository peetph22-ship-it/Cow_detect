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
assert.strictEqual(r.engine, 'openmeteo_ecmwf_ifs025_farm_bias')
assert.ok(/0\.69\/0\.78\/0\.88/.test(r.evaluation_note), 'farm >= 9 days -> 14-day numbers')

// 2) only 2 farm days -> regional bias, adjusted false, still a forecast
r = fs.buildHybridForecast({ farm, om, farmDays: farmDays14.slice(-2), now })
assert.ok(r && !r.adjusted && r.engine === 'openmeteo_ecmwf_ifs025_regional_bias')
assert.ok(/0\.77\/0\.83\/0\.90/.test(r.evaluation_note), 'regional numbers')
assert.strictEqual(r.bias_by_horizon[1].source, 'regional'); assert.ok(/ยังไม่ได้ปรับตามโรงเรือน/.test(r.method_th))
// days with < 20 h data are ignored; today never used
r = fs.buildHybridForecast({ farm, om, farmDays: farmDays14.map((d, i) => ({ ...d, data_hours: i < 11 ? 10 : 24 })).concat([{ date: '2026-10-24', avg_thi: 99, data_hours: 13, is_today: true }]), now })
assert.strictEqual(r.bias_days_used, 3); assert.ok(r.adjusted)
assert.ok(/0\.80\/0\.92\/1\.07/.test(r.evaluation_note), '3-8 days -> 3-day numbers')
// non-north farm without data: no regional bias (only measured for Chiang Mai / ECMWF)
r = fs.buildHybridForecast({ farm: { ...farm, province: 'สระบุรี' }, om, farmDays: [], now })
assert.strictEqual(r.bias_by_horizon[1].source, 'none'); assert.ok(/ยังไม่มีผลวัด/.test(r.evaluation_note))
// best_match never gets the ECMWF regional bias
r = fs.buildHybridForecast({ farm, om, farmDays: [], now, model: 'best_match' })
assert.strictEqual(r.bias_by_horizon[1].value, 0); assert.ok(/best_match/.test(r.method_th))
// one broken day (sensor in the sun, +12 THI) barely moves the median bias
const broken = farmDays14.map((d, i) => i === 13 ? { ...d, avg_thi: d.avg_thi + 12 } : d)
const rb = fs.buildHybridForecast({ farm, om, farmDays: broken, now })
const rg = fs.buildHybridForecast({ farm, om, farmDays: farmDays14, now })
assert.ok(Math.abs(rb.forecasts[0].predicted_thi - rg.forecasts[0].predicted_thi) <= 0.3, 'median resists one outlier')
// extreme bias is clamped and flagged
const crazy = farmDays14.map(d => ({ ...d, avg_thi: d.avg_thi + 20 }))
const rc = fs.buildHybridForecast({ farm, om, farmDays: crazy, now })
assert.ok(rc.bias_clamped && Math.abs(rc.bias_by_horizon[1].value) === 6 && /ตรวจเซ็นเซอร์/.test(rc.method_th))
// barn windows override forecast windows
const bw = { peak: { start_hour: 16, end_hour: 20, label: '16:00–20:00 น.', mean_thi: 80 }, cool: null }
assert.strictEqual(fs.buildHybridForecast({ farm, om, farmDays: farmDays14, now, barnWindows: bw }).peak_window.label, '16:00–20:00 น.')

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
  assert.strictEqual(r.engine, 'openmeteo_ecmwf_ifs025_regional_bias'); assert.strictEqual(r.location.source, 'farm_coordinates')
  // ECMWF down -> best_match used; failures remembered (no second call within 5 min)
  let calls = []
  axiosImpl = async (url) => { calls.push(url); if (/models=ecmwf_ifs025/.test(url)) throw new Error('HTTP 503'); return { data: om } }
  Date.now = () => now.getTime()
  const farm4 = { ...farm, id_farms: 'f4', latitude: 18.5, longitude: 98.9 }
  r = await fs.generateBaselineForecast(farm4, now)
  assert.ok(r.engine.startsWith('openmeteo_best_match'), r.engine)
  const n1 = calls.length
  await fs.generateBaselineForecast(farm4, now)
  assert.strictEqual(calls.length, n1, 'cached (success and failure)')
  Date.now = realNow
  // farmDailyFromHourly-equivalent path: barn hours missing 12-16 -> day not used for bias
  const rowsFor = (d, skip) => Array.from({ length: 24 }, (_, h) => h).filter(h => !skip.includes(h)).map(h => ({ hour_bucket: new Date(`${d}T${String(h).padStart(2, '0')}:00:00`), avg_thi: 80, avg_hum: 70 }))
  dbRows = [].concat(...days('2026-10-19', 5).map(d => rowsFor(d, d === '2026-10-23' ? [12, 13, 14, 15] : [])))
  calls = []; axiosImpl = async () => ({ data: om })
  Date.now = () => now.getTime()
  r = await fs.generateBaselineForecast({ ...farm, id_farms: 'f5', latitude: 18.6, longitude: 98.8 }, now)
  Date.now = realNow
  assert.strictEqual(r.bias_days_used, 4, 'day missing afternoon hours is skipped'); assert.strictEqual(r.windows_source, 'barn_last_72h')
  dbRows = []
  // 7) old endTime (backfill) -> baseline
  r = await fs.generateBaselineForecast(farm, new Date(Date.now() - 3 * 86400e3))
  assert.ok(/baseline/.test(r.engine))
  // 8) isCurrentForecast rejects old version
  assert.strictEqual(fs.isCurrentForecast({ version: 'baseline-72h-mean-v2' }), false)
  console.log('hybrid_forecast_test: all passed')
})().catch(e => { console.error(e); process.exit(1) })
