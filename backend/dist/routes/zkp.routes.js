"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zkproof_service_1 = require("../services/zkproof.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const zkProofService = new zkproof_service_1.ZKProofService();
const ANONYMOUS_JWT_SECRET = process.env.ANONYMOUS_JWT_SECRET || 'zkp-anonymous-secret-2025';
router.post('/verify-zkp', async (req, res) => {
    try {
        console.log('🔐 Received ZK-proof verification request');
        console.log('Request body keys:', Object.keys(req.body));
        const { proof, publicSignals, challengeId, proofType } = req.body;
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
        console.log('🔍 Starting ZK-proof verification...');
        const verificationStartTime = Date.now();
        const isValidProof = await zkProofService.verifyNFTOwnershipProof(proof, publicSignals);
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
        const tokenPayload = {
            accessLevel: 'premium_content',
            grantType: 'zkp_nft_ownership',
            nftCollection: 'corporate_excellence_2025',
            proofVerified: true,
            verificationTime: verificationTime,
            issuedAt: Math.floor(Date.now() / 1000),
            anonymous: true,
            privacyPreserving: true,
            zeroKnowledge: true
        };
        const anonymousToken = jsonwebtoken_1.default.sign(tokenPayload, ANONYMOUS_JWT_SECRET, {
            expiresIn: '1h',
            issuer: 'decentralized-trust-platform',
            audience: 'premium-content-access',
            subject: 'anonymous-nft-holder'
        });
        console.log('🎫 Anonymous premium access token generated');
        console.log('   - Access level: premium_content');
        console.log('   - Expires in: 1 hour');
        console.log('   - Privacy: Complete anonymity maintained');
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
        console.log('🔐 Anonymous premium access granted');
        console.log('   - Proof verification: ✅ Valid');
        console.log('   - Privacy level: 🔒 Zero-knowledge');
        console.log('   - Access duration: ⏰ 1 hour');
    }
    catch (error) {
        console.error('💥 ZK-proof verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Verification failed',
            message: 'An error occurred during proof verification',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/zkp-challenge', (req, res) => {
    try {
        console.log('🎯 Generating ZK-proof authentication challenge');
        const challenge = zkProofService.generateAuthChallenge();
        console.log(`✅ Challenge generated: ${challenge.challengeId}`);
        return res.status(200).json({
            success: true,
            data: challenge,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('💥 Challenge generation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Challenge generation failed',
            message: 'Could not generate authentication challenge',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/verify-anonymous-token', (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Missing token',
                timestamp: new Date().toISOString()
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, ANONYMOUS_JWT_SECRET);
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Anonymous token verification failed:', errorMessage);
        return res.status(403).json({
            success: false,
            error: 'Invalid or expired token',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/verify-zkp-session', auth_middleware_1.verifyAuthToken, async (req, res) => {
    try {
        console.log('🔐 Session-based ZK-proof verification initiated');
        console.log('   - User address:', req.user?.address?.substring(0, 10) + '...');
        console.log('   - Current access level:', req.user?.accessLevel);
        const { proof, publicSignals, proofType, challengeId } = req.body;
        if (!proof || !publicSignals) {
            console.log('❌ Missing required ZK-proof data');
            res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Both proof and publicSignals are required',
                timestamp: new Date().toISOString()
            });
            return;
        }
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
        console.log('🔍 Starting session-based ZK-proof verification...');
        const verificationStartTime = Date.now();
        const isValidProof = await zkProofService.verifyNFTOwnershipProof(proof, publicSignals);
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
        const premiumToken = (0, auth_middleware_1.upgradeSessionToPremium)(req.user.address, req.user.challengeId);
        console.log('🎫 Session upgraded to premium access');
        console.log('   - Previous access level: standard');
        console.log('   - New access level: premium');
        console.log('   - Upgraded at:', new Date().toISOString());
        res.status(200).json({
            success: true,
            message: 'Session upgraded to premium access successfully',
            data: {
                token: premiumToken,
                accessLevel: 'premium',
                upgradeType: 'zkp_session_upgrade',
                previousAccessLevel: req.user?.accessLevel || 'standard',
                upgradedAt: new Date().toISOString(),
                verificationDetails: {
                    proofValid: true,
                    verificationTime: `${verificationTime}ms`,
                    sessionBased: true,
                    userAddress: req.user?.address?.substring(0, 10) + '...'
                }
            },
            timestamp: new Date().toISOString()
        });
        console.log('🔐 Premium session upgrade completed');
        console.log('   - User:', req.user?.address?.substring(0, 10) + '...');
        console.log('   - Proof verification: ✅ Valid');
        console.log('   - Access level: ⬆️  Upgraded to premium');
        console.log('   - Session duration: ⏰ 24 hours');
    }
    catch (error) {
        console.error('💥 Session-based ZK-proof verification error:', error);
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
exports.default = router;
//# sourceMappingURL=zkp.routes.js.map