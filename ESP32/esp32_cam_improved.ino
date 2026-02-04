#include "esp_camera.h"
#include <WiFi.h>

// ===== Wi-Fi Details =====
const char* ssid = "LAN";
const char* password = "soham1122";
// ========================

// ===== AI Thinker ESP32-CAM Pins =====
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
// =====================================

#include "esp_http_server.h"

void startCameraServer();

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("Booting ESP32-CAM for QR Scanning...");

  // Camera config
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // ===== IMPROVED: Higher resolution and quality for QR scanning =====
  if(psramFound()){
    // VGA (640x480) is much better for QR detection than QVGA (320x240)
    config.frame_size = FRAMESIZE_VGA;  // 640x480 - best for QR codes
    config.jpeg_quality = 8;            // Lower = better quality (0-63 range)
    config.fb_count = 2;                // Double buffering for smooth streaming
    Serial.println("✓ PSRAM found - using VGA (640x480) resolution");
  } else {
    config.frame_size = FRAMESIZE_CIF;  // 400x296 if no PSRAM
    config.jpeg_quality = 10;
    config.fb_count = 1;
    Serial.println("⚠ No PSRAM - using CIF (400x296) resolution");
  }

  // Initialize camera
  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("❌ Camera init failed!");
    while(true);
  }
  Serial.println("✓ Camera initialized successfully!");

  // ===== IMPROVED: Optimize camera sensor for QR scanning =====
  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    Serial.println("⚙ Applying QR-optimized camera settings...");
    
    // Brightness and Contrast - crucial for QR edge detection
    s->set_brightness(s, 0);     // -2 to 2 (0 = neutral)
    s->set_contrast(s, 2);       // -2 to 2 (HIGH contrast for sharp QR edges)
    s->set_saturation(s, -1);    // -2 to 2 (lower saturation, better B&W QR detection)
    
    // Auto Exposure and White Balance
    s->set_whitebal(s, 1);       // Enable auto white balance
    s->set_awb_gain(s, 1);       // Enable AWB gain
    s->set_wb_mode(s, 0);        // Auto white balance mode
    s->set_exposure_ctrl(s, 1);  // Enable auto exposure
    s->set_aec2(s, 1);           // Enable AEC DSP
    s->set_ae_level(s, 0);       // -2 to 2 (exposure compensation)
    s->set_aec_value(s, 300);    // 0-1200 (manual exposure if needed)
    
    // Gain Control
    s->set_gain_ctrl(s, 1);      // Enable auto gain
    s->set_agc_gain(s, 0);       // 0-30 (auto gain value)
    s->set_gainceiling(s, (gainceiling_t)2); // Gain ceiling (0-6, lower = less noise)
    
    // Image Quality Enhancements
    s->set_bpc(s, 1);            // Black pixel correction
    s->set_wpc(s, 1);            // White pixel correction
    s->set_raw_gma(s, 1);        // Gamma correction (better contrast)
    s->set_lenc(s, 1);           // Lens correction (reduce distortion)
    s->set_dcw(s, 1);            // Downscale enable
    
    // Disable effects
    s->set_special_effect(s, 0); // No special effects
    s->set_colorbar(s, 0);       // No test pattern
    
    // Orientation (adjust if camera is mounted differently)
    s->set_hmirror(s, 0);        // Horizontal mirror: 0=off, 1=on
    s->set_vflip(s, 1);          // Vertical flip: 0=off, 1=on ✓ ENABLED
    
    Serial.println("✓ Camera optimized: High contrast, VGA resolution, quality=8");
  } else {
    Serial.println("⚠ Warning: Could not access camera sensor");
  }

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("✓ Wi-Fi connected!");
  Serial.print("📷 Camera Stream Ready: http://");
  Serial.print(WiFi.localIP());
  Serial.println(":81/");
  Serial.println("➜ Open this URL in your browser or use it in your app");

  // Start the camera server
  startCameraServer();
}

void loop() {
  delay(100);
}

// ========== HTTP Server Code ==========
httpd_handle_t stream_httpd = NULL;

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];
  
  static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=frame";
  static const char* _STREAM_BOUNDARY = "\r\n--frame\r\n";
  static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

  // Set content type
  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if(res != ESP_OK) return res;

  // ===== IMPROVED: Add CORS headers for web access =====
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET");

  // Stream loop
  while(true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("⚠ Camera capture failed");
      res = ESP_FAIL;
      break;
    }

    // Send frame boundary
    if (httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY)) != ESP_OK) {
      esp_camera_fb_return(fb);
      break;
    }

    // Send frame header
    size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, fb->len);
    if (httpd_resp_send_chunk(req, (const char *)part_buf, hlen) != ESP_OK) {
      esp_camera_fb_return(fb);
      break;
    }

    // Send frame data
    if (httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len) != ESP_OK) {
      esp_camera_fb_return(fb);
      break;
    }

    // Return frame buffer
    esp_camera_fb_return(fb);
    fb = NULL;
  }

  return res;
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 81;
  config.ctrl_port = 32768; // Control port

  httpd_uri_t stream_uri = {
    .uri       = "/",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  Serial.print("Starting camera server on port 81...");
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    Serial.println(" ✓ Started!");
  } else {
    Serial.println(" ❌ Failed!");
  }
}
