# ESP32 Gate Controller - Wiring Guide

## 🔌 Hardware Components Required

1. **ESP32 Development Board** (30-pin version recommended)
2. **2x SG90 Servo Motors** (for entry and exit gates)
3. **16x2 I2C LCD Display** (with I2C backpack module)
4. **2x LEDs** (Green - for gate status indicators)
5. **1x Buzzer** (Active or Passive)
6. **2x 220Ω Resistors** (for LEDs)
7. **Breadboard and Jumper Wires**
8. **5V Power Supply** (2A minimum for servos)

---

## 📋 Pin Connections

### **Servo Motors**
| Component | ESP32 Pin | Notes |
|-----------|-----------|-------|
| Entry Servo Signal | GPIO 13 | Orange/Yellow wire |
| Exit Servo Signal | GPIO 12 | Orange/Yellow wire |
| Servo VCC (both) | 5V | Red wire - Use external 5V supply |
| Servo GND (both) | GND | Brown/Black wire |

⚠️ **Important**: Servos draw significant current. Use an **external 5V power supply** (not USB power) and connect ESP32 GND to power supply GND.

---

### **I2C LCD Display (16x2)**
| LCD Pin | ESP32 Pin | Notes |
|---------|-----------|-------|
| SDA | GPIO 21 | Default I2C Data |
| SCL | GPIO 22 | Default I2C Clock |
| VCC | 5V | Power |
| GND | GND | Ground |

**I2C Address**: Default is `0x27`. If display doesn't work, try `0x3F`.

To find your LCD's I2C address, use an I2C scanner sketch.

---

### **LEDs (Gate Status Indicators)**
| Component | ESP32 Pin | Resistor | Notes |
|-----------|-----------|----------|-------|
| Entry LED (+) | GPIO 14 | 220Ω | Green LED - lights when entry gate open |
| Exit LED (+) | GPIO 27 | 220Ω | Green LED - lights when exit gate open |
| LED (-) | GND | - | Common ground |

---

### **Buzzer**
| Buzzer Pin | ESP32 Pin | Notes |
|------------|-----------|-------|
| Positive (+) | GPIO 26 | Signal pin |
| Negative (-) | GND | Ground |

---

## 🔧 Complete Wiring Diagram

```
ESP32 Development Board
┌─────────────────────────────────┐
│                                 │
│  GPIO 13 ──────────────────────┼──→ Entry Servo (Signal)
│  GPIO 12 ──────────────────────┼──→ Exit Servo (Signal)
│                                 │
│  GPIO 21 (SDA) ────────────────┼──→ LCD SDA
│  GPIO 22 (SCL) ────────────────┼──→ LCD SCL
│                                 │
│  GPIO 14 ──[220Ω]──[LED]──GND  │    Entry Gate LED
│  GPIO 27 ──[220Ω]──[LED]──GND  │    Exit Gate LED
│                                 │
│  GPIO 26 ──────────────────────┼──→ Buzzer (+)
│                                 │
│  5V ───────────────────────────┼──→ LCD VCC
│  GND ──────────────────────────┼──→ Common Ground
│                                 │
└─────────────────────────────────┘

External 5V Power Supply (2A)
┌──────────────┐
│   5V  ──────┼──→ Servo VCC (both servos)
│   GND ──────┼──→ Common Ground (connect to ESP32 GND)
└──────────────┘
```

---

## 📚 Required Arduino Libraries

Install these libraries via Arduino IDE Library Manager:

1. **ESP32Servo** by Kevin Harrington
   - `Sketch → Include Library → Manage Libraries`
   - Search: "ESP32Servo"
   - Install latest version

2. **LiquidCrystal I2C** by Frank de Brabander
   - Search: "LiquidCrystal I2C"
   - Install version by Frank de Brabander

3. **ArduinoJson** by Benoit Blanchon
   - Search: "ArduinoJson"
   - Install version 6.x (NOT version 7)

4. **WiFi** (Built-in with ESP32 board support)

---

## ⚙️ Configuration Steps

### 1. Update WiFi Credentials
Edit lines 8-9 in `esp32_gate_controller.ino`:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Verify I2C LCD Address
If LCD doesn't display anything, run an I2C scanner to find the address:
```cpp
// Change line 16 if needed:
#define LCD_ADDRESS 0x27  // Try 0x3F if 0x27 doesn't work
```

### 3. Adjust Servo Angles (if needed)
If your servo gate doesn't close/open properly, adjust these values (lines 29-30):
```cpp
const int SERVO_CLOSED = 0;   // Try 0-10 degrees
const int SERVO_OPEN = 90;    // Try 80-100 degrees
```

---

## 🚀 Upload Instructions

1. **Connect ESP32** via USB
2. **Select Board**: `Tools → Board → ESP32 Dev Module`
3. **Select Port**: `Tools → Port → COM[X]`
4. **Upload Speed**: `115200`
5. Click **Upload** button
6. Open **Serial Monitor** (115200 baud)
7. Note the **IP Address** displayed

---

## 🌐 API Endpoints

Once uploaded, the ESP32 will host a web server. Use these endpoints:

### **Entry Gate (Vehicle Entering)**
```http
POST http://[ESP32_IP]/entry
Content-Type: application/json

{
  "vehicleId": "ABC123",
  "vehicleType": "car"  // Options: "car", "bike", "truck"
}
```

**Response:**
```json
{
  "success": true,
  "slot": "A1",
  "direction": "GO STRAIGHT"
}
```

**LCD Display:**
```
Slot: A1
GO STRAIGHT
```

---

### **Exit Gate (Vehicle Leaving)**
```http
POST http://[ESP32_IP]/exit
Content-Type: application/json

{
  "vehicleId": "ABC123",
  "slotId": "A1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Exit granted"
}
```

**LCD Display:**
```
EXIT: ABC123
Thank You!
```

---

### **Get Parking Status**
```http
GET http://[ESP32_IP]/status
```

**Response:**
```json
{
  "entryGateOpen": false,
  "exitGateOpen": false,
  "slots": [
    {"id": "A1", "type": "car", "occupied": false},
    {"id": "A2", "type": "car", "occupied": true},
    ...
  ]
}
```

---

### **Manual Gate Control (Testing)**
```http
GET http://[ESP32_IP]/gate/entry/open
GET http://[ESP32_IP]/gate/entry/close
GET http://[ESP32_IP]/gate/exit/open
GET http://[ESP32_IP]/gate/exit/close
```

---

## 🎯 Direction Logic

The system automatically assigns directions based on vehicle type:

| Vehicle Type | Direction | LCD Display |
|--------------|-----------|-------------|
| **Truck** | Left | `TURN LEFT` |
| **Bike** | Right | `TURN RIGHT` |
| **Car** | Straight | `GO STRAIGHT` |

---

## 🔍 Parking Slot Assignment

**Default Slot Configuration:**
- **A1, A2, A3, D1** → Cars (4 slots)
- **B1, B2, B3** → Bikes (3 slots)
- **C1, C2, C3** → Trucks (3 slots)

Modify the `slots[]` array in the code to customize.

---

## 🐛 Troubleshooting

### LCD Not Displaying
- Check I2C address (try 0x3F instead of 0x27)
- Verify SDA/SCL connections (GPIO 21/22)
- Check contrast potentiometer on I2C backpack

### Servo Not Moving
- Ensure external 5V power supply is connected
- Check signal wire connection
- Adjust `SERVO_CLOSED` and `SERVO_OPEN` angles

### WiFi Not Connecting
- Verify SSID and password
- Check 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Ensure router is in range

### Gate Not Auto-Closing
- Default timeout is 5 seconds (`GATE_OPEN_TIME`)
- Increase value on line 31 if needed

---

## 📊 Serial Monitor Output Example

```
=================================
🚗 ESP32 Smart Parking Gate Controller
=================================

✓ Servos initialized (gates closed)
✓ LCD Display initialized
Connecting to WiFi.....
✓ WiFi Connected!
📡 IP Address: 192.168.1.100
✓ Web Server started on port 80

✅ System Ready!

🚗 ENTRY REQUEST:
   Vehicle ID: ABC123
   Type: car
   ✓ Slot assigned: A1
   ✓ Direction: GO STRAIGHT
   📺 Display: Slot A1 | GO STRAIGHT
   🚪 Entry gate OPENED
   🚪 Entry gate CLOSED
```

---

## 🔗 Integration with Node.js Backend

Update your backend (`server.js`) to use the ESP32 IP:

```javascript
const ESP32_CONTROLLER_IP = '192.168.1.100'; // Your ESP32 IP
const ESP32_CONTROLLER_ENABLED = true;
```

The backend will automatically send entry/exit requests to the ESP32.

---

## ✅ Testing Checklist

- [ ] WiFi connects successfully
- [ ] LCD displays "System Ready"
- [ ] Entry servo opens/closes on command
- [ ] Exit servo opens/closes on command
- [ ] LEDs light up when gates open
- [ ] Buzzer beeps on gate operations
- [ ] LCD shows slot and direction on entry
- [ ] LCD shows exit message on exit
- [ ] Gates auto-close after 5 seconds
- [ ] API endpoints respond correctly

---

**Need Help?** Check Serial Monitor output for debugging information!
