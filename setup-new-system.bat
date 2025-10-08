@echo off
REM Automated Setup Script for DID Platform on New Windows System
REM This script will configure everything needed to run the platform

echo 🚀 DID Platform - New System Setup
echo =====================================
echo.
echo This script will:
echo 1. Detect your system IP address
echo 2. Install dependencies
echo 3. Configure environment files
echo 4. Set up firewall rules
echo 5. Start the platform
echo.
pause

REM Get system IP address
echo 📡 Detecting system IP address...
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%j in ("%%i") do set SYSTEM_IP=%%j
)

REM Clean up IP (remove spaces)
set SYSTEM_IP=%SYSTEM_IP: =%

echo ✅ System IP detected: %SYSTEM_IP%
echo.

REM Check if Node.js is installed
echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
)
echo ✅ Backend dependencies installed

REM Configure backend environment
echo ⚙️ Configuring backend for IP: %SYSTEM_IP%
(
echo PORT=3001
echo NODE_ENV=development
echo HOST=0.0.0.0
echo DEMO_MODE=true
echo JWT_SECRET=dev_jwt_secret_2024_new_system
echo SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key_here
echo SEPOLIA_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
echo CORS_ORIGINS=http://localhost:5173,http://%SYSTEM_IP%:5173,http://localhost:3000
) > .env.development

echo ✅ Backend configured for %SYSTEM_IP%:3001

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..\portal
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
)
echo ✅ Frontend dependencies installed

REM Configure frontend environment
echo ⚙️ Configuring frontend for IP: %SYSTEM_IP%
(
echo VITE_API_BASE_URL=http://%SYSTEM_IP%:3001/api
echo VITE_API_URL=/api
echo VITE_DEV_MODE=true
echo VITE_DEBUG_API=true
echo VITE_HOT_RELOAD=true
echo VITE_NODE_ENV=development
) > .env.development

(
echo VITE_API_BASE_URL=http://%SYSTEM_IP%:3001/api
echo VITE_NODE_ENV=development
echo VITE_DEBUG=true
) > .env.local

echo ✅ Frontend configured for %SYSTEM_IP%:5173

REM Configure firewall (optional)
echo 🔥 Setting up Windows Firewall rules...
netsh advfirewall firewall add rule name="DID Platform Backend" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1
netsh advfirewall firewall add rule name="DID Platform Frontend" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1
echo ✅ Firewall rules added (if permissions allow)

REM Go back to root directory
cd ..

REM Create start script
echo 📝 Creating start script...
(
echo @echo off
echo echo 🚀 Starting DID Platform...
echo echo Backend: http://%SYSTEM_IP%:3001/api/health
echo echo Frontend: http://%SYSTEM_IP%:5173
echo echo Mobile Access: Use %SYSTEM_IP%:3001 in mobile app
echo echo.
echo start "DID Backend" cmd /c "cd backend && npm run start"
echo timeout /t 5 >nul
echo start "DID Frontend" cmd /c "cd portal && npm run dev"
echo echo.
echo echo ✅ Services starting in separate windows...
echo echo ✅ Backend: http://%SYSTEM_IP%:3001/api/health
echo echo ✅ Frontend: http://%SYSTEM_IP%:5173
echo echo ✅ Mobile: Use IP %SYSTEM_IP%:3001
echo echo.
echo echo Press any key to open frontend in browser...
echo pause >nul
echo start http://%SYSTEM_IP%:5173
) > start-platform.bat

echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo Your DID Platform is configured for:
echo   Backend:  http://%SYSTEM_IP%:3001/api/health
echo   Frontend: http://%SYSTEM_IP%:5173
echo   Mobile:   Configure app to use %SYSTEM_IP%:3001
echo.
echo 📱 Mobile App Setup:
echo 1. Install app-release.apk on your Android device
echo 2. Ensure device is on same WiFi network
echo 3. App will auto-discover backend at %SYSTEM_IP%:3001
echo.
echo 🚀 To start the platform:
echo   Run: start-platform.bat
echo   Or manually: cd backend && npm run start (then) cd portal && npm run dev
echo.
echo Would you like to start the platform now? (Y/N)
set /p START_NOW=
if /i "%START_NOW%"=="Y" (
    echo Starting platform...
    call start-platform.bat
) else (
    echo Platform ready! Run start-platform.bat when ready.
)

echo.
echo 📋 Quick Test Commands:
echo   curl http://%SYSTEM_IP%:3001/api/health
echo   curl http://%SYSTEM_IP%:5173
echo.
pause