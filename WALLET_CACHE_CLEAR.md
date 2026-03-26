# Wallet Cache Clear - Quick Instructions

## The Problem
Your wallet is still using the OLD IP address from the cached JavaScript bundle, even though the config file now has the CORRECT IP (192.168.1.33).

## The Solution
Clear the cache and rebuild the wallet with the new configuration.

## How to Do It

### Option 1: Run the Script (Easiest)

**On Windows:**
```bash
# Double-click this file:
clear-wallet-cache.bat

# Or run from terminal:
.\clear-wallet-cache.bat
```

**On Mac/Linux:**
```bash
chmod +x clear-wallet-cache.sh
./clear-wallet-cache.sh
```

### Option 2: Manual Steps

**1. Stop the wallet** (if running)
- Press `Ctrl+C` in the wallet terminal

**2. Clear the cache:**

**Windows (PowerShell):**
```powershell
cd wallet
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
```

**Mac/Linux:**
```bash
cd wallet
rm -rf node_modules/.cache
rm -rf .expo
```

**3. Start with --clear flag:**
```bash
npm start -- --clear
```

**4. On your phone:**
- Close Expo Go app completely (swipe away from recent apps)
- Reopen Expo Go
- Scan the new QR code

## What to Expect

**In the terminal**, you should see:
```
Starting Metro Bundler...
› Building JavaScript bundle
```

**In the app logs** (when you authenticate), you should see:
```
📡 Submitting auth to: http://192.168.1.33:3001/api/auth/verify
```

✅ If you see `192.168.1.33` → Cache cleared successfully!  
❌ If you still see old/wrong IP → Cache not cleared, try Option 2 manual steps

## Verification

After the wallet restarts:

1. Generate a new QR code in the portal
2. Scan it with the wallet
3. Look at the error message (if any)
4. Should now show: `http://192.168.1.33:3001/api/auth/verify`

If it still shows the old IP, you may need to:
- Completely uninstall and reinstall the Expo Go app on your phone
- Or delete the wallet project from Expo Go and re-scan the QR code

## Why This Happens

React Native/Expo caches the compiled JavaScript bundle for faster development. When you change configuration files (like `config.ts`), the cache contains the old values. The `--clear` flag forces a complete rebuild with the new configuration.

---

**Status**: Ready to run  
**Action**: Run `clear-wallet-cache.bat` (Windows) or `clear-wallet-cache.sh` (Mac/Linux)  
**Date**: 2026-03-26
