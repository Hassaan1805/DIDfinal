@echo off
REM Railway Deployment Script for Decentralized Trust Platform - Windows
REM This script helps deploy both backend and portal to Railway

echo 🚀 Decentralized Trust Platform - Railway Deployment
echo ==================================================

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Railway CLI is not installed!
    echo Please install it with: npm install -g @railway/cli
    echo Or visit: https://railway.app/cli
    pause
    exit /b 1
)

echo ✅ Railway CLI is installed

REM Check if user is logged in
railway whoami >nul 2>&1
if errorlevel 1 (
    echo ⚠️ You need to login to Railway first
    echo Running: railway login
    railway login
)

echo ✅ Railway authentication verified

echo.
echo 📦 Setting up Railway project...
echo --------------------------------

REM Create Railway project if needed
railway status >nul 2>&1
if errorlevel 1 (
    echo Creating new Railway project...
    railway init
) else (
    echo Already in a Railway project
    railway status
)

echo.
echo 🔧 Deploying Backend Service...
echo --------------------------------

REM Deploy backend
cd backend

echo Setting up backend service...
railway add --name "did-platform-backend"

echo Setting backend environment variables...
railway variables set NODE_ENV=production
railway variables set DEMO_MODE=true
railway variables set "JWT_SECRET=71a4602d351070b66439bf41cf7fc34b55a58a128ac85978b77cf26e9e9edf58e407cb30351e55af9317c8110128c6a3984e0f6759b576923d85dc58eea9c37b"
railway variables set "ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/8442a43de5054ce0a632622b78fab286"
railway variables set "CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48"
railway variables set "GAS_STATION_PRIVATE_KEY=0x4c72f5e50ef5c4a2a3d7e3b5a1f8e9d6c3b0a7e4d1c8b5a2f9e6d3c0b7a4e1f8"

echo Deploying backend...
railway up

REM Get backend URL
for /f "tokens=*" %%i in ('railway domain') do set BACKEND_URL=%%i
echo ✅ Backend deployed at: %BACKEND_URL%

cd ..

echo.
echo 🌐 Deploying Portal Service...
echo --------------------------------

REM Deploy portal
cd portal

echo Setting up portal service...
railway add --name "did-platform-portal"

echo Setting portal environment variables...
railway variables set NODE_ENV=production
railway variables set "VITE_API_BASE_URL=%BACKEND_URL%/api"
railway variables set "VITE_BACKEND_URL=%BACKEND_URL%"
railway variables set "VITE_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48"
railway variables set VITE_DEMO_MODE=true

echo Deploying portal...
railway up

REM Get portal URL
for /f "tokens=*" %%i in ('railway domain') do set PORTAL_URL=%%i
echo ✅ Portal deployed at: %PORTAL_URL%

cd ..

echo.
echo 🎉 Deployment Complete!
echo =======================
echo Backend URL:  %BACKEND_URL%
echo Portal URL:   %PORTAL_URL%
echo.
echo 📱 Mobile App Configuration:
echo Update your mobile app to use: %BACKEND_URL%
echo.
echo 🔧 Next Steps:
echo 1. Test the deployed services
echo 2. Update mobile app configuration
echo 3. Build and test mobile app
echo 4. Configure custom domains (optional)
echo.
echo 💡 Useful Commands:
echo railway logs          - View application logs
echo railway status        - Check service status  
echo railway variables     - Manage environment variables
echo railway domain        - Manage custom domains

pause