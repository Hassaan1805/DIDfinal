# DID Auth Platform — New Device Setup Guide

Complete setup guide for running the Decentralized Identity Authentication Platform on a new machine (demo/exhibition use).

---

## 1. Prerequisites — Install These First

### Node.js (Required: v20+ for portal, v18+ minimum)

Download the **LTS version (v20.x)** from: https://nodejs.org/en/download

Verify after install:
```bash
node -v   # should be v20.x.x or higher
npm -v    # should be v10.x.x or higher
```

> Portal requires Node 20+. If you manage multiple Node versions, use [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) (Windows) or [nvm](https://github.com/nvm-sh/nvm) (Mac/Linux).

---

### Git

Download from: https://git-scm.com/downloads

Verify:
```bash
git --version
```

---

### Circom (Zero-Knowledge Circuit Compiler)

Pre-compiled ZKP artifacts (`build/`, `*.zkey`, `*.ptau`) are already checked in, so **circom is only needed if you want to recompile circuits from scratch.** Skip this unless you're modifying circuits.

**Windows:**
```bash
# Option 1: Chocolatey
choco install circom

# Option 2: Download binary directly
# https://github.com/iden3/circom/releases
# Download circom-windows.exe, rename to circom.exe, add to PATH
```

**Mac:**
```bash
brew install circom
# OR via Cargo (requires Rust — https://rustup.rs):
cargo install --git https://github.com/iden3/circom
```

**Linux:**
```bash
cargo install --git https://github.com/iden3/circom
```

Verify:
```bash
circom --version   # should be 2.x.x
```

---

### Expo Go (Mobile Wallet)

Install **Expo Go** on your phone:
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent
- iOS: https://apps.apple.com/app/expo-go/id982107779

Your phone and dev machine must be on the **same WiFi network**.

---

### (Optional) Ganache — Local Blockchain

Only needed if you want a fully offline blockchain instead of Sepolia testnet.

```bash
npm install -g ganache
```

---

## 2. Clone the Repository

```bash
git clone <your-repo-url>
cd DIDfinal
```

---

## 3. Environment Files Setup

> **The only value you need to change on a new machine is your local IP address.**  
> Everything else (keys, secrets, contract addresses) is already filled in below.

Find your local IP:

- **Windows:** run `ipconfig` → look for **IPv4 Address** under your active WiFi/Ethernet adapter
- **Mac/Linux:** run `ifconfig` or `ip a`

---

### Backend — `backend/.env.development`

Create the file `backend/.env.development` with this exact content, replacing only the IP:

```env
PORT=3001
NODE_ENV=development
HOST=0.0.0.0
DEMO_MODE=false

CORS_ORIGIN=*
CORS_CREDENTIALS=true

JWT_SECRET=dev_jwt_secret_change_in_production_min_64_chars_required_abc123
JWT_EXPIRES_IN=24h

ADMIN_TOKEN=did-platform-dev-admin-token-2025
ADMIN_ALLOW_STATIC_TOKENS=true

ETHEREUM_RPC_URL=http://localhost:8545
ETHEREUM_NETWORK=ganache

SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/281d23f416be4c9aaacb2bb6c4f43688

PLATFORM_PRIVATE_KEY=29c6c4d25e2d938143e36743d20cbfc289eca2b311da3eea99f0c4041140f681
PLATFORM_ADDRESS=0xBdA3AC10e1403cFC54Ab2195Aad7Da8a39B775B9

SEPOLIA_CONTRACT_ADDRESS=0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48

DEBUG=true
ENABLE_BLOCKCHAIN_AUTH=true
DATABASE_URL=sqlite:./dev.db
LOG_LEVEL=debug
LOG_FORMAT=dev

RATE_LIMIT_ENABLED=false
RATE_LIMIT_MAX=1000

API_PREFIX=/api
API_VERSION=v1
HOT_RELOAD=true
DEBUG_MODE=true
MOCK_BLOCKCHAIN=false

ALLOWED_NETWORKS=192.168.1.0/24,10.0.0.0/8,172.16.0.0/12

# ⬇️ CHANGE THESE to your machine's local IP
PRIMARY_HOST_IP=192.168.0.106
LOCAL_IP=192.168.0.106
PUBLIC_API_BASE_URL=http://192.168.0.106:3001
```

---

### Portal — `portal/.env.development`

Create the file `portal/.env.development` with this exact content, replacing only the IP:

```env
VITE_API_URL=/api
VITE_API_BASE_URL=/api

VITE_DEV_MODE=true
VITE_DEBUG_API=true
VITE_HOT_RELOAD=true

VITE_ETHEREUM_RPC_URL=http://localhost:8545
VITE_ETHEREUM_NETWORK=ganache
VITE_CHAIN_ID=1337

VITE_QR_SIZE=256
VITE_QR_ERROR_CORRECTION=M
VITE_QR_MARGIN=4

VITE_THEME=light
VITE_LANGUAGE=en

VITE_API_TIMEOUT=10000
VITE_RETRY_ATTEMPTS=3
VITE_RETRY_DELAY=1000

VITE_SECURE_COOKIES=false
VITE_HTTPS_ONLY=false

VITE_PORTAL_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:3001

# ⬇️ CHANGE THIS to your machine's local IP
VITE_PUBLIC_API_BASE_URL=http://192.168.0.106:3001/api
```

---

### Wallet — `wallet/.env`

Create the file `wallet/.env` with this exact content, replacing only the IP:

```env
# ⬇️ CHANGE THIS to your machine's local IP
EXPO_PUBLIC_API_URL=http://192.168.0.106:3001

EXPO_PUBLIC_API_URL_FALLBACK_1=http://localhost:3001
EXPO_PUBLIC_API_URL_FALLBACK_2=https://did-platform-backend.railway.app
EXPO_PUBLIC_NETWORK_TIMEOUT=10000
EXPO_PUBLIC_AUTO_DISCOVER=true
EXPO_PUBLIC_CHAIN_ID=11155111
EXPO_PUBLIC_NETWORK=sepolia
```

> The wallet uses your LAN IP (not `localhost`) so your phone can reach the backend over WiFi.

---

## 4. Install Dependencies

From the project root (installs all workspaces at once):

```bash
npm install
```

Install wallet separately (not part of the npm workspace):

```bash
cd wallet
npm install
cd ..
```

---

## 5. Running the Project

### Option A — Backend + Portal only (recommended for demo)

```bash
npm run start
```

- Backend: <http://localhost:3001>
- Portal: <http://localhost:5173>

---

### Option B — Full stack including wallet (mobile QR flow)

```bash
# Terminal 1 — backend + portal
npm run start

# Terminal 2 — wallet
cd wallet
npx expo start
```

Scan the QR code in Terminal 2 with the Expo Go app on your phone.

---

### Option C — Dev mode (hot reload)

```bash
npm run start:dev
```

---

## 6. Verify Everything Works

```bash
# Backend health check
curl http://localhost:3001/api/health
```

Expected: `{"status":"ok",...}`

Open <http://localhost:5173> in a browser — the portal should load.

---

## 7. (Optional) Run Tests

```bash
npm run test

# Backend only
cd backend && npm test
```

---

## 8. (Optional) Recompile ZK Circuits

Only if you modify `circuits/nftOwnership.circom`. Pre-compiled artifacts are already checked in — skip for demo.

```bash
cd circuits
npm run compile    # compile .circom → .r1cs + .wasm
npm run setup      # powers of tau ceremony (~2-3 min)
npm run ceremony   # groth16 setup + export verification key
```

---

## 9. (Optional) Fully Offline with Ganache

To run without internet (no Sepolia):

```bash
# Terminal 1
npm run start:ganache

# Terminal 2
npm run blockchain:deploy
```

Then update `PRIMARY_HOST_IP`, `LOCAL_IP`, `PUBLIC_API_BASE_URL` in `backend/.env.development` to point to `http://127.0.0.1:7545` and replace `SEPOLIA_CONTRACT_ADDRESS` with the address printed after deployment.

---

## Quick Reference — Ports

| Service | URL                         |
|---------|-----------------------------|
| Backend | <http://localhost:3001>     |
| Portal  | <http://localhost:5173>     |
| Ganache | <http://localhost:7545>     |

## Quick Reference — Key Scripts

| Command                  | What it does                       |
|--------------------------|------------------------------------|
| `npm install`            | Install all workspace dependencies |
| `npm run start`          | Start backend + portal             |
| `npm run start:dev`      | Start with hot reload              |
| `npm run dev`            | Start backend + portal + wallet    |
| `npm run test`           | Run all tests                      |
| `npm run build`          | Build all modules                  |
| `npm run start:ganache`  | Start local Ganache blockchain     |
| `npm run clean`          | Remove all build artifacts         |

---

## Troubleshooting

**`npm install` fails with peer dependency errors:**
```bash
npm install --legacy-peer-deps
```

**Portal fails to start — Node version error:**
```bash
node -v   # must be v20+
nvm install 20 && nvm use 20
```

**Wallet can't connect to backend (network error on phone):**
- Confirm `EXPO_PUBLIC_API_URL` in `wallet/.env` is your machine's LAN IP, not `localhost`
- Phone and machine must be on the same WiFi network
- Check Windows Firewall — allow port 3001 inbound

**Backend crashes on start:**
- Confirm `backend/.env.development` exists (not just `.env.example`)
- Check `NODE_ENV` is `development` (default if unset)

**Sepolia RPC rate limit errors:**
- The Infura key `281d23f416be4c9aaacb2bb6c4f43688` is the demo key — if it hits limits, create a free key at https://infura.io
