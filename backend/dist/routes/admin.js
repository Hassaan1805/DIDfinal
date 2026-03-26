"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeDirectory_1 = require("../services/employeeDirectory");
const employeeOnChainRegistry_1 = require("../services/employeeOnChainRegistry");
const SepoliaService_1 = require("../services/SepoliaService");
const router = (0, express_1.Router)();
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
    next();
};
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
            const onChain = await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(employee);
            return {
                ...onChain,
                challengeFingerprint: onChain.didRegistrationTxHash,
                adminGasPayerAddress: SepoliaService_1.sepoliaService.getGasPayerAddress(),
                adminGasPayerEtherscanUrl: SepoliaService_1.sepoliaService.getGasPayerEtherscanUrl(),
            };
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
        const onChainEmployee = await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(employee);
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
        const onChainEmployee = await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(updatedEmployee);
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
        const vcId = `vc:${onChainEmployee.id}:${Date.now()}`;
        const issuedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString();
        const response = {
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
exports.default = router;
//# sourceMappingURL=admin.js.map