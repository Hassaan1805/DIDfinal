import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { adminRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  assignBadge,
  BADGE_DEFINITIONS,
  BadgeType,
  createEmployee,
  CreateEmployeeInput,
  deactivateEmployee,
  getEmployeeById,
  isValidDID,
  isValidEthereumAddress,
  listEmployees,
  reactivateEmployee,
  updateEmployee,
  UpdateEmployeeInput,
} from '../services/employeeDirectory';
import {
  enrichEmployeeWithOnChainProfile,
  getEmployeeOnChainProfile,
} from '../services/employeeOnChainRegistry';
import { sepoliaService } from '../services/SepoliaService';
import {
  getCredentialStatus,
  getLatestCredentialJwtForDid,
  registerIssuedCredential,
  revokeCredential,
  storeIssuedCredentialJwt,
} from '../services/credentialStatus.service';
import { issueEmploymentVcJwt } from '../services/vcJwt.service';
import {
  getVerifierProfile,
  VerifierClaimKey,
  listVerifierProfiles,
  resetVerifierProfile,
  setVerifierProfileActive,
  upsertVerifierProfile,
  updateVerifierProfile,
} from '../services/verifierProfiles.service';

const router = Router();
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

interface AdminJwtPayload extends jwt.JwtPayload {
  role?: string;
  badge?: string;
  permissions?: string[];
  scope?: string | string[];
  admin?: boolean;
}

/**
 * SECURITY: No fallback tokens - all must come from environment variables
 */
const getAllowedAdminTokens = (): Set<string> => {
  const configured = [
    process.env.ADMIN_TOKEN,
    ...(process.env.ADMIN_TOKENS || '').split(','),
  ]
    .map((token) => (token ?? '').trim())
    .filter((token): token is string => token.length >= 32);

  // SECURITY: No hardcoded fallback tokens
  return new Set(configured);
};

const hasAdminClaims = (decoded: AdminJwtPayload): boolean => {
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

  if (
    permissions.includes('users:manage')
    || permissions.includes('badges:issue')
    || permissions.includes('admin:*')
  ) {
    return true;
  }

  const scopes = Array.isArray(decoded.scope)
    ? decoded.scope
    : typeof decoded.scope === 'string'
      ? decoded.scope.split(' ')
      : [];

  return scopes.some((scope) => ['admin', 'admin:full'].includes(scope.toLowerCase()));
};

const requireAdminPermissions = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No authorization token provided',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Admin token is empty',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const allowedTokens = getAllowedAdminTokens();
  if (allowedTokens.has(token)) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    if (!hasAdminClaims(decoded)) {
      res.status(403).json({
        success: false,
        error: 'Token is valid but does not include admin permissions',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: 'Invalid admin token',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      timestamp: new Date().toISOString(),
    });
    return;
  }
};

// Apply rate limiting to all admin routes
router.use(adminRateLimiter);

router.get('/badges', requireAdminPermissions, (_req: Request, res: Response): void => {
  const badges = Object.values(BADGE_DEFINITIONS);
  const response: ApiResponse<typeof badges> = {
    success: true,
    data: badges,
    message: 'Badge definitions retrieved successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

router.get('/employees', requireAdminPermissions, async (_req: Request, res: Response): Promise<void> => {
  try {
    const employees = await Promise.all(
      listEmployees().map(async (employee) => {
        try {
          const onChain = await enrichEmployeeWithOnChainProfile(employee);
          return {
            ...onChain,
            challengeFingerprint: onChain.didRegistrationTxHash,
            adminGasPayerAddress: sepoliaService.getGasPayerAddress(),
            adminGasPayerEtherscanUrl: sepoliaService.getGasPayerEtherscanUrl(),
            onChainStatus: 'ready',
          };
        } catch (error: any) {
          return {
            ...employee,
            challengeFingerprint: undefined,
            adminGasPayerAddress: sepoliaService.getGasPayerAddress(),
            adminGasPayerEtherscanUrl: sepoliaService.getGasPayerEtherscanUrl(),
            onChainStatus: 'pending',
            onChainError: error?.message || 'On-chain registration unavailable',
          };
        }
      })
    );

    const response: ApiResponse<typeof employees> = {
      success: true,
      data: employees,
      message: 'Employees retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to retrieve employees',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * Public employee directory for wallet synchronization
 * Returns only non-sensitive employee metadata for active employees.
 */
router.get('/directory', async (_req: Request, res: Response): Promise<void> => {
  try {
    const employees = listEmployees()
      .filter((employee) => employee.active)
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        did: employee.did,
        role: employee.badge,
        department: employee.department,
        email: employee.email,
      }));

    const response: ApiResponse<typeof employees> = {
      success: true,
      data: employees,
      message: 'Public employee directory retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to retrieve public employees',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * Public credential pickup endpoint for wallet apps.
 * Returns the latest issued credential JWT for a given DID so the wallet can
 * import it automatically on startup — no admin auth required.
 */
router.get('/credential-for-did', (req: Request, res: Response): void => {
  const did = typeof req.query.did === 'string' ? req.query.did.trim() : '';

  if (!did) {
    res.status(400).json({
      success: false,
      error: 'did query parameter is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const delivery = getLatestCredentialJwtForDid(did);

  if (!delivery) {
    res.status(404).json({
      success: false,
      error: 'No credential issued for this DID',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    success: true,
    data: {
      jwt: delivery.jwt,
      credentialId: delivery.credentialId,
      employeeId: delivery.employeeId,
      issuedAt: delivery.issuedAt,
      expiresAt: delivery.expiresAt,
    },
    timestamp: new Date().toISOString(),
  });
});

router.post('/employees', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,
      name,
      department,
      email,
      address,
      did,
      badge,
      registerOnChain,
    } = req.body as CreateEmployeeInput & { registerOnChain?: boolean };

    if (!id || !name || !department || !email || !address) {
      res.status(400).json({
        success: false,
        error: 'id, name, department, email, and address are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!ethers.isAddress(address)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum wallet address',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (did && !did.toLowerCase().startsWith('did:ethr:')) {
      res.status(400).json({
        success: false,
        error: 'DID must use did:ethr method',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const createdEmployee = createEmployee({
      id,
      name,
      department,
      email,
      address,
      did,
      badge,
    });

    // Respond immediately — on-chain registration runs in the background
    // to avoid Vite proxy timeouts during Sepolia tx mining (can take 30+ s).
    res.status(201).json({
      success: true,
      data: {
        employee: createdEmployee,
        onChainRegistration: {
          attempted: registerOnChain,
          pending: registerOnChain,
          success: false,
          reason: registerOnChain ? 'DID registration submitted in background' : 'Skipped by request',
        },
      },
      message: `Employee ${createdEmployee.id} created successfully`,
      timestamp: new Date().toISOString(),
    });

    if (registerOnChain) {
      enrichEmployeeWithOnChainProfile(createdEmployee)
        .then((onChainEmployee) => {
          console.log(`✅ On-chain DID registered for ${createdEmployee.id}: ${onChainEmployee.didRegistrationTxHash}`);
        })
        .catch((err: any) => {
          console.warn(`⚠️ On-chain registration failed for ${createdEmployee.id}:`, err?.message);
        });
    }
  } catch (error: any) {
    const message = error?.message || 'Failed to create employee';
    const status = message.includes('already') ? 409 : 400;

    res.status(status).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/employee/:employeeId', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const employee = getEmployeeById(employeeId);

    if (!employee) {
      res.status(404).json({
        success: false,
        error: 'Employee not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let onChainEmployee: any;
    try {
      onChainEmployee = await enrichEmployeeWithOnChainProfile(employee);
    } catch (error: any) {
      onChainEmployee = {
        ...employee,
        onChainStatus: 'pending',
        onChainError: error?.message || 'On-chain profile unavailable',
      };
    }
    const latest = getEmployeeOnChainProfile(onChainEmployee.id);

    type EmployeeDetailsResponse = typeof onChainEmployee & {
      adminGasPayerAddress: string;
      adminGasPayerEtherscanUrl: string;
      latestAuthRecordTxHash?: string;
      latestAuthVerifyTxHash?: string;
    };

    const response: ApiResponse<EmployeeDetailsResponse> = {
      success: true,
      data: {
        ...onChainEmployee,
        adminGasPayerAddress: sepoliaService.getGasPayerAddress(),
        adminGasPayerEtherscanUrl: sepoliaService.getGasPayerEtherscanUrl(),
        latestAuthRecordTxHash: latest?.lastAuthRecordTxHash,
        latestAuthVerifyTxHash: latest?.lastAuthVerifyTxHash,
      },
      message: 'Employee details retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to retrieve employee details',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

router.patch('/employees/:employeeId/badge', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const { badge } = req.body as { badge?: BadgeType };

    if (!badge) {
      res.status(400).json({
        success: false,
        error: 'badge is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!Object.keys(BADGE_DEFINITIONS).includes(badge)) {
      res.status(400).json({
        success: false,
        error: `Invalid badge. Allowed: ${Object.keys(BADGE_DEFINITIONS).join(', ')}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Update badge in-memory only (no blockchain transaction needed)
    const updatedEmployee = assignBadge(employeeId, badge);
    
    // Get existing on-chain profile without trying to register again
    const existing = getEmployeeOnChainProfile(updatedEmployee.id);
    const onChainEmployee = existing 
      ? { ...updatedEmployee, ...existing }
      : updatedEmployee;
    
    const badgeDefinition = BADGE_DEFINITIONS[badge];

    const response: ApiResponse<{ employee: typeof onChainEmployee; badge: typeof badgeDefinition }> = {
      success: true,
      data: {
        employee: onChainEmployee,
        badge: badgeDefinition,
      },
      message: `Badge ${badge} assigned to ${onChainEmployee.name}`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const status = error?.message === 'Employee not found' ? 404 : 400;
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to assign badge',
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(response);
  }
});

// PATCH /api/admin/employees/:employeeId - Update employee details
router.patch('/employees/:employeeId', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const { name, department, email, badge } = req.body as UpdateEmployeeInput;

    // Check if at least one field is being updated
    if (name === undefined && department === undefined && email === undefined && badge === undefined) {
      res.status(400).json({
        success: false,
        error: 'At least one field (name, department, email, badge) must be provided',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updatedEmployee = updateEmployee(employeeId, { name, department, email, badge });
    
    // Get on-chain profile if exists
    let onChainEmployee: any = updatedEmployee;
    try {
      const existing = getEmployeeOnChainProfile(updatedEmployee.id);
      if (existing) {
        onChainEmployee = { ...updatedEmployee, ...existing };
      }
    } catch {
      // On-chain profile not available, continue with base employee
    }

    const response: ApiResponse = {
      success: true,
      data: {
        employee: onChainEmployee,
      },
      message: `Employee ${updatedEmployee.id} updated successfully`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const status = error?.message === 'Employee not found' ? 404 : 400;
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to update employee',
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(response);
  }
});

// POST /api/admin/employees/:employeeId/deactivate - Deactivate an employee
router.post('/employees/:employeeId/deactivate', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const deactivatedEmployee = deactivateEmployee(employeeId);

    const response: ApiResponse = {
      success: true,
      data: {
        employee: deactivatedEmployee,
      },
      message: `Employee ${deactivatedEmployee.id} has been deactivated`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const status = error?.message === 'Employee not found' ? 404 : 400;
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to deactivate employee',
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(response);
  }
});

// POST /api/admin/employees/:employeeId/reactivate - Reactivate an employee
router.post('/employees/:employeeId/reactivate', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const reactivatedEmployee = reactivateEmployee(employeeId);

    const response: ApiResponse = {
      success: true,
      data: {
        employee: reactivatedEmployee,
      },
      message: `Employee ${reactivatedEmployee.id} has been reactivated`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const status = error?.message === 'Employee not found' ? 404 : 400;
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to reactivate employee',
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(response);
  }
});

// POST /api/admin/employees/:employeeId/register-onchain - Register employee DID on-chain
router.post('/employees/:employeeId/register-onchain', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const employee = getEmployeeById(employeeId);

    if (!employee) {
      res.status(404).json({
        success: false,
        error: 'Employee not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!employee.active) {
      res.status(400).json({
        success: false,
        error: 'Cannot register on-chain for deactivated employee',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const onChainEmployee = await enrichEmployeeWithOnChainProfile(employee);

    const response: ApiResponse = {
      success: true,
      data: {
        employee: onChainEmployee,
        onChainRegistration: {
          success: true,
          txHash: onChainEmployee.didRegistrationTxHash,
          blockNumber: onChainEmployee.didRegistrationBlockNumber,
          timestamp: onChainEmployee.didRegistrationTimestamp,
        },
      },
      message: `Employee ${employee.id} DID registered on-chain successfully`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to register employee on-chain',
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

router.post('/issue-credential', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetEmployeeId, badge } = req.body as { targetEmployeeId?: string; badge?: BadgeType };

    if (!targetEmployeeId) {
      res.status(400).json({
        success: false,
        error: 'Target employee ID is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const selectedBadge = (badge || 'employee') as BadgeType;
    const updatedEmployee = assignBadge(targetEmployeeId, selectedBadge);

    // Use cached on-chain profile if available — avoids Sepolia round-trip in the request path
    const cachedProfile = getEmployeeOnChainProfile(targetEmployeeId);
    const hashId = cachedProfile?.hashId ?? updatedEmployee.hashId;
    const didRegistrationTxHash = cachedProfile?.didRegistrationTxHash ?? '';

    const expiresAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString();
    const vcJwt = issueEmploymentVcJwt({
      issuerDid: 'did:ethr:enterprise-admin',
      subjectDid: updatedEmployee.did,
      employeeId: updatedEmployee.id,
      name: updatedEmployee.name,
      badge: updatedEmployee.badge,
      permissions: updatedEmployee.permissions,
      hashId,
      didRegistrationTxHash,
      expiresAt,
    });

    registerIssuedCredential({
      credentialId: vcJwt.credentialId,
      issuer: 'did:ethr:enterprise-admin',
      subjectDid: updatedEmployee.did,
      issuedAt: vcJwt.issuanceDate,
      expiresAt,
    });

    // Store JWT for wallet delivery — wallet fetches this on startup
    storeIssuedCredentialJwt({
      subjectDid: updatedEmployee.did,
      jwt: vcJwt.jwt,
      credentialId: vcJwt.credentialId,
      employeeId: updatedEmployee.id,
      issuedAt: vcJwt.issuanceDate,
      expiresAt,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        credential: {
          id: vcJwt.credentialId,
          jwt: vcJwt.jwt,
          issuer: 'did:ethr:enterprise-admin',
          issuanceDate: vcJwt.issuanceDate,
          expirationDate: expiresAt,
          credentialSubject: {
            id: updatedEmployee.did,
            employeeId: updatedEmployee.id,
            name: updatedEmployee.name,
            badge: updatedEmployee.badge,
            permissions: updatedEmployee.permissions,
            hashId,
            didRegistrationTxHash,
          },
        },
        employee: updatedEmployee,
      },
      message: 'Digital badge credential issued successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);

    // Register on Sepolia in the background (non-blocking — avoids proxy timeout)
    enrichEmployeeWithOnChainProfile(updatedEmployee)
      .then((e) => console.log(`✅ On-chain DID registered for credential ${updatedEmployee.id}: ${e.didRegistrationTxHash}`))
      .catch((err) => console.warn(`⚠️ Background on-chain registration failed for ${updatedEmployee.id}:`, err?.message));
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to issue credential',
      timestamp: new Date().toISOString(),
    };

    res.status(400).json(response);
  }
});

router.get('/credentials/:credentialId/status', requireAdminPermissions, (req: Request, res: Response): void => {
  const { credentialId } = req.params;
  const status = getCredentialStatus(credentialId);

  const response: ApiResponse = {
    success: true,
    data: status,
    message: 'Credential status retrieved successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

router.post('/credentials/:credentialId/revoke', requireAdminPermissions, (req: Request, res: Response): void => {
  const { credentialId } = req.params;
  const { reason, revokedBy } = req.body as { reason?: string; revokedBy?: string };

  const record = revokeCredential({
    credentialId,
    reason,
    revokedBy: revokedBy || 'admin-api',
  });

  const response: ApiResponse = {
    success: true,
    data: record,
    message: 'Credential revoked successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

router.get('/verifier-profiles', requireAdminPermissions, (req: Request, res: Response): void => {
  const includeInactive = req.query.includeInactive !== 'false';
  const profiles = listVerifierProfiles({ includeInactive });

  const response: ApiResponse = {
    success: true,
    data: profiles,
    message: 'Verifier profiles retrieved successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

router.post('/verifier-profiles', requireAdminPermissions, (req: Request, res: Response): void => {
  try {
    const body = req.body as {
      verifierId?: string;
      organizationId?: string;
      organizationName?: string;
      active?: boolean;
      policyVersion?: number;
      requireCredential?: boolean;
      allowedBadges?: BadgeType[];
      allowedRequestTypes?: Array<'portal_access' | 'general_auth'>;
      requiredClaimsByRequestType?: Partial<Record<'portal_access' | 'general_auth', VerifierClaimKey[]>>;
    };

    if (!body.verifierId || !body.organizationId || !body.organizationName) {
      res.status(400).json({
        success: false,
        error: 'verifierId, organizationId and organizationName are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const existing = getVerifierProfile(body.verifierId);
    const profile = upsertVerifierProfile({
      verifierId: body.verifierId,
      organizationId: body.organizationId,
      organizationName: body.organizationName,
      active: body.active,
      policyVersion: body.policyVersion,
      requireCredential: body.requireCredential,
      allowedBadges: body.allowedBadges,
      allowedRequestTypes: body.allowedRequestTypes,
      requiredClaimsByRequestType: body.requiredClaimsByRequestType,
    });

    const response: ApiResponse = {
      success: true,
      data: profile,
      message: existing ? 'Verifier profile updated successfully' : 'Verifier profile created successfully',
      timestamp: new Date().toISOString(),
    };

    res.status(existing ? 200 : 201).json(response);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error?.message || 'Failed to save verifier profile',
      timestamp: new Date().toISOString(),
    });
  }
});

router.patch('/verifier-profiles/:verifierId', requireAdminPermissions, (req: Request, res: Response): void => {
  try {
    const { verifierId } = req.params;
    const body = req.body as {
      organizationId?: string;
      organizationName?: string;
      active?: boolean;
      policyVersion?: number;
      requireCredential?: boolean;
      allowedBadges?: BadgeType[];
      allowedRequestTypes?: Array<'portal_access' | 'general_auth'>;
      requiredClaimsByRequestType?: Partial<Record<'portal_access' | 'general_auth', VerifierClaimKey[]>>;
    };

    const profile = updateVerifierProfile(verifierId, {
      organizationId: body.organizationId,
      organizationName: body.organizationName,
      active: body.active,
      policyVersion: body.policyVersion,
      requireCredential: body.requireCredential,
      allowedBadges: body.allowedBadges,
      allowedRequestTypes: body.allowedRequestTypes,
      requiredClaimsByRequestType: body.requiredClaimsByRequestType,
    });

    const response: ApiResponse = {
      success: true,
      data: profile,
      message: 'Verifier profile patched successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const status = String(error?.message || '').startsWith('Unknown verifier profile') ? 404 : 400;
    res.status(status).json({
      success: false,
      error: error?.message || 'Failed to patch verifier profile',
      timestamp: new Date().toISOString(),
    });
  }
});

router.patch('/verifier-profiles/:verifierId/active', requireAdminPermissions, (req: Request, res: Response): void => {
  try {
    const { verifierId } = req.params;
    const { active } = req.body as { active?: boolean };

    if (typeof active !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'active must be a boolean',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const profile = setVerifierProfileActive(verifierId, active);
    const response: ApiResponse = {
      success: true,
      data: profile,
      message: `Verifier profile ${active ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const status = String(error?.message || '').startsWith('Unknown verifier profile') ? 404 : 400;
    res.status(status).json({
      success: false,
      error: error?.message || 'Failed to update verifier profile status',
      timestamp: new Date().toISOString(),
    });
  }
});

router.delete('/verifier-profiles/:verifierId/runtime-override', requireAdminPermissions, (req: Request, res: Response): void => {
  const { verifierId } = req.params;
  const removed = resetVerifierProfile(verifierId);

  if (!removed) {
    res.status(404).json({
      success: false,
      error: 'No runtime override found for verifier profile',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const current = getVerifierProfile(verifierId);
  const response: ApiResponse = {
    success: true,
    data: current || null,
    message: 'Verifier profile runtime override reset successfully',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

export default router;
