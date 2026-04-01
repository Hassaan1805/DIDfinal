@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo Decentralized Trust Platform Startup
echo ========================================

echo [1/2] Starting backend on http://localhost:3001 ...
start "DTP Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 2 >nul

echo [2/2] Starting portal on http://localhost:5173 ...
start "DTP Portal" cmd /k "cd /d "%~dp0portal" && npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo Platform startup commands launched.
echo Backend: http://localhost:3001/api/health
echo Portal:  http://localhost:5173
echo.
echo Tip: use test-platform.bat after backend is healthy.

endlocal
