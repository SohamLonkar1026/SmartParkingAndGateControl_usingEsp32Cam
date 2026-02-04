// Dashboard - Combined Scanner + Parking Grid

// Scanner elements
const video = document.getElementById('video');
const mjpegImg = document.getElementById('mjpegImg');
const canvas = document.getElementById('canvas');
const statusEl = document.getElementById('status');
const lastScanEl = document.getElementById('lastScan');
const slotPopup = document.getElementById('slotPopup');
const slotText = document.getElementById('slotText');
const exitPopup = document.getElementById('exitPopup');
const exitText = document.getElementById('exitText');
const scanIndicator = document.getElementById('scanIndicator');
const esp32UrlInput = document.getElementById('esp32Url');
const testUrlBtn = document.getElementById('testUrl');
const urlStatus = document.getElementById('urlStatus');
const sourceIndicator = document.getElementById('sourceIndicator');
const toggleSourceBtn = document.getElementById('toggleSource');

// Parking grid elements
const slotsGrid = document.getElementById('slotsGrid');
const slotsStatus = document.getElementById('slotsStatus');

let mediaStream = null;
let rafId = null;
let lastScanValue = '';
let lastScanAt = 0;
let useESP32 = true; // Always use ESP32 by default
const scanCooldownMs = 30000;

// Set default ESP32 URL if not already saved
const defaultESP32Url = 'http://10.102.251.93:81/';
if (esp32UrlInput) {
  const savedUrl = localStorage.getItem('esp32Url');
  esp32UrlInput.value = savedUrl || defaultESP32Url;
  if (!savedUrl) {
    localStorage.setItem('esp32Url', defaultESP32Url);
  }
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
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
  playBeep(800, 200);
  setTimeout(() => {
    slotPopup.style.display = 'none';
  }, 6000);
}

function showExitPopup(vehicleId, fee, duration) {
  if (!exitPopup || !exitText) return;
  exitText.textContent = `${vehicleId} - ₹${fee} (${duration} min)`;
  exitPopup.style.display = 'block';
  playBeep(600, 200);
  setTimeout(() => {
    exitPopup.style.display = 'none';
  }, 6000);
}

function playBeep(frequency, duration) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    oscillator.start();
    setTimeout(() => oscillator.stop(), duration);
  } catch (e) { }
}

async function startCamera() {
  try {
    if (rafId !== null) {
      setStatus('Camera already running');
      return;
    }

    if (useESP32) {
      const esp32Url = esp32UrlInput?.value?.trim();
      if (!esp32Url) {
        setStatus('Please enter ESP32-CAM stream URL');
        return;
      }
      setStatus('Connecting to ESP32-CAM...');

      video.srcObject = null;
      video.style.display = 'none';
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }

      mjpegImg.style.display = 'block';
      const useProxy = true;
      const finalUrl = useProxy ? `/esp32-proxy?url=${encodeURIComponent(esp32Url)}` : esp32Url;

      mjpegImg.onerror = (e) => {
        console.error('MJPEG Image load error');
        setStatus('Failed to load ESP32-CAM stream.');
      };

      mjpegImg.onload = () => {
        console.log('✅ ESP32-CAM image loaded');
      };

      console.log('🔄 Loading ESP32-CAM stream from:', esp32Url);
      mjpegImg.src = finalUrl;

      setTimeout(() => {
        if (mjpegImg.naturalWidth > 0 && mjpegImg.naturalHeight > 0) {
          console.log('✅ ESP32-CAM stream ready');
          setStatus('Scanning for QR code... (ESP32-CAM)');
          if (sourceIndicator) sourceIndicator.textContent = '📷 ESP32-CAM';
          scanLoopESP32();
        } else {
          console.warn('⚠️ ESP32-CAM stream not loaded, retrying...');
          setStatus('Waiting for ESP32-CAM stream...');
          setTimeout(() => {
            if (mjpegImg.naturalWidth > 0) {
              setStatus('Scanning for QR code... (ESP32-CAM)');
              if (sourceIndicator) sourceIndicator.textContent = '📷 ESP32-CAM';
              scanLoopESP32();
            } else {
              setStatus('ESP32-CAM stream not loading. Check connection.');
            }
          }, 1500);
        }
      }, 1000);

    } else {
      setStatus('Requesting camera access...');
      video.src = '';
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
    setStatus('Failed to access camera.');
  }
}

function stopCamera() {
  try {
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
  } catch (e) { }
}

function scanLoop() {
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
        handleQr(code);
      }
    } catch (e) { }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function scanLoopESP32() {
  let w = mjpegImg.naturalWidth || mjpegImg.width || 640;
  let h = mjpegImg.naturalHeight || mjpegImg.height || 480;

  if (w === 0 || h === 0) {
    setTimeout(scanLoopESP32, 1000);
    return;
  }

  canvas.width = w;
  canvas.height = h;
  canvas.style.width = mjpegImg.offsetWidth + 'px';
  canvas.style.height = mjpegImg.offsetHeight + 'px';

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let frameCount = 0;

  const tick = () => {
    if (rafId === null) return;

    try {
      const currentW = mjpegImg.naturalWidth || mjpegImg.width;
      const currentH = mjpegImg.naturalHeight || mjpegImg.height;

      if (currentW !== w || currentH !== h) {
        w = currentW;
        h = currentH;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = mjpegImg.offsetWidth + 'px';
        canvas.style.height = mjpegImg.offsetHeight + 'px';
      }

      ctx.drawImage(mjpegImg, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      frameCount++;

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (code && code.data) {
        handleQr(code);
      }
    } catch (e) { }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}

function debounceSameScan(value) {
  const now = Date.now();
  const timeSinceLastScan = now - lastScanAt;

  if (value === lastScanValue) {
    if (timeSinceLastScan < scanCooldownMs) {
      const remainingSeconds = Math.ceil((scanCooldownMs - timeSinceLastScan) / 1000);
      setStatus(`Please wait ${remainingSeconds}s before scanning ${value} again`);
      return true;
    }
  }

  lastScanValue = value;
  lastScanAt = now;
  return false;
}

async function handleQr(qr) {
  if (!qr) return;
  const value = String(qr.data || qr).trim();
  if (!value) return;
  if (debounceSameScan(value)) return;

  showScanIndicator();
  setStatus(`QR detected: ${value}. Sending to server...`);

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

    if (data.status === 'entry' && data.parking_slot) {
      showSlotPopup(data.parking_slot, data.vehicle_id);
      loadSlots(); // Refresh parking grid
    }

    if (data.status === 'exit' && data.vehicle_id) {
      showExitPopup(data.vehicle_id, data.fee, data.duration);
      loadSlots(); // Refresh parking grid
    }

    setStatus('Ready. Scanning for QR code...');
  } catch (err) {
    setStatus('Network error while sending scan to server.');
  }
}

function formatScanResult(res) {
  if (res && res.error) return `Error: ${res.error}`;
  const lines = [];
  if (res.status) lines.push(`Status: ${res.status}`);
  if (res.vehicle_id) lines.push(`Vehicle: ${res.vehicle_id}`);
  if (res.parking_slot) lines.push(`Slot: ${res.parking_slot}`);
  if (res.entry_time) lines.push(`Entry: ${res.entry_time}`);
  if (res.exit_time) lines.push(`Exit: ${res.exit_time}`);
  if (res.duration != null) lines.push(`Duration (min): ${res.duration}`);
  if (res.fee != null) lines.push(`Fee (₹): ${res.fee}`);
  return lines.join('\n');
}

// Parking grid functions
async function loadSlots() {
  try {
    const resp = await fetch('/api/slots');
    const rows = await resp.json();
    const order = ['t1', 't2', 't3', 'b1', 'b2', 'b3', 'c1', 'c2', 'c3'];
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    slotsGrid.innerHTML = order.map(id => {
      const r = byId[id] || { id, type: id[0] === 't' ? 'truck' : id[0] === 'b' ? 'bike' : 'car', occupied_by: null };
      const occupied = !!r.occupied_by;
      const color = occupied ? '#ef4444' : '#10b981';
      const status = occupied ? `Occupied by ${r.occupied_by}` : 'Free';
      const icon = iconForType(r.type);
      return `<div class="slot-card">
        <div class="slot-header">
          <div class="indicator" style="background:${color};"></div>
          <span class="slot-icon">${icon}</span>
        </div>
        <div class="slot-id">${id.toUpperCase()}</div>
        <div class="slot-type">${r.type}</div>
        <div class="slot-status" style="color:${occupied ? '#fca5a5' : '#6ee7b7'};">${status}</div>
      </div>`;
    }).join('');
    slotsStatus.textContent = 'Live status loaded.';
  } catch (e) {
    slotsStatus.textContent = 'Failed to load slots.';
  }
}

function iconForType(type) {
  if (type === 'truck') return '🚚';
  if (type === 'bike') return '🏍️';
  return '🚗';
}

// Event listeners
esp32UrlInput?.addEventListener('change', () => {
  const url = esp32UrlInput.value.trim();
  if (url) {
    localStorage.setItem('esp32Url', url);
  }
});

testUrlBtn?.addEventListener('click', async () => {
  const url = esp32UrlInput?.value?.trim();
  if (!url) {
    if (urlStatus) urlStatus.textContent = '❌ Please enter a URL';
    return;
  }

  localStorage.setItem('esp32Url', url);

  if (urlStatus) urlStatus.textContent = '🔄 Testing connection...';
  testUrlBtn.disabled = true;
  testUrlBtn.textContent = 'Testing...';

  const testImg = new Image();
  const timeout = setTimeout(() => {
    testImg.src = '';
    if (urlStatus) urlStatus.textContent = '❌ Timeout - Cannot reach ' + url;
    testUrlBtn.disabled = false;
    testUrlBtn.textContent = '🔍 Test';
  }, 5000);

  testImg.onload = () => {
    clearTimeout(timeout);
    if (urlStatus) {
      urlStatus.textContent = '✅ Connected! Stream is accessible';
      urlStatus.style.color = '#6ee7b7';
    }
    testUrlBtn.disabled = false;
    testUrlBtn.textContent = '✅ Working!';
    setTimeout(() => { testUrlBtn.textContent = '🔍 Test'; }, 2000);
  };

  testImg.onerror = () => {
    clearTimeout(timeout);
    if (urlStatus) {
      urlStatus.textContent = '❌ Cannot connect to ' + url;
      urlStatus.style.color = '#fca5a5';
    }
    testUrlBtn.disabled = false;
    testUrlBtn.textContent = '❌ Failed';
    setTimeout(() => { testUrlBtn.textContent = '🔍 Test'; }, 2000);
  };

  testImg.src = url;
});

// Load parking slots on page load and refresh every 5 seconds
loadSlots();
setInterval(loadSlots, 5000);

// Toggle between ESP32-CAM and Laptop Webcam on dashboard
toggleSourceBtn?.addEventListener('click', () => {
  // Stop current camera stream, flip mode, restart
  stopCamera();
  useESP32 = !useESP32;

  if (toggleSourceBtn) {
    toggleSourceBtn.textContent = useESP32 ? 'Switch to Webcam' : 'Switch to ESP32-CAM';
  }

  const modeLabel = useESP32 ? 'ESP32-CAM' : 'Laptop Webcam';
  setStatus(`Switched to ${modeLabel} mode. Starting camera...`);
  startCamera();
});

// Auto-start ESP32 camera on page load
window.addEventListener('DOMContentLoaded', () => {
  if (toggleSourceBtn) {
    toggleSourceBtn.textContent = useESP32 ? 'Switch to Webcam' : 'Switch to ESP32-CAM';
  }
  setTimeout(() => {
    startCamera();
  }, 500);
});
