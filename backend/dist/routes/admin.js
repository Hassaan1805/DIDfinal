"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const did_jwt_1 = require("did-jwt");
const ethr_did_1 = require("ethr-did");
const blockchainService_1 = require("../services/blockchainService");
const router = (0, express_1.Router)();
const blockchainService = new blockchainService_1.BlockchainService({
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    contractAddress: process.env.DID_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
});
const COMPANY_PRIVATE_KEY = process.env.COMPANY_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const COMPANY_DID_ADDRESS = process.env.COMPANY_DID_ADDRESS || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const employeeDatabase = new Map([
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
const requireAdminPermissions = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'No authorization token provided',
            timestamp: new Date().toISOString()
        });
        return;
    }
    next();
};
router.post('/issue-credential', requireAdminPermissions, async (req, res) => {
    try {
        const { targetEmployeeId } = req.body;
        if (!targetEmployeeId) {
            res.status(400).json({
                success: false,
                error: 'Target employee ID is required',
                timestamp: new Date().toISOString()
            });
            return;
        }
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
        const employeeDID = employee.did || `did:ethr:${ethers_1.ethers.Wallet.createRandom().address.toLowerCase()}`;
        if (!employee.did) {
            employee.did = employeeDID;
            employeeDatabase.set(targetEmployeeId, employee);
        }
        const issuanceDate = new Date().toISOString();
        const expirationDate = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString();
        const vcPayload = {
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
        const jwtPayload = {
            vc: vcPayload,
            iss: `did:ethr:${COMPANY_DID_ADDRESS.toLowerCase()}`,
            sub: employeeDID,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
        };
        const wallet = new ethers_1.ethers.Wallet(COMPANY_PRIVATE_KEY);
        const ethrDID = new ethr_did_1.EthrDID({
            identifier: COMPANY_DID_ADDRESS,
            privateKey: COMPANY_PRIVATE_KEY,
            chainNameOrId: 'sepolia'
        });
        const signedCredential = await (0, did_jwt_1.createJWT)(jwtPayload, {
            issuer: `did:ethr:${COMPANY_DID_ADDRESS.toLowerCase()}`,
            signer: ethrDID.signer
        }, {
            alg: 'ES256K'
        });
        console.log('✅ Verifiable Credential issued successfully:', {
            employeeId: targetEmployeeId,
            employeeName: employee.name,
            credentialType: 'EmployeeCredential',
            issuer: `did:ethr:${COMPANY_DID_ADDRESS.toLowerCase()}`,
            subject: employeeDID
        });
        const response = {
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
    }
    catch (error) {
        console.error('❌ Error issuing verifiable credential:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to issue verifiable credential',
            timestamp: new Date().toISOString()
        };
        res.status(500).json(response);
    }
});
router.get('/employees', requireAdminPermissions, async (req, res) => {
    try {
        const employees = Array.from(employeeDatabase.values()).map(emp => ({
            ...emp,
            permissions: undefined
        }));
        const response = {
            success: true,
            data: employees,
            message: 'Employees retrieved successfully',
            timestamp: new Date().toISOString()
        };
        res.json(response);
    }
    catch (error) {
        console.error('❌ Error retrieving employees:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve employees',
            timestamp: new Date().toISOString()
        };
        res.status(500).json(response);
    }
});
router.get('/employee/:employeeId', requireAdminPermissions, async (req, res) => {
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
        const response = {
            success: true,
            data: employee,
            message: 'Employee details retrieved successfully',
            timestamp: new Date().toISOString()
        };
        res.json(response);
    }
    catch (error) {
        console.error('❌ Error retrieving employee details:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve employee details',
            timestamp: new Date().toISOString()
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map