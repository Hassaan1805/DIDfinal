# Decentralized Trust Platform — Setup Guide & Project Documentation

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup on a New Device](#2-project-setup-on-a-new-device)
3. [Running the Project](#3-running-the-project)
4. [Architecture Overview](#4-architecture-overview)
5. [Smart Contracts](#5-smart-contracts)
6. [Backend Server](#6-backend-server)
7. [Enterprise Portal (Web App)](#7-enterprise-portal-web-app)
8. [Mobile Wallet App](#8-mobile-wallet-app)
9. [Zero-Knowledge Proof System](#9-zero-knowledge-proof-system)
10. [Shared Library](#10-shared-library)
11. [Complete Authentication Flow](#11-complete-authentication-flow)
12. [Feature Summary](#12-feature-summary)

---

## 1. Prerequisites

Install these before setting up the project:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >= 18.0.0 | Runtime for backend, portal, and tooling |
| **npm** | >= 9.0.0 | Package manager (comes with Node.js) |
| **Git** | Latest | Version control |
| **Expo CLI** | Latest | Mobile app development (`npm install -g expo-cli`) |
| **Expo Go** | Latest | Install on your phone from App Store / Play Store |
| **MetaMask** (optional) | Latest | Browser wallet for testing blockchain interactions |

**Optional (for smart contract development):**

| Tool | Version | Purpose |
|------|---------|---------|
| **Hardhat** | Installed via npm | Smart contract compilation and deployment |
| **Infura Account** | Free tier | Sepolia testnet RPC access |
| **Sepolia ETH** | From faucet | Gas for contract deployment (faucet: sepoliafaucet.com) |

---

## 2. Project Setup on a New Device

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd DIDfinal
```

### Step 2: Install All Dependencies

```bash
# Install root + backend + portal dependencies
npm run setup

# For full setup (includes contracts + circuits):
npm run setup:full
```

If you encounter issues with the wallet, install its dependencies separately:
```bash
cd wallet
npm install
cd ..
```

### Step 3: Configure Environment Variables

#### Backend (.env.development)

```bash
cd backend
cp .env.example .env.development
```

Edit `backend/.env.development` with your values:

```env
# Your machine's local IP (find it: Windows → ipconfig, Mac → ifconfig)
LOCAL_IP=YOUR_LOCAL_IP
PORT=3001
PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3001

# Sepolia Blockchain (use the existing deployed contract)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48
PLATFORM_PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
PLATFORM_ADDRESS=YOUR_WALLET_ADDRESS

# Security
JWT_SECRET=generate-a-secure-64-character-minimum-secret-key-here-change-this
ADMIN_TOKEN=your-admin-token-minimum-32-characters-long

# Mode
NODE_ENV=development
DEMO_MODE=false
```

> **How to get PLATFORM_PRIVATE_KEY**: Export your private key from MetaMask (Account Details → Export Private Key). This wallet pays gas fees for on-chain DID registration. Make sure it has Sepolia ETH.

#### Portal (.env.development)

```bash
cd ../portal
cp .env.example .env.development
```

Edit `portal/.env.development`:

```env
VITE_API_BASE_URL=http://YOUR_LOCAL_IP:3001/api
VITE_FRONTEND_URL=http://localhost:5173
VITE_NODE_ENV=development
```

#### Wallet (.env)

```bash
cd ../wallet
cp .env.example .env
```

Edit `wallet/.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001
EXPO_PUBLIC_API_URL_FALLBACK_1=http://localhost:3001
EXPO_PUBLIC_NETWORK_TIMEOUT=10000
EXPO_PUBLIC_AUTO_DISCOVER=true
EXPO_PUBLIC_CHAIN_ID=11155111
EXPO_PUBLIC_NETWORK=sepolia
```

> **IMPORTANT**: Replace `YOUR_LOCAL_IP` with your computer's actual IP address (e.g., `192.168.0.105`). Your phone and computer must be on the **same WiFi network** for the mobile wallet to communicate with the backend.

### Step 4: Build the Project

```bash
cd ..  # back to root
npm run build:backend
npm run build:portal
```

### Step 5: Verify Setup

```bash
# Start everything
npm run dev

# You should see:
# [BACKEND] Server running on http://0.0.0.0:3001
# [PORTAL]  Local: http://localhost:5173
# [WALLET]  Metro bundler ready
```

Test the backend health endpoint:
```bash
curl http://localhost:3001/api/health
```

---

## 3. Running the Project

### Development Mode (All Services)

```bash
# From root directory — starts backend + portal + wallet simultaneously
npm run dev
```

### Run Services Individually

```bash
# Backend only
cd backend && npm run dev

# Portal only
cd portal && npm run dev

# Wallet only
cd wallet && npx expo start
```

### LAN Mode (for mobile testing)

```bash
# Syncs network config and starts all services with LAN access
npm run dev:lan
```

### Access Points

| Service | URL |
|---------|-----|
| **Backend API** | http://localhost:3001 |
| **Backend Health** | http://localhost:3001/api/health |
| **Portal Web App** | http://localhost:5173 |
| **Wallet (Expo)** | Scan QR code from Expo CLI with Expo Go app |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DECENTRALIZED TRUST PLATFORM                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │   PORTAL      │   │   BACKEND     │   │  SMART CONTRACTS  │   │
│  │  (React/Vite) │◄─►│  (Express.js) │◄─►│  (Solidity/       │   │
│  │  Port: 5173   │   │  Port: 3001   │   │   Sepolia)        │   │
│  └──────┬───────┘   └──────┬───────┘   └──────────────────┘    │
│         │                  │                                     │
│         │    QR Code       │                                     │
│         │    ┌─────┐       │                                     │
│         └───►│ QR  │◄──────┘                                     │
│              └──┬──┘                                             │
│                 │ Scan                                            │
│          ┌──────▼──────┐                                         │
│          │   WALLET     │                                         │
│          │ (React Native│                                         │
│          │  /Expo)      │                                         │
│          └─────────────┘                                         │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐                             │
│  │   SHARED      │   │   CIRCUITS    │                            │
│  │  (Types/Utils) │   │ (ZK-SNARKs)  │                            │
│  └──────────────┘   └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

**The system has 5 major components:**

1. **Smart Contracts** — Solidity contracts on Sepolia testnet for DID registration and authentication recording
2. **Backend** — Node.js/Express API server handling authentication, employee management, credential issuance, and blockchain interaction
3. **Portal** — React web application for enterprise administration, QR-based login, and dashboard access
4. **Wallet** — React Native (Expo) mobile application for identity management, QR scanning, and cryptographic signing
5. **Shared** — Common TypeScript types, constants, and utilities used across components

---

## 5. Smart Contracts

**Network**: Sepolia Testnet (Chain ID: 11155111)
**Deployed Address**: `0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48`
**Etherscan**: https://sepolia.etherscan.io/address/0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48

### Three Contracts

#### a) DIDRegistry.sol — Core DID Management

The foundational contract for registering and managing Decentralized Identifiers on-chain.

**What it does:**
- Registers DIDs tied to Ethereum addresses
- Stores public keys in compressed format
- Supports DID creation, update, and revocation
- Uses a **Gas Station pattern** — the platform wallet pays gas fees so users don't need ETH

**Key functions:**
- `registerDID(address, publicKey)` — Register a DID (called by platform, not user)
- `createDID(didDocument)` — User creates their own DID
- `revokeDID()` — Permanently revoke a DID
- `isValidDID(address)` — Check if a DID is active and not revoked
- `getDIDDocument(address)` — Retrieve the full W3C DID Document

**Events emitted:** DIDCreated, DIDRegistered, DIDUpdated, DIDRevoked

#### b) SimpleDIDRegistry.sol — Sepolia Production Contract (Currently Deployed)

A lightweight version optimized for the Sepolia testnet with employee management and authentication tracking.

**What it does:**
- Registers employee DIDs with their public key (JWK format)
- Records authentication sessions on-chain (challenge-response)
- Verifies authentication signatures
- Tracks statistics (total registrations, total authentications)

**Key functions:**
- `registerEmployeeDID(address, did, publicKeyJwk)` — Register an employee's DID on-chain
- `recordAuthentication(challengeId, message, user)` — Store auth challenge on-chain
- `verifyAuthentication(challengeId, signature)` — Verify auth signature on-chain
- `getEmployeeDIDInfo(user)` — Look up an employee's DID details
- `getContractStats()` — Get platform-wide statistics

**Data stored per employee:**
- DID string, public key (JWK), registration date, active status, auth count

#### c) DIDAuthRegistry.sol — Advanced Production Contract

The most feature-rich contract with full ECDSA signature verification, credential management, and security hardening.

**Security features:**
- OpenZeppelin ReentrancyGuard (prevents reentrancy attacks)
- ECDSA signature verification (cryptographic proof)
- Challenge hash validation with 5-minute expiration
- Proper address recovery and validation

**Additional capabilities:**
- `issueCredential(address, credentialHash)` — Issue verifiable credentials on-chain
- `hasCredential(user, credentialHash)` — Check if a user holds a credential

---

## 6. Backend Server

**Tech**: Node.js, Express, TypeScript
**Port**: 3001

### Core API Endpoints

#### Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/health/detailed` | Detailed system info |

#### Authentication (Challenge-Response)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/challenge` | Generate auth challenge + QR code data |
| POST | `/api/auth/verify` | Verify signed challenge, issue JWT |
| GET | `/api/auth/status/:challengeId` | Poll challenge status (for portal) |
| POST | `/api/auth/refresh` | Refresh expired JWT token |
| POST | `/api/auth/logout` | Revoke refresh tokens |
| GET | `/api/auth/session-status` | Get current session info |

#### Admin Operations (requires admin token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/employees` | List all employees |
| POST | `/api/admin/create` | Create new employee |
| PUT | `/api/admin/employee/:id` | Update employee |
| DELETE | `/api/admin/employee/:id` | Deactivate employee |
| POST | `/api/admin/issue-credential` | Issue employment credential |
| DELETE | `/api/admin/credential/:id` | Revoke credential |

#### DID Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/did/create` | Create new DID on blockchain |
| GET | `/api/did/:address` | Get DID for an address |
| GET | `/api/did/resolve/:did` | Resolve DID to W3C Document |

#### Blockchain
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sepolia-verify` | Verify + record on Sepolia |
| GET | `/api/auth/sepolia-history/:address` | Auth history on Sepolia |
| GET | `/api/blockchain/status` | Blockchain status |
| GET | `/api/blockchain/dids` | All registered DIDs |

#### Zero-Knowledge Proofs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/zkp-challenge` | Generate ZKP challenge |
| POST | `/api/auth/verify-zkp` | Verify ZK proof |
| POST | `/api/auth/role-challenge` | Create role-based ZKP challenge |

#### Identity & Enrollment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/identity/profile` | Register/update identity profile |
| GET | `/api/identity/profile/:did` | Get public profile |
| POST | `/api/identity/enrollment` | Request enrollment |
| POST | `/api/identity/enrollment/:id/approve` | Approve enrollment |

### Key Services

| Service | Purpose |
|---------|---------|
| **ChallengeStorage** | Stores auth challenges (Redis or in-memory, 10-min TTL) |
| **EmployeeDirectory** | In-memory employee store with disk persistence (`data/employees.json`) |
| **SepoliaService** | Interacts with SimpleDIDRegistry on Sepolia testnet |
| **EmployeeOnChainRegistry** | Tracks on-chain DID registrations |
| **VCJwtService** | Issues employment credentials as JWT tokens |
| **CredentialStatus** | Tracks credential lifecycle (active/revoked/expired) |
| **AuthTimeline** | Audit log of all authentication events |
| **ZKProofService** | Verifies Groth16 zero-knowledge proofs |
| **RefreshToken** | Manages JWT refresh tokens (7-day expiry) |
| **VerifierProfiles** | Defines per-organization claim requirements |

### Security Middleware

- **Rate Limiting**: 100 req/15min general, 10 req/15min auth, 5 req/5min challenges
- **JWT Verification**: HS256 tokens with 24h expiry
- **Admin Auth**: Static token (32+ chars) or JWT with admin claims
- **Input Validation**: Joi schemas for all endpoints
- **CORS + Helmet**: Standard security headers

---

## 7. Enterprise Portal (Web App)

**Tech**: React 19, TypeScript, Vite, Tailwind CSS
**Port**: 5173 (dev)

### Pages

#### a) Login Page (`/login`)
The main authentication entry point.

**How it works:**
1. Admin enters their employee ID (or leaves blank)
2. Portal requests a challenge from the backend
3. A QR code is displayed on screen
4. User scans the QR code with the wallet app
5. Wallet signs the challenge cryptographically
6. Portal polls for completion and receives a JWT token
7. User is logged in and redirected to the dashboard

**Features:**
- Real-time QR code generation
- Auto-polling for scan completion
- Employee ID lookup for context-aware challenges
- Token persistence across sessions
- Admin mode toggle for direct admin token login

#### b) Admin Dashboard (`/admin`)
Enterprise employee and credential management.

**Features:**
- **Employee Table**: View all employees with status, badge, department, DID, on-chain status
- **Create Employee**: Form with ID, name, department, email, wallet address, badge assignment
- **On-Chain Registration**: Register employee's DID on Sepolia blockchain (creates permanent on-chain record)
- **Credential Issuance**: Issue employment credentials as JWT tokens
- **Status Management**: Activate/deactivate employees
- **Blockchain Status**: Live connection indicator to Sepolia network

**Badge Types** (role hierarchy):
| Badge | Level | Permissions |
|-------|-------|-------------|
| Employee | 1 | Dashboard view, task view |
| Manager | 2 | + Team management, reporting |
| Auditor | 3 | + Audit access, blockchain viewer |
| Admin | 4 | + Full system access, employee management |

#### c) Benchmark Page (`/benchmark`)
Performance comparison of DID authentication vs traditional OAuth.

**Features:**
- Run single or batch authentication tests
- Compare DID vs OAuth response times
- Success rate statistics
- Visual charts (Recharts)

#### d) Blockchain Viewer (`/blockchain`)
Real-time blockchain activity monitor (requires auditor badge).

**Features:**
- Contract address and network info
- Gas station balance
- List of all registered DIDs with transaction hashes
- Recent transactions
- Auto-refresh every 30 seconds

#### e) Premium Content (`/premium`)
Protected content area demonstrating access control (requires admin badge).

#### f) ZK Access Page (`/zk-access`)
Anonymous access via Zero-Knowledge Proofs — no identity revealed.

**Features:**
- Three access tiers: Basic, Premium, Enterprise
- ZK-proof submission for NFT ownership verification
- Anonymous token issuance (no DID or identity revealed)
- Premium content access without authentication

#### g) Certificates Page (`/certificates`)
Digital certificate generation and verification.

**Features:**
- Certificate generation form
- Upload and verify certificates from multiple issuers (Udemy, Great Learning, Google Education)
- ZK Proof Section with 4 tabs: Ownership Proof, Attribute Proof, Selective Disclosure, Batch Verify

### Access Control Components

| Component | Purpose |
|-----------|---------|
| **ProtectedRoute** | Guards routes by authentication + badge level |
| **RoleGate** | Conditionally renders content based on user badge |
| **ZKRoleGate** | Advanced gate requiring fresh ZK-proof challenge scan |

---

## 8. Mobile Wallet App

**Tech**: React Native, Expo, TypeScript
**Platform**: iOS and Android via Expo Go

### Screens

#### a) Home Screen — Dashboard
The main wallet interface showing identity and credentials.

**Displays:**
- **Connection Status**: Green/red indicator with backend URL
- **Identity Card**: Wallet address and DID with copy-to-clipboard buttons
- **Stats Bar**: Credential count, employee count, network status
- **Quick Actions** (2×2 grid):
  - Scan QR Code — opens camera for authentication
  - Timeline — view authentication history
  - Identity Profile — manage public/private profile
  - Inbox — enrollment requests and data sharing
- **Credentials List**: All stored credentials with source badges and status
- **Company Directory**: Synced employee list from backend
- Pull-to-refresh for data sync

#### b) QR Scanner Screen
Camera-based QR code scanner for authentication.

**How it works:**
1. Opens device camera with scanning overlay
2. Scans QR code containing challenge data
3. Parses JSON payload (challengeId, challenge text, requested claims)
4. Navigates to Auth Confirmation screen

#### c) Auth Confirmation Screen
Challenge signing and verification result display.

**Flow:**
1. Receives challenge data from QR scan
2. Auto-signs the challenge with wallet's private key
3. If selective disclosure required: builds cryptographic proof of claimed attributes
4. Submits signature + proof to backend `/api/auth/verify`
5. Displays success screen with:
   - Session details (employee, badge, login time, expiry)
   - Access permissions as colored chips
   - Geolocation of login (via IP lookup)

#### d) Auth Timeline Screen
Complete authentication audit trail.

**Displays:**
- Summary stats: total events, successes, failures
- Vertical timeline with colored status dots
- Event details: type, timestamp, verifier organization
- Suspicious pattern detection (3+ failures flagged)

#### e) Identity Profile Screen
Decentralized identity profile management.

**Sections:**
- **Public Profile**: Display name, headline, location, skills, resume URL
- **Private Profile Pointer**: Encrypted URI, cipher hash, encryption scheme
- **Actions**: Load profile from backend, save profile (requires wallet signature)

#### f) Enrollment Requests Screen
Data sharing consent management.

**Features:**
- View pending enrollment/data-sharing requests from organizations
- Filter by status: all, pending, approved, rejected, expired
- Select which claims to share (checkboxes for each field)
- Approve or reject with wallet signature
- Export consent receipts as JSON
- Full consent history log

#### g) Settings Screen
App configuration.

**Features:**
- Backend URL configuration with quick-fill buttons
- Connection testing with latency display
- Auto-discover backend on local network
- Wallet export (address only, keys secured)
- Clear all data (destructive reset)
- App version and network info

### Wallet Security

| Feature | Implementation |
|---------|---------------|
| **Key Generation** | ethers.js random wallet (secp256k1 curve) |
| **Key Storage** | expo-secure-store (iOS Keychain / Android Keystore) |
| **Message Signing** | EIP-191 personal sign via ethers.Wallet.signMessage() |
| **Claim Proofs** | keccak256 hash-based selective disclosure with signed bindings |
| **No Passwords** | Purely cryptographic — no passwords or mnemonics exposed |

---

## 9. Zero-Knowledge Proof System

**Location**: `circuits/`
**Tech**: Circom, snarkjs, Groth16 protocol

### What It Does

Allows users to prove they own an NFT (or meet some criteria) **without revealing their identity**. This enables anonymous premium access.

### How It Works

1. **Circuit** (`nftOwnership.circom`): Defines the mathematical relationship to prove
2. **Trusted Setup**: One-time ceremony generating proving/verification keys
3. **Proof Generation**: User generates a proof in their wallet
4. **Verification**: Backend verifies the proof using snarkjs (fail-closed — rejects if verification key missing)

### Access Tiers

| Tier | Requirement | Content |
|------|-------------|---------|
| Basic | Any valid proof | Standard content |
| Premium | NFT ownership proof | Premium content |
| Enterprise | Role-based proof | Enterprise dashboards |

### Setup (if modifying circuits)

```bash
cd circuits
npm install
npm run setup    # Runs trusted setup ceremony
npm run test     # Verifies circuit
```

---

## 10. Shared Library

**Location**: `shared/src/`

### Types (`types.ts`)

Defines the data structures used across all components:

- **DIDDocument** — W3C-compliant DID Document format
- **VerifiableCredential** — W3C Verifiable Credential with proof
- **AuthRequest / AuthResponse** — Challenge-response protocol types
- **JWTPayload** — JWT claims structure
- **User / LoginSession** — Platform user and session types
- **QRCodeData** — QR code payload types (AUTH_REQUEST, VC_PRESENTATION, DID_EXCHANGE)
- **ApiResponse<T>** — Generic API response wrapper
- **NetworkConfig / PlatformConfig** — Configuration types

### Constants (`constants.ts`)

Platform-wide constants:

- **Networks**: Mainnet (1), Sepolia (11155111), Ganache (1337)
- **DID Methods**: ethr, ion, key, web
- **Credential Types**: VerifiableCredential, EmploymentCredential, RoleCredential, AccessCredential
- **API Endpoints**: All endpoint paths
- **Error Codes**: AUTH, DID, BLOCKCHAIN, VALIDATION error code enums
- **JWT Config**: HS256, 24h access, 7d refresh
- **QR Config**: 256px, 5min expiry, error correction level M
- **Role Hierarchy**: admin > auditor > manager > employee > guest

### Utilities (`utils.ts`)

Reusable utility classes:

- **DIDUtils**: Nonce/challenge generation, auth request creation, DID formatting/parsing
- **BlockchainUtils**: Address/tx hash validation, wei/ether conversion
- **ValidationUtils**: Email, URL, JWT format, JSON validation
- **FormatUtils**: Date formatting, string truncation, address shortening
- **SecurityUtils**: Cryptographic random string/hex generation

---

## 11. Complete Authentication Flow

This is the **core flow** of the entire system — how a user authenticates using their DID:

### Step 1: Challenge Generation (Portal)

```
User opens Portal → Enters Employee ID → Clicks "Authenticate"
    ↓
Portal sends POST /api/auth/challenge { employeeId: "EMP001" }
    ↓
Backend generates:
  - Random challenge string (hex)
  - Challenge ID (UUID)
  - QR code data (JSON with challenge, verifier, requested claims)
  - 10-minute expiration
    ↓
Portal displays QR code on screen
Portal starts polling GET /api/auth/status/{challengeId} every 2 seconds
```

### Step 2: QR Scan & Signing (Wallet)

```
User opens Wallet → Taps "Scan QR" → Scans the QR code on portal screen
    ↓
Wallet parses QR data:
  - Extracts challengeId, challenge text, requested claims
  - Resolves employee from local store
  - Fetches matching credential (JWT)
    ↓
Wallet performs SELECTIVE DISCLOSURE (if claims requested):
  - Extracts only the requested claims from credential
  - Computes keccak256 hashes: challengeDigest, claimDigest, bindingDigest
  - Signs the binding with wallet private key
    ↓
Wallet signs the challenge message:
  message = "Challenge: {challengeId}\nDID: {did}"
  signature = wallet.signMessage(message)  // EIP-191
    ↓
Wallet sends POST /api/auth/verify {
  challengeId, signature, address, message,
  did, employeeId,
  disclosedClaims: { employeeId, role, ... },
  disclosedClaimsProof: { bindingDigest, signedBinding, ... }
}
```

### Step 3: Verification (Backend)

```
Backend receives verify request
    ↓
1. Validates challenge exists and hasn't expired
2. Recovers signer address from signature using ethers.verifyMessage()
3. Confirms recovered address matches the claimed address
4. Looks up employee in directory
5. Validates badge and permissions
6. If disclosedClaims: verifies proof binding integrity
7. If credential provided: verifies JWT, checks issuer trust, checks status
    ↓
8. Records authentication on Sepolia blockchain:
   - registerEmployeeDID() (if first time)
   - recordAuthentication(challengeId, message, address)
   - verifyAuthentication(challengeId, signature)
    ↓
9. Issues JWT token:
   {
     address, did, badge, permissions,
     employeeId, employeeName,
     credentialVerified, blockchainResults,
     exp: 24 hours
   }
    ↓
10. Marks challenge as "completed" with token data
```

### Step 4: Login Complete (Portal)

```
Portal's polling detects status: "completed"
    ↓
Receives token, refreshToken, badge, permissions
    ↓
Saves to localStorage
    ↓
Redirects to dashboard with role-appropriate access
```

### Visual Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  PORTAL   │         │ BACKEND   │         │  WALLET   │         │ SEPOLIA   │
│  (Web)    │         │ (API)     │         │ (Mobile)  │         │ (Chain)   │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │  1. Request         │                    │                    │
     │  Challenge          │                    │                    │
     │────────────────────►│                    │                    │
     │                     │                    │                    │
     │  2. QR Code Data    │                    │                    │
     │◄────────────────────│                    │                    │
     │                     │                    │                    │
     │  3. Display QR      │                    │                    │
     │  + Start Polling    │                    │                    │
     │─────────loop───────►│                    │                    │
     │                     │                    │                    │
     │                     │  4. Scan QR        │                    │
     │                     │◄───────────────────│                    │
     │                     │                    │                    │
     │                     │  5. Sign + Verify  │                    │
     │                     │◄───────────────────│                    │
     │                     │                    │                    │
     │                     │  6. Record Auth    │                    │
     │                     │───────────────────────────────────────►│
     │                     │                    │                    │
     │                     │  7. Blockchain     │                    │
     │                     │    Confirmation    │                    │
     │                     │◄───────────────────────────────────────│
     │                     │                    │                    │
     │  8. Poll returns    │                    │                    │
     │  completed + token  │                    │                    │
     │◄────────────────────│                    │                    │
     │                     │                    │                    │
     │  9. Dashboard       │                    │                    │
     │  Access Granted     │                    │                    │
     ▼                     ▼                    ▼                    ▼
```

---

## 12. Feature Summary

### Core Features

| # | Feature | Description | Components |
|---|---------|-------------|------------|
| 1 | **DID-Based Authentication** | Passwordless login using cryptographic challenge-response with Ethereum wallets | Portal, Wallet, Backend |
| 2 | **QR Code Authentication** | Scan-to-login flow: portal displays QR, wallet scans and signs | Portal, Wallet |
| 3 | **On-Chain DID Registration** | Employee DIDs permanently recorded on Sepolia blockchain | Backend, Contracts |
| 4 | **On-Chain Auth Recording** | Every authentication event stored immutably on blockchain | Backend, Contracts |
| 5 | **Verifiable Credentials** | JWT-based employment credentials issued by platform | Backend, Wallet |
| 6 | **Selective Disclosure** | Users choose which claims to reveal (e.g., role but not email) with cryptographic proof | Wallet, Backend |
| 7 | **Role-Based Access Control** | 4-tier badge system (employee→manager→auditor→admin) with permission hierarchy | All |
| 8 | **Zero-Knowledge Proofs** | Prove NFT ownership without revealing identity for anonymous premium access | Circuits, Backend, Portal |
| 9 | **Employee Management** | Full CRUD for employees with on-chain registration and credential issuance | Portal Admin, Backend |
| 10 | **Identity Profile Management** | Decentralized public/private profile with encrypted private data pointers | Wallet, Backend |
| 11 | **Enrollment & Data Sharing Consent** | Organizations request data, users approve/reject with granular field selection | Wallet, Backend |
| 12 | **Consent Receipts** | Exportable JSON receipts for every data sharing decision | Wallet |
| 13 | **Authentication Timeline** | Full audit trail of all auth events with suspicious pattern detection | Wallet, Portal, Backend |
| 14 | **Blockchain Viewer** | Real-time dashboard of on-chain DIDs, transactions, and contract stats | Portal, Backend |
| 15 | **Performance Benchmarking** | Compare DID auth vs OAuth performance with charts | Portal, Backend |
| 16 | **Certificate Verification** | Upload and verify digital certificates with ZK proofs | Portal |
| 17 | **Token Refresh** | Automatic JWT refresh with 7-day refresh token lifecycle | Portal, Backend |
| 18 | **Network Auto-Discovery** | Wallet automatically finds the backend on local network | Wallet |
| 19 | **Gas Station Pattern** | Platform pays blockchain gas fees so users don't need ETH | Backend, Contracts |
| 20 | **Credential Revocation** | Credentials can be revoked, preventing further use | Backend |

### Security Features

| Feature | How It Works |
|---------|--------------|
| **Cryptographic Auth** | ECDSA signatures (secp256k1) — same curve as Ethereum |
| **Challenge Expiration** | Challenges expire after 10 minutes, preventing replay attacks |
| **Signature Verification** | Backend recovers signer address from signature, matches against claimed identity |
| **Secure Key Storage** | Mobile: iOS Keychain / Android Keystore via expo-secure-store |
| **Rate Limiting** | IP-based throttling: 5 challenges/5min, 10 auth attempts/15min |
| **Blockchain Immutability** | Auth records on Sepolia cannot be altered or deleted |
| **Fail-Closed ZK Verification** | If verification key is missing, all ZK proofs are rejected (not bypassed) |
| **Selective Disclosure Proofs** | Hash-based binding prevents claim tampering — signed with wallet key |
| **Admin Token Security** | Minimum 32 characters, supports multiple tokens, can disable static tokens |
| **Credential Status Tracking** | Active/revoked/expired status prevents use of invalid credentials |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Solidity 0.8.20, OpenZeppelin, Hardhat |
| **Blockchain** | Ethereum Sepolia Testnet |
| **Backend** | Node.js, Express, TypeScript, ethers.js |
| **Portal** | React 19, Vite, Tailwind CSS, TypeScript |
| **Wallet** | React Native, Expo 54, ethers.js, TypeScript |
| **ZK Proofs** | Circom, snarkjs, Groth16 protocol |
| **Auth Tokens** | JWT (HS256, 24h access, 7d refresh) |
| **Key Storage** | expo-secure-store (Keychain/Keystore) |
| **Data Storage** | In-memory + JSON file persistence (backend) |
| **Deployment** | Railway (cloud), Docker support |

---

## Quick Reference

### Common Commands

```bash
# Start everything
npm run dev

# Backend only
cd backend && npm run dev

# Portal only
cd portal && npm run dev

# Wallet only
cd wallet && npx expo start

# Deploy contracts
cd contracts && npx hardhat run scripts/deploy-sepolia.js --network sepolia

# Run tests
npm test

# Check blockchain status
npm run blockchain:status
```

### Key Files

| File | Purpose |
|------|---------|
| `backend/src/app.ts` | Backend entry point |
| `backend/src/routes/auth.routes.ts` | Authentication endpoints |
| `backend/src/routes/admin.routes.ts` | Admin CRUD endpoints |
| `backend/src/services/SepoliaService.ts` | Blockchain interaction |
| `portal/src/EnterprisePortalProfessional.tsx` | Login page |
| `portal/src/pages/AdminPage.tsx` | Admin dashboard |
| `wallet/src/services/wallet.ts` | Core wallet logic |
| `wallet/src/context/WalletContext.tsx` | Wallet state management |
| `wallet/src/screens/HomeScreen.tsx` | Wallet dashboard |
| `contracts/contracts/SimpleDIDRegistry.sol` | Deployed smart contract |
| `shared/src/types.ts` | Shared TypeScript types |
