# 🚀 Deployment Guide: Running DID Platform on a Different System

This guide explains how to deploy and run the Decentralized Trust Platform on any new system.

## 📋 Prerequisites

### Required Software
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Flutter** (for mobile app) - [Download](https://flutter.dev/docs/get-started/install)
- **Android Studio** (for mobile development) - [Download](https://developer.android.com/studio)

### System Requirements
- **OS**: Windows 10/11, macOS, or Linux
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 5GB free space
- **Network**: WiFi/Ethernet for local network testing

## 🎯 Quick Setup (5 Minutes)

### Step 1: Clone the Repository
```bash
git clone https://github.com/zaidnansari2011/DIDfinal.git
cd DIDfinal
```

### Step 2: Switch to Stable Branch
```bash
git checkout blockchain-implementation
```

### Step 3: Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../portal
npm install

# Mobile dependencies (optional)
cd ../mobile_wallet
flutter pub get
```

### Step 4: Configure Network Settings

#### Find Your System's IP Address:

**Windows:**
```cmd
ipconfig | findstr "IPv4"
```

**macOS/Linux:**
```bash
hostname -I | awk '{print $1}'
# or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

#### Update Configuration Files:

**Backend Environment** (`backend/.env.development`):
```bash
# Replace 192.168.1.100 with your system's IP
PORT=3001
NODE_ENV=development
HOST=0.0.0.0
DEMO_MODE=true
JWT_SECRET=dev_jwt_secret_2024
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key_here
SEPOLIA_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
```

**Frontend Environment** (`portal/.env.development`):
```bash
# Replace 192.168.1.100 with your system's IP
VITE_API_BASE_URL=http://YOUR_SYSTEM_IP:3001/api
VITE_API_URL=/api
VITE_DEV_MODE=true
```

### Step 5: Start the Platform
```bash
# Terminal 1: Start Backend
cd backend
npm run start

# Terminal 2: Start Frontend  
cd portal
npm run dev
```

## 🔧 Automated Setup Scripts

### Windows Setup Script
```batch
@echo off
echo 🚀 Setting up DID Platform on new Windows system...

REM Get system IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%j in ("%%i") do set SYSTEM_IP=%%j
)

echo System IP detected: %SYSTEM_IP%

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install

REM Configure backend
echo Configuring backend for IP: %SYSTEM_IP%
(
echo PORT=3001
echo NODE_ENV=development
echo HOST=0.0.0.0
echo DEMO_MODE=true
echo JWT_SECRET=dev_jwt_secret_2024
echo SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key_here
echo SEPOLIA_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
) > .env.development

REM Install frontend dependencies
echo Installing frontend dependencies...
cd ..\portal
call npm install

REM Configure frontend
echo Configuring frontend for IP: %SYSTEM_IP%
(
echo VITE_API_BASE_URL=http://%SYSTEM_IP%:3001/api
echo VITE_API_URL=/api
echo VITE_DEV_MODE=true
echo VITE_DEBUG_API=true
) > .env.development

echo ✅ Setup complete! 
echo Backend will run on: http://%SYSTEM_IP%:3001
echo Frontend will run on: http://%SYSTEM_IP%:5173
echo.
echo To start the platform:
echo   Backend: cd backend && npm run start
echo   Frontend: cd portal && npm run dev
pause
```

### Linux/macOS Setup Script
```bash
#!/bin/bash
echo "🚀 Setting up DID Platform on new system..."

# Get system IP
SYSTEM_IP=$(hostname -I | awk '{print $1}')
echo "System IP detected: $SYSTEM_IP"

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Configure backend
echo "Configuring backend for IP: $SYSTEM_IP"
cat > .env.development << EOF
PORT=3001
NODE_ENV=development
HOST=0.0.0.0
DEMO_MODE=true
JWT_SECRET=dev_jwt_secret_2024
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key_here
SEPOLIA_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
EOF

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../portal
npm install

# Configure frontend
echo "Configuring frontend for IP: $SYSTEM_IP"
cat > .env.development << EOF
VITE_API_BASE_URL=http://$SYSTEM_IP:3001/api
VITE_API_URL=/api
VITE_DEV_MODE=true
VITE_DEBUG_API=true
EOF

echo "✅ Setup complete!"
echo "Backend will run on: http://$SYSTEM_IP:3001"
echo "Frontend will run on: http://$SYSTEM_IP:5173"
echo ""
echo "To start the platform:"
echo "  Backend: cd backend && npm run start"
echo "  Frontend: cd portal && npm run dev"
```

## 🌐 Network Configuration

### For Same Network Access (Recommended)
- Backend binds to `0.0.0.0:3001` (accessible from any device on network)
- Frontend accessible at `http://YOUR_IP:5173`
- Mobile app auto-discovers backend at `YOUR_IP:3001`

### Firewall Configuration

**Windows:**
```cmd
# Allow Node.js through Windows Firewall
netsh advfirewall firewall add rule name="Node.js Backend" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="Vite Frontend" dir=in action=allow protocol=TCP localport=5173
```

**Ubuntu/Debian:**
```bash
sudo ufw allow 3001
sudo ufw allow 5173
```

**macOS:**
System Preferences → Security & Privacy → Firewall → Allow Node.js and terminal apps

## 📱 Mobile App Deployment

### Option 1: Use Pre-built APK
1. Transfer `app-release.apk` to Android device
2. Enable "Install from unknown sources"
3. Install the APK
4. App will auto-discover backend on your network

### Option 2: Build Fresh APK
```bash
cd mobile_wallet
flutter clean
flutter pub get
flutter build apk --release
```

## 🔧 Common Network Issues & Solutions

### Issue: Can't connect from mobile app
**Solution:**
```bash
# 1. Check if backend is accessible
curl http://YOUR_IP:3001/api/health

# 2. Check firewall settings
# 3. Ensure mobile device is on same WiFi network
# 4. Try specific IP in mobile app settings
```

### Issue: CORS errors in browser
**Solution:** Backend automatically allows local network origins. If issues persist:
```javascript
// In backend/src/app.ts, update CORS config:
app.use(cors({
  origin: ['http://localhost:5173', 'http://YOUR_IP:5173', '*'],
  credentials: true
}));
```

### Issue: Environment variables not loading
**Solution:**
```bash
# 1. Restart both frontend and backend
# 2. Clear browser cache
# 3. Check .env.development files exist
# 4. Verify file permissions
```

## 🧪 Testing the Deployment

### Automated Test Script
```bash
#!/bin/bash
echo "🧪 Testing DID Platform deployment..."

# Test backend health
echo "Testing backend health..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Failed (Status: $BACKEND_STATUS)"
fi

# Test frontend
echo "Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend: Accessible"
else
    echo "❌ Frontend: Failed (Status: $FRONTEND_STATUS)"
fi

# Test QR code generation
echo "Testing QR code generation..."
QR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/auth/challenge)
if [ "$QR_STATUS" = "200" ]; then
    echo "✅ QR Code API: Working"
else
    echo "❌ QR Code API: Failed (Status: $QR_STATUS)"
fi

echo "🎉 Deployment test complete!"
```

## 📋 Deployment Checklist

### Before Deployment:
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Port 3001 and 5173 available
- [ ] Firewall configured
- [ ] Network connectivity confirmed

### After Deployment:
- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Health endpoint returns 200
- [ ] QR code generates successfully
- [ ] Mobile app connects to backend
- [ ] End-to-end authentication works

## 🚀 Production Deployment Options

### Option 1: Cloud Deployment
- **Railway**: Deploy backend easily
- **Vercel**: Deploy frontend
- **Mobile**: Distribute APK or publish to Play Store

### Option 2: Local Server
- Use PM2 for process management
- Set up reverse proxy with Nginx
- Configure SSL certificates

### Option 3: Docker Deployment
- Containerize backend and frontend
- Use docker-compose for orchestration
- Easy scaling and deployment

## 📞 Troubleshooting

### Common Issues:
1. **Port conflicts**: Use `netstat -an | grep :3001` to check
2. **Permission errors**: Run as administrator/sudo if needed
3. **Network discovery fails**: Manually configure IP addresses
4. **Mobile app doesn't connect**: Check WiFi network and firewall

### Getting Help:
- Check console logs for error messages
- Verify network connectivity with ping/curl
- Test each component individually
- Check GitHub issues for known problems

---

**🎯 Result: Your DID Platform will be fully functional on any new system with proper network access for mobile authentication!**