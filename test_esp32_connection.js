const http = require('http');

// ESP32 Configuration from server.js
const ESP32_CONTROLLER_IP = '10.153.205.240';
const ESP32_CAM_IP = '192.168.1.100'; // Common default, adjust if needed

console.log('🔍 ESP32 Connection Diagnostic Tool');
console.log('=====================================\n');

function testConnection(ip, port, path, description) {
  return new Promise((resolve) => {
    console.log(`Testing ${description} at ${ip}:${port}${path}...`);
    
    const options = {
      hostname: ip,
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log(`✅ ${description}: Connected (Status: ${res.statusCode})`);
      resolve(true);
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${description}: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`⏰ ${description}: Connection timeout`);
      req.destroy();
      resolve(false);
    });
    
    req.setTimeout(5000);
    req.end();
  });
}

async function runDiagnostics() {
  console.log('1. Testing ESP32 Gate Controller...');
  await testConnection(ESP32_CONTROLLER_IP, 80, '/', 'Gate Controller');
  
  console.log('\n2. Testing ESP32 CAM...');
  await testConnection(ESP32_CAM_IP, 80, '/stream', 'ESP32 CAM Stream');
  
  console.log('\n3. Testing alternative ESP32 CAM IPs...');
  const commonIPs = ['192.168.1.101', '192.168.1.102', '10.153.205.241', '10.153.205.242'];
  
  for (const ip of commonIPs) {
    await testConnection(ip, 80, '/stream', `ESP32 CAM (${ip})`);
  }
  
  console.log('\n📋 Diagnostic Summary:');
  console.log('- If Gate Controller fails: Check if ESP32 is powered and connected to WiFi');
  console.log('- If ESP32 CAM fails: Check camera module IP address');
  console.log('- Verify both devices are on the same network as this server');
  console.log('- Check WiFi credentials in ESP32 code match your network');
}

runDiagnostics().catch(console.error);
