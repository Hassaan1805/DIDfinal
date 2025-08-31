@echo off
echo ============================================
echo   Decentralized Trust Platform - Mobile Wallet
echo ============================================
echo.

echo Checking environment...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js 16+ first.
    pause
    exit /b 1
)

:: Check if Java is installed
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java not found! Please install Java 11 or 17 first.
    pause
    exit /b 1
)

:: Check if Android SDK is available
adb version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Android SDK not found! Please install Android Studio and SDK.
    pause
    exit /b 1
)

echo ✅ Environment check passed!
echo.

echo Checking for connected devices...
adb devices
echo.

echo Choose an option:
echo 1. Install dependencies and run on Android device/emulator
echo 2. Start Metro bundler only
echo 3. Install dependencies only
echo 4. Open web QR scanner for testing
echo 5. Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto run_android
if "%choice%"=="2" goto start_metro
if "%choice%"=="3" goto install_deps
if "%choice%"=="4" goto open_web_scanner
if "%choice%"=="5" goto exit
goto invalid_choice

:run_android
echo.
echo Installing dependencies...
cd wallet
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting React Native app...
echo ⚠️  Make sure you have an Android device connected or emulator running!
echo.
npm run android
goto end

:start_metro
echo.
echo Starting Metro bundler...
cd wallet
npm start
goto end

:install_deps
echo.
echo Installing dependencies...
cd wallet
npm install
echo ✅ Dependencies installed successfully!
goto end

:open_web_scanner
echo.
echo Opening web QR scanner...
start http://localhost:8080/test-qr-scanner.html
echo ✅ Web scanner opened in your default browser
goto end

:invalid_choice
echo ❌ Invalid choice. Please enter 1-5.
pause
goto end

:exit
echo Goodbye!
goto end

:end
echo.
echo ============================================
echo   Setup complete! 
echo ============================================
echo.
echo Quick Testing Guide:
echo 1. Portal (Web): http://localhost:5173
echo 2. QR Scanner (Web): file:///[path]/test-qr-scanner.html  
echo 3. Mobile Wallet: Run this script and choose option 1
echo.
pause
