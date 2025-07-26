# DID Wallet - Professional Mobile App

A professional React Native mobile wallet application for Decentralized Identity (DID) authentication and enterprise access management.

## 🌟 Features

- **Professional Identity Management**: Create and manage your decentralized digital identity
- **QR Code Authentication**: Scan QR codes to authenticate with company portals
- **Enterprise Integration**: Seamless integration with corporate authentication systems
- **Activity Tracking**: Monitor all authentication activities and company access
- **Security Dashboard**: View security level and trusted company relationships
- **Real-time Statistics**: Track authentication success rates and usage metrics

## 📱 Screenshots

### Professional Home Screen
- Clean, modern interface with professional theming
- Real-time activity dashboard
- Security status indicators
- Quick action buttons for scanning and identity management

### Key Components
- **Identity Overview**: Display DID address, wallet address, and security level
- **Quick Actions**: Fast access to QR scanner and identity management
- **Recent Activity**: Timeline of authentication events
- **Statistics**: Visual representation of usage metrics

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. Navigate to the wallet directory:
```bash
cd wallet
```

2. Install dependencies:
```bash
npm install
```

3. Install iOS dependencies (iOS only):
```bash
cd ios && pod install && cd ..
```

### Development

1. Start Metro bundler:
```bash
npm start
```

2. Run on Android:
```bash
npm run android
```

3. Run on iOS:
```bash
npm run ios
```

## 🏗️ Architecture

### Core Components

#### ProfessionalWalletHome
The main dashboard screen featuring:
- User profile with avatar and company information
- Real-time clock and connection status
- Quick action cards for scanning and identity management
- Activity timeline with authentication history
- Identity information display with DID and wallet addresses

#### Navigation Structure
- **Home**: Professional dashboard (ProfessionalWalletHome)
- **Create Identity**: Identity creation and management
- **Scanner**: QR code scanning for authentication

### State Management
- AsyncStorage for persistent data
- Local state management with React hooks
- Profile and activity data synchronization

### Professional Features

#### Identity Profile
```typescript
interface UserProfile {
  did: string;
  address: string;
  hasWallet: boolean;
  name?: string;
  company?: string;
  employeeId?: string;
  totalAuthentications?: number;
  securityLevel: 'high' | 'medium' | 'low';
}
```

#### Activity Tracking
```typescript
interface RecentActivity {
  id: string;
  type: 'authentication' | 'identity_created' | 'company_access';
  company: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  details: string;
}
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the wallet directory:
```env
API_BASE_URL=http://localhost:3001
PORTAL_URL=http://localhost:5173
ETHEREUM_NETWORK=sepolia
```

### Theme Configuration
The app uses a professional corporate theme with:
- Primary color: #4F46E5 (Indigo)
- Success color: #10B981 (Emerald)
- Background: #f8fafc (Slate)
- Card backgrounds: #ffffff (White)

## 📊 Professional Features

### Dashboard Metrics
- **Total Authentications**: Count of successful logins
- **Trusted Companies**: Number of integrated organizations
- **Success Rate**: Authentication success percentage
- **Security Level**: Current identity security status

### Activity Timeline
Real-time tracking of:
- Company portal authentications
- Identity creation events
- Access grants and permissions
- Failed authentication attempts

### Security Features
- **Verified Identity Badge**: Visual indicator of identity verification
- **Security Level Display**: High/Medium/Low security classification
- **DID Address Display**: Truncated address with copy functionality
- **Session Management**: Active session tracking and expiration

## 🔗 Integration

### Portal Integration
The wallet integrates seamlessly with the company portal:
1. Employee enters ID in portal
2. Portal generates QR code with employee context
3. Wallet scans QR code
4. Authentication challenge is processed
5. Access is granted to company services

### API Endpoints
- `GET /api/auth/challenge` - Get authentication challenge
- `POST /api/auth/challenge` - Create employee-specific challenge
- `POST /api/auth/verify` - Verify authentication response

## 🛠️ Development Tasks

Available VS Code tasks:
- **Start React Native Metro**: Launch development server
- **Build Android APK**: Build for Android deployment
- **Start All Services**: Launch entire development environment

### Build Commands
```bash
# Development
npm start                 # Start Metro bundler
npm run android          # Run on Android
npm run ios              # Run on iOS

# Production
npm run build:android    # Build Android APK
npm run build:ios        # Build iOS app
```

## 🎨 Design System

### Typography
- Headers: Bold, high contrast
- Body text: Medium weight, readable
- Captions: Light weight, secondary color

### Color Palette
- **Primary**: #4F46E5 (Corporate blue)
- **Success**: #10B981 (Success green)
- **Warning**: #F59E0B (Warning amber)
- **Error**: #EF4444 (Error red)
- **Neutral**: #6B7280 (Text gray)

### Component Styling
- **Cards**: Rounded corners (16px), subtle shadows
- **Buttons**: Gradient backgrounds, elevation effects
- **Icons**: Consistent sizing, professional appearance
- **Avatars**: Circular, bordered, fallback initials

## 📋 Testing

### Manual Testing Checklist
- [ ] Identity creation flow
- [ ] QR code scanning functionality
- [ ] Activity timeline updates
- [ ] Statistics accuracy
- [ ] Navigation between screens
- [ ] Data persistence
- [ ] Error handling

### Demo Data
The app includes mock data for demonstration:
- Sample user profiles
- Simulated authentication history
- Company integration examples
- Activity timeline entries

## 🔒 Security Considerations

- **Private Key Storage**: Secure storage using device keychain
- **DID Management**: Proper DID document handling
- **Authentication**: Challenge-response authentication flow
- **Data Protection**: Encrypted storage of sensitive data
- **Session Security**: Proper session management and timeout

## 📱 Platform Support

- **Android**: API level 21+ (Android 5.0+)
- **iOS**: iOS 12.0+
- **React Native**: 0.72+
- **Node.js**: 16+

## 🤝 Contributing

1. Follow the established coding patterns
2. Use TypeScript for type safety
3. Maintain professional UI/UX standards
4. Include proper error handling
5. Test on both platforms

## 📄 License

MIT License - Enterprise version for Decentralized Trust Platform

---

**Professional DID Wallet** - Secure, scalable, and user-friendly mobile authentication for the enterprise.
