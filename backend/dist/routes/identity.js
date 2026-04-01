"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityRoutes = void 0;
const express_1 = require("express");
const ethers_1 = require("ethers");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const consentAuditTrail_service_1 = require("../services/consentAuditTrail.service");
const identityProfile_service_1 = require("../services/identityProfile.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.identityRoutes = router;
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const IDENTITY_CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const IDENTITY_PROOF_TOKEN_EXPIRY_SECONDS = 10 * 60;
const DID_ETHR_REGEX = /^did:ethr:(0x[a-fA-F0-9]{40})$/;
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const identityProofChallengeStore = new Map();
function normalizeDid(rawDid) {
    const trimmed = rawDid.trim();
    const match = trimmed.match(DID_ETHR_REGEX);
    if (!match) {
        throw new Error('Invalid DID format. Expected did:ethr:0x...');
    }
    return `did:ethr:${match[1].toLowerCase()}`;
}
function normalizeAddress(rawAddress) {
    const trimmed = rawAddress.trim();
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
function parseIdentityProofAction(value) {
    if (value === 'register_profile' || value === 'list_enrollments' || value === 'enrollment_decision') {
        return value;
    }
    return undefined;
}
function cleanupExpiredIdentityChallenges(now = Date.now()) {
    for (const [challengeId, challenge] of identityProofChallengeStore.entries()) {
        if (challenge.expiresAtMs <= now) {
            identityProofChallengeStore.delete(challengeId);
        }
    }
}
function getBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return undefined;
    }
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : undefined;
}
function createIdentityChallengeMessage(input) {
    const nonce = crypto_1.default.randomBytes(24).toString('hex');
    return [
        'identity-owner-proof',
        `action:${input.action}`,
        `did:${input.did}`,
        `requestId:${input.requestId || 'none'}`,
        `nonce:${nonce}`,
        `issuedAt:${input.issuedAtIso}`,
    ].join('|');
}
function requireIdentityProof(expectedAction) {
    return (req, res, next) => {
        const token = getBearerToken(req);
        if (!token) {
            const response = {
                success: false,
                error: 'Identity proof token is required. Complete /api/identity/auth/challenge and /api/identity/auth/verify first.',
                timestamp: new Date().toISOString(),
            };
            res.status(401).json(response);
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
                issuer: 'decentralized-trust-platform',
                audience: 'identity-api',
            });
            if (decoded.proofType !== 'identity-owner') {
                const response = {
                    success: false,
                    error: 'Invalid identity proof token type',
                    timestamp: new Date().toISOString(),
                };
                res.status(401).json(response);
                return;
            }
            const tokenAction = parseIdentityProofAction(decoded.action);
            if (!tokenAction) {
                const response = {
                    success: false,
                    error: 'Invalid identity proof action claim',
                    timestamp: new Date().toISOString(),
                };
                res.status(401).json(response);
                return;
            }
            if (tokenAction !== expectedAction) {
                const response = {
                    success: false,
                    error: `Identity proof token action mismatch. Expected ${expectedAction}, got ${tokenAction}`,
                    timestamp: new Date().toISOString(),
                };
                res.status(403).json(response);
                return;
            }
            const normalizedDid = normalizeDid(decoded.did);
            const normalizedAddress = normalizeAddress(decoded.address);
            req.identityProof = {
                ...decoded,
                did: normalizedDid,
                address: normalizedAddress,
                action: tokenAction,
            };
            next();
        }
        catch (error) {
            const message = error?.name === 'TokenExpiredError'
                ? 'Identity proof token has expired'
                : 'Invalid identity proof token';
            const response = {
                success: false,
                error: message,
                timestamp: new Date().toISOString(),
            };
            res.status(401).json(response);
        }
    };
}
function parseDidParam(rawDid) {
    try {
        return decodeURIComponent(rawDid);
    }
    catch {
        return rawDid;
    }
}
function parseEnrollmentStatus(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'expired') {
        return value;
    }
    return undefined;
}
function normalizeOptionalString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function parsePositiveInteger(value, fallback) {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Math.floor(parsed);
}
function parseDecision(value) {
    if (value === 'approved' || value === 'rejected') {
        return value;
    }
    return undefined;
}
function summarizeConsentRecords(records) {
    let approved = 0;
    let rejected = 0;
    for (const record of records) {
        if (record.decision === 'approved') {
            approved += 1;
        }
        else if (record.decision === 'rejected') {
            rejected += 1;
        }
    }
    return {
        total: records.length,
        approved,
        rejected,
        lastEventAt: records.length > 0 ? records[0].createdAt : null,
    };
}
function paginateConsentRecords(records, limit, cursor) {
    const boundedLimit = Math.min(Math.max(limit, 1), 200);
    const boundedCursor = Math.max(cursor, 0);
    const page = records.slice(boundedCursor, boundedCursor + boundedLimit);
    const nextCursor = boundedCursor + page.length;
    return {
        events: page,
        returned: page.length,
        hasMore: nextCursor < records.length,
        nextCursor: nextCursor < records.length ? nextCursor : null,
    };
}
function parseOptionalBoolean(value) {
    if (typeof value !== 'boolean') {
        return undefined;
    }
    return value;
}
function extractAdminOrganizationScopes(adminUser) {
    const scopes = new Set();
    if (!adminUser || typeof adminUser !== 'object') {
        return scopes;
    }
    const typedUser = adminUser;
    const addScope = (value) => {
        if (Array.isArray(value)) {
            for (const item of value) {
                addScope(item);
            }
            return;
        }
        if (typeof value !== 'string') {
            return;
        }
        const normalized = value.trim().toLowerCase();
        if (normalized.length > 0) {
            scopes.add(normalized);
        }
    };
    addScope(typedUser.verifierOrganizationId);
    addScope(typedUser.organizationId);
    addScope(typedUser.companyId);
    addScope(typedUser.verifierOrganizationIds);
    addScope(typedUser.organizationIds);
    addScope(typedUser.companyIds);
    return scopes;
}
router.post('/auth/challenge', (req, res) => {
    try {
        const { did, action, requestId, } = req.body;
        if (!did || !action) {
            const response = {
                success: false,
                error: 'did and action are required',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }
        const parsedAction = parseIdentityProofAction(action);
        if (!parsedAction) {
            const response = {
                success: false,
                error: 'Unsupported action. Use register_profile, list_enrollments, or enrollment_decision',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }
        if (parsedAction === 'enrollment_decision' && (!requestId || !requestId.trim())) {
            const response = {
                success: false,
                error: 'requestId is required when action=enrollment_decision',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }
        const normalizedDid = normalizeDid(did);
        const normalizedRequestId = requestId?.trim() || undefined;
        cleanupExpiredIdentityChallenges();
        const now = Date.now();
        const issuedAtIso = new Date(now).toISOString();
        const challengeId = `identity_${crypto_1.default.randomUUID()}`;
        const challenge = createIdentityChallengeMessage({
            did: normalizedDid,
            action: parsedAction,
            requestId: normalizedRequestId,
            issuedAtIso,
        });
        identityProofChallengeStore.set(challengeId, {
            challengeId,
            challenge,
            did: normalizedDid,
            action: parsedAction,
            requestId: normalizedRequestId,
            createdAtMs: now,
            expiresAtMs: now + IDENTITY_CHALLENGE_EXPIRY_MS,
            used: false,
        });
        const response = {
            success: true,
            data: {
                challengeId,
                challenge,
                did: normalizedDid,
                action: parsedAction,
                requestId: normalizedRequestId,
                expiresAt: new Date(now + IDENTITY_CHALLENGE_EXPIRY_MS).toISOString(),
                expiresInSeconds: Math.floor(IDENTITY_CHALLENGE_EXPIRY_MS / 1000),
            },
            message: 'Identity ownership challenge issued',
            timestamp: new Date().toISOString(),
        };
        res.status(201).json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to issue identity ownership challenge',
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
router.post('/auth/verify', (req, res) => {
    try {
        const { challengeId, did, message, signature, address, requestId, } = req.body;
        if (!challengeId || !did || !message || !signature) {
            const response = {
                success: false,
                error: 'challengeId, did, message, and signature are required',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }
        cleanupExpiredIdentityChallenges();
        const challengeRecord = identityProofChallengeStore.get(challengeId);
        if (!challengeRecord) {
            const response = {
                success: false,
                error: 'Identity challenge not found or expired',
                timestamp: new Date().toISOString(),
            };
            res.status(404).json(response);
            return;
        }
        if (challengeRecord.used) {
            const response = {
                success: false,
                error: 'Identity challenge already used',
                timestamp: new Date().toISOString(),
            };
            res.status(409).json(response);
            return;
        }
        if (Date.now() > challengeRecord.expiresAtMs) {
            identityProofChallengeStore.delete(challengeId);
            const response = {
                success: false,
                error: 'Identity challenge expired',
                timestamp: new Date().toISOString(),
            };
            res.status(410).json(response);
            return;
        }
        const normalizedDid = normalizeDid(did);
        if (challengeRecord.did !== normalizedDid) {
            const response = {
                success: false,
                error: 'Challenge DID mismatch',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        if (message !== challengeRecord.challenge) {
            const response = {
                success: false,
                error: 'Signed message does not match challenge',
                timestamp: new Date().toISOString(),
            };
            res.status(401).json(response);
            return;
        }
        const requestIdFromBody = requestId?.trim() || undefined;
        if (challengeRecord.requestId && requestIdFromBody && challengeRecord.requestId !== requestIdFromBody) {
            const response = {
                success: false,
                error: 'requestId does not match challenge context',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        let recoveredAddress;
        try {
            recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        }
        catch {
            const response = {
                success: false,
                error: 'Invalid signature',
                timestamp: new Date().toISOString(),
            };
            res.status(401).json(response);
            return;
        }
        const normalizedRecoveredAddress = normalizeAddress(recoveredAddress);
        const didAddress = didToAddress(normalizedDid);
        if (normalizedRecoveredAddress !== didAddress) {
            const response = {
                success: false,
                error: 'Recovered wallet address does not match DID owner',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        if (address) {
            const normalizedSubmittedAddress = normalizeAddress(address);
            if (normalizedSubmittedAddress !== normalizedRecoveredAddress) {
                const response = {
                    success: false,
                    error: 'Submitted address does not match signature owner',
                    timestamp: new Date().toISOString(),
                };
                res.status(403).json(response);
                return;
            }
        }
        challengeRecord.used = true;
        identityProofChallengeStore.delete(challengeId);
        const payload = {
            proofType: 'identity-owner',
            did: normalizedDid,
            address: normalizedRecoveredAddress,
            action: challengeRecord.action,
            requestId: challengeRecord.requestId,
            challengeId,
            timestamp: new Date().toISOString(),
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: IDENTITY_PROOF_TOKEN_EXPIRY_SECONDS,
            issuer: 'decentralized-trust-platform',
            audience: 'identity-api',
            subject: 'identity-owner-proof',
        });
        const response = {
            success: true,
            data: {
                token,
                did: normalizedDid,
                address: normalizedRecoveredAddress,
                action: challengeRecord.action,
                requestId: challengeRecord.requestId,
                expiresInSeconds: IDENTITY_PROOF_TOKEN_EXPIRY_SECONDS,
            },
            message: 'Identity ownership verified',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to verify identity ownership challenge',
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
router.post('/register', requireIdentityProof('register_profile'), (req, res) => {
    try {
        const { did, walletAddress, publicProfile, privateProfilePointer, } = req.body;
        if (!did || !walletAddress || !publicProfile || !publicProfile.displayName) {
            const response = {
                success: false,
                error: 'did, walletAddress, publicProfile, and publicProfile.displayName are required',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }
        const normalizedDid = normalizeDid(did);
        const normalizedWalletAddress = normalizeAddress(walletAddress);
        if (!req.identityProof || req.identityProof.did !== normalizedDid) {
            const response = {
                success: false,
                error: 'Identity proof token DID does not match request DID',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        if (req.identityProof.address !== normalizedWalletAddress) {
            const response = {
                success: false,
                error: 'Identity proof token wallet address does not match request walletAddress',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        const typedPublicProfile = {
            ...publicProfile,
            displayName: publicProfile.displayName,
        };
        const identity = (0, identityProfile_service_1.registerOrUpdateIdentity)({
            did: normalizedDid,
            walletAddress: normalizedWalletAddress,
            publicProfile: typedPublicProfile,
            privateProfilePointer,
        });
        const response = {
            success: true,
            data: identity,
            message: 'Identity profile registered successfully',
            timestamp: new Date().toISOString(),
        };
        res.status(201).json(response);
    }
    catch (error) {
        const message = error?.message || 'Failed to register identity profile';
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
router.post('/enrollment-requests', (req, res) => {
    try {
        const { did, requesterOrganizationId, requesterOrganizationName, verifierId, purpose, requestedClaims, requestedProfileFields, expiresInHours, } = req.body;
        if (!did || !requesterOrganizationId || !requesterOrganizationName || !purpose) {
            const response = {
                success: false,
                error: 'did, requesterOrganizationId, requesterOrganizationName, and purpose are required',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }
        const request = (0, identityProfile_service_1.createEnrollmentRequest)({
            did,
            requesterOrganizationId,
            requesterOrganizationName,
            verifierId,
            purpose,
            requestedClaims,
            requestedProfileFields,
            expiresInHours,
        });
        const response = {
            success: true,
            data: request,
            message: 'Enrollment request created successfully',
            timestamp: new Date().toISOString(),
        };
        res.status(201).json(response);
    }
    catch (error) {
        const message = error?.message || 'Failed to create enrollment request';
        const status = message.includes('not found') ? 404 : 400;
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString(),
        };
        res.status(status).json(response);
    }
});
router.get('/enrollment-requests', auth_middleware_1.requireAdminAuth, (req, res) => {
    try {
        const status = parseEnrollmentStatus(req.query.status);
        const did = typeof req.query.did === 'string' ? parseDidParam(req.query.did) : undefined;
        const requesterOrganizationId = normalizeOptionalString(req.query.requesterOrganizationId);
        const orgScopes = extractAdminOrganizationScopes(req.adminUser);
        if (req.adminAuthMethod === 'jwt' && orgScopes.size > 0 && requesterOrganizationId) {
            const normalizedRequestedOrg = requesterOrganizationId.toLowerCase();
            if (!orgScopes.has(normalizedRequestedOrg)) {
                const response = {
                    success: false,
                    error: 'Forbidden: requested organization is outside admin scope',
                    timestamp: new Date().toISOString(),
                };
                res.status(403).json(response);
                return;
            }
        }
        const requests = (0, identityProfile_service_1.listEnrollmentRequests)({
            did,
            requesterOrganizationId,
            status,
        });
        const filteredRequests = req.adminAuthMethod === 'jwt' && orgScopes.size > 0
            ? requests.filter((request) => orgScopes.has(request.requesterOrganizationId.toLowerCase()))
            : requests;
        const response = {
            success: true,
            data: filteredRequests,
            message: 'Enrollment requests listed successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to list enrollment requests',
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
router.get('/enrollment-requests/:requestId', (req, res) => {
    try {
        const { requestId } = req.params;
        const request = (0, identityProfile_service_1.getEnrollmentRequestById)(requestId);
        if (!request) {
            const response = {
                success: false,
                error: 'Enrollment request not found',
                timestamp: new Date().toISOString(),
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            data: request,
            message: 'Enrollment request retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to retrieve enrollment request',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    }
});
router.post('/enrollment-requests/:requestId/decision', requireIdentityProof('enrollment_decision'), (req, res) => {
    try {
        const { requestId } = req.params;
        const { did, decision, approvedClaims, approvedProfileFields, reason, recordAuditTrail, } = req.body;
        if (!did || !decision) {
            const response = {
                success: false,
                error: 'did and decision are required',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }
        if (decision !== 'approved' && decision !== 'rejected') {
            const response = {
                success: false,
                error: 'decision must be either approved or rejected',
                timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
        }
        const normalizedDid = normalizeDid(did);
        if (!req.identityProof || req.identityProof.did !== normalizedDid) {
            const response = {
                success: false,
                error: 'Identity proof token DID does not match decision DID',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        if (req.identityProof.requestId && req.identityProof.requestId !== requestId) {
            const response = {
                success: false,
                error: 'Identity proof token requestId does not match decision target',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        const updated = (0, identityProfile_service_1.decideEnrollmentRequest)({
            requestId,
            did: normalizedDid,
            decision,
            approvedClaims,
            approvedProfileFields,
            reason,
        });
        const shouldRecordAudit = parseOptionalBoolean(recordAuditTrail) !== false;
        if (shouldRecordAudit && (0, consentAuditTrail_service_1.isConsentAuditTrailEnabled)()) {
            try {
                (0, consentAuditTrail_service_1.addConsentAuditEvent)({
                    requestId: updated.requestId,
                    did: updated.did,
                    decision: updated.status === 'approved' || updated.status === 'rejected'
                        ? updated.status
                        : decision,
                    decidedAt: updated.decidedAt,
                    requesterOrganizationId: updated.requesterOrganizationId,
                    requesterOrganizationName: updated.requesterOrganizationName,
                    verifierId: updated.verifierId,
                    purpose: updated.purpose,
                    approvedClaims: updated.approvedClaims || [],
                    approvedProfileFields: updated.approvedProfileFields || [],
                    reason: updated.decisionReason,
                    actorAddress: req.identityProof?.address,
                    actorChallengeId: req.identityProof?.challengeId,
                    actorAction: req.identityProof?.action,
                });
            }
            catch (auditError) {
                console.error('Consent audit trail write failed:', auditError?.message || auditError);
            }
        }
        const response = {
            success: true,
            data: updated,
            message: `Enrollment request ${decision} successfully`,
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const message = error?.message || 'Failed to apply enrollment decision';
        let status = 400;
        if (message.includes('not found')) {
            status = 404;
        }
        else if (message.includes('does not belong')) {
            status = 403;
        }
        else if (message.includes('expired')) {
            status = 410;
        }
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString(),
        };
        res.status(status).json(response);
    }
});
router.get('/consent-audit', auth_middleware_1.requireAdminAuth, (req, res) => {
    try {
        const did = typeof req.query.did === 'string' ? parseDidParam(req.query.did) : undefined;
        const requestId = normalizeOptionalString(req.query.requestId);
        const requesterOrganizationId = normalizeOptionalString(req.query.requesterOrganizationId);
        const decision = parseDecision(req.query.decision);
        const from = normalizeOptionalString(req.query.from);
        const to = normalizeOptionalString(req.query.to);
        const limit = parsePositiveInteger(req.query.limit, 50);
        const cursor = parsePositiveInteger(req.query.cursor, 0);
        const auditConfig = (0, consentAuditTrail_service_1.getConsentAuditConfiguration)();
        const orgScopes = extractAdminOrganizationScopes(req.adminUser);
        if (req.adminAuthMethod === 'jwt' && orgScopes.size > 0 && requesterOrganizationId) {
            if (!orgScopes.has(requesterOrganizationId.toLowerCase())) {
                const response = {
                    success: false,
                    error: 'Forbidden: requested organization is outside admin scope',
                    timestamp: new Date().toISOString(),
                };
                res.status(403).json(response);
                return;
            }
        }
        const filters = {
            did,
            requestId,
            requesterOrganizationId,
            decision,
            from,
            to,
        };
        if (req.adminAuthMethod === 'jwt' && orgScopes.size > 0 && !requesterOrganizationId) {
            const allMatches = (0, consentAuditTrail_service_1.listConsentAuditEvents)({
                filters,
                limit: auditConfig.maxEvents,
                cursor: 0,
            }).events.filter((event) => orgScopes.has(event.requesterOrganizationId.toLowerCase()));
            const page = paginateConsentRecords(allMatches, limit, cursor);
            const summary = summarizeConsentRecords(allMatches);
            const response = {
                success: true,
                data: {
                    filters,
                    events: page.events,
                    pagination: {
                        limit,
                        cursor,
                        returned: page.returned,
                        total: allMatches.length,
                        hasMore: page.hasMore,
                        nextCursor: page.nextCursor,
                    },
                    summary,
                    config: {
                        enabled: auditConfig.enabled,
                    },
                },
                message: 'Consent audit events retrieved successfully',
                timestamp: new Date().toISOString(),
            };
            res.json(response);
            return;
        }
        const listing = (0, consentAuditTrail_service_1.listConsentAuditEvents)({
            filters,
            limit,
            cursor,
        });
        const summary = (0, consentAuditTrail_service_1.summarizeConsentAuditEvents)({ filters });
        const response = {
            success: true,
            data: {
                filters,
                events: listing.events,
                pagination: {
                    limit,
                    cursor,
                    returned: listing.returned,
                    total: listing.total,
                    hasMore: listing.hasMore,
                    nextCursor: listing.nextCursor,
                },
                summary,
                config: {
                    enabled: auditConfig.enabled,
                },
            },
            message: 'Consent audit events retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to list consent audit events',
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
router.get('/:did/consent-audit', requireIdentityProof('list_enrollments'), (req, res) => {
    try {
        const did = normalizeDid(parseDidParam(req.params.did));
        const decision = parseDecision(req.query.decision);
        const requestId = normalizeOptionalString(req.query.requestId);
        const from = normalizeOptionalString(req.query.from);
        const to = normalizeOptionalString(req.query.to);
        const limit = parsePositiveInteger(req.query.limit, 50);
        const cursor = parsePositiveInteger(req.query.cursor, 0);
        if (!req.identityProof || req.identityProof.did !== did) {
            const response = {
                success: false,
                error: 'Identity proof token DID does not match requested DID',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        const filters = {
            did,
            requestId,
            decision,
            from,
            to,
        };
        const listing = (0, consentAuditTrail_service_1.listConsentAuditEvents)({
            filters,
            limit,
            cursor,
        });
        const summary = (0, consentAuditTrail_service_1.summarizeConsentAuditEvents)({ filters });
        const auditConfig = (0, consentAuditTrail_service_1.getConsentAuditConfiguration)();
        const response = {
            success: true,
            data: {
                filters,
                events: listing.events,
                pagination: {
                    limit,
                    cursor,
                    returned: listing.returned,
                    total: listing.total,
                    hasMore: listing.hasMore,
                    nextCursor: listing.nextCursor,
                },
                summary,
                config: {
                    enabled: auditConfig.enabled,
                },
            },
            message: 'Consent audit events retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to list consent audit events',
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
router.get('/:did/enrollment-requests', requireIdentityProof('list_enrollments'), (req, res) => {
    try {
        const did = normalizeDid(parseDidParam(req.params.did));
        const status = parseEnrollmentStatus(req.query.status);
        if (!req.identityProof || req.identityProof.did !== did) {
            const response = {
                success: false,
                error: 'Identity proof token DID does not match requested DID',
                timestamp: new Date().toISOString(),
            };
            res.status(403).json(response);
            return;
        }
        const requests = (0, identityProfile_service_1.listEnrollmentRequestsByDid)({ did, status });
        const response = {
            success: true,
            data: requests,
            message: 'Enrollment requests retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to list enrollment requests',
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
router.get('/:did/public-profile', (req, res) => {
    try {
        const did = parseDidParam(req.params.did);
        const profile = (0, identityProfile_service_1.getPublicProfileByDid)(did);
        if (!profile) {
            const response = {
                success: false,
                error: 'Public profile not found',
                timestamp: new Date().toISOString(),
            };
            res.status(404).json(response);
            return;
        }
        const response = {
            success: true,
            data: profile,
            message: 'Public profile retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error?.message || 'Failed to retrieve public profile',
            timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
    }
});
//# sourceMappingURL=identity.js.map