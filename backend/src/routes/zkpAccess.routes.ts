import { Router, Request, Response } from 'express';
import { zkAccessControl, AccessLevel } from '../services/zkAccessControl.service';

/**
 * ZK Access Control Routes
 * 
 * Endpoints for tiered access control based on Zero-Knowledge proofs.
 * Supports multiple proof types for different access levels.
 */

const router = Router();

/**
 * GET /api/zkp/proof-types
 * Get available proof types and their requirements
 */
router.get('/proof-types', (_req: Request, res: Response): void => {
  try {
    const requirements = zkAccessControl.getProofRequirements();
    
    res.json({
      success: true,
      data: {
        proofTypes: requirements,
        accessLevels: ['public', 'basic', 'premium', 'enterprise'],
        description: 'Available ZK proof types for access control'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get proof types',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/zkp/access-rules
 * Get content access rules
 */
router.get('/access-rules', (_req: Request, res: Response): void => {
  try {
    const rules = zkAccessControl.getContentAccessRules();
    
    res.json({
      success: true,
      data: {
        rules,
        description: 'Content access requirements for different resources'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get access rules',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/zkp/challenge
 * Generate a challenge for a specific proof type
 */
router.post('/challenge', (req: Request, res: Response): void => {
  try {
    const { proofType } = req.body;

    if (!proofType) {
      res.status(400).json({
        success: false,
        error: 'proofType is required',
        availableTypes: zkAccessControl.getProofRequirements().map(r => r.proofType),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { challengeId, challenge } = zkAccessControl.generateChallenge(proofType);

    res.json({
      success: true,
      data: {
        challengeId,
        ...challenge
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/zkp/verify-access
 * Verify a ZK-proof and grant appropriate access level
 */
router.post('/verify-access', async (req: Request, res: Response): Promise<void> => {
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

    const result = await zkAccessControl.verifyAndGrantAccess(
      challengeId,
      proof,
      publicSignals
    );

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
        accessLevel: result.grant!.level,
        grantType: result.grant!.grantType,
        token: result.token,
        expiresIn: '1h',
        grant: {
          grantId: result.grant!.grantId,
          issuedAt: new Date(result.grant!.issuedAt * 1000).toISOString(),
          expiresAt: new Date(result.grant!.expiresAt * 1000).toISOString()
        },
        privacy: {
          anonymous: true,
          zeroKnowledge: true,
          identityPreserving: true
        }
      },
      message: `Access granted: ${result.grant!.level} level`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/zkp/check-access
 * Check if a token has access to a specific resource
 */
router.post('/check-access', (req: Request, res: Response): void => {
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
        availableResources: zkAccessControl.getContentAccessRules().map(r => r.resourceId),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = authHeader.substring(7);
    const result = zkAccessControl.checkResourceAccess(token, resourceId);

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Access check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/zkp/content/:level
 * Get tiered content based on access level
 */
router.get('/content/:level', (req: Request, res: Response): void => {
  try {
    const { level } = req.params;
    const authHeader = req.headers.authorization;

    // Public content doesn't require auth
    if (level === 'public') {
      const content = zkAccessControl.getTieredContent('public');
      res.json({
        success: true,
        data: content,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Other levels require valid token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization token required for non-public content',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token and check access level
    const dummyResource = level === 'enterprise' ? 'api-full-access' : 
                          level === 'premium' ? 'executive-insights' : 
                          'analytics-dashboard';
    
    const accessResult = zkAccessControl.checkResourceAccess(token, dummyResource);
    
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

    const content = zkAccessControl.getTieredContent(level as AccessLevel);
    
    res.json({
      success: true,
      data: content,
      privacy: {
        anonymous: true,
        accessGrantedVia: 'zk-proof'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get content',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/zkp/my-access
 * Get current user's access level and available resources
 */
router.get('/my-access', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.json({
        success: true,
        data: {
          accessLevel: 'public',
          authenticated: false,
          availableResources: zkAccessControl.getContentAccessRules()
            .filter(r => r.requiredLevel === 'public')
            .map(r => r.resourceId)
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = authHeader.substring(7);
    const rules = zkAccessControl.getContentAccessRules();
    
    // Check access to each resource
    const accessibleResources: string[] = [];
    const restrictedResources: Array<{ resourceId: string; reason: string }> = [];
    let currentLevel: AccessLevel = 'public';

    for (const rule of rules) {
      const result = zkAccessControl.checkResourceAccess(token, rule.resourceId);
      if (result.hasAccess) {
        accessibleResources.push(rule.resourceId);
        if (result.grant && result.grant.level !== currentLevel) {
          currentLevel = result.grant.level;
        }
      } else {
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
        content: zkAccessControl.getTieredContent(currentLevel)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to check access',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/zkp/cleanup
 * Cleanup expired challenges and grants (admin only in production)
 */
router.post('/cleanup', (_req: Request, res: Response): void => {
  try {
    const result = zkAccessControl.cleanup();
    
    res.json({
      success: true,
      data: result,
      message: `Cleaned up ${result.challengesRemoved} challenges and ${result.grantsRemoved} grants`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
