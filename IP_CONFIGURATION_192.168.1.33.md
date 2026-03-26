# IP Configuration Update - 192.168.1.33

## Changes Made

All files now configured to use `192.168.1.33` as the backend IP address.

### Files Updated:

1. **`wallet/src/config/config.ts`** (Line 13)
   ```typescript
   const BACKEND_IP = '192.168.1.33';  // ✅ Set to your IP
   ```

2. **`backend/.env`** (Line 43)
   ```env
   PRIMARY_HOST_IP=192.168.1.33  # ✅ Matches wallet config
   ```

3. **`backend/src/routes/auth.ts`** (Line 204)
   ```typescript
   apiEndpoint: 'http://192.168.1.33:3001/api/auth/verify',  // ✅ QR code endpoint
   ```

4. **`backend/src/app.ts`** (Lines 163-164)
   ```typescript
   console.log(`🌐 Network access: http://192.168.1.33:${PORT}/api/health`);
   console.log(`📱 Mobile access: Use 192.168.1.33:${PORT} in your mobile app`);
   ```

## Configuration Summary

| Component | IP Address | Port | URL |
|-----------|-----------|------|-----|
| Backend Server | 192.168.1.33 | 3001 | http://192.168.1.33:3001 |
| Wallet Config | 192.168.1.33 | 3001 | http://192.168.1.33:3001 |
| QR Code Endpoint | 192.168.1.33 | 3001 | http://192.168.1.33:3001/api/auth/verify |

## Next Steps

### 1. Restart Backend
```bash
cd backend
npm run dev
```

**Expected output:**
```
🌐 Network access: http://192.168.1.33:3001/api/health
📱 Mobile access: Use 192.168.1.33:3001 in your mobile app
```

### 2. Restart Wallet
```bash
cd wallet
npm start
```

Press `r` in Expo to reload on your phone.

### 3. Test Network Connection

**From your phone's browser**, visit:
```
http://192.168.1.33:3001/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "DID Platform Backend API is running",
  "timestamp": "2026-03-26T17:10:00.000Z",
  "environment": "development"
}
```

If you see this ✅ → Network is working correctly!

### 4. Test Authentication

1. Open Portal at `http://localhost:5173`
2. Go to "Generate QR Code"
3. Enter employee ID (e.g., EMP001)
4. Scan QR code with wallet
5. Should authenticate within 10 seconds ✅

## Troubleshooting

### Still getting timeout?

**Check 1: Same Network**
```bash
# On your computer
ipconfig

# Look for IPv4 Address: 192.168.1.33
# Your phone must be on the SAME Wi-Fi network
```

**Check 2: Firewall**
```bash
# Windows: Allow port 3001
# Mac: System Preferences → Security → Firewall → Allow Node
```

**Check 3: Backend Running**
```bash
curl http://192.168.1.33:3001/api/health

# Should return JSON with "status": "ok"
```

**Check 4: Phone Can Reach Backend**
- Open phone browser
- Visit: `http://192.168.1.33:3001/api/health`
- Should see JSON response
- If fails → network/firewall issue

## Verification Checklist

- [ ] Backend started with `npm run dev`
- [ ] Console shows `http://192.168.1.33:3001`
- [ ] Wallet restarted with `npm start`
- [ ] Phone on same Wi-Fi network
- [ ] Phone browser can access `http://192.168.1.33:3001/api/health`
- [ ] QR code authentication works

## Configuration is Now Consistent

✅ All components use `192.168.1.33`  
✅ 30-second timeouts for network latency  
✅ Better error messages  
✅ Ready for mobile wallet authentication  

---

**Status**: ✅ Configured for 192.168.1.33  
**Date**: 2026-03-26  
**Action Required**: Restart backend and wallet
