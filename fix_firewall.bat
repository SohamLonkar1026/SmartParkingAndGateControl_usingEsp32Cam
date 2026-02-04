@echo off
echo ========================================
echo ESP32 Firewall Fix for Windows
echo ========================================
echo.
echo This will add firewall rules to allow ESP32 communication
echo.
pause

echo Adding firewall rules...

REM Allow incoming connections on port 80 (ESP32 Gate Controller)
netsh advfirewall firewall add rule name="ESP32 Gate Controller (Port 80)" dir=in action=allow protocol=TCP localport=80

REM Allow incoming connections on port 81 (ESP32-CAM)
netsh advfirewall firewall add rule name="ESP32-CAM Stream (Port 81)" dir=in action=allow protocol=TCP localport=81

REM Allow outgoing connections to ESP32 devices
netsh advfirewall firewall add rule name="ESP32 Devices Outbound" dir=out action=allow protocol=TCP remoteip=10.229.70.0/24

REM Allow ICMP (ping) for testing
netsh advfirewall firewall add rule name="ESP32 Ping Test" dir=in action=allow protocol=icmpv4

echo.
echo ========================================
echo Firewall rules added successfully!
echo ========================================
echo.
echo Now try accessing:
echo   - ESP32-CAM: http://10.229.70.93:81/
echo   - Gate Controller: http://10.229.70.240/
echo.
pause
