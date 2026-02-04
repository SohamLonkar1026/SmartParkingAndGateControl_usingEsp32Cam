@echo off
title Smart Parking Server
echo ========================================
echo   Smart Parking System - Server
echo ========================================
echo.
echo Starting server...
echo.
cd /d "%~dp0"
node server.js
echo.
echo Server stopped.
pause
