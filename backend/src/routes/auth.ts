import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyJWT } from 'did-jwt';
import { EthrDID } from 'ethr-did';
import { BlockchainService } from '../services/blockchainService';
import { sepoliaService } from '../services/SepoliaService';
import { verifyAuthToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  BadgeType,
  getBadgeDefinition,
  getEmployeeById,
} from '../services/employeeDirectory';
import {
  ensureEmployeeRegisteredOnChain,
  enrichEmployeeWithOnChainProfile,
  recordEmployeeAuthenticationOnChain,
} from '../services/employeeOnChainRegistry';

const router = Router();

// Initialize blockchain service for DID verification
const blockchainService = new BlockchainService({
  rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
  contractAddress: process.env.DID_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
});

// In-memory storage for challenges (in production, use Redis or database)
interface AuthChallenge {
  challenge: string;
  timestamp: number;
  used: boolean;
  token?: string; // JWT token after successful authentication
  userAddress?: string; // User address after successful authentication
  did?: string; // User DID after successful authentication
  employeeId?: string; // Employee ID for company portal access
  employeeName?: string;
  badge?: BadgeType;
  permissions?: string[];
  hashId?: string;
  didRegistrationTxHash?: string;
  authRecordTxHash?: string;
  authVerifyTxHash?: string;
  adminGasPayerAddress?: string;
  adminGasPayerEtherscanUrl?: string;
  companyId?: string; // Company identifier
  requestType?: 'portal_access' | 'general_auth'; // Type of authentication request
  blockchainResults?: {
    registration: any;
    authRecord: any;
    verification: any;
    didInfo: any;
    completedAt: string;
  }; // Blockchain operation results (populated after async operations complete)
  blockchainError?: string; // Error message if blockchain operations failed
}

const challenges = new Map<string, AuthChallenge>();

// JWT secret (in production, use a secure environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-key';
const CHALLENGE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/auth/challenge
 * Generates a cryptographically secure random challenge for QR code authentication
 * Legacy endpoint for backward compatibility
 */
router.get('/challenge', async (req: Request, res: Response): Promise<void> => {
  try {
    const challenge = await generateChallenge();
    res.json({
      success: true,
      data: challenge,
      message: 'Authentication challenge generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error generating challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication challenge',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/challenge
 * Generates a challenge for employee portal access with context
 */
router.post('/challenge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, companyId, requestType } = req.body;
    
    // Validate employee if provided
    if (employeeId) {
      const employee = getEmployeeById(employeeId.toUpperCase());
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      if (!employee.active) {
        res.status(403).json({
          success: false,
          error: 'Employee account is inactive',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }
    
    const challenge = await generateChallenge({
      employeeId: employeeId?.toUpperCase(),
      companyId,
      requestType: requestType || 'portal_access'
    });
    
    res.json({
      success: true,
      data: challenge,
      message: 'Employee authentication challenge generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error generating employee challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate employee authentication challenge',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper function to generate authentication challenges
 */
async function generateChallenge(context?: {
  employeeId?: string;
  companyId?: string;
  requestType?: string;
}) {
  const selectedEmployee = context?.employeeId ? getEmployeeById(context.employeeId) : undefined;
  const employee = selectedEmployee
    ? await enrichEmployeeWithOnChainProfile(selectedEmployee)
    : undefined;

  if (employee) {
    await ensureEmployeeRegisteredOnChain(employee);
  }

  const badge = (employee?.badge || 'employee') as BadgeType;
  const badgeDefinition = getBadgeDefinition(badge);
  const timestamp = Date.now();

  // Generate a cryptographically secure random challenge
  const randomPart = crypto.randomBytes(32).toString('hex');
  const challengeId = crypto.randomUUID();
  const challenge = [
    `challenge:${randomPart}`,
    `scope:${badgeDefinition.challengeScope}`,
    `badge:${badge}`,
    `employee:${employee?.id || 'unknown'}`,
    `issued:${new Date(timestamp).toISOString()}`,
  ].join('|');
  
  // Store the challenge with expiry and context
  challenges.set(challengeId, {
    challenge,
    timestamp,
    used: false,
    employeeId: context?.employeeId,
    employeeName: employee?.name,
    badge,
    permissions: employee?.permissions || [...badgeDefinition.permissions],
    hashId: employee?.hashId,
    didRegistrationTxHash: employee?.didRegistrationTxHash,
    adminGasPayerAddress: sepoliaService.getGasPayerAddress(),
    adminGasPayerEtherscanUrl: sepoliaService.getGasPayerEtherscanUrl(),
    companyId: context?.companyId,
    requestType: context?.requestType as any
  });

  // Clean up expired challenges
  cleanupExpiredChallenges();

  // Create QR code data with context
  const qrCodeData = JSON.stringify({
    type: "did-auth-request",
    version: "1.0",
    challengeId,
    challenge,
    domain: 'decentralized-trust.platform',
    companyId: context?.companyId || 'dtp_enterprise_001',
    timestamp,
    expiresAt: timestamp + CHALLENGE_EXPIRY_TIME,
    apiEndpoint: 'http://192.168.1.33:3001/api/auth/verify',
    instruction: 'Authenticate with your DID wallet to access Enterprise Portal',
    badge: {
      type: badge,
      label: badgeDefinition.label,
      permissions: employee?.permissions || badgeDefinition.permissions,
    },
    ...(context?.employeeId && { 
      employee,
      expectedDID: employee?.did,
      employeeHashId: employee?.hashId,
      didRegistrationTxHash: employee?.didRegistrationTxHash,
      adminGasPayerAddress: sepoliaService.getGasPayerAddress(),
      adminGasPayerEtherscanUrl: sepoliaService.getGasPayerEtherscanUrl(),
    }),
    ...(context?.requestType && { requestType: context.requestType })
  });

  return {
    challengeId,
    challenge,
    expiresIn: Math.floor(CHALLENGE_EXPIRY_TIME / 1000), // seconds
    qrCodeData,
    ...(context?.employeeId && { 
      employee,
    })
  };
}

/**
 * GET /api/auth/status/:challengeId
 * Checks the status of an authentication challenge (for polling by web portal)
 */
router.get('/status/:challengeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;

    const challengeData = challenges.get(challengeId);
    
    if (!challengeData) {
      res.status(404).json({
        success: false,
        error: 'Challenge not found or expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge is expired
    if (Date.now() - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
      challenges.delete(challengeId);
      res.status(400).json({
        success: false,
        error: 'Challenge has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: {
        challengeId,
        status: challengeData.used ? 'completed' : 'pending',
        expiresAt: challengeData.timestamp + CHALLENGE_EXPIRY_TIME,
        ...(challengeData.used && challengeData.token && {
          token: challengeData.token,
          did: challengeData.did,
          userAddress: challengeData.userAddress,
          employeeId: challengeData.employeeId,
          employeeName: challengeData.employeeName,
          badge: challengeData.badge,
          permissions: challengeData.permissions,
          hashId: challengeData.hashId,
          didRegistrationTxHash: challengeData.didRegistrationTxHash,
          authRecordTxHash: challengeData.authRecordTxHash,
          authVerifyTxHash: challengeData.authVerifyTxHash,
          adminGasPayerAddress: challengeData.adminGasPayerAddress,
          adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
        })
      },
      timestamp: new Date().toISOString()
    });

    // Clean up completed challenge after token is retrieved (with delay to allow multiple polls)
    if (challengeData.used && challengeData.token) {
      setTimeout(() => {
        challenges.delete(challengeId);
      }, 30000); // 30 seconds delay
    }

  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check challenge status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/status/session/:sessionId
 * Checks the authentication status by session ID (for passwordless authentication polling)
 */
router.get('/status/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Find challenge by sessionId (stored in challenge string or as metadata)
    let matchingChallenge = null;
    let challengeId = null;

    for (const [cId, challengeData] of challenges.entries()) {
      // sessionId could be stored in the challenge string or as metadata
      if (cId.includes(sessionId) || challengeData.challenge.includes(sessionId)) {
        matchingChallenge = challengeData;
        challengeId = cId;
        break;
      }
    }

    if (!matchingChallenge) {
      res.status(404).json({
        success: false,
        error: 'Session not found or expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge is expired
    if (Date.now() - matchingChallenge.timestamp > CHALLENGE_EXPIRY_TIME) {
      challenges.delete(challengeId!);
      res.status(400).json({
        success: false,
        error: 'Session has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check authentication status
    if (matchingChallenge.used && matchingChallenge.token) {
      // Authentication successful
      res.json({
        success: true,
        data: {
          authenticated: true,
          sessionId,
          user: {
            did: matchingChallenge.did,
            address: matchingChallenge.userAddress,
            employeeId: matchingChallenge.employeeId,
            name: matchingChallenge.employeeName || 'Unknown User',
            badge: matchingChallenge.badge,
            permissions: matchingChallenge.permissions,
            hashId: matchingChallenge.hashId,
            didRegistrationTxHash: matchingChallenge.didRegistrationTxHash,
            authRecordTxHash: matchingChallenge.authRecordTxHash,
            authVerifyTxHash: matchingChallenge.authVerifyTxHash,
            adminGasPayerAddress: matchingChallenge.adminGasPayerAddress,
            adminGasPayerEtherscanUrl: matchingChallenge.adminGasPayerEtherscanUrl,
          },
          token: matchingChallenge.token,
          authenticatedAt: new Date(matchingChallenge.timestamp).toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Still pending
      res.json({
        success: true,
        data: {
          authenticated: false,
          pending: true,
          sessionId,
          expiresAt: matchingChallenge.timestamp + CHALLENGE_EXPIRY_TIME
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('Session status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check session status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/verify-token
 * Verifies a JWT token and returns user information
 */
router.post('/verify-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      res.json({
        success: true,
        data: {
          did: decoded.did,
          userAddress: decoded.userAddress,
          issuedAt: decoded.iat,
          expiresAt: decoded.exp
        },
        message: 'Token is valid',
        timestamp: new Date().toISOString()
      });

    } catch (jwtError: any) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        details: jwtError.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/verify
 * Verifies the signed challenge from the wallet app
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId, signature, address, message, employeeId } = req.body;

    // Validate required fields
    if (!challengeId || !signature || !address || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: challengeId, signature, address, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge exists and is valid
    const challengeData = challenges.get(challengeId);
    if (!challengeData) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired challenge',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has already been used
    if (challengeData.used) {
      res.status(400).json({
        success: false,
        error: 'Challenge has already been used',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has expired
    const now = Date.now();
    if (now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
      challenges.delete(challengeId);
      res.status(400).json({
        success: false,
        error: 'Challenge has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      // Development mode - accept demo signatures
      const isDevelopmentMode = process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true';
      console.log('🔧 Environment check:', { 
        NODE_ENV: process.env.NODE_ENV, 
        DEMO_MODE: process.env.DEMO_MODE, 
        isDevelopmentMode 
      });
      
      let signatureValid = false;
      let recoveredAddress = '';

      if (isDevelopmentMode) {
        // In development mode, accept demo signatures or simplified testing
        console.log('🔧 Development mode: Accepting demo signature');
        signatureValid = true;
        recoveredAddress = address; // Use provided address for demo
      } else {
        // Production mode - verify real Ethereum signature
        console.log('🔐 Production mode: Verifying real signature');
        try {
          recoveredAddress = ethers.verifyMessage(message, signature);
          signatureValid = recoveredAddress.toLowerCase() === address.toLowerCase();
        } catch (error) {
          console.error('Signature verification failed:', error);
          signatureValid = false;
        }
      }
      
      // Verify that the signature is valid
      if (!signatureValid || recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        res.status(401).json({
          success: false,
          error: 'Signature verification failed - address mismatch',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify that the message contains the correct challenge
      if (!message.includes(challengeData.challenge)) {
        res.status(401).json({
          success: false,
          error: 'Invalid challenge in signed message',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ Signature verification successful for address:', address);

      const challengeEmployee = challengeData.employeeId ? getEmployeeById(challengeData.employeeId) : undefined;
      const resolvedEmployee = employeeId ? getEmployeeById(employeeId) : challengeEmployee;
      const resolvedAddress = isDevelopmentMode && resolvedEmployee ? resolvedEmployee.address : address;
      const resolvedDid = resolvedEmployee?.did || `did:ethr:${resolvedAddress}`;

      const resolvedEmployeeWithChain = resolvedEmployee
        ? await enrichEmployeeWithOnChainProfile(resolvedEmployee)
        : undefined;
      const onChainAuth = resolvedEmployeeWithChain
        ? await recordEmployeeAuthenticationOnChain(
            resolvedEmployeeWithChain,
            challengeId,
            message,
            signature
          )
        : undefined;

      // Mark challenge as used
      challengeData.used = true;
      challengeData.userAddress = resolvedAddress;
      challengeData.did = resolvedDid;
      challengeData.employeeId = resolvedEmployeeWithChain?.id || challengeData.employeeId;
      challengeData.employeeName = resolvedEmployeeWithChain?.name || challengeData.employeeName;
      challengeData.badge = (resolvedEmployeeWithChain?.badge || challengeData.badge || 'employee') as BadgeType;
      challengeData.permissions = resolvedEmployeeWithChain?.permissions || challengeData.permissions || [];
      challengeData.hashId = onChainAuth?.profile.hashId || resolvedEmployeeWithChain?.hashId || challengeData.hashId;
      challengeData.didRegistrationTxHash = onChainAuth?.profile.didRegistrationTxHash || resolvedEmployeeWithChain?.didRegistrationTxHash || challengeData.didRegistrationTxHash;
      challengeData.authRecordTxHash = onChainAuth?.authRecordTxHash;
      challengeData.authVerifyTxHash = onChainAuth?.authVerifyTxHash;
      challengeData.adminGasPayerAddress = sepoliaService.getGasPayerAddress();
      challengeData.adminGasPayerEtherscanUrl = sepoliaService.getGasPayerEtherscanUrl();

      // Generate JWT token
      const tokenPayload = {
        address: resolvedAddress,
        did: resolvedDid,
        employeeId: challengeData.employeeId,
        employeeName: challengeData.employeeName,
        badge: challengeData.badge,
        permissions: challengeData.permissions,
        hashId: challengeData.hashId,
        didRegistrationTxHash: challengeData.didRegistrationTxHash,
        authRecordTxHash: challengeData.authRecordTxHash,
        authVerifyTxHash: challengeData.authVerifyTxHash,
        adminGasPayerAddress: challengeData.adminGasPayerAddress,
        adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
        challengeId: challengeId,
        authenticated: true,
        timestamp: new Date().toISOString()
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { 
        expiresIn: '24h',
        issuer: 'decentralized-trust-platform'
      });

      // Store token in challenge data for future reference
      challengeData.token = token;

      // Clean up expired challenges
      cleanupExpiredChallenges();

      res.status(200).json({
        success: true,
        data: {
          token: token,
          address: resolvedAddress,
          did: resolvedDid,
          employee: resolvedEmployeeWithChain || null,
          badge: challengeData.badge,
          permissions: challengeData.permissions,
          hashId: challengeData.hashId,
          didRegistrationTxHash: challengeData.didRegistrationTxHash,
          authRecordTxHash: challengeData.authRecordTxHash,
          authVerifyTxHash: challengeData.authVerifyTxHash,
          adminGasPayerAddress: challengeData.adminGasPayerAddress,
          adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
          challengeId: challengeId,
          expiresIn: '24h'
        },
        message: 'Authentication successful',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Signature verification error:', error);
      res.status(401).json({
        success: false,
        error: 'Signature verification failed',
        timestamp: new Date().toISOString()
      });
      return;
    }

  } catch (error: any) {
    console.error('Verify endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/login
 * Enhanced credential-aware authentication endpoint
 * Expects: { did, signature, credential }
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { did, signature, credential, challengeId, message } = req.body;

    // Validate required fields
    if (!did || !signature || !credential || !challengeId || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: did, signature, credential, challengeId, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🔐 Starting credential-aware authentication for DID:', did);

    // Step 1: Verify the signature (existing authentication logic)
    const challengeData = challenges.get(challengeId);
    if (!challengeData) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired challenge',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (challengeData.used) {
      res.status(400).json({
        success: false,
        error: 'Challenge has already been used',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has expired
    const now = Date.now();
    if (now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
      challenges.delete(challengeId);
      res.status(400).json({
        success: false,
        error: 'Challenge has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Extract address from DID
    const addressMatch = did.match(/did:ethr:0x([a-fA-F0-9]{40})/);
    if (!addressMatch) {
      res.status(400).json({
        success: false,
        error: 'Invalid DID format',
        timestamp: new Date().toISOString()
      });
      return;
    }
    const userAddress = `0x${addressMatch[1]}`;

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      res.status(401).json({
        success: false,
        error: 'Signature verification failed - address mismatch',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!message.includes(challengeData.challenge)) {
      res.status(401).json({
        success: false,
        error: 'Invalid challenge in signed message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('✅ Step 1: Signature verification successful');

    // Step 2: Verify the Verifiable Credential
    try {
      // Company's issuer DID (should match the issuer in the VC)
      const COMPANY_DID = process.env.COMPANY_DID || 'did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      
      // Verify the JWT signature and structure
      const verificationResult = await verifyJWT(credential, {
        resolver: undefined, // We'll do manual verification
        audience: undefined
      });

      const vcPayload = verificationResult.payload;
      
      // Verify the credential structure
      if (!vcPayload.vc || !vcPayload.vc.credentialSubject) {
        throw new Error('Invalid credential structure');
      }

      const credentialSubject = vcPayload.vc.credentialSubject;
      
      // Verify the credential was issued to the authenticated user
      if (credentialSubject.id !== did) {
        throw new Error('Credential not issued to authenticated user');
      }

      // Verify the credential was issued by our company
      if (vcPayload.vc.issuer !== COMPANY_DID) {
        throw new Error('Credential not issued by authorized company');
      }

      // Check if credential has expired
      if (vcPayload.exp && vcPayload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Credential has expired');
      }

      console.log('✅ Step 2: Credential verification successful');
      
      // Step 3: Extract role and employee information
      const employeeRole = credentialSubject.role;
      const employeeId = credentialSubject.employeeId;
      const employeeName = credentialSubject.name;
      const employeeDepartment = credentialSubject.department;
      const employeeEmail = credentialSubject.email;

      console.log('👤 Authenticated user:', {
        name: employeeName,
        role: employeeRole,
        department: employeeDepartment,
        employeeId
      });

      // Step 4: Generate enhanced JWT token with role claims
      const enhancedTokenPayload = {
        did: did,
        address: userAddress,
        employeeId: employeeId,
        name: employeeName,
        role: employeeRole,
        department: employeeDepartment,
        email: employeeEmail,
        challengeId: challengeId,
        authenticated: true,
        credentialVerified: true,
        isAdmin: employeeRole === 'HR Director', // Admin check based on role
        timestamp: new Date().toISOString()
      };

      const enhancedToken = jwt.sign(enhancedTokenPayload, JWT_SECRET, { 
        expiresIn: '24h',
        issuer: 'decentralized-trust-platform'
      });

      // Mark challenge as used and store enhanced token
      challengeData.used = true;
      challengeData.userAddress = userAddress;
      challengeData.did = did;
      challengeData.token = enhancedToken;

      // Clean up expired challenges
      cleanupExpiredChallenges();

      res.status(200).json({
        success: true,
        data: {
          token: enhancedToken,
          user: {
            did: did,
            address: userAddress,
            employeeId: employeeId,
            name: employeeName,
            role: employeeRole,
            department: employeeDepartment,
            email: employeeEmail,
            isAdmin: employeeRole === 'HR Director'
          },
          challengeId: challengeId,
          expiresIn: '24h'
        },
        message: 'Credential-based authentication successful',
        timestamp: new Date().toISOString()
      });

    } catch (credentialError: any) {
      console.error('❌ Credential verification failed:', credentialError.message);
      res.status(401).json({
        success: false,
        error: 'Credential verification failed',
        details: credentialError.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

  } catch (error: any) {
    console.error('❌ Login endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/session-status
 * 
 * Returns the current session status including access level.
 * Used by web portal for polling to detect premium access upgrades.
 */
router.get('/session-status', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Session status check for user:', req.user?.address?.substring(0, 10) + '...');

    const sessionInfo = {
      authenticated: true,
      address: req.user?.address,
      accessLevel: req.user?.accessLevel || 'standard',
      premiumGrantedAt: req.user?.premiumGrantedAt,
      sessionActive: true,
      tokenExpiresAt: req.user?.exp ? new Date(req.user.exp * 1000).toISOString() : null,
      lastChecked: new Date().toISOString()
    };

    console.log('✅ Session status:', {
      accessLevel: sessionInfo.accessLevel,
      premiumAccess: sessionInfo.accessLevel === 'premium',
      tokenValid: true
    });

    res.status(200).json({
      success: true,
      data: sessionInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Session status check failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Session check failed',
      message: 'Unable to retrieve session status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper function to clean up expired challenges
 */
function cleanupExpiredChallenges(): void {
  const now = Date.now();
  for (const [challengeId, challengeData] of challenges.entries()) {
    if (now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
      challenges.delete(challengeId);
    }
  }
}

// Clean up expired challenges every 10 minutes
setInterval(cleanupExpiredChallenges, 10 * 60 * 1000);

/**
 * POST /api/auth/sepolia-verify
 * Enhanced authentication with Sepolia blockchain integration
 */
router.post('/sepolia-verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      challengeId, 
      signature, 
      address, 
      message, 
      storeOnChain = true 
    } = req.body;

    console.log('🔗 Starting Sepolia blockchain authentication:', {
      challengeId,
      address,
      storeOnChain,
      serviceConfigured: sepoliaService.isConfigured(),
      serviceReady: sepoliaService.isReady()
    });

    // Validation
    if (!challengeId || !signature || !address || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: challengeId, signature, address, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge exists and is valid
    console.log('🔍 Sepolia-verify: Looking for challengeId:', challengeId);
    console.log('📋 Sepolia-verify: Available challenges:', Array.from(challenges.keys()));
    
    const challengeData = challenges.get(challengeId);
    if (!challengeData) {
      console.log('❌ Sepolia-verify: Challenge not found in memory');
      res.status(400).json({
        success: false,
        error: 'Invalid or expired challenge',
        details: `Challenge ${challengeId} not found. Available: ${Array.from(challenges.keys()).join(', ')}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has already been used
    if (challengeData.used) {
      res.status(400).json({
        success: false,
        error: 'Challenge has already been used',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has expired
    const now = Date.now();
    if (now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
      challenges.delete(challengeId);
      res.status(400).json({
        success: false,
        error: 'Challenge has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Step 1: Off-chain signature verification (fast)
    let isSignatureValid = false;
    try {
      // Development mode - accept demo signatures
      const isDevelopmentMode = process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true';
      console.log('🔧 Sepolia-verify Environment check:', { 
        NODE_ENV: process.env.NODE_ENV, 
        DEMO_MODE: process.env.DEMO_MODE, 
        isDevelopmentMode 
      });
      
      let recoveredAddress = '';

      if (isDevelopmentMode) {
        // In development mode, accept demo signatures or simplified testing
        console.log('🔧 Sepolia-verify Development mode: Accepting demo signature');
        isSignatureValid = true;
        recoveredAddress = address; // Use provided address for demo
      } else {
        // Production mode - verify real Ethereum signature
        console.log('🔐 Sepolia-verify Production mode: Verifying real signature');
        try {
          recoveredAddress = ethers.verifyMessage(message, signature);
          isSignatureValid = recoveredAddress.toLowerCase() === address.toLowerCase();
        } catch (error) {
          console.error('Sepolia-verify Signature verification failed:', error);
          isSignatureValid = false;
        }
      }
      
      if (!isSignatureValid || recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        console.log('❌ Sepolia-verify Signature verification failed:', {
          isSignatureValid,
          expectedAddress: address,
          recoveredAddress,
          isDevelopmentMode
        });
        res.status(401).json({
          success: false,
          error: 'Invalid signature',
          verification: {
            offChain: {
              signatureValid: false,
              reason: 'Signature does not match address'
            }
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify message contains challenge
      if (!message.includes(challengeData.challenge)) {
        console.log('❌ Sepolia-verify Challenge not found in message:', {
          message: message.substring(0, 100) + '...',
          expectedChallenge: challengeData.challenge.substring(0, 20) + '...'
        });
        res.status(401).json({
          success: false,
          error: 'Invalid challenge in signed message',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ Sepolia-verify Off-chain signature verification passed');

    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: 'Signature verification failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Step 2: Blockchain operations (ASYNC - don't block response!)
    let blockchainResults = null;
    let blockchainPending = false;
    
    if (storeOnChain && sepoliaService.isConfigured()) {
      console.log('💾 Starting blockchain operations on Sepolia (ASYNC)...');
      blockchainPending = true;

      // Convert to checksummed address for blockchain operations
      const checksummedAddress = ethers.getAddress(address.toLowerCase());

      // ⚡ Process blockchain operations in background (don't await!)
      (async () => {
        try {
          console.log('🔄 Background: Starting blockchain operations...');
          
          // Check if employee DID is registered
          const didInfo = await sepoliaService.getEmployeeDIDInfo(checksummedAddress);
          let registrationResult = null;

          if (!didInfo.success || !didInfo.didInfo?.isActive) {
            console.log('📝 Background: Registering employee DID on Sepolia...');
            
            const did = `did:ethr:${checksummedAddress}`;
            const publicKeyJwk = JSON.stringify({
              kty: 'EC',
              crv: 'secp256k1',
              use: 'sig',
              x: checksummedAddress.substring(2, 34),
              y: checksummedAddress.substring(34, 66)
            });

            registrationResult = await sepoliaService.registerEmployeeDID(
              checksummedAddress,
              did,
              publicKeyJwk
            );
            
            if (registrationResult.success) {
              console.log('✅ Background: DID registration completed:', registrationResult.txHash);
            }
          }

          // Record authentication on blockchain
          console.log('📝 Background: Recording authentication...');
          const authRecordResult = await sepoliaService.recordAuthentication(
            challengeId,
            message,
            checksummedAddress
          );
          
          if (authRecordResult.success) {
            console.log('✅ Background: Authentication recorded:', authRecordResult.txHash);
          }

          // Verify authentication on blockchain
          console.log('🔍 Background: Verifying authentication...');
          const verificationResult = await sepoliaService.verifyAuthentication(
            challengeId,
            signature
          );
          
          if (verificationResult.success) {
            console.log('✅ Background: Blockchain verification completed:', verificationResult.txHash);
          }

          // Store results in challenge data for later retrieval
          if (challengeData) {
            challengeData.blockchainResults = {
              registration: registrationResult,
              authRecord: authRecordResult,
              verification: verificationResult,
              didInfo: didInfo.didInfo,
              completedAt: new Date().toISOString()
            };
          }

          console.log('🎉 Background: All blockchain operations completed successfully!');
        } catch (error: any) {
          console.error('❌ Background: Blockchain operations failed:', error);
          if (challengeData) {
            challengeData.blockchainError = error?.message || 'Unknown blockchain error';
          }
        }
      })(); // Execute immediately but don't wait for completion

      console.log('⚡ Response will be sent immediately (blockchain operations continue in background)');
      
    } else if (storeOnChain && !sepoliaService.isConfigured()) {
      console.warn('⚠️ Blockchain storage requested but Sepolia service not configured');
    }

    // Step 3: Mark challenge as used and generate token
    challengeData.used = true;
    challengeData.userAddress = ethers.getAddress(address.toLowerCase()); // Use checksummed address
    challengeData.did = `did:ethr:${ethers.getAddress(address.toLowerCase())}`;

    // Generate JWT token
    const checksummedAddressForToken = ethers.getAddress(address.toLowerCase());
    const tokenPayload = {
      address: checksummedAddressForToken,
      did: `did:ethr:${checksummedAddressForToken}`,
      challengeId: challengeId,
      authenticated: true,
      blockchainPending: blockchainPending, // Indicate blockchain ops are in progress
      timestamp: new Date().toISOString()
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { 
      expiresIn: '24h',
      issuer: 'decentralized-trust-platform'
    });

    challengeData.token = token;

    // Success response (sent immediately, blockchain operations continue in background)
    const response = {
      success: true,
      message: blockchainPending 
        ? 'Authentication successful - Blockchain operations processing in background'
        : 'Authentication successful',
      user: {
        address,
        did: `did:ethr:${address}`
      },
      verification: {
        offChain: {
          signatureValid: isSignatureValid,
          timestamp: new Date().toISOString()
        },
        blockchain: blockchainPending ? {
          status: 'pending',
          message: 'Blockchain operations are being processed. Check /sepolia-history/:address for results.'
        } : null
      },
      links: {
        faucet: 'https://sepoliafaucet.com/',
        explorer: 'https://sepolia.etherscan.io',
        statusCheck: `/api/auth/blockchain-status/${challengeId}`
      },
      token,
      expiresIn: '24h',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Sepolia authentication response sent immediately:', {
      address,
      blockchainPending,
      responseTime: Date.now() - challengeData.timestamp + 'ms'
    });

    res.json(response);

  } catch (error: any) {
    console.error('❌ Sepolia blockchain authentication error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Blockchain authentication failed',
      details: error.message,
      service: {
        configured: sepoliaService.isConfigured(),
        config: sepoliaService.getConfig()
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/blockchain-status/:challengeId
 * Check the status of blockchain operations for a specific challenge
 */
router.get('/blockchain-status/:challengeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    
    const challengeData = challenges.get(challengeId);
    
    if (!challengeData) {
      res.status(404).json({
        success: false,
        error: 'Challenge not found or expired',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Check if blockchain operations have completed
    const blockchainResults = (challengeData as any).blockchainResults;
    const blockchainError = (challengeData as any).blockchainError;
    
    if (blockchainResults) {
      res.json({
        success: true,
        status: 'completed',
        challengeId,
        blockchain: {
          registration: blockchainResults.registration,
          authRecord: blockchainResults.authRecord,
          verification: blockchainResults.verification,
          didInfo: blockchainResults.didInfo,
          completedAt: blockchainResults.completedAt
        },
        links: {
          etherscan: blockchainResults.verification?.txHash
            ? `https://sepolia.etherscan.io/tx/${blockchainResults.verification.txHash}`
            : null
        },
        timestamp: new Date().toISOString()
      });
    } else if (blockchainError) {
      res.json({
        success: false,
        status: 'failed',
        challengeId,
        error: blockchainError,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        status: 'pending',
        challengeId,
        message: 'Blockchain operations are still in progress',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to check blockchain status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/sepolia-status
 * Get Sepolia network status and contract information
 */
router.get('/sepolia-status', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!sepoliaService.isConfigured()) {
      res.json({
        success: false,
        error: 'Sepolia service not configured',
        setup: {
          required: [
            'SEPOLIA_RPC_URL',
            'SEPOLIA_CONTRACT_ADDRESS', 
            'PLATFORM_PRIVATE_KEY'
          ],
          faucets: [
            'https://sepoliafaucet.com/',
            'https://www.infura.io/faucet/sepolia'
          ]
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const networkStatus = await sepoliaService.getNetworkStatus();
    const config = sepoliaService.getConfig();

    res.json({
      success: networkStatus.success,
      network: networkStatus.status,
      configuration: {
        rpcUrl: config.rpcUrl,
        contractAddress: config.contractAddress,
        chainId: config.chainId,
        walletAddress: config.walletAddress
      },
      links: {
        explorer: 'https://sepolia.etherscan.io',
        faucet: 'https://sepoliafaucet.com/',
        contract: config.contractAddress 
          ? `https://sepolia.etherscan.io/address/${config.contractAddress}`
          : null
      },
      error: networkStatus.error,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get Sepolia network status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/sepolia-history/:address
 * Get employee's blockchain authentication history
 */
router.get('/sepolia-history/:address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!sepoliaService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Sepolia service not configured',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const didInfo = await sepoliaService.getEmployeeDIDInfo(address);

    res.json({
      success: didInfo.success,
      address,
      did: `did:ethr:${address}`,
      blockchain: didInfo.didInfo || null,
      links: {
        etherscan: `https://sepolia.etherscan.io/address/${address}`,
        profile: didInfo.didInfo?.did || null
      },
      error: didInfo.error,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get authentication history',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export { router as authRoutes };
