const http = require('http');

const ESP32_IP = '10.229.70.240';

function testEntry() {
  const postData = JSON.stringify({
    vehicleId: 'TEST123',
    vehicleType: 'car'
  });

  const options = {
    hostname: ESP32_IP,
    port: 80,
    path: '/entry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('Testing ESP32 Entry Gate...');
  console.log('POST http://' + ESP32_IP + '/entry');
  console.log('Body:', postData);
  console.log('');

  const req = http.request(options, (res) => {
    let data = '';
    
    console.log('Status Code:', res.statusCode);
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      try {
        const json = JSON.parse(data);
        console.log('Parsed:', JSON.stringify(json, null, 2));
        
        if (json.success) {
          console.log('\n✅ SUCCESS!');
          console.log('   Slot:', json.slot);
          console.log('   Direction:', json.direction);
          console.log('\n📺 Check your LCD display - it should show:');
          console.log('   Line 1: Slot: ' + json.slot);
          console.log('   Line 2: ' + json.direction);
        }
      } catch (e) {
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Is ESP32 powered on?');
    console.log('2. Is ESP32 connected to WiFi?');
    console.log('3. Can you ping ' + ESP32_IP + '?');
  });

  req.setTimeout(5000, () => {
    req.destroy();
    console.error('❌ Timeout - ESP32 not responding');
  });

  req.write(postData);
  req.end();
}

testEntry();
