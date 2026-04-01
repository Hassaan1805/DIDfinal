"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIssuerTrustPolicy = getIssuerTrustPolicy;
exports.evaluateIssuerTrust = evaluateIssuerTrust;
const DEFAULT_COMPANY_DID = 'did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
function normalizeDid(value) {
    return value.trim().toLowerCase();
}
function parseBooleanFlag(value, defaultValue) {
    if (!value) {
        return defaultValue;
    }
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }
    return defaultValue;
}
function getIssuerTrustPolicy() {
    const companyDid = (process.env.COMPANY_DID || DEFAULT_COMPANY_DID).trim();
    const configuredIssuers = (process.env.TRUSTED_ISSUER_DIDS || '')
        .split(',')
        .map((issuer) => issuer.trim())
        .filter(Boolean);
    const trustedIssuers = Array.from(new Set([companyDid, ...configuredIssuers]));
    return {
        companyDid,
        trustedIssuers,
        strictIssuerTrust: parseBooleanFlag(process.env.VC_STRICT_ISSUER_TRUST, true),
    };
}
function evaluateIssuerTrust(issuer) {
    const policy = getIssuerTrustPolicy();
    const issuerNormalized = normalizeDid(issuer);
    const trustedIssuerSet = new Set(policy.trustedIssuers.map(normalizeDid));
    return {
        issuer,
        issuerNormalized,
        issuerTrusted: trustedIssuerSet.has(issuerNormalized),
        strictIssuerTrust: policy.strictIssuerTrust,
        trustedIssuers: policy.trustedIssuers,
    };
}
//# sourceMappingURL=issuerTrust.service.js.map