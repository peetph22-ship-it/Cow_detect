#!/bin/sh
# ดึงข้อมูลที่ใช้ทดสอบพยากรณ์ THI ลงโฟลเดอร์ <data_dir> (อยู่นอก repo)
#   - สถานีอุตุฯ สนามบินเชียงใหม่ WMO 48327 รายชั่วโมงจาก Meteostat bulk (CC BY-NC 4.0)
#   - Open-Meteo Previous Runs ที่พิกัดสถานี: พยากรณ์ที่เคยออกล่วงหน้า 1/2/3 วัน (2024-01-01 ถึง 2025-12-07)
# ใช้: sh fetch_station_data.sh <data_dir>
set -e
D="$1"; [ -n "$D" ] || { echo "usage: sh fetch_station_data.sh <data_dir>"; exit 1; }
mkdir -p "$D/meteostat" "$D/openmeteo"
curl -sSf -o "$D/meteostat/48327.csv.gz" https://bulk.meteostat.net/v2/hourly/48327.csv.gz
V=temperature_2m,relative_humidity_2m
H="$V,temperature_2m_previous_day1,relative_humidity_2m_previous_day1,temperature_2m_previous_day2,relative_humidity_2m_previous_day2,temperature_2m_previous_day3,relative_humidity_2m_previous_day3"
for M in best_match ecmwf_ifs025 gfs_seamless; do
  curl -sSf --max-time 300 -o "$D/openmeteo/prev_cnx_$M.json" \
    "https://previous-runs-api.open-meteo.com/v1/forecast?latitude=18.7668&longitude=98.9626&hourly=$H&models=$M&start_date=2024-01-01&end_date=2025-12-07"
  sleep 5
done
echo "done: $D"
