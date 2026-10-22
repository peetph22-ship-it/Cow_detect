-- CowCare AI - เอา user/รหัสออกจาก URL สตรีมกล้องที่บันทึกไว้ก่อนหน้า (2026-10-23)
-- ตั้งแต่เวอร์ชันนี้ server เก็บ URL แบบไม่มีรหัส และเข้ารหัส password_encrypted ด้วย CAMERA_SECRET_KEY
-- รันซ้ำได้ปลอดภัย (แถวที่ไม่มีรหัสใน URL จะไม่เปลี่ยน)
-- หลังรัน: กล้องที่ลงทะเบียนไว้ก่อนหน้า ให้แก้ไขฟาร์มแล้วกรอกรหัสกล้องใหม่ 1 ครั้ง เพื่อเก็บแบบเข้ารหัส

UPDATE cctv_cameras
SET main_stream_url = regexp_replace(main_stream_url, '^(rtsp://)[^/@]*@', '\1'),
    sub_stream_url  = regexp_replace(sub_stream_url,  '^(rtsp://)[^/@]*@', '\1'),
    updated_at = NOW()
WHERE main_stream_url ~ '^rtsp://[^/@]*@' OR sub_stream_url ~ '^rtsp://[^/@]*@';
