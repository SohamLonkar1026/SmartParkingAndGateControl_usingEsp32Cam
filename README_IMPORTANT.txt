================================================================================
                    SMART PARKING SYSTEM - HOW TO USE
================================================================================

🚀 QUICK START (3 Easy Steps):
---------------------------------
1. Double-click:  START_SERVER.bat
2. Double-click:  OPEN_WEBSITE.bat  
3. Use your Smart Parking System!


📁 FILES YOU'LL USE:
---------------------------------
START_SERVER.bat     → Starts the server (keep window open!)
OPEN_WEBSITE.bat     → Opens http://localhost:3000 in browser
STOP_SERVER.bat      → Stops the server when you're done


⚠️ IMPORTANT - WHY YOU NEED THE SERVER:
---------------------------------
This is NOT a simple HTML website. It's a FULL APPLICATION with:
  
  ✅ Backend Server (Node.js)
  ✅ Database (SQLite)  
  ✅ API Endpoints (/api/scan, /api/vehicles, etc.)
  ✅ ESP32-CAM Proxy (avoids CORS errors)
  ✅ Real-time Processing

Simple HTML websites: Just open .html file → Works ✓
Your Parking System:  Need server running → Then open website


🎯 DAILY WORKFLOW:
---------------------------------
Morning:
  1. Double-click START_SERVER.bat
  2. Minimize the window (DON'T CLOSE!)
  3. Double-click OPEN_WEBSITE.bat
  4. Use system all day

Evening:
  1. Close browser
  2. Double-click STOP_SERVER.bat
  3. Done!


💡 WHY THE COMMAND WINDOW MUST STAY OPEN:
---------------------------------
That black window IS your server! It's running Node.js which:
  - Handles QR code scanning requests
  - Manages database (vehicles, logs, pricing)
  - Proxies ESP32-CAM stream
  - Processes entry/exit logic

If you close it = Server stops = Website stops working ❌


🔧 TROUBLESHOOTING:
---------------------------------
Website not loading?
  → Run STOP_SERVER.bat
  → Run START_SERVER.bat
  → Run OPEN_WEBSITE.bat

Port 3000 already in use?
  → Run STOP_SERVER.bat first
  → Then START_SERVER.bat

Server window closed accidentally?
  → Just run START_SERVER.bat again


📚 COMPARISON:
---------------------------------
BEFORE (Simple HTML websites):
  ├── index.html
  └── style.css
  → Just double-click index.html → Opens in browser ✓
  → No server needed!

NOW (Smart Parking System):
  ├── Frontend (HTML/CSS/JS)
  ├── Backend (Node.js server.js)
  ├── Database (parking.db)
  ├── APIs (/api/scan, /api/vehicles)
  └── ESP32-CAM Integration
  → Need server.js running → Then open http://localhost:3000
  → Server MUST stay running!


🎓 THINK OF IT LIKE:
---------------------------------
Your system is like a RESTAURANT:

Simple HTML = Menu PDF
  → Open file → Read it ✓

Smart Parking = Full Restaurant
  → Kitchen (Server) must be OPEN
  → Chefs (Node.js) must be WORKING
  → Storage (Database) must be ACCESSIBLE
  → Then customers (Browser) can order!

If kitchen closes → Restaurant stops working!


✅ CURRENT STATUS:
---------------------------------
Server is running! ✓
You can now use: http://localhost:3000

Features Available:
  ✅ QR Code Scanning (Webcam & ESP32-CAM)
  ✅ Vehicle Registration
  ✅ Entry/Exit Logging
  ✅ Pricing Management
  ✅ Parking Slot Status
  ✅ 30-second scan cooldown
  ✅ Clear logs & pricing buttons


📞 REMEMBER:
---------------------------------
Always keep START_SERVER.bat window OPEN while using the system!
Only close it when you're completely done for the day.

Happy Parking! 🚗🅿️

================================================================================

🔌 ESP32 HARDWARE INTEGRATION:
---------------------------------
To control gates and LEDs with ESP32, see:
  → ESP32_CONTROLLER_GUIDE.txt (complete setup guide)
  → Copy Arduino code and upload to ESP32 Dev Board
  → Configure IP address in server.js
  → Enable ESP32_CONTROLLER_ENABLED = true

================================================================================
