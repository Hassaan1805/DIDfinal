"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BADGE_DEFINITIONS = void 0;
exports.getEmployeeHashId = getEmployeeHashId;
exports.listEmployees = listEmployees;
exports.getEmployeeById = getEmployeeById;
exports.getEmployeeByAddress = getEmployeeByAddress;
exports.assignBadge = assignBadge;
exports.getBadgeDefinition = getBadgeDefinition;
const crypto_1 = require("crypto");
const employeeWallets_1 = require("./employeeWallets");
exports.BADGE_DEFINITIONS = {
    employee: {
        badge: 'employee',
        label: 'Employee Badge',
        challengeScope: 'Employee Access',
        permissions: ['dashboard:view', 'tasks:view'],
    },
    manager: {
        badge: 'manager',
        label: 'Manager Badge',
        challengeScope: 'Manager Access',
        permissions: ['dashboard:view', 'tasks:view', 'team:insights', 'approvals:manage'],
    },
    admin: {
        badge: 'admin',
        label: 'Admin Badge',
        challengeScope: 'Admin Access',
        permissions: ['dashboard:view', 'tasks:view', 'team:insights', 'approvals:manage', 'users:manage', 'badges:issue'],
    },
    auditor: {
        badge: 'auditor',
        label: 'Auditor Badge',
        challengeScope: 'Auditor Access',
        permissions: ['dashboard:view', 'audit:logs:view', 'compliance:reports:view'],
    },
};
const baseEmployees = Array.from(employeeWallets_1.EMPLOYEE_WALLETS.values()).map((wallet) => ({
    id: wallet.id,
    name: wallet.name,
    department: wallet.department,
    email: wallet.email,
    address: wallet.address,
    did: wallet.did,
    active: true,
    badge: 'employee',
    permissions: [...exports.BADGE_DEFINITIONS.employee.permissions],
}));
const employeeStore = new Map(baseEmployees.map((employee) => [employee.id, employee]));
function cloneEmployee(employee) {
    return {
        ...employee,
        permissions: [...employee.permissions],
    };
}
function getEmployeeHashId(employee) {
    return (0, crypto_1.createHash)('sha256')
        .update(`${employee.id}|${employee.did}|${employee.email}`)
        .digest('hex');
}
function listEmployees() {
    return Array.from(employeeStore.values()).map((employee) => {
        const cloned = cloneEmployee(employee);
        return { ...cloned, hashId: getEmployeeHashId(cloned) };
    });
}
function getEmployeeById(employeeId) {
    const employee = employeeStore.get(employeeId.toUpperCase());
    if (!employee) {
        return undefined;
    }
    const cloned = cloneEmployee(employee);
    return { ...cloned, hashId: getEmployeeHashId(cloned) };
}
function getEmployeeByAddress(address) {
    const lowered = address.toLowerCase();
    const employee = Array.from(employeeStore.values()).find((item) => item.address.toLowerCase() === lowered);
    if (!employee) {
        return undefined;
    }
    const cloned = cloneEmployee(employee);
    return { ...cloned, hashId: getEmployeeHashId(cloned) };
}
function assignBadge(employeeId, badge) {
    const id = employeeId.toUpperCase();
    const employee = employeeStore.get(id);
    if (!employee) {
        throw new Error('Employee not found');
    }
    const badgeDef = exports.BADGE_DEFINITIONS[badge];
    if (!badgeDef) {
        throw new Error('Invalid badge');
    }
    employee.badge = badge;
    employee.permissions = [...badgeDef.permissions];
    employeeStore.set(id, employee);
    const cloned = cloneEmployee(employee);
    return { ...cloned, hashId: getEmployeeHashId(cloned) };
}
function getBadgeDefinition(badge) {
    return exports.BADGE_DEFINITIONS[badge];
}
//# sourceMappingURL=employeeDirectory.js.map