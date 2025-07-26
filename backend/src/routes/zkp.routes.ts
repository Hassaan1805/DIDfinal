import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZKProofService } from '../services/zkproof.service';
import { verifyAuthToken, AuthenticatedRequest, upgradeSessionToPremium } from '../middleware/auth.middleware';

/**
 * ZK-Proof Authentication Routes
 * 
 * Handles privacy-preserving authentication using zero-knowledge proofs
 * for Corporate Excellence 2025 NFT ownership verification.
 */

const router = Router();
const zkProofService = new ZKProofService();

// JWT secret for anonymous tokens
const ANONYMOUS_JWT_SECRET = process.env.ANONYMOUS_JWT_SECRET || 'zkp-anonymous-secret-2025';

/**
 * POST /api/auth/verify-zkp
 * 
 * Verifies a zero-knowledge proof of NFT ownership and issues
 * an anonymous premium access token.
 * 
 * Privacy Properties:
 * - No user identification required
 * - Wallet address remains completely hidden
 * - Only proves membership in valid NFT owner set
 */
router.post('/verify-zkp', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔐 Received ZK-proof verification request');
    console.log('Request body keys:', Object.keys(req.body));

    // Extract proof data from request
    const { proof, publicSignals, challengeId, proofType } = req.body;

    // Validate request structure
    if (!proof || !publicSignals) {
      console.log('❌ Missing required proof data');
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Missing proof or publicSignals',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate proof structure
    if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
      console.log('❌ Invalid proof structure');
      res.status(400).json({
        success: false,
        error: 'Invalid proof format',
        message: 'Proof must contain pi_a, pi_b, and pi_c components',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate public signals
    if (!Array.isArray(publicSignals) || publicSignals.length === 0) {
      console.log('❌ Invalid public signals');
      res.status(400).json({
        success: false,
        error: 'Invalid public signals',
        message: 'Public signals must be a non-empty array',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('📊 Proof verification details:');
    console.log('  - Proof type:', proofType || 'NFT_OWNERSHIP');
    console.log('  - Challenge ID:', challengeId || 'N/A');
    console.log('  - Public signals count:', publicSignals.length);
    console.log('  - Proof components: pi_a, pi_b, pi_c present');

    // Verify the zero-knowledge proof
    console.log('🔍 Starting ZK-proof verification...');
    const verificationStartTime = Date.now();

    const isValidProof = await zkProofService.verifyNFTOwnershipProof(
      proof,
      publicSignals
    );

    const verificationTime = Date.now() - verificationStartTime;
    console.log(`⏱️  Verification completed in ${verificationTime}ms`);

    if (!isValidProof) {
      console.log('❌ ZK-proof verification failed');
      res.status(400).json({
        success: false,
        error: 'Invalid proof',
        message: 'Zero-knowledge proof verification failed',
        details: {
          verificationTime: `${verificationTime}ms`,
          proofType: proofType || 'NFT_OWNERSHIP'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('✅ ZK-proof verification successful!');
    console.log('🎉 User owns Corporate Excellence 2025 NFT (identity remains private)');

    // Generate anonymous premium access token
    const tokenPayload = {
      // Anonymous authentication - no user identification
      accessLevel: 'premium_content',
      grantType: 'zkp_nft_ownership',
      nftCollection: 'corporate_excellence_2025',
      
      // Security metadata
      proofVerified: true,
      verificationTime: verificationTime,
      issuedAt: Math.floor(Date.now() / 1000),
      
      // Privacy properties
      anonymous: true,
      privacyPreserving: true,
      zeroKnowledge: true
    };

    // Short-lived token for anonymous access (1 hour)
    const anonymousToken = jwt.sign(
      tokenPayload,
      ANONYMOUS_JWT_SECRET,
      {
        expiresIn: '1h',
        issuer: 'decentralized-trust-platform',
        audience: 'premium-content-access',
        subject: 'anonymous-nft-holder'
      }
    );

    console.log('🎫 Anonymous premium access token generated');
    console.log('   - Access level: premium_content');
    console.log('   - Expires in: 1 hour');
    console.log('   - Privacy: Complete anonymity maintained');

    // Success response with anonymous token
    res.status(200).json({
      success: true,
      message: 'NFT ownership verified successfully',
      data: {
        anonymousToken,
        accessLevel: 'premium_content',
        grantType: 'zkp_nft_ownership',
        expiresIn: '1h',
        verificationDetails: {
          proofValid: true,
          verificationTime: `${verificationTime}ms`,
          privacyPreserving: true,
          anonymous: true
        }
      },
      timestamp: new Date().toISOString()
    });

    // Log successful authentication (no personal data)
    console.log('🔐 Anonymous premium access granted');
    console.log('   - Proof verification: ✅ Valid');
    console.log('   - Privacy level: 🔒 Zero-knowledge');
    console.log('   - Access duration: ⏰ 1 hour');

  } catch (error) {
    console.error('💥 ZK-proof verification error:', error);

    // Generic error response (no sensitive information)
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: 'An error occurred during proof verification',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/zkp-challenge
 * 
 * Generates a challenge for ZK-proof authentication flow.
 * This helps prevent replay attacks and ensures proof freshness.
 */
router.get('/zkp-challenge', (req: Request, res: Response) => {
  try {
    console.log('🎯 Generating ZK-proof authentication challenge');

    const challenge = zkProofService.generateAuthChallenge();

    console.log(`✅ Challenge generated: ${challenge.challengeId}`);

    return res.status(200).json({
      success: true,
      data: challenge,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Challenge generation error:', error);

    return res.status(500).json({
      success: false,
      error: 'Challenge generation failed',
      message: 'Could not generate authentication challenge',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/verify-anonymous-token
 * 
 * Verifies an anonymous premium access token and returns access information.
 * Used by protected routes to validate premium access.
 */
router.post('/verify-anonymous-token', (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token',
        timestamp: new Date().toISOString()
      });
    }

    // Verify anonymous token
    const decoded = jwt.verify(token, ANONYMOUS_JWT_SECRET) as any;

    if (!decoded.anonymous || decoded.accessLevel !== 'premium_content') {
      return res.status(403).json({
        success: false,
        error: 'Invalid access level',
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Anonymous premium token verified');

    return res.status(200).json({
      success: true,
      data: {
        accessLevel: decoded.accessLevel,
        anonymous: decoded.anonymous,
        grantType: decoded.grantType,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Anonymous token verification failed:', errorMessage);
    
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/verify-zkp-session
 * 
 * Session-based ZK-proof verification for web portal integration.
 * Requires existing authentication and upgrades session to premium access.
 * 
 * This endpoint is used when a logged-in user wants to upgrade their 
 * session to premium access level using ZK-proof from mobile wallet.
 */
router.post('/verify-zkp-session', verifyAuthToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('🔐 Session-based ZK-proof verification initiated');
    console.log('   - User address:', req.user?.address?.substring(0, 10) + '...');
    console.log('   - Current access level:', req.user?.accessLevel);

    const { proof, publicSignals, proofType, challengeId } = req.body;

    // Validate required fields
    if (!proof || !publicSignals) {
      console.log('❌ Missing required ZK-proof data');
      res.status(400).json({
        success: false,
        error: 'Missing required fields', 
        message: 'Both proof and publicSignals are required',
        timestamp: new Date().toISOString()
      });
      return;
    }    // Validate proof structure
    if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
      console.log('❌ Invalid proof structure');
      res.status(400).json({
        success: false,
        error: 'Invalid proof structure',
        message: 'Proof must contain pi_a, pi_b, and pi_c components',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate public signals
    if (!Array.isArray(publicSignals) || publicSignals.length === 0) {
      console.log('❌ Invalid public signals');
      res.status(400).json({
        success: false,
        error: 'Invalid public signals',
        message: 'Public signals must be a non-empty array',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('📊 Session-based proof verification details:');
    console.log('  - Proof type:', proofType || 'NFT_OWNERSHIP');
    console.log('  - Challenge ID:', challengeId || 'N/A');
    console.log('  - Public signals count:', publicSignals.length);
    console.log('  - User session:', req.user?.address?.substring(0, 10) + '...');

    // Verify the zero-knowledge proof
    console.log('🔍 Starting session-based ZK-proof verification...');
    const verificationStartTime = Date.now();

    const isValidProof = await zkProofService.verifyNFTOwnershipProof(
      proof,
      publicSignals
    );

    const verificationTime = Date.now() - verificationStartTime;
    console.log(`⏱️  Session verification completed in ${verificationTime}ms`);

    if (!isValidProof) {
      console.log('❌ Session-based ZK-proof verification failed');
      res.status(400).json({
        success: false,
        error: 'Invalid proof',
        message: 'Zero-knowledge proof verification failed',
        details: {
          verificationTime: `${verificationTime}ms`,
          proofType: proofType || 'NFT_OWNERSHIP',
          sessionBased: true
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('✅ Session-based ZK-proof verification successful!');
    console.log('🎉 Upgrading user session to premium access level');

    // Upgrade user session to premium access
    const premiumToken = upgradeSessionToPremium(
      req.user!.address,
      req.user!.challengeId
    );

    console.log('🎫 Session upgraded to premium access');
    console.log('   - Previous access level: standard');
    console.log('   - New access level: premium');
    console.log('   - Upgraded at:', new Date().toISOString());

    // Success response with upgraded session token
    res.status(200).json({
      success: true,
      message: 'Session upgraded to premium access successfully',
      data: {
        token: premiumToken, // New token with premium access
        accessLevel: 'premium',
        upgradeType: 'zkp_session_upgrade',
        previousAccessLevel: req.user?.accessLevel || 'standard',
        upgradedAt: new Date().toISOString(),
        verificationDetails: {
          proofValid: true,
          verificationTime: `${verificationTime}ms`,
          sessionBased: true,
          userAddress: req.user?.address?.substring(0, 10) + '...' // Partial address for logging
        }
      },
      timestamp: new Date().toISOString()
    });

    // Log successful session upgrade
    console.log('🔐 Premium session upgrade completed');
    console.log('   - User:', req.user?.address?.substring(0, 10) + '...');
    console.log('   - Proof verification: ✅ Valid');
    console.log('   - Access level: ⬆️  Upgraded to premium');
    console.log('   - Session duration: ⏰ 24 hours');

  } catch (error: any) {
    console.error('💥 Session-based ZK-proof verification error:', error);

    // Generic error response (no sensitive information)
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: 'An error occurred during ZK-proof verification',
      details: {
        sessionBased: true,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
