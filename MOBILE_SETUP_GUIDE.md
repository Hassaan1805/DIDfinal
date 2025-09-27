# Mobile Wallet Setup Guide

## Quick Start Options

### Option 1: Physical Android Device (Recommended for Testing)

1. **Enable Developer Options on your Android phone:**
   ```
   Settings → About Phone → Tap "Build Number" 7 times
   ```

2. **Enable USB Debugging:**
   ```
   Settings → Developer Options → USB Debugging (ON)
   ```

3. **Connect your phone via USB and run:**
   ```powershell
   Set-Location wallet
   npm run android
   ```

### Option 2: Android Emulator

1. **Start Android Studio and create an AVD:**
   ```
   Android Studio → AVD Manager → Create Virtual Device
   ```

2. **Start the emulator and run:**
   ```powershell
   Set-Location wallet
   npm run android
   ```

### Option 3: Web-based Testing (Instant Setup)

Use the web QR scanner I've created for immediate testing:
```
http://localhost:5173/test-scanner
```

## Current QR Code Data Structure

The portal generates QR codes with this format:
```json
{
  "type": "DID_AUTH_REQUEST",
  "timestamp": 1693459200000,
  "challenge": "abc123",
  "domain": "decentralized-trust-platform.local",
  "callbackUrl": "http://localhost:5173/auth/callback",
  "requestId": "auth_1693459200000_abc123"
}
```

## Testing Flow

1. **Start Portal:** `npm run dev` in portal directory (running on port 5173)
2. **Start Backend:** `npm run dev` in backend directory (port 3001)
3. **Start Mobile Wallet:** `npm run android` in wallet directory
4. **Scan QR Code:** Use mobile app to scan portal QR code
5. **Complete Auth:** Mobile app processes authentication request

## Troubleshooting

### React Native Setup Issues
- Ensure Node.js 16+ is installed
- Android SDK and platform tools are required
- Java 11 or 17 must be installed

### QR Scanner Not Working
- Camera permissions must be granted
- Use web-based scanner for initial testing
- Check QR code is properly generated on portal

### Connection Issues
- Ensure backend is running on port 3001
- Mobile device must be on same network as development machine
- Use `npx react-native start --reset-cache` if Metro bundler has issues
