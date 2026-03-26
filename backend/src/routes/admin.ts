import { Router, Request, Response } from 'express';
import {
  assignBadge,
  BADGE_DEFINITIONS,
  BadgeType,
  getEmployeeById,
  listEmployees,
} from '../services/employeeDirectory';
import {
  enrichEmployeeWithOnChainProfile,
  getEmployeeOnChainProfile,
} from '../services/employeeOnChainRegistry';
import { sepoliaService } from '../services/SepoliaService';

const router = Router();

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

const requireAdminPermissions = (req: Request, res: Response, next: () => void): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No authorization token provided',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

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
        const onChain = await enrichEmployeeWithOnChainProfile(employee);
        return {
          ...onChain,
          challengeFingerprint: onChain.didRegistrationTxHash,
          adminGasPayerAddress: sepoliaService.getGasPayerAddress(),
          adminGasPayerEtherscanUrl: sepoliaService.getGasPayerEtherscanUrl(),
        };
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

    const onChainEmployee = await enrichEmployeeWithOnChainProfile(employee);
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
    const onChainEmployee = await enrichEmployeeWithOnChainProfile(updatedEmployee);

    const vcId = `vc:${onChainEmployee.id}:${Date.now()}`;
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString();

    const response: ApiResponse = {
      success: true,
      data: {
        credential: {
          id: vcId,
          issuer: 'did:ethr:enterprise-admin',
          issuanceDate: issuedAt,
          expirationDate: expiresAt,
          credentialSubject: {
            id: onChainEmployee.did,
            employeeId: onChainEmployee.id,
            name: onChainEmployee.name,
            badge: onChainEmployee.badge,
            permissions: onChainEmployee.permissions,
            hashId: onChainEmployee.hashId,
            didRegistrationTxHash: onChainEmployee.didRegistrationTxHash,
          },
        },
        employee: onChainEmployee,
      },
      message: 'Digital badge credential issued successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error?.message || 'Failed to issue credential',
      timestamp: new Date().toISOString(),
    };

    res.status(400).json(response);
  }
});

export default router;
