import json
import threading
from datetime import datetime, timezone
import cv2
import numpy as np
import subprocess
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from ultralytics import YOLO
from app.services.behavior_engine import CowStateTracker

router = APIRouter()

# Resolve Model Weights
backend_dir = Path(__file__).resolve().parents[2]
model_path = backend_dir / "app" / "weights" / "best1.pt"
if not model_path.is_file():
    model_path = backend_dir / "app" / "weights" / "yolo26m.pt"

if not model_path.is_file():
    raise FileNotFoundError(
        "No camera model found. Add best1.pt or yolo26m.pt to app/weights."
    )

model = YOLO(str(model_path))
print(f"Loading {model_path} Success!")

# Color palette for behaviors (BGR)
BEHAVIOR_COLORS = {
    "drinking": (235, 175, 40),    # Cyan / Sky
    "feeding": (50, 205, 50),      # Emerald Green
    "lying down": (220, 120, 30),  # Ocean Blue
    "standing": (30, 130, 245),    # Vibrant Orange
}
DEFAULT_COLOR = (0, 255, 255)

# Active Learning Configuration (Rate limit: max 50 frames/day/camera)
active_learning_dir = backend_dir / "app" / "active_learning_samples"
active_learning_dir.mkdir(parents=True, exist_ok=True)
active_learning_daily_counts: Dict[str, int] = {}
ACTIVE_LEARNING_MAX_PER_DAY = 50

def save_active_learning_sample(frame_copy: np.ndarray, metadata: Dict[str, Any], camera_key: str):
    """Saves low-confidence edge frames (0.20 <= conf < 0.40) for active learning re-training."""
    try:
        today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        count_key = f"{camera_key}_{today_str}"
        current_count = active_learning_daily_counts.get(count_key, 0)
        if current_count >= ACTIVE_LEARNING_MAX_PER_DAY:
            return
        active_learning_daily_counts[count_key] = current_count + 1

        ts = int(time.time() * 1000)
        clean_key = camera_key.replace(":", "_").replace("/", "_").replace(".", "_")
        base_name = f"al_{clean_key}_{ts}"
        img_path = active_learning_dir / f"{base_name}.jpg"
        meta_path = active_learning_dir / f"{base_name}.json"

        cv2.imwrite(str(img_path), frame_copy)
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        print(f"[ActiveLearning] 📸 Saved low-confidence sample: {base_name}.jpg ({current_count + 1}/{ACTIVE_LEARNING_MAX_PER_DAY} today)")
    except Exception as e:
        print(f"[ActiveLearning] ⚠️ Error saving edge sample: {e}")

# Singleton tracker instances keyed by farm_id / camera_id
trackers = {}

def get_or_create_tracker(farm_id: Optional[str] = None, camera_id: Optional[str] = None) -> CowStateTracker:
    key = f"{farm_id or 'default'}_{camera_id or 'cam'}"
    if key not in trackers:
        trackers[key] = CowStateTracker(farm_id=farm_id, camera_id=camera_id)
    return trackers[key]


def get_connected_cameras():
    """Detect all attached camera devices and map them accurately to OpenCV's AVFoundation index order.
    On macOS, when an external USB webcam (e.g. Logitech C615) is connected, OpenCV assigns Index 0
    to the external USB camera and Index 1 to the built-in FaceTime HD camera.
    """
    raw_devices = []
    bin_path = backend_dir / "app" / "bin" / "list_cams"
    if bin_path.is_file():
        try:
            res = subprocess.run([str(bin_path)], capture_output=True, text=True, timeout=3)
            if res.returncode == 0 and res.stdout.strip():
                for line in res.stdout.strip().splitlines():
                    parts = line.split("|")
                    if len(parts) >= 2:
                        name = parts[1].strip()
                        model_id = parts[3].strip() if len(parts) > 3 else ""
                        lower_name = name.lower()
                        lower_model = model_id.lower()
                        is_usb = (
                            "c615" in lower_name 
                            or "uvc" in lower_model 
                            or "webcam" in lower_name 
                            or "logitech" in lower_name 
                            or "external" in lower_model
                        )
                        raw_devices.append({
                            "name": name,
                            "is_usb": is_usb
                        })
        except Exception as e:
            print(f"[Camera API] list_cams discovery error: {e}")

    # Fallback probe if list_cams found no devices
    if not raw_devices:
        for idx in range(3):
            cap = cv2.VideoCapture(idx, cv2.CAP_AVFOUNDATION)
            if cap.isOpened():
                raw_devices.append({
                    "name": "HD Webcam C615" if idx == 0 else "FaceTime HD",
                    "is_usb": (idx == 0)
                })
                cap.release()

    # Place USB cameras first (Index 0 in OpenCV), followed by built-in FaceTime cameras (Index 1)
    usb_devices = [d for d in raw_devices if d["is_usb"]]
    builtin_devices = [d for d in raw_devices if not d["is_usb"]]
    ordered_devices = usb_devices + builtin_devices

    cameras = []
    for idx, d in enumerate(ordered_devices):
        name = d["name"]
        is_usb = d["is_usb"]
        label = f"กล้อง {idx}: {name}"
        if is_usb:
            label += " (USB Webcam)"
        else:
            label += " (MacBook FaceTime HD)"

        cameras.append({
            "index": idx,
            "name": name,
            "is_usb": is_usb,
            "label": label
        })

    # Add Simulation Sandbox virtual option
    cameras.append({
        "index": "simulation",
        "name": "Barn Vision Simulator (Looping MP4)",
        "is_usb": False,
        "is_simulation": True,
        "label": "จำลอง: โรงเรือนจำลอง (Simulation MP4 Loop)"
    })

    return cameras


# ฟังก์ชัน generate สตรีมภาพรองรับ 3 แหล่ง (USB, RTSP Hikvision, Simulation MP4)
def generate_frames(
    source: str = "0",
    farm_id: Optional[str] = None,
    camera_id: Optional[str] = None,
    current_thi: Optional[float] = None,
    flip: bool = False
):
    tracker = get_or_create_tracker(farm_id=farm_id, camera_id=camera_id)
    str_source = str(source).strip()
    is_simulation = False
    is_rtsp = False

    # 1. เช็กประเภทแหล่งสัญญาณวิดีโอ
    sample_mp4 = backend_dir / "app" / "weights" / "sample_barn.mp4"

    if str_source in ["simulation", "mock", "sandbox"] or str_source.endswith(".mp4"):
        is_simulation = True
        video_file = str(sample_mp4) if not Path(str_source).is_file() else str_source
        cap = cv2.VideoCapture(video_file)
        print(f"[Camera API] 🎬 Opened Simulation Video: {video_file}")
    elif str_source.startswith("rtsp://") or str_source.startswith("rtsps://"):
        is_rtsp = True
        cap = cv2.VideoCapture(str_source, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Low-latency RTSP
        print(f"[Camera API] 📡 Connecting Hikvision RTSP Stream: {str_source[:30]}...")
    else:
        # USB / Local Webcam index
        try:
            cam_idx = int(str_source)
        except ValueError:
            cam_idx = 0
        cap = cv2.VideoCapture(cam_idx, cv2.CAP_AVFOUNDATION)
        if not cap.isOpened():
            cap = cv2.VideoCapture(cam_idx)
        print(f"[Camera API] 🎥 Camera index {cam_idx} opened via AVFoundation.")

    if not cap.isOpened():
        print(f"[Camera API] ❌ Video source '{str_source}' cannot be opened!")
        err_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(err_frame, f"Source Not Available: {str_source[:35]}", (40, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        cv2.putText(err_frame, "Please check RTSP URL, USB connection or select Simulation.", (30, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        ret, buffer = cv2.imencode(".jpg", err_frame)
        if ret:
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")
        return

    frame_count = 0

    try:
        while cap.isOpened():
            success, frame = cap.read()

            # หากเป็นวิดีโอจำลอง เมื่อเล่นถึงเฟรมสุดท้าย ให้วนลูปกลับไปเฟรม 0
            if not success and is_simulation:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                success, frame = cap.read()

            if not success:
                if is_rtsp:
                    # RTSP auto-reconnect delay
                    time.sleep(0.5)
                    continue
                break

            frame_count += 1
            # Frame-skipping for high-fps RTSP feeds (process every 2nd frame to target 8-10 FPS)
            if is_rtsp and (frame_count % 2 != 0):
                continue

            # Downscale high-resolution frames to 640 width to cut CPU/GPU usage by >70%
            h, w = frame.shape[:2]
            if w > 640:
                scale = 640.0 / w
                frame = cv2.resize(frame, (640, int(h * scale)), interpolation=cv2.INTER_LINEAR)

            # Flip if requested
            if flip:
                frame = cv2.flip(frame, 1)

            # 2. ให้ YOLO + ByteTrack ประมวลผลและตรวจจับ Track ID
            result = model.track(
                source=frame,
                conf=0.20,
                persist=True,
                tracker="bytetrack.yaml",
                show=False,
                verbose=False,
            )[0]

            annotated_frame = frame.copy()
            boxes = result.boxes
            counts = {"standing": 0, "lying down": 0, "feeding": 0, "drinking": 0}
            current_detections = []

            if boxes is not None and len(boxes) > 0:
                clss = boxes.cls.int().cpu().tolist()
                confs = boxes.conf.cpu().tolist()
                xyxy = boxes.xyxy.int().cpu().tolist()
                track_ids = boxes.id.int().cpu().tolist() if boxes.id is not None else [None] * len(boxes)

                for tid, c, cf, (x1, y1, x2, y2) in zip(track_ids, clss, confs, xyxy):
                    cname = model.names.get(c, str(c))
                    counts[cname] = counts.get(cname, 0) + 1
                    color = BEHAVIOR_COLORS.get(cname, DEFAULT_COLOR)

                    current_detections.append({
                        "track_id": tid,
                        "posture": cname,
                        "conf": round(cf, 3),
                        "bbox": [x1, y1, x2, y2]
                    })

                    # Bounding Box + Corners
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    corner_len = min(18, max(6, (x2 - x1) // 5), max(6, (y2 - y1) // 5))
                    thick = 3
                    cv2.line(annotated_frame, (x1, y1), (x1 + corner_len, y1), color, thick)
                    cv2.line(annotated_frame, (x1, y1), (x1, y1 + corner_len), color, thick)
                    cv2.line(annotated_frame, (x2, y1), (x2 - corner_len, y1), color, thick)
                    cv2.line(annotated_frame, (x2, y1), (x2, y1 + corner_len), color, thick)
                    cv2.line(annotated_frame, (x1, y2), (x1 + corner_len, y2), color, thick)
                    cv2.line(annotated_frame, (x1, y2), (x1, y2 - corner_len), color, thick)
                    cv2.line(annotated_frame, (x2, y2), (x2 - corner_len, y2), color, thick)
                    cv2.line(annotated_frame, (x2, y2), (x2, y2 - corner_len), color, thick)

                    # Track ID Pill Label
                    label_text = f"COW #{tid} | {cname} {int(cf * 100)}%" if tid is not None else f"{cname} {int(cf * 100)}%"
                    (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    bg_y1 = max(0, y1 - th - 8)
                    bg_y2 = y1
                    bg_x2 = min(annotated_frame.shape[1], x1 + tw + 10)
                    cv2.rectangle(annotated_frame, (x1, bg_y1), (bg_x2, bg_y2), color, -1)
                    cv2.putText(
                        annotated_frame,
                        label_text,
                        (x1 + 5, bg_y2 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.45,
                        (0, 0, 0),
                        1,
                        cv2.LINE_AA
                    )

            # 3. ส่งข้อมูลให้ 3-Tier Behavior Engine (Layer 1 state, Layer 2 rollups, Layer 3 anomalies)
            tracker.update_tracks(
                current_detections,
                current_thi=current_thi,
                is_simulation=is_simulation,
                frame_shape=frame.shape[:2]
            )

            # 4. Active Learning Edge Collector: Save low-confidence frames (0.20 <= conf < 0.40)
            if boxes is not None and len(confs) > 0:
                avg_conf = float(np.mean(confs))
                if 0.20 <= avg_conf < 0.40:
                    now_t = time.time()
                    cam_k = camera_id or ("simulation" if is_simulation else str_source.replace("/", "_"))
                    last_save = getattr(tracker, "_last_al_save_time", 0.0)
                    if (now_t - last_save) >= 10.0:  # Sample at most once every 10 seconds per camera
                        tracker._last_al_save_time = now_t
                        al_meta = {
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "camera_id": camera_id or str_source,
                            "farm_id": farm_id,
                            "thi": current_thi,
                            "avg_conf": round(avg_conf, 3),
                            "num_cows": len(current_detections),
                            "detections": current_detections,
                        }
                        threading.Thread(
                            target=save_active_learning_sample,
                            args=(frame.copy(), al_meta, cam_k),
                            daemon=True
                        ).start()

            # Top HUD Summary Bar
            total_detected = len(boxes) if boxes is not None else 0
            mode_tag = "[SIMULATION]" if is_simulation else ("[RTSP HIKVISION]" if is_rtsp else "[USB]")
            hud_text = f"{mode_tag} COWS: {total_detected} | Stand: {counts['standing']} | Lie: {counts['lying down']} | Feed: {counts['feeding']} | Drink: {counts['drinking']}"
            h_h = 30
            cv2.rectangle(annotated_frame, (8, 8), (annotated_frame.shape[1] - 8, 8 + h_h), (20, 30, 25), -1)
            cv2.rectangle(annotated_frame, (8, 8), (annotated_frame.shape[1] - 8, 8 + h_h), (60, 90, 75), 1)
            cv2.putText(
                annotated_frame,
                hud_text,
                (16, 8 + 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.44,
                (240, 250, 245),
                1,
                cv2.LINE_AA
            )

            # Encode JPEG
            ret, buffer = cv2.imencode(".jpg", annotated_frame)
            if not ret:
                continue
            frame_bytes = buffer.tobytes()

            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
    finally:
        cap.release()
        print(f"[Camera API] 🛑 Camera stream source '{str_source}' closed.")


# ตรวจสอบรายการกล้องทั้งหมดที่เชื่อมต่ออยู่
@router.get("/devices")
def get_camera_devices():
    devices = get_connected_cameras()
    usb_cam = next((d for d in devices if d.get("is_usb")), None)
    rec_idx = usb_cam["index"] if usb_cam else (devices[0]["index"] if devices else 0)
    return {
        "status": "online",
        "devices": devices,
        "recommended_index": rec_idx
    }


# ตรวจสอบสถานะกล้องและโมเดล AI
@router.get("/status")
def get_camera_status():
    devices = get_connected_cameras()
    usb_cam = next((d for d in devices if d.get("is_usb")), None)
    rec_idx = usb_cam["index"] if usb_cam else (devices[0]["index"] if devices else 0)

    return {
        "status": "online",
        "model_file": model_path.name,
        "classes": model.names,
        "devices": devices,
        "available_camera_indices": [d["index"] for d in devices],
        "recommended_for_usb": rec_idx
    }


# Endpoint สตรีมภาพแบบเรียลไทม์ (รองรับ source=0, source=rtsp://..., source=simulation)
@router.get("/stream")
async def video_feed(
    source: str = Query("0", description="Camera index (0, 1), RTSP URL, or 'simulation'"),
    cam_id: Optional[str] = Query(None, description="Alias for source"),
    farm_id: Optional[str] = Query(None, description="Farm UUID for telemetry binding"),
    camera_id: Optional[str] = Query(None, description="Camera UUID"),
    thi: Optional[float] = Query(None, description="Current ambient THI"),
    flip: bool = Query(False, description="Mirror image horizontally")
):
    selected_source = cam_id if cam_id is not None else source
    return StreamingResponse(
        generate_frames(
            source=selected_source,
            farm_id=farm_id,
            camera_id=camera_id,
            current_thi=thi,
            flip=flip
        ), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
