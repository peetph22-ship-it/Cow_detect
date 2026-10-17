# import zone
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Filter out Docker healthcheck access logs from spamming the console
class HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return "GET / " not in message and "GET / HTTP" not in message

logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

# import api zone
from app.api.detect import router as detect_router
from app.api.test_cam import router as test_cam_router

# main instance
app = FastAPI(title="Test FastAPI")

# cors setting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
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