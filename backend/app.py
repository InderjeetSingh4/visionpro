"""
VisionPro AI Engine
Model  : YOLO11x (highest accuracy, latest Ultralytics model)
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
# ── Auto-detect best available device ─────────────────────────────────────
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
print("  Model  : YOLO11x (latest & most accurate)")
print(f"  Device : {DEV_NAME}")
print("="*55)

model = YOLO("yolo11x.pt")       # Auto-downloads on first run (~109 MB)
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

# ── Helper: encode frame → base64 JPEG string ─────────────────────────────
def to_b64(frame: np.ndarray, quality: int = 92) -> str:
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()


# ────────────────────────────────────────────────────────────────────────────
#  API ROUTES
# ────────────────────────────────────────────────────────────────────────────

@app.route("/")
def root():
    return jsonify({
        "status":  "VisionPro running",
        "model":   "yolo11x",
        "device":  "mps (Apple M4)",
        "classes": len(model.names)
    })

@app.route("/health")
def health():
    return jsonify({
        "status":  "ok",
        "model":   "yolo11x",
        "device":  DEVICE,
        "classes": len(model.names)
    })


# ── 1. IMAGE detection ────────────────────────────────────────────────────
@app.route("/api/detect/image", methods=["POST", "OPTIONS"])
def detect_image():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f    = request.files["file"]
    conf = float(request.form.get("confidence", 0.30))
    t0   = time.time()

    try:
        buf = np.frombuffer(f.read(), np.uint8)
        img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Cannot decode image. Check file format."}), 400

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
        print(f"[IMAGE ERROR] {e}")
        return jsonify({"error": str(e)}), 500


# ── 2. VIDEO detection ────────────────────────────────────────────────────
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
        return jsonify({"error": "Cannot open video. Is the format supported?"}), 400

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    W   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    writer = cv2.VideoWriter(
        raw_path,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps, (W, H)
    )

    unique_ids: dict  = {}   # track_id → class label (each real object counted once)
    all_counts: dict  = {}   # unique count per class
    n_frames = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Use track() instead of __call__() — enables ByteTrack
            results = model.track(
                frame,
                conf=conf,
                persist=True,          # keep tracker state across frames
                tracker="bytetrack.yaml",
                verbose=False,
                device=DEVICE
            )

            ann, _, _ = draw(frame.copy(), results, conf)

            # Count each track_id only ONCE across the whole video
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
            n_frames += 1
    finally:
        cap.release()
        writer.release()

    # Re-encode to H.264 so every browser can play it
    ffmpeg_ok = (
        os.system(
            f'ffmpeg -y -i "{raw_path}" '
            f'-vcodec libx264 -preset fast -crf 22 '
            f'-movflags +faststart "{out_path}" -loglevel error'
        ) == 0
        and os.path.exists(out_path)
        and os.path.getsize(out_path) > 0
    )
    serve = out_path if ffmpeg_ok else raw_path

    # Serve via URL (faster, more reliable than base64 for large videos)
    serve_name = os.path.basename(serve)

    return jsonify({
        "video":        f"/api/video/{serve_name}",
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


# ── Ngrok public tunnel URL (set at startup) ──────────────────────────────
_ngrok_url: str = ""

@app.route("/api/tunnel-url")
def tunnel_url():
    """Return the ngrok public URL so frontend can build QR code."""
    return jsonify({"url": _ngrok_url, "has_tunnel": bool(_ngrok_url)})


# ── Serve processed video files ───────────────────────────────────────────
@app.route("/api/video/<filename>")
def serve_video(filename):
    from flask import send_file
    path = os.path.join(OUTPUT_DIR, secure_filename(filename))
    if not os.path.exists(path):
        return jsonify({"error": "Video not found"}), 404
    return send_file(path, mimetype="video/mp4", conditional=True)


# ── 3. LIVE WEBCAM — MJPEG stream ─────────────────────────────────────────
_streaming     = False
_stream_lock   = threading.Lock()
_stream_conf   = 0.30
_frame_counts  = {}    # current frame counts
_frame_history = []    # last 20 frames
_confirmed_objects = {}  # objects confirmed across stream (class → max count seen consistently)

def _mjpeg():
    global _streaming, _stream_conf

    cap = cv2.VideoCapture(0)   # 0 = built-in MacBook webcam
    if not cap.isOpened():
        print("[STREAM] No webcam found.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)

    with _stream_lock:
        _streaming = True

    try:
        while _streaming:
            ret, frame = cap.read()
            if not ret:
                break

            results = model(frame, conf=_stream_conf, verbose=False, device=DEVICE)
            ann, counts, _ = draw(frame.copy(), results, _stream_conf)
            _frame_counts.clear()
            _frame_counts.update(counts)

            # Rolling history
            _frame_history.append(dict(counts))
            if len(_frame_history) > 20:
                _frame_history.pop(0)

            # Confirm objects seen in 60% of last 8 frames → add to session total
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

            # HUD overlay
            cv2.putText(ann, f"LIVE  |  {total} objects",
                        (14, 36), cv2.FONT_HERSHEY_DUPLEX,
                        0.85, (255, 255, 255), 2, cv2.LINE_AA)

            _, buf = cv2.imencode(".jpg", ann, [cv2.IMWRITE_JPEG_QUALITY, 75])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + buf.tobytes()
                + b"\r\n"
            )
    finally:
        cap.release()
        with _stream_lock:
            _streaming = False

@app.route("/api/stream/webcam")
def webcam_stream():
    global _stream_conf, _frame_counts, _frame_history, _confirmed_objects
    _stream_conf = float(request.args.get("confidence", 0.30))
    # Reset all tracking state for new stream
    _frame_counts.clear()
    _frame_history.clear()
    _confirmed_objects.clear()
    return Response(
        stream_with_context(_mjpeg()),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/api/stream/counts")
def stream_counts():
    # Return everything confirmed during the entire stream
    return jsonify({"counts": dict(_confirmed_objects)})


@app.route("/api/stream/stop", methods=["POST", "OPTIONS"])
def stream_stop():
    global _streaming, _frame_counts, _frame_history
    if request.method == "OPTIONS":
        return jsonify({}), 200
    with _stream_lock:
        _streaming = False
    return jsonify({"status": "stopped"})


# ── Run ────────────────────────────────────────────────────────────────────
def _start_tunnel(port: int):
    """
    Start a free public tunnel — no account or auth needed.
    Tries in order: Cloudflare Quick Tunnel → localhost.run (SSH) → local IP fallback.
    """
    global _ngrok_url
    import subprocess, threading, time as _time, re

    # ── Option 1: Cloudflare Quick Tunnel (cloudflared) ──────────────────────
    # Free, no account, no auth. Install: brew install cloudflared
    def try_cloudflare():
        global _ngrok_url
        try:
            proc = subprocess.Popen(
                ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True
            )
            deadline = _time.time() + 15
            for line in proc.stdout:
                if _time.time() > deadline:
                    break
                m = re.search(r"https://[\w\-]+\.trycloudflare\.com", line)
                if m:
                    _ngrok_url = m.group(0)
                    print(f"  🌐 Cloudflare tunnel : {_ngrok_url}")
                    return True
        except FileNotFoundError:
            pass
        except Exception:
            pass
        return False

    # ── Option 2: localhost.run (SSH — built into macOS, no install needed) ──
    def try_localhostrun():
        global _ngrok_url
        try:
            proc = subprocess.Popen(
                ["ssh", "-o", "StrictHostKeyChecking=no",
                 "-o", "ServerAliveInterval=30",
                 "-R", f"80:localhost:{port}",
                 "nokey@localhost.run"],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True
            )
            deadline = _time.time() + 12
            for line in proc.stdout:
                if _time.time() > deadline:
                    break
                m = re.search(r"https://[\w\-]+\.lhr\.life", line)
                if not m:
                    m = re.search(r"https://[\w\-\.]+\.localhost\.run", line)
                if m:
                    _ngrok_url = m.group(0)
                    print(f"  🌐 localhost.run tunnel : {_ngrok_url}")
                    return True
        except Exception:
            pass
        return False

    # Run tunnel attempts in background so server starts immediately
    def tunnel_worker():
        if try_cloudflare():
            return
        if try_localhostrun():
            return
        print("  ℹ  No tunnel found. QR uses local IP — phone needs same WiFi.")
        print("     For internet QR: brew install cloudflared")

    t = threading.Thread(target=tunnel_worker, daemon=True)
    t.start()
    # Wait up to 8s for tunnel before continuing server start
    t.join(timeout=8)


if __name__ == "__main__":
    import socket
    port = int(os.environ.get("PORT", 5001))
    # Get local network IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "localhost"

    # Start free public tunnel (no account needed)
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