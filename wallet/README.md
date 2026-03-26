# DID Wallet - Expo React Native

A mobile wallet application built with Expo React Native for the Decentralized Trust Platform. This wallet handles DID-based authentication using QR codes.

## Features

- 🔐 **Ethereum Wallet**: Generate and manage Ethereum wallets
- 📱 **QR Code Scanner**: Scan authentication QR codes from the web portal
- 👥 **Multi-Employee Support**: Manage multiple employee identities
- 🌐 **Dynamic Network Configuration**: Easy IP address management for different WiFi networks
- 🔄 **Auto-Discovery**: Automatically find the backend server on your local network
- 💾 **Secure Storage**: Private keys stored securely on device
- ✨ **Beautiful UI**: Modern, dark-themed interface

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Backend server running (see [backend README](../backend/README.md))

### Installation

1. **Install dependencies:**
   ```bash
   cd wallet
   npm install
   ```

2. **Configure network settings:**
   ```bash
   # Windows
   ..\update-wallet-ip.bat

   # Mac/Linux
   ../update-wallet-ip.sh
   ```

3. **Start the development server:**
   ```bash
   # Windows
   ..\start-wallet.bat

   # Mac/Linux
   ../start-wallet.sh

   # Or manually
   npm start
   ```

4. **Open on your phone:**
   - Open Expo Go app
   - Scan the QR code displayed in the terminal
   - Wait for the app to load

## Network Configuration

### Automatic IP Detection

The simplest way to configure the backend URL is using the update scripts:

```bash
# Windows
update-wallet-ip.bat

# Mac/Linux
./update-wallet-ip.sh
```

These scripts will:
- Detect your current IP address
- Update the `.env` file
- Configure fallback URLs

### Manual Configuration

1. Find your computer's IP address:
   - **Windows**: `ipconfig` (look for IPv4 Address)
   - **Mac**: `ifconfig` (look for inet under en0)
   - **Linux**: `hostname -I`

2. Update `wallet/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP_HERE:3001
   ```

3. Restart Expo server

### In-App Configuration

You can also change the backend URL directly in the app:

1. Open the app
2. Go to **Settings** (⚙️ icon)
3. Enter a custom URL or use quick preset buttons
4. Tap **Test Connection**
5. If successful, tap **Use This URL**

### WiFi Network Changes

When you switch to a new WiFi network:

**Option 1: Use Update Script**
```bash
update-wallet-ip.bat  # Windows
./update-wallet-ip.sh # Mac/Linux
```

**Option 2: Settings Screen**
- Open app → Settings
- Tap "Auto Discover" to find the backend
- Or manually enter the new IP

## Project Structure

```
wallet/
├── src/
│   ├── config/
│   │   └── config.ts           # App configuration
│   ├── context/
│   │   ├── NetworkContext.tsx  # Network state management
│   │   └── WalletContext.tsx   # Wallet state management
│   ├── screens/
│   │   ├── HomeScreen.tsx              # Main screen
│   │   ├── QRScannerScreen.tsx         # QR code scanner
│   │   ├── SettingsScreen.tsx          # Settings and network config
│   │   └── AuthConfirmationScreen.tsx  # Auth confirmation
│   └── services/
│       ├── network.ts          # Network/API service
│       ├── storage.ts          # Local storage
│       └── wallet.ts           # Wallet operations
├── App.tsx                     # Main app component
├── app.json                    # Expo configuration
├── package.json
└── .env                        # Environment variables
```

## Key Features Explained

### Network Auto-Discovery

The wallet can automatically discover backend servers on your local network:

```typescript
// In Settings screen
const handleAutoDiscover = async () => {
  const bestUrl = await discoverBestUrl();
  // Finds and connects to the fastest backend
};
```

### QR Code Authentication Flow

1. User scans QR code from web portal
2. App parses challenge data
3. User selects employee identity
4. App signs challenge with private key
5. Backend verifies signature
6. Authentication complete

### Secure Key Storage

Private keys are stored using React Native's AsyncStorage (production apps should use expo-secure-store):

```typescript
import * as SecureStore from 'expo-secure-store';
// Keys are encrypted at rest
```

## Development

### Running in Different Modes

```bash
# Metro bundler
npm start

# Directly on Android
npm run android

# Directly on iOS (Mac only)
npm run ios

# Web (for testing)
npm run web
```

### Testing with Backend

1. Start backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Note your computer's IP address

3. Update wallet/.env with that IP

4. Start wallet app

5. Test connection in Settings screen

### Adding New Employees

Currently, employees need to be added manually in the code or through API integration. Future versions will include a UI for adding employees.

Example employee format:
```typescript
{
  id: 'emp-001',
  name: 'John Doe',
  did: 'did:ethr:0x1234...',
  role: 'Software Engineer',
}
```

## Building for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build APK
npm run build:android
```

### iOS App

```bash
# Build for iOS (requires Apple Developer account)
npm run build:ios
```

## Troubleshooting

### "Cannot connect to backend"

1. **Check IP address**: Make sure your phone and computer are on the same WiFi
2. **Check firewall**: Ensure port 3001 is not blocked
3. **Check backend**: Verify backend is running with `npm run dev`
4. **Use Settings**: Try the "Auto Discover" feature in Settings screen

### "QR Scanner not working"

1. **Check permissions**: App needs camera permission
2. **Lighting**: Ensure good lighting conditions
3. **Valid QR**: Make sure QR is from the web portal

### "Private key not found"

1. The app creates a wallet automatically on first launch
2. Check AsyncStorage is working properly
3. Try clearing app data and restarting

### "Expo Go app crashes"

1. Make sure you have the latest Expo Go app
2. Clear Expo cache: `npx expo start -c`
3. Reinstall dependencies: `rm -rf node_modules && npm install`

## Environment Variables

```env
# Backend URL (update this for your network)
EXPO_PUBLIC_API_URL=http://192.168.1.33:3001

# Fallback URLs
EXPO_PUBLIC_API_URL_FALLBACK_1=http://localhost:3001
EXPO_PUBLIC_API_URL_FALLBACK_2=https://did-platform.railway.app

# Network settings
EXPO_PUBLIC_NETWORK_TIMEOUT=10000
EXPO_PUBLIC_AUTO_DISCOVER=true

# Blockchain
EXPO_PUBLIC_CHAIN_ID=11155111
EXPO_PUBLIC_NETWORK=sepolia
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Keys**: Never share or expose private keys
2. **Backup**: Export and backup your wallet before uninstalling
3. **Production**: Use expo-secure-store for production builds
4. **HTTPS**: Always use HTTPS for production backends
5. **Validation**: App validates all QR codes before processing

## Contributing

This wallet is part of the Decentralized Trust Platform. See the main [README](../README.md) for contributing guidelines.

## License

Part of the Decentralized Trust Platform project.

## Support

For issues or questions:
1. Check the [main documentation](../DOCUMENTATION_INDEX.md)
2. Review [troubleshooting guide](../docs/TROUBLESHOOTING.md)
3. Open an issue on the repository

---

**Built with ❤️ using Expo and React Native**
