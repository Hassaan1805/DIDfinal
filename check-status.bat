@echo off
echo.
echo ===============================================
echo  Trust Wallet - System Status Check
echo ===============================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js: Available
    node --version
) else (
    echo ❌ Node.js: Not found! Please install Node.js
)

echo.

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm: Available
    npm --version
) else (
    echo ❌ npm: Not found!
)

echo.

REM Check Java
echo Checking Java...
java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Java: Available
    java -version 2>&1 | findstr "version"
) else (
    echo ❌ Java: Not found! Please install JDK
)

echo.

REM Check Android SDK
echo Checking Android SDK...
if defined ANDROID_HOME (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
    if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
        echo ✅ ADB: Available
    ) else (
        echo ❌ ADB: Not found in ANDROID_HOME
    )
) else (
    echo ❌ ANDROID_HOME: Not set! Please install Android Studio
)

echo.

REM Check connected devices
echo Checking connected Android devices...
if defined ANDROID_HOME (
    "%ANDROID_HOME%\platform-tools\adb.exe" devices 2>nul | findstr "device" | findstr -v "List"
    if %errorlevel% equ 0 (
        echo ✅ Android devices found
    ) else (
        echo ⚠️  No Android devices connected
        echo    Connect a device or start an emulator
    )
) else (
    echo ❌ Cannot check devices - ADB not available
)

echo.

REM Check project dependencies
echo Checking project dependencies...

echo.
echo Backend dependencies:
if exist "%~dp0..\backend\node_modules" (
    echo ✅ Backend: Dependencies installed
) else (
    echo ❌ Backend: Run 'npm install' in backend directory
)

echo.
echo Portal dependencies:
if exist "%~dp0..\portal\node_modules" (
    echo ✅ Portal: Dependencies installed
) else (
    echo ❌ Portal: Run 'npm install' in portal directory
)

echo.
echo Wallet dependencies:
if exist "%~dp0wallet\node_modules" (
    echo ✅ Wallet: Dependencies installed
) else (
    echo ❌ Wallet: Run 'npm install' in wallet directory
)

echo.
echo ===============================================
echo  Status Check Complete
echo ===============================================
echo.

if defined ANDROID_HOME (
    echo Ready to build Android app!
    echo Run: start-all-services.bat
    echo Then: cd wallet && npm run android
) else (
    echo Setup required: Install Android Studio and set ANDROID_HOME
)

echo.
pause
