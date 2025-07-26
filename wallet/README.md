# Trust Wallet - Mobile App

This is the mobile wallet component of the Decentralized Trust Platform. It provides QR code scanning functionality for passwordless authentication with the web portal.

## Features

### 🆔 Identity Management
- Create decentralized identities (DIDs) on Ethereum
- Generate and store cryptographic key pairs securely
- View identity details and status

### 📱 QR Code Authentication
- Scan QR codes from the web portal
- Sign authentication challenges cryptographically
- Automatic authentication with backend API
- Real-time status updates and feedback

### 🔐 Security
- Private keys stored securely using AsyncStorage
- Challenge-response authentication protocol
- Signature verification using ethers.js
- Automatic token management

## Screens

### HomeScreen
- Main dashboard showing identity status
- "Scan to Login" button for authentication
- Identity creation and management options
- Developer options for testing

### CreateIdentityScreen  
- Generate new Ethereum wallets
- Create DIDs on the blockchain
- Import existing wallets
- Save identity data securely

### ScannerScreen
- Camera-based QR code scanning
- Real-time challenge processing
- Cryptographic signature generation
- Authentication status feedback

## Implementation Details

### QR Code Scanning Process

1. **Camera Permissions**: Requests camera access using `react-native-permissions`
2. **QR Detection**: Uses `react-native-qrcode-scanner` for real-time scanning
3. **Challenge Processing**: Parses JSON data from QR codes containing:
   ```json
   {
     "challenge": "0x...",
     "challengeId": "uuid",
     "expiresAt": "ISO timestamp"
   }
   ```

4. **Cryptographic Signing**: Signs challenges using ethers.js:
   ```typescript
   const signature = await wallet.signMessage(challenge);
   ```

5. **API Authentication**: Submits signature to backend:
   ```typescript
   POST /api/auth/login
   {
     "challengeId": "uuid",
     "signature": "0x...",
     "did": "did:ethr:0x...",
     "userAddress": "0x..."
   }
   ```

### State Management

The app uses React hooks for state management:

- `authStatus`: Tracks authentication flow states
- `isScanning`: Controls camera scanning behavior  
- `hasPermission`: Manages camera permission status
- `wallet`: Stores the user's cryptographic identity
- `userDID`: Stores the user's decentralized identifier

### Security Considerations

- Private keys are stored in AsyncStorage (in production, use secure keychain)
- Challenge expiration is validated before signing
- Network errors are handled gracefully
- User feedback is provided for all states

## Dependencies

```json
{
  "react-native-qrcode-scanner": "^1.5.5",
  "react-native-permissions": "^5.4.1", 
  "ethers": "^6.0.0",
  "@react-native-async-storage/async-storage": "^1.19.3",
  "@react-navigation/native": "^6.1.7",
  "@react-navigation/stack": "^6.3.17"
}
```

## Usage

### 1. Create Identity
- Open the app and tap "Create Identity"
- Generate a new wallet or import existing one
- Create DID on the blockchain

### 2. Authenticate with Web Portal
- Visit the web portal login page
- Tap "Scan to Login" in the mobile app
- Point camera at the QR code
- Authentication happens automatically

### 3. Authentication Flow
```
Web Portal → Generate Challenge → Display QR Code
     ↓
Mobile App → Scan QR → Sign Challenge → Submit to API
     ↓  
Backend → Verify Signature → Issue JWT Token
     ↓
Web Portal → Poll Status → Redirect to Dashboard
```

## Configuration

Update the API base URL in both screens:

```typescript
const API_BASE_URL = 'http://localhost:3001/api'; // Development
// const API_BASE_URL = 'https://api.yourplatform.com/api'; // Production
```

## Permissions Required

### Android
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### iOS
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to scan QR codes for authentication.</string>
```

## Platform Support

- ✅ iOS 10.0+
- ✅ Android 6.0+ (API level 23)
- ✅ React Native 0.72+

## Error Handling

The app handles various error scenarios:

- **Camera Permission Denied**: Shows permission request UI
- **Invalid QR Code**: Displays error message and allows retry
- **Expired Challenge**: Notifies user to refresh web portal
- **Network Errors**: Graceful fallback with retry options
- **Signature Failures**: Clear error messaging

## Testing

To test the QR code functionality:

1. Start the backend server (`npm run dev` in backend directory)
2. Start the web portal (`npm run dev` in portal directory) 
3. Launch the mobile app
4. Create an identity in the mobile app
5. Visit `http://localhost:3000/login` in the web browser
6. Use the mobile app to scan the QR code

## Future Enhancements

- [ ] Biometric authentication for app access
- [ ] Hardware security module integration
- [ ] Multi-signature wallet support
- [ ] Transaction history and audit logs
- [ ] Push notifications for authentication requests
- [ ] Offline signature capabilities

## Architecture

The ScannerScreen follows a clear architecture:

1. **Permission Layer**: Handles camera permissions
2. **Scanner Layer**: QR code detection and parsing
3. **Crypto Layer**: Challenge signing with ethers.js
4. **Network Layer**: API communication with backend
5. **UI Layer**: Status feedback and navigation

This implementation provides a complete, secure, and user-friendly QR code authentication system for the Decentralized Trust Platform.
