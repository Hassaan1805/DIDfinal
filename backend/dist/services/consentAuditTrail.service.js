"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConsentAuditTrailEnabled = isConsentAuditTrailEnabled;
exports.addConsentAuditEvent = addConsentAuditEvent;
exports.listConsentAuditEvents = listConsentAuditEvents;
exports.summarizeConsentAuditEvents = summarizeConsentAuditEvents;
exports.getConsentAuditConfiguration = getConsentAuditConfiguration;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_MAX_EVENTS = 5000;
const STORAGE_VERSION = 1;
const DID_ETHR_REGEX = /^did:ethr:(0x[a-fA-F0-9]{40})$/;
const CONSENT_AUDIT_STORAGE_FILE_PATH = process.env.CONSENT_AUDIT_STORAGE_FILE
    ? path_1.default.resolve(process.env.CONSENT_AUDIT_STORAGE_FILE)
    : path_1.default.resolve(__dirname, '../../../data/consent-audit-trail.json');
const events = [];
let hydrated = false;
function normalizeOptionalString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function normalizeDid(rawDid) {
    const trimmed = rawDid.trim();
    const match = trimmed.match(DID_ETHR_REGEX);
    if (!match) {
        throw new Error('Invalid DID format. Expected did:ethr:0x...');
    }
    return `did:ethr:${match[1].toLowerCase()}`;
}
function sanitizeStringArray(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return Array.from(new Set(values
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)));
}
function parsePositiveInt(value, fallback) {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}
function getMaxEvents() {
    return parsePositiveInt(process.env.CONSENT_AUDIT_MAX_EVENTS, DEFAULT_MAX_EVENTS);
}
function ensureStorageDirectoryExists() {
    const directory = path_1.default.dirname(CONSENT_AUDIT_STORAGE_FILE_PATH);
    fs_1.default.mkdirSync(directory, { recursive: true });
}
function buildSnapshot() {
    return {
        version: STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        events,
    };
}
function persistToDisk() {
    ensureStorageDirectoryExists();
    const snapshot = buildSnapshot();
    const tempPath = `${CONSENT_AUDIT_STORAGE_FILE_PATH}.tmp`;
    fs_1.default.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
    fs_1.default.renameSync(tempPath, CONSENT_AUDIT_STORAGE_FILE_PATH);
}
function hydrateFromDisk() {
    if (hydrated) {
        return;
    }
    hydrated = true;
    if (!fs_1.default.existsSync(CONSENT_AUDIT_STORAGE_FILE_PATH)) {
        return;
    }
    try {
        const raw = fs_1.default.readFileSync(CONSENT_AUDIT_STORAGE_FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        const sourceEvents = Array.isArray(parsed.events) ? parsed.events : [];
        for (const source of sourceEvents) {
            if (!source || typeof source !== 'object') {
                continue;
            }
            try {
                const record = source;
                const did = normalizeDid(record.did);
                const requestId = normalizeOptionalString(record.requestId);
                const requesterOrganizationId = normalizeOptionalString(record.requesterOrganizationId);
                const requesterOrganizationName = normalizeOptionalString(record.requesterOrganizationName);
                const purpose = normalizeOptionalString(record.purpose);
                const decision = record.decision === 'approved' || record.decision === 'rejected'
                    ? record.decision
                    : undefined;
                if (!requestId || !requesterOrganizationId || !requesterOrganizationName || !purpose || !decision) {
                    continue;
                }
                events.push({
                    auditId: normalizeOptionalString(record.auditId)
                        || `consent_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
                    createdAt: normalizeOptionalString(record.createdAt) || new Date().toISOString(),
                    requestId,
                    did,
                    decision,
                    decidedAt: normalizeOptionalString(record.decidedAt),
                    requesterOrganizationId,
                    requesterOrganizationName,
                    verifierId: normalizeOptionalString(record.verifierId),
                    purpose,
                    approvedClaims: sanitizeStringArray(record.approvedClaims),
                    approvedProfileFields: sanitizeStringArray(record.approvedProfileFields),
                    reason: normalizeOptionalString(record.reason),
                    actorAddress: normalizeOptionalString(record.actorAddress)?.toLowerCase(),
                    actorChallengeId: normalizeOptionalString(record.actorChallengeId),
                    actorAction: normalizeOptionalString(record.actorAction),
                });
            }
            catch {
            }
        }
    }
    catch {
    }
}
function matchesDateRange(record, filters) {
    const recordTime = Date.parse(record.createdAt);
    if (Number.isNaN(recordTime)) {
        return false;
    }
    if (filters.from) {
        const from = Date.parse(filters.from);
        if (!Number.isNaN(from) && recordTime < from) {
            return false;
        }
    }
    if (filters.to) {
        const to = Date.parse(filters.to);
        if (!Number.isNaN(to) && recordTime > to) {
            return false;
        }
    }
    return true;
}
function isConsentAuditTrailEnabled() {
    const raw = normalizeOptionalString(process.env.CONSENT_AUDIT_TRAIL_ENABLED);
    if (!raw) {
        return true;
    }
    const normalized = raw.toLowerCase();
    return !['0', 'false', 'off', 'no', 'disabled'].includes(normalized);
}
function addConsentAuditEvent(input) {
    if (!isConsentAuditTrailEnabled()) {
        return null;
    }
    hydrateFromDisk();
    const requestId = normalizeOptionalString(input.requestId);
    const requesterOrganizationId = normalizeOptionalString(input.requesterOrganizationId);
    const requesterOrganizationName = normalizeOptionalString(input.requesterOrganizationName);
    const purpose = normalizeOptionalString(input.purpose);
    const decision = input.decision === 'approved' || input.decision === 'rejected'
        ? input.decision
        : undefined;
    if (!requestId || !requesterOrganizationId || !requesterOrganizationName || !purpose || !decision) {
        throw new Error('Invalid consent audit event payload');
    }
    const record = {
        auditId: `consent_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        createdAt: normalizeOptionalString(input.createdAt) || new Date().toISOString(),
        requestId,
        did: normalizeDid(input.did),
        decision,
        decidedAt: normalizeOptionalString(input.decidedAt),
        requesterOrganizationId,
        requesterOrganizationName,
        verifierId: normalizeOptionalString(input.verifierId),
        purpose,
        approvedClaims: sanitizeStringArray(input.approvedClaims),
        approvedProfileFields: sanitizeStringArray(input.approvedProfileFields),
        reason: normalizeOptionalString(input.reason),
        actorAddress: normalizeOptionalString(input.actorAddress)?.toLowerCase(),
        actorChallengeId: normalizeOptionalString(input.actorChallengeId),
        actorAction: normalizeOptionalString(input.actorAction),
    };
    events.unshift(record);
    const maxEvents = getMaxEvents();
    if (events.length > maxEvents) {
        events.length = maxEvents;
    }
    persistToDisk();
    return record;
}
function listConsentAuditEvents(input) {
    if (!isConsentAuditTrailEnabled()) {
        return {
            events: [],
            total: 0,
            returned: 0,
            hasMore: false,
            nextCursor: null,
        };
    }
    hydrateFromDisk();
    const filters = input?.filters || {};
    const normalizedDid = filters.did ? normalizeDid(filters.did) : undefined;
    const normalizedRequestId = normalizeOptionalString(filters.requestId);
    const normalizedRequesterOrganizationId = normalizeOptionalString(filters.requesterOrganizationId)?.toLowerCase();
    const filtered = events.filter((event) => {
        if (normalizedDid && event.did !== normalizedDid) {
            return false;
        }
        if (normalizedRequestId && event.requestId !== normalizedRequestId) {
            return false;
        }
        if (normalizedRequesterOrganizationId
            && event.requesterOrganizationId.toLowerCase() !== normalizedRequesterOrganizationId) {
            return false;
        }
        if (filters.decision && event.decision !== filters.decision) {
            return false;
        }
        if (!matchesDateRange(event, filters)) {
            return false;
        }
        return true;
    });
    const total = filtered.length;
    const limit = Math.min(Math.max(input?.limit || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const cursor = Number.isFinite(input?.cursor) && (input?.cursor || 0) >= 0
        ? Number(input?.cursor)
        : 0;
    const result = filtered.slice(cursor, cursor + limit);
    const nextCursor = cursor + result.length;
    return {
        events: result,
        total,
        returned: result.length,
        hasMore: nextCursor < total,
        nextCursor: nextCursor < total ? nextCursor : null,
    };
}
function summarizeConsentAuditEvents(input) {
    const listing = listConsentAuditEvents({
        filters: input?.filters,
        limit: getMaxEvents(),
        cursor: 0,
    });
    let approved = 0;
    let rejected = 0;
    for (const event of listing.events) {
        if (event.decision === 'approved') {
            approved += 1;
        }
        else if (event.decision === 'rejected') {
            rejected += 1;
        }
    }
    return {
        total: listing.total,
        approved,
        rejected,
        lastEventAt: listing.events.length > 0 ? listing.events[0].createdAt : null,
    };
}
function getConsentAuditConfiguration() {
    return {
        enabled: isConsentAuditTrailEnabled(),
        storageFilePath: CONSENT_AUDIT_STORAGE_FILE_PATH,
        maxEvents: getMaxEvents(),
    };
}
//# sourceMappingURL=consentAuditTrail.service.js.map