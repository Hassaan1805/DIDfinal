@echo off
REM Mobile App Build Script for Production Deployment - Windows
REM This script builds the Flutter app with production configuration

echo 📱 Building DID Wallet for Production
echo =====================================

REM Check if Flutter is installed
flutter --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Flutter is not installed!
    echo Please install Flutter from: https://flutter.dev/docs/get-started/install
    pause
    exit /b 1
)

echo ✅ Flutter is installed

REM Get backend URL from user input
echo.
set /p BACKEND_URL="Enter your Railway backend URL (e.g., https://your-backend-service.railway.app): "

if "%BACKEND_URL%"=="" (
    echo ❌ Backend URL is required!
    pause
    exit /b 1
)

echo ✅ Backend URL set to: %BACKEND_URL%

REM Navigate to mobile wallet directory
cd mobile_wallet

REM Clean previous builds
echo 🧹 Cleaning previous builds...
flutter clean
flutter pub get

REM Update network service with production URL
echo 🔧 Configuring production URLs...

REM Create backup of network service
copy lib\services\network_service.dart lib\services\network_service.dart.bak

REM Update URLs in network service (simple text replacement)
powershell -Command "(gc lib\services\network_service.dart) -replace 'https://did-platform-backend.railway.app', '%BACKEND_URL%' | Out-File -encoding UTF8 lib\services\network_service.dart"
powershell -Command "(gc lib\services\network_service.dart) -replace 'https://your-backend-service.railway.app', '%BACKEND_URL%' | Out-File -encoding UTF8 lib\services\network_service.dart"

echo ✅ Production URLs configured

REM Build for Android
echo 📦 Building Android APK...
flutter build apk --release --target-platform android-arm64

if errorlevel 1 (
    echo ❌ Android build failed!
    pause
    exit /b 1
)

echo ✅ Android APK built successfully!

REM Get current date for filename
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YMD=%dt:~0,8%"

set APK_PATH=build\app\outputs\flutter-apk\app-release.apk
echo ✅ APK Location: %APK_PATH%

REM Copy APK to project root with descriptive name
copy "%APK_PATH%" "..\DID-Wallet-Production-%YMD%.apk"
echo ✅ APK copied to project root

REM Build App Bundle for Play Store (optional)
echo 📱 Building Android App Bundle...
flutter build appbundle --release

if errorlevel 1 (
    echo ⚠️ App Bundle build failed (this is optional)
) else (
    echo ✅ Android App Bundle built successfully!
    set AAB_PATH=build\app\outputs\bundle\release\app-release.aab
    echo ✅ AAB Location: %AAB_PATH%
)

REM Restore original network service file
if exist lib\services\network_service.dart.bak (
    move lib\services\network_service.dart.bak lib\services\network_service.dart
)

echo.
echo 🎉 Build Complete!
echo ===================
echo Backend URL: %BACKEND_URL%
echo APK Location: ..\DID-Wallet-Production-%YMD%.apk
echo.
echo 📱 Installation Instructions:
echo 1. Transfer the APK to your Android device
echo 2. Enable 'Install from unknown sources' in Android settings
echo 3. Install the APK
echo 4. The app will automatically connect to your Railway backend
echo.
echo 🔧 Testing Steps:
echo 1. Open the app
echo 2. Check network connectivity in the app
echo 3. Verify it connects to: %BACKEND_URL%
echo 4. Test QR code authentication with your portal
echo.
echo 💡 Troubleshooting:
echo - Check network connectivity
echo - Verify backend URL is accessible
echo - Check app logs for connection errors

pause