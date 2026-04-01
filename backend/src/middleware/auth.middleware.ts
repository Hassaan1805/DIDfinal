import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Standard Authentication Middleware
 * 
 * Verifies standard JWT tokens issued during login flow.
 * This middleware is used for session-based authentication where 
 * user identity is known and maintained.
 */

// SECURITY: JWT_SECRET must be set - no weak fallback allowed
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable must be set with at least 32 characters');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
}
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret-not-for-production';

// Extended request interface for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
    did?: string;
    employeeId?: string;
    verifierId?: string;
    verifierOrganizationId?: string;
    verifierOrganizationName?: string;
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
      did: decoded.did,
      employeeId: decoded.employeeId,
      verifierId: decoded.verifierId,
      verifierOrganizationId: decoded.verifierOrganizationId,
      verifierOrganizationName: decoded.verifierOrganizationName,
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

// ============================================================================
// Admin Authentication Configuration & Middleware
// ============================================================================

/**
 * Admin JWT payload interface
 */
export interface AdminJwtPayload extends jwt.JwtPayload {
  role?: string;
  badge?: string;
  permissions?: string[];
  scope?: string | string[];
  admin?: boolean;
  employeeId?: string;
  address?: string;
}

/**
 * Extended request interface for admin-authenticated requests
 */
export interface AdminAuthenticatedRequest extends Request {
  adminUser?: AdminJwtPayload;
  adminAuthMethod?: 'jwt' | 'static-token';
}

/**
 * Admin auth configuration from environment
 */
export interface AdminAuthConfig {
  jwtSecret: string;
  staticTokens: Set<string>;
  requireJwtInProduction: boolean;
  allowStaticTokens: boolean;
}

/**
 * Get admin authentication configuration from environment
 * SECURITY: No fallback tokens - all tokens must be explicitly configured via environment variables
 */
export function getAdminAuthConfig(): AdminAuthConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Configured static tokens from environment only
  const configuredTokens = [
    process.env.ADMIN_TOKEN,
    ...(process.env.ADMIN_TOKENS || '').split(','),
  ]
    .map((token) => (token ?? '').trim())
    .filter((token): token is string => token.length >= 32); // Require minimum token length

  // SECURITY: No hardcoded fallback tokens - all must come from environment
  // Log warning if no tokens configured
  if (configuredTokens.length === 0 && !isProduction) {
    console.warn('⚠️  No admin tokens configured. Set ADMIN_TOKEN or ADMIN_TOKENS in environment.');
  }

  // Whether to allow static tokens (can be disabled for stricter security)
  const allowStaticTokens = process.env.ADMIN_ALLOW_STATIC_TOKENS !== 'false';
  
  // In production, require JWT unless static tokens are explicitly enabled
  const requireJwtInProduction = isProduction && !allowStaticTokens;

  return {
    jwtSecret: JWT_SECRET,
    staticTokens: allowStaticTokens 
      ? new Set(configuredTokens)
      : new Set(),
    requireJwtInProduction,
    allowStaticTokens,
  };
}

/**
 * Check if a decoded JWT has admin claims
 */
export function hasAdminClaims(decoded: AdminJwtPayload): boolean {
  // Explicit admin flag
  if (decoded.admin === true) {
    return true;
  }

  // Role-based check
  const role = String(decoded.role || '').toLowerCase();
  const badge = String(decoded.badge || '').toLowerCase();
  if (role === 'admin' || badge === 'admin') {
    return true;
  }

  // Permission-based check
  const permissions = Array.isArray(decoded.permissions)
    ? decoded.permissions.map((permission) => String(permission).toLowerCase())
    : [];

  if (
    permissions.includes('users:manage') ||
    permissions.includes('badges:issue') ||
    permissions.includes('admin:*') ||
    permissions.includes('admin:full')
  ) {
    return true;
  }

  // OAuth scope-based check
  const scopes = Array.isArray(decoded.scope)
    ? decoded.scope
    : typeof decoded.scope === 'string'
      ? decoded.scope.split(' ')
      : [];

  return scopes.some((scope) => ['admin', 'admin:full'].includes(scope.toLowerCase()));
}

/**
 * Admin authentication middleware
 * 
 * Verifies admin access through:
 * 1. JWT token with admin claims (preferred)
 * 2. Static admin tokens (for backwards compatibility, configurable)
 * 
 * Returns 401 for missing/invalid credentials
 * Returns 403 for valid credentials without admin permissions
 */
export const requireAdminAuth = (req: AdminAuthenticatedRequest, res: Response, next: NextFunction): void => {
  const config = getAdminAuthConfig();
  const timestamp = new Date().toISOString();

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Admin auth: Missing or invalid Authorization header');
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'MISSING_AUTH_HEADER',
      message: 'Authorization header with Bearer token is required',
      hint: 'Include "Authorization: Bearer <token>" header',
      timestamp,
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'EMPTY_TOKEN',
      message: 'Authorization token is empty',
      timestamp,
    });
    return;
  }

  // Check static tokens first (if allowed)
  if (config.allowStaticTokens && config.staticTokens.has(token)) {
    console.log('✅ Admin auth: Authenticated via static token');
    req.adminAuthMethod = 'static-token';
    req.adminUser = { admin: true };
    next();
    return;
  }

  // Verify JWT token
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AdminJwtPayload;
    
    // Check for admin claims
    if (!hasAdminClaims(decoded)) {
      console.log('❌ Admin auth: Token valid but lacks admin permissions');
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Valid authentication but insufficient admin permissions',
        hint: 'This endpoint requires admin role or admin:* permissions',
        requiredPermissions: ['admin role', 'badge:admin', 'permissions:users:manage', 'permissions:badges:issue', 'permissions:admin:*'],
        timestamp,
      });
      return;
    }

    console.log('✅ Admin auth: Authenticated via JWT with admin claims');
    req.adminAuthMethod = 'jwt';
    req.adminUser = decoded;
    next();
  } catch (error: any) {
    console.error('❌ Admin auth: Token verification failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'TOKEN_EXPIRED',
        message: 'Admin token has expired',
        hint: 'Please obtain a new admin token',
        timestamp,
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'INVALID_TOKEN',
        message: 'Invalid admin token',
        hint: 'Ensure the token is a valid JWT or configured static token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp,
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'AUTH_ERROR',
      message: 'Admin authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp,
    });
  }
};

/**
 * Generate an admin JWT token (utility for testing/setup)
 */
export function generateAdminToken(payload: Partial<AdminJwtPayload> = {}): string {
  const adminPayload: AdminJwtPayload = {
    admin: true,
    role: 'admin',
    permissions: ['admin:*', 'users:manage', 'badges:issue'],
    ...payload,
  };

  return jwt.sign(adminPayload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'decentralized-trust-platform',
    subject: 'admin-session',
  });
}
