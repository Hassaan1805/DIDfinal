@echo off
echo ================================================
echo    Android Setup for Decentralized Trust Wallet
echo ================================================
echo.

echo Setting up Android environment...
echo.

echo OPTION 1: Quick Setup (Recommended)
echo ------------------------------------
echo 1. Download Android Studio from: https://developer.android.com/studio
echo 2. During installation, ensure these are checked:
echo    - Android SDK
echo    - Android SDK Platform
echo    - Android Virtual Device
echo 3. After installation, add to PATH:
echo    - Android SDK: %%LOCALAPPDATA%%\Android\Sdk
echo    - Platform tools: %%LOCALAPPDATA%%\Android\Sdk\platform-tools
echo.

echo OPTION 2: Manual Environment Setup
echo -----------------------------------
echo Add these to your environment variables:
echo ANDROID_HOME=%%LOCALAPPDATA%%\Android\Sdk
echo PATH=%%PATH%%;%%ANDROID_HOME%%\platform-tools;%%ANDROID_HOME%%\tools
echo.

echo OPTION 3: Test with Existing Setup
echo -----------------------------------
echo If you have Android Studio installed, let's try to run:
echo.

set /p choice="Do you want to try running the app now? (y/n): "
if /i "%choice%"=="y" goto try_run

echo.
echo To complete setup:
echo 1. Install Android Studio (if not already installed)
echo 2. Run this script again and choose 'y'
echo 3. Or manually run: npx react-native run-android
echo.
pause
exit /b 0

:try_run
echo.
echo Checking environment...
echo.

:: Check if gradlew exists
if not exist "android\gradlew.bat" (
    echo ❌ Gradle wrapper missing. Generating...
    echo.
    
    :: Try to create a simple gradlew.bat if missing
    echo @echo off > android\gradlew.bat
    echo echo Gradle wrapper not properly configured >> android\gradlew.bat
    echo echo Please install Android Studio and SDK >> android\gradlew.bat
    echo exit /b 1 >> android\gradlew.bat
)

echo Attempting to run React Native app...
echo.
echo ⚠️  This requires:
echo   - Android Studio installed
echo   - Android SDK configured  
echo   - USB debugging enabled on your phone
echo   - Phone connected via USB
echo.

npx react-native run-android

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to run app. Common issues:
    echo.
    echo 1. Android Studio not installed
    echo 2. ANDROID_HOME not set
    echo 3. USB debugging not enabled
    echo 4. Phone not connected
    echo.
    echo 📱 Alternative: Use the web QR scanner for testing!
    echo    Portal: http://localhost:5174
    echo    Scanner: Open test-qr-scanner.html
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ App should be running on your phone!
echo.
echo Next steps:
echo 1. Open the wallet app on your phone
echo 2. Navigate to QR Scanner
echo 3. Scan the QR code from the portal
echo.
pause
