# 🗺️ DIDfinal Project - Complete IP/URL Map

## 📊 Current System Configuration

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Current System                       │
│                    IP: 192.168.1.33                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Mobile Wallet   │────▶│  Backend API     │────▶│  Sepolia Chain   │
│  Port: Any       │     │  Port: 3001      │     │  Testnet         │
│  Flutter App     │     │  Node.js/Express │     │  Blockchain      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                         │
        │                         │
        │                         ▼
        │                ┌──────────────────┐
        │                │  Certificate     │
        │                │  Backend         │
        │                │  Port: 5000      │
        │                │  Flask/Python    │
        │                └──────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌──────────────────┐     ┌──────────────────┐
│  Portal          │     │  MySQL Database  │
│  Frontend        │     │  Port: 3306      │
│  Port: 5173      │     │  certificate_auth│
│  React/Vite      │     └──────────────────┘
└──────────────────┘
```

---

## 📁 Files with IP/URL Configuration

### Priority Level: 🔥 MUST CHANGE

| File | Line | Current Value | Change To |
|------|------|---------------|-----------|
| `backend/.env.development` | 1 | `LOCAL_IP=192.168.1.33` | Your new IP |
| `portal/.env` | 1 | `VITE_API_BASE_URL=http://192.168.1.33:3001/api` | Your new IP |
| `certificate_backend/.env` | 9 | `ALLOWED_ORIGINS=...` | Add your IP |
| `mobile_wallet/lib/config.dart` | * | `API_BASE_URL = 'http://192.168.1.33:3001/api'` | Your new IP |

---

### Priority Level: ⚠️ SHOULD CHANGE (Hardcoded)

| File | Line | Current Value | Purpose |
|------|------|---------------|---------|
| `backend/src/app.ts` | 163 | `http://192.168.1.33:${PORT}` | Console log |
| `backend/src/app.ts` | 164 | `192.168.1.33:${PORT}` | Mobile instructions |
| `backend/src/routes/auth.ts` | 205 | `http://192.168.1.33:3001/api/auth/sepolia-verify` | QR code endpoint |
| `portal/src/EnterprisePortalProfessional.tsx` | 8 | `http://192.168.1.33:3001/api` | API base URL fallback |
| `portal/src/EnterprisePortalProfessional.tsx` | 77 | `http://127.0.0.1:5000` | Flask API URL |
| `portal/src/utils/api.ts` | 11 | `http://192.168.1.33:3001/api` | Axios base URL |
| `portal/src/pages/LoginPage.tsx` | 47 | `http://192.168.1.33:3001/api` | Login API URL |
| `portal/src/pages/CertificatesPage.tsx` | 17 | `http://127.0.0.1:5000` | Certificate API |
| `portal/vite.config.ts` | 16 | `http://192.168.1.33:3001` | Dev proxy target |

---

### Priority Level: ℹ️ OPTIONAL (Local Services)

| Service | Address | Description |
|---------|---------|-------------|
| Blockchain (Ganache) | `http://127.0.0.1:8545` | Local test blockchain |
| Blockchain (Hardhat) | `http://127.0.0.1:7545` | Alternative local chain |
| Wallet Server | `http://localhost:3002` | Static file server |

---

## 🔄 Connection Flow

### Authentication Flow:
```
1. Mobile Wallet scans QR code
   ↓
2. QR contains: http://192.168.1.33:3001/api/auth/sepolia-verify
   ↓
3. Wallet signs message & sends to backend
   ↓
4. Backend verifies signature
   ↓
5. Backend stores proof on Sepolia blockchain (async)
   ↓
6. Portal polls: GET /api/auth/status/:challengeId
   ↓
7. Success! Portal shows authenticated user
```

### Certificate Generation Flow:
```
1. Portal submits form
   ↓
2. POST http://127.0.0.1:5000/generate
   ↓
3. Flask generates PDF certificate
   ↓
4. Stores in MySQL database
   ↓
5. Returns certificate hash & file path
   ↓
6. Portal displays success message
```

### ZK Proof Flow:
```
1. User requests proof
   ↓
2. POST http://127.0.0.1:5000/zk/generate_ownership_proof
   ↓
3. Flask generates cryptographic proof
   ↓
4. Stores proof in zk_proofs/ directory
   ↓
5. Returns proof ID
   ↓
6. User can verify: POST /zk/verify_ownership_proof
```

---

## 🌐 Network Requirements

### For Mobile Wallet to Work:
- ✅ Mobile and computer on **same Wi-Fi network**
- ✅ Computer's IP address is accessible (e.g., 192.168.x.x)
- ✅ Port 3001 is **open** (not blocked by firewall)
- ✅ Backend running on `0.0.0.0` (not just `localhost`)

### Firewall Rules Needed:
```powershell
# Windows
netsh advfirewall firewall add rule name="DIDfinal Backend" dir=in action=allow protocol=TCP localport=3001

# Linux
sudo ufw allow 3001/tcp
```

---

## 📝 Quick Change Checklist

When moving to a new system:

### Before Starting:
- [ ] Find new system's IP address (`ipconfig` or `ifconfig`)
- [ ] Ensure mobile & computer on same network
- [ ] Install all dependencies (Node.js, Python, MySQL)

### Configuration:
- [ ] Update `backend/.env.development` → LOCAL_IP
- [ ] Update `portal/.env` → VITE_API_BASE_URL  
- [ ] Update `certificate_backend/.env` → ALLOWED_ORIGINS
- [ ] Update `mobile_wallet/lib/config.dart` → API_BASE_URL

### Build & Deploy:
- [ ] Rebuild backend: `cd backend && npm run build`
- [ ] Start backend: `npm start`
- [ ] Start portal: `cd portal && npm run dev`
- [ ] Start certificate backend: `cd certificate_backend && python auth.py`
- [ ] Rebuild mobile app: `cd mobile_wallet && flutter run`

### Testing:
- [ ] Test backend health: `curl http://YOUR_IP:3001/api/health`
- [ ] Test certificate backend: `curl http://127.0.0.1:5000/health`
- [ ] Test mobile wallet: Scan QR code
- [ ] Test portal: Login and generate certificate

---

## 🚀 Automated Setup

Use the provided scripts:

### Windows:
```powershell
.\setup-network.ps1 192.168.0.50
```

### Linux/Mac:
```bash
./setup-network.sh 192.168.0.50
```

This will:
- ✅ Create all .env files
- ✅ Update hardcoded IPs
- ✅ Generate configuration files
- ✅ Show next steps

---

## 📚 Related Documentation

- `NETWORK_CONFIGURATION_GUIDE.md` - Detailed configuration guide
- `QUICK_START_NETWORK.md` - Quick start instructions
- `.env.example` files - Configuration templates
- `setup-network.sh` - Linux/Mac automation script
- `setup-network.ps1` - Windows automation script

---

## 🆘 Support

If you encounter issues:
1. Check all IPs match your system
2. Verify firewall settings
3. Confirm same Wi-Fi network
4. Test each service individually
5. Check logs for errors

For help, see troubleshooting section in `NETWORK_CONFIGURATION_GUIDE.md`
