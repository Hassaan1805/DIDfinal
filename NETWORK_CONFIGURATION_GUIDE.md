# 🚀 DIDfinal Project - IP/URL Configuration Guide

## 📍 **Current Configuration (Your System)**

```
Backend API:          http://192.168.1.100:3001
Certificate Backend:  http://127.0.0.1:5000
Portal Frontend:      http://localhost:5173
Wallet Server:        http://localhost:3002
Blockchain (Local):   http://127.0.0.1:8545
```

---

## 🔧 **How to Change for Different System**

### **Step 1: Find Your New System's IP Address**

**Windows:**
```cmd
ipconfig
```
Look for: `IPv4 Address` (e.g., 192.168.1.50)

**Linux/Mac:**
```bash
ifconfig
# or
ip addr show
```

**Note:** Make sure both devices (mobile + computer) are on the **same Wi-Fi network**!

---

### **Step 2: Update Configuration Files**

#### **Backend (Node.js)**

**File:** `backend/.env.development`

```bash
# Change this line:
LOCAL_IP=192.168.1.100  # ← Change to your new IP

# Example for different system:
LOCAL_IP=192.168.0.25
```

**Files to create/update:**
```bash
cd backend
cp .env.example .env.development
nano .env.development  # Edit with your values
```

---

#### **Portal (React Frontend)**

**File:** `portal/.env`

```bash
# Change this line:
VITE_API_BASE_URL=http://192.168.1.100:3001/api

# Example for different system:
VITE_API_BASE_URL=http://192.168.0.25:3001/api
```

**Create the file:**
```bash
cd portal
cp .env.example .env
nano .env  # Edit with your values
```

---

#### **Certificate Backend (Flask Python)**

**File:** `certificate_backend/.env`

```bash
# Database settings
DB_USER=root
DB_PASSWORD=your_mysql_password  # ← Change if different
DB_HOST=localhost
DB_NAME=certificate_auth

# Server settings
PORT=5000
DEBUG=True
HOST=0.0.0.0  # Allows external connections

# CORS - Add your new IP
ALLOWED_ORIGINS=http://localhost:5173,http://192.168.0.25:3001
```

**Create the file:**
```bash
cd certificate_backend
cp .env.example .env
nano .env  # Edit with your values
```

---

### **Step 3: Update Hardcoded IPs in Code**

Some files have hardcoded IPs that need manual changes:

#### **A. Backend Source Code**

**File:** `backend/src/app.ts` (Line 163-164)

```typescript
// BEFORE:
console.log(`🌐 Network access: http://192.168.1.100:${PORT}/api/health`);
console.log(`📱 Mobile access: Use 192.168.1.100:${PORT} in your mobile app`);

// AFTER (use environment variable):
console.log(`🌐 Network access: http://${process.env.LOCAL_IP || 'localhost'}:${PORT}/api/health`);
console.log(`📱 Mobile access: Use ${process.env.LOCAL_IP || 'localhost'}:${PORT} in your mobile app`);
```

#### **B. QR Code API Endpoint**

**File:** `backend/src/routes/auth.ts` (Line 205)

```typescript
// BEFORE:
apiEndpoint: 'http://192.168.1.100:3001/api/auth/sepolia-verify',

// AFTER (use environment variable):
apiEndpoint: `http://${process.env.LOCAL_IP || 'localhost'}:3001/api/auth/sepolia-verify`,
```

#### **C. Portal Frontend Config**

**File:** `portal/src/EnterprisePortalProfessional.tsx` (Line 8)

```typescript
// BEFORE:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.100:3001/api';

// AFTER (reads from .env):
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

**File:** `portal/src/utils/api.ts` (Line 11)

```typescript
// BEFORE:
baseURL: import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.100:3001/api',

// AFTER:
baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
```

#### **D. Vite Proxy Config**

**File:** `portal/vite.config.ts` (Line 16)

```typescript
// BEFORE:
target: 'http://192.168.1.100:3001',

// AFTER (use environment variable):
target: process.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001',
```

---

### **Step 4: Mobile App Configuration**

**File:** `mobile_wallet/lib/config.dart` (or wherever API URL is defined)

```dart
// Change this:
const String API_BASE_URL = 'http://192.168.1.100:3001/api';

// To your new IP:
const String API_BASE_URL = 'http://192.168.0.25:3001/api';
```

---

### **Step 5: Rebuild & Restart**

After changing IPs, you need to rebuild:

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

# Mobile App (if you changed Dart code)
cd mobile_wallet
flutter clean
flutter pub get
flutter run
```

---

## 📋 **Quick Reference: All Files to Check**

### **Must Change:**
| File | What to Change | Default Value |
|------|---------------|---------------|
| `backend/.env.development` | LOCAL_IP | 192.168.1.100 |
| `portal/.env` | VITE_API_BASE_URL | http://192.168.1.100:3001/api |
| `certificate_backend/.env` | ALLOWED_ORIGINS | Add your new IP |

### **Should Change (Hardcoded):**
| File | Line | What to Change |
|------|------|----------------|
| `backend/src/app.ts` | 163-164 | Network log IPs |
| `backend/src/routes/auth.ts` | 205 | QR code apiEndpoint |
| `portal/src/EnterprisePortalProfessional.tsx` | 8, 77 | API URLs |
| `portal/src/utils/api.ts` | 11 | baseURL |
| `portal/src/pages/LoginPage.tsx` | 47 | API_BASE_URL |
| `portal/src/pages/CertificatesPage.tsx` | 17 | FLASK_API_URL |
| `portal/vite.config.ts` | 16 | proxy target |
| `mobile_wallet/lib/config.dart` | * | API_BASE_URL |

---

## 🎯 **Example: Moving from One System to Another**

### **Scenario:** Moving from IP `192.168.1.100` to `192.168.0.50`

1. **Update Environment Files:**
   ```bash
   # backend/.env.development
   LOCAL_IP=192.168.0.50
   
   # portal/.env
   VITE_API_BASE_URL=http://192.168.0.50:3001/api
   
   # certificate_backend/.env
   ALLOWED_ORIGINS=http://localhost:5173,http://192.168.0.50:3001
   ```

2. **Update Code Files:**
   - Search for `192.168.1.100` in entire project
   - Replace with `192.168.0.50`
   - OR use environment variables (better!)

3. **Rebuild & Test:**
   ```bash
   cd backend && npm run build && npm start
   cd portal && npm run dev
   cd certificate_backend && python auth.py
   ```

4. **Test Mobile Connection:**
   - Open mobile wallet
   - Scan QR code
   - Should connect to new IP!

---

## 🔍 **Troubleshooting**

### **Mobile can't connect to backend:**
- ✅ Check both devices on same Wi-Fi
- ✅ Check firewall allows port 3001
- ✅ Verify IP with `ipconfig` / `ifconfig`
- ✅ Test: `curl http://YOUR_IP:3001/api/health`

### **CORS errors:**
- ✅ Add your IP to `ALLOWED_ORIGINS` in certificate_backend/.env
- ✅ Add your IP to backend CORS config

### **Frontend can't reach backend:**
- ✅ Check `VITE_API_BASE_URL` in portal/.env
- ✅ Restart `npm run dev` after changing .env
- ✅ Clear browser cache

---

## ✅ **Automated Script (Coming Soon)**

I can create a script that automatically updates all IPs:

```bash
./setup-network.sh 192.168.0.50  # Updates all files
```

Would you like me to create this script?

---

## 📝 **Summary**

**Minimum Changes Required:**
1. Create `.env` files from `.env.example` templates
2. Update IP in backend/.env.development
3. Update IP in portal/.env
4. Rebuild backend: `npm run build`
5. Restart all servers

**For Complete Migration:**
- Follow all steps in "Step 3" above
- Update mobile app config
- Test each component individually
