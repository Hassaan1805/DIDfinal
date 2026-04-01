export interface IssuerTrustPolicy {
    companyDid: string;
    trustedIssuers: string[];
    strictIssuerTrust: boolean;
}
export interface IssuerTrustEvaluation {
    issuer: string;
    issuerNormalized: string;
    issuerTrusted: boolean;
    strictIssuerTrust: boolean;
    trustedIssuers: string[];
}
export declare function getIssuerTrustPolicy(): IssuerTrustPolicy;
export declare function evaluateIssuerTrust(issuer: string): IssuerTrustEvaluation;
//# sourceMappingURL=issuerTrust.service.d.ts.map