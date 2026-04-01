"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BADGE_DEFINITIONS = void 0;
exports.isValidDID = isValidDID;
exports.isValidEthereumAddress = isValidEthereumAddress;
exports.getEmployeeHashId = getEmployeeHashId;
exports.listEmployees = listEmployees;
exports.getEmployeeById = getEmployeeById;
exports.getEmployeeByAddress = getEmployeeByAddress;
exports.createEmployee = createEmployee;
exports.assignBadge = assignBadge;
exports.getBadgeDefinition = getBadgeDefinition;
exports.updateEmployee = updateEmployee;
exports.deactivateEmployee = deactivateEmployee;
exports.reactivateEmployee = reactivateEmployee;
exports.getEmployeeByDID = getEmployeeByDID;
exports.listActiveEmployees = listActiveEmployees;
const crypto_1 = require("crypto");
const employeeWallets_1 = require("./employeeWallets");
const DID_ETHR_REGEX = /^did:ethr:0x[a-fA-F0-9]{40}$/;
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
function isValidDID(did) {
    return DID_ETHR_REGEX.test(did);
}
function isValidEthereumAddress(address) {
    return ETHEREUM_ADDRESS_REGEX.test(address);
}
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
function createEmployee(input) {
    const normalizedId = input.id.trim().toUpperCase();
    const normalizedAddress = input.address.trim().toLowerCase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const badge = input.badge || 'employee';
    if (!normalizedId) {
        throw new Error('Employee ID is required');
    }
    if (!input.name.trim()) {
        throw new Error('Employee name is required');
    }
    if (!input.department.trim()) {
        throw new Error('Department is required');
    }
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        throw new Error('Valid email is required');
    }
    if (!normalizedAddress) {
        throw new Error('Employee wallet address is required');
    }
    if (!isValidEthereumAddress(input.address.trim())) {
        throw new Error('Invalid Ethereum address format. Must be 0x followed by 40 hex characters');
    }
    if (employeeStore.has(normalizedId)) {
        throw new Error(`Employee ${normalizedId} already exists`);
    }
    const duplicateEmail = Array.from(employeeStore.values()).find((employee) => employee.email.toLowerCase() === normalizedEmail);
    if (duplicateEmail) {
        throw new Error(`Email ${normalizedEmail} is already assigned to ${duplicateEmail.id}`);
    }
    const duplicateAddress = Array.from(employeeStore.values()).find((employee) => employee.address.toLowerCase() === normalizedAddress);
    if (duplicateAddress) {
        throw new Error(`Wallet address is already assigned to ${duplicateAddress.id}`);
    }
    const badgeDefinition = exports.BADGE_DEFINITIONS[badge];
    if (!badgeDefinition) {
        throw new Error(`Invalid badge. Allowed: ${Object.keys(exports.BADGE_DEFINITIONS).join(', ')}`);
    }
    const did = (input.did && input.did.trim()) || `did:ethr:${input.address.trim()}`;
    if (!isValidDID(did)) {
        throw new Error('Invalid DID format. Must be did:ethr:0x followed by 40 hex characters');
    }
    const duplicateDid = Array.from(employeeStore.values()).find((employee) => employee.did.toLowerCase() === did.toLowerCase());
    if (duplicateDid) {
        throw new Error(`DID ${did} is already assigned to ${duplicateDid.id}`);
    }
    const employee = {
        id: normalizedId,
        name: input.name.trim(),
        department: input.department.trim(),
        email: normalizedEmail,
        address: input.address.trim(),
        did,
        active: true,
        badge,
        permissions: [...badgeDefinition.permissions],
    };
    employeeStore.set(normalizedId, employee);
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
function updateEmployee(employeeId, input) {
    const id = employeeId.toUpperCase();
    const employee = employeeStore.get(id);
    if (!employee) {
        throw new Error('Employee not found');
    }
    if (input.name !== undefined) {
        const trimmedName = input.name.trim();
        if (!trimmedName) {
            throw new Error('Employee name cannot be empty');
        }
        employee.name = trimmedName;
    }
    if (input.department !== undefined) {
        const trimmedDept = input.department.trim();
        if (!trimmedDept) {
            throw new Error('Department cannot be empty');
        }
        employee.department = trimmedDept;
    }
    if (input.email !== undefined) {
        const normalizedEmail = input.email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
            throw new Error('Valid email is required');
        }
        const duplicateEmail = Array.from(employeeStore.values()).find((emp) => emp.email.toLowerCase() === normalizedEmail && emp.id !== id);
        if (duplicateEmail) {
            throw new Error(`Email ${normalizedEmail} is already assigned to ${duplicateEmail.id}`);
        }
        employee.email = normalizedEmail;
    }
    if (input.badge !== undefined) {
        const badgeDef = exports.BADGE_DEFINITIONS[input.badge];
        if (!badgeDef) {
            throw new Error(`Invalid badge. Allowed: ${Object.keys(exports.BADGE_DEFINITIONS).join(', ')}`);
        }
        employee.badge = input.badge;
        employee.permissions = [...badgeDef.permissions];
    }
    employeeStore.set(id, employee);
    const cloned = cloneEmployee(employee);
    return { ...cloned, hashId: getEmployeeHashId(cloned) };
}
function deactivateEmployee(employeeId) {
    const id = employeeId.toUpperCase();
    const employee = employeeStore.get(id);
    if (!employee) {
        throw new Error('Employee not found');
    }
    if (!employee.active) {
        throw new Error('Employee is already deactivated');
    }
    employee.active = false;
    employeeStore.set(id, employee);
    const cloned = cloneEmployee(employee);
    return { ...cloned, hashId: getEmployeeHashId(cloned) };
}
function reactivateEmployee(employeeId) {
    const id = employeeId.toUpperCase();
    const employee = employeeStore.get(id);
    if (!employee) {
        throw new Error('Employee not found');
    }
    if (employee.active) {
        throw new Error('Employee is already active');
    }
    employee.active = true;
    employeeStore.set(id, employee);
    const cloned = cloneEmployee(employee);
    return { ...cloned, hashId: getEmployeeHashId(cloned) };
}
function getEmployeeByDID(did) {
    const normalizedDid = did.toLowerCase();
    const employee = Array.from(employeeStore.values()).find((item) => item.did.toLowerCase() === normalizedDid);
    if (!employee) {
        return undefined;
    }
    const cloned = cloneEmployee(employee);
    return { ...cloned, hashId: getEmployeeHashId(cloned) };
}
function listActiveEmployees() {
    return Array.from(employeeStore.values())
        .filter((employee) => employee.active)
        .map((employee) => {
        const cloned = cloneEmployee(employee);
        return { ...cloned, hashId: getEmployeeHashId(cloned) };
    });
}
//# sourceMappingURL=employeeDirectory.js.map