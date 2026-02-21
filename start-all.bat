@echo off
echo ==============================================
echo   DID Platform - Auto Setup + Start
echo ==============================================
echo.

REM ── Step 1: Detect IP ─────────────────────────
set IP=
set RAWIP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    if not defined RAWIP set RAWIP=%%a
)
for /f "tokens=* delims= " %%a in ("%RAWIP%") do set IP=%%a

echo Detected IP: %IP%
echo.
set /p CONFIRM="Press Enter to use this IP, or type a different one: "
if not "%CONFIRM%"=="" set IP=%CONFIRM%

echo.
echo Using IP: %IP%
echo.

REM ── Step 2: Update ALL config files ──────────
echo Updating config files...

REM portal/.env.local
(
echo VITE_API_BASE_URL=/api
echo VITE_BACKEND_URL=http://%IP%:3001
echo VITE_NODE_ENV=development
) > "%~dp0portal\.env.local"
echo   Updated: portal/.env.local

REM portal/vite.config.ts - update proxy target
powershell -Command "(Get-Content '%~dp0portal\vite.config.ts' -Raw) -replace \"target: 'http://[^']+:3001'\", \"target: 'http://%IP%:3001'\" | Set-Content '%~dp0portal\vite.config.ts' -NoNewline"
echo   Updated: portal/vite.config.ts

REM backend/.env.development - update PRIMARY_HOST_IP only (HOST stays 0.0.0.0)
powershell -Command "(Get-Content '%~dp0backend\.env.development' -Raw) -replace 'PRIMARY_HOST_IP=[\d.]+', 'PRIMARY_HOST_IP=%IP%' | Set-Content '%~dp0backend\.env.development' -NoNewline"
echo   Updated: backend/.env.development

REM wallet/.env - full rewrite
(
echo # Auto-updated by start-all.bat
echo EXPO_PUBLIC_API_URL=http://%IP%:3001
echo EXPO_PUBLIC_API_URL_FALLBACK_1=http://localhost:3001
echo EXPO_PUBLIC_NETWORK_TIMEOUT=10000
echo EXPO_PUBLIC_AUTO_DISCOVER=true
echo EXPO_PUBLIC_CHAIN_ID=11155111
echo EXPO_PUBLIC_NETWORK=sepolia
) > "%~dp0wallet\.env"
echo   Updated: wallet/.env

echo.
echo All configs updated with IP: %IP%
echo.

REM ── Step 3: Start all services ───────────────
echo Starting Backend  (port 3001)...
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Portal   (port 5173)...
start "Portal" cmd /k "cd /d %~dp0portal && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Wallet   (Expo Metro)...
start "Wallet" cmd /k "cd /d %~dp0wallet && npx expo start --clear"

echo.
echo ==============================================
echo   All services started!
echo   Backend : http://localhost:3001
echo   Portal  : http://localhost:5173
echo   Wallet  : Scan QR code in Expo Go
echo   Phone must be on same WiFi as this PC
echo ==============================================
echo.
pause
