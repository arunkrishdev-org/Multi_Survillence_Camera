# AI-Based Smart Surveillance System

This project is a prototype for detecting and tracking missing vehicles across multi-camera networks.

## Features
- **Vehicle Detection**: YOLOv8
- **OCR**: License plate recognition for text matching.
- **Re-ID**: Feature extraction for visual similarity matching.
- **Tracking**: Persistent ID tracking across camera frames.

## Installation
1. Install Python 3.8+
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the dashboard:
   ```bash
   streamlit run app.py
   ```

## Note for Viva
- `detector.py` handles the primary object detection.
- `app.py` provides the Streamlit dashboard interface for police admins.
- `main.py` contains the core processing logic for video streams.
