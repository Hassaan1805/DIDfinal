@echo off
echo ========================================
echo Quick Gas Fix Verification
echo ========================================
echo.

echo [1/3] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    exit /b 1
)
echo ✓ Node.js found

echo.
echo [2/3] Checking backend directory...
if not exist "backend\package.json" (
    echo ERROR: Backend directory not found!
    exit /b 1
)
echo ✓ Backend directory found

echo.
echo [3/3] Building backend...
cd backend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    echo Check the error messages above
    exit /b 1
)

echo.
echo ========================================
echo ✓ Build successful!
echo ========================================
echo.
echo Next steps:
echo   1. Check wallet balance: npm run sepolia:status
echo   2. Fund wallet if needed: https://sepoliafaucet.com/
echo   3. Start backend: npm run dev
echo   4. Test authentication
echo.
echo For detailed troubleshooting, see GAS_TROUBLESHOOTING.md
echo.

cd ..
