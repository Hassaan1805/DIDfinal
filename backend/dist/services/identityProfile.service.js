"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOrUpdateIdentity = registerOrUpdateIdentity;
exports.getIdentityRecordByDid = getIdentityRecordByDid;
exports.getPublicProfileByDid = getPublicProfileByDid;
exports.createEnrollmentRequest = createEnrollmentRequest;
exports.expireEnrollmentRequests = expireEnrollmentRequests;
exports.getEnrollmentRequestById = getEnrollmentRequestById;
exports.listEnrollmentRequestsByDid = listEnrollmentRequestsByDid;
exports.listEnrollmentRequests = listEnrollmentRequests;
exports.decideEnrollmentRequest = decideEnrollmentRequest;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DID_ETHR_REGEX = /^did:ethr:(0x[a-fA-F0-9]{40})$/;
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DEFAULT_ENROLLMENT_EXPIRY_HOURS = 72;
const MIN_ENROLLMENT_EXPIRY_HOURS = 1;
const MAX_ENROLLMENT_EXPIRY_HOURS = 24 * 30;
const IDENTITY_STORAGE_VERSION = 1;
const IDENTITY_STORAGE_FILE_PATH = process.env.IDENTITY_STORAGE_FILE
    ? path_1.default.resolve(process.env.IDENTITY_STORAGE_FILE)
    : path_1.default.resolve(__dirname, '../../../data/identity-store.json');
const identityStore = new Map();
const enrollmentRequestStore = new Map();
let isStoreHydrated = false;
function normalizeOptionalText(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function normalizeDid(did) {
    const trimmed = did.trim();
    const match = trimmed.match(DID_ETHR_REGEX);
    if (!match) {
        throw new Error('Invalid DID format. Expected did:ethr:0x...');
    }
    return `did:ethr:${match[1].toLowerCase()}`;
}
function normalizeAddress(address) {
    const trimmed = address.trim();
    if (!ETHEREUM_ADDRESS_REGEX.test(trimmed)) {
        throw new Error('Invalid wallet address format. Expected 0x followed by 40 hex chars.');
    }
    return trimmed.toLowerCase();
}
function didToAddress(did) {
    const normalizedDid = normalizeDid(did);
    const [, address] = normalizedDid.split('did:ethr:');
    return address;
}
function ensureDidMatchesWalletAddress(did, walletAddress) {
    const didAddress = didToAddress(did);
    if (didAddress !== walletAddress.toLowerCase()) {
        throw new Error('DID does not match wallet address.');
    }
}
function sanitizeStringArray(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return Array.from(new Set(values
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)));
}
function sanitizeLinks(links) {
    if (!Array.isArray(links)) {
        return [];
    }
    const sanitized = [];
    for (const link of links) {
        if (!link || typeof link !== 'object') {
            continue;
        }
        const typedLink = link;
        const label = normalizeOptionalText(typedLink.label);
        const url = normalizeOptionalText(typedLink.url);
        if (!label || !url) {
            continue;
        }
        sanitized.push({ label, url });
    }
    const deduped = new Map();
    for (const link of sanitized) {
        deduped.set(`${link.label.toLowerCase()}|${link.url.toLowerCase()}`, link);
    }
    return Array.from(deduped.values());
}
function sanitizeExpiryHours(value) {
    if (typeof value !== 'number' && typeof value !== 'string') {
        return DEFAULT_ENROLLMENT_EXPIRY_HOURS;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return DEFAULT_ENROLLMENT_EXPIRY_HOURS;
    }
    return Math.max(MIN_ENROLLMENT_EXPIRY_HOURS, Math.min(MAX_ENROLLMENT_EXPIRY_HOURS, Math.floor(parsed)));
}
function sanitizeProfileVersion(value, fallbackVersion) {
    if (typeof value !== 'number' && typeof value !== 'string') {
        return fallbackVersion;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallbackVersion;
    }
    return Math.floor(parsed);
}
function resolveApprovedSubset(requested, approvedInput) {
    if (!approvedInput || approvedInput.length === 0) {
        return [...requested];
    }
    const approvedSet = new Set(approvedInput.map((item) => item.trim()).filter((item) => item.length > 0));
    return requested.filter((item) => approvedSet.has(item));
}
function isExpired(expiresAt) {
    const expiresAtMs = Date.parse(expiresAt);
    if (Number.isNaN(expiresAtMs)) {
        return true;
    }
    return Date.now() > expiresAtMs;
}
function ensureStorageDirectoryExists() {
    const directory = path_1.default.dirname(IDENTITY_STORAGE_FILE_PATH);
    fs_1.default.mkdirSync(directory, { recursive: true });
}
function buildStoreSnapshot() {
    return {
        version: IDENTITY_STORAGE_VERSION,
        identities: Array.from(identityStore.values()),
        enrollmentRequests: Array.from(enrollmentRequestStore.values()),
        updatedAt: new Date().toISOString(),
    };
}
function persistStoreToDisk() {
    ensureStorageDirectoryExists();
    const snapshot = buildStoreSnapshot();
    const tempPath = `${IDENTITY_STORAGE_FILE_PATH}.tmp`;
    fs_1.default.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
    fs_1.default.renameSync(tempPath, IDENTITY_STORAGE_FILE_PATH);
}
function hydrateStoreFromDisk() {
    if (isStoreHydrated) {
        return;
    }
    isStoreHydrated = true;
    if (!fs_1.default.existsSync(IDENTITY_STORAGE_FILE_PATH)) {
        return;
    }
    try {
        const rawText = fs_1.default.readFileSync(IDENTITY_STORAGE_FILE_PATH, 'utf8');
        const parsed = JSON.parse(rawText);
        const identities = Array.isArray(parsed.identities) ? parsed.identities : [];
        const enrollmentRequests = Array.isArray(parsed.enrollmentRequests) ? parsed.enrollmentRequests : [];
        for (const rawIdentity of identities) {
            if (!rawIdentity || typeof rawIdentity !== 'object') {
                continue;
            }
            try {
                const did = normalizeDid(rawIdentity.did);
                const walletAddress = normalizeAddress(rawIdentity.walletAddress);
                const displayName = normalizeOptionalText(rawIdentity.publicProfile?.displayName);
                if (!displayName) {
                    continue;
                }
                const source = rawIdentity;
                const record = {
                    did,
                    walletAddress,
                    publicProfile: {
                        displayName,
                        headline: normalizeOptionalText(source.publicProfile?.headline),
                        summary: normalizeOptionalText(source.publicProfile?.summary),
                        location: normalizeOptionalText(source.publicProfile?.location),
                        skills: sanitizeStringArray(source.publicProfile?.skills),
                        links: sanitizeLinks(source.publicProfile?.links),
                        resumePublicUrl: normalizeOptionalText(source.publicProfile?.resumePublicUrl),
                        profileUri: normalizeOptionalText(source.publicProfile?.profileUri),
                        profileHash: normalizeOptionalText(source.publicProfile?.profileHash),
                        profileVersion: sanitizeProfileVersion(source.publicProfile?.profileVersion, 1),
                        updatedAt: normalizeOptionalText(source.publicProfile?.updatedAt) || new Date().toISOString(),
                    },
                    privateProfilePointer: source.privateProfilePointer
                        ? {
                            encryptedProfileUri: normalizeOptionalText(source.privateProfilePointer.encryptedProfileUri),
                            cipherHash: normalizeOptionalText(source.privateProfilePointer.cipherHash),
                            encryptionScheme: normalizeOptionalText(source.privateProfilePointer.encryptionScheme),
                        }
                        : undefined,
                    createdAt: normalizeOptionalText(source.createdAt) || new Date().toISOString(),
                    updatedAt: normalizeOptionalText(source.updatedAt) || new Date().toISOString(),
                };
                identityStore.set(record.did, record);
            }
            catch {
            }
        }
        for (const rawRequest of enrollmentRequests) {
            if (!rawRequest || typeof rawRequest !== 'object') {
                continue;
            }
            try {
                const source = rawRequest;
                const did = normalizeDid(source.did);
                const status = source.status === 'approved' || source.status === 'rejected' || source.status === 'expired'
                    ? source.status
                    : 'pending';
                if (!source.requestId || typeof source.requestId !== 'string') {
                    continue;
                }
                const requesterOrganizationId = normalizeOptionalText(source.requesterOrganizationId);
                const requesterOrganizationName = normalizeOptionalText(source.requesterOrganizationName);
                const purpose = normalizeOptionalText(source.purpose);
                if (!requesterOrganizationId || !requesterOrganizationName || !purpose) {
                    continue;
                }
                const hydrated = {
                    requestId: source.requestId,
                    did,
                    requesterOrganizationId,
                    requesterOrganizationName,
                    verifierId: normalizeOptionalText(source.verifierId),
                    purpose,
                    requestedClaims: sanitizeStringArray(source.requestedClaims),
                    requestedProfileFields: sanitizeStringArray(source.requestedProfileFields),
                    status,
                    createdAt: normalizeOptionalText(source.createdAt) || new Date().toISOString(),
                    updatedAt: normalizeOptionalText(source.updatedAt) || new Date().toISOString(),
                    expiresAt: normalizeOptionalText(source.expiresAt) || new Date().toISOString(),
                    decidedAt: normalizeOptionalText(source.decidedAt),
                    approvedClaims: sanitizeStringArray(source.approvedClaims),
                    approvedProfileFields: sanitizeStringArray(source.approvedProfileFields),
                    decisionReason: normalizeOptionalText(source.decisionReason),
                };
                enrollmentRequestStore.set(hydrated.requestId, hydrated);
            }
            catch {
            }
        }
    }
    catch {
    }
}
function registerOrUpdateIdentity(input) {
    hydrateStoreFromDisk();
    const normalizedDid = normalizeDid(input.did);
    const normalizedAddress = normalizeAddress(input.walletAddress);
    ensureDidMatchesWalletAddress(normalizedDid, normalizedAddress);
    const displayName = normalizeOptionalText(input.publicProfile.displayName);
    if (!displayName) {
        throw new Error('publicProfile.displayName is required');
    }
    const existing = identityStore.get(normalizedDid);
    const now = new Date().toISOString();
    const currentVersion = existing?.publicProfile.profileVersion || 0;
    const profileVersion = sanitizeProfileVersion(input.publicProfile.profileVersion, currentVersion + 1);
    const publicProfile = {
        displayName,
        headline: normalizeOptionalText(input.publicProfile.headline),
        summary: normalizeOptionalText(input.publicProfile.summary),
        location: normalizeOptionalText(input.publicProfile.location),
        skills: sanitizeStringArray(input.publicProfile.skills),
        links: sanitizeLinks(input.publicProfile.links),
        resumePublicUrl: normalizeOptionalText(input.publicProfile.resumePublicUrl),
        profileUri: normalizeOptionalText(input.publicProfile.profileUri),
        profileHash: normalizeOptionalText(input.publicProfile.profileHash),
        profileVersion,
        updatedAt: now,
    };
    const privateProfilePointer = input.privateProfilePointer
        ? {
            encryptedProfileUri: normalizeOptionalText(input.privateProfilePointer.encryptedProfileUri),
            cipherHash: normalizeOptionalText(input.privateProfilePointer.cipherHash),
            encryptionScheme: normalizeOptionalText(input.privateProfilePointer.encryptionScheme),
        }
        : undefined;
    const record = {
        did: normalizedDid,
        walletAddress: normalizedAddress,
        publicProfile,
        privateProfilePointer,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
    };
    identityStore.set(normalizedDid, record);
    persistStoreToDisk();
    return record;
}
function getIdentityRecordByDid(did) {
    hydrateStoreFromDisk();
    const normalizedDid = normalizeDid(did);
    return identityStore.get(normalizedDid);
}
function getPublicProfileByDid(did) {
    const identity = getIdentityRecordByDid(did);
    if (!identity) {
        return undefined;
    }
    return {
        did: identity.did,
        walletAddress: identity.walletAddress,
        publicProfile: identity.publicProfile,
        updatedAt: identity.updatedAt,
    };
}
function createEnrollmentRequest(input) {
    hydrateStoreFromDisk();
    const normalizedDid = normalizeDid(input.did);
    const identity = identityStore.get(normalizedDid);
    if (!identity) {
        throw new Error('Identity not found for DID. Register identity profile first.');
    }
    const requesterOrganizationId = normalizeOptionalText(input.requesterOrganizationId);
    if (!requesterOrganizationId) {
        throw new Error('requesterOrganizationId is required');
    }
    const requesterOrganizationName = normalizeOptionalText(input.requesterOrganizationName);
    if (!requesterOrganizationName) {
        throw new Error('requesterOrganizationName is required');
    }
    const purpose = normalizeOptionalText(input.purpose);
    if (!purpose) {
        throw new Error('purpose is required');
    }
    const now = new Date();
    const expiresInHours = sanitizeExpiryHours(input.expiresInHours);
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString();
    const requestId = `enr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const request = {
        requestId,
        did: normalizedDid,
        requesterOrganizationId,
        requesterOrganizationName,
        verifierId: normalizeOptionalText(input.verifierId),
        purpose,
        requestedClaims: sanitizeStringArray(input.requestedClaims),
        requestedProfileFields: sanitizeStringArray(input.requestedProfileFields),
        status: 'pending',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt,
    };
    enrollmentRequestStore.set(requestId, request);
    persistStoreToDisk();
    return request;
}
function expireEnrollmentRequests() {
    hydrateStoreFromDisk();
    const nowIso = new Date().toISOString();
    let changed = false;
    for (const request of enrollmentRequestStore.values()) {
        if (request.status !== 'pending') {
            continue;
        }
        if (!isExpired(request.expiresAt)) {
            continue;
        }
        enrollmentRequestStore.set(request.requestId, {
            ...request,
            status: 'expired',
            updatedAt: nowIso,
            decidedAt: nowIso,
            decisionReason: 'Request expired before user decision',
        });
        changed = true;
    }
    if (changed) {
        persistStoreToDisk();
    }
}
function getEnrollmentRequestById(requestId) {
    hydrateStoreFromDisk();
    expireEnrollmentRequests();
    return enrollmentRequestStore.get(requestId);
}
function listEnrollmentRequestsByDid(input) {
    return listEnrollmentRequests({
        did: input.did,
        status: input.status,
    });
}
function listEnrollmentRequests(input) {
    hydrateStoreFromDisk();
    const normalizedDid = input?.did ? normalizeDid(input.did) : undefined;
    const normalizedRequesterOrganizationId = normalizeOptionalText(input?.requesterOrganizationId)?.toLowerCase();
    expireEnrollmentRequests();
    return Array.from(enrollmentRequestStore.values())
        .filter((request) => (normalizedDid ? request.did === normalizedDid : true))
        .filter((request) => (normalizedRequesterOrganizationId
        ? request.requesterOrganizationId.toLowerCase() === normalizedRequesterOrganizationId
        : true))
        .filter((request) => (input?.status ? request.status === input.status : true))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}
function decideEnrollmentRequest(input) {
    hydrateStoreFromDisk();
    const normalizedDid = normalizeDid(input.did);
    const request = getEnrollmentRequestById(input.requestId);
    if (!request) {
        throw new Error('Enrollment request not found');
    }
    if (request.did !== normalizedDid) {
        throw new Error('Enrollment request does not belong to provided DID');
    }
    if (request.status !== 'pending') {
        throw new Error(`Enrollment request is already ${request.status}`);
    }
    if (isExpired(request.expiresAt)) {
        const expiredAt = new Date().toISOString();
        const expired = {
            ...request,
            status: 'expired',
            updatedAt: expiredAt,
            decidedAt: expiredAt,
            decisionReason: 'Request expired before user decision',
        };
        enrollmentRequestStore.set(request.requestId, expired);
        persistStoreToDisk();
        throw new Error('Enrollment request has expired');
    }
    const now = new Date().toISOString();
    const updated = {
        ...request,
        status: input.decision,
        updatedAt: now,
        decidedAt: now,
        decisionReason: normalizeOptionalText(input.reason),
        approvedClaims: input.decision === 'approved'
            ? resolveApprovedSubset(request.requestedClaims, input.approvedClaims)
            : [],
        approvedProfileFields: input.decision === 'approved'
            ? resolveApprovedSubset(request.requestedProfileFields, input.approvedProfileFields)
            : [],
    };
    enrollmentRequestStore.set(request.requestId, updated);
    persistStoreToDisk();
    return updated;
}
//# sourceMappingURL=identityProfile.service.js.map