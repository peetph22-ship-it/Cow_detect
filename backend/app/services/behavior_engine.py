import time
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional

NODE_API_BASE = "http://localhost:4001"

def point_in_polygon(x: float, y: float, polygon: List[dict]) -> bool:
    """Ray-casting algorithm to test if (x,y) normalized [0..1] is in polygon."""
    n = len(polygon)
    inside = False
    p1 = polygon[0]
    for i in range(n + 1):
        p2 = polygon[i % n]
        if y > min(p1["y"], p2["y"]):
            if y <= max(p1["y"], p2["y"]):
                if x <= max(p1["x"], p2["x"]):
                    if p1["y"] != p2["y"]:
                        xinters = (y - p1["y"]) * (p2["x"] - p1["x"]) / (p2["y"] - p1["y"]) + p1["x"]
                    if p1["x"] == p2["x"] or x <= xinters:
                        inside = not inside
        p1 = p2
    return inside

# Configurable Normalized ROIs for Thai Crossbred Barns
DEFAULT_FEED_BUNK_ROI = [
    {"x": 0.0, "y": 0.45},
    {"x": 1.0, "y": 0.45},
    {"x": 1.0, "y": 1.0},
    {"x": 0.0, "y": 1.0}
]

DEFAULT_WATER_TROUGH_ROI = [
    {"x": 0.65, "y": 0.20},
    {"x": 1.0, "y": 0.20},
    {"x": 1.0, "y": 0.65},
    {"x": 0.65, "y": 0.65}
]

class CowStateTracker:
    """
    3-Tier Hybrid Behavior Engine for Precision Livestock Farming (PLF)
    Layer 1: In-Memory Multi-Cow State Machine with Spatial ROI-Assisted Prior
    Layer 2: 5-Minute Rollup Telemetry Worker
    Layer 3: Animal Welfare Anomaly Engine
    """
    def __init__(self, farm_id: Optional[str] = None, camera_id: Optional[str] = None):
        self.farm_id = farm_id
        self.camera_id = camera_id
        self.cow_states: Dict[int, dict] = {}
        self.roi_residence: Dict[int, dict] = {}  # tid -> {"roi": str, "entered_at": datetime, "seconds": float}
        self.feed_bunk_roi = DEFAULT_FEED_BUNK_ROI
        self.water_trough_roi = DEFAULT_WATER_TROUGH_ROI
        self.last_rollup_time = time.time()
        self.last_alert_times: Dict[str, float] = {}  # key -> timestamp for cooldown
        self.rollup_interval_sec = 300  # 5 minutes in production (can be tuned)
        self.is_simulation = False

    def update_tracks(
        self, 
        detections: List[dict], 
        current_thi: Optional[float] = None, 
        is_simulation: bool = False,
        frame_shape: tuple = (480, 640)
    ):
        """
        Layer 1: Update in-memory state for every tracked cow in the current frame.
        detections: list of dicts: {"track_id": int, "posture": str, "conf": float, "bbox": [x1, y1, x2, y2]}
        Includes Spatial ROI-Assisted Classification Recovery for feeding/drinking under occlusions.
        """
        now = datetime.now()
        now_ts = time.time()
        self.is_simulation = is_simulation
        fh, fw = frame_shape[:2]

        current_frame_ids = set()

        for det in detections:
            tid = det.get("track_id")
            if tid is None:
                continue
            current_frame_ids.add(tid)
            posture = det.get("posture", "standing")
            conf = det.get("conf", 0.0)
            bbox = det.get("bbox", [0, 0, 0, 0])

            # Spatial ROI-Assisted Classification Recovery
            cx = ((bbox[0] + bbox[2]) / 2.0) / max(1.0, float(fw))
            cy = ((bbox[1] + bbox[3]) / 2.0) / max(1.0, float(fh))

            in_feed = point_in_polygon(cx, cy, self.feed_bunk_roi)
            in_water = point_in_polygon(cx, cy, self.water_trough_roi)

            if in_feed or in_water:
                target_roi = "feeding" if in_feed else "drinking"
                prev_roi = self.roi_residence.get(tid, {})
                if prev_roi.get("roi") == target_roi:
                    elapsed = (now - prev_roi["entered_at"]).total_seconds()
                    self.roi_residence[tid]["seconds"] = elapsed
                else:
                    self.roi_residence[tid] = {"roi": target_roi, "entered_at": now, "seconds": 0.0}
                    elapsed = 0.0

                # If cow is inside ROI continuously for >= 60 seconds:
                # boost effective confidence by +0.15 (capped at 0.99) and resolve state to feeding/drinking
                if elapsed >= 60.0:
                    if posture in ["standing", "feeding", "drinking"] and conf < 0.85:
                        conf = min(0.99, round(conf + 0.15, 3))
                        posture = target_roi
                        det["posture"] = posture
                        det["conf"] = conf
            else:
                if tid in self.roi_residence:
                    del self.roi_residence[tid]

            if tid not in self.cow_states:
                self.cow_states[tid] = {
                    "track_id": tid,
                    "posture": posture,
                    "since": now,
                    "duration_minutes": 0.0,
                    "bbox": bbox,
                    "conf": conf,
                    "last_seen": now
                }
            else:
                state = self.cow_states[tid]
                state["bbox"] = bbox
                state["conf"] = conf
                state["last_seen"] = now

                if state["posture"] == posture:
                    state["duration_minutes"] = (now - state["since"]).total_seconds() / 60.0
                else:
                    state["posture"] = posture
                    state["since"] = now
                    state["duration_minutes"] = 0.0

        # Purge stale tracks not seen for > 45 seconds
        stale_cutoff = now - timedelta(seconds=45)
        for tid in list(self.cow_states.keys()):
            if self.cow_states[tid]["last_seen"] < stale_cutoff:
                del self.cow_states[tid]

        # Layer 3: Evaluate Real-Time Animal Welfare Anomalies
        self._evaluate_anomalies(current_thi)

        # Layer 2: Check if 5-minute rollup window has elapsed
        if now_ts - self.last_rollup_time >= self.rollup_interval_sec:
            self._emit_rollup_telemetry()
            self.last_rollup_time = now_ts

    def _evaluate_anomalies(self, current_thi: Optional[float]):
        """
        Layer 3: Welfare Anomaly Detection (Papo et al. 2026 Animals; Hasan et al. 2026)
        """
        now_ts = time.time()
        effective_thi = current_thi if current_thi is not None else 78.0

        for tid, state in self.cow_states.items():
            posture = state["posture"]
            dur = state["duration_minutes"]

            # 1. Prolonged Standing: >= 180 mins (3 hours)
            if posture == "standing" and dur >= 180.0:
                alert_key = f"prolonged_standing_{tid}"
                if now_ts - self.last_alert_times.get(alert_key, 0) > 1800:  # 30-min cooldown
                    msg = f"แม่โค Track #{tid} ยืนต่อเนื่องเกิน {int(dur)} นาที (THI {effective_thi:.1f}) เสี่ยงต่อโรคกีบอักเสบและไม่ระบายความร้อน"
                    self._dispatch_alert("prolonged_standing", "critical", int(dur), msg, tid, effective_thi)
                    self.last_alert_times[alert_key] = now_ts

            # 2. Downer Cow: >= 240 mins (4 hours) lying down motionless
            elif posture == "lying down" and dur >= 240.0:
                alert_key = f"downer_cow_{tid}"
                if now_ts - self.last_alert_times.get(alert_key, 0) > 1800:
                    msg = f"⚠️ ด่วน! แม่โค Track #{tid} นอนติดพื้นนานผิดปกติ {int(dur)} นาที (>4 ชม.) เสี่ยงต่อภาวะไข้น้ำนม (Downer Cow Syndrome)"
                    self._dispatch_alert("downer_cow", "critical", int(dur), msg, tid, effective_thi)
                    self.last_alert_times[alert_key] = now_ts

    def _emit_rollup_telemetry(self):
        """
        Layer 2: Compute 5-minute herd aggregate and push to PostgreSQL via Node.js
        """
        if not self.cow_states or not self.farm_id:
            return

        total = len(self.cow_states)
        standing = sum(1 for s in self.cow_states.values() if s["posture"] == "standing")
        lying = sum(1 for s in self.cow_states.values() if s["posture"] == "lying down")
        feeding = sum(1 for s in self.cow_states.values() if s["posture"] == "feeding")
        drinking = sum(1 for s in self.cow_states.values() if s["posture"] == "drinking")

        standing_pct = round((standing / total) * 100, 2)
        lying_pct = round((lying / total) * 100, 2)
        feeding_pct = round((feeding / total) * 100, 2)
        drinking_pct = round((drinking / total) * 100, 2)

        # CCI = (lying / max(1, standing + lying)) * 100
        denom = max(1, standing + lying)
        cci = round((lying / denom) * 100, 2)

        avg_conf = sum(s["conf"] for s in self.cow_states.values()) / total
        active_ids = list(self.cow_states.keys())

        payload = {
            "camera_id": self.camera_id,
            "total_cows_detected": total,
            "standing_count": standing,
            "lying_count": lying,
            "feeding_count": feeding,
            "drinking_count": drinking,
            "standing_pct": standing_pct,
            "lying_pct": lying_pct,
            "feeding_pct": feeding_pct,
            "drinking_pct": drinking_pct,
            "cow_comfort_index": cci,
            "ai_confidence_avg": round(avg_conf, 3),
            "active_track_ids": active_ids,
            "is_simulation": self.is_simulation
        }

        try:
            url = f"{NODE_API_BASE}/api/Admin/farms/{self.farm_id}/cameras/telemetry"
            res = requests.post(url, json=payload, timeout=3)
            if res.status_code in [200, 201]:
                print(f"[Behavior Engine] ✅ 5-Min Telemetry Rolled up: {total} cows, CCI: {cci}%")
        except Exception as e:
            print(f"[Behavior Engine] ⚠️ Could not emit telemetry to Node.js: {e}")

    def _dispatch_alert(self, alert_type: str, severity: str, duration: int, message: str, track_id: int, thi: float):
        """Send alert to Node.js backend"""
        if not self.farm_id:
            return
        payload = {
            "camera_id": self.camera_id,
            "track_id": track_id,
            "alert_type": alert_type,
            "severity": severity,
            "duration_minutes": duration,
            "message_th": message,
            "thi_at_event": thi,
            "is_simulation": self.is_simulation
        }
        try:
            url = f"{NODE_API_BASE}/api/Admin/farms/{self.farm_id}/cameras/alerts"
            requests.post(url, json=payload, timeout=3)
            print(f"[Behavior Engine] 🚨 Dispatched Alert [{alert_type}] for Track #{track_id}")
        except Exception as e:
            print(f"[Behavior Engine] ⚠️ Alert dispatch error: {e}")
