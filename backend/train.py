import os
import shutil
from pathlib import Path

from ultralytics import YOLO


BACKEND_DIR = Path(__file__).resolve().parent
WEIGHTS_DIR = BACKEND_DIR / "app" / "weights"
DATASET_CONFIG = BACKEND_DIR / "cow-behavior-analysiws--2" / "data.yaml"
BASE_MODEL = WEIGHTS_DIR / "yolo26m.pt"
OUTPUT_NAME = "cow_behavior_yolo26m"


def train():
    """Fine-tune YOLO26m with the Roboflow cow-behaviour dataset."""
    if not BASE_MODEL.is_file():
        raise FileNotFoundError(f"Base model not found: {BASE_MODEL}")
    if not DATASET_CONFIG.is_file():
        raise FileNotFoundError(f"Roboflow data.yaml not found: {DATASET_CONFIG}")

    model = YOLO(str(BASE_MODEL))
    model.train(
        data=str(DATASET_CONFIG),
        epochs=30,
        imgsz=640,
        batch=16,
        device=os.getenv("YOLO_DEVICE", "mps"),
        project=str(WEIGHTS_DIR),
        name=OUTPUT_NAME,
        exist_ok=True,
    )

    trained_model = Path(model.trainer.best)
    if not trained_model.is_file():
        raise FileNotFoundError(f"Training completed but best weights are missing: {trained_model}")

    production_model = WEIGHTS_DIR / "best1.pt"
    shutil.copy2(trained_model, production_model)
    print(f"Saved best trained model to {production_model}")


if __name__ == "__main__":
    train()
