@echo off
echo ================================================
echo  DID Platform - Starting All Services
echo ================================================
echo.
echo Starting Backend (port 3001)...
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo Starting Portal (port 5173)...
start "Portal" cmd /k "cd /d %~dp0portal && npm run dev"

echo Starting Wallet (Expo / port 8081)...
start "Wallet" cmd /k "cd /d %~dp0wallet && npx expo start --clear"

echo.
echo All services starting in separate windows:
echo   Backend  : http://localhost:3001
echo   Portal   : http://localhost:5173
echo   Wallet   : exp://192.168.1.100:8081 (scan QR in Expo Go)
echo.
echo Close individual windows to stop each service.
pause
