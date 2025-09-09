"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCorporateExcellenceNFT = exports.verifyAnonymousToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ANONYMOUS_JWT_SECRET = process.env.ANONYMOUS_JWT_SECRET || 'zkp-anonymous-secret-2025';
const verifyAnonymousToken = (req, res, next) => {
    try {
        console.log('🔒 Verifying anonymous premium access token...');
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ Missing or invalid Authorization header');
            res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Anonymous premium access token required',
                hint: 'Generate token by verifying NFT ownership via ZK-proof',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, ANONYMOUS_JWT_SECRET);
        if (!decoded.anonymous || decoded.accessLevel !== 'premium_content') {
            console.log('❌ Invalid token claims');
            res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'Invalid access level or token type',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (decoded.grantType !== 'zkp_nft_ownership') {
            console.log('❌ Invalid grant type');
            res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'Token not issued via zero-knowledge proof',
                timestamp: new Date().toISOString()
            });
            return;
        }
        console.log('✅ Anonymous premium access verified');
        console.log(`   - Access level: ${decoded.accessLevel}`);
        console.log(`   - Grant type: ${decoded.grantType}`);
        console.log(`   - Expires: ${new Date(decoded.exp * 1000).toISOString()}`);
        req.anonymousAuth = {
            accessLevel: decoded.accessLevel,
            grantType: decoded.grantType,
            verified: true,
            issuedAt: decoded.iat,
            expiresAt: decoded.exp
        };
        next();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Anonymous token verification failed:', errorMessage);
        if (errorMessage.includes('expired')) {
            res.status(401).json({
                success: false,
                error: 'Token Expired',
                message: 'Anonymous access token has expired',
                hint: 'Generate new token by verifying NFT ownership again',
                timestamp: new Date().toISOString()
            });
            return;
        }
        res.status(403).json({
            success: false,
            error: 'Invalid Token',
            message: 'Anonymous access token verification failed',
            timestamp: new Date().toISOString()
        });
    }
};
exports.verifyAnonymousToken = verifyAnonymousToken;
const requireCorporateExcellenceNFT = (req, res, next) => {
    try {
        (0, exports.verifyAnonymousToken)(req, res, () => {
            if (!req.anonymousAuth) {
                res.status(500).json({
                    success: false,
                    error: 'Internal Error',
                    message: 'Anonymous auth context missing',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            console.log('🏆 Corporate Excellence 2025 NFT access verified');
            console.log('   - Anonymous holder confirmed');
            console.log('   - Premium content access granted');
            next();
        });
    }
    catch (error) {
        console.error('💥 Corporate Excellence NFT verification failed:', error);
        res.status(500).json({
            success: false,
            error: 'Verification Error',
            timestamp: new Date().toISOString()
        });
    }
};
exports.requireCorporateExcellenceNFT = requireCorporateExcellenceNFT;
exports.default = {
    verifyAnonymousToken: exports.verifyAnonymousToken,
    requireCorporateExcellenceNFT: exports.requireCorporateExcellenceNFT
};
//# sourceMappingURL=zkp.middleware.js.map