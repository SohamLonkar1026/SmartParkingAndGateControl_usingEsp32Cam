@echo off
title Opening Smart Parking System
echo ========================================
echo   Smart Parking System
echo ========================================
echo.
echo Opening website in your browser...
start http://localhost:3000
echo.
echo Done! If browser didn't open, go to:
echo http://localhost:3000
echo.
timeout /t 3 >nul
