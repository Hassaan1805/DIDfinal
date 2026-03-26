@echo off
echo ========================================
echo Clearing Wallet Cache and Restarting
echo ========================================
echo.

cd wallet

echo [1/4] Clearing Metro bundler cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo    ✓ Cache cleared
) else (
    echo    ✓ No cache found (already clean)
)

echo.
echo [2/4] Clearing temp files...
if exist .expo (
    rmdir /s /q .expo
    echo    ✓ Expo cache cleared
)

echo.
echo [3/4] Starting wallet with --clear flag...
echo    This will rebuild the JavaScript bundle with new config
echo.

start cmd /k "npm start -- --clear"

echo.
echo ========================================
echo ✓ Cache cleared!
echo ========================================
echo.
echo NEXT STEPS:
echo   1. Wait for Metro bundler to finish building
echo   2. On your phone: Close Expo Go completely (swipe away)
echo   3. Reopen Expo Go
echo   4. Scan the QR code again
echo.
echo The wallet should now connect to: http://192.168.1.33:3001
echo.

cd ..
