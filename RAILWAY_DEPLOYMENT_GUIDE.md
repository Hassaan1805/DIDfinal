# 🚀 Railway Deployment Guide
## Decentralized Trust Platform

This guide will help you deploy your Decentralized Trust Platform to Railway and configure the mobile app to work with the deployed services.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install with `npm install -g @railway/cli`
3. **Git**: Ensure your project is in a Git repository
4. **Flutter**: For mobile app builds

## 🎯 Deployment Overview

Your platform consists of three components:
- **Backend API**: Node.js/Express server with blockchain integration
- **Web Portal**: React frontend for desktop access
- **Mobile App**: Flutter app for DID authentication

## 🔧 Step 1: Deploy to Railway

### Option A: Automated Deployment (Recommended)

**Windows:**
```bash
.\deploy-railway.bat
```

**Linux/macOS:**
```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

### Option B: Manual Deployment

1. **Login to Railway:**
   ```bash
   railway login
   ```

2. **Create Railway Project:**
   ```bash
   railway init
   ```

3. **Deploy Backend:**
   ```bash
   cd backend
   railway add --name "did-platform-backend"
   
   # Set environment variables
   railway variables set NODE_ENV=production
   railway variables set DEMO_MODE=true
   railway variables set JWT_SECRET="your-secure-jwt-secret"
   railway variables set ETHEREUM_RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
   railway variables set CONTRACT_ADDRESS="0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48"
   
   # Deploy
   railway up
   ```

4. **Deploy Portal:**
   ```bash
   cd ../portal
   railway add --name "did-platform-portal"
   
   # Set environment variables (replace BACKEND_URL with actual URL)
   railway variables set NODE_ENV=production
   railway variables set VITE_API_BASE_URL="https://your-backend.railway.app/api"
   railway variables set VITE_BACKEND_URL="https://your-backend.railway.app"
   
   # Deploy
   railway up
   ```

## 📱 Step 2: Build Mobile App for Production

### Automated Build

**Windows:**
```bash
.\build-mobile-production.bat
```

**Linux/macOS:**
```bash
chmod +x build-mobile-production.sh
./build-mobile-production.sh
```

When prompted, enter your Railway backend URL (e.g., `https://your-backend.railway.app`)

### Manual Build

1. **Navigate to mobile app:**
   ```bash
   cd mobile_wallet
   ```

2. **Update network configuration:**
   Edit `lib/services/network_service.dart` and add your Railway URL to the top of the `_baseUrls` list:
   ```dart
   final List<String> _baseUrls = [
     'https://your-backend.railway.app',  // Add this line
     'http://192.168.1.100:3001',
     // ... other URLs
   ];
   ```

3. **Build APK:**
   ```bash
   flutter clean
   flutter pub get
   flutter build apk --release
   ```

## 🔍 Step 3: Test Deployment

### Backend Testing
```bash
curl https://your-backend.railway.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Decentralized Trust Platform API is running",
  "timestamp": "2024-XX-XX..."
}
```

### Portal Testing
1. Open `https://your-portal.railway.app`
2. Verify the portal loads correctly
3. Check browser console for any API connection errors

### Mobile App Testing
1. Install the APK on your Android device
2. Open the app
3. Go to "Network Diagnostics"
4. Verify connection to Railway backend
5. Test QR code authentication flow

## 🌐 Step 4: Configure Custom Domains (Optional)

### Backend Domain
```bash
cd backend
railway domain add api.yourdomain.com
```

### Portal Domain
```bash
cd portal
railway domain add yourdomain.com
```

### Update Mobile App
If you add custom domains, rebuild the mobile app with the new URLs.

## 📊 Railway URLs Structure

After deployment, you'll have:
- **Backend**: `https://did-platform-backend.railway.app`
- **Portal**: `https://did-platform-portal.railway.app`
- **Health Check**: `https://did-platform-backend.railway.app/api/health`
- **Blockchain Viewer**: `https://did-platform-portal.railway.app/blockchain`

## 🔧 Environment Variables

### Backend Required Variables
```bash
NODE_ENV=production
DEMO_MODE=true
JWT_SECRET=your-secure-secret
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
GAS_STATION_PRIVATE_KEY=your-private-key
```

### Portal Required Variables
```bash
NODE_ENV=production
VITE_API_BASE_URL=https://your-backend.railway.app/api
VITE_BACKEND_URL=https://your-backend.railway.app
VITE_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
VITE_DEMO_MODE=true
```

## 🔐 Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret
2. **Private Keys**: Never commit real private keys to Git
3. **CORS**: Configure appropriate CORS origins
4. **HTTPS**: Railway provides HTTPS by default
5. **Rate Limiting**: Backend includes rate limiting

## 📱 Mobile App Distribution

### Android APK
- Located at: `DID-Wallet-Production-YYYYMMDD.apk`
- Install on Android devices for testing
- Enable "Unknown Sources" in Android settings

### Play Store (Optional)
- Use the generated `app-release.aab` file
- Upload to Google Play Console
- Follow Play Store review process

### iOS (macOS only)
- Build with `flutter build ios --release`
- Use Xcode for App Store distribution

## 🛠️ Troubleshooting

### Common Issues

1. **Build Errors:**
   - Run `flutter clean && flutter pub get`
   - Check Flutter version compatibility
   - Verify all dependencies are installed

2. **Connection Issues:**
   - Verify Railway URLs are accessible
   - Check CORS configuration
   - Test API endpoints manually

3. **Mobile App Issues:**
   - Check network diagnostics in the app
   - Verify backend URL in network service
   - Test on different networks

### Useful Commands

```bash
# Railway commands
railway logs                 # View application logs
railway status              # Check service status
railway variables           # List environment variables
railway domain              # Manage domains

# Mobile debugging
flutter logs                # View device logs
flutter doctor             # Check Flutter setup
adb logcat                 # Android system logs
```

## 📞 Support

If you encounter issues:

1. Check Railway service logs: `railway logs`
2. Verify environment variables: `railway variables`
3. Test API endpoints directly
4. Check mobile app network diagnostics
5. Review this deployment guide

## 🎉 Success Checklist

- [ ] Backend deployed and accessible
- [ ] Portal deployed and functional
- [ ] Mobile app built and installed
- [ ] QR code authentication working
- [ ] Blockchain viewer showing data
- [ ] Network diagnostics showing connection
- [ ] All services communicating properly

Your Decentralized Trust Platform is now live on Railway! 🚀