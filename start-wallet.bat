@echo off
echo ================================================
echo Starting DID Wallet Development
echo ================================================
echo.

REM Check if .env exists
if not exist "wallet\.env" (
    echo Warning: wallet/.env not found!
    echo Creating from .env.example...
    copy "wallet\.env.example" "wallet\.env"
    echo.
    echo Please update the IP address in wallet/.env
    echo Run update-wallet-ip.bat to configure automatically
    echo.
    pause
)

echo Starting Expo development server...
echo.
echo Scan the QR code with Expo Go app to run on your phone
echo.

cd wallet
call npm start

pause
