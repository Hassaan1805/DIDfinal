@echo off
REM Comprehensive DID Platform Testing Script for Windows
REM Tests all components and ensures end-to-end functionality

echo 🧪 DID Platform Comprehensive Testing Suite
echo =============================================

set TESTS_PASSED=0
set TESTS_FAILED=0
set TOTAL_TESTS=0

REM Main testing
echo === Backend Health Tests ===
echo Testing: Backend Health Check
set /a TOTAL_TESTS+=1
curl -s -f -m 5 http://localhost:3001/api/health >nul 2>&1
if %errorlevel%==0 (
    echo ✅ PASS: Backend Health Check
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Backend Health Check
    set /a TESTS_FAILED+=1
)

echo Testing: Backend Response Format
set /a TOTAL_TESTS+=1
curl -s http://localhost:3001/api/health 2>nul | findstr "status" >nul
if %errorlevel%==0 (
    echo ✅ PASS: Backend Response Format
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Backend Response Format
    set /a TESTS_FAILED+=1
)

echo.
echo === Frontend Tests ===
echo Testing: Frontend Portal
set /a TOTAL_TESTS+=1
curl -s -f -m 5 http://localhost:5173 >nul 2>&1
if %errorlevel%==0 (
    echo ✅ PASS: Frontend Portal
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Frontend Portal
    set /a TESTS_FAILED+=1
)

echo.
echo === File Structure Tests ===
echo Testing: Backend environment file
set /a TOTAL_TESTS+=1
if exist "backend\.env.development" (
    echo ✅ PASS: Backend environment file
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Backend environment file
    set /a TESTS_FAILED+=1
)

echo Testing: Frontend environment file
set /a TOTAL_TESTS+=1
if exist "portal\.env.local" (
    echo ✅ PASS: Frontend environment file
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Frontend environment file
    set /a TESTS_FAILED+=1
)

echo Testing: Secure wallet file
set /a TOTAL_TESTS+=1
if exist "portal\public\secure-wallet-local.html" (
    echo ✅ PASS: Secure wallet file
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Secure wallet file
    set /a TESTS_FAILED+=1
)

echo.
echo === Dependencies Tests ===
echo Testing: Backend node_modules
set /a TOTAL_TESTS+=1
if exist "backend\node_modules" (
    echo ✅ PASS: Backend node_modules
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Backend node_modules
    set /a TESTS_FAILED+=1
)

echo Testing: Frontend node_modules
set /a TOTAL_TESTS+=1
if exist "portal\node_modules" (
    echo ✅ PASS: Frontend node_modules
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Frontend node_modules
    set /a TESTS_FAILED+=1
)

echo.
echo === Network Connectivity Tests ===
echo Testing: Internet connectivity
set /a TOTAL_TESTS+=1
ping -n 1 google.com >nul 2>&1
if %errorlevel%==0 (
    echo ✅ PASS: Internet connectivity
    set /a TESTS_PASSED+=1
) else (
    echo ❌ FAIL: Internet connectivity
    set /a TESTS_FAILED+=1
)

REM Get local IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%j in ("%%i") do set LOCAL_IP=%%j
)

echo.
echo Local IP detected: %LOCAL_IP%

echo.
echo === Test Summary ===
echo ==============================
echo Total Tests: %TOTAL_TESTS%
echo Passed: %TESTS_PASSED%
echo Failed: %TESTS_FAILED%

REM Calculate success rate
if %TOTAL_TESTS% gtr 0 (
    set /a SUCCESS_RATE=(%TESTS_PASSED% * 100) / %TOTAL_TESTS%
    echo Success Rate: %SUCCESS_RATE%%%
    
    if %SUCCESS_RATE% geq 90 (
        echo 🎉 Excellent! Platform is ready for use.
    ) else if %SUCCESS_RATE% geq 75 (
        echo ⚠️  Good, but some issues need attention.
    ) else (
        echo ❌ Platform needs significant fixes before use.
    )
) else (
    echo ❌ No tests were run.
)

echo.
echo === Recommendations ===
if %TESTS_FAILED% gtr 0 (
    echo To fix failed tests:
    echo 1. Ensure backend and frontend are running
    echo 2. Check network connectivity  
    echo 3. Verify environment files are properly configured
    echo 4. Run 'npm install' in both backend and portal directories
    echo 5. Check firewall and antivirus settings
)

echo.
echo === Quick Start Commands ===
echo Backend: cd backend ^&^& npm run dev
echo Frontend: cd portal ^&^& npm run dev
echo Full Platform: start-platform.bat
echo.
echo === Access URLs ===
echo Portal: http://localhost:5173
echo API: http://localhost:3001/api/health
echo Network Access: http://%LOCAL_IP%:3001 and http://%LOCAL_IP%:5173
echo Wallet: http://localhost:5173/secure-wallet-local.html

pause