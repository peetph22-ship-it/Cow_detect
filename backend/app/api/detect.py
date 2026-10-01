from fastapi import APIRouter,File,UploadFile,HTTPException
from app.services.yolo_service import yolo_service

router = APIRouter(prefix="/api/detect", tags=["YOLO Detecttion"])

@router.post("/image")
async def detect_image(file: UploadFile = File(...),   
    conf_threshold: float = 0.45  # รับค่าจาก URL ได้
) :
    # if not file.content_type.startswith("image/"):
    #     raise HTTPException(status_code=400 , detail="ไฟล์ที่อัปโหลดต้องเป็นรูปภาพเท่านั้น")

    # อ่านข้อมูลไฟล์แบบ bytes เท่านั้น
    image_bytes = await file.read()

    # ส่งให้ Yolo Service ประมวลผล
    results = yolo_service.predict(image_bytes=image_bytes,conf_threshold=conf_threshold)

    return {
        "filename": file.filename,
        **results,
        # "total_detected": len(results),
        # "detections": results
    }