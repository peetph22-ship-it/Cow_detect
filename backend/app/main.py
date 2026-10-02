# import zone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# import api zone
from app.api.detect import router as detect_router
from app.api.test_cam import router as test_cam_router

# main instance
app = FastAPI(title="Test FastAPI")

# cors setting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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