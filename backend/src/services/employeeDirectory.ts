import { createHash } from 'crypto';
import { EMPLOYEE_WALLETS } from './employeeWallets';

export type BadgeType = 'employee' | 'manager' | 'admin' | 'auditor';

export interface BadgeDefinition {
  badge: BadgeType;
  label: string;
  challengeScope: string;
  permissions: string[];
}

export interface EmployeeRecord {
  id: string;
  name: string;
  department: string;
  email: string;
  address: string;
  did: string;
  active: boolean;
  badge: BadgeType;
  permissions: string[];
}

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
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

const baseEmployees: EmployeeRecord[] = Array.from(EMPLOYEE_WALLETS.values()).map((wallet) => ({
  id: wallet.id,
  name: wallet.name,
  department: wallet.department,
  email: wallet.email,
  address: wallet.address,
  did: wallet.did,
  active: true,
  badge: 'employee',
  permissions: [...BADGE_DEFINITIONS.employee.permissions],
}));

const employeeStore = new Map<string, EmployeeRecord>(baseEmployees.map((employee) => [employee.id, employee]));

function cloneEmployee(employee: EmployeeRecord): EmployeeRecord {
  return {
    ...employee,
    permissions: [...employee.permissions],
  };
}

export function getEmployeeHashId(employee: EmployeeRecord): string {
  return createHash('sha256')
    .update(`${employee.id}|${employee.did}|${employee.email}`)
    .digest('hex');
}

export function listEmployees(): Array<EmployeeRecord & { hashId: string }> {
  return Array.from(employeeStore.values()).map((employee) => {
    const cloned = cloneEmployee(employee);
    return { ...cloned, hashId: getEmployeeHashId(cloned) };
  });
}

export function getEmployeeById(employeeId: string): (EmployeeRecord & { hashId: string }) | undefined {
  const employee = employeeStore.get(employeeId.toUpperCase());
  if (!employee) {
    return undefined;
  }
  const cloned = cloneEmployee(employee);
  return { ...cloned, hashId: getEmployeeHashId(cloned) };
}

export function getEmployeeByAddress(address: string): (EmployeeRecord & { hashId: string }) | undefined {
  const lowered = address.toLowerCase();
  const employee = Array.from(employeeStore.values()).find((item) => item.address.toLowerCase() === lowered);
  if (!employee) {
    return undefined;
  }
  const cloned = cloneEmployee(employee);
  return { ...cloned, hashId: getEmployeeHashId(cloned) };
}

export function assignBadge(employeeId: string, badge: BadgeType): (EmployeeRecord & { hashId: string }) {
  const id = employeeId.toUpperCase();
  const employee = employeeStore.get(id);
  if (!employee) {
    throw new Error('Employee not found');
  }

  const badgeDef = BADGE_DEFINITIONS[badge];
  if (!badgeDef) {
    throw new Error('Invalid badge');
  }

  employee.badge = badge;
  employee.permissions = [...badgeDef.permissions];
  employeeStore.set(id, employee);

  const cloned = cloneEmployee(employee);
  return { ...cloned, hashId: getEmployeeHashId(cloned) };
}

export function getBadgeDefinition(badge: BadgeType): BadgeDefinition {
  return BADGE_DEFINITIONS[badge];
}
