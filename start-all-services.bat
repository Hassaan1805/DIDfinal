@echo off
echo.
echo ===============================================
echo  Trust Wallet - Full System Test
echo ===============================================
echo.

echo This script will start all services for testing:
echo 1. Backend API (Port 3001)
echo 2. Web Portal (Port 3000)  
echo 3. Mobile App Metro Bundler (Port 8081)
echo.
echo Make sure you have:
echo - Android device/emulator connected
echo - Android Studio and SDK installed
echo - All npm dependencies installed
echo.
pause

REM Get the root directory
set ROOT_DIR=%~dp0..

echo.
echo Starting Backend API...
start "Backend API" cmd /k "cd /d %ROOT_DIR%\backend && npm run dev"

echo.
echo Starting Web Portal...
start "Web Portal" cmd /k "cd /d %ROOT_DIR%\portal && npm run dev"

echo.
echo Starting Mobile Metro Bundler...
start "Metro Bundler" cmd /k "cd /d %ROOT_DIR%\wallet && npm start"

echo.
echo ===============================================
echo  All Services Started!
echo ===============================================
echo.
echo URLs:
echo - Backend API: http://localhost:3001
echo - Web Portal: http://localhost:3000
echo - Metro Bundler: http://localhost:8081
echo.
echo For Android testing:
echo - Emulator: Use 10.0.2.2 instead of localhost
echo - Physical Device: Use your computer's IP address
echo.
echo To deploy to Android device, run in a new terminal:
echo   cd wallet && npm run android
echo.
echo Press any key to exit...
pause
