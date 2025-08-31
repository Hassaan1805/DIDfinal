# 📱 How to Scan QR Codes - Complete Guide

## 🚀 INSTANT TESTING (Recommended)

### Web QR Scanner (Already Open!)
**✅ Easiest way - No setup required**

1. **Portal:** http://localhost:5174/ → Click "🔐 Login with DID Wallet"
2. **Scanner:** Web scanner tab → Click "📷 Start Camera"  
3. **Scan:** Point webcam at the QR code on portal
4. **Result:** See decoded authentication data instantly!

## 📱 MOBILE WALLET OPTIONS

### Option A: Physical Android Phone
1. **Enable Developer Mode:**
   ```
   Settings → About Phone → Tap "Build Number" 7 times
   ```

2. **Enable USB Debugging:**
   ```
   Settings → Developer Options → USB Debugging (ON)
   ```

3. **Connect & Run:**
   ```powershell
   # Connect phone via USB, then run:
   cd wallet
   npx react-native run-android
   ```

### Option B: Android Emulator
1. **Open Android Studio**
2. **AVD Manager → Create Virtual Device**
3. **Start emulator, then:**
   ```powershell
   cd wallet
   npx react-native run-android
   ```

### Option C: Web Development (Expo/Browser)
*Note: QR scanner requires camera access - native mobile is preferred*

## 🔍 TESTING METHODS SUMMARY

| Method | Setup Time | Camera | Real Auth Flow |
|--------|------------|--------|----------------|
| **Web Scanner** | ⚡ Instant | Webcam | Decode only |
| **Phone Camera** | ⚡ Instant | Phone | View JSON only |
| **Mobile Wallet** | 🕐 5-10 min | Phone | ✅ Full flow |

## 📊 CURRENT STATUS

✅ **Portal:** Running on http://localhost:5174/
✅ **QR Generation:** Working with real authentication data  
✅ **Web Scanner:** Ready to use
🕐 **Mobile Wallet:** Metro bundler running, needs device connection

## 🎯 QUICK TEST FLOW

1. **Generate QR:** Portal → Login button
2. **Scan QR:** Web scanner → Start camera
3. **View Result:** See JSON authentication request data
4. **Test Complete:** QR codes working perfectly!

## 🔧 TROUBLESHOOTING

### Web Scanner Issues:
- Grant camera permissions when prompted
- Use Chrome/Firefox (better WebRTC support)
- Ensure good lighting for QR code

### Mobile Wallet Issues:
- Ensure USB debugging enabled
- Try `adb devices` to verify connection  
- Use `npx react-native doctor` to check setup

### QR Code Issues:
- Refresh QR code if it's not scanning well
- Ensure portal is running on correct port
- Check browser console for errors

---

**💡 TIP:** Start with the web scanner for immediate testing, then set up mobile wallet for the full experience!
