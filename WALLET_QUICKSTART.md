# Quick Start: Expo React Native Wallet

## For Users (Testing the Wallet)

### 1. Install Expo Go on Your Phone

- **iPhone**: [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. Start the Backend

On your computer:
```bash
cd backend
npm run dev
```

### 3. Configure Network

Run the IP update script (from project root):

**Windows:**
```bash
update-wallet-ip.bat
```

**Mac/Linux:**
```bash
chmod +x update-wallet-ip.sh
./update-wallet-ip.sh
```

This will automatically detect your IP and update the wallet configuration.

### 4. Start the Wallet

**Windows:**
```bash
start-wallet.bat
```

**Mac/Linux:**
```bash
chmod +x start-wallet.sh
./start-wallet.sh
```

### 5. Open on Your Phone

1. Open **Expo Go** app
2. Scan the QR code displayed in your terminal
3. Wait for the app to load
4. Done! 🎉

## When You Switch WiFi Networks

Simply run the update script again:
```bash
# Windows
update-wallet-ip.bat

# Mac/Linux
./update-wallet-ip.sh
```

Or use the **Settings** screen in the app:
- Tap Settings (⚙️)
- Tap "Auto Discover"
- Or manually enter new IP

## Troubleshooting

### Can't connect to backend?

1. **Check both devices are on same WiFi**
2. **Verify backend is running**: `cd backend && npm run dev`
3. **Check firewall**: Allow port 3001
4. **In app**: Go to Settings → Test Connection

### QR code scanner not working?

1. **Grant camera permission** when prompted
2. **Good lighting** helps
3. **Valid QR code** from web portal

### App crashes?

1. **Update Expo Go** to latest version
2. **Clear cache**: Stop wallet server, run `npx expo start -c`
3. **Reinstall dependencies**: `cd wallet && npm install`

## Full Documentation

- [Complete Wallet README](wallet/README.md)
- [Migration Guide](WALLET_MIGRATION.md)
- [Main Documentation](DOCUMENTATION_INDEX.md)

---

**Need Help?** Check the Settings screen in the app for connection diagnostics and helpful tips!
