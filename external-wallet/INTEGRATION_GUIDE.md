# External Wallet App Integration Guide

## API Endpoints for Your Wallet App

### Base URL (Development)
```
http://localhost:3001/api
```

### Base URL (Production)
```
https://your-domain.com/api
```

## Authentication Flow

### 1. Get Challenge from QR Code
The QR code contains a JSON object with:
```json
{
  "challenge": "random_challenge_string",
  "timestamp": "2025-09-09T14:45:30.000Z",
  "apiEndpoint": "http://localhost:3001/api/auth/verify",
  "employee": "zaid"
}
```

### 2. Sign the Challenge
Your app needs to sign the challenge string using the employee's private key.

**Development Mode**: You can use demo signature: `"demo_signature_for_development"`

**Production Mode**: Use proper cryptographic signature

### 3. Submit Authentication
POST to `/api/auth/verify`
```json
{
  "challenge": "the_challenge_from_qr",
  "signature": "your_signature_here",
  "address": "0xF51b2A9f6E125B7643CD0230c7140Bc4b9a27315"
}
```

### 4. Receive Token
Success response:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "employee": {
      "id": "zaid",
      "name": "Zaid Ansari",
      "role": "Admin"
    }
  }
}
```

## Employee Addresses (for testing)

```javascript
const employees = {
  zaid: "0xF51b2A9f6E125B7643CD0230c7140Bc4b9a27315",
  atharva: "0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F",
  priya: "0x8ba1f109551bD432803012645Hac136c9c1B3A00",
  rahul: "0x1234567890123456789012345678901234567890"
};
```

## QR Code Format

The portal generates QR codes with this structure:
```
Challenge: {challenge_string}
API: {api_endpoint}
Employee: {employee_id}
Timestamp: {iso_timestamp}
```

## Development Testing

### Test Portal URL
```
http://localhost:5173/test
```

### Test Backend Health
```
http://localhost:3001/api/health
```

## Required App Capabilities

1. **QR Code Scanning**: Read QR codes from portal
2. **HTTP Requests**: POST to authentication endpoints
3. **JSON Parsing**: Handle API requests/responses
4. **Message Signing**: Sign challenge strings (or use demo mode)
5. **Storage**: Store authentication tokens

## Security Notes

- In development: DEMO_MODE=true allows demo signatures
- In production: DEMO_MODE=false requires real signatures
- Always validate API responses
- Store tokens securely
- Never log private keys or signatures

## Integration Steps

1. Copy your APK to: `c:\Users\Zaid\Documents\did\external-wallet\`
2. Test QR scanning with test portal
3. Implement HTTP requests to auth API
4. Test authentication flow
5. Handle success/error responses
