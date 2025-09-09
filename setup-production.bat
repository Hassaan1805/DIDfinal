@echo off
echo.
echo 🚀 DID Platform Production Setup for Sepolia Testnet
echo ==================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the project root directory
    exit /b 1
)

echo 📋 Production Setup Checklist:
echo.

echo 1. 🔐 Environment Configuration
echo    ✅ Backend production environment file created
echo    ✅ Portal production environment file created
echo    ✅ Contracts environment file created
echo    ✅ Strong JWT secret generated
echo.

echo 2. 🌐 Sepolia Testnet Requirements
echo    📝 You need to complete these steps manually:
echo.
echo    a^) Get Infura Project ID:
echo       - Go to https://infura.io
echo       - Create a free account
echo       - Create a new project
echo       - Copy your Project ID
echo.
echo    b^) Get a wallet with Sepolia ETH:
echo       - Create a new wallet ^(MetaMask recommended^)
echo       - Get the private key ^(keep it secure!^)
echo       - Get Sepolia ETH from faucet: https://sepoliafaucet.com/
echo       - You need ~0.01 ETH for deployment
echo.
echo    c^) Update environment files:
echo       - Edit contracts\.env
echo       - Replace YOUR_INFURA_PROJECT_ID with your actual Project ID
echo       - Replace YOUR_PRIVATE_KEY_HERE with your wallet private key
echo       - Edit backend\.env.production
echo       - Edit portal\.env.production
echo.

echo 3. 🚢 Deployment Commands
echo    After completing the above steps, run:
echo.
echo    REM Compile contracts
echo    cd contracts ^&^& npm run compile
echo.
echo    REM Deploy to Sepolia
echo    npm run deploy:sepolia
echo.
echo    REM Update environment files with contract address
echo    REM ^(The deploy script will show you the address^)
echo.

echo 4. 🔧 Production Testing
echo    REM Test with production environment
echo    cd backend ^&^& set NODE_ENV=production ^&^& npm start
echo    cd portal ^&^& npm run build ^&^& npm run preview
echo.

echo ⚠️  SECURITY REMINDERS:
echo    - Never commit private keys to git
echo    - Use different wallets for testnet vs mainnet
echo    - Keep your Infura project ID secure
echo    - Test thoroughly on Sepolia before mainnet
echo.

echo 🎯 Next Steps:
echo    1. Complete the manual steps above
echo    2. Run the deployment commands
echo    3. Update environment files with contract addresses
echo    4. Test the production configuration
echo.
echo Good luck! 🚀
echo.
pause
