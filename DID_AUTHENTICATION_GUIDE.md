# DID Authentication Flow Guide

## Understanding the QR Code Authentication

When you scan the QR code in this system, you're not just seeing a "random number" - you're seeing a **structured authentication request** that contains your **Decentralized Identity (DID)**. Here's how it works:

## What is a DID?

A **DID (Decentralized Identifier)** is your unique digital identity on the blockchain. It looks like this:

```
did:ethr:0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F
```

Breaking this down:
- `did:` - Standard prefix for all DIDs
- `ethr:` - Indicates this DID is on the Ethereum network
- `0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F` - Your unique Ethereum address

## The QR Code Authentication Process

### Step 1: Generate QR Code
When you enter your Employee ID in the portal, it:
1. Creates an authentication challenge
2. Generates a QR code containing:
   ```json
   {
     "type": "did-auth-request",
     "challengeId": "unique-challenge-id",
     "challenge": "cryptographic-challenge-string",
     "expectedDID": "did:ethr:your-ethereum-address",
     "employee": {
       "id": "EMP001", 
       "name": "Zaid",
       "role": "CEO"
     },
     "instruction": "Authenticate with your DID wallet"
   }
   ```

### Step 2: Scan with Wallet
Your DID wallet (secure-wallet-local.html):
1. Parses the QR code data
2. **Shows your DID prominently**: `did:ethr:0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F`
3. Displays the authentication request details
4. Signs the challenge with your private key

### Step 3: Authentication Response
The wallet sends back:
```json
{
  "challengeId": "matching-challenge-id",
  "signature": "cryptographic-signature",
  "address": "0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F",
  "message": "signed-challenge-message"
}
```

## How to Test This Flow

### 1. Open the Enterprise Portal
- Navigate to: http://localhost:5174
- Enter Employee ID: `EMP001` (for Zaid)
- Click "Authenticate with Wallet"

### 2. Copy the QR Code Data
- Right-click on the QR code → "Copy image"
- Or copy the JSON from the debug info shown below the QR code

### 3. Open the DID Wallet
- Click "🔓 Open DID Wallet" button in the portal
- Or manually open: `secure-wallet-local.html`

### 4. Complete Authentication
- Paste the QR data into the wallet
- Click "🔍 Scan & Authenticate"
- You'll see:
  - **Your DID**: `did:ethr:0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F`
  - Authentication request details
  - Automatic signing and response

### 5. Portal Updates
- The portal will automatically detect the successful authentication
- You'll be logged into the enterprise dashboard

## Employee DID Mappings

| Employee | DID |
|----------|-----|
| Zaid (EMP001) | `did:ethr:0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F` |
| Hassaan (EMP002) | `did:ethr:0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F` |
| Atharva (EMP003) | `did:ethr:0x1234567890123456789012345678901234567890` |
| Gracian (EMP004) | `did:ethr:0xABCDEF1234567890ABCDEF1234567890ABCDEF12` |

## Why This is Better Than Traditional Login

1. **No Passwords**: Your identity is cryptographically proven
2. **Decentralized**: No central authority controls your identity
3. **Privacy**: Only you control your private keys
4. **Interoperable**: Your DID works across different systems
5. **Tamper-Proof**: Blockchain ensures identity integrity

## Troubleshooting

### "Random Number" Issue
If you're seeing JSON data instead of clear DID information:
1. Make sure you're using the updated wallet (secure-wallet-local.html)
2. The wallet will now prominently display your DID
3. The "random" challenge is actually a cryptographic proof

### Authentication Failing
1. Check that employee addresses match between portal and wallet
2. Verify the challenge hasn't expired (5 minutes)
3. Ensure both backend (port 3001) and frontend (port 5174) are running

### Network Issues
1. Backend: http://localhost:3001/api/health
2. Frontend: http://localhost:5174
3. Check browser console for errors

## Security Features

- **Challenge-Response**: Prevents replay attacks
- **Cryptographic Signatures**: Ensures authenticity
- **Time-Limited Tokens**: Challenges expire in 5 minutes
- **Address Verification**: Confirms signature matches address
- **DID Validation**: Ensures proper format and ownership

This system provides enterprise-grade security while maintaining user privacy and control over digital identity.