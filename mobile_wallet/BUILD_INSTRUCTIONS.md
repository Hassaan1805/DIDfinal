# Flutter DID Mobile Wallet

## Build and Run Instructions

This is a complete Flutter mobile wallet application that replicates the functionality of your secure HTML wallet with QR code scanning capabilities.

### Prerequisites

1. **Flutter SDK** (3.10 or later)
   - Download from: https://flutter.dev/docs/get-started/install
   - Verify installation: `flutter doctor`

2. **Android/iOS Development Environment**
   - **Android**: Android Studio with Android SDK
   - **iOS**: Xcode (Mac only)

### Project Setup

1. **Navigate to the mobile wallet directory**:
   ```bash
   cd mobile_wallet
   ```

2. **Install dependencies**:
   ```bash
   flutter pub get
   ```

3. **Verify setup**:
   ```bash
   flutter doctor
   ```

### Building and Running

#### Android
```bash
# Debug build (for testing)
flutter run

# Release build
flutter build apk --release
# APK will be at: build/app/outputs/flutter-apk/app-release.apk

# Install on connected device
flutter install
```

#### iOS (Mac only)
```bash
# Debug build
flutter run

# Release build
flutter build ios --release
```

### Key Features

1. **QR Code Scanner**: Camera-based QR code scanning for authentication
2. **Employee Management**: Switch between multiple employee wallets
3. **Network Diagnostics**: Comprehensive network testing and troubleshooting
4. **Secure Storage**: Encrypted storage for sensitive data
5. **Real-time Status**: Live connection status with your backend

### App Structure

- **HomeScreen**: Main dashboard with employee info and quick actions
- **QRScannerScreen**: QR code scanning with camera permissions
- **AuthConfirmationScreen**: Authentication request confirmation
- **EmployeeSelectorScreen**: Switch between employee wallets
- **NetworkDiagnosticsScreen**: Network testing and troubleshooting

### Configuration

Update the backend URL in `lib/services/network_service.dart`:
```dart
static const List<String> _backendUrls = [
  'http://localhost:3001',
  'http://192.168.1.100:3001',  // Your local IP
  'https://your-backend-domain.com',
];
```

### Employee Wallets

The app comes pre-configured with 5 employee wallets matching your HTML version:
- Alice Johnson (CEO) - 0x742d35Cc6540C788B9DfEb2e9C40C2d38...
- Bob Smith (CTO) - 0x8ba1f109c588bdc5aa3e1b28f5cd22e8...
- Carol Davis (CISO) - 0x617F2E2bd5a8f7b9C2e1d3f8A5C4B9...
- David Wilson (CFO) - 0x9C8b2E5a7D1f3B6c4A8e9F2d5C1B7...
- Eve Martinez (COO) - 0x3F7a9B2e8D5c1A4f6E9b3C8a1D7e2...

### Permissions

The app requires the following permissions:
- **Camera**: For QR code scanning
- **Internet**: For backend communication
- **Storage**: For secure credential storage

### Troubleshooting

1. **Camera Issues**: Ensure camera permissions are granted
2. **Network Issues**: Use Network Diagnostics screen
3. **Build Issues**: Run `flutter clean` then `flutter pub get`

### Testing the Authentication Flow

1. Start your backend server on port 3001
2. Open the web portal on port 5173
3. Launch the mobile app
4. Use QR scanner to scan authentication requests
5. Confirm authentication on mobile to complete login

### Development Notes

- The app uses Provider for state management
- All network calls include proper error handling
- Secure storage encrypts sensitive data
- Camera permissions are requested at runtime
- Network diagnostics help troubleshoot connectivity issues

### Next Steps

1. Test the app on your device
2. Scan QR codes from your web portal
3. Use Network Diagnostics if you encounter connection issues
4. Switch between employee wallets to test different access levels

The mobile wallet is ready for testing and should work seamlessly with your existing backend and portal infrastructure!