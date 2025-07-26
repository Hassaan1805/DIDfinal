@echo off
echo.
echo ===============================================
echo  Trust Wallet - Android Build Script
echo ===============================================
echo.

REM Check if Android environment is set up
if not defined ANDROID_HOME (
    echo ERROR: ANDROID_HOME is not set!
    echo Please install Android Studio and set ANDROID_HOME environment variable.
    echo Example: set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    pause
    exit /b 1
)

echo 1. Cleaning previous builds...
cd android
call gradlew clean
if %errorlevel% neq 0 (
    echo ERROR: Gradle clean failed!
    pause
    exit /b 1
)

echo.
echo 2. Installing npm dependencies...
cd ..
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo 3. Building Android APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo ERROR: Android build failed!
    pause
    exit /b 1
)

echo.
echo ===============================================
echo  BUILD SUCCESSFUL!
echo ===============================================
echo.
echo APK Location: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo To install on device:
echo   adb install android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo To run with Metro bundler:
echo   npm start (in separate terminal)
echo   npm run android
echo.
pause
