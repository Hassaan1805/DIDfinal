"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zkAccessControl_service_1 = require("../services/zkAccessControl.service");
const router = (0, express_1.Router)();
router.get('/proof-types', (_req, res) => {
    try {
        const requirements = zkAccessControl_service_1.zkAccessControl.getProofRequirements();
        res.json({
            success: true,
            data: {
                proofTypes: requirements,
                accessLevels: ['public', 'basic', 'premium', 'enterprise'],
                description: 'Available ZK proof types for access control'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get proof types',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/access-rules', (_req, res) => {
    try {
        const rules = zkAccessControl_service_1.zkAccessControl.getContentAccessRules();
        res.json({
            success: true,
            data: {
                rules,
                description: 'Content access requirements for different resources'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get access rules',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/challenge', (req, res) => {
    try {
        const { proofType } = req.body;
        if (!proofType) {
            res.status(400).json({
                success: false,
                error: 'proofType is required',
                availableTypes: zkAccessControl_service_1.zkAccessControl.getProofRequirements().map(r => r.proofType),
                timestamp: new Date().toISOString()
            });
            return;
        }
        const { challengeId, challenge } = zkAccessControl_service_1.zkAccessControl.generateChallenge(proofType);
        res.json({
            success: true,
            data: {
                challengeId,
                ...challenge
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/verify-access', async (req, res) => {
    try {
        const { challengeId, proof, publicSignals } = req.body;
        if (!challengeId || !proof || !publicSignals) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: challengeId, proof, publicSignals',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const result = await zkAccessControl_service_1.zkAccessControl.verifyAndGrantAccess(challengeId, proof, publicSignals);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            });
            return;
        }
        res.json({
            success: true,
            data: {
                accessLevel: result.grant.level,
                grantType: result.grant.grantType,
                token: result.token,
                expiresIn: '1h',
                grant: {
                    grantId: result.grant.grantId,
                    issuedAt: new Date(result.grant.issuedAt * 1000).toISOString(),
                    expiresAt: new Date(result.grant.expiresAt * 1000).toISOString()
                },
                privacy: {
                    anonymous: true,
                    zeroKnowledge: true,
                    identityPreserving: true
                }
            },
            message: `Access granted: ${result.grant.level} level`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Verification failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/check-access', (req, res) => {
    try {
        const { resourceId } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authorization token required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (!resourceId) {
            res.status(400).json({
                success: false,
                error: 'resourceId is required',
                availableResources: zkAccessControl_service_1.zkAccessControl.getContentAccessRules().map(r => r.resourceId),
                timestamp: new Date().toISOString()
            });
            return;
        }
        const token = authHeader.substring(7);
        const result = zkAccessControl_service_1.zkAccessControl.checkResourceAccess(token, resourceId);
        if (!result.hasAccess) {
            res.status(403).json({
                success: false,
                hasAccess: false,
                reason: result.reason,
                timestamp: new Date().toISOString()
            });
            return;
        }
        res.json({
            success: true,
            hasAccess: true,
            data: {
                resourceId,
                accessLevel: result.grant?.level,
                grantType: result.grant?.grantType
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Access check failed',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/content/:level', (req, res) => {
    try {
        const { level } = req.params;
        const authHeader = req.headers.authorization;
        if (level === 'public') {
            const content = zkAccessControl_service_1.zkAccessControl.getTieredContent('public');
            res.json({
                success: true,
                data: content,
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authorization token required for non-public content',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const token = authHeader.substring(7);
        const dummyResource = level === 'enterprise' ? 'api-full-access' :
            level === 'premium' ? 'executive-insights' :
                'analytics-dashboard';
        const accessResult = zkAccessControl_service_1.zkAccessControl.checkResourceAccess(token, dummyResource);
        if (!accessResult.hasAccess) {
            res.status(403).json({
                success: false,
                error: 'Insufficient access level',
                reason: accessResult.reason,
                yourLevel: accessResult.grant?.level || 'none',
                requiredLevel: level,
                timestamp: new Date().toISOString()
            });
            return;
        }
        const content = zkAccessControl_service_1.zkAccessControl.getTieredContent(level);
        res.json({
            success: true,
            data: content,
            privacy: {
                anonymous: true,
                accessGrantedVia: 'zk-proof'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get content',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/my-access', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.json({
                success: true,
                data: {
                    accessLevel: 'public',
                    authenticated: false,
                    availableResources: zkAccessControl_service_1.zkAccessControl.getContentAccessRules()
                        .filter(r => r.requiredLevel === 'public')
                        .map(r => r.resourceId)
                },
                timestamp: new Date().toISOString()
            });
            return;
        }
        const token = authHeader.substring(7);
        const rules = zkAccessControl_service_1.zkAccessControl.getContentAccessRules();
        const accessibleResources = [];
        const restrictedResources = [];
        let currentLevel = 'public';
        for (const rule of rules) {
            const result = zkAccessControl_service_1.zkAccessControl.checkResourceAccess(token, rule.resourceId);
            if (result.hasAccess) {
                accessibleResources.push(rule.resourceId);
                if (result.grant && result.grant.level !== currentLevel) {
                    currentLevel = result.grant.level;
                }
            }
            else {
                restrictedResources.push({
                    resourceId: rule.resourceId,
                    reason: result.reason || 'Access denied'
                });
            }
        }
        res.json({
            success: true,
            data: {
                accessLevel: currentLevel,
                authenticated: true,
                anonymous: true,
                accessibleResources,
                restrictedResources,
                content: zkAccessControl_service_1.zkAccessControl.getTieredContent(currentLevel)
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check access',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/cleanup', (_req, res) => {
    try {
        const result = zkAccessControl_service_1.zkAccessControl.cleanup();
        res.json({
            success: true,
            data: result,
            message: `Cleaned up ${result.challengesRemoved} challenges and ${result.grantsRemoved} grants`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Cleanup failed',
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
//# sourceMappingURL=zkpAccess.routes.js.map