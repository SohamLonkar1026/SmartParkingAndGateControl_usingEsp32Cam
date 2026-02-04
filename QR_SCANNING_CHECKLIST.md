# 🎯 ESP32-CAM QR Scanning - Final Checklist

## ✅ Server is Running
- Node.js server started with proxy enabled
- Proxy route: `/esp32-proxy` (handles CORS)

---

## 🧪 Step-by-Step Testing

### Step 1: Refresh Browser
```
Press: Ctrl + Shift + R
URL: http://localhost:3000
```

### Step 2: Open Browser Console
```
Press: F12
Go to "Console" tab
```

### Step 3: Switch to ESP32-CAM Mode
1. Click **"Switch to ESP32-CAM"** button
2. URL field appears with: `http://10.102.251.93:81/`

### Step 4: Test Connection
1. Click **"🔍 Test"** button
2. Wait for result:
   - ✅ **Green "Connected!"** = Good! Continue to Step 5
   - ❌ **Red "Cannot connect"** = See troubleshooting below

### Step 5: Start Camera
1. Click **"Start Camera"** button
2. **Watch console** for these messages:
   ```
   🔄 Loading ESP32-CAM stream from: http://10.102.251.93:81/
   📡 Final URL: /esp32-proxy?url=http%3A%2F%2F10.102.251.93%3A81%2F
   [ESP32-PROXY] Proxying stream from: http://10.102.251.93:81/
   ✅ ESP32-CAM image loaded successfully
   ✅ ESP32-CAM stream ready, starting scan loop
   📏 Stream size: 640 x 480
   ```

### Step 6: Enable Debug View (Optional)
1. Click **"🔍 Debug View"** button
2. Should see semi-transparent overlay on video
3. Canvas should match video (not distorted)

### Step 7: Scan QR Code
1. Hold QR code **15-20 cm** from ESP32-CAM
2. Keep steady for **2 seconds**
3. **Watch console** for:
   ```
   ESP32-CAM: Frame 60, Size 640x480, Scanning...
   Sample pixel value: 125
   ✅ QR DETECTED from ESP32-CAM: ABC123
   ```

### Step 8: Check for Pop-up
- **Blue pop-up** (top): Entry detected
- **Red pop-up** (bottom): Exit detected
- **Green flash** (center): QR code detected

---

## 🐛 Troubleshooting

### Problem: Test Button Shows Red ❌

**Solution 1: Check ESP32-CAM Power**
```
- Red LED should be on
- Serial Monitor should show: "WiFi connected"
```

**Solution 2: Verify IP Address**
1. Open Arduino IDE Serial Monitor (115200 baud)
2. Press RESET on ESP32-CAM
3. Look for: `Camera Stream Ready: http://[IP]:81`
4. Update URL in web interface if different

**Solution 3: Test URL Directly**
1. Open new browser tab
2. Go to: `http://10.102.251.93:81/`
3. Should see video stream immediately

### Problem: Black Screen After Start Camera

**Check Console for:**
```
❌ ESP32-CAM stream failed to load
Stream size: 0 x 0
```

**Solution:**
1. Stop camera
2. Change URL to: `http://10.102.251.93:81/stream` (add /stream)
3. Test again
4. Try also: `http://10.102.251.93/stream` (port 80)

### Problem: Video Loads But No QR Detection

**Check Console for CORS Error:**
```
SecurityError: Failed to execute 'getImageData'
The canvas has been tainted by cross-origin data
```

**Solution:**
- Proxy should be enabled (already done)
- Check server console shows: `[ESP32-PROXY] Proxying stream from...`
- If not, restart server: Ctrl+C then `npm start`

**Check Console for:**
```
ESP32-CAM: Frame 60, Size 640x480, Scanning...
Sample pixel value: 0  ← BAD (should be 1-255)
```

**If pixel value is 0:**
- Canvas is not drawing from stream
- Try refreshing browser
- Try stopping and restarting camera

### Problem: QR Code Not Detected (But Scanning)

**Console shows:**
```
ESP32-CAM: Frame 120, Size 640x480, Scanning...
Sample pixel value: 125  ← GOOD
Scanning... (no QR detected yet)  ← QR not found
```

**Solution 1: QR Code Quality**
- Use **printed QR code** (better than phone screen)
- Ensure **high contrast** (black on white)
- Size: Minimum **3cm x 3cm**

**Solution 2: Distance & Focus**
- Try **15-20 cm** from camera
- Hold **steady** for 2 seconds
- Ensure QR code is **flat** (not tilted)

**Solution 3: Lighting**
- Add more light
- Avoid shadows on QR code
- Avoid glare/reflection

**Solution 4: Camera Focus**
- ESP32-CAM lens might be out of focus
- Gently rotate lens barrel counter-clockwise
- Test at different distances (10cm, 15cm, 20cm, 25cm)

---

## 📊 Expected Console Output (Success)

```javascript
// When you start camera:
🔄 Loading ESP32-CAM stream from: http://10.102.251.93:81/
📡 Final URL: /esp32-proxy?url=http%3A%2F%2F10.102.251.93%3A81%2F
✅ ESP32-CAM image loaded successfully
✅ ESP32-CAM stream ready, starting scan loop
📏 Stream size: 640 x 480
Starting ESP32-CAM scan loop...
ESP32-CAM scan started, rafId: 123

// Every 2 seconds:
ESP32-CAM: Frame 60, Size 640x480, Scanning...
Sample pixel value: 125
ESP32-CAM: Frame 120, Size 640x480, Scanning...
Sample pixel value: 130

// When QR code detected:
✅ QR DETECTED from ESP32-CAM: ABC123
QR Code scanned: ABC123
Vehicle entry: ABC123 Slot: c1
```

## 📊 Server Console Output (Success)

```bash
[DB] SQLite database found. Ensuring schema...
[SERVER] Smart Parking running at http://localhost:3000
[ESP32-PROXY] Proxying stream from: http://10.102.251.93:81/
```

---

## 🎯 Quick Commands

### Check if Stream is Working:
Open in browser: `http://10.102.251.93:81/`

### Check Server Status:
Look for: `[ESP32-PROXY] Proxying stream from...`

### Enable/Disable Debug Canvas:
Click: **"🔍 Debug View"** button

### Test QR Detection Manually:
```javascript
// Paste in browser console:
console.log('Image:', mjpegImg.src);
console.log('Size:', mjpegImg.naturalWidth, 'x', mjpegImg.naturalHeight);
console.log('Canvas:', canvas.width, 'x', canvas.height);
console.log('rafId:', rafId);
```

---

## ✅ Success Criteria

You know it's working when:
- ✅ Test button shows green
- ✅ Video stream visible (not black)
- ✅ Console shows frame count increasing
- ✅ Sample pixel values are 1-255 (not 0)
- ✅ QR code detection happens within 2 seconds
- ✅ Blue/red popup appears
- ✅ "Last Scan" section updates

---

## 🚀 Current Settings

- **Resolution**: 640x480 (VGA)
- **Quality**: JPEG 8 (high quality)
- **Proxy**: ENABLED (required for CORS)
- **Debug**: Available (click button to toggle)
- **Scan method**: jsQR with `attemptBoth` inversion

---

## 📝 If Still Not Working

1. **Screenshot** browser console
2. **Screenshot** server console  
3. **Screenshot** ESP32-CAM Serial Monitor
4. **Check** if direct URL works: `http://10.102.251.93:81/`
5. **Try** different QR code generator
6. **Test** webcam mode (should work immediately)

The quality in your image looked perfect, so it's definitely a technical/code issue, not camera quality!
