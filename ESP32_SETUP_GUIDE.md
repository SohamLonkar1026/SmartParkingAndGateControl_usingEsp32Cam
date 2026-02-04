# ESP32-CAM Setup Guide for Smart Parking System

## Overview
This guide explains how to use your ESP32-CAM as a camera source instead of your laptop webcam for QR code scanning.

---

## Hardware Requirements
- **ESP32-CAM** (AI-Thinker model recommended)
- **FTDI Programmer** or USB-to-TTL adapter for flashing
- **Jumper wires**
- **Power supply** (5V recommended for stable camera operation)

---

## Step 1: Flash ESP32-CAM with Streaming Code

### 1.1 Open Arduino IDE
- Install **ESP32 Board Support** in Arduino IDE:
  - Go to `File > Preferences`
  - Add to "Additional Board Manager URLs": 
    ```
    https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
    ```
  - Go to `Tools > Board > Boards Manager`
  - Search for "ESP32" and install

### 1.2 Wire ESP32-CAM to FTDI Programmer
```
ESP32-CAM    →    FTDI
---------         ----
5V         →     VCC (5V)
GND        →     GND
U0R        →     TX
U0T        →     RX
IO0        →     GND (for programming mode)
```

### 1.3 Upload the Code
1. Open `ESP32/esp32_cam_qr_parking.ino` in Arduino IDE
2. **Update WiFi credentials** (lines 6-7):
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Select board: `Tools > Board > ESP32 Arduino > AI Thinker ESP32-CAM`
4. Select port: `Tools > Port > [Your COM Port]`
5. Click **Upload**
6. After upload completes, **disconnect IO0 from GND** and press RESET button

### 1.4 Get ESP32-CAM IP Address
1. Open Serial Monitor (115200 baud)
2. Press RESET button on ESP32-CAM
3. Note the IP address printed:
   ```
   WiFi connected
   Camera Stream URL: http://192.168.1.XXX/stream
   Camera initialized
   Camera server started on port 80
   ```

---

## Step 2: Use ESP32-CAM in Web Interface

### 2.1 Access the Web Interface
1. Make sure your server is running: `node server.js`
2. Open browser: http://localhost:3000

### 2.2 Switch to ESP32-CAM Mode
1. Click **"Switch to ESP32-CAM"** button
2. Enter the ESP32-CAM stream URL in the input field:
   ```
   http://192.168.1.XXX/stream
   ```
   (Replace `XXX` with your ESP32-CAM's IP address)
3. Click **"Start Camera"**
4. The ESP32-CAM video stream should appear

### 2.3 Test QR Scanning
- Point ESP32-CAM at a QR code containing a vehicle ID
- The system will automatically detect and process the QR code
- Check the "Last Scan" section for results

---

## Troubleshooting

### Camera Stream Not Loading
**Problem**: "Failed to connect to ESP32-CAM" error

**Solutions**:
1. Verify ESP32-CAM is powered on and connected to WiFi
2. Check if you can access the stream URL directly in browser
3. Ensure your laptop and ESP32-CAM are on the **same network**
4. Check firewall settings

### Poor Video Quality
**Problem**: Blurry or low-quality video

**Solutions**:
1. Increase `config.frame_size` in `.ino` file:
   ```cpp
   config.frame_size = FRAMESIZE_SVGA; // 800x600
   ```
2. Decrease `config.jpeg_quality` (lower = better quality):
   ```cpp
   config.jpeg_quality = 10;
   ```
3. Improve lighting conditions

### QR Code Not Detected
**Problem**: QR codes not being scanned

**Solutions**:
1. Ensure QR code is clearly visible and well-lit
2. Hold QR code 10-30cm from camera
3. Adjust ESP32-CAM focus (rotate lens slightly)
4. Increase frame size for better resolution

### ESP32-CAM Won't Connect to WiFi
**Problem**: Stuck at "Connecting to WiFi..."

**Solutions**:
1. Double-check WiFi SSID and password
2. Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
3. Move ESP32-CAM closer to router
4. Check Serial Monitor for error messages

### CORS Errors in Browser
**Problem**: Console shows CORS errors

**Solution**: The Arduino code already includes CORS headers:
```cpp
httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
```
If still having issues, clear browser cache and reload.

---

## Performance Tips

### 1. Optimize Frame Rate
Adjust in `.ino` file:
```cpp
config.frame_size = FRAMESIZE_VGA; // Balance between quality and speed
config.jpeg_quality = 12; // 10-63 (lower = better quality but slower)
config.fb_count = 2; // Use 2 frame buffers for smoother streaming
```

### 2. Proper Lighting
- ESP32-CAM performs best in good lighting
- Consider adding LED illumination for low-light environments

### 3. Network Stability
- Use a stable WiFi connection
- Keep ESP32-CAM close to router for better signal
- Consider using WiFi extender if needed

---

## Alternative: Direct ESP32 QR Scanning (Advanced)

If you want ESP32-CAM to **scan QR codes locally** and send results directly to the backend:

### Required Library
Install QR code detection library for ESP32:
- [ESP32-QRCode-Reader](https://github.com/alvarowolfx/ESP32-QRCode-Reader)

### Modify Code
Replace the Arduino code to:
1. Initialize QR reader
2. Capture frame from camera
3. Detect QR code locally
4. Send QR data via HTTP POST to `/api/scan`

This approach saves bandwidth but requires more processing power on ESP32.

---

## Network Configuration

### Same Network Required
Both your computer (running the web server) and ESP32-CAM must be on the **same local network**.

### Port Forwarding (Optional)
To access ESP32-CAM from outside your network:
1. Configure router port forwarding: External Port 8080 → ESP32-CAM IP:80
2. Use public IP in web interface: `http://YOUR_PUBLIC_IP:8080/stream`

---

## Quick Reference

### ESP32-CAM Pins (AI-Thinker)
```
GPIO 0  : Programming mode (connect to GND for upload)
GPIO 33 : Built-in LED (optional control)
5V/GND  : Power supply
U0T/U0R : Serial TX/RX
```

### Default Stream Endpoints
- **Video Stream**: `http://ESP32_IP/stream`
- **Port**: 80

### Web Interface Controls
- **Switch to ESP32-CAM**: Toggle camera source
- **Start Camera**: Begin streaming/scanning
- **Stop Camera**: Stop streaming
- **ESP32-CAM Stream URL**: Input field for stream endpoint

---

## Summary

✅ **What you did**:
1. Flashed ESP32-CAM with camera streaming code
2. Updated web interface to support ESP32-CAM stream
3. Added toggle between laptop webcam and ESP32-CAM

✅ **How to use**:
1. Power on ESP32-CAM
2. Open http://localhost:3000
3. Click "Switch to ESP32-CAM"
4. Enter stream URL: `http://[ESP32_IP]/stream`
5. Click "Start Camera"
6. Scan QR codes with ESP32-CAM!

---

For issues or questions, check the ESP32-CAM Serial Monitor output at 115200 baud.
