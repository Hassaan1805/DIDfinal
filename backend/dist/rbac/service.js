"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleInHierarchy = roleInHierarchy;
exports.resolveInheritedPermissions = resolveInheritedPermissions;
exports.issueRoleCredential = issueRoleCredential;
exports.verifyCredential = verifyCredential;
exports.buildRbacContext = buildRbacContext;
exports.generateTokens = generateTokens;
exports.verifyAccessToken = verifyAccessToken;
exports.refreshAccessToken = refreshAccessToken;
exports.getIssuerDid = getIssuerDid;
exports.getCredentialByIdSafe = getCredentialByIdSafe;
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ethers_1 = require("ethers");
const store_1 = require("./store");
const ACCESS_SECRET = process.env.JWT_SECRET || 'change-me-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret';
const ISSUER_PRIVATE_KEY = process.env.VC_ISSUER_PRIVATE_KEY || process.env.COMPANY_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const issuerWallet = new ethers_1.ethers.Wallet(ISSUER_PRIVATE_KEY);
function canonicalize(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalize(item)).join(',')}]`;
    }
    const obj = value;
    const sortedKeys = Object.keys(obj).sort();
    return `{${sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`).join(',')}}`;
}
function roleRank(role) {
    return store_1.ROLE_DEFINITIONS[role].rank;
}
function roleInHierarchy(minRole, actualRole) {
    return roleRank(actualRole) >= roleRank(minRole);
}
function resolveInheritedPermissions(role) {
    const targetRank = roleRank(role);
    const all = Object.values(store_1.ROLE_DEFINITIONS)
        .filter((definition) => definition.rank <= targetRank)
        .flatMap((definition) => definition.permissions);
    return Array.from(new Set(all));
}
async function issueRoleCredential(input) {
    const issuerAddress = (0, store_1.normalizeAddress)(input.issuerWalletAddress);
    const subjectAddress = (0, store_1.normalizeAddress)(input.subjectWalletAddress);
    (0, store_1.ensureUser)(issuerAddress);
    (0, store_1.ensureUser)(subjectAddress);
    const vcId = `urn:uuid:${(0, crypto_1.randomUUID)()}`;
    const issuanceDate = new Date().toISOString();
    const expirationDate = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
    const permissions = input.permissions && input.permissions.length > 0
        ? Array.from(new Set(input.permissions))
        : resolveInheritedPermissions(input.role);
    const unsignedVc = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: vcId,
        type: ['VerifiableCredential', 'RoleCredential'],
        issuer: (0, store_1.toDid)(issuerWallet.address),
        issuanceDate,
        ...(expirationDate ? { expirationDate } : {}),
        credentialSubject: {
            id: (0, store_1.toDid)(subjectAddress),
            walletAddress: subjectAddress,
            role: input.role,
            permissions,
        },
    };
    const signingPayload = canonicalize(unsignedVc);
    const signature = await issuerWallet.signMessage(signingPayload);
    const vc = {
        ...unsignedVc,
        proof: {
            type: 'EcdsaSecp256k1Signature2019',
            created: issuanceDate,
            proofPurpose: 'assertionMethod',
            verificationMethod: `${(0, store_1.toDid)(issuerWallet.address)}#controller`,
            signature,
        },
    };
    const stored = {
        id: vcId,
        vc,
        issuedByWallet: issuerAddress,
        issuedToWallet: subjectAddress,
        active: true,
        createdAt: issuanceDate,
    };
    (0, store_1.storeCredential)(stored);
    (0, store_1.logActivity)({
        actorWallet: issuerAddress,
        action: 'ISSUE_CREDENTIAL',
        targetWallet: subjectAddress,
        metadata: { role: input.role, credentialId: vcId, permissions },
    });
    return stored;
}
async function verifyCredential(credential) {
    const { vc } = credential;
    (0, store_1.validateDid)(vc.issuer);
    (0, store_1.validateDid)(vc.credentialSubject.id);
    const now = Date.now();
    if (vc.expirationDate && Date.parse(vc.expirationDate) < now) {
        return false;
    }
    const { proof, ...unsignedVc } = vc;
    const message = canonicalize(unsignedVc);
    const recovered = ethers_1.ethers.verifyMessage(message, proof.signature).toLowerCase();
    const issuerAddress = vc.issuer.replace('did:ethr:', '').toLowerCase();
    return recovered === issuerAddress;
}
async function buildRbacContext(walletAddress) {
    const normalized = (0, store_1.normalizeAddress)(walletAddress);
    const allForUser = (0, store_1.listCredentialsForWallet)(normalized);
    const verifiedActive = [];
    for (const credential of (0, store_1.listActiveCredentialsForWallet)(normalized)) {
        if (await verifyCredential(credential)) {
            verifiedActive.push(credential);
        }
    }
    const roles = Array.from(new Set(verifiedActive.map((item) => item.vc.credentialSubject.role)));
    const highestRole = roles.length === 0
        ? 'guest'
        : roles.reduce((current, nextRole) => (roleRank(nextRole) > roleRank(current) ? nextRole : current), 'guest');
    const inherited = resolveInheritedPermissions(highestRole);
    const explicit = verifiedActive.flatMap((item) => item.vc.credentialSubject.permissions);
    const permissions = Array.from(new Set([...inherited, ...explicit]));
    return {
        walletAddress: normalized,
        did: (0, store_1.toDid)(normalized),
        roles: roles.length ? roles : ['guest'],
        highestRole,
        permissions,
        credentials: allForUser,
    };
}
function generateTokens(params) {
    const sessionId = (0, crypto_1.randomUUID)();
    const basePayload = {
        sub: params.walletAddress,
        did: params.did,
        sessionId,
        nonce: params.nonce,
    };
    const accessToken = jsonwebtoken_1.default.sign({ ...basePayload, tokenType: 'access' }, ACCESS_SECRET, { expiresIn: '15m', issuer: 'did-rbac-platform' });
    const refreshToken = jsonwebtoken_1.default.sign({ ...basePayload, tokenType: 'refresh' }, REFRESH_SECRET, { expiresIn: '7d', issuer: 'did-rbac-platform' });
    return {
        accessToken,
        refreshToken,
        expiresIn: 900,
    };
}
function verifyAccessToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
    if (decoded.tokenType !== 'access' || typeof decoded.sub !== 'string' || typeof decoded.did !== 'string') {
        throw new Error('Invalid access token payload');
    }
    return { sub: decoded.sub, did: decoded.did };
}
function refreshAccessToken(refreshToken) {
    const decoded = jsonwebtoken_1.default.verify(refreshToken, REFRESH_SECRET);
    if (decoded.tokenType !== 'refresh' || typeof decoded.sub !== 'string' || typeof decoded.did !== 'string') {
        throw new Error('Invalid refresh token payload');
    }
    return generateTokens({
        walletAddress: decoded.sub,
        did: decoded.did,
        nonce: typeof decoded.nonce === 'string' ? decoded.nonce : 'refresh',
    });
}
function getIssuerDid() {
    return (0, store_1.toDid)(issuerWallet.address);
}
function getCredentialByIdSafe(credentialId) {
    const credential = (0, store_1.getCredentialById)(credentialId);
    if (!credential) {
        throw new Error('Credential not found');
    }
    return credential;
}
//# sourceMappingURL=service.js.map