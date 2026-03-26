import { EmployeeRecord } from './employeeDirectory';
export interface EmployeeOnChainProfile {
    employeeId: string;
    address: string;
    did: string;
    hashId: string;
    didRegistrationTxHash: string;
    didRegistrationBlockNumber?: number;
    didRegistrationTimestamp?: string;
    lastAuthRecordTxHash?: string;
    lastAuthVerifyTxHash?: string;
    updatedAt: string;
}
export declare function getEmployeeOnChainProfile(employeeId: string): EmployeeOnChainProfile | undefined;
export declare function ensureEmployeeRegisteredOnChain(employee: EmployeeRecord & {
    hashId?: string;
}): Promise<EmployeeOnChainProfile>;
export declare function enrichEmployeeWithOnChainProfile<T extends EmployeeRecord & {
    hashId?: string;
}>(employee: T): Promise<T & {
    hashId: string;
    didRegistrationTxHash: string;
    didRegistrationBlockNumber?: number;
    didRegistrationTimestamp?: string;
    lastAuthRecordTxHash?: string;
    lastAuthVerifyTxHash?: string;
}>;
export declare function recordEmployeeAuthenticationOnChain(employee: EmployeeRecord & {
    hashId?: string;
}, challengeId: string, message: string, signature: string): Promise<{
    profile: EmployeeOnChainProfile;
    authRecordTxHash: string;
    authVerifyTxHash: string;
}>;
//# sourceMappingURL=employeeOnChainRegistry.d.ts.map