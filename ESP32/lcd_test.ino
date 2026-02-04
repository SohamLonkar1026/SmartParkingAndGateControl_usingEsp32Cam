/*
 * Simple LCD Test for ESP32
 * Tests I2C LCD display functionality
 * 
 * Wiring:
 * LCD SDA -> GPIO 21
 * LCD SCL -> GPIO 22  
 * LCD VCC -> 5V
 * LCD GND -> GND
 */

#include <LiquidCrystal_I2C.h>
#include <Wire.h>

// LCD Configuration
#define LCD_ADDRESS 0x27  // Try 0x3F if this doesn't work
#define LCD_COLS 16
#define LCD_ROWS 2

LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);

void setup() {
  Serial.begin(115200);
  Serial.println("=== LCD Test Starting ===");
  
  // Initialize I2C with default pins (SDA=21, SCL=22)
  Wire.begin();
  
  // Scan for I2C devices
  Serial.println("Scanning for I2C devices...");
  scanI2C();
  
  // Initialize LCD
  Serial.println("Initializing LCD...");
  lcd.init();
  lcd.backlight();
  
  // Test display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LCD Test OK!");
  lcd.setCursor(0, 1);
  lcd.print("Address: 0x27");
  
  Serial.println("LCD initialized successfully!");
  Serial.println("Check your display now.");
}

void loop() {
  // Blinking test
  static unsigned long lastBlink = 0;
  static bool showMessage = true;
  
  if (millis() - lastBlink > 1000) {
    lastBlink = millis();
    showMessage = !showMessage;
    
    lcd.clear();
    if (showMessage) {
      lcd.setCursor(0, 0);
      lcd.print("ESP32 LCD Test");
      lcd.setCursor(0, 1);
      lcd.print("Working Fine!");
    } else {
      lcd.setCursor(0, 0);
      lcd.print("Time: ");
      lcd.print(millis() / 1000);
      lcd.setCursor(0, 1);
      lcd.print("Blink Test");
    }
  }
  
  delay(100);
}

void scanI2C() {
  byte error, address;
  int nDevices = 0;
  
  Serial.println("Scanning I2C addresses...");
  
  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println(" !");
      nDevices++;
    }
  }
  
  if (nDevices == 0) {
    Serial.println("No I2C devices found");
    Serial.println("Check wiring:");
    Serial.println("- SDA -> GPIO 21");
    Serial.println("- SCL -> GPIO 22");
    Serial.println("- VCC -> 5V");
    Serial.println("- GND -> GND");
  } else {
    Serial.print("Found ");
    Serial.print(nDevices);
    Serial.println(" I2C device(s)");
  }
  Serial.println();
}
