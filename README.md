<div align="center">

```
██╗   ██╗██╗███████╗██╗ ██████╗ ███╗   ██╗    ██████╗ ██████╗  ██████╗
██║   ██║██║██╔════╝██║██╔═══██╗████╗  ██║    ██╔══██╗██╔══██╗██╔═══██╗
██║   ██║██║███████╗██║██║   ██║██╔██╗ ██║    ██████╔╝██████╔╝██║   ██║
╚██╗ ██╔╝██║╚════██║██║██║   ██║██║╚██╗██║    ██╔═══╝ ██╔══██╗██║   ██║
 ╚████╔╝ ██║███████║██║╚██████╔╝██║ ╚████║    ██║     ██║  ██║╚██████╔╝
  ╚═══╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝
```

**Real-Time Object Detection · High Accuracy · Minimal Latency**

[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6B35?style=for-the-badge)](https://ultralytics.com)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.x-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)
[![B.Tech Project](https://img.shields.io/badge/B.Tech-AI%20%26%20Data%20Science-FF4081?style=for-the-badge)]()

</div>

---

## What is Vision Pro?

**Vision Pro** is a high-performance, real-time object detection system built for speed without sacrificing accuracy. It ingests live webcam feeds or pre-recorded video, runs inference through a state-of-the-art deep learning model, and overlays labeled bounding boxes — all in real time.

Built as a comprehensive academic project for the **B.Tech in Artificial Intelligence and Data Science** curriculum, it is designed with a clean, modular architecture that makes it straightforward to extend, retrain, or integrate into larger pipelines.

---

## Features

| | Feature | Description |
|---|---|---|
| ⚡ | **Real-Time Processing** | Optimized inference pipeline with minimal frame-drop latency |
| 🎯 | **High Accuracy** | State-of-the-art model with precise bounding boxes and class labels |
| 📊 | **Live Metrics** | Per-frame FPS counter and confidence score overlay |
| 🧩 | **Modular Design** | Clean separation of detection logic, rendering, and utilities |
| 🎬 | **Flexible Input** | Supports webcam streams, local video files, and image directories |
| 🪶 | **Minimal Overhead** | Lean dependency footprint — no bloat, just performance |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                      Vision Pro                         │
│                                                         │
│  Language    →  Python 3.8+                             │
│  ML Engine   →  PyTorch / TensorFlow                    │
│  CV Library  →  OpenCV 4.x                              │
│  Model       →  YOLOv8 / SSD                            │
└─────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Python **3.8 or higher**
- A webcam or video file for input
- Recommended: a virtual environment

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/yourusername/vision-pro.git
cd vision-pro
```

**2. Set up a virtual environment**

```bash
# Create the environment
python -m venv venv

# Activate it
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

---

## Usage

### Run on live webcam

```bash
python main.py --source 0
```

### Run on a video file

```bash
python main.py --source data/test_video.mp4
```

### Run on a folder of images

```bash
python main.py --source data/images/
```

> **Tip:** Add `--conf 0.5` to filter detections below 50% confidence, or `--save` to write annotated output to disk.

---

## Project Structure

```
vision-pro/
│
├── data/                   # Sample images and test video files
│
├── models/                 # Pre-trained weights and config files
│
├── src/
│   ├── detector.py         # Core detection logic and model inference
│   └── utils.py            # Rendering helpers and performance metrics
│
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
└── README.md               # Project documentation
```

---

## How It Works

```
Input Source         Preprocessing        Model Inference      Post-processing
(webcam / video)  →  (resize, normalize) →  (YOLOv8 / SSD)  →  (NMS, bounding boxes)
                                                                        │
                                                               Display / Save Output
                                                           (annotated frames + metrics)
```

1. **Frame capture** — OpenCV grabs each frame from the selected source.
2. **Preprocessing** — Frames are resized and normalized to match the model's input spec.
3. **Inference** — The ML model outputs raw detections (class, confidence, coordinates).
4. **Post-processing** — Non-Maximum Suppression filters overlapping boxes; labels are rendered.
5. **Display** — Annotated frames stream back to screen with live FPS and confidence overlays.

---

## Performance

| Metric | Value |
|---|---|
| Target FPS | 25–30 fps (CPU), 60+ fps (GPU) |
| Input Resolution | 640 × 640 (default) |
| Supported Classes | 80 (COCO dataset) |
| Confidence Threshold | 0.25 (configurable) |

---

## Author

<div align="center">

**Inderjeet Singh**
*B.Tech — Artificial Intelligence & Data Science*

[![Portfolio](https://img.shields.io/badge/Portfolio-inderjeet.online-000000?style=for-the-badge&logo=safari&logoColor=white)](https://inderjeet.online)
[![GitHub](https://img.shields.io/badge/GitHub-@yourusername-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yourusername)

</div>

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

*If this project helped you, consider leaving a ⭐ on GitHub.*

</div>
