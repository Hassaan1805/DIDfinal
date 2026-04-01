import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
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

export interface CreateEmployeeInput {
  id: string;
  name: string;
  department: string;
  email: string;
  address: string;
  did?: string;
  badge?: BadgeType;
}

export interface UpdateEmployeeInput {
  name?: string;
  department?: string;
  email?: string;
  badge?: BadgeType;
}

// DID format validation: must be did:ethr:0x... with valid Ethereum address
const DID_ETHR_REGEX = /^did:ethr:0x[a-fA-F0-9]{40}$/;
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isValidDID(did: string): boolean {
  return DID_ETHR_REGEX.test(did);
}

export function isValidEthereumAddress(address: string): boolean {
  return ETHEREUM_ADDRESS_REGEX.test(address);
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

// ── Persistence ──────────────────────────────────────────────────────────────
const DATA_DIR = join(process.cwd(), 'data');
const EMPLOYEES_FILE = join(DATA_DIR, 'employees.json');

function saveStore(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const records = Array.from(employeeStore.values());
    writeFileSync(EMPLOYEES_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (err: any) {
    console.warn('⚠️ Failed to persist employee store:', err.message);
  }
}

function loadPersistedEmployees(): void {
  if (!existsSync(EMPLOYEES_FILE)) return;
  try {
    const raw = readFileSync(EMPLOYEES_FILE, 'utf8');
    const records: EmployeeRecord[] = JSON.parse(raw);
    for (const record of records) {
      employeeStore.set(record.id, record);
    }
    console.log(`✅ Loaded ${records.length} employees from disk`);
  } catch (err: any) {
    console.warn('⚠️ Failed to load persisted employees:', err.message);
  }
}

loadPersistedEmployees();
// ─────────────────────────────────────────────────────────────────────────────

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

export function createEmployee(input: CreateEmployeeInput): EmployeeRecord & { hashId: string } {
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

  // Validate Ethereum address format
  if (!isValidEthereumAddress(input.address.trim())) {
    throw new Error('Invalid Ethereum address format. Must be 0x followed by 40 hex characters');
  }

  if (employeeStore.has(normalizedId)) {
    throw new Error(`Employee ${normalizedId} already exists`);
  }

  const duplicateEmail = Array.from(employeeStore.values()).find(
    (employee) => employee.email.toLowerCase() === normalizedEmail
  );
  if (duplicateEmail) {
    throw new Error(`Email ${normalizedEmail} is already assigned to ${duplicateEmail.id}`);
  }

  const duplicateAddress = Array.from(employeeStore.values()).find(
    (employee) => employee.address.toLowerCase() === normalizedAddress
  );
  if (duplicateAddress) {
    throw new Error(`Wallet address is already assigned to ${duplicateAddress.id}`);
  }

  const badgeDefinition = BADGE_DEFINITIONS[badge];
  if (!badgeDefinition) {
    throw new Error(`Invalid badge. Allowed: ${Object.keys(BADGE_DEFINITIONS).join(', ')}`);
  }

  // Validate DID format if provided
  const did = (input.did && input.did.trim()) || `did:ethr:${input.address.trim()}`;
  if (!isValidDID(did)) {
    throw new Error('Invalid DID format. Must be did:ethr:0x followed by 40 hex characters');
  }

  // Check for duplicate DID
  const duplicateDid = Array.from(employeeStore.values()).find(
    (employee) => employee.did.toLowerCase() === did.toLowerCase()
  );
  if (duplicateDid) {
    throw new Error(`DID ${did} is already assigned to ${duplicateDid.id}`);
  }

  const employee: EmployeeRecord = {
    id: normalizedId,
    name: input.name.trim(),
    department: input.department.trim(),
    email: normalizedEmail,
    address: input.address.trim(), // Preserve original case for address
    did,
    active: true,
    badge,
    permissions: [...badgeDefinition.permissions],
  };

  employeeStore.set(normalizedId, employee);
  saveStore();
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
  saveStore();

  const cloned = cloneEmployee(employee);
  return { ...cloned, hashId: getEmployeeHashId(cloned) };
}

export function getBadgeDefinition(badge: BadgeType): BadgeDefinition {
  return BADGE_DEFINITIONS[badge];
}

export function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput
): EmployeeRecord & { hashId: string } {
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
    const duplicateEmail = Array.from(employeeStore.values()).find(
      (emp) => emp.email.toLowerCase() === normalizedEmail && emp.id !== id
    );
    if (duplicateEmail) {
      throw new Error(`Email ${normalizedEmail} is already assigned to ${duplicateEmail.id}`);
    }
    employee.email = normalizedEmail;
  }

  if (input.badge !== undefined) {
    const badgeDef = BADGE_DEFINITIONS[input.badge];
    if (!badgeDef) {
      throw new Error(`Invalid badge. Allowed: ${Object.keys(BADGE_DEFINITIONS).join(', ')}`);
    }
    employee.badge = input.badge;
    employee.permissions = [...badgeDef.permissions];
  }

  employeeStore.set(id, employee);
  saveStore();
  const cloned = cloneEmployee(employee);
  return { ...cloned, hashId: getEmployeeHashId(cloned) };
}

export function deactivateEmployee(employeeId: string): EmployeeRecord & { hashId: string } {
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
  saveStore();
  const cloned = cloneEmployee(employee);
  return { ...cloned, hashId: getEmployeeHashId(cloned) };
}

export function reactivateEmployee(employeeId: string): EmployeeRecord & { hashId: string } {
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
  saveStore();
  const cloned = cloneEmployee(employee);
  return { ...cloned, hashId: getEmployeeHashId(cloned) };
}

export function getEmployeeByDID(did: string): (EmployeeRecord & { hashId: string }) | undefined {
  const normalizedDid = did.toLowerCase();
  const employee = Array.from(employeeStore.values()).find(
    (item) => item.did.toLowerCase() === normalizedDid
  );
  if (!employee) {
    return undefined;
  }
  const cloned = cloneEmployee(employee);
  return { ...cloned, hashId: getEmployeeHashId(cloned) };
}

export function listActiveEmployees(): Array<EmployeeRecord & { hashId: string }> {
  return Array.from(employeeStore.values())
    .filter((employee) => employee.active)
    .map((employee) => {
      const cloned = cloneEmployee(employee);
      return { ...cloned, hashId: getEmployeeHashId(cloned) };
    });
}
