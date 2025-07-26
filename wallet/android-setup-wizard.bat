@echo off
cls
echo.
echo ===============================================
echo         TRUST WALLET ANDROID SETUP
echo ===============================================
echo.
echo This script will guide you through setting up the Android development environment
echo for testing the Trust Wallet QR authentication app.
echo.

:MENU
echo.
echo What would you like to do?
echo.
echo 1. Check current system status
echo 2. Install Android Studio (opens download page)
echo 3. Set up Android environment variables
echo 4. Create Android Virtual Device (AVD)
echo 5. Test React Native environment
echo 6. Build the Android app
echo 7. Start all services and test end-to-end
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto CHECK_STATUS
if "%choice%"=="2" goto INSTALL_ANDROID_STUDIO
if "%choice%"=="3" goto SETUP_ENV
if "%choice%"=="4" goto CREATE_AVD
if "%choice%"=="5" goto TEST_RN
if "%choice%"=="6" goto BUILD_APP
if "%choice%"=="7" goto FULL_TEST
if "%choice%"=="8" goto EXIT

echo Invalid choice. Please try again.
goto MENU

:CHECK_STATUS
cls
echo.
echo ===============================================
echo           SYSTEM STATUS CHECK
echo ===============================================
echo.

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js: Available
    node --version
) else (
    echo ❌ Node.js: Not found! Please install Node.js first
)

echo.
echo Checking Java...
java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Java: Available
    java -version 2>&1 | findstr "version"
) else (
    echo ❌ Java: Not found! Please install JDK
)

echo.
echo Checking Android SDK...
if defined ANDROID_HOME (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
    if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
        echo ✅ ADB: Available
        "%ANDROID_HOME%\platform-tools\adb.exe" devices 2>nul
    ) else (
        echo ❌ ADB: Not found in ANDROID_HOME
    )
) else (
    echo ❌ ANDROID_HOME: Not set! Need to install Android Studio
)

echo.
echo Checking React Native dependencies...
if exist "node_modules" (
    echo ✅ Dependencies: Installed
) else (
    echo ❌ Dependencies: Run 'npm install'
)

echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:INSTALL_ANDROID_STUDIO
cls
echo.
echo ===============================================
echo        ANDROID STUDIO INSTALLATION
echo ===============================================
echo.
echo Opening Android Studio download page...
echo.
echo After downloading and installing Android Studio:
echo 1. ✅ Install Android SDK
echo 2. ✅ Install Android SDK Platform 
echo 3. ✅ Install Android Virtual Device
echo 4. ✅ Accept all license agreements
echo.
echo Then come back and run option 3 to set up environment variables.
echo.
start https://developer.android.com/studio
echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:SETUP_ENV
cls
echo.
echo ===============================================
echo      ANDROID ENVIRONMENT SETUP
echo ===============================================
echo.

set DEFAULT_ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk

if exist "%DEFAULT_ANDROID_HOME%" (
    echo Android SDK found at: %DEFAULT_ANDROID_HOME%
    echo.
    echo Setting up environment variables...
    
    setx ANDROID_HOME "%DEFAULT_ANDROID_HOME%" >nul
    setx ANDROID_SDK_ROOT "%DEFAULT_ANDROID_HOME%" >nul
    
    echo ✅ ANDROID_HOME set to: %DEFAULT_ANDROID_HOME%
    echo ✅ ANDROID_SDK_ROOT set to: %DEFAULT_ANDROID_HOME%
    
    echo.
    echo Adding Android tools to PATH...
    
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set CURRENT_PATH=%%b
    setx PATH "%CURRENT_PATH%;%DEFAULT_ANDROID_HOME%\platform-tools;%DEFAULT_ANDROID_HOME%\tools;%DEFAULT_ANDROID_HOME%\tools\bin" >nul
    
    echo ✅ Added Android tools to PATH
    echo.
    echo 🔄 IMPORTANT: Please close and reopen your command prompt
    echo    for the changes to take effect!
    echo.
    echo Environment setup complete!
    
) else (
    echo ❌ Android SDK not found at: %DEFAULT_ANDROID_HOME%
    echo.
    echo Please install Android Studio first (option 2)
    echo or manually set ANDROID_HOME if installed elsewhere.
)

echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:CREATE_AVD
cls
echo.
echo ===============================================
echo     CREATE ANDROID VIRTUAL DEVICE
echo ===============================================
echo.

if defined ANDROID_HOME (
    echo Opening Android Studio AVD Manager...
    echo.
    echo To create a virtual device:
    echo 1. Open Android Studio
    echo 2. Go to Tools → AVD Manager
    echo 3. Click "Create Virtual Device"
    echo 4. Choose a device (e.g., Pixel 4)
    echo 5. Select API Level 30 or higher
    echo 6. Click "Next" and "Finish"
    echo 7. Start the emulator
    echo.
    
    if exist "%ANDROID_HOME%\tools\bin\avdmanager.exe" (
        echo Available system images:
        "%ANDROID_HOME%\tools\bin\avdmanager.exe" list targets 2>nul
    )
    
    start "" "%ANDROID_HOME%\..\Android Studio\bin\studio64.exe" 2>nul
    if %errorlevel% neq 0 (
        echo Could not find Android Studio. Please open it manually.
    )
) else (
    echo ❌ ANDROID_HOME not set. Please run option 3 first.
)

echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:TEST_RN
cls
echo.
echo ===============================================
echo      REACT NATIVE ENVIRONMENT TEST
echo ===============================================
echo.

echo Testing React Native CLI...
npx react-native doctor

echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:BUILD_APP
cls
echo.
echo ===============================================
echo         BUILD ANDROID APP
echo ===============================================
echo.

echo Building the Trust Wallet Android app...
echo.

if not defined ANDROID_HOME (
    echo ❌ ANDROID_HOME not set. Please run option 3 first.
    goto BUILD_END
)

echo 1. Cleaning previous builds...
cd android 2>nul
if exist "gradlew.bat" (
    call gradlew.bat clean
) else (
    echo ❌ Gradle wrapper not found. Android project may not be set up correctly.
    cd ..
    goto BUILD_END
)
cd ..

echo.
echo 2. Building debug APK...
cd android
call gradlew.bat assembleDebug
cd ..

if %errorlevel% equ 0 (
    echo.
    echo ✅ BUILD SUCCESSFUL!
    echo.
    echo APK created at: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo To install on connected device: adb install android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo.
    echo ❌ Build failed. Check the output above for errors.
)

:BUILD_END
echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:FULL_TEST
cls
echo.
echo ===============================================
echo      FULL END-TO-END TEST SETUP
echo ===============================================
echo.

echo This will start all services needed for testing:
echo.
echo 1. Backend API (localhost:3001)
echo 2. Web Portal (localhost:3000)
echo 3. Mobile Metro Bundler (localhost:8081)
echo.
echo Make sure you have:
echo ✅ Android device connected or emulator running
echo ✅ Environment variables set up
echo.
set /p proceed="Proceed? (y/n): "

if /i not "%proceed%"=="y" goto MENU

echo.
echo Starting services...

start "Backend API" cmd /c "cd ..\backend && npm run dev"
timeout /t 2 >nul

start "Web Portal" cmd /c "cd ..\portal && npm run dev"
timeout /t 2 >nul

start "Metro Bundler" cmd /c "npm start"
timeout /t 3 >nul

echo.
echo ✅ All services started!
echo.
echo URLs:
echo - Backend: http://localhost:3001
echo - Portal: http://localhost:3000  
echo - Metro: http://localhost:8081
echo.
echo Now run in a new terminal: npm run android
echo.
echo Testing flow:
echo 1. Mobile: Create identity
echo 2. Browser: Visit http://localhost:3000/login
echo 3. Mobile: Scan QR code
echo 4. Verify authentication success
echo.

echo Press any key to return to menu...
pause >nul
goto MENU

:EXIT
echo.
echo Thank you for using Trust Wallet Android Setup!
echo.
echo For support, check the ANDROID_SETUP.md guide.
echo.
exit /b 0
