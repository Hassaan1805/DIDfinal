# Quick Fix: Gas Limits Error ⚡

## Problem
Getting "gas limits reached" error during authentication? Here's how to fix it in 5 minutes.

## Solution (3 Steps)

### Step 1: Check Your Wallet Balance 💰

Open terminal and run:

```bash
cd backend
node scripts/sepolia-status.js
```

Look for the "Wallet Balance" section. You need **at least 0.01 ETH**.

### Step 2: Fund Your Wallet (If Needed)

If balance is low:

1. **Get your wallet address**:
   - Open `backend/.env`
   - Find the line: `PLATFORM_ADDRESS=0x...`
   - Copy that address

2. **Get free testnet ETH** (pick any):
   - 🌟 https://sepoliafaucet.com/ (easiest)
   - 🌟 https://www.infura.io/faucet/sepolia
   - 🌟 https://sepolia-faucet.pk910.de/

3. **Request ETH**:
   - Paste your wallet address
   - Complete any verification (usually Twitter or GitHub)
   - Wait 1-2 minutes

4. **Verify** (run step 1 again):
   ```bash
   node scripts/sepolia-status.js
   ```
   Balance should now be > 0.01 ETH ✅

### Step 3: Test Authentication

1. **Restart backend** (if running):
   ```bash
   cd backend
   npm run dev
   ```

2. **Try authentication again** from your wallet/portal

3. **Check logs** - you should see:
   ```
   💰 Wallet balance: 0.XXX ETH
   ⛽ Using gas limit: XXXXX
   ✅ Transaction confirmed
   ```

## Still Not Working?

### Try Alternative RPC Endpoint

If you have balance but still getting errors:

1. Open `backend/.env`
2. Find this section:
   ```env
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
   
   # Alternative Free RPC Endpoints (uncomment to switch if primary fails)
   # SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
   # SEPOLIA_RPC_URL=https://rpc.sepolia.org
   ```

3. Comment the current URL (add # at start):
   ```env
   # SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
   ```

4. Uncomment an alternative (remove #):
   ```env
   SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
   ```

5. Save and restart backend

## What Was Fixed?

Your code now:
- ✅ Checks wallet balance before transactions
- ✅ Uses 50% gas buffer (was 20%)
- ✅ Has fallback gas limits if estimation fails
- ✅ Shows clear error messages with solutions

## More Help

- **Detailed guide**: See `GAS_TROUBLESHOOTING.md`
- **Check Sepolia network**: https://sepolia.etherscan.io/
- **View your transactions**: https://sepolia.etherscan.io/address/YOUR_ADDRESS

---

**TL;DR**: Fund your wallet → Restart backend → Try again ✅
