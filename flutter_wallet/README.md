# Flutter Trust Wallet

A decentralized identity wallet built with Flutter, featuring zero-knowledge proofs and DID authentication.

## Features

### ✅ Completed Features

#### 🔐 Wallet Management
- **Secure Wallet Generation**: Create cryptographically secure wallets using secp256k1 curves
- **Private Key Management**: Secure storage using Flutter Secure Storage
- **Wallet Backup & Restore**: Export and import wallet with encrypted backup keys
- **DID Creation**: Automatic generation of Decentralized Identifiers (DIDs) from wallet addresses

#### 🆔 DID Authentication
- **DID Document Creation**: Generate W3C-compliant DID documents
- **Challenge-Response Authentication**: Cryptographic proof of identity ownership
- **Domain-Specific Authentication**: Authenticate with specific domains securely
- **Verifiable Credentials**: Create and verify digital credentials

#### 🔒 Zero-Knowledge Proofs
- **Identity Verification**: Prove identity claims without revealing personal data
- **Membership Proofs**: Prove group membership without revealing identity
- **Range Proofs**: Prove values are within ranges (e.g., age verification)
- **NFT Ownership Proofs**: Prove NFT ownership without revealing wallet address

#### 📱 User Interface
- **Modern Dark Theme**: Sleek UI with gradient backgrounds and animations
- **Animated Splash Screen**: Professional startup experience
- **Card-Based Design**: Clean, organized information display
- **Responsive Layout**: Works across different screen sizes

#### 🔧 Technical Implementation
- **Service Architecture**: Clean separation of concerns with dedicated service classes
- **Type Safety**: Full TypeScript-style type safety with Dart
- **Error Handling**: Comprehensive error handling and user feedback
- **Security Best Practices**: Secure storage, encrypted communications

### 🚧 Architecture

```
lib/
├── main.dart                 # App entry point and splash screen
├── screens/                  # UI screens
│   ├── home_screen.dart     # Main wallet dashboard
│   ├── qr_scanner_screen.dart # QR code scanning functionality
│   ├── did_auth_screen.dart # DID authentication interface
│   └── zk_proof_screen.dart # Zero-knowledge proof generation
└── services/                # Business logic
    ├── wallet_service.dart  # Wallet operations
    ├── did_service.dart     # DID operations
    └── zk_proof_service.dart # ZK proof operations
```

### 🔑 Key Technologies

- **Flutter**: Cross-platform mobile development framework
- **web3dart**: Ethereum wallet and cryptographic operations
- **flutter_secure_storage**: Secure local storage for private keys
- **pointycastle**: Cryptographic operations and random number generation
- **qr_code_scanner**: QR code scanning for authentication flows
- **http**: RESTful API communication with backend services

### 🌐 Backend Integration

The Flutter wallet integrates with the existing Node.js backend:

- **Authentication API**: `/api/auth/challenge`, `/api/auth/verify`
- **DID Operations**: `/api/did/register`, `/api/did/resolve`
- **ZK Proof Verification**: `/api/zkp/verify`, `/api/zkp/verification-key`

### 🔐 Security Features

#### Cryptographic Security
- **secp256k1 Elliptic Curves**: Industry-standard cryptographic security
- **Secure Random Generation**: Cryptographically secure random number generation
- **Message Signing**: Personal message signing for authentication
- **Hash Functions**: SHA-256 for data integrity

#### Storage Security
- **Encrypted Storage**: Private keys encrypted at rest
- **No Plain Text Storage**: Sensitive data never stored in plain text
- **Secure Backup**: Checksum-verified backup and restore

#### Communication Security
- **HTTPS Only**: All API communications over secure channels
- **Challenge-Response**: Prevents replay attacks
- **Nonce Usage**: One-time numbers prevent duplicate transactions

### 📖 Usage Examples

#### Create a New Wallet
```dart
// Generate new wallet
final privateKey = await WalletService.generateWallet();
final address = await WalletService.getWalletAddress();
final did = await WalletService.createDID();
```

#### Authenticate with DID
```dart
// Create authentication challenge
final challenge = await DIDService.createAuthChallenge('example.com');

// Sign challenge
final signature = await DIDService.signAuthChallenge(
  challenge['challenge'], 
  challenge['nonce']
);

// Complete authentication
final result = await DIDService.completeAuthentication(
  challenge: challenge['challenge'],
  signature: signature,
  nonce: challenge['nonce'],
);
```

#### Generate Zero-Knowledge Proof
```dart
// Identity proof without revealing personal data
final proof = await ZKProofService.generateIdentityProof(
  credentials: {'age': 25, 'location': 'Mumbai'},
  requiredClaims: ['age'],
);

// Verify proof
final verified = await ZKProofService.verifyProof(proof);
```

### 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   flutter pub get
   ```

2. **Start Backend Server**
   ```bash
   cd ../backend && npm start
   ```

3. **Run Flutter App**
   ```bash
   flutter run
   ```

### 🎯 User Flows

#### 1. First-Time Setup
- Splash screen with loading animation
- Automatic wallet generation on first launch
- DID registration with backend
- Security backup reminder

#### 2. Daily Usage
- Quick access to QR scanner
- DID authentication for services
- Zero-knowledge proof generation
- Wallet management and backup

#### 3. Authentication Flow
- Scan QR code from service
- Automatic challenge processing
- Cryptographic signature generation
- Success confirmation

### 🔧 Development Notes

#### Known Limitations
- **Android Build**: QR scanner dependency requires Android namespace configuration
- **iOS Support**: Requires iOS-specific permissions for camera access
- **Network Dependency**: Requires backend server for full functionality

#### Future Enhancements
- **Biometric Authentication**: Fingerprint/Face ID integration
- **Multi-Chain Support**: Support for multiple blockchain networks
- **Credential Management**: Advanced verifiable credential storage
- **P2P Communication**: Direct peer-to-peer authentication

### 📱 Screenshots & Features

#### Home Screen
- Clean wallet dashboard
- Quick action buttons
- Modern gradient design
- Animated transitions

#### QR Scanner
- Real-time QR code scanning
- Automatic authentication processing
- Support for multiple QR code types
- Visual feedback and animations

#### DID Authentication
- Domain-specific authentication
- DID document visualization
- Cryptographic proof generation
- Success/failure feedback

#### Zero-Knowledge Proofs
- Multiple proof types
- Interactive form interfaces
- Proof generation and verification
- Shareable proof outputs

### 🔗 Integration with Main Project

This Flutter wallet replaces the previous React Native implementation and integrates seamlessly with:

- **Enhanced Portal UI**: React + TypeScript frontend
- **Backend API**: Node.js with ZK-proof verification
- **Benchmark Suite**: Performance comparison system
- **Shared Types**: Common TypeScript interfaces

The wallet maintains full compatibility with existing authentication flows while providing a native mobile experience with enhanced security through zero-knowledge proofs.

### 📝 Technical Specifications

- **Dart Version**: 3.0+
- **Flutter Version**: 3.24+
- **Target Platforms**: Android, iOS
- **Minimum Android**: API 21 (Android 5.0)
- **Minimum iOS**: iOS 12.0
- **Backend Compatibility**: Node.js 18+

This implementation represents a complete mobile wallet solution with cutting-edge cryptographic features, seamlessly integrated into the broader decentralized trust platform ecosystem.
