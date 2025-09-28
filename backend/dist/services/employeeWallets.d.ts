export interface EmployeeWallet {
    id: string;
    name: string;
    department: string;
    role: string;
    email: string;
    privateKey: string;
    address: string;
    did: string;
}
declare const employeeWallets: EmployeeWallet[];
export declare const EMPLOYEE_WALLETS: Map<string, EmployeeWallet>;
export declare class EmployeeSignature {
    static signChallenge(employeeId: string, challenge: string): Promise<string>;
    static verifySignature(challenge: string, signature: string, expectedAddress: string): Promise<boolean>;
    static getEmployeeByAddress(address: string): EmployeeWallet | undefined;
}
export { employeeWallets };
//# sourceMappingURL=employeeWallets.d.ts.map