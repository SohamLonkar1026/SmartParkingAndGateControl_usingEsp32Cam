const video = document.getElementById('video');
const mjpegImg = document.getElementById('mjpegImg');
const canvas = document.getElementById('canvas');
const statusEl = document.getElementById('status');
const lastScanEl = document.getElementById('lastScan');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const slotPopup = document.getElementById('slotPopup');
const slotText = document.getElementById('slotText');
const exitPopup = document.getElementById('exitPopup');
const exitText = document.getElementById('exitText');
const scanIndicator = document.getElementById('scanIndicator');
const esp32UrlInput = document.getElementById('esp32Url');
const toggleSourceBtn = document.getElementById('toggleSource');
const sourceIndicator = document.getElementById('sourceIndicator');
const debugCanvasBtn = document.getElementById('debugCanvas');
const testUrlBtn = document.getElementById('testUrl');
const urlStatus = document.getElementById('urlStatus');

const regId = document.getElementById('regId');
const regPlate = document.getElementById('regPlate');
const regOwner = document.getElementById('regOwner');
const regType = document.getElementById('regType');
const regBtn = document.getElementById('regBtn');
const regStatus = document.getElementById('regStatus');
const vehiclesBody = document.getElementById('vehiclesBody');
const refreshVehicles = document.getElementById('refreshVehicles');
const logsBody = document.getElementById('logsBody');
const refreshLogs = document.getElementById('refreshLogs');
const priceType = document.getElementById('priceType');
const priceRate = document.getElementById('priceRate');
const savePrice = document.getElementById('savePrice');
const loadPrices = document.getElementById('loadPrices');
const pricingList = document.getElementById('pricingList');

let mediaStream = null;
let rafId = null;
let lastScanValue = '';
let lastScanAt = 0;
// Load saved camera preference from localStorage
let useESP32 = localStorage.getItem('useESP32') === 'true' || false;
const scanCooldownMs = 30000; // 30 seconds cooldown for same vehicle

// Load saved ESP32-CAM URL from localStorage
if (esp32UrlInput && localStorage.getItem('esp32Url')) {
  esp32UrlInput.value = localStorage.getItem('esp32Url');
}

// Update UI based on saved preference
if (toggleSourceBtn) {
  toggleSourceBtn.textContent = useESP32 ? 'Switch to Webcam' : 'Switch to ESP32-CAM';
}
if (useESP32) {
  const esp32UrlSection = document.getElementById('esp32UrlSection');
  if (esp32UrlSection) esp32UrlSection.style.display = 'block';
}

function showScanIndicator() {
  if (!scanIndicator) return;
  scanIndicator.style.display = 'block';
  setTimeout(() => {
    scanIndicator.style.display = 'none';
  }, 1000);
}

function showSlotPopup(slot, vehicleId) {
  if (!slotPopup || !slotText) return;
  slotText.textContent = `SLOT ${slot.toUpperCase()} - VEHICLE ${vehicleId}`;
  slotPopup.style.display = 'block';
  
  // Play success sound (optional)
  playBeep(800, 200);
  
  setTimeout(() => {
    slotPopup.style.display = 'none';
  }, 6000); // Hide after 6 seconds
}

function showExitPopup(vehicleId, fee, duration) {
  if (!exitPopup || !exitText) return;
  exitText.textContent = `${vehicleId} - ₹${fee} (${duration} min)`;
  exitPopup.style.display = 'block';
  
  // Play exit sound (optional)
  playBeep(600, 200);
  
  setTimeout(() => {
    exitPopup.style.display = 'none';
  }, 6000); // Hide after 6 seconds
}

function playBeep(frequency = 800, duration = 200) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {
    // Audio not supported or blocked
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

async function startCamera() {
  try {
    // Check if already running
    if (rafId !== null) {
      setStatus('Camera already running');
      return;
    }
    
    if (useESP32) {
      // Use ESP32-CAM stream (using img tag for MJPEG compatibility)
      const esp32Url = esp32UrlInput?.value?.trim();
      if (!esp32Url) {
        setStatus('Please enter ESP32-CAM stream URL');
        return;
      }
      setStatus('Connecting to ESP32-CAM...');
      
      // Clear any previous sources
      video.srcObject = null;
      video.style.display = 'none';
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
      
      // Use img element for MJPEG streams (works better than video)
      mjpegImg.style.display = 'block';
      
      // Use proxy to avoid CORS issues with canvas.getImageData()
      const useProxy = true; // Proxy required for QR scanning
      const finalUrl = useProxy ? `/esp32-proxy?url=${encodeURIComponent(esp32Url)}` : esp32Url;
      
      mjpegImg.onerror = (e) => {
        console.error('MJPEG Image load error');
        console.error('URL:', finalUrl);
        setStatus('Failed to load ESP32-CAM stream. Check: ' + esp32Url);
      };
      
      mjpegImg.onload = () => {
        console.log('✅ ESP32-CAM image loaded successfully');
      };
      
      console.log('🔄 Loading ESP32-CAM stream from:', esp32Url);
      console.log('📡 Final URL:', finalUrl);
      mjpegImg.src = finalUrl;
      
      // Start scanning after delay to let stream initialize
      setTimeout(() => {
        // Check if image actually loaded
        if (mjpegImg.naturalWidth > 0 && mjpegImg.naturalHeight > 0) {
          console.log('✅ ESP32-CAM stream ready, starting scan loop');
          console.log('📏 Stream size:', mjpegImg.naturalWidth, 'x', mjpegImg.naturalHeight);
          setStatus('Scanning for QR code... (ESP32-CAM)');
          if (sourceIndicator) sourceIndicator.textContent = '📷 ESP32-CAM';
          scanLoopESP32();
        } else {
          console.warn('⚠️ ESP32-CAM stream not loaded yet, retrying...');
          console.log('Image dimensions:', mjpegImg.naturalWidth, 'x', mjpegImg.naturalHeight);
          console.log('Display dimensions:', mjpegImg.width, 'x', mjpegImg.height);
          setStatus('Waiting for ESP32-CAM stream...');
          // Retry after another second
          setTimeout(() => {
            if (mjpegImg.naturalWidth > 0) {
              console.log('✅ Stream loaded on retry');
              setStatus('Scanning for QR code... (ESP32-CAM)');
              if (sourceIndicator) sourceIndicator.textContent = '📷 ESP32-CAM';
              scanLoopESP32();
            } else {
              console.error('❌ ESP32-CAM stream failed to load');
              setStatus('ESP32-CAM stream not loading. Check connection.');
            }
          }, 1500);
        }
      }, 1000);
      
    } else {
      // Use laptop webcam
      setStatus('Requesting camera access...');
      
      // Clear any previous ESP32 source
      video.src = '';
      
      // Show video, hide img
      video.style.display = 'block';
      mjpegImg.style.display = 'none';
      
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = mediaStream;
      await video.play();
      setStatus('Scanning for QR code... (Webcam)');
      if (sourceIndicator) sourceIndicator.textContent = '💻 Laptop Webcam';
      scanLoop();
    }
  } catch (err) {
    console.error('Camera error:', err);
    setStatus('Failed to access camera. Please allow permission and ensure a webcam is connected.');
  }
}

function stopCamera() {
  try {
    console.log('Stopping camera...');
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    video.srcObject = null;
    video.src = '';
    video.pause();
    mjpegImg.src = '';
    mjpegImg.style.display = 'none';
    video.style.display = 'block';
    setStatus('Camera stopped.');
    if (sourceIndicator) sourceIndicator.textContent = '';
    console.log('Camera stopped successfully');
  } catch (e) {
    console.error('Error stopping camera:', e);
  }
}

function debounceSameScan(value) {
  const now = Date.now();
  const timeSinceLastScan = now - lastScanAt;
  
  // Same vehicle scanned again
  if (value === lastScanValue) {
    // If less than 30 seconds, block it (prevents immediate entry->exit)
    if (timeSinceLastScan < scanCooldownMs) {
      const remainingSeconds = Math.ceil((scanCooldownMs - timeSinceLastScan) / 1000);
      console.log(`⏱️ Same vehicle (${value}) - Wait ${remainingSeconds}s before next scan`);
      setStatus(`Please wait ${remainingSeconds}s before scanning ${value} again`);
      return true; // Block the scan
    }
  }
  
  // Different vehicle OR cooldown period passed
  lastScanValue = value;
  lastScanAt = now;
  return false; // Allow the scan
}

async function handleQr(qr) {
  if (!qr) return;
  const value = String(qr.data || qr).trim();
  if (!value) return;
  if (debounceSameScan(value)) {
    return; // skip duplicate
  }

  // Show scan indicator
  showScanIndicator();
  
  setStatus(`QR detected: ${value}. Sending to server...`);
  console.log('QR Code scanned:', value);
  
  try {
    const resp = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr: value }),
    });
    const data = await resp.json();
    
    if (!resp.ok) {
      lastScanEl.textContent = JSON.stringify(data, null, 2);
      setStatus('Server responded with an error.');
      return;
    }
    
    const nice = formatScanResult(data);
    lastScanEl.textContent = nice;
    
    // Show entry popup with slot and vehicle info
    if (data.status === 'entry' && data.parking_slot) {
      console.log('Vehicle entry:', data.vehicle_id, 'Slot:', data.parking_slot);
      showSlotPopup(data.parking_slot, data.vehicle_id);
    }
    
    // Show exit popup with fee and duration
    if (data.status === 'exit' && data.vehicle_id) {
      console.log('Vehicle exit:', data.vehicle_id, 'Fee:', data.fee, 'Duration:', data.duration);
      showExitPopup(data.vehicle_id, data.fee, data.duration);
    }
    
    setStatus('Ready. Scanning for QR code...');
  } catch (err) {
    console.error('Scan POST error:', err);
    setStatus('Network error while sending scan to server.');
  }
}

function formatScanResult(res) {
  if (res && res.error) {
    return `Error: ${res.error}`;
  }
  if (!res) return 'No response.';
  const { status, vehicle_id, entry_time, exit_time, duration, fee } = res;
  const lines = [];
  lines.push(`Status: ${status}`);
  lines.push(`Vehicle ID: ${vehicle_id}`);
  if (entry_time) lines.push(`Entry: ${entry_time}`);
  if (exit_time) lines.push(`Exit: ${exit_time}`);
  if (duration != null) lines.push(`Duration (min): ${duration}`);
  if (fee != null) lines.push(`Fee (₹): ${fee}`);
  return lines.join('\n');
}

function scanLoop() {
  console.log('Starting scan loop...');
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const tick = () => {
    if (rafId === null) return;
    try {
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (code && code.data) {
        console.log('QR code detected:', code.data);
        handleQr(code);
      }
    } catch (e) {}
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function scanLoopESP32() {
  console.log('Starting ESP32-CAM scan loop...');
  
  // Get initial dimensions
  let w = mjpegImg.naturalWidth || mjpegImg.width || 640;
  let h = mjpegImg.naturalHeight || mjpegImg.height || 480;
  console.log(`ESP32-CAM initial size: ${w}x${h}`);
  
  // If dimensions are 0, wait a bit and try again
  if (w === 0 || h === 0) {
    console.warn('Image dimensions are 0, waiting 1 second...');
    setTimeout(scanLoopESP32, 1000);
    return;
  }
  
  // Set canvas internal dimensions to match image
  canvas.width = w;
  canvas.height = h;
  
  // Set canvas display size to match displayed image size
  canvas.style.width = mjpegImg.offsetWidth + 'px';
  canvas.style.height = mjpegImg.offsetHeight + 'px';
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  let frameCount = 0;
  let lastDetectionAttempt = 0;

  const tick = () => {
    if (rafId === null) return;
    
    try {
      // Update dimensions if stream size changed
      const currentW = mjpegImg.naturalWidth || mjpegImg.width;
      const currentH = mjpegImg.naturalHeight || mjpegImg.height;
      
      if (currentW !== w || currentH !== h) {
        w = currentW;
        h = currentH;
        canvas.width = w;
        canvas.height = h;
        // Update display size too
        canvas.style.width = mjpegImg.offsetWidth + 'px';
        canvas.style.height = mjpegImg.offsetHeight + 'px';
        console.log(`ESP32-CAM size updated to: ${w}x${h}`);
      }
      
      // Draw image to canvas
      ctx.drawImage(mjpegImg, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      
      frameCount++;
      
      // Debug info every 2 seconds (60 frames at 30fps)
      if (frameCount % 60 === 0) {
        console.log(`ESP32-CAM: Frame ${frameCount}, Size ${w}x${h}, Scanning...`);
        // Log pixel data to verify canvas is getting data
        const samplePixel = imageData.data[0];
        console.log(`Sample pixel value: ${samplePixel}`);
      }
      
      // Scan for QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, { 
        inversionAttempts: 'attemptBoth'
      });
      
      if (code && code.data) {
        console.log('✅ QR DETECTED from ESP32-CAM:', code.data);
        handleQr(code);
      } else {
        // Log scanning attempts every 5 seconds
        const now = Date.now();
        if (now - lastDetectionAttempt > 5000) {
          console.log('Scanning... (no QR detected yet)');
          lastDetectionAttempt = now;
        }
      }
    } catch (e) {
      console.error('ESP32 scan error:', e);
    }
    rafId = requestAnimationFrame(tick);
  };
  
  rafId = requestAnimationFrame(tick);
  console.log('ESP32-CAM scan loop started, rafId:', rafId);
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);

// Toggle between Laptop Webcam and ESP32-CAM
toggleSourceBtn?.addEventListener('click', () => {
  stopCamera(); // Stop current camera
  useESP32 = !useESP32;
  
  // Save preference to localStorage
  localStorage.setItem('useESP32', useESP32);
  
  toggleSourceBtn.textContent = useESP32 ? 'Switch to Webcam' : 'Switch to ESP32-CAM';
  const esp32UrlSection = document.getElementById('esp32UrlSection');
  if (esp32UrlSection) {
    esp32UrlSection.style.display = useESP32 ? 'block' : 'none';
  }
  setStatus(`Switched to ${useESP32 ? 'ESP32-CAM' : 'Laptop Webcam'} mode. Click Start Camera.`);
});

// Save ESP32-CAM URL when changed
esp32UrlInput?.addEventListener('change', () => {
  const url = esp32UrlInput.value.trim();
  if (url) {
    localStorage.setItem('esp32Url', url);
    console.log('💾 ESP32-CAM URL saved:', url);
  }
});

// Debug canvas toggle
debugCanvasBtn?.addEventListener('click', () => {
  canvas.classList.toggle('debug');
  if (canvas.classList.contains('debug')) {
    debugCanvasBtn.textContent = '🔍 Debug: ON';
    console.log('Debug canvas enabled - you can see what the scanner sees');
  } else {
    debugCanvasBtn.textContent = '🔍 Debug View';
    console.log('Debug canvas disabled');
  }
});

// Test ESP32-CAM URL
testUrlBtn?.addEventListener('click', async () => {
  const url = esp32UrlInput?.value?.trim();
  if (!url) {
    if (urlStatus) urlStatus.textContent = '❌ Please enter a URL';
    return;
  }
  
  // Save URL when testing
  localStorage.setItem('esp32Url', url);
  
  if (urlStatus) urlStatus.textContent = '🔄 Testing connection...';
  testUrlBtn.disabled = true;
  testUrlBtn.textContent = 'Testing...';
  
  // Create a test image to check if URL is accessible
  const testImg = new Image();
  const timeout = setTimeout(() => {
    testImg.src = '';
    if (urlStatus) urlStatus.textContent = '❌ Timeout - Cannot reach ' + url;
    testUrlBtn.disabled = false;
    testUrlBtn.textContent = '🔍 Test';
  }, 5000);
  
  testImg.onload = () => {
    clearTimeout(timeout);
    if (urlStatus) urlStatus.textContent = '✅ Connected! Stream is accessible';
    if (urlStatus) urlStatus.style.color = '#6ee7b7';
    testUrlBtn.disabled = false;
    testUrlBtn.textContent = '✅ Working!';
    setTimeout(() => {
      testUrlBtn.textContent = '🔍 Test';
    }, 2000);
    console.log('✅ ESP32-CAM URL test successful:', url);
  };
  
  testImg.onerror = () => {
    clearTimeout(timeout);
    if (urlStatus) {
      urlStatus.textContent = '❌ Cannot connect to ' + url + ' - Check ESP32-CAM power and WiFi';
      urlStatus.style.color = '#fca5a5';
    }
    testUrlBtn.disabled = false;
    testUrlBtn.textContent = '❌ Failed';
    setTimeout(() => {
      testUrlBtn.textContent = '🔍 Test';
    }, 2000);
    console.error('❌ ESP32-CAM URL test failed:', url);
  };
  
  testImg.src = url;
});

regBtn.addEventListener('click', async () => {
  const id = (regId.value || '').trim();
  const plate = (regPlate.value || '').trim();
  const owner_name = (regOwner.value || '').trim();
  if (!id) {
    regStatus.textContent = 'Please enter an id to register.';
    return;
  }
  regStatus.textContent = 'Registering...';
  try {
    const resp = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plate, owner_name, vehicle_type: regType.value || 'car' }),
    });
    const data = await resp.json();
    regStatus.textContent = JSON.stringify(data);
    await fetchVehicles();
  } catch (e) {
    regStatus.textContent = 'Network error while registering vehicle';
  }
});

// Initialize on page load
window.addEventListener('load', () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    setStatus('Ready. Click "Start Camera" to begin scanning.');
  } else {
    setStatus('This browser does not support camera access.');
  }
  fetchVehicles();
  fetchLogs();
});

async function fetchVehicles() {
  try {
    const resp = await fetch('/api/vehicles');
    const rows = await resp.json();
    vehiclesBody.innerHTML = rows.map(r => `
      <tr>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${escapeHtml(r.id)}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${escapeHtml(r.plate || '')}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${escapeHtml(r.owner_name || '')}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${escapeHtml(r.vehicle_type || '')}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${escapeHtml(r.created_at || '')}</td>
      </tr>
    `).join('');
  } catch (e) {
    // ignore for now
  }
}

async function fetchLogs() {
  try {
    const resp = await fetch('/api/logs');
    const rows = await resp.json();
    logsBody.innerHTML = rows.map(r => `
      <tr>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${r.id}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${escapeHtml(r.vehicle_id)}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${escapeHtml(r.entry_time || '')}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${escapeHtml(r.exit_time || '')}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${r.duration_minutes ?? ''}</td>
        <td style="padding:6px; border-bottom:1px solid #1f2937;">${r.fee ?? ''}</td>
      </tr>
    `).join('');
  } catch (e) {
    // ignore for now
  }
}

refreshVehicles?.addEventListener('click', fetchVehicles);
refreshLogs?.addEventListener('click', fetchLogs);

savePrice?.addEventListener('click', async () => {
  const vt = priceType.value;
  const rate = Number(priceRate.value);
  if (!vt || !Number.isFinite(rate)) {
    alert('Enter a valid rate');
    return;
  }
  try {
    const resp = await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_type: vt, rate_per_minute: rate })
    });
    await resp.json();
    await loadPricing();
  } catch (e) {}
});

loadPrices?.addEventListener('click', loadPricing);

async function loadPricing() {
  try {
    const resp = await fetch('/api/pricing');
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      pricingList.textContent = 'No pricing loaded.';
    } else {
      pricingList.textContent = rows.map(r => `${r.vehicle_type}: ₹${r.rate_per_minute}/min`).join('\n');
    }
  } catch (e) {
    pricingList.textContent = 'Failed to load pricing.';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


