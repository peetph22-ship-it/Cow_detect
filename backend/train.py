from ultralytics import YOLO

def train():
    # 1. โหลด Pre-trained weights เริ่มต้น (แนะนำรุ่น Nano เพื่อความรวดเร็ว)
    model = YOLO("yolov8n.pt") 

    # 2. เริ่มกระบวนการ Train
    model.train(
        data="cow-behavior-analysiws--2/data.yaml",
        epochs=30,          # แนะนำเริ่มต้น 30 รอบ
        imgsz=640,
        batch=16,
        device="mps",       # ใช้ "mps" สำหรับ Mac ชิป M-Series (Apple Silicon) หรือใช้ "cpu"
        project="backend/app/weights",
        name="cow_custom_model",
        exist_ok=True
    )

if __name__ == "__main__":
    train()