#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* ssid = "LAN";
const char* password = "soham1122";
// ==============================

// ===== Hardware Pin Configuration =====
#define ENTRY_SERVO_PIN 13      // Entry gate servo
#define EXIT_SERVO_PIN 12       // Exit gate servo
#define ENTRY_LED_PIN 14        // Entry gate LED (Green when open)
#define EXIT_LED_PIN 27         // Exit gate LED (Green when open)
#define SYSTEM_LED_PIN 25       // System live LED (Yellow - always on when idle)
#define BUZZER_PIN 26           // Buzzer for notifications

// I2C LCD (SDA=21, SCL=22 by default on ESP32)
#define LCD_ADDRESS 0x27        // Common I2C address (try 0x3F if not working)
#define LCD_COLS 16
#define LCD_ROWS 2
// ======================================

// ===== Servo Configuration =====
Servo entryServo;
Servo exitServo;

// Entry Gate Servo Angles
const int ENTRY_SERVO_CLOSED = 0;     // Entry gate closed position (0°)
const int ENTRY_SERVO_OPEN = 90;      // Entry gate open position (90°)

// Exit Gate Servo Angles
const int EXIT_SERVO_CLOSED = 0;      // Exit gate closed position (0°)
const int EXIT_SERVO_OPEN = 90;       // Exit gate open position (90°)

const int GATE_OPEN_TIME = 5000;      // Keep gate open for 5 seconds
// =======================================

// ===== LCD Display =====
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);
// =======================

// ===== Web Server =====
WebServer server(80);
// ======================

// ===== Parking Slot Management =====
struct ParkingSlot {
  String slotId;
  String vehicleType;
  bool occupied;
};

ParkingSlot slots[9] = {
  {"T1", "truck", false}, {"T2", "truck", false}, {"T3", "truck", false},
  {"C1", "car", false}, {"C2", "car", false}, {"C3", "car", false},
  {"B1", "bike", false}, {"B2", "bike", false}, {"B3", "bike", false}
};

int totalSlots = 9;
// ===================================

// ===== Gate State =====
bool entryGateOpen = false;
bool exitGateOpen = false;
unsigned long entryGateOpenTime = 0;
unsigned long exitGateOpenTime = 0;
// ======================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("🚗 ESP32 Smart Parking Gate Controller");
  Serial.println("=================================\n");

  // Initialize hardware pins
  pinMode(ENTRY_LED_PIN, OUTPUT);
  pinMode(EXIT_LED_PIN, OUTPUT);
  pinMode(SYSTEM_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  digitalWrite(ENTRY_LED_PIN, LOW);
  digitalWrite(EXIT_LED_PIN, LOW);
  digitalWrite(SYSTEM_LED_PIN, HIGH);  // Turn on system LED (yellow)
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize servos
  entryServo.attach(ENTRY_SERVO_PIN);
  exitServo.attach(EXIT_SERVO_PIN);
  entryServo.write(ENTRY_SERVO_CLOSED);
  exitServo.write(EXIT_SERVO_CLOSED);
  Serial.println("✓ Servos initialized (gates closed)");

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Parking");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  Serial.println("✓ LCD Display initialized");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("📡 IP Address: ");
    Serial.println(WiFi.localIP());
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
  }

  // Setup web server routes
  setupRoutes();
  server.begin();
  Serial.println("✓ Web Server started on port 80");
  
  // Display ready message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print("Waiting...");
  
  beep(2); // Ready beep
  Serial.println("\n✅ System Ready!\n");
}

void loop() {
  server.handleClient();
  
  // Auto-close entry gate after timeout
  if (entryGateOpen && (millis() - entryGateOpenTime > GATE_OPEN_TIME)) {
    closeEntryGate();
  }
  
  // Auto-close exit gate after timeout
  if (exitGateOpen && (millis() - exitGateOpenTime > GATE_OPEN_TIME)) {
    closeExitGate();
  }
}

// ===== Web Server Routes =====
void setupRoutes() {
  // Root endpoint - status check
  server.on("/", HTTP_GET, handleRoot);
  
  // Entry gate - vehicle entering
  server.on("/entry", HTTP_POST, handleEntry);
  
  // Exit gate - vehicle exiting
  server.on("/exit", HTTP_POST, handleExit);
  
  // Get parking status
  server.on("/status", HTTP_GET, handleStatus);
  
  // Manual gate control (for testing)
  server.on("/gate/entry/open", HTTP_GET, []() {
    openEntryGate();
    server.send(200, "text/plain", "Entry gate opened");
  });
  
  server.on("/gate/entry/close", HTTP_GET, []() {
    closeEntryGate();
    server.send(200, "text/plain", "Entry gate closed");
  });
  
  server.on("/gate/exit/open", HTTP_GET, []() {
    openExitGate();
    server.send(200, "text/plain", "Exit gate opened");
  });
  
  server.on("/gate/exit/close", HTTP_GET, []() {
    closeExitGate();
    server.send(200, "text/plain", "Exit gate closed");
  });
}

void handleRoot() {
  String html = "<html><body><h1>ESP32 Gate Controller</h1>";
  html += "<p>Status: Online</p>";
  html += "<p>IP: " + WiFi.localIP().toString() + "</p>";
  html += "<h2>Manual Controls:</h2>";
  html += "<button onclick=\"fetch('/gate/entry/open')\">Open Entry Gate</button>";
  html += "<button onclick=\"fetch('/gate/entry/close')\">Close Entry Gate</button><br><br>";
  html += "<button onclick=\"fetch('/gate/exit/open')\">Open Exit Gate</button>";
  html += "<button onclick=\"fetch('/gate/exit/close')\">Close Exit Gate</button>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleEntry() {
  // Expected JSON: {"vehicleId": "ABC123", "vehicleType": "car", "slotId": "C1"}
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"No data received\"}");
    return;
  }

  String body = server.arg("plain");
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String vehicleId = doc["vehicleId"] | "UNKNOWN";
  String vehicleType = doc["vehicleType"] | "car";
  String slotId = doc["slotId"] | "";
  
  Serial.println("\n🚗 ENTRY REQUEST:");
  Serial.println("   Vehicle ID: " + vehicleId);
  Serial.println("   Type: " + vehicleType);
  Serial.println("   Slot: " + slotId);

  // If no slot provided, parking is full
  if (slotId == "") {
    Serial.println("   ❌ No slots available!");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("PARKING FULL!");
    lcd.setCursor(0, 1);
    lcd.print("No " + vehicleType + " slots");
    
    beep(3); // Error beeps
    delay(3000);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("System Ready");
    lcd.setCursor(0, 1);
    lcd.print("Waiting...");
    
    server.send(200, "application/json", "{\"success\":false,\"message\":\"Parking full\"}");
    return;
  }

  // Assign slot (mark as occupied in ESP32 tracking)
  assignSlot(slotId, vehicleId);
  
  // Open entry gate
  openEntryGate();
  
  // Display slot and direction
  displayEntryInfo(slotId, vehicleType);
  
  // Send response
  String response = "{\"success\":true,\"slot\":\"" + slotId + "\",\"direction\":\"" + getDirection(vehicleType) + "\"}";
  server.send(200, "application/json", response);
  
  Serial.println("   ✓ Slot assigned: " + slotId);
  Serial.println("   ✓ Direction: " + getDirection(vehicleType));
}

void handleExit() {
  // Expected JSON: {"vehicleId": "ABC123", "slotId": "c1", "fee": 150}
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"No data received\"}");
    return;
  }

  String body = server.arg("plain");
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  String vehicleId = doc["vehicleId"] | "UNKNOWN";
  String slotId = doc["slotId"] | "";
  int fee = doc["fee"] | 0;
  
  Serial.println("\n🚗 EXIT REQUEST:");
  Serial.println("   Vehicle ID: " + vehicleId);
  Serial.println("   Slot: " + slotId);
  Serial.println("   Fee: ₹" + String(fee));

  // Free the slot
  if (slotId != "") {
    freeSlot(slotId);
  }
  
  // Open exit gate
  openExitGate();
  
  // Display exit message with payment amount
  lcd.clear();
  lcd.setCursor(0, 0);
  if (fee > 0) {
    lcd.print("Pay: Rs." + String(fee));
  } else {
    lcd.print("EXIT: " + vehicleId);
  }
  lcd.setCursor(0, 1);
  lcd.print("Thank You!");
  
  beep(1); // Exit beep
  
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Exit granted\"}");
  
  Serial.println("   ✓ Exit granted");
}

void handleStatus() {
  StaticJsonDocument<512> doc;
  doc["entryGateOpen"] = entryGateOpen;
  doc["exitGateOpen"] = exitGateOpen;
  
  JsonArray slotsArray = doc.createNestedArray("slots");
  for (int i = 0; i < totalSlots; i++) {
    JsonObject slot = slotsArray.createNestedObject();
    slot["id"] = slots[i].slotId;
    slot["type"] = slots[i].vehicleType;
    slot["occupied"] = slots[i].occupied;
  }
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// ===== Gate Control Functions =====
void openEntryGate() {
  digitalWrite(SYSTEM_LED_PIN, LOW);   // Turn off system LED during operation
  entryServo.write(ENTRY_SERVO_OPEN);
  digitalWrite(ENTRY_LED_PIN, HIGH);
  entryGateOpen = true;
  entryGateOpenTime = millis();
  beep(1);
  Serial.println("   🚪 Entry gate OPENED");
}

void closeEntryGate() {
  entryServo.write(ENTRY_SERVO_CLOSED);
  digitalWrite(ENTRY_LED_PIN, LOW);
  digitalWrite(SYSTEM_LED_PIN, HIGH);  // Turn system LED back on
  entryGateOpen = false;
  Serial.println("   🚪 Entry gate CLOSED");
  
  // Reset display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print("Waiting...");
}

void openExitGate() {
  digitalWrite(SYSTEM_LED_PIN, LOW);   // Turn off system LED during operation
  exitServo.write(EXIT_SERVO_OPEN);
  digitalWrite(EXIT_LED_PIN, HIGH);
  exitGateOpen = true;
  exitGateOpenTime = millis();
  beep(1);
  Serial.println("   🚪 Exit gate OPENED");
}

void closeExitGate() {
  exitServo.write(EXIT_SERVO_CLOSED);
  digitalWrite(EXIT_LED_PIN, LOW);
  digitalWrite(SYSTEM_LED_PIN, HIGH);  // Turn system LED back on
  exitGateOpen = false;
  Serial.println("   🚪 Exit gate CLOSED");
  
  // Reset display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print("Waiting...");
}

// ===== Parking Slot Management =====
String findAvailableSlot(String vehicleType) {
  for (int i = 0; i < totalSlots; i++) {
    if (!slots[i].occupied && slots[i].vehicleType == vehicleType) {
      return slots[i].slotId;
    }
  }
  return ""; // No available slot
}

void assignSlot(String slotId, String vehicleId) {
  for (int i = 0; i < totalSlots; i++) {
    if (slots[i].slotId == slotId) {
      slots[i].occupied = true;
      Serial.println("   📍 Slot " + slotId + " assigned to " + vehicleId);
      return;
    }
  }
}

void freeSlot(String slotId) {
  for (int i = 0; i < totalSlots; i++) {
    if (slots[i].slotId == slotId) {
      slots[i].occupied = false;
      Serial.println("   📍 Slot " + slotId + " freed");
      return;
    }
  }
}

// ===== Direction Logic =====
String getDirection(String vehicleType) {
  if (vehicleType == "truck") {
    return "TURN LEFT";
  } else if (vehicleType == "bike") {
    return "TURN RIGHT";
  } else { // car or default
    return "GO STRAIGHT";
  }
}

// ===== Display Functions =====
void displayEntryInfo(String slot, String vehicleType) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Slot: " + slot);
  lcd.setCursor(0, 1);
  lcd.print(getDirection(vehicleType));
  
  Serial.println("   📺 Display: Slot " + slot + " | " + getDirection(vehicleType));
}

// ===== Buzzer Control =====
void beep(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}
