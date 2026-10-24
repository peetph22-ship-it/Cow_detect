# import zone
import os
import re
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Filter out Docker healthcheck access logs from spamming the console
class HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return "GET / " not in message and "GET / HTTP" not in message

logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())


# access log ของ uvicorn พิมพ์ query string เต็ม: ซ่อนค่า rtsp_url (มี user:password ของกล้อง)
class MaskCameraCredentialsFilter(logging.Filter):
    _RTSP_QUERY_RE = re.compile(r"(rtsp_url=)[^&\s]*", re.IGNORECASE)

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple) and len(record.args) >= 3:
            args = list(record.args)
            args[2] = self._RTSP_QUERY_RE.sub(r"\1<hidden>", str(args[2]))
            record.args = tuple(args)
        return True


logging.getLogger("uvicorn.access").addFilter(MaskCameraCredentialsFilter())

# import api zone
from app.api.detect import router as detect_router
from app.api.test_cam import router as test_cam_router

# main instance
app = FastAPI(title="CowCare AI - FastAPI Vision & Forecasting Backend")

# cors setting
cors_origins_env = os.getenv("FRONTEND_URL", os.getenv("ALLOWED_ORIGINS", "http://localhost:3000"))
allowed_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
for fallback in ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]:
    if fallback not in allowed_origins:
        allowed_origins.append(fallback)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get('/')
def read_root():
    return {"message": "FastAPI server run success!"}

# include api
app.include_router(detect_router)
app.include_router(test_cam_router,prefix="/api/cam",tags=["Camera"])