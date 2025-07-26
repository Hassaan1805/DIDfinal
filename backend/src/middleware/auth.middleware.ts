import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Standard Authentication Middleware
 * 
 * Verifies standard JWT tokens issued during login flow.
 * This middleware is used for session-based authentication where 
 * user identity is known and maintained.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extended request interface for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
    challengeId: string;
    authenticated: boolean;
    timestamp: string;
    accessLevel?: 'standard' | 'premium'; // New access level field for session upgrade
    premiumGrantedAt?: string; // When premium access was granted
    iat?: number;
    exp?: number;
    iss?: string;
  };
}

/**
 * Middleware to verify standard JWT tokens from user login
 */
export const verifyAuthToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    console.log('🔍 Verifying standard authentication token...');

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid Authorization header');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        hint: 'Include Bearer token in Authorization header',
        timestamp: new Date().toISOString()
      }) as any;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    console.log('✅ Standard authentication token verified');
    console.log('   - User address:', decoded.address?.substring(0, 10) + '...');
    console.log('   - Access level:', decoded.accessLevel || 'standard');
    console.log('   - Token expires:', new Date(decoded.exp * 1000).toLocaleString());

    // Attach user info to request
    req.user = {
      address: decoded.address,
      challengeId: decoded.challengeId,
      authenticated: decoded.authenticated,
      timestamp: decoded.timestamp,
      accessLevel: decoded.accessLevel || 'standard',
      premiumGrantedAt: decoded.premiumGrantedAt,
      iat: decoded.iat,
      exp: decoded.exp,
      iss: decoded.iss
    };

    next();

  } catch (error: any) {
    console.error('❌ Authentication token verification failed:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Authentication token has expired',
        hint: 'Please log in again to get a new token',
        timestamp: new Date().toISOString()
      }) as any;
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication token is invalid',
        hint: 'Please log in again to get a valid token',
        timestamp: new Date().toISOString()
      }) as any;
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Failed to verify authentication token',
      timestamp: new Date().toISOString()
    }) as any;
  }
};

/**
 * Middleware to require premium access level
 */
export const requirePremiumAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  console.log('🔐 Checking premium access requirement...');

  if (!req.user) {
    console.log('❌ User context missing');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'User must be authenticated to access premium content',
      timestamp: new Date().toISOString()
    }) as any;
  }

  if (req.user.accessLevel !== 'premium') {
    console.log('❌ Premium access required but user has:', req.user.accessLevel);
    return res.status(403).json({
      success: false,
      error: 'Premium access required',
      message: 'This endpoint requires premium access level',
      hint: 'Use ZK-proof verification to upgrade your session to premium access',
      currentAccessLevel: req.user.accessLevel,
      timestamp: new Date().toISOString()
    }) as any;
  }

  console.log('✅ Premium access verified for user');
  next();
};

/**
 * Utility function to upgrade user session with premium access
 */
export const upgradeSessionToPremium = (userAddress: string, challengeId: string): string => {
  console.log('⬆️  Upgrading user session to premium access...');

  const enhancedTokenPayload = {
    address: userAddress,
    challengeId: challengeId,
    authenticated: true,
    accessLevel: 'premium', // Upgrade to premium
    premiumGrantedAt: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };

  const enhancedToken = jwt.sign(enhancedTokenPayload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'decentralized-trust-platform',
    subject: 'premium-session'
  });

  console.log('🎫 Premium session token generated');
  console.log('   - Access level: premium');
  console.log('   - Granted at:', enhancedTokenPayload.premiumGrantedAt);

  return enhancedToken;
};
