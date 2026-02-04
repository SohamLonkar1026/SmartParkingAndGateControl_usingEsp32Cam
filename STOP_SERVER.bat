@echo off
title Stop Smart Parking Server
echo ========================================
echo   Stopping Smart Parking Server...
echo ========================================
echo.
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel%==0 (
    echo Server stopped successfully!
) else (
    echo Server was not running.
)
echo.
pause
