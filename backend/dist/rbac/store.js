"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_DEFINITIONS = void 0;
exports.normalizeAddress = normalizeAddress;
exports.toDid = toDid;
exports.validateDid = validateDid;
exports.ensureUser = ensureUser;
exports.upsertUser = upsertUser;
exports.getUser = getUser;
exports.listUsers = listUsers;
exports.createNonce = createNonce;
exports.getNonce = getNonce;
exports.markNonceUsed = markNonceUsed;
exports.cleanupNonces = cleanupNonces;
exports.storeCredential = storeCredential;
exports.getCredentialById = getCredentialById;
exports.listCredentials = listCredentials;
exports.listCredentialsForWallet = listCredentialsForWallet;
exports.listActiveCredentialsForWallet = listActiveCredentialsForWallet;
exports.revokeCredential = revokeCredential;
exports.logActivity = logActivity;
exports.getActivityLogs = getActivityLogs;
exports.seedSuperAdminUser = seedSuperAdminUser;
const crypto_1 = require("crypto");
const ethers_1 = require("ethers");
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DID_REGEX = /^did:ethr:0x[a-fA-F0-9]{40}$/;
exports.ROLE_DEFINITIONS = {
    guest: {
        name: 'guest',
        rank: 1,
        permissions: ['read'],
        description: 'Read-only access to public resources.',
    },
    employee: {
        name: 'employee',
        rank: 2,
        permissions: ['read', 'write'],
        description: 'Basic internal access.',
    },
    manager: {
        name: 'manager',
        rank: 3,
        permissions: ['read', 'write', 'approve'],
        description: 'Operational control for teams.',
    },
    admin: {
        name: 'admin',
        rank: 4,
        permissions: ['read', 'write', 'delete', 'approve', 'manage_users', 'issue_credentials'],
        description: 'Can manage users and credentials.',
    },
    super_admin: {
        name: 'super_admin',
        rank: 5,
        permissions: ['read', 'write', 'delete', 'approve', 'manage_users', 'issue_credentials'],
        description: 'Full enterprise-level control.',
    },
};
const users = new Map();
const nonces = new Map();
const credentials = new Map();
const activityLogs = [];
const DEFAULT_SUPER_ADMIN = process.env.SUPER_ADMIN_WALLET || '0xBdA3AC10e1403cFC54Ab2195Aad7Da8a39B775B9';
function normalizeAddress(address) {
    if (!ETH_ADDRESS_REGEX.test(address)) {
        throw new Error('Invalid Ethereum address format');
    }
    return ethers_1.ethers.getAddress(address).toLowerCase();
}
function toDid(address) {
    const normalized = normalizeAddress(address);
    return `did:ethr:${normalized}`;
}
function validateDid(did) {
    if (!DID_REGEX.test(did)) {
        throw new Error('Invalid DID format. Expected did:ethr:0x...');
    }
}
function ensureUser(walletAddress) {
    const normalized = normalizeAddress(walletAddress);
    const existing = users.get(normalized);
    if (existing) {
        existing.lastLoginAt = new Date().toISOString();
        return existing;
    }
    const now = new Date().toISOString();
    const user = {
        walletAddress: normalized,
        did: toDid(normalized),
        createdAt: now,
        lastLoginAt: now,
        status: 'active',
    };
    users.set(normalized, user);
    return user;
}
function upsertUser(user) {
    users.set(user.walletAddress, user);
}
function getUser(walletAddress) {
    return users.get(normalizeAddress(walletAddress));
}
function listUsers() {
    return Array.from(users.values()).sort((a, b) => b.lastLoginAt.localeCompare(a.lastLoginAt));
}
function createNonce(walletAddress) {
    const user = ensureUser(walletAddress);
    const nonce = (0, crypto_1.randomUUID)();
    const now = Date.now();
    const message = [
        'Decentralized Authentication Login',
        `Address: ${user.walletAddress}`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date(now).toISOString()}`,
        'Sign this message to authenticate. No blockchain transaction will be executed.',
    ].join('\n');
    const record = {
        nonce,
        walletAddress: user.walletAddress,
        message,
        expiresAt: now + 5 * 60 * 1000,
        used: false,
    };
    nonces.set(nonce, record);
    return record;
}
function getNonce(nonce) {
    return nonces.get(nonce);
}
function markNonceUsed(nonce) {
    const record = nonces.get(nonce);
    if (!record)
        return;
    record.used = true;
    nonces.set(nonce, record);
}
function cleanupNonces() {
    const now = Date.now();
    for (const [nonce, record] of nonces.entries()) {
        if (record.expiresAt < now || record.used) {
            nonces.delete(nonce);
        }
    }
}
function storeCredential(credential) {
    credentials.set(credential.id, credential);
}
function getCredentialById(credentialId) {
    return credentials.get(credentialId);
}
function listCredentials() {
    return Array.from(credentials.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function listCredentialsForWallet(walletAddress) {
    const normalized = normalizeAddress(walletAddress);
    return listCredentials().filter((item) => item.issuedToWallet === normalized);
}
function listActiveCredentialsForWallet(walletAddress) {
    const now = Date.now();
    return listCredentialsForWallet(walletAddress).filter((item) => {
        const expirationDate = item.vc.expirationDate ? Date.parse(item.vc.expirationDate) : null;
        const notExpired = expirationDate === null || expirationDate > now;
        return item.active && notExpired;
    });
}
function revokeCredential(credentialId, revokedBy) {
    const existing = credentials.get(credentialId);
    if (!existing) {
        throw new Error('Credential not found');
    }
    existing.active = false;
    existing.revokedAt = new Date().toISOString();
    existing.revokedBy = normalizeAddress(revokedBy);
    credentials.set(existing.id, existing);
    return existing;
}
function logActivity(log) {
    const entry = {
        id: (0, crypto_1.randomUUID)(),
        createdAt: new Date().toISOString(),
        ...log,
    };
    activityLogs.unshift(entry);
    if (activityLogs.length > 1000) {
        activityLogs.pop();
    }
    return entry;
}
function getActivityLogs(limit = 100) {
    return activityLogs.slice(0, Math.max(1, Math.min(500, limit)));
}
function seedSuperAdminUser() {
    try {
        const normalized = normalizeAddress(DEFAULT_SUPER_ADMIN);
        ensureUser(normalized);
    }
    catch {
    }
}
//# sourceMappingURL=store.js.map