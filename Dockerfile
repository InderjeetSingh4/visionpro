FROM python:3.10-slim

WORKDIR /app

# Install system libraries needed by OpenCV
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0

# Pull requirements from the backend folder
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the backend code
COPY backend/ .

# Run the server
CMD ["gunicorn", "app:app", "-b", "0.0.0.0:7860", "--workers", "1", "--threads", "4", "--timeout", "300"]