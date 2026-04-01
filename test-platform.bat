@echo off
setlocal

cd /d "%~dp0"

if "%BACKEND_BASE_URL%"=="" set BACKEND_BASE_URL=http://127.0.0.1:3001
if "%ADMIN_TOKEN%"=="" set ADMIN_TOKEN=integration-test-token

echo ========================================
echo Decentralized Trust Platform Test Suite
echo ========================================
echo Backend base URL: %BACKEND_BASE_URL%
echo.

echo [1/5] Health check...
curl -fsS %BACKEND_BASE_URL%/api/health >nul
if errorlevel 1 (
  echo Health check failed. Ensure backend is running.
  exit /b 1
)

echo [2/5] Enterprise end-to-end flow...
call npm --prefix backend run test:enterprise-e2e
if errorlevel 1 exit /b 1

echo [3/5] Verifier profile flow...
call npm --prefix backend run test:verifier-profiles
if errorlevel 1 exit /b 1

echo [4/5] Selective disclosure flow...
call npm --prefix backend run test:selective-disclosure
if errorlevel 1 exit /b 1

echo [5/5] Auth timeline flow...
call npm --prefix backend run test:auth-timeline
if errorlevel 1 exit /b 1

echo.
echo All platform tests passed.

endlocal
