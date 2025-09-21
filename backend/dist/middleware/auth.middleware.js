"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradeSessionToPremium = exports.requirePremiumAccess = exports.verifyAuthToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
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
//# sourceMappingURL=auth.middleware.js.map