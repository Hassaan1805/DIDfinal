"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zkproof_service_1 = require("../services/zkproof.service");
const ANONYMOUS_JWT_SECRET = process.env.ANONYMOUS_JWT_SECRET;
if (!ANONYMOUS_JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('❌ ANONYMOUS_JWT_SECRET must be set in production');
}
const requireCorporateExcellenceNFT = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Premium access token required',
                message: 'Prove NFT ownership via /api/zkp/verify-premium to get access token',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const token = authHeader.substring(7);
        if (!ANONYMOUS_JWT_SECRET) {
            if (process.env.NODE_ENV === 'production') {
                res.status(503).json({
                    success: false,
                    error: 'Premium service not configured',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            console.warn('⚠️ ANONYMOUS_JWT_SECRET not set - using development fallback');
        }
        const secret = ANONYMOUS_JWT_SECRET || 'development-only-zkp-secret';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (decoded.accessLevel !== 'premium_content') {
            res.status(403).json({
                success: false,
                error: 'Invalid access level',
                timestamp: new Date().toISOString()
            });
            return;
        }
        req.anonymousAuth = {
            accessLevel: decoded.accessLevel,
            grantType: decoded.grantType || 'nft-ownership',
            issuedAt: decoded.iat || Math.floor(Date.now() / 1000),
            expiresAt: decoded.exp || Math.floor(Date.now() / 1000) + 3600
        };
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                error: 'Premium access token expired',
                message: 'Re-verify NFT ownership to get a new token',
                timestamp: new Date().toISOString()
            });
            return;
        }
        res.status(401).json({
            success: false,
            error: 'Invalid premium access token',
            timestamp: new Date().toISOString()
        });
    }
};
const router = (0, express_1.Router)();
const zkProofService = new zkproof_service_1.ZKProofService();
router.get('/content', requireCorporateExcellenceNFT, (req, res) => {
    try {
        console.log('🏆 Serving premium content to anonymous NFT holder');
        const premiumContent = {
            title: 'Corporate Excellence 2025 - Exclusive Content',
            message: 'Welcome to the exclusive premium section!',
            content: {
                executiveInsights: [
                    'Advanced blockchain integration strategies for 2025',
                    'Zero-knowledge privacy implementation roadmap',
                    'Decentralized identity architecture blueprints',
                    'Enterprise-grade smart contract security patterns'
                ],
                exclusiveResources: [
                    {
                        title: 'Enterprise DID Implementation Guide',
                        description: 'Comprehensive guide for enterprise DID deployment',
                        level: 'Advanced',
                        estimatedReadTime: '45 minutes'
                    },
                    {
                        title: 'Zero-Knowledge Proof Integration Patterns',
                        description: 'Production-ready ZK-proof implementation strategies',
                        level: 'Expert',
                        estimatedReadTime: '60 minutes'
                    },
                    {
                        title: 'Privacy-Preserving Authentication Architecture',
                        description: 'Design patterns for anonymous yet secure authentication',
                        level: 'Architect',
                        estimatedReadTime: '30 minutes'
                    }
                ],
                memberBenefits: [
                    'Priority access to new feature releases',
                    'Direct communication with development team',
                    'Exclusive webinars and technical deep-dives',
                    'Beta testing opportunities',
                    'Advanced API documentation access'
                ]
            },
            userStatus: {
                accessLevel: req.anonymousAuth?.accessLevel,
                verificationMethod: 'Zero-Knowledge Proof',
                nftCollection: 'Corporate Excellence 2025',
                privacyLevel: 'Complete Anonymity',
                tokenExpiresAt: req.anonymousAuth?.expiresAt ?
                    new Date(req.anonymousAuth.expiresAt * 1000).toISOString() : 'Unknown'
            },
            disclaimer: 'This content is exclusively available to Corporate Excellence 2025 NFT holders. Your identity remains completely private through zero-knowledge proof verification.'
        };
        console.log('✅ Premium content delivered successfully');
        console.log('🔒 User privacy maintained throughout access');
        res.status(200).json({
            success: true,
            data: premiumContent,
            privacy: {
                anonymous: true,
                zeroKnowledge: true,
                identityHidden: true
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('💥 Premium content access error:', error);
        res.status(500).json({
            success: false,
            error: 'Content Access Error',
            message: 'Failed to load premium content',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/status', requireCorporateExcellenceNFT, (req, res) => {
    try {
        console.log('📊 Checking premium access status');
        const statusInfo = {
            accessGranted: true,
            accessLevel: req.anonymousAuth?.accessLevel || 'unknown',
            verificationMethod: 'Zero-Knowledge Proof',
            nftCollection: 'Corporate Excellence 2025',
            grantType: req.anonymousAuth?.grantType || 'unknown',
            issuedAt: req.anonymousAuth?.issuedAt ?
                new Date(req.anonymousAuth.issuedAt * 1000).toISOString() : 'Unknown',
            expiresAt: req.anonymousAuth?.expiresAt ?
                new Date(req.anonymousAuth.expiresAt * 1000).toISOString() : 'Unknown',
            timeRemaining: req.anonymousAuth?.expiresAt ?
                Math.max(0, req.anonymousAuth.expiresAt - Math.floor(Date.now() / 1000)) : 0,
            privacyFeatures: {
                anonymous: true,
                zeroKnowledge: true,
                walletAddressHidden: true,
                identityPreserving: true
            }
        };
        res.status(200).json({
            success: true,
            data: statusInfo,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('💥 Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Status Check Error',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/dashboard', requireCorporateExcellenceNFT, (req, res) => {
    try {
        console.log('📊 Loading premium dashboard for anonymous user');
        const dashboardData = {
            welcomeMessage: 'Welcome to your Corporate Excellence 2025 Premium Dashboard',
            features: {
                advancedAnalytics: {
                    enabled: true,
                    description: 'Advanced blockchain analytics and insights'
                },
                prioritySupport: {
                    enabled: true,
                    description: '24/7 priority technical support'
                },
                exclusiveAPI: {
                    enabled: true,
                    description: 'Access to premium API endpoints',
                    rateLimits: {
                        requestsPerMinute: 1000,
                        dailyQuota: 100000
                    }
                },
                earlyAccess: {
                    enabled: true,
                    description: 'Beta features and early release access'
                }
            },
            statistics: {
                premiumFeaturesUnlocked: 8,
                exclusiveContentAccessed: 0,
                apiCallsThisMonth: 0,
                memberSince: req.anonymousAuth?.issuedAt ?
                    new Date(req.anonymousAuth.issuedAt * 1000).toISOString() : new Date().toISOString()
            },
            upcomingFeatures: [
                'Advanced ZK-proof circuit templates',
                'Multi-chain identity verification',
                'Decentralized governance participation',
                'Cross-platform authentication protocols'
            ],
            privacyAssurance: {
                dataCollection: 'None - Complete anonymity maintained',
                identityTracking: 'Disabled - Zero-knowledge verification only',
                analyticsScope: 'Aggregated usage statistics only (no personal data)'
            }
        };
        res.status(200).json({
            success: true,
            data: dashboardData,
            privacy: {
                anonymous: true,
                zeroKnowledge: true,
                noPersonalData: true
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('💥 Dashboard loading error:', error);
        res.status(500).json({
            success: false,
            error: 'Dashboard Error',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/service-info', (req, res) => {
    try {
        const serviceInfo = zkProofService.getServiceStats();
        res.status(200).json({
            success: true,
            data: {
                ...serviceInfo,
                accessRequirements: {
                    nftCollection: 'Corporate Excellence 2025',
                    verificationMethod: 'Zero-Knowledge Proof',
                    privacyLevel: 'Complete Anonymity',
                    tokenDuration: '1 hour'
                },
                endpoints: {
                    generateChallenge: 'GET /api/auth/zkp-challenge',
                    verifyProof: 'POST /api/auth/verify-zkp',
                    premiumContent: 'GET /api/premium/content',
                    premiumStatus: 'GET /api/premium/status',
                    premiumDashboard: 'GET /api/premium/dashboard'
                }
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('💥 Service info error:', error);
        res.status(500).json({
            success: false,
            error: 'Service Info Error',
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
//# sourceMappingURL=premium.routes.js.map