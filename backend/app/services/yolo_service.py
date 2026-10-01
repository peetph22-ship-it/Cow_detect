from ultralytics import YOLO
from PIL import Image
import io
import os
from typing import List, Dict,Any

class YoloService:
    def __init__(self, model_path: str = "app/weights/best1.pt") :

        # check model & alert
        if not os.path.exists(model_path) :
            print(f"Model not found [{model_path}]")
            # Falback path:
            if os.path.exists("app/weights/yolo26m.pt") :
                model_path = "app/weights/yolo26m.pt"
                
        print(f"Loading YOLO Model from {model_path}...")
        self.model = YOLO(model_path)
        print(f"Loading Model Success! : {self.model.names}")

    def predict(self, image_bytes: bytes , conf_threshold: float=0.4) -> Dict[str,Any] :
        """"
        process images and Bounding Boxes
        """
        # change bytes to image
        image = Image.open(io.BytesIO(image_bytes))
        img_width , img_height = image.size
        # รับ model Inference
        result = self.model(source=image , conf=conf_threshold, verbose=False)


        # สกัดข้อมูล Bounding Box ออกมาเป็นรูปแบบ JSON
        detections: List[Dict[str,Any]] = []
        summary: Dict[str,int] = {}

        for r in result:
            for box in r.boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                confidence = float(box.conf[0])
                coords = [round(float(x),2) for x in box.xyxy[0]]
                detections.append({
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": round(confidence,3),
                    "box": coords
                })
                summary[class_name] = summary.get(class_name,0) + 1
        return {
            "image_size": {
                "width": img_width,
                "height": img_height
            },
            "total_detected": len(detections),
            "summary": summary,
            "detections": detections
        }

# สร้าง Instance ก้อนเดียวไว้ใช้ทั้งระบบ (Singleton)
yolo_service = YoloService()