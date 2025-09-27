import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyJWT } from 'did-jwt';
import { EthrDID } from 'ethr-did';
import { BlockchainService } from '../services/blockchainService';
import { verifyAuthToken, AuthenticatedRequest } from '../middleware/auth.middleware';

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
  companyId?: string; // Company identifier
  requestType?: 'portal_access' | 'general_auth'; // Type of authentication request
}

// Employee database simulation (in production, integrate with HR system)
interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  active: boolean;
  did?: string; // Employee's DID (once they have one)
}

const employeeDatabase = new Map<string, Employee>([
  ['EMP001', {
    id: 'EMP001',
    name: 'Zaid',
    department: 'Engineering',
    role: 'CEO',
    email: 'zaid@company.com',
    active: true
  }],
  ['EMP002', {
    id: 'EMP002',
    name: 'Hassaan',
    department: 'Engineering',
    role: 'CTO',
    email: 'hassaan@company.com',
    active: true
  }],
  ['EMP003', {
    id: 'EMP003',
    name: 'Atharva',
    department: 'Product',
    role: 'Product Manager',
    email: 'atharva@company.com',
    active: true
  }],
  ['EMP004', {
    id: 'EMP004',
    name: 'Gracian',
    department: 'Design',
    role: 'Senior Designer',
    email: 'gracian@company.com',
    active: true
  }]
]);

const challenges = new Map<string, AuthChallenge>();

// JWT secret (in production, use a secure environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-key';
const CHALLENGE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

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
      const employee = employeeDatabase.get(employeeId.toUpperCase());
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
  // Generate a cryptographically secure random challenge
  const challenge = crypto.randomBytes(32).toString('hex');
  const challengeId = crypto.randomUUID();
  
  // Store the challenge with expiry and context
  challenges.set(challengeId, {
    challenge,
    timestamp: Date.now(),
    used: false,
    employeeId: context?.employeeId,
    companyId: context?.companyId,
    requestType: context?.requestType as any
  });

  // Clean up expired challenges
  cleanupExpiredChallenges();

  // Create QR code data with context
  const qrCodeData = JSON.stringify({
    challengeId,
    challenge,
    action: 'authenticate',
    domain: 'company.portal.com', // Your company domain
    timestamp: Date.now(),
    expiresAt: Date.now() + CHALLENGE_EXPIRY_TIME,
    ...(context?.employeeId && { employeeId: context.employeeId }),
    ...(context?.companyId && { companyId: context.companyId }),
    ...(context?.requestType && { requestType: context.requestType })
  });

  return {
    challengeId,
    challenge,
    expiresIn: Math.floor(CHALLENGE_EXPIRY_TIME / 1000), // seconds
    qrCodeData,
    ...(context?.employeeId && { 
      employee: employeeDatabase.get(context.employeeId)
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
          userAddress: challengeData.userAddress
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
            name: employeeDatabase.get(matchingChallenge.employeeId || '')?.name || 'Unknown User'
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
    const { challengeId, signature, address, message } = req.body;

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

      // Mark challenge as used
      challengeData.used = true;
      challengeData.userAddress = address;

      // Generate JWT token
      const tokenPayload = {
        address: address,
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
          address: address,
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
 * POST /api/auth/verify
 * New passwordless verification endpoint that handles QR code authentication
 * Expects the new QR code format with sessionId, challenge, and user credentials
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      type, 
      challenge, 
      sessionId, 
      did, 
      signature, 
      timestamp: authTimestamp, 
      userCredentials,
      approved 
    } = req.body;

    // Handle denial case
    if (approved === false) {
      res.status(200).json({
        success: true,
        data: {
          authenticated: false,
          denied: true,
          sessionId
        },
        message: 'Authentication denied by user',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate required fields for approval
    if (!type || !challenge || !sessionId || !did || !signature || !userCredentials) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields for authentication',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate auth request type
    if (type !== 'did-auth-response') {
      res.status(400).json({
        success: false,
        error: 'Invalid authentication response type',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Find the original challenge by sessionId
    let originalChallenge = null;
    let challengeKey = null;

    for (const [key, challengeData] of challenges.entries()) {
      if (key.includes(sessionId) || challengeData.challenge.includes(sessionId)) {
        originalChallenge = challengeData;
        challengeKey = key;
        break;
      }
    }

    if (!originalChallenge) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired authentication session',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if already authenticated
    if (originalChallenge.used) {
      res.status(400).json({
        success: false,
        error: 'Authentication session already completed',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check expiration
    if (Date.now() - originalChallenge.timestamp > CHALLENGE_EXPIRY_TIME) {
      challenges.delete(challengeKey!);
      res.status(400).json({
        success: false,
        error: 'Authentication session has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Extract address from DID (did:ethr:0x...)
    const didMatch = did.match(/^did:ethr:(0x[a-fA-F0-9]{40})$/);
    if (!didMatch) {
      res.status(400).json({
        success: false,
        error: 'Invalid DID format',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const userAddress = didMatch[1];

    try {
      // Verify the signature
      const messageToVerify = JSON.stringify({
        challenge: challenge,
        did: did,
        timestamp: authTimestamp
      });
      
      const recoveredAddress = ethers.verifyMessage(messageToVerify, signature);
      
      if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        res.status(401).json({
          success: false,
          error: 'Signature verification failed',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ DID authentication successful for:', userCredentials.name);

      // Mark challenge as used and store authentication data
      originalChallenge.used = true;
      originalChallenge.userAddress = userAddress;
      originalChallenge.did = did;
      originalChallenge.employeeId = userCredentials.employeeId;

      // Generate JWT token with user credentials
      const tokenPayload = {
        did: did,
        address: userAddress,
        employeeId: userCredentials.employeeId,
        name: userCredentials.name,
        role: userCredentials.role,
        department: userCredentials.department,
        companyId: userCredentials.companyId,
        sessionId: sessionId,
        authenticated: true,
        timestamp: new Date().toISOString()
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { 
        expiresIn: '24h',
        issuer: 'decentralized-trust-platform'
      });

      // Store token for status polling
      originalChallenge.token = token;

      console.log(`🎉 User ${userCredentials.name} (${userCredentials.role}) authenticated successfully`);

      res.status(200).json({
        success: true,
        data: {
          authenticated: true,
          token: token,
          user: {
            did: did,
            address: userAddress,
            employeeId: userCredentials.employeeId,
            name: userCredentials.name,
            role: userCredentials.role,
            department: userCredentials.department,
            companyId: userCredentials.companyId
          },
          sessionId: sessionId,
          expiresIn: '24h'
        },
        message: `Welcome, ${userCredentials.name}! Authentication successful.`,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Signature verification error:', error);
      res.status(401).json({
        success: false,
        error: 'Authentication signature verification failed',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('Passwordless auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
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

export { router as authRoutes };
