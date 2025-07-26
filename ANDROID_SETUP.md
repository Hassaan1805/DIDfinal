# 🤖 Android App Setup & Testing Guide

## Prerequisites

Before building the Android app, ensure you have:

### 1. Android Studio & SDK
- Download and install [Android Studio](https://developer.android.com/studio)
- Install Android SDK Platform 30
- Install Android Build Tools 30.0.3
- Install Android NDK (if not already installed)

### 2. Environment Variables
Add these to your system environment variables:
```bash
ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
```

Add to PATH:
```bash
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

### 3. Java Development Kit
- Install JDK 11 or higher
- Set JAVA_HOME environment variable

## 🚀 Build Instructions

### Step 1: Install Dependencies
```powershell
cd "C:\Users\Zaid\Documents\New folder (11)\wallet"
npm install
```

### Step 2: Start Metro Bundler
```powershell
# Terminal 1 - Keep this running
npm start
```

### Step 3: Build & Run Android App
```powershell
# Terminal 2 - Build and deploy to device/emulator
npm run android
```

### Alternative: Manual Build
```powershell
cd android
.\gradlew assembleDebug
```

## 📱 Device Setup

### Option A: Physical Android Device
1. Enable Developer Options:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Go to Settings → Developer Options
   - Enable "USB Debugging"
3. Connect device via USB
4. Run: `adb devices` to verify connection

### Option B: Android Emulator
1. Open Android Studio
2. Go to Tools → AVD Manager
3. Create Virtual Device (API Level 30+)
4. Start the emulator
5. Run: `adb devices` to verify

## 🧪 Complete End-to-End Test

### 1. Start All Services
```powershell
# Terminal 1: Backend API
cd "C:\Users\Zaid\Documents\New folder (11)\backend"
npm run dev

# Terminal 2: Web Portal
cd "C:\Users\Zaid\Documents\New folder (11)\portal"
npm run dev

# Terminal 3: Mobile App Metro
cd "C:\Users\Zaid\Documents\New folder (11)\wallet"
npm start

# Terminal 4: Deploy to Android
cd "C:\Users\Zaid\Documents\New folder (11)\wallet"
npm run android
```

### 2. Test Flow
1. **Mobile App**: Open Trust Wallet app on Android
2. **Mobile App**: Tap "Create Identity" → Generate wallet and DID
3. **Browser**: Visit `http://10.0.2.2:3000/login` (for emulator) or `http://YOUR_IP:3000/login`
4. **Browser**: QR code appears
5. **Mobile App**: Tap "Scan to Login" → Grant camera permission
6. **Mobile App**: Scan QR code from browser
7. **Mobile App**: See "Authenticating..." → "Success!"
8. **Browser**: Automatic redirect to dashboard

## 🔧 Configuration for Live Testing

### Backend API URL Configuration
The mobile app connects to `localhost:3001`. For device testing, update the API URL:

**File**: `wallet/src/screens/ScannerScreen.tsx`
**Line**: `const API_BASE_URL = 'http://localhost:3001/api';`

**Change to**:
```typescript
// For Android Emulator
const API_BASE_URL = 'http://10.0.2.2:3001/api';

// For Physical Device (replace with your computer's IP)
const API_BASE_URL = 'http://192.168.1.100:3001/api';
```

### Find Your Computer's IP Address
```powershell
ipconfig | findstr IPv4
```

## 📁 Android Project Structure
```
wallet/android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml     # Permissions & app config
│   │   ├── java/com/trustwallet/   # Java source files
│   │   └── res/                    # Resources (icons, strings)
│   └── build.gradle               # App-level build config
├── build.gradle                   # Project-level build config
├── gradle.properties             # Gradle settings
└── settings.gradle               # Project settings
```

## 🔍 Debug & Troubleshooting

### View Logs
```powershell
# View all logs
adb logcat

# Filter React Native logs
adb logcat | findstr ReactNativeJS

# Filter app-specific logs
adb logcat | findstr TrustWallet
```

### Common Issues

**Metro Connection Issues**:
```powershell
npx react-native start --reset-cache
```

**Build Errors**:
```powershell
cd android
.\gradlew clean
.\gradlew assembleDebug
```

**Permission Issues**:
- Camera permission is requested automatically
- Grant permissions when prompted

## 📊 Testing Checklist

- [ ] ✅ Android app builds successfully
- [ ] ✅ App launches and shows Home screen
- [ ] ✅ "Create Identity" generates wallet and stores data
- [ ] ✅ "Scan to Login" opens camera with permission
- [ ] ✅ QR code scanning detects and processes codes
- [ ] ✅ Challenge signing works with stored wallet
- [ ] ✅ API communication succeeds with backend
- [ ] ✅ Success state shows and navigates back
- [ ] ✅ Web portal receives authentication and redirects
- [ ] ✅ Complete flow works end-to-end

## 🎯 Live Demo Features

The Android app demonstrates:

### 🔐 Secure Identity Management
- Hardware-backed key generation
- Secure storage with AsyncStorage
- DID creation and management

### 📱 Modern UI/UX
- Material Design styling
- Smooth navigation
- Real-time feedback
- Error handling

### 📷 Advanced Camera Features
- Real-time QR scanning
- Custom overlay with guides
- Permission handling
- Auto-focus and flash support

### 🌐 Network Integration
- RESTful API communication
- Challenge-response authentication
- JWT token management
- Error recovery

## 🚀 Next Steps

After successful testing:
1. **Production Build**: Generate signed APK for distribution
2. **Performance**: Optimize bundle size and startup time
3. **Security**: Implement additional security measures
4. **Features**: Add biometric authentication, multi-device support
5. **Testing**: Automated testing with Detox or similar

---

**The Android app is ready for live testing with the complete QR authentication flow!** 📱✨
