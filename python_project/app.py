import streamlit as st
import cv2
import tempfile
import time
import pandas as pd
from PIL import Image
import sys
import os

# Add current directory to path to import local modules
sys.path.append(os.path.dirname(__file__))
from utils.rto_verification import get_vehicle_details, validate_vehicle_number
from utils.video_stream import VideoStreamer, simulate_detection

# Streamlit App for Police Admin Dashboard

st.set_page_config(page_title="SmartTrack Surveillance", layout="wide")

# Initialize VideoStreamer
if 'streamer' not in st.session_state:
    st.session_state.streamer = VideoStreamer()

st.title("🚓 SmartTrack: Chennai City Police AI Surveillance")

# Initialize session state for verification
if 'verified' not in st.session_state:
    st.session_state.verified = False
if 'confirmed' not in st.session_state:
    st.session_state.confirmed = False
if 'target_details' not in st.session_state:
    st.session_state.target_details = None

with st.sidebar:
    st.header("Search Parameters")
    search_type = st.radio("Search By", ["Vehicle Number", "Image Upload"])
    feed_mode = st.selectbox("System Input Mode", ["Traffic CCTV Dataset (Looped)"])
    
    if search_type == "Vehicle Number":
        search_query = st.text_input("Enter Plate Number", placeholder="e.g. TN01AB1234")
        
        if st.button("🔍 Verify VAHAN Data"):
            result = get_vehicle_details(search_query)
            if "error" in result:
                st.error(result["error"])
                st.session_state.verified = False
            elif result["status"] == "not_found":
                st.warning(f"Vehicle {result['plate']} not found in RTO database.")
                st.session_state.verified = False
            else:
                st.success(f"Vehicle Found: {result['plate']}")
                st.session_state.target_details = result["data"]
                st.session_state.target_plate = result["plate"]
                st.session_state.verified = True
        
        # Display Verification Card
        if st.session_state.verified and st.session_state.target_details:
            details = st.session_state.target_details
            with st.container(border=True):
                st.markdown(f"### 📋 RTO Details: {st.session_state.target_plate}")
                st.write(f"**Owner:** {details['owner_name']}")
                st.write(f"**Model:** {details['vehicle_model']}")
                st.write(f"**Reg Date:** {details['registration_date']}")
                st.write(f"**Insurance:** {details['insurance_valid']}")
                st.write(f"**RTO:** {details['rto']}")
                
                if "STOLEN" in details['status']:
                    st.error(f"🚩 STATUS: {details['status']}")
                else:
                    st.info(f"STATUS: {details['status']}")
                
                if st.button("✅ Confirm & Start Tracking"):
                    st.session_state.confirmed = True
                    st.balloons()
        
    else:
        uploaded_file = st.file_uploader("Upload Vehicle Snapshot", type=["jpg", "png", "jpeg"])
        if uploaded_file is not None:
            st.image(uploaded_file, caption="Target Vehicle")
            if st.button("Confirm Target Image"):
                st.session_state.confirmed = True

    if st.session_state.confirmed:
        st.success("🎯 Tracking Active")
        if st.button("Reset Search"):
            st.session_state.confirmed = False
            st.session_state.verified = False
            st.rerun()

col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("Chennai City Live Feeds (4-Zone Monitor)")
    
    # Persistent session state for camera control
    if 'streaming' not in st.session_state:
        st.session_state.streaming = True # Default to True for live feel

    def toggle_stream():
        st.session_state.streaming = not st.session_state.streaming

    st.button("Toggle System Live Feeds", on_click=toggle_stream)
    
    # 2x2 Grid Layout
    row1 = st.columns(2)
    row2 = st.columns(2)
    
    placeholders = [
        row1[0].empty(), row1[1].empty(),
        row2[0].empty(), row2[1].empty()
    ]

    if st.session_state.streaming:
        if "Dataset" in feed_mode:
            # Multi-Camera Dataset Simulation
            sources = st.session_state.streamer.get_sources()
            cam_ids = list(sources.keys())
            
            while st.session_state.streaming:
                timestamp = time.strftime('%H:%M:%S')
                for i, cam_id in enumerate(cam_ids):
                    frame = st.session_state.streamer.get_frame(cam_id)
                    if frame is not None:
                        # Apply simulated detection pipeline
                        frame_with_det = simulate_detection(frame.copy(), cam_id, timestamp)
                        # RGB conversion for Streamlit
                        frame_rgb = cv2.cvtColor(frame_with_det, cv2.COLOR_BGR2RGB)
                        placeholders[i].image(
                            frame_rgb, 
                            caption=f"{cam_id}: {sources[cam_id]['name']} | {sources[cam_id]['type']} | LIVE", 
                            use_container_width=True
                        )
                time.sleep(0.01) # Yield for Streamlit
        else:
            # Hardware Webcam Mode
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                st.warning("🔄 Webcam hardware not detected. Switching to synthetic fallback.")
                cam_names = ["Anna Salai", "T. Nagar", "Koyambedu", "OMR IT Corridor"]
                for i, placeholder in enumerate(placeholders):
                    placeholder.image(
                        f"https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=600&cam={i}", 
                        caption=f"CAM 0{i+1}: {cam_names[i]} | HARDWARE ERROR FALLBACK", 
                        use_container_width=True
                    )
            else:
                prev_time = time.time()
                cam_names = ["Hardware-01", "H-Flip", "V-Rotate", "Infrared-Sim"]
                while st.session_state.streaming:
                    ret, frame = cap.read()
                    if not ret: break
                    
                    curr_time = time.time()
                    fps = 1 / (max(curr_time - prev_time, 0.001))
                    prev_time = curr_time
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    
                    feeds = [
                        frame_rgb, 
                        cv2.flip(frame_rgb, 1), 
                        cv2.rotate(frame_rgb, cv2.ROTATE_90_CLOCKWISE),
                        cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
                    ]

                    for i, placeholder in enumerate(placeholders):
                        placeholder.image(
                            feeds[i], 
                            caption=f"CAM: {cam_names[i]} | LIVE | {fps:.1f} FPS", 
                            use_container_width=True
                        )
                    time.sleep(0.01)
                cap.release()
    else:
        # Static placeholders
        placeholders[0].image("https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=600", caption="CAM 01: Offline")
        placeholders[1].image("https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600", caption="CAM 02: Offline")
        placeholders[2].image("https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=600", caption="CAM 03: Offline")
        placeholders[3].image("https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?auto=format&fit=crop&q=80&w=600", caption="CAM 04: Offline")

with col2:
    st.subheader("Match Alerts")
    if st.session_state.confirmed:
        plate = st.session_state.get('target_plate', 'Unknown Target')
        st.success(f"MATCH FOUND: {plate}")
        st.metric("Detection Confidence", "98.5%")
        st.write("**Recent Spot:** Anna Salai Junction")
        st.write(f"**Timestamp:** {time.strftime('%H:%M:%S')}")
        st.button("💾 Save Evidence Snapshot")
        
        with st.expander("Re-ID Feature Map"):
            st.image("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200", caption="Target Signature")
            st.caption("Deep Learning Embedding Match: 0.942")
    else:
        st.info("System Standby. Please verify and confirm a vehicle target in the sidebar to begin active surveillance.")

    st.subheader("Search History")
    history_data = {
        "Time": ["10:30", "10:15", "09:45"],
        "Plate": ["KA01MN5566", "TN07XY9988", "MH12ZR1122"],
        "Result": ["No Match", "Spotted Cam 2", "No Match"]
    }
    st.table(pd.DataFrame(history_data))
