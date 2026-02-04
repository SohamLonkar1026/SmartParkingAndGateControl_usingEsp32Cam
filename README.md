## Smart Parking Management System (QR + ESP32-CAM)

### Prerequisites
- Node.js 18+
- npm
- ESP32-CAM dev environment (Arduino IDE or PlatformIO)

### Setup

1) Backend
- Create `backend/.env` with:
```
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_FILE=./data/parking.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
```
- Install deps and init DB:
```
cd backend
npm install
npm run init:db
```
- Run backend:
```
npm run dev
```

2) Frontend
```
cd ../frontend
npm install
# optional: create .env with VITE_API_BASE and VITE_SOCKET_URL
npm run dev
```

3) Root convenience
```
cd ..
npm install
npm run init:db
npm run dev
```

### API Endpoints
- POST `/api/scan` { qr_code }
- GET `/api/dashboard`
- POST `/api/register` { driver_name, vehicle_number, vehicle_type }

### ESP32-CAM
- Flash `ESP32/esp32_cam_qr_parking.ino`
- Replace WiFi and `serverUrl` with your backend IP

### Notes
- Vehicles are pre-seeded; QR format: `QR-<VEHICLE_NUMBER>`
- Real-time: Socket.IO emits `parking:update` for entry/exit/register


