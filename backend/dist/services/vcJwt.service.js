"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueEmploymentVcJwt = issueEmploymentVcJwt;
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const VC_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];
const VC_TYPES = ['VerifiableCredential', 'EmploymentCredential'];
function issueEmploymentVcJwt(input) {
    const issuanceDate = new Date().toISOString();
    const credentialId = `urn:uuid:${(0, crypto_1.randomUUID)()}`;
    const expirationEpoch = Math.floor(new Date(input.expiresAt).getTime() / 1000);
    const payload = {
        iss: input.issuerDid,
        sub: input.subjectDid,
        jti: credentialId,
        nbf: Math.floor(Date.now() / 1000),
        exp: expirationEpoch,
        vc: {
            '@context': VC_CONTEXT,
            type: VC_TYPES,
            id: credentialId,
            issuer: input.issuerDid,
            issuanceDate,
            expirationDate: input.expiresAt,
            credentialSubject: {
                id: input.subjectDid,
                employeeId: input.employeeId,
                name: input.name,
                badge: input.badge,
                permissions: input.permissions,
                hashId: input.hashId,
                didRegistrationTxHash: input.didRegistrationTxHash,
            },
        },
    };
    const credentialJwt = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
    });
    return {
        credentialId,
        issuanceDate,
        expirationDate: input.expiresAt,
        jwt: credentialJwt,
    };
}
//# sourceMappingURL=vcJwt.service.js.map