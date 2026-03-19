"""
VisionPro AI Engine
Model  : YOLO11m (Perfect Balance of Speed & Accuracy)
Device : Auto-detected (MPS / CUDA / CPU)
Modes  : Image detection | Video detection | Live webcam stream
"""

import os, uuid, time, base64, threading, tempfile
import cv2, numpy as np
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from ultralytics import YOLO
from werkzeug.utils import secure_filename
import torch

# ── App setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True,
     allow_headers="*", methods=["GET","POST","OPTIONS"])

UPLOAD_DIR = tempfile.mkdtemp()
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024

# ── Hardware & Model Setup ─────────────────────────────────────────────────
if torch.backends.mps.is_available():
    DEVICE = "mps"
    DEV_NAME = "Apple M4 MPS (GPU)"
elif torch.cuda.is_available():
    DEVICE = "cuda"
    DEV_NAME = "NVIDIA CUDA (GPU)"
else:
    DEVICE = "cpu"
    DEV_NAME = "CPU"

# Auto-select model based on hardware:
# GPU → yolo11x (most accurate), CPU → yolo11n (40x faster, good accuracy)
if DEVICE in ("mps", "cuda"):
    MODEL_NAME = "yolo11x.pt"
    MODEL_LABEL = "YOLO11x (GPU — max accuracy)"
else:
    MODEL_NAME = "yolo11n.pt"
    MODEL_LABEL = "YOLO11n (CPU — optimised for speed)"

print("\n" + "="*55)
print("  VisionPro AI Engine")
print(f"  Model  : {MODEL_LABEL}")
print(f"  Device : {DEV_NAME}")
print("="*55)

model = YOLO(MODEL_NAME)
model.to(DEVICE)

# Use smaller inference size on CPU for much faster processing
INFER_SIZE = 640 if DEVICE in ("mps", "cuda") else 416

_dummy = np.zeros((640, 640, 3), dtype=np.uint8)
model(_dummy, verbose=False, device=DEVICE, imgsz=INFER_SIZE)
print(f"\n  ✓ Ready! {MODEL_LABEL} | {DEV_NAME}\n")

# A professional, muted, desaturated color palette (BGR format for OpenCV)
PREMIUM_PALETTE = [
    (180, 130, 70),
    (140, 170, 120),
    (100, 120, 180),
    (70, 160, 210),
    (160, 160, 160),
    (190, 140, 100),
]

def get_colour(cid: int) -> tuple:
    return PREMIUM_PALETTE[cid % len(PREMIUM_PALETTE)]

# ── ELEGANT, MINIMALIST UI ─────────────────────────────────────────────────
def draw(frame: np.ndarray, results, conf_thresh: float):
    counts = {}
    det_list = []

    h, w = frame.shape[:2]
    font_scale = max(0.4, w / 2500)
    text_thickness = max(1, int(w / 1500))
    box_thickness = max(1, int(w / 1000))

    overlay = frame.copy()
    for r in results:
        boxes = r.boxes
        has_ids = boxes.id is not None
        for i, box in enumerate(boxes):
            if float(box.conf[0]) < conf_thresh: continue
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            cid = int(box.cls[0])
            label = model.names[cid].capitalize()
            conf = float(box.conf[0])
            tid = int(boxes.id[i]) if has_ids else None
            txt = f"{label} {conf*100:.0f}%" if tid is None else f"#{tid} {label} {conf*100:.0f}%"
            font = cv2.FONT_HERSHEY_SIMPLEX
            (tw, th), _ = cv2.getTextSize(txt, font, font_scale, text_thickness)
            bg_y1 = max(0, y1 - th - 12)
            cv2.rectangle(overlay, (x1, bg_y1), (x1 + tw + 10, y1), (25, 25, 28), -1)

    cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

    for r in results:
        boxes = r.boxes
        has_ids = boxes.id is not None
        for i, box in enumerate(boxes):
            conf = float(box.conf[0])
            if conf < conf_thresh: continue
            cid = int(box.cls[0])
            label = model.names[cid].capitalize()
            color = get_colour(cid)
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, box_thickness)
            tid = int(boxes.id[i]) if has_ids else None
            txt = f"{label} {conf*100:.0f}%" if tid is None else f"#{tid} {label} {conf*100:.0f}%"
            font = cv2.FONT_HERSHEY_SIMPLEX
            cv2.putText(frame, txt, (x1 + 5, y1 - 6), font, font_scale, (245, 245, 245), text_thickness, cv2.LINE_AA)
            counts[label] = counts.get(label, 0) + 1
            det_list.append({
                "label": label,
                "confidence": round(conf, 4),
                "box": [x1, y1, x2, y2],
                "track_id": tid
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
    return jsonify({"status": "VisionPro running", "model": "yolo11m"})

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": "yolo11m", "device": DEVICE})

@app.route("/api/detect/image", methods=["POST", "OPTIONS"])
def detect_image():
    if request.method == "OPTIONS": return jsonify({}), 200
    f = request.files["file"]
    conf = float(request.form.get("confidence", 0.10))
    t0 = time.time()

    img = cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]

    # GPU: two scales for max accuracy | CPU: single pass for speed
    all_boxes, all_scores, all_classes = [], [], []
    sizes = [INFER_SIZE, min(INFER_SIZE*2, 1280)] if DEVICE in ("mps","cuda") else [INFER_SIZE]

    for imgsz in sizes:
        res = model(img, conf=conf, verbose=False, device=DEVICE,
                    imgsz=imgsz, iou=0.4, augment=False)
        for r in res:
            for box in r.boxes:
                c = float(box.conf[0])
                if c < conf: continue
                all_boxes.append(box.xyxy[0].tolist())
                all_scores.append(c)
                all_classes.append(int(box.cls[0]))

    # Use NMS to remove duplicates across scales
    import torch
    if all_boxes:
        boxes_t  = torch.tensor(all_boxes, dtype=torch.float32)
        scores_t = torch.tensor(all_scores, dtype=torch.float32)
        from torchvision.ops import nms
        keep = nms(boxes_t, scores_t, iou_threshold=0.45)
        kept_boxes   = boxes_t[keep].tolist()
        kept_scores  = [all_scores[i] for i in keep.tolist()]
        kept_classes = [all_classes[i] for i in keep.tolist()]
    else:
        kept_boxes, kept_scores, kept_classes = [], [], []

    # Draw on image
    annotated = img.copy()
    counts   = {}
    det_list = []
    fh, fw = annotated.shape[:2]
    font_scale = max(0.38, fw / 2800)
    txt_thick  = max(1, int(fw / 1800))
    box_thick  = max(2, int(fw / 700))
    font = cv2.FONT_HERSHEY_SIMPLEX

    for (x1,y1,x2,y2), score, cid in zip(kept_boxes, kept_scores, kept_classes):
        x1,y1,x2,y2 = int(x1),int(y1),int(x2),int(y2)
        label = model.names[cid].capitalize()
        color = get_colour(cid)

        draw_corner_box(annotated, x1, y1, x2, y2, color, box_thick)

        txt = f"{label}  {score*100:.0f}%"
        (tw, th), _ = cv2.getTextSize(txt, font, font_scale, txt_thick)
        pad = 5
        ly1 = max(0, y1 - th - pad*2 - 2)
        ly2 = max(th + pad*2, y1)
        pill = annotated.copy()
        cv2.rectangle(pill, (x1, ly1), (x1+tw+pad*2+4, ly2), color, -1)
        cv2.addWeighted(pill, 0.28, annotated, 0.72, 0, annotated)
        cv2.rectangle(annotated, (x1, ly2-2), (x1+tw+pad*2+4, ly2), color, -1)
        cv2.putText(annotated, txt, (x1+pad+2, ly2-pad-1),
                    font, font_scale, (255,255,255), txt_thick, cv2.LINE_AA)

        counts[label] = counts.get(label, 0) + 1
        det_list.append({"label": label, "confidence": round(score, 4),
                         "box": [x1,y1,x2,y2], "track_id": None})

    return jsonify({
        "image":           to_b64(annotated),
        "detections":      counts,
        "detections_list": det_list,
        "total":           sum(counts.values()),
        "latency_ms":      int((time.time() - t0) * 1000),
    })

# ── VIDEO DETECTION ─────────────────────────────────────────────────────────
@app.route("/api/detect/video", methods=["POST", "OPTIONS"])
def detect_video():
    if request.method == "OPTIONS": return jsonify({}), 200
    f = request.files["file"]
    conf = float(request.form.get("confidence", 0.10))
    t0 = time.time()

    uid = uuid.uuid4().hex[:10]
    in_path  = os.path.join(UPLOAD_DIR, uid + "_" + secure_filename(f.filename or "video.mp4"))
    raw_path = os.path.join(OUTPUT_DIR, uid + "_raw.mp4")
    out_path = os.path.join(OUTPUT_DIR, uid + "_out.mp4")
    f.save(in_path)

    cap = cv2.VideoCapture(in_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    W   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # On CPU: process every 4th frame at 320px — ~10x faster than GPU mode
    # On GPU: process every frame at full resolution
    is_cpu = DEVICE == "cpu"
    SKIP   = 4   if is_cpu else 1    # process every Nth frame
    MAX_W  = 480 if is_cpu else W    # resize width on CPU
    ISIZE  = 320 if is_cpu else 640  # inference size

    # Resize if needed
    if W > MAX_W:
        scale = MAX_W / W
        PW, PH = int(W * scale), int(H * scale)
        PW = PW - (PW % 2)  # must be even for video writer
        PH = PH - (PH % 2)
    else:
        PW, PH = W, H

    # Reset tracker state so IDs start fresh for each video
    model.reset_callbacks()
    if hasattr(model, 'predictor') and model.predictor is not None:
        model.predictor = None

    writer = cv2.VideoWriter(raw_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (PW, PH))
    unique_ids, all_counts, n_frames = {}, {}, 0
    last_ann = None  # reuse for skipped frames
    # On CPU cap at 300 frames (~10s at 30fps) to prevent timeout
    MAX_FRAMES = 300 if is_cpu else 99999

    try:
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret: break
            if n_frames >= MAX_FRAMES: break  # CPU safety cap
            n_frames += 1
            frame_idx += 1

            # Resize frame if needed
            if PW != W or PH != H:
                frame = cv2.resize(frame, (PW, PH))

            if frame_idx % SKIP == 0 or last_ann is None:
                results = model.track(
                    frame, conf=conf, iou=0.35, persist=True,
                    tracker="bytetrack.yaml", verbose=False, device=DEVICE,
                    imgsz=ISIZE
                )
                last_ann, _, _ = draw(frame.copy(), results, conf)
                for r in results:
                    if r.boxes.id is None: continue
                    for box, tid in zip(r.boxes, r.boxes.id.int().tolist()):
                        if tid not in unique_ids:
                            label = model.names[int(box.cls[0])]
                            unique_ids[tid] = label
                            all_counts[label] = all_counts.get(label, 0) + 1
            writer.write(last_ann)
    finally:
        cap.release()
        writer.release()

    # ultrafast preset on CPU for speed, fast on GPU for quality
    preset = "ultrafast" if is_cpu else "fast"
    os.system(
        f'ffmpeg -y -i "{raw_path}" -vcodec libx264 -preset {preset} -crf 24 '
        f'-movflags +faststart "{out_path}" -loglevel error'
    )
    serve = out_path if os.path.exists(out_path) and os.path.getsize(out_path) > 0 else raw_path

    return jsonify({
        "video":          f"/api/video/{os.path.basename(serve)}",
        "video_url":      True,
        "detections":     all_counts,
        "total":          sum(all_counts.values()),
        "total_frames":   n_frames,
        "unique_tracks":  len(unique_ids),
        "fps":            round(fps, 2),
        "latency_ms":     int((time.time() - t0) * 1000),
    })

# ── LIVE WEBCAM — optimised for low lag ─────────────────────────────────────
_streaming     = False
_stream_lock   = threading.Lock()
_stream_conf   = 0.10
_frame_counts  = {}
_frame_history = []
_confirmed_objects = {}

def draw_corner_box(frame, x1, y1, x2, y2, color, thickness=2):
    """Aesthetic corner-bracket bounding box."""
    w = x2 - x1
    h = y2 - y1
    corner = max(10, min(30, int(min(w, h) * 0.20)))
    t = thickness
    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 1)
    cv2.addWeighted(overlay, 0.18, frame, 0.82, 0, frame)
    cv2.line(frame, (x1, y1), (x1+corner, y1), color, t, cv2.LINE_AA)
    cv2.line(frame, (x1, y1), (x1, y1+corner), color, t, cv2.LINE_AA)
    cv2.line(frame, (x2, y1), (x2-corner, y1), color, t, cv2.LINE_AA)
    cv2.line(frame, (x2, y1), (x2, y1+corner), color, t, cv2.LINE_AA)
    cv2.line(frame, (x1, y2), (x1+corner, y2), color, t, cv2.LINE_AA)
    cv2.line(frame, (x1, y2), (x1, y2-corner), color, t, cv2.LINE_AA)
    cv2.line(frame, (x2, y2), (x2-corner, y2), color, t, cv2.LINE_AA)
    cv2.line(frame, (x2, y2), (x2, y2-corner), color, t, cv2.LINE_AA)

def draw_live_hud(frame, counts, frame_idx):
    """Draw a premium HUD overlay on the live stream frame."""
    h, w = frame.shape[:2]
    total = sum(counts.values())
    n_classes = len(counts)

    # ── Top-left badge: pill with LIVE dot + count ──────────────────────────
    badge_txt  = f"  {total} object{'s' if total!=1 else ''}"
    font       = cv2.FONT_HERSHEY_SIMPLEX
    fs         = max(0.42, w / 1600)
    th         = max(1, int(w / 900))
    (tw, bh), _ = cv2.getTextSize(badge_txt, font, fs, th)
    pad = 8
    bx1, by1 = 12, 12
    bx2, by2 = bx1 + tw + pad*2 + 14, by1 + bh + pad*2

    # Semi-transparent dark pill
    overlay = frame.copy()
    cv2.rectangle(overlay, (bx1, by1), (bx2, by2), (18, 18, 22), -1)
    cv2.addWeighted(overlay, 0.82, frame, 0.18, 0, frame)
    cv2.rectangle(frame, (bx1, by1), (bx2, by2), (50, 50, 58), 1)  # subtle border

    # Pulsing red dot
    dot_r = max(4, int(bh * 0.32))
    dot_x = bx1 + pad + dot_r
    dot_y = by1 + pad + bh // 2
    pulse_alpha = 0.6 + 0.4 * abs(np.sin(frame_idx * 0.15))
    dot_color = tuple(int(c * pulse_alpha) for c in (60, 60, 220))  # BGR: red
    cv2.circle(frame, (dot_x, dot_y), dot_r, (50, 50, 220), -1, cv2.LINE_AA)
    cv2.circle(frame, (dot_x, dot_y), dot_r + 2, (80, 80, 255), 1, cv2.LINE_AA)

    # "LIVE" text in red-ish
    cv2.putText(frame, "LIVE", (dot_x + dot_r + 4, by1 + pad + bh - 1),
                font, fs * 0.78, (100, 110, 255), th, cv2.LINE_AA)

    # Object count text in white
    cv2.putText(frame, f"  {total} obj", (dot_x + dot_r + 34, by1 + pad + bh - 1),
                font, fs, (240, 240, 240), th, cv2.LINE_AA)

    # ── Bottom: detected class pills ────────────────────────────────────────
    if counts:
        pill_fs = max(0.36, w / 1900)
        pill_th = 1
        x_cursor = 12
        y_bottom = h - 14

        for cls, cnt in list(counts.items())[:6]:
            label = f"{cls}  ×{cnt}"
            (pw, ph), _ = cv2.getTextSize(label, font, pill_fs, pill_th)
            px1 = x_cursor
            px2 = px1 + pw + 14
            py1 = y_bottom - ph - 10
            py2 = y_bottom

            if px2 > w - 12: break  # don't overflow

            ov2 = frame.copy()
            cv2.rectangle(ov2, (px1, py1), (px2, py2), (18, 18, 22), -1)
            cv2.addWeighted(ov2, 0.78, frame, 0.22, 0, frame)
            cv2.rectangle(frame, (px1, py1), (px2, py2), (70, 70, 80), 1)

            color = get_colour(list(model.names.values()).index(cls.lower())
                               if cls.lower() in model.names.values() else 0)
            # color dot
            cv2.circle(frame, (px1 + 8, py1 + ph//2 + 5), 3, color, -1, cv2.LINE_AA)
            cv2.putText(frame, label, (px1 + 14, py2 - 5),
                        font, pill_fs, (230, 230, 230), pill_th, cv2.LINE_AA)
            x_cursor = px2 + 7

    return frame


def _mjpeg():
    global _streaming, _stream_conf, _frame_counts, _frame_history, _confirmed_objects

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    with _stream_lock:
        _streaming = True
        _frame_counts.clear()
        _frame_history.clear()
        _confirmed_objects.clear()

    frame_idx    = 0
    last_boxes   = []   # list of (x1,y1,x2,y2,label,conf,color) — persist across frames
    last_counts  = {}
    SKIP         = 3 if DEVICE == "cpu" else 2  # skip more frames on CPU

    try:
        while _streaming:
            ret, frame = cap.read()
            if not ret: break

            if frame_idx % SKIP == 0:
                # Run YOLO on this frame
                results = model(frame, conf=_stream_conf, imgsz=INFER_SIZE,
                                verbose=False, device=DEVICE,
                                iou=0.35)
                # Extract boxes for persistent overlay
                last_boxes  = []
                last_counts = {}
                h, w = frame.shape[:2]
                font_scale = max(0.38, w / 2800)
                txt_thick  = max(1, int(w / 1800))
                box_thick  = max(2, int(w / 700))

                for r in results:
                    boxes   = r.boxes
                    has_ids = boxes.id is not None
                    for i, box in enumerate(boxes):
                        conf = float(box.conf[0])
                        if conf < _stream_conf: continue
                        cid   = int(box.cls[0])
                        label = model.names[cid].capitalize()
                        color = get_colour(cid)
                        x1,y1,x2,y2 = map(int, box.xyxy[0].tolist())
                        tid   = int(boxes.id[i]) if has_ids else None
                        last_boxes.append((x1,y1,x2,y2,label,conf,color,tid,
                                           font_scale, txt_thick, box_thick))
                        last_counts[label] = last_counts.get(label, 0) + 1

                _frame_counts.clear()
                _frame_counts.update(last_counts)

                # Confirmed objects tracking
                _frame_history.append(dict(last_counts))
                if len(_frame_history) > 20: _frame_history.pop(0)
                if len(_frame_history) >= 5:
                    recent = _frame_history[-8:]
                    threshold = len(recent) * 0.6
                    for cls in set(c for f in recent for c in f):
                        seen = sum(1 for f in recent if f.get(cls, 0) > 0)
                        if seen >= threshold:
                            mx = max(f.get(cls, 0) for f in recent)
                            _confirmed_objects[cls] = mx

            # ── Always draw stored boxes on CURRENT frame (no blink!) ──────
            display = frame.copy()
            font = cv2.FONT_HERSHEY_SIMPLEX

            for (x1,y1,x2,y2,label,conf,color,tid,fs,tt,bt) in last_boxes:
                # Corner-bracket box
                draw_corner_box(display, x1, y1, x2, y2, color, bt)

                # Label pill
                txt = f"{label}  {conf*100:.0f}%" if tid is None else f"#{tid} {label}  {conf*100:.0f}%"
                (tw2, th2), _ = cv2.getTextSize(txt, font, fs, tt)
                pad2 = 5
                lx1  = x1
                ly1  = max(0, y1 - th2 - pad2*2 - 2)
                ly2  = max(th2 + pad2*2, y1)

                pill = display.copy()
                cv2.rectangle(pill, (lx1, ly1), (lx1+tw2+pad2*2+4, ly2), color, -1)
                cv2.addWeighted(pill, 0.28, display, 0.72, 0, display)
                cv2.rectangle(display, (lx1, ly2-2), (lx1+tw2+pad2*2+4, ly2), color, -1)
                cv2.putText(display, txt, (lx1+pad2+2, ly2-pad2-1),
                            font, fs, (255,255,255), tt, cv2.LINE_AA)

            # ── HUD overlay ─────────────────────────────────────────────────
            display = draw_live_hud(display, last_counts, frame_idx)

            # High quality encode
            _, buf = cv2.imencode(".jpg", display, [cv2.IMWRITE_JPEG_QUALITY, 88])
            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                + buf.tobytes() + b"\r\n"
            )
            frame_idx += 1

    finally:
        cap.release()
        with _stream_lock:
            _streaming = False


@app.route("/api/stream/webcam")
def webcam_stream():
    global _stream_conf, _frame_counts, _frame_history, _confirmed_objects
    _stream_conf = float(request.args.get("confidence", 0.10))
    return Response(
        stream_with_context(_mjpeg()),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/api/stream/counts")
def stream_counts():
    return jsonify({"counts": dict(_confirmed_objects)})

@app.route("/api/stream/stop", methods=["POST", "OPTIONS"])
def stream_stop():
    global _streaming
    if request.method == "OPTIONS": return jsonify({}), 200
    with _stream_lock: _streaming = False
    return jsonify({"status": "stopped"})

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
    if not os.path.exists(path):
        return jsonify({"error": "Video not found"}), 404
    return send_file(path, mimetype="video/mp4", conditional=True)

def _start_tunnel(port: int):
    global _ngrok_url
    import subprocess, threading, time as _time, re
    def try_cloudflare():
        global _ngrok_url
        try:
            proc = subprocess.Popen(
                ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
            )
            deadline = _time.time() + 15
            for line in proc.stdout:
                if _time.time() > deadline: break
                m = re.search(r"https://[\w\-]+\.trycloudflare\.com", line)
                if m:
                    _ngrok_url = m.group(0)
                    print(f"  🌐 Tunnel: {_ngrok_url}")
                    return True
        except Exception:
            pass
        return False
    threading.Thread(target=try_cloudflare, daemon=True).start()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    _start_tunnel(port)
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)