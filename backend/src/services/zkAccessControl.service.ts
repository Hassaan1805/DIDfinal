import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ZKProofService } from './zkproof.service';

/**
 * ZK Access Control Service
 * 
 * Manages tiered access based on Zero-Knowledge proofs.
 * Supports multiple proof types for different access levels.
 */

// Access level definitions
export type AccessLevel = 'public' | 'basic' | 'premium' | 'enterprise';

export interface AccessGrant {
  level: AccessLevel;
  grantId: string;
  grantType: string;
  issuedAt: number;
  expiresAt: number;
  anonymous: boolean;
  proofType?: string;
  claims?: Record<string, any>;
}

export interface ProofRequirement {
  proofType: string;
  description: string;
  requiredSignals: string[];
  accessLevel: AccessLevel;
}

// Proof type configurations
const PROOF_REQUIREMENTS: Record<string, ProofRequirement> = {
  NFT_OWNERSHIP: {
    proofType: 'NFT_OWNERSHIP',
    description: 'Proves ownership of Corporate Excellence 2025 NFT',
    requiredSignals: ['isValid', 'nftContractAddress', 'merkleRoot'],
    accessLevel: 'premium'
  },
  CORPORATE_CREDENTIAL: {
    proofType: 'CORPORATE_CREDENTIAL',
    description: 'Proves possession of valid corporate credential without revealing details',
    requiredSignals: ['isValid', 'issuerCommitment', 'credentialType'],
    accessLevel: 'enterprise'
  },
  AGE_VERIFICATION: {
    proofType: 'AGE_VERIFICATION',
    description: 'Proves age is above threshold without revealing exact age',
    requiredSignals: ['isAboveThreshold', 'threshold'],
    accessLevel: 'basic'
  },
  MEMBERSHIP_PROOF: {
    proofType: 'MEMBERSHIP_PROOF',
    description: 'Proves membership in a set without revealing identity',
    requiredSignals: ['isMember', 'groupCommitment'],
    accessLevel: 'premium'
  }
};

// Content access requirements
interface ContentAccessRule {
  resourceId: string;
  resourceType: string;
  requiredLevel: AccessLevel;
  requiredProofs?: string[];
  description: string;
}

const CONTENT_ACCESS_RULES: ContentAccessRule[] = [
  {
    resourceId: 'executive-insights',
    resourceType: 'document',
    requiredLevel: 'premium',
    requiredProofs: ['NFT_OWNERSHIP'],
    description: 'Executive insights and strategies'
  },
  {
    resourceId: 'api-full-access',
    resourceType: 'api',
    requiredLevel: 'enterprise',
    requiredProofs: ['CORPORATE_CREDENTIAL'],
    description: 'Full API access with all endpoints'
  },
  {
    resourceId: 'member-directory',
    resourceType: 'data',
    requiredLevel: 'premium',
    requiredProofs: ['NFT_OWNERSHIP', 'MEMBERSHIP_PROOF'],
    description: 'Access to member directory'
  },
  {
    resourceId: 'analytics-dashboard',
    resourceType: 'dashboard',
    requiredLevel: 'basic',
    description: 'Basic analytics dashboard'
  }
];

// In-memory storage for access grants (should be Redis in production)
const accessGrants = new Map<string, AccessGrant>();
const challengeStore = new Map<string, { expiresAt: number; proofType: string }>();

export class ZKAccessControlService {
  private zkProofService: ZKProofService;
  private jwtSecret: string;

  constructor() {
    this.zkProofService = new ZKProofService();
    this.jwtSecret = process.env.ANONYMOUS_JWT_SECRET || process.env.JWT_SECRET || 'development-only-zkp-secret';
  }

  /**
   * Generate a challenge for a specific proof type
   */
  generateChallenge(proofType: string): { challengeId: string; challenge: any } {
    const requirement = PROOF_REQUIREMENTS[proofType];
    if (!requirement) {
      throw new Error(`Unknown proof type: ${proofType}`);
    }

    const challengeId = uuidv4();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    const challenge = {
      challengeId,
      proofType,
      requiredSignals: requirement.requiredSignals,
      accessLevel: requirement.accessLevel,
      expiresAt,
      timestamp: Date.now(),
      instructions: {
        description: requirement.description,
        step1: 'Generate the ZK-proof using your wallet',
        step2: `Submit proof to /api/zkp/verify-access`,
        step3: `Receive anonymous ${requirement.accessLevel} access token`,
        privacy: 'Your identity remains completely anonymous'
      }
    };

    challengeStore.set(challengeId, { expiresAt, proofType });

    return { challengeId, challenge };
  }

  /**
   * Verify a ZK-proof and grant appropriate access
   */
  async verifyAndGrantAccess(
    challengeId: string,
    proof: any,
    publicSignals: string[]
  ): Promise<{ success: boolean; grant?: AccessGrant; token?: string; error?: string }> {
    // Validate challenge
    const challenge = challengeStore.get(challengeId);
    if (!challenge) {
      return { success: false, error: 'Invalid or expired challenge' };
    }

    if (Date.now() > challenge.expiresAt) {
      challengeStore.delete(challengeId);
      return { success: false, error: 'Challenge has expired' };
    }

    // Verify the proof
    const isValid = await this.zkProofService.verifyNFTOwnershipProof(proof, publicSignals);
    if (!isValid) {
      return { success: false, error: 'Proof verification failed' };
    }

    // Get requirement for this proof type
    const requirement = PROOF_REQUIREMENTS[challenge.proofType];
    if (!requirement) {
      return { success: false, error: 'Unknown proof type' };
    }

    // Create access grant
    const grantId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const grant: AccessGrant = {
      level: requirement.accessLevel,
      grantId,
      grantType: `zkp_${challenge.proofType.toLowerCase()}`,
      issuedAt: now,
      expiresAt: now + 3600, // 1 hour
      anonymous: true,
      proofType: challenge.proofType
    };

    // Store grant
    accessGrants.set(grantId, grant);

    // Generate JWT token
    const token = jwt.sign(
      {
        grantId,
        accessLevel: grant.level,
        grantType: grant.grantType,
        proofType: grant.proofType,
        anonymous: true,
        privacyPreserving: true,
        zeroKnowledge: true
      },
      this.jwtSecret,
      {
        expiresIn: '1h',
        issuer: 'decentralized-trust-platform',
        audience: `${grant.level}-access`,
        subject: 'anonymous-zkp-holder'
      }
    );

    // Clean up challenge
    challengeStore.delete(challengeId);

    return { success: true, grant, token };
  }

  /**
   * Check if a token has access to a specific resource
   */
  checkResourceAccess(token: string, resourceId: string): { 
    hasAccess: boolean; 
    reason?: string;
    grant?: AccessGrant;
  } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Find resource rule
      const rule = CONTENT_ACCESS_RULES.find(r => r.resourceId === resourceId);
      if (!rule) {
        return { hasAccess: false, reason: 'Resource not found' };
      }

      // Check access level
      const levelOrder: AccessLevel[] = ['public', 'basic', 'premium', 'enterprise'];
      const tokenLevel = decoded.accessLevel as AccessLevel;
      const requiredLevel = rule.requiredLevel;

      const tokenLevelIndex = levelOrder.indexOf(tokenLevel);
      const requiredLevelIndex = levelOrder.indexOf(requiredLevel);

      if (tokenLevelIndex < requiredLevelIndex) {
        return { 
          hasAccess: false, 
          reason: `Requires ${requiredLevel} access, you have ${tokenLevel}` 
        };
      }

      // Check specific proof requirements
      if (rule.requiredProofs && rule.requiredProofs.length > 0) {
        if (!rule.requiredProofs.includes(decoded.proofType)) {
          return {
            hasAccess: false,
            reason: `Requires proof type: ${rule.requiredProofs.join(' or ')}`
          };
        }
      }

      return { 
        hasAccess: true,
        grant: {
          level: tokenLevel,
          grantId: decoded.grantId,
          grantType: decoded.grantType,
          issuedAt: decoded.iat,
          expiresAt: decoded.exp,
          anonymous: decoded.anonymous,
          proofType: decoded.proofType
        }
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { hasAccess: false, reason: 'Token expired' };
      }
      return { hasAccess: false, reason: 'Invalid token' };
    }
  }

  /**
   * Get available proof types and their requirements
   */
  getProofRequirements(): ProofRequirement[] {
    return Object.values(PROOF_REQUIREMENTS);
  }

  /**
   * Get content access rules
   */
  getContentAccessRules(): ContentAccessRule[] {
    return CONTENT_ACCESS_RULES;
  }

  /**
   * Get tiered content based on access level
   */
  getTieredContent(accessLevel: AccessLevel): any {
    const content: Record<string, any> = {
      public: {
        title: 'Public Information',
        items: [
          'Platform overview',
          'Getting started guide',
          'Public documentation'
        ]
      }
    };

    if (['basic', 'premium', 'enterprise'].includes(accessLevel)) {
      content.basic = {
        title: 'Basic Member Content',
        items: [
          'Basic analytics dashboard',
          'Community forums access',
          'Standard support'
        ]
      };
    }

    if (['premium', 'enterprise'].includes(accessLevel)) {
      content.premium = {
        title: 'Premium Content',
        items: [
          'Executive insights and strategies',
          'Advanced analytics and reports',
          'Priority support channel',
          'Beta feature access',
          'Exclusive webinars'
        ],
        documents: [
          {
            title: 'Enterprise DID Implementation Guide',
            description: 'Comprehensive guide for enterprise DID deployment',
            accessLevel: 'premium'
          },
          {
            title: 'Zero-Knowledge Proof Patterns',
            description: 'Production-ready ZK-proof implementation strategies',
            accessLevel: 'premium'
          }
        ]
      };
    }

    if (accessLevel === 'enterprise') {
      content.enterprise = {
        title: 'Enterprise Content',
        items: [
          'Full API access',
          'Custom integrations support',
          'Dedicated account manager',
          'SLA guarantees',
          'On-premise deployment guides',
          'White-label solutions'
        ],
        apis: [
          { endpoint: '/api/enterprise/bulk-verify', description: 'Bulk credential verification' },
          { endpoint: '/api/enterprise/custom-circuits', description: 'Custom ZK circuit deployment' },
          { endpoint: '/api/enterprise/audit-logs', description: 'Full audit log access' }
        ]
      };
    }

    return {
      accessLevel,
      availableContent: content,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup expired challenges and grants
   */
  cleanup(): { challengesRemoved: number; grantsRemoved: number } {
    const now = Date.now();
    let challengesRemoved = 0;
    let grantsRemoved = 0;

    for (const [id, challenge] of challengeStore.entries()) {
      if (now > challenge.expiresAt) {
        challengeStore.delete(id);
        challengesRemoved++;
      }
    }

    const nowSeconds = Math.floor(now / 1000);
    for (const [id, grant] of accessGrants.entries()) {
      if (nowSeconds > grant.expiresAt) {
        accessGrants.delete(id);
        grantsRemoved++;
      }
    }

    return { challengesRemoved, grantsRemoved };
  }
}

// Export singleton instance
export const zkAccessControl = new ZKAccessControlService();
