import cv2
import time
import os

class VideoStreamer:
    """
    Manages multiple video sources to simulate a multi-camera network.
    Sources are simulated based on the Traffic Camera Object Detection Dataset 
    (Kaggle: ryankraus/traffic-camera-object-detection).
    """
    
    def __init__(self):
        # Publicly available sample traffic video URLs for simulation
        # Referencing patterns from Ryankraus Dataset for multi-cam context
        self.sources = {
            "CAM-01": {
                "name": "Anna Salai Junction",
                "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4",
                "type": "Junction (Ref: Kaggle-TRAFFIC)"
            },
            "CAM-02": {
                "name": "T. Nagar Main Road",
                "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
                "type": "Highway (Ref: Kaggle-TRAFFIC)"
            },
            "CAM-03": {
                "name": "Koyambedu Signal",
                "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4",
                "type": "Intersection (Ref: Kaggle-TRAFFIC)"
            },
            "CAM-04": {
                "name": "OMR IT Corridor",
                "url": "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4",
                "type": "CCTV-Private (Ref: Kaggle-TRAFFIC)"
            }
        }
        self.caps = {}

    def get_sources(self):
        return self.sources

    def get_frame(self, cam_id):
        """Reads a frame and restarts the video if it reaches the end."""
        if cam_id not in self.caps:
            self.caps[cam_id] = cv2.VideoCapture(self.sources[cam_id]["url"])
            
        cap = self.caps[cam_id]
        ret, frame = cap.read()
        
        if not ret:
            # Loop the video
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            
        if ret:
            # Resize for consistent display
            frame = cv2.resize(frame, (640, 360))
            return frame
        return None

    def release_all(self):
        for cap in self.caps.values():
            cap.release()
        self.caps = {}

def simulate_detection(frame, cam_id, timestamp):
    """
    Simulates YOLO-style detection by drawing bounding boxes.
    This is a placeholder for the actual AI detection pipeline.
    """
    h, w, _ = frame.shape
    # Draw digital monitor aesthetic
    cv2.putText(frame, f"REC [LIVE]", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    cv2.putText(frame, f"{cam_id} // {timestamp}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    # Simulate dynamic detections based on camera ID
    if "01" in cam_id:
        cv2.rectangle(frame, (100, 150), (250, 280), (0, 255, 0), 2)
        cv2.putText(frame, "CAR: TN01-BD-22", (100, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
    elif "02" in cam_id:
        cv2.rectangle(frame, (300, 100), (450, 230), (0, 255, 0), 2)
        cv2.putText(frame, "BIKE: TN10-X-442", (300, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
    elif "03" in cam_id:
        cv2.rectangle(frame, (250, 200), (400, 350), (0, 255, 0), 2)
        cv2.putText(frame, "TRUCK: PY01-Z-99", (250, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
    else:
        cv2.rectangle(frame, (50, 50), (150, 150), (0, 255, 0), 2)
        cv2.putText(frame, "AUTO: TN01-9921", (50, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
    
    return frame
