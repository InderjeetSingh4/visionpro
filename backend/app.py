"""
VisionPro AI Engine
Model  : YOLO11s (Optimized for speed and accuracy)
Device : Apple M4 MPS (Metal Performance Shaders) — GPU accelerated
Modes  : Image detection | Video detection | Live webcam stream
"""

import os, uuid, time, base64, threading, tempfile
import cv2, numpy as np
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from ultralytics import YOLO
from werkzeug.utils import secure_filename

# ── App setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app,
     resources={r"/*": {"origins": "*"}},
     supports_credentials=True,
     allow_headers="*",
     methods=["GET", "POST", "OPTIONS"])

UPLOAD_DIR = tempfile.mkdtemp()
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024   # 500 MB max upload

# ── Load model on Apple M4 MPS ─────────────────────────────────────────────
import torch
if torch.backends.mps.is_available():
    DEVICE = "mps"
    DEV_NAME = "Apple MPS (GPU)"
elif torch.cuda.is_available():
    DEVICE = "cuda"
    DEV_NAME = "NVIDIA CUDA (GPU)"
else:
    DEVICE = "cpu"
    DEV_NAME = "CPU"

print("\n" + "="*55)
print("  VisionPro AI Engine")
print("  Model  : YOLO11s (optimized for speed & accuracy)")
print(f"  Device : {DEV_NAME}")
print("="*55)

model = YOLO("yolo11s.pt")       # Auto-downloads on first run
model.to(DEVICE)

# Warm-up pass — eliminates slow first inference
_dummy = np.zeros((640, 640, 3), dtype=np.uint8)
model(_dummy, verbose=False, device=DEVICE)
print(f"\n  ✓ Ready! {len(model.names)} COCO classes | {DEV_NAME}\n")

# ── Per-class deterministic colour ─────────────────────────────────────────
_colours: dict = {}
def get_colour(cid: int) -> tuple:
    if cid not in _colours:
        np.random.seed(cid * 9 + 5)
        _colours[cid] = tuple(int(c) for c in np.random.randint(60, 220, 3))
    return _colours[cid]

# ── Draw bounding boxes + labels on a frame ────────────────────────────────
def draw(frame: np.ndarray, results, conf_thresh: float):
    counts: dict = {}
    det_list: list = []

    for r in results:
        boxes   = r.boxes
        has_ids = boxes.id is not None

        for i, box in enumerate(boxes):
            conf = float(box.conf[0])
            if conf < conf_thresh:
                continue
            cid   = int(box.cls[0])
            label = model.names[cid]
            color = get_colour(cid)
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            # Bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Label — include track ID if available
            tid = int(boxes.id[i]) if has_ids else None
            txt = f" {label}  {conf*100:.1f}%" if tid is None else f" #{tid} {label}  {conf*100:.1f}%"
            (tw, th), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_DUPLEX, 0.55, 1)
            cv2.rectangle(frame, (x1, y1 - th - 10), (x1 + tw + 6, y1), color, cv2.FILLED)
            cv2.putText(frame, txt, (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_DUPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)

            counts[label] = counts.get(label, 0) + 1
            det_list.append({
                "label":      label,
                "confidence": round(conf, 4),
                "box":        [x1, y1, x2, y2],
                "track_id":   tid
            })

    return frame, counts, det_list

def to_b64(frame: np.ndarray, quality: int = 92) -> str:
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()

# ────────────────────────────────────────────────────────────────────────────
#  API ROUTES
# ────────────────────────────────────────────────────────────────────────────

@app.route("/")
def root():
    return jsonify({"status": "VisionPro running", "model": "yolo11s", "classes": len(model.names)})

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": "yolo11s", "device": DEVICE, "classes": len(model.names)})


@app.route("/api/detect/image", methods=["POST", "OPTIONS"])
def detect_image():
    if request.method == "OPTIONS": return jsonify({}), 200
    if "file" not in request.files: return jsonify({"error": "No file provided"}), 400

    f    = request.files["file"]
    conf = float(request.form.get("confidence", 0.30))
    t0   = time.time()

    try:
        buf = np.frombuffer(f.read(), np.uint8)
        img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if img is None: return jsonify({"error": "Cannot decode image"}), 400

        results = model(img, conf=conf, verbose=False, device=DEVICE)
        annotated, counts, det_list = draw(img.copy(), results, conf)

        return jsonify({
            "image":      to_b64(annotated),
            "detections": counts,
            "det_list":   det_list,
            "total":      sum(counts.values()),
            "latency_ms": int((time.time() - t0) * 1000),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 2. VIDEO detection (OPTIMIZED FOR SPEED) ──────────────────────────────
@app.route("/api/detect/video", methods=["POST", "OPTIONS"])
def detect_video():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f    = request.files["file"]
    conf = float(request.form.get("confidence", 0.30))
    t0   = time.time()

    uid      = uuid.uuid4().hex[:10]
    in_path  = os.path.join(UPLOAD_DIR, uid + "_" + secure_filename(f.filename or "video.mp4"))
    raw_path = os.path.join(OUTPUT_DIR, uid + "_raw.mp4")
    out_path = os.path.join(OUTPUT_DIR, uid + "_out.mp4")
    f.save(in_path)

    cap = cv2.VideoCapture(in_path)
    if not cap.isOpened():
        return jsonify({"error": "Cannot open video"}), 400

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    
    # OPTIMIZATION 1: Force resize to 640px width to save CPU
    orig_W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    W = 640
    H = int(640 * (orig_H / orig_W))

    writer = cv2.VideoWriter(
        raw_path,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps, (W, H)
    )

    unique_ids: dict  = {}   
    all_counts: dict  = {}   
    n_frames = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            n_frames += 1
            
            # Apply Resize
            frame = cv2.resize(frame, (W, H))

            # OPTIMIZATION 2: Skip 2 out of every 3 frames (300% Speed Boost)
            if n_frames % 3 != 0:
                writer.write(frame)
                continue

            results = model.track(
                frame,
                conf=conf,
                persist=True,          
                tracker="bytetrack.yaml",
                verbose=False,
                device=DEVICE
            )

            ann, _, _ = draw(frame.copy(), results, conf)

            for r in results:
                if r.boxes.id is None:
                    continue
                for box, tid in zip(r.boxes, r.boxes.id.int().tolist()):
                    if tid not in unique_ids:
                        cid   = int(box.cls[0])
                        label = model.names[cid]
                        unique_ids[tid] = label
                        all_counts[label] = all_counts.get(label, 0) + 1

            writer.write(ann)
            
    finally:
        cap.release()
        writer.release()

    # Re-encode to H.264
    ffmpeg_ok = (
        os.system(f'ffmpeg -y -i "{raw_path}" -vcodec libx264 -preset ultrafast -crf 28 -movflags +faststart "{out_path}" -loglevel error') == 0
        and os.path.exists(out_path)
    )
    serve = out_path if ffmpeg_ok else raw_path

    return jsonify({
        "video":        f"/api/video/{os.path.basename(serve)}",
        "video_url":    True,
        "detections":   all_counts,
        "total":        sum(all_counts.values()),
        "total_frames": n_frames,
        "unique_tracks": len(unique_ids),
        "fps":          round(fps, 2),
        "latency_ms":   int((time.time() - t0) * 1000),
    })

@app.route("/api/local-ip")
def local_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception:
        ip = "localhost"
    return jsonify({"ip": ip})

_ngrok_url: str = ""

@app.route("/api/tunnel-url")
def tunnel_url():
    return jsonify({"url": _ngrok_url, "has_tunnel": bool(_ngrok_url)})

@app.route("/api/video/<filename>")
def serve_video(filename):
    from flask import send_file
    path = os.path.join(OUTPUT_DIR, secure_filename(filename))
    if not os.path.exists(path): return jsonify({"error": "Video not found"}), 404
    return send_file(path, mimetype="video/mp4", conditional=True)


# ── 3. LIVE WEBCAM — MJPEG stream ─────────────────────────────────────────
_streaming     = False
_stream_lock   = threading.Lock()
_stream_conf   = 0.30
_frame_counts  = {}
_frame_history = []
_confirmed_objects = {}

def _mjpeg():
    global _streaming, _stream_conf

    cap = cv2.VideoCapture(0)
    if not cap.isOpened(): return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    with _stream_lock: _streaming = True

    try:
        while _streaming:
            ret, frame = cap.read()
            if not ret: break

            results = model(frame, conf=_stream_conf, verbose=False, device=DEVICE)
            ann, counts, _ = draw(frame.copy(), results, _stream_conf)
            _frame_counts.clear()
            _frame_counts.update(counts)

            _frame_history.append(dict(counts))
            if len(_frame_history) > 20: _frame_history.pop(0)

            if len(_frame_history) >= 5:
                recent = _frame_history[-8:]
                threshold = len(recent) * 0.6
                for cls in set(c for f in recent for c in f):
                    seen = sum(1 for f in recent if f.get(cls, 0) > 0)
                    if seen >= threshold:
                        max_count = max(f.get(cls, 0) for f in recent)
                        if cls not in _confirmed_objects or _confirmed_objects[cls] < max_count:
                            _confirmed_objects[cls] = max_count

            total = sum(counts.values())
            cv2.putText(ann, f"LIVE  |  {total} objects", (14, 36), cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 2, cv2.LINE_AA)

            _, buf = cv2.imencode(".jpg", ann, [cv2.IMWRITE_JPEG_QUALITY, 70])
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")
    finally:
        cap.release()
        with _stream_lock: _streaming = False

@app.route("/api/stream/webcam")
def webcam_stream():
    global _stream_conf, _frame_counts, _frame_history, _confirmed_objects
    _stream_conf = float(request.args.get("confidence", 0.30))
    _frame_counts.clear()
    _frame_history.clear()
    _confirmed_objects.clear()
    return Response(stream_with_context(_mjpeg()), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/api/stream/counts")
def stream_counts():
    return jsonify({"counts": dict(_confirmed_objects)})

@app.route("/api/stream/stop", methods=["POST", "OPTIONS"])
def stream_stop():
    global _streaming
    if request.method == "OPTIONS": return jsonify({}), 200
    with _stream_lock: _streaming = False
    return jsonify({"status": "stopped"})


def _start_tunnel(port: int):
    global _ngrok_url
    import subprocess, threading, time as _time, re

    def try_cloudflare():
        global _ngrok_url
        try:
            proc = subprocess.Popen(["cloudflared", "tunnel", "--url", f"http://localhost:{port}"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            deadline = _time.time() + 15
            for line in proc.stdout:
                if _time.time() > deadline: break
                m = re.search(r"https://[\w\-]+\.trycloudflare\.com", line)
                if m:
                    _ngrok_url = m.group(0)
                    return True
        except: pass
        return False

    def try_localhostrun():
        global _ngrok_url
        try:
            proc = subprocess.Popen(["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30", "-R", f"80:localhost:{port}", "nokey@localhost.run"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            deadline = _time.time() + 12
            for line in proc.stdout:
                if _time.time() > deadline: break
                m = re.search(r"https://[\w\-]+\.lhr\.life", line)
                if not m: m = re.search(r"https://[\w\-\.]+\.localhost\.run", line)
                if m:
                    _ngrok_url = m.group(0)
                    return True
        except: pass
        return False

    def tunnel_worker():
        if try_cloudflare(): return
        if try_localhostrun(): return

    t = threading.Thread(target=tunnel_worker, daemon=True)
    t.start()
    t.join(timeout=8)


if __name__ == "__main__":
    import socket
    port = int(os.environ.get("PORT", 5001))
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "localhost"

    _start_tunnel(port)

    print(f"\n{'='*55}")
    print(f"  Backend running on ALL network interfaces")
    print(f"{'='*55}")
    print(f"  Local  → http://localhost:{port}")
    print(f"  Network→ http://{local_ip}:{port}")
    if _ngrok_url:
        print(f"  Internet→ {_ngrok_url}")
    print(f"{'='*55}\n")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)