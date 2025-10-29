# 🚀 Quick Start: Change IP for New System

## Method 1: Automated Script (Easiest!)

### Windows (PowerShell):
```powershell
# Find your IP
ipconfig

# Run script (replace with your IP)
.\setup-network.ps1 192.168.0.50
```

### Linux/Mac (Bash):
```bash
# Find your IP
ifconfig

# Make script executable
chmod +x setup-network.sh

# Run script (replace with your IP)
./setup-network.sh 192.168.0.50
```

---

## Method 2: Manual Configuration (3 files only)

### 1. Backend Config
**File:** `backend/.env.development`
```bash
LOCAL_IP=YOUR_NEW_IP_HERE  # ← Change this!
PORT=3001
NODE_ENV=development
DEMO_MODE=true
```

### 2. Portal Config
**File:** `portal/.env`
```bash
VITE_API_BASE_URL=http://YOUR_NEW_IP_HERE:3001/api  # ← Change this!
```

### 3. Certificate Backend Config
**File:** `certificate_backend/.env`
```bash
ALLOWED_ORIGINS=http://localhost:5173,http://YOUR_NEW_IP_HERE:3001  # ← Add your IP!
```

---

## After Changing IPs:

### Rebuild & Restart:
```bash
# Backend
cd backend
npm run build
npm start

# Portal
cd portal  
npm run dev

# Certificate Backend
cd certificate_backend
python auth.py
```

### Test:
```bash
# Test backend
curl http://YOUR_NEW_IP:3001/api/health

# Test certificate backend
curl http://127.0.0.1:5000/health
```

---

## Mobile App Update:

**File:** `mobile_wallet/lib/config.dart`
```dart
const String API_BASE_URL = 'http://YOUR_NEW_IP_HERE:3001/api';
```

Then rebuild:
```bash
cd mobile_wallet
flutter clean
flutter pub get
flutter run
```

---

## Troubleshooting:

**Mobile can't connect:**
- ✅ Both devices on same Wi-Fi?
- ✅ Firewall allowing port 3001?
- ✅ IP address correct?

**CORS errors:**
- ✅ Added IP to `ALLOWED_ORIGINS` in certificate_backend/.env?
- ✅ Restarted all servers?

---

## Complete Guide:
See `NETWORK_CONFIGURATION_GUIDE.md` for detailed instructions.
