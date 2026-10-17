# Cow Behavior Vision Training Archive

โฟลเดอร์นี้จัดเก็บชุดข้อมูล (Dataset) และสคริปต์สำหรับการเทรน/Fine-tuning โมเดลตรวจจับพฤติกรรมโคนม:

## 📁 เนื้อหาภายใน
1. `cow-behavior-analysiws--2/`: ชุดข้อมูลภาพและ Annotations จาก Roboflow สำหรับพฤติกรรมโคนม (ยืน, นอน, กินอาหาร, ดื่มน้ำ)
2. `train.py`: สคริปต์ Fine-tune โมเดล YOLO26m บน Apple Silicon (MPS) หรือ CUDA GPU โดยจะเซฟน้ำหนักผลลัพธ์ที่ดีที่สุดไปที่ `backend/app/weights/best1.pt`

## 🚀 วิธีการรันเทรน
```bash
cd backend
source venv/bin/activate
python training_archive/train.py
```
