FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run the Flask server on port 7860
CMD ["gunicorn", "app:app", "-b", "0.0.0.0:7860", "--workers", "1", "--threads", "4", "--timeout", "300"]