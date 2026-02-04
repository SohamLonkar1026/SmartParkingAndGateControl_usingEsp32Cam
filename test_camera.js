const http = require('http');

const CAMERA_IP = '10.229.70.93';
const CAMERA_PORT = 81;

console.log('Testing ESP32-CAM Connection...');
console.log('URL: http://' + CAMERA_IP + ':' + CAMERA_PORT + '/');
console.log('');

const options = {
  hostname: CAMERA_IP,
  port: CAMERA_PORT,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log('✅ ESP32-CAM is ONLINE!');
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  console.log('');
  
  if (res.headers['content-type'] && res.headers['content-type'].includes('multipart')) {
    console.log('✅ Camera stream is working!');
    console.log('Content-Type:', res.headers['content-type']);
    console.log('');
    console.log('📺 Open in browser: http://' + CAMERA_IP + ':' + CAMERA_PORT + '/');
    console.log('');
    console.log('Note: Some browsers may have issues with MJPEG streams.');
    console.log('Try: Chrome, Firefox, or VLC Media Player');
  }
  
  req.destroy(); // Stop receiving stream data
});

req.on('error', (error) => {
  console.error('❌ Cannot connect to ESP32-CAM');
  console.error('Error:', error.message);
  console.log('');
  console.log('Troubleshooting:');
  console.log('1. Is ESP32-CAM powered on?');
  console.log('2. Check Serial Monitor - does it show "Camera Stream Ready"?');
  console.log('3. Are you on the same WiFi network?');
  console.log('4. Try pinging: ping ' + CAMERA_IP);
});

req.on('timeout', () => {
  console.error('❌ Connection timeout');
  req.destroy();
});

req.end();
