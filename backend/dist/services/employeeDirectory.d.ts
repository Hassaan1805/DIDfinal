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
export declare function assignBadge(employeeId: string, badge: BadgeType): (EmployeeRecord & {
    hashId: string;
});
export declare function getBadgeDefinition(badge: BadgeType): BadgeDefinition;
//# sourceMappingURL=employeeDirectory.d.ts.map