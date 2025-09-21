# 🔐 Decentralized Trust Platform

> Enterprise-grade DID-based authentication with Zero-Knowledge Proof premium content access

**Location:** Mumbai, India  
**Year:** 2025  
**Status:** Task 5 - ZK-Proof Premium Content Gate Complete ✅

## 🎯 Mission

A comprehensive decentralized identity platform that provides privacy-preserving authentication and token-gated premium content access. Built for enterprises seeking next-generation security through self-sovereign identity and zero-knowledge proofs.

## � Current Implementation Status

- **✅ Task 1: Smart Contract Foundation** - DID Registry deployed
- **✅ Task 2: Backend API with RBAC** - Complete authentication system
- **✅ Task 3: Web Portal Enhancement** - Enterprise dashboard with QR authentication
- **✅ Task 4: Mobile Wallet Integration** - React Native app with ZK-proof generation
- **✅ Task 5: ZK-Proof Premium Content Gate** - Session-based access upgrades

## 🏆 Key Features Implemented

### 🔐 **Zero-Knowledge Proof Authentication**
- **Privacy-preserving NFT verification**: Prove Corporate Excellence 2025 NFT ownership without revealing identity
- **Session upgrade model**: Seamless transition from standard to premium access
- **Circom circuits**: Custom ZK circuits for NFT ownership verification
- **Mobile proof generation**: Complete ZK-proof workflow in React Native wallet

### 🌐 **Enterprise Web Portal**
- **QR Code Authentication**: Scan-to-login with mobile DID wallet  
- **Premium Content Gate**: Token-gated access to exclusive enterprise features
- **Real-time Polling**: Auto-detection of session upgrades via ZK-proof verification
- **Responsive Design**: Modern React + Vite + TypeScript interface

### 📱 **Mobile DID Wallet** 
- **Self-sovereign Identity**: Create and manage Ethereum-based DIDs
- **QR Scanner**: Authenticate with web portal via camera scanning
- **ZK-Proof Engine**: Generate privacy-preserving proofs on-device
- **Secure Storage**: Encrypted private key management with React Native Keychain

### 🔗 **Smart Contract Infrastructure**
- **DID Registry**: Ethereum-based decentralized identity management
- **Gas-optimized**: Efficient on-chain operations
- **Multi-network**: Supports Ethereum mainnet, testnets, and local development

## 🏗️ Architecture

### Monorepo Structure
```
decentralized-trust-platform/
├── contracts/          # Smart contracts (Solidity + Hardhat)
├── backend/           # API server (Node.js + Express + TypeScript)  
├── portal/            # Web dashboard (React + Vite + TypeScript)
├── wallet/            # Mobile wallet (React Native + TypeScript)
├── circuits/          # Zero-Knowledge Proof circuits (Circom)
└── shared/            # Shared utilities and types
```

### Technology Stack
- **Blockchain:** Ethereum (Sepolia Testnet), Ganache (Local)
- **Smart Contracts:** Solidity + Hardhat  
- **Zero-Knowledge:** Circom + SnarkJS for privacy-preserving proofs
- **DID/VC Libraries:** ethers.js, did-ethr, did-jwt
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + Vite + TypeScript  
- **Mobile:** React Native + TypeScript
- **Authentication:** JWT with session upgrade model

## 🚀 Complete Authentication Flow

### 1. **Standard DID Authentication**
```
Web Portal → QR Code → Mobile Wallet → DID Signature → JWT Token → Dashboard Access
```

### 2. **ZK-Proof Premium Upgrade**  
```
Dashboard → "Unlock Premium" → ZK-Proof Generation → Session Upgrade → Premium Content
```

### 3. **Technical Implementation**
- **Challenge-Response:** Secure QR code authentication
- **Session Management:** JWT tokens with access level claims (standard/premium)
- **Polling Mechanism:** Real-time session upgrade detection
- **Privacy-First:** Zero-knowledge NFT ownership verification

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- Yarn package manager
- Git

### Quick Setup
```bash
# Clone and setup
git clone <your-repo-url>
cd DecentralizedTrustPlatform

# Install dependencies
yarn install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Build all projects
yarn build

# Start development servers
yarn dev
```

### Environment Configuration
Copy `.env.example` to `.env` and configure:
- Ethereum RPC URLs (Infura/Alchemy)
- Private keys for deployment
- Firebase configuration
- JWT secrets

### 🏃‍♂️ Development Server Setup

#### Option 1: Using VS Code Tasks (Recommended)
1. Open the project in VS Code
2. Use `Ctrl+Shift+P` → "Tasks: Run Task"
3. Select tasks:
   - "Start Backend API Server" (runs on localhost:3001)
   - "Start Portal Development Server" (runs on localhost:5173)
   - "Start React Native Metro" (for mobile development)

#### Option 2: Manual Setup
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Web Portal
cd portal && npm run dev

# Terminal 3: Mobile Metro Bundler
cd wallet && npm start

# Terminal 4: Android App (requires Android Studio/emulator)
cd wallet && npm run android
```

### 📱 Android Setup (Mobile Wallet)
```bash
# Install Android dependencies
cd wallet
npm install

# Copy ZK circuit files (for proof generation)
npm run copy-circuits

# Build and run on Android
npm run android
```

### 🧪 Testing the Complete Flow
1. **Start all services** using VS Code tasks or manual setup
2. **Open web portal**: Visit `http://localhost:5173`
3. **Open mobile app**: Launch on Android emulator or device  
4. **Test authentication**: Scan QR code from portal with mobile app
5. **Test premium access**: Use ZK-proof features in the app

## 🔧 Development Scripts

### Root Level
```bash
yarn dev          # Start all development servers
yarn build        # Build all projects
yarn test         # Run all tests
yarn clean        # Clean all build artifacts
yarn setup        # Initial setup and compilation
```

### Individual Projects
```bash
# Contracts
cd contracts
yarn compile      # Compile smart contracts
yarn test         # Run contract tests
yarn deploy       # Deploy to configured network

# Backend
cd backend
yarn dev          # Start development server
yarn build        # Build TypeScript
yarn test         # Run API tests

# Portal
cd portal
yarn dev          # Start Vite dev server
yarn build        # Build for production
yarn preview      # Preview production build

# Wallet
cd wallet
yarn start        # Start Metro bundler
yarn android      # Run on Android
yarn ios          # Run on iOS

# Shared
cd shared
yarn build        # Build shared utilities
yarn dev          # Watch mode for development
```

## 📱 Components Overview

### Smart Contracts (`/contracts`)
- **DIDRegistry.sol**: Ethereum-based decentralized identity management
- **Deployed & Verified**: Ready for production use
- **Gas-optimized**: Efficient identity operations

### Backend API (`/backend`)
- **Complete Authentication System**: JWT-based session management with access levels
- **ZK-Proof Verification**: Integration with SnarkJS for privacy-preserving authentication
- **Session Upgrade Model**: Seamless transition from standard to premium access
- **Key Endpoints:**
  - `POST /api/auth/create-challenge` - Generate QR authentication challenge
  - `POST /api/auth/verify-response` - Verify DID authentication and issue JWT
  - `POST /api/zkp/verify-zkp-session` - Verify ZK-proof and upgrade session to premium
  - `GET /api/auth/session-status` - Check current session access level
  - `GET /api/health` - Service health monitoring

### Web Portal (`/portal`)
- **Enterprise Dashboard**: Complete admin interface with modern React architecture
- **QR Code Authentication**: Scan-to-login workflow with mobile wallet
- **Premium Content Gate**: Token-gated access requiring NFT ownership proof
- **Real-time Session Polling**: Auto-detection of ZK-proof session upgrades
- **Responsive Design**: Optimized for desktop and mobile viewing

### Mobile Wallet (`/wallet`)
- **React Native DID Wallet**: Cross-platform mobile identity management
- **QR Scanner Integration**: Camera-based authentication with web portal
- **ZK-Proof Engine**: On-device generation of privacy-preserving NFT ownership proofs
- **Secure Key Management**: Encrypted storage using React Native Keychain
- **Corporate Excellence 2025 NFT**: Integrated support for premium access tokens

### ZK Circuits (`/circuits`)
- **Circom Implementation**: Custom circuits for NFT ownership verification
- **Privacy-Preserving**: Prove token ownership without revealing wallet address
- **Groth16 Protocol**: Production-ready zero-knowledge proof system
- **Mobile-Optimized**: Efficient proof generation on mobile devices

### Shared Utilities (`/shared`)
- Common types and interfaces
- Utility functions for DID operations
- Blockchain helper functions
- Validation utilities

## 🔐 Security Features

### ✅ **Implemented & Production-Ready**
- ✅ **Zero-Knowledge Proof Authentication**: Privacy-preserving NFT ownership verification
- ✅ **JWT Session Management**: Secure token-based authentication with access levels  
- ✅ **DID-based Identity**: Ethereum-anchored decentralized identifiers
- ✅ **QR Code Challenge-Response**: Secure mobile-to-web authentication
- ✅ **Session Upgrade Model**: Seamless transition to premium access
- ✅ **Encrypted Key Storage**: React Native Keychain integration
- ✅ **TypeScript Safety**: Comprehensive type checking across all components
- ✅ **Input Validation**: Request validation and sanitization
- ✅ **CORS Protection**: Cross-origin resource sharing security

## 🎯 **Complete User Experience**

### **Standard User Flow**
1. **Web Portal Access**: Visit enterprise dashboard
2. **QR Authentication**: Scan challenge code with mobile wallet  
3. **DID Verification**: Sign challenge with decentralized identity
4. **Dashboard Access**: Full access to standard enterprise features

### **Premium User Flow**  
1. **Premium Unlock**: Click "Unlock Premium Content with DID Wallet"
2. **ZK-Proof Generation**: Mobile wallet creates privacy-preserving NFT proof
3. **Session Upgrade**: Backend verifies proof and upgrades access level
4. **Premium Content**: Automatic access to token-gated features

## � **Getting Started**

### **Prerequisites**
- Node.js 18+ and npm
- Android Studio (for mobile development)
- Git

### **Quick Start**
```bash
# Clone the repository
git clone https://github.com/zaidnansari2011/decentralized-trust-platform.git
cd decentralized-trust-platform

# Install all dependencies
npm install

# Start backend server
cd backend && npm start &

# Start web portal  
cd portal && npm run dev &

# Build mobile wallet
cd wallet && npm run android
```

### **Environment Setup**
Configure your `.env` files:

**Backend (.env):**
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-here
ETHEREUM_RPC_URL=http://localhost:8545
PRIVATE_KEY=your-ethereum-private-key-here
```

**Portal (.env):**
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_ENVIRONMENT=development
```

## � **API Documentation**

### **Authentication Endpoints**
- `POST /api/auth/create-challenge` - Generate QR authentication challenge
- `POST /api/auth/verify-response` - Verify DID signature and issue JWT token  
- `GET /api/auth/session-status` - Check current session access level

### **Zero-Knowledge Proof Endpoints**
- `POST /api/zkp/verify-zkp-session` - Verify NFT ownership proof and upgrade session
- `GET /api/zkp/challenge` - Generate ZK-proof challenge

### **Health Monitoring**
- `GET /api/health` - Service health check
- `GET /api/health/detailed` - Detailed system status

## 🌐 **Network Support**

### **Supported Networks**
- **Ethereum Mainnet** (Production deployment ready)
- **Sepolia Testnet** (Development and testing)  
- **Ganache** (Local development environment)

### **Development URLs**
- **Backend API**: http://localhost:3001
- **Web Portal**: http://localhost:5173  
- **Mobile Wallet**: React Native Metro bundler

## 🧪 **Testing**

### **End-to-End Testing**
```bash
# Start all services
npm run start:all

# Test complete authentication flow
npm run test:e2e

# Test ZK-proof premium upgrade
npm run test:zkp-flow
```

### **Component Testing**
```bash
# Backend API tests
cd backend && npm test

# Portal component tests  
cd portal && npm test

# Mobile wallet tests
cd wallet && npm test
```

## 🔗 **Resources & Documentation**

### **Standards & Specifications**
- [W3C DID Specification](https://www.w3.org/TR/did-core/)
- [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)  
- [Zero-Knowledge Proofs](https://ethereum.org/en/zero-knowledge-proofs/)

### **Development Tools**
- [Circom Documentation](https://docs.circom.io/) - ZK circuit development
- [SnarkJS Guide](https://github.com/iden3/snarkjs) - Zero-knowledge proof generation
- [Hardhat Framework](https://hardhat.org/) - Ethereum development environment

## 🤝 **Contributing**

### **Development Workflow**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`  
5. Open a Pull Request

### **Code Standards**
- TypeScript strict mode enforcement
- Comprehensive error handling
- Security-first development practices
- Zero-knowledge proof privacy principles

## �📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 👥 **Team**

**Decentralized Trust Platform Team**  
Mumbai, India • 2025

**Built with:** Enterprise-grade security • Privacy-first design • Zero-knowledge innovation

---

## 🏆 **Achievement Summary**

✅ **Complete DID Authentication System**  
✅ **Zero-Knowledge Proof Integration**  
✅ **Mobile-to-Web Authentication Flow**  
✅ **Premium Content Token Gating**  
✅ **Enterprise-Ready Architecture**  

**🚀 Ready for Production Deployment!**

**Repository:** https://github.com/zaidnansari2011/decentralized-trust-platform
