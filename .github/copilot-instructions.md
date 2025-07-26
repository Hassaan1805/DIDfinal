# GitHub Copilot Instructions for Decentralized Trust Platform

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Context

This is a **Decentralized Trust Platform** - a next-generation DID-based authentication and authorization system for enterprises. The project is built as a monorepo with multiple TypeScript-based applications.

## Architecture Overview

### Monorepo Structure
- `contracts/` - Smart contracts (Solidity + Hardhat)
- `backend/` - API server (Node.js + Express + TypeScript)
- `portal/` - Web dashboard (React + Vite + TypeScript)
- `wallet/` - Mobile wallet (React Native + TypeScript)
- `shared/` - Shared utilities and types

### Technology Stack
- **Blockchain**: Ethereum (Sepolia Testnet), Ganache (Local)
- **Smart Contracts**: Solidity + Hardhat
- **DID/VC Libraries**: ethers.js, did-ethr, did-jwt
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript
- **Mobile**: React Native + TypeScript

## Development Guidelines

### Code Style
- Use TypeScript strict mode in all projects
- Follow consistent naming conventions:
  - PascalCase for interfaces, types, and classes
  - camelCase for variables and functions
  - UPPER_SNAKE_CASE for constants
- Prefer explicit type annotations over `any`
- Use descriptive variable and function names

### DID and Blockchain Patterns
- Always validate Ethereum addresses using regex: `/^0x[a-fA-F0-9]{40}$/`
- Use ethers.js for blockchain interactions
- Format DIDs as: `did:ethr:0x...`
- Include proper error handling for blockchain operations
- Use BigInt for handling large numbers and Wei conversions

### Security Best Practices
- Never hardcode private keys or sensitive data
- Use environment variables for configuration
- Implement proper input validation
- Use secure random number generation
- Follow the principle of least privilege

### API Design
- Use RESTful conventions
- Include proper HTTP status codes
- Implement consistent error response format
- Use middleware for authentication and validation
- Support pagination for list endpoints

### React/React Native Patterns
- Use functional components with hooks
- Implement proper error boundaries
- Use TypeScript interfaces for props
- Follow React best practices for state management
- Use proper accessibility attributes

### Testing
- Write unit tests for utility functions
- Include integration tests for API endpoints
- Test smart contract functionality
- Mock external dependencies
- Use descriptive test names

## Common Code Patterns

### DID Creation
```typescript
import { DIDUtils } from '../shared/src/utils';

const did = DIDUtils.formatDID('ethr', address);
```

### Authentication Request
```typescript
const authRequest = DIDUtils.createAuthRequest('platform.example.com');
```

### Blockchain Interaction
```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const contract = new ethers.Contract(address, abi, provider);
```

### Error Handling
```typescript
try {
  // blockchain operation
} catch (error) {
  console.error('Blockchain error:', error);
  throw new Error('Transaction failed');
}
```

## Phase-Specific Context

### Current Phase: Phase 0 (Foundation Complete)
- All basic project structure is set up
- Smart contracts are ready for deployment
- API endpoints are stubbed for Phase 1 implementation

### Next Phase: Phase 1 (Core MVP)
- Focus on DID authentication with QR codes
- Implement end-to-end login flow
- Connect mobile wallet to web portal

## File Organization

### Import Order
1. Node.js built-in modules
2. Third-party packages
3. Internal modules (relative imports)
4. Type-only imports (with `type` keyword)

### Common Imports
```typescript
// Shared utilities
import { DIDUtils, ValidationUtils } from '../shared/src/utils';
import { DIDDocument, AuthRequest } from '../shared/src/types';

// Blockchain
import { ethers } from 'ethers';
import { EthrDID } from 'ethr-did';

// Express API
import { Router, Request, Response } from 'express';

// React
import React, { useState, useEffect } from 'react';
```

## Error Handling Patterns

### API Responses
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
```

### Blockchain Errors
```typescript
if (error.code === 'NETWORK_ERROR') {
  // Handle network issues
} else if (error.code === 'INSUFFICIENT_FUNDS') {
  // Handle insufficient funds
}
```

## Environment Variables

Common environment variables used across projects:
- `ETHEREUM_RPC_URL` - Ethereum node URL
- `PRIVATE_KEY` - Wallet private key
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port

## Performance Considerations

- Use pagination for large datasets
- Implement caching for frequently accessed data
- Optimize blockchain calls (batch when possible)
- Use React.memo for expensive components
- Implement proper loading states

## Additional Context

This is an enterprise-grade platform being developed in Mumbai, India for the year 2025. The focus is on high security, scalability, and user experience. The platform will eventually handle high-value transactions and AI agent authorization, so code quality and security are paramount.

When generating code, prioritize:
1. Security and proper error handling
2. Type safety and clear interfaces
3. Scalability and performance
4. Code maintainability and documentation
5. Following established patterns in the codebase
