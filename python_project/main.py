import cv2
import torch
import numpy as np
from ultralytics import YOLO
import easyocr
import time

# UrbanTrack-DL Framework: Logic Core
# This module implements the Deep Learning pipeline for multi-camera Re-ID.

class UrbanTrackFramework:
    def __init__(self):
        print("[INFO] Initializing UrbanTrack-DL Framework...")
        # 1. Detection Engine (YOLOv8)
        self.detector = YOLO("yolov8n.pt")
        # 2. Recognition Engine (EasyOCR)
        self.reader = easyocr.Reader(['en'])
        # 3. Simulated Re-ID Embedding Engine (ResNet50 based)
        self.embedding_model = None # Placeholder for torch.load("reid_model.pt")
        
    def extract_features(self, vehicle_patch):
        """Simulates deep feature extraction (Re-ID)."""
        # In a real system, this would pass the patch through a ResNet/OsNet
        # and return a 1024 or 2048 dimensional vector.
        return np.random.rand(1024)

    def detect_and_crop_plate(self, vehicle_patch):
        """
        Specific sub-module to isolate the license plate from the vehicle.
        In a production system, this would be a specialized YOLO-LPR model.
        Here we use a heuristic sub-crop and pre-processing for the prototype.
        """
        h, w = vehicle_patch.shape[:2]
        # Heuristic: Plates are typically in the lower 60% of the vehicle area
        roi_y1 = int(h * 0.4)
        roi_patch = vehicle_patch[roi_y1:h, :]
        
        # Pre-processing for OCR clarity
        gray = cv2.cvtColor(roi_patch, cv2.COLOR_BGR2GRAY)
        # Apply sharpening to help OCR
        blur = cv2.GaussianBlur(gray, (0,0), 3)
        sharpened = cv2.addWeighted(gray, 1.5, blur, -0.5, 0)
        
        return sharpened

    def process_camera_stream(self, frame, camera_metadata):
        """Standard framework pipeline for a single camera frame."""
        # A. Detection & Instance Segmentation
        results = self.detector(frame, verbose=False)
        processed_data = []

        for r in results:
            for box in r.boxes:
                # B. Bbox extraction
                coords = box.xyxy[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                cls_id = int(box.cls[0].cpu().numpy())
                
                # Filter for vehicle classes (car, motorcycle, bus, truck)
                if cls_id not in [2, 3, 5, 7]:
                    continue

                # C. Re-ID Feature Extraction
                x1, y1, x2, y2 = map(int, coords)
                vehicle_patch = frame[y1:y2, x1:x2]
                
                if vehicle_patch.size > 0:
                    features = self.extract_features(vehicle_patch)
                    
                    # D. License Plate Extraction Pillar
                    plate_crop = self.detect_and_crop_plate(vehicle_patch)
                    
                    try:
                        # OCR on the specific plate crop
                        ocr_results = self.reader.readtext(plate_crop)
                        
                        plate_number = "UNKNOWN"
                        max_prob = 0
                        
                        for (bbox, text, prob) in ocr_results:
                            # Clean string for standard Indian format (e.g., TN01AB1234)
                            clean_text = "".join(e for e in text if e.isalnum()).upper()
                            if len(clean_text) >= 5 and prob > max_prob:
                                plate_number = clean_text
                                max_prob = prob
                    except Exception as e:
                        print(f"[DEBUG] OCR Pipeline Exception: {e}")
                        plate_number = "ERROR"
                    
                    processed_data.append({
                        "cam_id": camera_metadata['id'],
                        "bbox": coords,
                        "features": features,
                        "plate": plate_number,
                        "confidence": float(conf),
                        "timestamp": time.time()
                    })
        
        return processed_data

if __name__ == "__main__":
    framework = UrbanTrackFramework()
    print("[SUCCESS] Framework Online. Urban environment monitoring active.")
