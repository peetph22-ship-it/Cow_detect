from ultralytics import YOLO
from PIL import Image
import io
import os
from pathlib import Path
from typing import List, Dict, Any


def resolve_model_path(model_path: str | None = None) -> str:
    """Return the first locally available YOLO weights file.

    Trained weights are expected under `app/weights`. Resolve paths from this
    file so the API does not depend on the process cwd.
    """
    backend_dir = Path(__file__).resolve().parents[2]
    configured_path = model_path or os.getenv("YOLO_MODEL_PATH")
    candidates = [
        Path(configured_path) if configured_path else None,
        backend_dir / "app" / "weights" / "best1.pt",
        backend_dir / "app" / "weights" / "yolo26m.pt",
    ]

    for candidate in candidates:
        if candidate and candidate.is_file():
            return str(candidate)

    checked_paths = ", ".join(str(path) for path in candidates if path)
    raise FileNotFoundError(
        "No YOLO weights file was found. Set YOLO_MODEL_PATH or add a model at: "
        f"{checked_paths}"
    )

class YoloService:
    def __init__(self, model_path: str | None = None):
        model_path = resolve_model_path(model_path)
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
