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
export declare function isValidDID(did: string): boolean;
export declare function isValidEthereumAddress(address: string): boolean;
export declare const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition>;
export declare function getEmployeeHashId(employee: EmployeeRecord): string;
export declare function listEmployees(): Array<EmployeeRecord & {
    hashId: string;
}>;
export declare function getEmployeeById(employeeId: string): (EmployeeRecord & {
    hashId: string;
}) | undefined;
export declare function getEmployeeByAddress(address: string): (EmployeeRecord & {
    hashId: string;
}) | undefined;
export declare function createEmployee(input: CreateEmployeeInput): EmployeeRecord & {
    hashId: string;
};
export declare function assignBadge(employeeId: string, badge: BadgeType): (EmployeeRecord & {
    hashId: string;
});
export declare function getBadgeDefinition(badge: BadgeType): BadgeDefinition;
export declare function updateEmployee(employeeId: string, input: UpdateEmployeeInput): EmployeeRecord & {
    hashId: string;
};
export declare function deactivateEmployee(employeeId: string): EmployeeRecord & {
    hashId: string;
};
export declare function reactivateEmployee(employeeId: string): EmployeeRecord & {
    hashId: string;
};
export declare function getEmployeeByDID(did: string): (EmployeeRecord & {
    hashId: string;
}) | undefined;
export declare function listActiveEmployees(): Array<EmployeeRecord & {
    hashId: string;
}>;
//# sourceMappingURL=employeeDirectory.d.ts.map