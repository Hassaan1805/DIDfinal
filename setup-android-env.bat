@echo off
echo.
echo ===============================================
echo  Android Environment Setup
echo ===============================================
echo.

REM Check if Android Studio is installed
set DEFAULT_ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk

if exist "%DEFAULT_ANDROID_HOME%" (
    echo Android SDK found at: %DEFAULT_ANDROID_HOME%
    echo.
    echo Setting up environment variables...
    
    REM Set ANDROID_HOME
    setx ANDROID_HOME "%DEFAULT_ANDROID_HOME%"
    setx ANDROID_SDK_ROOT "%DEFAULT_ANDROID_HOME%"
    
    REM Get current PATH
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set CURRENT_PATH=%%b
    
    REM Add Android tools to PATH if not already present
    echo %CURRENT_PATH% | findstr /C:"%DEFAULT_ANDROID_HOME%" >nul
    if errorlevel 1 (
        echo Adding Android tools to PATH...
        setx PATH "%CURRENT_PATH%;%DEFAULT_ANDROID_HOME%\platform-tools;%DEFAULT_ANDROID_HOME%\tools;%DEFAULT_ANDROID_HOME%\tools\bin"
        echo.
        echo ✅ Environment variables set successfully!
        echo.
        echo IMPORTANT: Please restart your command prompt or VS Code
        echo for the changes to take effect.
    ) else (
        echo ✅ Android tools already in PATH
    )
    
) else (
    echo.
    echo ❌ Android SDK not found at default location.
    echo.
    echo Please install Android Studio first, or if it's installed in a different location,
    echo manually set these environment variables:
    echo.
    echo ANDROID_HOME=C:\path\to\your\android\sdk
    echo ANDROID_SDK_ROOT=C:\path\to\your\android\sdk
    echo.
    echo And add to PATH:
    echo %%ANDROID_HOME%%\platform-tools
    echo %%ANDROID_HOME%%\tools
    echo %%ANDROID_HOME%%\tools\bin
)

echo.
pause
