export interface EmploymentVcInput {
    issuerDid: string;
    subjectDid: string;
    employeeId: string;
    name: string;
    badge: string;
    permissions: string[];
    hashId: string;
    didRegistrationTxHash: string;
    expiresAt: string;
}
export interface EmploymentVcJwtResult {
    credentialId: string;
    issuanceDate: string;
    expirationDate: string;
    jwt: string;
}
export declare function issueEmploymentVcJwt(input: EmploymentVcInput): EmploymentVcJwtResult;
//# sourceMappingURL=vcJwt.service.d.ts.map