import json
import re
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

# ซ่อน user:password ใน RTSP URL ก่อนพิมพ์ log / เขียนบนภาพ / บันทึกลงไฟล์ตัวอย่าง
_RTSP_CRED_RE = re.compile(r"(rtsps?://)[^@/\s]*@", re.IGNORECASE)


def mask_source(source: str) -> str:
    return _RTSP_CRED_RE.sub(r"\1***@", str(source))
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
        clean_key = re.sub(r"[^A-Za-z0-9_-]+", "_", camera_key).strip("_")  # ชื่อไฟล์ปลอดภัย ไม่มี ? & * :
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


STREAM_FRAME_INTERVAL_S = 0.1   # ส่งภาพให้เบราว์เซอร์ ~10 เฟรม/วินาที
STREAM_IDLE_TIMEOUT_S = 5.0     # ไม่มีผู้ชมดึงภาพเกิน 5 วินาที = ปิดเธรดอ่านกล้อง/YOLO


def analyze_frame(frame, tracker, farm_id, camera_id, current_thi, is_simulation, safe_source):
    """YOLO + ByteTrack หนึ่งเฟรม ส่งผลให้ Behavior Engine และเก็บภาพความมั่นใจต่ำ (ไม่วาดอะไรบนภาพ)"""
    result = model.track(
        source=frame,
        conf=0.20,
        persist=True,
        tracker="bytetrack.yaml",
        show=False,
        verbose=False,
    )[0]
    boxes = result.boxes
    counts = {"standing": 0, "lying down": 0, "feeding": 0, "drinking": 0}
    detections = []
    confs = []
    if boxes is not None and len(boxes) > 0:
        clss = boxes.cls.int().cpu().tolist()
        confs = boxes.conf.cpu().tolist()
        xyxy = boxes.xyxy.int().cpu().tolist()
        track_ids = boxes.id.int().cpu().tolist() if boxes.id is not None else [None] * len(boxes)
        for tid, c, cf, bbox in zip(track_ids, clss, confs, xyxy):
            cname = model.names.get(c, str(c))
            counts[cname] = counts.get(cname, 0) + 1
            detections.append({"track_id": tid, "posture": cname, "conf": round(cf, 3), "bbox": bbox})

    # ส่งข้อมูลให้ 3-Tier Behavior Engine (Layer 1 state, Layer 2 rollups, Layer 3 anomalies)
    tracker.update_tracks(
        detections,
        current_thi=current_thi,
        is_simulation=is_simulation,
        frame_shape=frame.shape[:2]
    )

    # Active Learning Edge Collector: เก็บเฟรมความมั่นใจต่ำ (0.20 <= conf < 0.40) ไม่เกินทุก 10 วินาที
    if confs:
        avg_conf = float(np.mean(confs))
        now_t = time.time()
        if 0.20 <= avg_conf < 0.40 and now_t - getattr(tracker, "_last_al_save_time", 0.0) >= 10.0:
            tracker._last_al_save_time = now_t
            cam_k = camera_id or ("simulation" if is_simulation else safe_source)
            al_meta = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "camera_id": camera_id or safe_source,
                "farm_id": farm_id,
                "thi": current_thi,
                "avg_conf": round(avg_conf, 3),
                "num_cows": len(detections),
                "detections": detections,
            }
            threading.Thread(target=save_active_learning_sample, args=(frame.copy(), al_meta, cam_k), daemon=True).start()

    return {"detections": detections, "counts": counts}


def draw_overlay(frame, analysis, mode_tag):
    """วาดกรอบวัวจากผล YOLO ล่าสุด + แถบสรุปด้านบน (ผลอาจมาจากเฟรมก่อนหน้าไม่เกินราว 1 วินาที)"""
    out = frame.copy()
    detections = analysis["detections"] if analysis else []
    counts = analysis["counts"] if analysis else {"standing": 0, "lying down": 0, "feeding": 0, "drinking": 0}
    for d in detections:
        x1, y1, x2, y2 = d["bbox"]
        cname, cf, tid = d["posture"], d["conf"], d["track_id"]
        color = BEHAVIOR_COLORS.get(cname, DEFAULT_COLOR)
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        corner_len = min(18, max(6, (x2 - x1) // 5), max(6, (y2 - y1) // 5))
        for (ax, ay), (bx, by) in [
            ((x1, y1), (x1 + corner_len, y1)), ((x1, y1), (x1, y1 + corner_len)),
            ((x2, y1), (x2 - corner_len, y1)), ((x2, y1), (x2, y1 + corner_len)),
            ((x1, y2), (x1 + corner_len, y2)), ((x1, y2), (x1, y2 - corner_len)),
            ((x2, y2), (x2 - corner_len, y2)), ((x2, y2), (x2, y2 - corner_len)),
        ]:
            cv2.line(out, (ax, ay), (bx, by), color, 3)
        label_text = f"COW #{tid} | {cname} {int(cf * 100)}%" if tid is not None else f"{cname} {int(cf * 100)}%"
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        bg_y1 = max(0, y1 - th - 8)
        bg_x2 = min(out.shape[1], x1 + tw + 10)
        cv2.rectangle(out, (x1, bg_y1), (bg_x2, y1), color, -1)
        cv2.putText(out, label_text, (x1 + 5, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

    if analysis is None:
        ai_text = "AI: starting..."
    else:
        ai_text = f"AI {time.time() - analysis['at']:.1f}s ago"
    hud_text = (f"{mode_tag} COWS: {len(detections)} | Stand: {counts.get('standing', 0)} | Lie: {counts.get('lying down', 0)}"
                f" | Feed: {counts.get('feeding', 0)} | Drink: {counts.get('drinking', 0)} | {ai_text}")
    cv2.rectangle(out, (8, 8), (out.shape[1] - 8, 38), (20, 30, 25), -1)
    cv2.rectangle(out, (8, 8), (out.shape[1] - 8, 38), (60, 90, 75), 1)
    cv2.putText(out, hud_text, (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (240, 250, 245), 1, cv2.LINE_AA)
    return out


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
    safe_source = mask_source(str_source)
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
        print(f"[Camera API] 📡 Connecting RTSP stream: {safe_source}")
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
        print(f"[Camera API] ❌ Video source '{safe_source}' cannot be opened!")
        err_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(err_frame, f"Source Not Available: {safe_source[:35]}", (40, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        cv2.putText(err_frame, "Please check RTSP URL, USB connection or select Simulation.", (30, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        ret, buffer = cv2.imencode(".jpg", err_frame)
        if ret:
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")
        return

    mode_tag = "[SIMULATION]" if is_simulation else ("[RTSP]" if is_rtsp else "[USB]")
    # วิดีโอจำลองต้องเล่นตามจังหวะของไฟล์ (กล้องจริงส่งเฟรมมาเองตามเวลาจริง)
    file_fps = cap.get(cv2.CAP_PROP_FPS) if is_simulation else 0
    file_interval = 1.0 / file_fps if file_fps and file_fps > 0 else (1.0 / 25 if is_simulation else 0)

    stop = threading.Event()
    lock = threading.Lock()
    state = {
        "frame": None,        # เฟรมล่าสุดจากกล้อง (ย่อ/กลับด้านแล้ว)
        "frame_seq": 0,
        "result": None,       # ผล YOLO ล่าสุด: detections + counts + เวลาที่วิเคราะห์เสร็จ
        "last_pull": time.time(),
    }

    def prepare(frame):
        # ย่อเหลือกว้าง 640 ลด CPU และขนาดภาพที่ส่งให้เบราว์เซอร์
        h, w = frame.shape[:2]
        if w > 640:
            frame = cv2.resize(frame, (640, int(h * 640.0 / w)), interpolation=cv2.INTER_LINEAR)
        return cv2.flip(frame, 1) if flip else frame

    def viewer_gone() -> bool:
        # starlette ไม่รับประกันว่าจะเรียก finally ของ generator ทันทีที่ผู้ชมปิดหน้า: เธรดเช็กเองด้วย
        return time.time() - state["last_pull"] > STREAM_IDLE_TIMEOUT_S

    # เธรด 1: อ่านเฟรมจากกล้องตลอดเวลา เก็บไว้แค่เฟรมล่าสุด (ไม่ให้เฟรมค้างในบัฟเฟอร์จนภาพช้ากว่าความจริง)
    def reader():
        while not stop.is_set() and not viewer_gone():
            ok, frame = cap.read()
            if not ok and is_simulation:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ok, frame = cap.read()
            if not ok:
                if is_rtsp:
                    time.sleep(0.5)  # สัญญาณหลุดชั่วคราว รอแล้วอ่านต่อ
                    continue
                break
            frame = prepare(frame)
            with lock:
                state["frame"] = frame
                state["frame_seq"] += 1
            if file_interval:
                time.sleep(file_interval)
        stop.set()

    # เธรด 2: YOLO + ByteTrack บนเฟรมล่าสุดเท่าที่ CPU ทำทัน (บน CPU ประมาณ 1 รูป/วินาที)
    def inferencer():
        last_seq = 0
        while not stop.is_set() and not viewer_gone():
            with lock:
                frame, seq = state["frame"], state["frame_seq"]
            if frame is None or seq == last_seq:
                time.sleep(0.02)
                continue
            last_seq = seq
            try:
                analysis = analyze_frame(frame, tracker, farm_id, camera_id, current_thi, is_simulation, safe_source)
            except Exception as e:
                print(f"[Camera API] ⚠️ inference error: {e}")
                time.sleep(0.5)
                continue
            analysis["at"] = time.time()
            with lock:
                state["result"] = analysis

    threads = [threading.Thread(target=reader, daemon=True), threading.Thread(target=inferencer, daemon=True)]
    for t in threads:
        t.start()

    # ส่งภาพให้เบราว์เซอร์ราว 10 เฟรม/วินาที วาดกรอบจากผล YOLO ล่าสุดทับลงไป
    try:
        while not stop.is_set():
            tick = time.time()
            state["last_pull"] = tick
            with lock:
                frame, analysis = state["frame"], state["result"]
            if frame is None:
                time.sleep(0.05)
                continue
            annotated = draw_overlay(frame, analysis, mode_tag)
            ret, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")
            time.sleep(max(0.0, STREAM_FRAME_INTERVAL_S - (time.time() - tick)))
    finally:
        stop.set()
        for t in threads:
            t.join(timeout=3)
        cap.release()
        print(f"[Camera API] 🛑 Camera stream source '{safe_source}' closed.")


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
    rtsp_url: Optional[str] = Query(None, description="RTSP URL (ใช้คู่กับ cam_id=rtsp ตามที่หน้าเว็บส่งมา)"),
    farm_id: Optional[str] = Query(None, description="Farm UUID for telemetry binding"),
    camera_id: Optional[str] = Query(None, description="Camera UUID"),
    thi: Optional[float] = Query(None, description="Current ambient THI"),
    flip: bool = Query(False, description="Mirror image horizontally")
):
    # หน้าเว็บส่ง cam_id=rtsp&rtsp_url=... ถ้าไม่อ่าน rtsp_url ค่า "rtsp" จะถูกตีความเป็นกล้อง USB
    if rtsp_url and cam_id in (None, "rtsp"):
        selected_source = rtsp_url
    else:
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
