@echo off
echo 🚀 Deploying Portal to Vercel
echo ================================

cd /d "e:\projects\Random Projects\DIDfinal\portal"

echo 📦 Installing Vercel CLI if not already installed...
npm list -g vercel >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

echo 🔐 Logging into Vercel...
vercel login

echo 🚀 Deploying to Vercel...
vercel --prod

echo ✅ Deployment initiated!
echo 📱 Check your Vercel dashboard for deployment status
echo 🌐 Your portal will be available at: https://did-platform-portal.vercel.app

pause