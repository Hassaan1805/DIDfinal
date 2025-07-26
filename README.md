# 🔐 Decentralized Trust Platform

> Next-generation DID-based authentication and authorization system for enterprises

**Location:** Mumbai, India  
**Year:** 2025  
**Status:** Phase 0 - Foundation Complete ✅

## 🎯 Mission

Building a comprehensive platform for digital trust within an enterprise context, moving beyond the broken paradigm of passwords to create a system based on Decentralized Identity (DID) and self-sovereign principles.

## 🗺️ Development Roadmap

- **✅ Phase 0: Foundation & Environment Setup** - Complete
- **🔄 Phase 1: Core MVP** - DID authentication with QR codes
- **📋 Phase 2: Enterprise Features** - Push notifications, RBAC, admin dashboard
- **🔒 Phase 3: High-Trust Platform** - High-value transaction authorization
- **🤖 Phase 4: AI Integration** - AI agent authorization system
- **🔐 Phase 5: Privacy-First** - Zero-knowledge proof data vault

## 🏗️ Architecture

### Monorepo Structure
```
DecentralizedTrustPlatform/
├── contracts/          # Smart contracts (Solidity + Hardhat)
├── backend/           # API server (Node.js + Express + TypeScript)
├── portal/            # Web dashboard (React + Vite + TypeScript)
├── wallet/            # Mobile wallet (React Native + TypeScript)
└── shared/            # Shared utilities and types
```

### Technology Stack
- **Blockchain:** Ethereum (Sepolia Testnet), Ganache (Local)
- **Smart Contracts:** Solidity + Hardhat
- **DID/VC Libraries:** ethers.js, did-ethr, did-jwt
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + Vite + TypeScript
- **Mobile:** React Native + TypeScript
- **Push Notifications:** Firebase Cloud Messaging
- **AI Framework:** LangChain.js (Phase 4)
- **ZKP:** Circom + SnarkJS (Phase 5)

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
- **DIDRegistry.sol**: Core DID management contract
- Ethereum-based identity registration and management
- Supports DID creation, updates, and revocation

### Backend API (`/backend`)
- RESTful API for DID operations
- Authentication and authorization services
- Blockchain integration layer
- **Endpoints:**
  - `GET /api/health` - Health check
  - `POST /api/auth/login` - DID authentication
  - `POST /api/did/create` - Create new DID
  - `GET /api/did/:address` - Retrieve DID document

### Web Portal (`/portal`)
- Enterprise dashboard for administrators
- DID management interface
- User role and permission management
- Built with React + Vite + TypeScript

### Mobile Wallet (`/wallet`)
- React Native mobile application
- DID wallet for end users
- QR code scanning for authentication
- Secure key management

### Shared Utilities (`/shared`)
- Common types and interfaces
- Utility functions for DID operations
- Blockchain helper functions
- Validation utilities

## 🔐 Security Features

### Current (Phase 0)
- ✅ Smart contract-based DID registry
- ✅ TypeScript for type safety
- ✅ Secure environment variable management
- ✅ CORS protection
- ✅ Input validation frameworks

### Upcoming Phases
- 🔄 JWT-based authentication
- 🔄 QR code challenge-response
- 📋 Role-based access control
- 📋 Push notification security
- 🔒 Multi-signature requirements
- 🤖 AI agent authorization
- 🔐 Zero-knowledge proofs

## 🌐 Network Support

### Supported Networks
- **Ethereum Mainnet** (Production)
- **Sepolia Testnet** (Development/Testing)
- **Ganache** (Local Development)

### Contract Addresses
Update `.env` with deployed contract addresses:
```
DID_REGISTRY_ADDRESS=0x...
```

## 📊 Monitoring & Health

### Health Checks
- **Backend**: `GET /api/health`
- **Detailed**: `GET /api/health/detailed`

### Development URLs
- **Backend API**: http://localhost:3001
- **Web Portal**: http://localhost:5173
- **Mobile Wallet**: Metro bundler on port 8081

## 🧪 Testing

### Unit Tests
```bash
yarn test                    # Run all tests
yarn workspace backend test # Backend tests only
yarn workspace contracts test # Contract tests only
```

### Integration Tests
```bash
# Start local blockchain
yarn start:ganache

# Deploy contracts
cd contracts && yarn deploy

# Run integration tests
yarn test:integration
```

## 📈 Performance Considerations

### Blockchain
- Gas optimization in smart contracts
- Efficient DID document storage
- Minimal on-chain data

### API
- Response caching
- Database query optimization
- Rate limiting protection

### Mobile
- Secure key storage (React Native Keychain)
- Offline capability planning
- Efficient QR code processing

## 🔄 CI/CD Pipeline

### GitHub Actions (Planned)
- Automated testing on push
- Smart contract compilation
- Security vulnerability scanning
- Deployment to staging/production

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Run full test suite
4. Submit pull request
5. Code review and merge

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive error handling

## 📋 Phase 1 Roadmap

### Next Implementation Steps
1. **Smart Contract Deployment**
   - Deploy DIDRegistry to Sepolia
   - Verify contract on Etherscan
   - Update environment configuration

2. **Backend API Development**
   - Complete authentication endpoints
   - Implement DID creation/management
   - Add blockchain integration

3. **QR Code Authentication**
   - Challenge-response system
   - Mobile wallet integration
   - Web portal authentication flow

4. **Testing & Validation**
   - End-to-end authentication flow
   - Security testing
   - Performance validation

## 🔗 Resources

### Documentation
- [W3C DID Specification](https://www.w3.org/TR/did-core/)
- [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [Ethereum Development](https://ethereum.org/developers/)

### Tools
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [Ethers.js](https://docs.ethers.io/) - Ethereum library
- [DID-JWT](https://github.com/decentralized-identity/did-jwt) - JWT library for DIDs

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👥 Team

**DecentralizedTrustPlatform Team**  
Mumbai, India • 2025

---

**🚀 Ready for Phase 1 Development!**
