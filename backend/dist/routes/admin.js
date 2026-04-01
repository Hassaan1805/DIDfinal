"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ethers_1 = require("ethers");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const employeeDirectory_1 = require("../services/employeeDirectory");
const employeeOnChainRegistry_1 = require("../services/employeeOnChainRegistry");
const SepoliaService_1 = require("../services/SepoliaService");
const credentialStatus_service_1 = require("../services/credentialStatus.service");
const vcJwt_service_1 = require("../services/vcJwt.service");
const verifierProfiles_service_1 = require("../services/verifierProfiles.service");
const router = (0, express_1.Router)();
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const getAllowedAdminTokens = () => {
    const configured = [
        process.env.ADMIN_TOKEN,
        ...(process.env.ADMIN_TOKENS || '').split(','),
    ]
        .map((token) => (token ?? '').trim())
        .filter((token) => token.length >= 32);
    return new Set(configured);
};
const hasAdminClaims = (decoded) => {
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
    if (permissions.includes('users:manage')
        || permissions.includes('badges:issue')
        || permissions.includes('admin:*')) {
        return true;
    }
    const scopes = Array.isArray(decoded.scope)
        ? decoded.scope
        : typeof decoded.scope === 'string'
            ? decoded.scope.split(' ')
            : [];
    return scopes.some((scope) => ['admin', 'admin:full'].includes(scope.toLowerCase()));
};
const requireAdminPermissions = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!hasAdminClaims(decoded)) {
            res.status(403).json({
                success: false,
                error: 'Token is valid but does not include admin permissions',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid admin token',
            details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
            timestamp: new Date().toISOString(),
        });
        return;
    }
};
router.use(rateLimiter_middleware_1.adminRateLimiter);
router.get('/badges', requireAdminPermissions, (_req, res) => {
    const badges = Object.values(employeeDirectory_1.BADGE_DEFINITIONS);
    const response = {
        success: true,
        data: badges,
        message: 'Badge definitions retrieved successfully',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
router.get('/employees', requireAdminPermissions, async (_req, res) => {
    try {
        const employees = await Promise.all((0, employeeDirectory_1.listEmployees)().map(async (employee) => {
            try {
                const onChain = await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(employee);
                return {
                    ...onChain,
                    challengeFingerprint: onChain.didRegistrationTxHash,
                    adminGasPayerAddress: SepoliaService_1.sepoliaService.getGasPayerAddress(),
                    adminGasPayerEtherscanUrl: SepoliaService_1.sepoliaService.getGasPayerEtherscanUrl(),
                    onChainStatus: 'ready',
                };
            }
            catch (error) {
                return {
                    ...employee,
                    challengeFingerprint: undefined,
                    adminGasPayerAddress: SepoliaService_1.sepoliaService.getGasPayerAddress(),
                    adminGasPayerEtherscanUrl: SepoliaService_1.sepoliaService.getGasPayerEtherscanUrl(),
                    onChainStatus: 'pending',
                    onChainError: error?.message || 'On-chain registration unavailable',
                };
            }
        }));
        const response = {
            success: true,
            data: employees,
            message: 'Employees retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to retrieve employees',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});
router.get('/directory', async (_req, res) => {
    try {
        const employees = (0, employeeDirectory_1.listEmployees)()
            .filter((employee) => employee.active)
            .map((employee) => ({
            id: employee.id,
            name: employee.name,
            did: employee.did,
            role: employee.badge,
            department: employee.department,
            email: employee.email,
        }));
        const response = {
            success: true,
            data: employees,
            message: 'Public employee directory retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to retrieve public employees',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});
router.post('/employees', requireAdminPermissions, async (req, res) => {
    try {
        const { id, name, department, email, address, did, badge, registerOnChain, } = req.body;
        if (!id || !name || !department || !email || !address) {
            res.status(400).json({
                success: false,
                error: 'id, name, department, email, and address are required',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        if (!ethers_1.ethers.isAddress(address)) {
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
        const createdEmployee = (0, employeeDirectory_1.createEmployee)({
            id,
            name,
            department,
            email,
            address,
            did,
            badge,
        });
        let data = {
            employee: createdEmployee,
            onChainRegistration: {
                attempted: false,
                success: false,
                reason: 'Skipped by request',
            },
        };
        if (registerOnChain) {
            try {
                const onChainEmployee = await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(createdEmployee);
                data = {
                    employee: onChainEmployee,
                    onChainRegistration: {
                        attempted: true,
                        success: true,
                        txHash: onChainEmployee.didRegistrationTxHash,
                    },
                };
            }
            catch (error) {
                data = {
                    employee: createdEmployee,
                    onChainRegistration: {
                        attempted: true,
                        success: false,
                        reason: error?.message || 'On-chain registration failed',
                    },
                };
            }
        }
        res.status(201).json({
            success: true,
            data,
            message: `Employee ${createdEmployee.id} created successfully`,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        const message = error?.message || 'Failed to create employee';
        const status = message.includes('already') ? 409 : 400;
        res.status(status).json({
            success: false,
            error: message,
            timestamp: new Date().toISOString(),
        });
    }
});
router.get('/employee/:employeeId', requireAdminPermissions, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const employee = (0, employeeDirectory_1.getEmployeeById)(employeeId);
        if (!employee) {
            res.status(404).json({
                success: false,
                error: 'Employee not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        let onChainEmployee;
        try {
            onChainEmployee = await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(employee);
        }
        catch (error) {
            onChainEmployee = {
                ...employee,
                onChainStatus: 'pending',
                onChainError: error?.message || 'On-chain profile unavailable',
            };
        }
        const latest = (0, employeeOnChainRegistry_1.getEmployeeOnChainProfile)(onChainEmployee.id);
        const response = {
            success: true,
            data: {
                ...onChainEmployee,
                adminGasPayerAddress: SepoliaService_1.sepoliaService.getGasPayerAddress(),
                adminGasPayerEtherscanUrl: SepoliaService_1.sepoliaService.getGasPayerEtherscanUrl(),
                latestAuthRecordTxHash: latest?.lastAuthRecordTxHash,
                latestAuthVerifyTxHash: latest?.lastAuthVerifyTxHash,
            },
            message: 'Employee details retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to retrieve employee details',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});
router.patch('/employees/:employeeId/badge', requireAdminPermissions, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { badge } = req.body;
        if (!badge) {
            res.status(400).json({
                success: false,
                error: 'badge is required',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        if (!Object.keys(employeeDirectory_1.BADGE_DEFINITIONS).includes(badge)) {
            res.status(400).json({
                success: false,
                error: `Invalid badge. Allowed: ${Object.keys(employeeDirectory_1.BADGE_DEFINITIONS).join(', ')}`,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const updatedEmployee = (0, employeeDirectory_1.assignBadge)(employeeId, badge);
        const existing = (0, employeeOnChainRegistry_1.getEmployeeOnChainProfile)(updatedEmployee.id);
        const onChainEmployee = existing
            ? { ...updatedEmployee, ...existing }
            : updatedEmployee;
        const badgeDefinition = employeeDirectory_1.BADGE_DEFINITIONS[badge];
        const response = {
            success: true,
            data: {
                employee: onChainEmployee,
                badge: badgeDefinition,
            },
            message: `Badge ${badge} assigned to ${onChainEmployee.name}`,
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const status = error?.message === 'Employee not found' ? 404 : 400;
        const response = {
            success: false,
            error: error?.message || 'Failed to assign badge',
            timestamp: new Date().toISOString(),
        };
        res.status(status).json(response);
    }
});
router.patch('/employees/:employeeId', requireAdminPermissions, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { name, department, email, badge } = req.body;
        if (name === undefined && department === undefined && email === undefined && badge === undefined) {
            res.status(400).json({
                success: false,
                error: 'At least one field (name, department, email, badge) must be provided',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const updatedEmployee = (0, employeeDirectory_1.updateEmployee)(employeeId, { name, department, email, badge });
        let onChainEmployee = updatedEmployee;
        try {
            const existing = (0, employeeOnChainRegistry_1.getEmployeeOnChainProfile)(updatedEmployee.id);
            if (existing) {
                onChainEmployee = { ...updatedEmployee, ...existing };
            }
        }
        catch {
        }
        const response = {
            success: true,
            data: {
                employee: onChainEmployee,
            },
            message: `Employee ${updatedEmployee.id} updated successfully`,
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const status = error?.message === 'Employee not found' ? 404 : 400;
        const response = {
            success: false,
            error: error?.message || 'Failed to update employee',
            timestamp: new Date().toISOString(),
        };
        res.status(status).json(response);
    }
});
router.post('/employees/:employeeId/deactivate', requireAdminPermissions, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const deactivatedEmployee = (0, employeeDirectory_1.deactivateEmployee)(employeeId);
        const response = {
            success: true,
            data: {
                employee: deactivatedEmployee,
            },
            message: `Employee ${deactivatedEmployee.id} has been deactivated`,
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const status = error?.message === 'Employee not found' ? 404 : 400;
        const response = {
            success: false,
            error: error?.message || 'Failed to deactivate employee',
            timestamp: new Date().toISOString(),
        };
        res.status(status).json(response);
    }
});
router.post('/employees/:employeeId/reactivate', requireAdminPermissions, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const reactivatedEmployee = (0, employeeDirectory_1.reactivateEmployee)(employeeId);
        const response = {
            success: true,
            data: {
                employee: reactivatedEmployee,
            },
            message: `Employee ${reactivatedEmployee.id} has been reactivated`,
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const status = error?.message === 'Employee not found' ? 404 : 400;
        const response = {
            success: false,
            error: error?.message || 'Failed to reactivate employee',
            timestamp: new Date().toISOString(),
        };
        res.status(status).json(response);
    }
});
router.post('/employees/:employeeId/register-onchain', requireAdminPermissions, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const employee = (0, employeeDirectory_1.getEmployeeById)(employeeId);
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
        const onChainEmployee = await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(employee);
        const response = {
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
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to register employee on-chain',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});
router.post('/issue-credential', requireAdminPermissions, async (req, res) => {
    try {
        const { targetEmployeeId, badge } = req.body;
        if (!targetEmployeeId) {
            res.status(400).json({
                success: false,
                error: 'Target employee ID is required',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const selectedBadge = (badge || 'employee');
        const updatedEmployee = (0, employeeDirectory_1.assignBadge)(targetEmployeeId, selectedBadge);
        const onChainEmployee = await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(updatedEmployee);
        const expiresAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString();
        const vcJwt = (0, vcJwt_service_1.issueEmploymentVcJwt)({
            issuerDid: 'did:ethr:enterprise-admin',
            subjectDid: onChainEmployee.did,
            employeeId: onChainEmployee.id,
            name: onChainEmployee.name,
            badge: onChainEmployee.badge,
            permissions: onChainEmployee.permissions,
            hashId: onChainEmployee.hashId,
            didRegistrationTxHash: onChainEmployee.didRegistrationTxHash,
            expiresAt,
        });
        (0, credentialStatus_service_1.registerIssuedCredential)({
            credentialId: vcJwt.credentialId,
            issuer: 'did:ethr:enterprise-admin',
            subjectDid: onChainEmployee.did,
            issuedAt: vcJwt.issuanceDate,
            expiresAt,
        });
        const response = {
            success: true,
            data: {
                credential: {
                    id: vcJwt.credentialId,
                    jwt: vcJwt.jwt,
                    issuer: 'did:ethr:enterprise-admin',
                    issuanceDate: vcJwt.issuanceDate,
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
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to issue credential',
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
router.get('/credentials/:credentialId/status', requireAdminPermissions, (req, res) => {
    const { credentialId } = req.params;
    const status = (0, credentialStatus_service_1.getCredentialStatus)(credentialId);
    const response = {
        success: true,
        data: status,
        message: 'Credential status retrieved successfully',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
router.post('/credentials/:credentialId/revoke', requireAdminPermissions, (req, res) => {
    const { credentialId } = req.params;
    const { reason, revokedBy } = req.body;
    const record = (0, credentialStatus_service_1.revokeCredential)({
        credentialId,
        reason,
        revokedBy: revokedBy || 'admin-api',
    });
    const response = {
        success: true,
        data: record,
        message: 'Credential revoked successfully',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
router.get('/verifier-profiles', requireAdminPermissions, (req, res) => {
    const includeInactive = req.query.includeInactive !== 'false';
    const profiles = (0, verifierProfiles_service_1.listVerifierProfiles)({ includeInactive });
    const response = {
        success: true,
        data: profiles,
        message: 'Verifier profiles retrieved successfully',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
router.post('/verifier-profiles', requireAdminPermissions, (req, res) => {
    try {
        const body = req.body;
        if (!body.verifierId || !body.organizationId || !body.organizationName) {
            res.status(400).json({
                success: false,
                error: 'verifierId, organizationId and organizationName are required',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const existing = (0, verifierProfiles_service_1.getVerifierProfile)(body.verifierId);
        const profile = (0, verifierProfiles_service_1.upsertVerifierProfile)({
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
        const response = {
            success: true,
            data: profile,
            message: existing ? 'Verifier profile updated successfully' : 'Verifier profile created successfully',
            timestamp: new Date().toISOString(),
        };
        res.status(existing ? 200 : 201).json(response);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error?.message || 'Failed to save verifier profile',
            timestamp: new Date().toISOString(),
        });
    }
});
router.patch('/verifier-profiles/:verifierId', requireAdminPermissions, (req, res) => {
    try {
        const { verifierId } = req.params;
        const body = req.body;
        const profile = (0, verifierProfiles_service_1.updateVerifierProfile)(verifierId, {
            organizationId: body.organizationId,
            organizationName: body.organizationName,
            active: body.active,
            policyVersion: body.policyVersion,
            requireCredential: body.requireCredential,
            allowedBadges: body.allowedBadges,
            allowedRequestTypes: body.allowedRequestTypes,
            requiredClaimsByRequestType: body.requiredClaimsByRequestType,
        });
        const response = {
            success: true,
            data: profile,
            message: 'Verifier profile patched successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const status = String(error?.message || '').startsWith('Unknown verifier profile') ? 404 : 400;
        res.status(status).json({
            success: false,
            error: error?.message || 'Failed to patch verifier profile',
            timestamp: new Date().toISOString(),
        });
    }
});
router.patch('/verifier-profiles/:verifierId/active', requireAdminPermissions, (req, res) => {
    try {
        const { verifierId } = req.params;
        const { active } = req.body;
        if (typeof active !== 'boolean') {
            res.status(400).json({
                success: false,
                error: 'active must be a boolean',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const profile = (0, verifierProfiles_service_1.setVerifierProfileActive)(verifierId, active);
        const response = {
            success: true,
            data: profile,
            message: `Verifier profile ${active ? 'activated' : 'deactivated'} successfully`,
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const status = String(error?.message || '').startsWith('Unknown verifier profile') ? 404 : 400;
        res.status(status).json({
            success: false,
            error: error?.message || 'Failed to update verifier profile status',
            timestamp: new Date().toISOString(),
        });
    }
});
router.delete('/verifier-profiles/:verifierId/runtime-override', requireAdminPermissions, (req, res) => {
    const { verifierId } = req.params;
    const removed = (0, verifierProfiles_service_1.resetVerifierProfile)(verifierId);
    if (!removed) {
        res.status(404).json({
            success: false,
            error: 'No runtime override found for verifier profile',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    const current = (0, verifierProfiles_service_1.getVerifierProfile)(verifierId);
    const response = {
        success: true,
        data: current || null,
        message: 'Verifier profile runtime override reset successfully',
        timestamp: new Date().toISOString(),
    };
    res.json(response);
});
exports.default = router;
//# sourceMappingURL=admin.js.map