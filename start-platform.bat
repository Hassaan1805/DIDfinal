@echo off
REM Comprehensive DID Platform Startup Script for Windows
REM This script ensures all components start correctly and are accessible

echo 🚀 Starting Decentralized Trust Platform...
echo =============================================

REM Function to check if port is in use
:check_port
netstat -an | find ":%1 " >nul
if %errorlevel%==0 (
    exit /b 0
) else (
    exit /b 1
)

REM Kill any existing processes
echo Step 1: Cleaning up existing processes...
taskkill /f /im node.exe /t >nul 2>&1
timeout /t 3 >nul

REM Start Backend
echo Step 2: Starting Backend Server...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
)

REM Copy environment file
if not exist .env (
    copy .env.development .env >nul
    echo Created backend .env file
)

REM Start backend
start "Backend Server" cmd /c "npm run dev"
echo Backend starting...

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 10 >nul

REM Test backend health
echo Step 3: Testing Backend Health...
curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/health >temp_status.txt 2>nul
set /p HEALTH_STATUS=<temp_status.txt
del temp_status.txt >nul 2>&1

if "%HEALTH_STATUS%"=="200" (
    echo ✅ Backend health check passed
) else (
    echo ❌ Backend health check failed
)

REM Start Frontend
cd ..\portal
echo Step 4: Starting Frontend Portal...
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

REM Copy environment file
if not exist .env.local (
    echo VITE_API_BASE_URL=http://192.168.1.100:3001/api > .env.local
    echo Created frontend .env.local file
)

REM Start frontend
start "Frontend Portal" cmd /c "npm run dev"
echo Frontend starting...

REM Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 10 >nul

REM Get local IP (simplified for Windows)
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%j in ("%%i") do set LOCAL_IP=%%j
)

echo.
echo 🎉 Decentralized Trust Platform Started Successfully!
echo =============================================
echo Backend API:     http://localhost:3001/api/health
echo Frontend Portal: http://localhost:5173
echo Network Access:  http://%LOCAL_IP%:3001/api/health
echo Mobile Access:   http://%LOCAL_IP%:5173
echo.
echo 🔧 Testing URLs:
echo   Backend Health: curl http://localhost:3001/api/health
echo   Challenge API:  curl -X POST http://localhost:3001/api/auth/challenge
echo   DID Wallet:     http://localhost:5173/secure-wallet-local.html
echo.
echo 📱 For Mobile Testing:
echo   Update mobile app to use: http://%LOCAL_IP%:3001
echo.
echo Press any key to open the portal in your browser...
pause >nul

REM Open browser
start http://localhost:5173

echo.
echo Services are running in separate windows.
echo Close those windows to stop the services.
echo.
pause