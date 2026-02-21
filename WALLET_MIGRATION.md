# Mobile Wallet Migration: Flutter → Expo React Native

## Overview

The mobile wallet has been migrated from **Flutter (Dart)** to **Expo React Native (TypeScript)** to provide better integration with the existing TypeScript codebase and more flexible network configuration.

## What Changed

### Technology Stack

| Component | Before (Flutter) | After (Expo RN) |
|-----------|------------------|-----------------|
| Framework | Flutter | Expo + React Native |
| Language | Dart | TypeScript |
| Navigation | Flutter Navigator | React Navigation |
| State Management | Provider | React Context |
| Storage | SharedPreferences | AsyncStorage |
| Blockchain | ethers.js (JS bridge) | ethers.js (native) |
| Camera/QR | qr_code_scanner | expo-camera |

### New Features

✅ **Improved Network Management**
- In-app Settings screen for changing backend URL
- Auto-discovery to find backend servers
- Quick IP presets for common network ranges
- Real-time connection status

✅ **Better Developer Experience**
- Hot reload with Expo
- Consistent TypeScript across all projects
- Shared code with backend/portal via `shared/` folder
- Easy debugging with React DevTools

✅ **Simplified Setup**
- Automated IP detection scripts
- No need to rebuild after network changes
- Works with Expo Go app (no compilation needed)

### Project Structure Comparison

**Before (Flutter):**
```
mobile_wallet/
├── lib/
│   ├── screens/
│   ├── services/
│   ├── models/
│   └── config/
├── android/
├── ios/
└── pubspec.yaml
```

**After (Expo RN):**
```
wallet/
├── src/
│   ├── screens/
│   ├── services/
│   ├── context/
│   └── config/
├── App.tsx
└── package.json
```

## Migration Guide

### For Users

If you were using the old Flutter wallet:

1. **Uninstall old app** (if built as APK)

2. **Install Expo Go** on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

3. **Setup new wallet:**
   ```bash
   cd wallet
   npm install
   cd ..
   # Update IP address
   update-wallet-ip.bat  # Windows
   ./update-wallet-ip.sh # Mac/Linux
   ```

4. **Start development server:**
   ```bash
   start-wallet.bat  # Windows
   ./start-wallet.sh # Mac/Linux
   ```

5. **Open on phone:**
   - Open Expo Go app
   - Scan QR code from terminal
   - App loads automatically

⚠️ **Note**: You'll need to recreate your wallet or import your private key. The old Flutter wallet data is not automatically migrated.

### For Developers

#### Installing Dependencies

```bash
cd wallet
npm install
```

#### Running Development Server

```bash
# Start Metro bundler
npm start

# Or use shortcuts
npm run android  # Runs on Android emulator
npm run ios      # Runs on iOS simulator (Mac only)
```

#### Updating Network Configuration

**Option 1: Automated Script**
```bash
# From project root
update-wallet-ip.bat  # Windows
./update-wallet-ip.sh # Mac/Linux
```

**Option 2: Manual .env Edit**
```bash
# Edit wallet/.env
EXPO_PUBLIC_API_URL=http://YOUR_IP:3001
```

**Option 3: In-App Settings**
- Open app → Settings → Enter URL → Test Connection

#### Building Production APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build
cd wallet
eas build --platform android --profile preview
```

## Feature Parity Checklist

### Core Features ✅

- [x] Wallet generation and management
- [x] QR code scanning
- [x] Employee management
- [x] Authentication signing
- [x] Network diagnostics
- [x] Settings screen
- [x] Connection status indicator

### Network Features ✅

- [x] Multiple backend URL support
- [x] Auto-discovery
- [x] Connection testing
- [x] Fallback URLs
- [x] Dynamic IP configuration
- [x] Health check monitoring

### Security Features ✅

- [x] Secure key storage
- [x] Message signing
- [x] DID formatting
- [x] Address validation
- [x] QR code validation

## Network Configuration Solutions

### Problem: IP Changes on WiFi Switch

The new wallet provides **multiple solutions** for this common issue:

#### 1. **Automated Scripts** (Recommended)
```bash
# Run this whenever you change WiFi networks
update-wallet-ip.bat  # Auto-detects your current IP
```

#### 2. **In-App Settings**
- No need to restart or rebuild
- Change URL anytime in Settings
- Auto-discover feature finds backend automatically

#### 3. **Fallback URLs**
- App automatically tries multiple URLs
- Production URLs work anywhere
- Local URLs tried first for speed

#### 4. **QR Code for Backend URL** (Planned)
- Generate QR code from backend
- Scan to auto-configure wallet
- One-time setup per network

### Example Workflow

**Scenario**: You bring your laptop home from office

1. **Computer connects to home WiFi**
   ```bash
   # Get new IP
   ipconfig  # Windows: 192.168.0.105
   ```

2. **Update backend if needed** (backend uses 0.0.0.0 so usually not needed)

3. **Update wallet:**
   ```bash
   # Option A: Automated
   update-wallet-ip.bat
   
   # Option B: Manual
   # Edit wallet/.env
   EXPO_PUBLIC_API_URL=http://192.168.0.105:3001
   ```

4. **Refresh app** or use Settings → Auto Discover

Done! No rebuild needed.

## Code Migration Examples

### State Management

**Before (Flutter/Provider):**
```dart
class WalletService extends ChangeNotifier {
  String? _address;
  
  String? get address => _address;
  
  void setAddress(String addr) {
    _address = addr;
    notifyListeners();
  }
}
```

**After (React Context):**
```typescript
const WalletContext = createContext<WalletContextType>();

export const WalletProvider: FC = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  
  return (
    <WalletContext.Provider value={{ address, setAddress }}>
      {children}
    </WalletContext.Provider>
  );
};
```

### Navigation

**Before (Flutter):**
```dart
Navigator.of(context).push(
  MaterialPageRoute(
    builder: (context) => QRScannerScreen(),
  ),
);
```

**After (React Navigation):**
```typescript
navigation.navigate('QRScanner');
```

### Storage

**Before (Flutter):**
```dart
final prefs = await SharedPreferences.getInstance();
await prefs.setString('privateKey', key);
final key = prefs.getString('privateKey');
```

**After (React Native):**
```typescript
await AsyncStorage.setItem('privateKey', key);
const key = await AsyncStorage.getItem('privateKey');
```

## Performance Comparison

| Metric | Flutter | Expo RN |
|--------|---------|---------|
| Cold Start | ~2s | ~3s |
| Hot Reload | <1s | <1s |
| App Size | ~20MB | ~25MB (with Expo Go) |
| Development Setup | Complex | Simple |
| Network Config Change | Rebuild | Instant |

## Advantages of Expo React Native

### For Development

- **Hot Reload**: See changes instantly without full reload
- **TypeScript**: Type safety across entire codebase
- **Shared Code**: Reuse types and utilities from `shared/`
- **Web Preview**: Test basic UI in browser
- **Expo Go**: No need to install on device for testing
- **Developer Tools**: React DevTools, Redux DevTools

### For Deployment

- **OTA Updates**: Push updates without app store review
- **EAS Build**: Cloud build service (no Mac needed for iOS)
- **Managed Workflow**: Expo handles native configuration
- **Cross-Platform**: One codebase for iOS, Android, Web

### For Users

- **Easy Testing**: Just scan QR code with Expo Go
- **Frequent Updates**: OTA means always latest version
- **Reliable**: Built on React Native (used by Facebook, Instagram)

## Migration Checklist

### Pre-Migration
- [ ] Backup Flutter wallet data
- [ ] Export private keys from old wallet
- [ ] Document current employee list
- [ ] Note backend URLs being used

### Migration
- [ ] Install Node.js 18+
- [ ] Install Expo Go on phone
- [ ] Clone/pull latest code
- [ ] Run `npm install` in wallet folder
- [ ] Configure network with scripts
- [ ] Test connection to backend

### Post-Migration
- [ ] Import private keys to new wallet
- [ ] Re-add employees
- [ ] Test QR scanning
- [ ] Test authentication flow
- [ ] Verify Settings screen
- [ ] Test network switching

## Troubleshooting

### "Expo Go not connecting"

Make sure phone and computer on same WiFi:
```bash
# Check computer IP
ipconfig        # Windows
ifconfig        # Mac/Linux

# Update wallet/.env
update-wallet-ip.bat
```

### "Metro bundler errors"

Clear cache and reinstall:
```bash
cd wallet
rm -rf node_modules
npm install
npx expo start -c
```

### "Can't scan QR code"

1. Ensure good lighting
2. Check camera permissions
3. Try manual URL in Expo Go

### "Backend not found"

1. Check backend is running: `cd backend && npm run dev`
2. Check firewall allows port 3001
3. Use Settings → Auto Discover
4. Try `http://localhost:3001` if on emulator

## Future Enhancements

### Planned Features

- [ ] QR code for backend URL configuration
- [ ] Biometric authentication
- [ ] Multiple wallet support
- [ ] Transaction history
- [ ] Push notifications for auth requests
- [ ] Offline mode with queue
- [ ] ZK proof generation on device

### Considered Features

- [ ] Web version (PWA)
- [ ] Desktop app (Electron)
- [ ] Browser extension
- [ ] Hardware wallet support

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native](https://reactnative.dev/)
- [Ethers.js](https://docs.ethers.org/)

## Getting Help

If you encounter issues:

1. Check [wallet/README.md](../wallet/README.md)
2. Review [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)
3. Check backend is running
4. Verify network configuration
5. Open an issue with:
   - Expo version
   - Phone OS/version
   - Error messages
   - Network configuration

---

**Migration Complete!** 🎉

The new Expo React Native wallet provides better flexibility, easier network configuration, and a more consistent development experience across the platform.
