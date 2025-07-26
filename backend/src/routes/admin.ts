import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { createJWT } from 'did-jwt';
import { EthrDID } from 'ethr-did';
import { BlockchainService } from '../services/blockchainService';

const router = Router();

// Initialize blockchain service
const blockchainService = new BlockchainService({
  rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
  contractAddress: process.env.DID_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
});

// Company's master DID configuration
const COMPANY_PRIVATE_KEY = process.env.COMPANY_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const COMPANY_DID_ADDRESS = process.env.COMPANY_DID_ADDRESS || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

// Employee database (shared with auth.ts - in production, this would be a proper database)
interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  active: boolean;
  did?: string;
  permissions?: string[];
}

const employeeDatabase = new Map<string, Employee>([
  ['EMP001', {
    id: 'EMP001',
    name: 'John Doe',
    department: 'Engineering',
    role: 'Senior Software Engineer',
    email: 'john.doe@company.com',
    active: true,
    permissions: ['employee']
  }],
  ['EMP002', {
    id: 'EMP002',
    name: 'Jane Smith',
    department: 'HR',
    role: 'HR Director',
    email: 'jane.smith@company.com',
    active: true,
    permissions: ['admin', 'hr_director']
  }],
  ['EMP003', {
    id: 'EMP003',
    name: 'Mike Johnson',
    department: 'Finance',
    role: 'Financial Analyst',
    email: 'mike.johnson@company.com',
    active: true,
    permissions: ['employee']
  }],
  ['EMP004', {
    id: 'EMP004',
    name: 'Sarah Chen',
    department: 'Engineering',
    role: 'DevOps Engineer',
    email: 'sarah.chen@company.com',
    active: true,
    permissions: ['employee']
  }],
  ['EMP005', {
    id: 'EMP005',
    name: 'David Wilson',
    department: 'Marketing',
    role: 'Marketing Manager',
    email: 'david.wilson@company.com',
    active: true,
    permissions: ['employee']
  }]
]);

// Interface for API responses
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Interface for Verifiable Credential
interface VerifiableCredential {
  '@context': string[];
  type: string[];
  credentialSubject: {
    id: string;
    employeeId: string;
    role: string;
    department: string;
    name: string;
    email: string;
  };
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
}

// Interface for JWT payload
interface CredentialJWTPayload {
  vc: VerifiableCredential;
  iss: string;
  sub: string;
  iat: number;
  exp?: number;
}

/**
 * Middleware to check if user has admin permissions
 * In production, this would verify JWT token and check permissions
 */
const requireAdminPermissions = (req: Request, res: Response, next: any): void => {
  // For now, we'll simulate admin authentication
  // In production, you would:
  // 1. Verify JWT token from Authorization header
  // 2. Check if user has admin role/permissions
  // 3. Return 403 if not authorized
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No authorization token provided',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // For demo purposes, we'll accept any bearer token
  // In production, verify the JWT and extract user info
  next();
};

/**
 * POST /api/admin/issue-credential
 * Issues a Verifiable Credential to an employee
 */
router.post('/issue-credential', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetEmployeeId } = req.body;

    // Validate request
    if (!targetEmployeeId) {
      res.status(400).json({
        success: false,
        error: 'Target employee ID is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Look up employee details
    const employee = employeeDatabase.get(targetEmployeeId);
    if (!employee) {
      res.status(404).json({
        success: false,
        error: 'Employee not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!employee.active) {
      res.status(400).json({
        success: false,
        error: 'Cannot issue credential to inactive employee',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generate employee DID if not exists (in production, this would be managed differently)
    const employeeDID = employee.did || `did:ethr:${ethers.Wallet.createRandom().address.toLowerCase()}`;
    
    // Update employee record with DID
    if (!employee.did) {
      employee.did = employeeDID;
      employeeDatabase.set(targetEmployeeId, employee);
    }

    // Create the Verifiable Credential payload
    const issuanceDate = new Date().toISOString();
    const expirationDate = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(); // 1 year from now

    const vcPayload: VerifiableCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'EmployeeCredential'],
      credentialSubject: {
        id: employeeDID,
        employeeId: employee.id,
        role: employee.role,
        department: employee.department,
        name: employee.name,
        email: employee.email
      },
      issuer: `did:ethr:${COMPANY_DID_ADDRESS.toLowerCase()}`,
      issuanceDate: issuanceDate,
      expirationDate: expirationDate
    };

    // Create JWT payload
    const jwtPayload: CredentialJWTPayload = {
      vc: vcPayload,
      iss: `did:ethr:${COMPANY_DID_ADDRESS.toLowerCase()}`,
      sub: employeeDID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year expiration
    };

    // Sign the JWT using the company's private key
    const wallet = new ethers.Wallet(COMPANY_PRIVATE_KEY);
    
    // Create EthrDID instance for signing
    const ethrDID = new EthrDID({
      identifier: COMPANY_DID_ADDRESS,
      privateKey: COMPANY_PRIVATE_KEY,
      chainNameOrId: 'sepolia' // or your network
    } as any);

    // Sign the JWT
    const signedCredential = await createJWT(
      jwtPayload,
      {
        issuer: `did:ethr:${COMPANY_DID_ADDRESS.toLowerCase()}`,
        signer: ethrDID.signer!
      },
      {
        alg: 'ES256K'
      }
    );

    console.log('✅ Verifiable Credential issued successfully:', {
      employeeId: targetEmployeeId,
      employeeName: employee.name,
      credentialType: 'EmployeeCredential',
      issuer: `did:ethr:${COMPANY_DID_ADDRESS.toLowerCase()}`,
      subject: employeeDID
    });

    // Return the signed credential
    const response: ApiResponse<{
      credential: string;
      employee: Employee;
      credentialPreview: VerifiableCredential;
    }> = {
      success: true,
      data: {
        credential: signedCredential,
        employee: employee,
        credentialPreview: vcPayload
      },
      message: 'Verifiable Credential issued successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error issuing verifiable credential:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to issue verifiable credential',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/employees
 * Returns list of all employees for admin interface
 */
router.get('/employees', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const employees = Array.from(employeeDatabase.values()).map(emp => ({
      ...emp,
      // Don't expose sensitive information in list view
      permissions: undefined
    }));

    const response: ApiResponse<Employee[]> = {
      success: true,
      data: employees,
      message: 'Employees retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error retrieving employees:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve employees',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/admin/employee/:employeeId
 * Returns details of a specific employee
 */
router.get('/employee/:employeeId', requireAdminPermissions, async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    
    const employee = employeeDatabase.get(employeeId);
    if (!employee) {
      res.status(404).json({
        success: false,
        error: 'Employee not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const response: ApiResponse<Employee> = {
      success: true,
      data: employee,
      message: 'Employee details retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error retrieving employee details:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve employee details',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

export default router;
