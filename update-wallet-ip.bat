@echo off
echo ================================================
echo DID Wallet - Network IP Update Script
echo ================================================
echo.

REM Get IP address automatically
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    goto :found
)

:found
REM Trim spaces
set IP=%IP: =%

echo Your detected IP address: %IP%
echo.
echo Current .env content:
type wallet\.env 2>nul
echo.

:input
set /p USE_DETECTED="Use detected IP? (Y/n): "
if /i "%USE_DETECTED%"=="n" (
    set /p IP="Enter your IP address: "
)

echo.
echo Updating wallet/.env with IP: %IP%
echo.

REM Create or update .env file
(
echo # Backend Configuration - Updated %date% %time%
echo EXPO_PUBLIC_API_URL=http://%IP%:3001
echo.
echo # Alternative backends ^(for fallback^)
echo EXPO_PUBLIC_API_URL_FALLBACK_1=http://localhost:3001
echo EXPO_PUBLIC_API_URL_FALLBACK_2=https://did-platform-backend.railway.app
echo.
echo # Network Configuration
echo EXPO_PUBLIC_NETWORK_TIMEOUT=10000
echo EXPO_PUBLIC_AUTO_DISCOVER=true
echo.
echo # Blockchain Configuration
echo EXPO_PUBLIC_CHAIN_ID=11155111
echo EXPO_PUBLIC_NETWORK=sepolia
) > wallet\.env

echo.
echo ✓ Updated wallet/.env successfully!
echo ✓ Backend URL set to: http://%IP%:3001
echo.
echo Next steps:
echo 1. Restart the Expo development server if it's running
echo 2. Refresh the app on your phone
echo 3. Or use the Settings screen in the app to test the connection
echo.
pause
