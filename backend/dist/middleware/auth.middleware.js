"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminAuth = exports.upgradeSessionToPremium = exports.requirePremiumAccess = exports.verifyAuthToken = void 0;
exports.getAdminAuthConfig = getAdminAuthConfig;
exports.hasAdminClaims = hasAdminClaims;
exports.generateAdminToken = generateAdminToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable must be set with at least 32 characters');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
    }
}
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret-not-for-production';
const verifyAuthToken = (req, res, next) => {
    try {
        console.log('🔍 Verifying standard authentication token...');
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ Missing or invalid Authorization header');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Missing or invalid authorization header',
                hint: 'Include Bearer token in Authorization header',
                timestamp: new Date().toISOString()
            });
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('✅ Standard authentication token verified');
        console.log('   - User address:', decoded.address?.substring(0, 10) + '...');
        console.log('   - Access level:', decoded.accessLevel || 'standard');
        console.log('   - Token expires:', new Date(decoded.exp * 1000).toLocaleString());
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
    }
    catch (error) {
        console.error('❌ Authentication token verification failed:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                message: 'Authentication token has expired',
                hint: 'Please log in again to get a new token',
                timestamp: new Date().toISOString()
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'Authentication token is invalid',
                hint: 'Please log in again to get a valid token',
                timestamp: new Date().toISOString()
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Authentication error',
            message: 'Failed to verify authentication token',
            timestamp: new Date().toISOString()
        });
    }
};
exports.verifyAuthToken = verifyAuthToken;
const requirePremiumAccess = (req, res, next) => {
    console.log('🔐 Checking premium access requirement...');
    if (!req.user) {
        console.log('❌ User context missing');
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'User must be authenticated to access premium content',
            timestamp: new Date().toISOString()
        });
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
        });
    }
    console.log('✅ Premium access verified for user');
    next();
};
exports.requirePremiumAccess = requirePremiumAccess;
const upgradeSessionToPremium = (userAddress, challengeId) => {
    console.log('⬆️  Upgrading user session to premium access...');
    const enhancedTokenPayload = {
        address: userAddress,
        challengeId: challengeId,
        authenticated: true,
        accessLevel: 'premium',
        premiumGrantedAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
    };
    const enhancedToken = jsonwebtoken_1.default.sign(enhancedTokenPayload, JWT_SECRET, {
        expiresIn: '24h',
        issuer: 'decentralized-trust-platform',
        subject: 'premium-session'
    });
    console.log('🎫 Premium session token generated');
    console.log('   - Access level: premium');
    console.log('   - Granted at:', enhancedTokenPayload.premiumGrantedAt);
    return enhancedToken;
};
exports.upgradeSessionToPremium = upgradeSessionToPremium;
function getAdminAuthConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const configuredTokens = [
        process.env.ADMIN_TOKEN,
        ...(process.env.ADMIN_TOKENS || '').split(','),
    ]
        .map((token) => (token ?? '').trim())
        .filter((token) => token.length >= 32);
    if (configuredTokens.length === 0 && !isProduction) {
        console.warn('⚠️  No admin tokens configured. Set ADMIN_TOKEN or ADMIN_TOKENS in environment.');
    }
    const allowStaticTokens = process.env.ADMIN_ALLOW_STATIC_TOKENS !== 'false';
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
function hasAdminClaims(decoded) {
    if (decoded.admin === true) {
        return true;
    }
    const role = String(decoded.role || '').toLowerCase();
    const badge = String(decoded.badge || '').toLowerCase();
    if (role === 'admin' || badge === 'admin') {
        return true;
    }
    const permissions = Array.isArray(decoded.permissions)
        ? decoded.permissions.map((permission) => String(permission).toLowerCase())
        : [];
    if (permissions.includes('users:manage') ||
        permissions.includes('badges:issue') ||
        permissions.includes('admin:*') ||
        permissions.includes('admin:full')) {
        return true;
    }
    const scopes = Array.isArray(decoded.scope)
        ? decoded.scope
        : typeof decoded.scope === 'string'
            ? decoded.scope.split(' ')
            : [];
    return scopes.some((scope) => ['admin', 'admin:full'].includes(scope.toLowerCase()));
}
const requireAdminAuth = (req, res, next) => {
    const config = getAdminAuthConfig();
    const timestamp = new Date().toISOString();
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
    if (config.allowStaticTokens && config.staticTokens.has(token)) {
        console.log('✅ Admin auth: Authenticated via static token');
        req.adminAuthMethod = 'static-token';
        req.adminUser = { admin: true };
        next();
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config.jwtSecret);
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
    }
    catch (error) {
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
exports.requireAdminAuth = requireAdminAuth;
function generateAdminToken(payload = {}) {
    const adminPayload = {
        admin: true,
        role: 'admin',
        permissions: ['admin:*', 'users:manage', 'badges:issue'],
        ...payload,
    };
    return jsonwebtoken_1.default.sign(adminPayload, JWT_SECRET, {
        expiresIn: '24h',
        issuer: 'decentralized-trust-platform',
        subject: 'admin-session',
    });
}
//# sourceMappingURL=auth.middleware.js.map