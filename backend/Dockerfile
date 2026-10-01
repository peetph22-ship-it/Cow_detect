FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# ⭐ ถอนการติดตั้ง OpenCV ทั้งหมดก่อน แล้วบังคับลงแค่ headless เพื่อป้องกันโฟลเดอร์ cv2 หาย
RUN pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-python opencv-python-headless && \
    pip install --no-cache-dir opencv-python-headless

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]