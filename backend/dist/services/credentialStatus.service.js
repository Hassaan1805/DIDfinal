"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeIssuedCredentialJwt = storeIssuedCredentialJwt;
exports.getLatestCredentialJwtForDid = getLatestCredentialJwtForDid;
exports.clearDeliveryForDid = clearDeliveryForDid;
exports.getCredentialStatusPolicy = getCredentialStatusPolicy;
exports.registerIssuedCredential = registerIssuedCredential;
exports.revokeCredential = revokeCredential;
exports.getCredentialStatus = getCredentialStatus;
const fs_1 = require("fs");
const path_1 = require("path");
const deliveryStore = new Map();
const DATA_DIR = (0, path_1.join)(process.cwd(), 'data');
const DELIVERY_FILE = (0, path_1.join)(DATA_DIR, 'credential-delivery.json');
function saveDeliveryStore() {
    try {
        if (!(0, fs_1.existsSync)(DATA_DIR))
            (0, fs_1.mkdirSync)(DATA_DIR, { recursive: true });
        const entries = Array.from(deliveryStore.entries()).map(([did, delivery]) => ({ did, ...delivery }));
        (0, fs_1.writeFileSync)(DELIVERY_FILE, JSON.stringify(entries, null, 2), 'utf8');
    }
    catch (err) {
        console.warn('⚠️ Failed to persist credential delivery store:', err.message);
    }
}
function loadDeliveryStore() {
    if (!(0, fs_1.existsSync)(DELIVERY_FILE))
        return;
    try {
        const entries = JSON.parse((0, fs_1.readFileSync)(DELIVERY_FILE, 'utf8'));
        for (const { did, ...delivery } of entries) {
            deliveryStore.set(did, delivery);
        }
        console.log(`✅ Loaded ${entries.length} credential deliveries from disk`);
    }
    catch (err) {
        console.warn('⚠️ Failed to load credential delivery store:', err.message);
    }
}
loadDeliveryStore();
function storeIssuedCredentialJwt(input) {
    deliveryStore.set(input.subjectDid.toLowerCase(), {
        jwt: input.jwt,
        credentialId: input.credentialId,
        employeeId: input.employeeId,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
    });
    saveDeliveryStore();
}
function getLatestCredentialJwtForDid(did) {
    return deliveryStore.get(did.toLowerCase());
}
function clearDeliveryForDid(did) {
    deliveryStore.delete(did.toLowerCase());
    saveDeliveryStore();
}
const registry = new Map();
function normalizeCredentialId(credentialId) {
    return credentialId.trim();
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
function getCredentialStatusPolicy() {
    return {
        requireCredentialId: parseBooleanFlag(process.env.VC_REQUIRE_CREDENTIAL_ID, false),
        strictStatusCheck: parseBooleanFlag(process.env.VC_STRICT_STATUS_CHECK, false),
    };
}
function registerIssuedCredential(input) {
    const credentialId = normalizeCredentialId(input.credentialId);
    const existing = registry.get(credentialId);
    const nextRecord = {
        credentialId,
        issuer: input.issuer,
        subjectDid: input.subjectDid,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        revoked: existing?.revoked || false,
        revokedAt: existing?.revokedAt,
        revokedReason: existing?.revokedReason,
        revokedBy: existing?.revokedBy,
    };
    registry.set(credentialId, nextRecord);
    return nextRecord;
}
function revokeCredential(input) {
    const credentialId = normalizeCredentialId(input.credentialId);
    const existing = registry.get(credentialId);
    const updated = {
        credentialId,
        issuer: existing?.issuer,
        subjectDid: existing?.subjectDid,
        issuedAt: existing?.issuedAt,
        expiresAt: existing?.expiresAt,
        revoked: true,
        revokedAt: new Date().toISOString(),
        revokedReason: input.reason,
        revokedBy: input.revokedBy,
    };
    registry.set(credentialId, updated);
    return updated;
}
function getCredentialStatus(credentialId) {
    if (!credentialId || !credentialId.trim()) {
        return {
            credentialId: null,
            status: 'unknown',
            foundInRegistry: false,
            revoked: false,
            reason: 'Credential ID missing',
        };
    }
    const normalizedCredentialId = normalizeCredentialId(credentialId);
    const record = registry.get(normalizedCredentialId);
    if (!record) {
        return {
            credentialId: normalizedCredentialId,
            status: 'unknown',
            foundInRegistry: false,
            revoked: false,
            reason: 'Credential not found in registry',
        };
    }
    if (record.revoked) {
        return {
            credentialId: normalizedCredentialId,
            status: 'revoked',
            foundInRegistry: true,
            revoked: true,
            reason: record.revokedReason || 'Credential has been revoked',
            record,
        };
    }
    if (record.expiresAt && Date.now() > Date.parse(record.expiresAt)) {
        return {
            credentialId: normalizedCredentialId,
            status: 'expired',
            foundInRegistry: true,
            revoked: false,
            reason: 'Credential expired in registry',
            record,
        };
    }
    return {
        credentialId: normalizedCredentialId,
        status: 'active',
        foundInRegistry: true,
        revoked: false,
        record,
    };
}
//# sourceMappingURL=credentialStatus.service.js.map