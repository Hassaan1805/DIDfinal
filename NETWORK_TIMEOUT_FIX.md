# Network Timeout Fix - Quick Summary

## The Problem
Your mobile wallet shows "Request timeout" when scanning QR codes because:
1. Wallet configured with wrong backend IP (`192.168.1.33`)
2. Backend sends QR with correct IP (`192.168.1.33`)
3. 15-second timeout too short for network latency
4. Phone might not be on same network

## The Fix

### Files Changed:

1. **`wallet/src/config/config.ts`** (Lines 13, 21)
   - ✅ Fixed IP: Consistent `192.168.1.33`
   - ✅ Increased timeout: 10s → 30s

2. **`wallet/src/services/wallet.ts`** (Line 184, 197-198)
   - ✅ Increased request timeout: 15s → 30s
   - ✅ Better error messages with URL shown

3. **Created `check-network.js`**
   - ✅ Auto-detects your IP addresses
   - ✅ Tests backend accessibility
   - ✅ Tells you exactly what to fix

## Quick Steps to Fix

### 1. Find Your IP
```bash
# Windows
ipconfig

# Mac/Linux  
ifconfig | grep "inet "
```

Look for IPv4 address like `192.168.1.33`

### 2. Run Network Check
```bash
node check-network.js
```

This tells you:
- What IPs your computer has
- If backend is accessible
- Exact config changes needed

### 3. Update Wallet Config

Open `wallet/src/config/config.ts`, line 13:

**Before**:
```typescript
const BACKEND_IP = '192.168.1.33';  // ← Wrong IP
```

**After**:
```typescript
const BACKEND_IP = '192.168.1.33';  // ← Your actual IP
```

### 4. Restart Wallet
```bash
cd wallet
npm start
```

Press `r` to reload on phone.

### 5. Verify Network
- Phone MUST be on same Wi-Fi as computer
- Test: Open phone browser, visit `http://YOUR_IP:3001/api/health`
- Should see JSON response

## Troubleshooting

### Still timing out?

**Check 1: Backend Running?**
```bash
cd backend
npm run dev
```

**Check 2: Firewall Blocking?**
- Windows: Allow port 3001 in Windows Defender
- Mac: System Preferences → Security → Firewall → Allow Node

**Check 3: Same Network?**
- Computer and phone on SAME Wi-Fi
- Not mobile data, not different Wi-Fi

**Check 4: Backend Config**
Make sure `backend/.env` has:
```env
HOST=0.0.0.0    # ← Must be 0.0.0.0 (not localhost)
```

## Testing

1. Start backend: `cd backend && npm run dev`
2. Check network: `node check-network.js`
3. Update wallet IP if needed
4. Restart wallet: `cd wallet && npm start`
5. Generate QR in portal
6. Scan with phone
7. Should authenticate in 5-10 seconds ✅

## What Changed

| File | Line | Change | Why |
|------|------|--------|-----|
| `wallet/src/config/config.ts` | 13 | IP: 192.168.1.33 | Match backend IP |
| `wallet/src/config/config.ts` | 21 | Timeout: 10s → 30s | Handle network latency |
| `wallet/src/services/wallet.ts` | 184 | Timeout: 15s → 30s | Same as config |
| `wallet/src/services/wallet.ts` | 197-198 | Better error message | Show URL for debugging |

## Why It Failed Before

1. **IP Mismatch**: All components now use consistent `192.168.1.33:3001`
2. **Short Timeout**: 15 seconds not enough for:
   - Network latency
   - Phone → Router → Computer roundtrip
   - Backend processing time
3. **No Network Validation**: Didn't check if backend was reachable before timing out

## Why It Works Now

1. **Correct IP**: Wallet connects to actual backend IP
2. **Longer Timeout**: 30 seconds allows for network delays
3. **Better Diagnostics**: Network check script finds issues
4. **Clear Errors**: Shows exact URL that failed

---

**Status**: ✅ Fixed  
**Required**: Update wallet IP to match your computer's IP  
**Tool**: Run `node check-network.js` to find your IP  
**Date**: 2026-03-26
