import cv2
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from ultralytics import YOLO

router = APIRouter()

# Model path :
MODEL_PATH = "app/weights/best1.pt"

# เช็คว่ามีไฟล์โมเดล YOLO จากโฟลเดอร์ weights หากไม่มีให้โหลดรุ่น nano มาเทสแทนเพื่อป้องกันเซิร์ฟเวอร์แครช
if os.path.exists(MODEL_PATH):
    model = YOLO(MODEL_PATH)
    print(f"Loading {MODEL_PATH} Success!")
else:
    model = YOLO("yolov8n.pt")
    print(f"yolo26m.pt file not found , loading yolov8n.pt")


# ฟังก์ชัน genetate อ่านภาพจากกล้องทีละเฟรม
def generate_frames():
    # 0 คือกล้อง Macbook
    cap = cv2.VideoCapture(0)

    while True:
        success, frame = cap.read()
        if not success:
            break

        # 1.พลิกภาพซ้ายขวา และเข้ารหัสภาพเป็น JPEG
        frame = cv2.flip(frame, 1)
        # 2.ให้ yolo ประมวลผลเฟรมภาพ (ตีกรอบวัตถุ)
        # conf = 0.5 คือให้แสดงเฉพาะวัตถุที่ AI มั่นใจ 50% ขึ้นไป
        result = model.track(
            source=frame,
            conf=0.15,
            persist=True, 
            show=False,
            verbose=False,
        )

        # 3.นำภาพต้นฉบับมาวาดกรอบ Bounding Box ทับลงไป
        annotated_frame = result[0].plot()

        # 4.เข้ารหัสภาพที่ตีกรอบแล้ว (annotated_frame) เป็น jpeg
        ret, buffer = cv2.imencode(".jpg", annotated_frame)
        frame_bytes = buffer.tobytes()

        # ส่งออกภาพไปแบบต่อเนื่อง (Stream)
        yield (
            b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )
    cap.release()


# สร้าง Endpoint เป็น GET เพื่อให้ Nuxt ดึงภาพไปแสดงได้ง่ายๆ
@router.get("/stream")
async def video_feed():
    return StreamingResponse(
        generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame"
    )
