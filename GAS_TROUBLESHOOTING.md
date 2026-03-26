# Gas Limits Troubleshooting Guide

## Problem: "Gas Limits Reached" Error

This error occurs during blockchain authentication when there's insufficient gas or ETH balance issues.

## Quick Fixes

### 1. Check Wallet Balance ⚡

First, check your platform wallet has enough Sepolia ETH:

```bash
cd backend
npm run sepolia:status
```

**Required Balance**: At least 0.01 ETH for operations

### 2. Fund Your Wallet 💰

If balance is low, get free Sepolia testnet ETH from these faucets:

#### Primary Faucets (Recommended)
- **Infura Faucet**: https://www.infura.io/faucet/sepolia
- **Alchemy Faucet**: https://sepoliafaucet.com/
- **POW Faucet**: https://sepolia-faucet.pk910.de/

#### Alternative Faucets
- Chainlink: https://faucets.chain.link/sepolia
- QuickNode: https://faucet.quicknode.com/ethereum/sepolia
- LearnWeb3: https://learnweb3.io/faucets/sepolia

**Your Platform Wallet Address**: Check `.env` file → `PLATFORM_ADDRESS`

### 3. Verify RPC Connection 🌐

If balance is sufficient, check RPC endpoint:

```bash
cd backend
node scripts/sepolia-status.js
```

If you see connection errors, switch to an alternative RPC endpoint:

1. Open `backend/.env`
2. Find `SEPOLIA_RPC_URL`
3. Comment current URL and uncomment an alternative:

```env
# Primary (Infura - may have rate limits)
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Alternative (Public endpoints)
SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
# OR
# SEPOLIA_RPC_URL=https://rpc.sepolia.org
# OR
# SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
```

4. Restart backend server

### 4. Check Network Status 📊

Verify Sepolia network is operational:
- **Etherscan**: https://sepolia.etherscan.io/
- **Status Page**: https://sepolia.dev/

## What Changed (Technical)

### Gas Limit Improvements
- **Old**: 20% buffer on estimated gas
- **New**: 50% buffer + fallback limits
- **Fallback Limits**:
  - DID Registration: 300,000 gas
  - Authentication Recording: 200,000 gas
  - Verification: 150,000 gas

### Pre-Transaction Checks
Now checks wallet balance before transactions:
- Calculates required ETH (gas × gasPrice)
- Adds 50% safety margin
- Returns helpful error if insufficient

### Better Error Messages
Errors now include:
- Root cause analysis
- Specific resolution steps
- Relevant links (faucets, Etherscan)
- Wallet addresses to fund

## Common Issues

### Issue 1: "Insufficient funds"
**Cause**: Platform wallet doesn't have enough ETH  
**Solution**: Fund wallet using faucets above

### Issue 2: "Network connection error"
**Cause**: RPC endpoint down or rate limited  
**Solution**: Switch to alternative RPC endpoint

### Issue 3: "Transaction timeout"
**Cause**: Network congestion  
**Solution**: Wait 30 seconds and retry. Check Sepolia status.

### Issue 4: "Contract rejected transaction"
**Causes**:
- DID already registered → Normal, user already has DID
- Invalid input data → Check address format
- Contract state issue → Check contract deployment

## Monitoring

### Check Wallet Balance Anytime
```bash
node backend/scripts/sepolia-status.js
```

### View Recent Transactions
```
https://sepolia.etherscan.io/address/YOUR_PLATFORM_ADDRESS
```

### Get Alerts
Set up notifications on Etherscan for your platform wallet address.

## Prevention

### For Development
1. Keep wallet funded with at least 0.05 ETH
2. Monitor balance weekly
3. Use rate-limit-free RPC endpoints

### For Production
1. Fund wallet with 1+ ETH
2. Set up balance monitoring alerts
3. Use paid RPC provider (Infura, Alchemy) with higher limits
4. Implement automatic wallet funding

## Testing the Fix

1. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Try authentication** from wallet/portal

3. **Check logs** for:
   - ✅ "Wallet balance: X ETH"
   - ✅ "Estimated cost: Y ETH"
   - ✅ "Using gas limit: Z"

4. **If still failing**:
   - Check balance (step 1 above)
   - Fund wallet (step 2 above)
   - Switch RPC (step 3 above)
   - Check Sepolia network status

## Need More Help?

1. Check backend logs for detailed error messages
2. Run `npm run sepolia:status` for diagnostic info
3. Verify contract deployed: Check `SEPOLIA_CONTRACT_ADDRESS` in .env
4. Check Sepolia Etherscan for your transactions

## Quick Command Reference

```bash
# Check status
cd backend && npm run sepolia:status

# Generate new wallet (if needed)
cd backend && npm run wallet:generate

# Deploy contract (if needed)
cd backend && npm run blockchain:deploy

# Start backend with logs
cd backend && npm run dev
```

---

**Last Updated**: 2026-03-26  
**Changes Applied**: Gas limit buffer increased to 50%, fallback limits added, pre-transaction balance checks, improved error messages, additional RPC endpoints documented.
