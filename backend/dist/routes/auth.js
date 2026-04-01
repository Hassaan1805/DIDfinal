"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const ethers_1 = require("ethers");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const did_jwt_1 = require("did-jwt");
const blockchainService_1 = require("../services/blockchainService");
const SepoliaService_1 = require("../services/SepoliaService");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const refreshToken_service_1 = require("../services/refreshToken.service");
const employeeDirectory_1 = require("../services/employeeDirectory");
const employeeOnChainRegistry_1 = require("../services/employeeOnChainRegistry");
const issuerTrust_service_1 = require("../services/issuerTrust.service");
const credentialStatus_service_1 = require("../services/credentialStatus.service");
const verifierProfiles_service_1 = require("../services/verifierProfiles.service");
const authTimeline_service_1 = require("../services/authTimeline.service");
const challengeStorage_service_1 = require("../services/challengeStorage.service");
const router = (0, express_1.Router)();
exports.authRoutes = router;
const blockchainService = new blockchainService_1.BlockchainService({
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    contractAddress: process.env.DID_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
});
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const SHOULD_SKIP_ONCHAIN_VERIFY = process.env.ONCHAIN_VERIFY_MODE === 'off';
const CHALLENGE_EXPIRY_TIME = 10 * 60 * 1000;
const CHALLENGE_EXPIRY_SECONDS = Math.floor(CHALLENGE_EXPIRY_TIME / 1000);
const DISCLOSURE_BINDING_VERSION = 'sd-bind-v1';
const DISCLOSURE_BINDING_PREFIX = 'Selective disclosure binding:';
const AUTH_TIMELINE_EVENT_TYPES = [
    'challenge_created',
    'challenge_expired',
    'verification_attempted',
    'verification_succeeded',
    'verification_failed',
    'token_verified',
    'token_verification_failed',
    'session_status_checked',
];
const AUTH_TIMELINE_EVENT_STATUS = ['success', 'failure', 'info'];
function getSingleQueryValue(value) {
    if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : undefined;
    }
    return typeof value === 'string' ? value : undefined;
}
function normalizeOptionalString(value) {
    const raw = getSingleQueryValue(value);
    if (!raw) {
        return undefined;
    }
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function parsePositiveInteger(value, fallback) {
    const raw = normalizeOptionalString(value);
    if (!raw) {
        return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Math.floor(parsed);
}
function isChallengeExpired(challengeData, now = Date.now()) {
    return now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME;
}
function getRemainingChallengeTtlSeconds(challengeData, now = Date.now()) {
    const expiresAt = challengeData.timestamp + CHALLENGE_EXPIRY_TIME;
    const remainingMs = expiresAt - now;
    return Math.max(1, Math.ceil(remainingMs / 1000));
}
async function persistChallengeState(challengeId, challengeData) {
    const now = Date.now();
    if (isChallengeExpired(challengeData, now)) {
        await (0, challengeStorage_service_1.deleteChallenge)(challengeId);
        return;
    }
    await (0, challengeStorage_service_1.setChallenge)(challengeId, challengeData, getRemainingChallengeTtlSeconds(challengeData, now));
}
async function getChallengeEntryBySessionId(sessionId) {
    const challengeIds = await (0, challengeStorage_service_1.getAllChallengeIds)();
    for (const challengeId of challengeIds) {
        const challengeData = await (0, challengeStorage_service_1.getChallenge)(challengeId);
        if (!challengeData) {
            continue;
        }
        if (challengeId.includes(sessionId) || challengeData.challenge.includes(sessionId)) {
            return {
                challengeId,
                challengeData,
            };
        }
    }
    return null;
}
async function listChallengeIds() {
    return await (0, challengeStorage_service_1.getAllChallengeIds)();
}
function isAuthTimelineEventType(value) {
    return AUTH_TIMELINE_EVENT_TYPES.includes(value);
}
function isAuthTimelineEventStatus(value) {
    return AUTH_TIMELINE_EVENT_STATUS.includes(value);
}
function normalizeBaseUrl(baseUrl) {
    return baseUrl.replace(/\/+$/, '');
}
function isPrivateIpv4(value) {
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)\d{1,3}\.\d{1,3}$/.test(value);
}
function resolveApiBaseUrl(req) {
    const configuredBaseUrl = process.env.PUBLIC_API_BASE_URL;
    if (configuredBaseUrl) {
        return normalizeBaseUrl(configuredBaseUrl);
    }
    const preferredHostIp = process.env.PRIMARY_HOST_IP || process.env.LOCAL_IP;
    if (preferredHostIp && isPrivateIpv4(preferredHostIp)) {
        return `http://${preferredHostIp}:${process.env.PORT || '3001'}`;
    }
    if (req) {
        const forwardedProtoHeader = req.headers['x-forwarded-proto'];
        const forwardedHostHeader = req.headers['x-forwarded-host'];
        const forwardedProto = Array.isArray(forwardedProtoHeader)
            ? forwardedProtoHeader[0]
            : forwardedProtoHeader;
        const forwardedHost = Array.isArray(forwardedHostHeader)
            ? forwardedHostHeader[0]
            : forwardedHostHeader;
        const host = forwardedHost || req.get('host');
        const protocol = forwardedProto || req.protocol || 'http';
        if (host) {
            return normalizeBaseUrl(`${protocol}://${host}`);
        }
    }
    return `http://localhost:${process.env.PORT || '3001'}`;
}
function normalizeClaimValue(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return undefined;
}
function hashUtf8(value) {
    return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(value));
}
function canonicalizeClaims(claims) {
    return Object.entries(claims)
        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value.trim()}`)
        .join('|');
}
function computeClaimDigest(claims) {
    const canonical = canonicalizeClaims(claims);
    return hashUtf8(canonical || 'no-claims');
}
function computeBindingDigest(input) {
    const material = [
        input.challengeId,
        input.challengeDigest,
        input.claimDigest,
        input.credentialDigest || 'no-credential',
        input.bindingVersion,
    ].join('|');
    return hashUtf8(material);
}
function parseDisclosedClaimsProof(input) {
    if (input === undefined || input === null) {
        return undefined;
    }
    if (typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('disclosedClaimsProof must be an object when provided');
    }
    const raw = input;
    const requiredStringFields = [
        'bindingVersion',
        'challengeId',
        'challengeDigest',
        'claimDigest',
        'bindingDigest',
        'signedBinding',
    ];
    for (const field of requiredStringFields) {
        if (typeof raw[field] !== 'string' || !raw[field].trim()) {
            throw new Error(`disclosedClaimsProof.${field} must be a non-empty string`);
        }
    }
    if (raw.credentialDigest !== undefined && (typeof raw.credentialDigest !== 'string' || !raw.credentialDigest.trim())) {
        throw new Error('disclosedClaimsProof.credentialDigest must be a non-empty string when provided');
    }
    if (raw.createdAt !== undefined && (typeof raw.createdAt !== 'string' || !raw.createdAt.trim())) {
        throw new Error('disclosedClaimsProof.createdAt must be a non-empty string when provided');
    }
    return {
        bindingVersion: String(raw.bindingVersion).trim(),
        challengeId: String(raw.challengeId).trim(),
        challengeDigest: String(raw.challengeDigest).trim(),
        claimDigest: String(raw.claimDigest).trim(),
        credentialDigest: typeof raw.credentialDigest === 'string' ? raw.credentialDigest.trim() : undefined,
        bindingDigest: String(raw.bindingDigest).trim(),
        signedBinding: String(raw.signedBinding).trim(),
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt.trim() : undefined,
    };
}
function verifyDisclosedClaimsProof(input) {
    if (input.proof.bindingVersion !== DISCLOSURE_BINDING_VERSION) {
        return {
            verified: false,
            reason: `Unsupported bindingVersion: ${input.proof.bindingVersion}`,
        };
    }
    if (input.proof.challengeId !== input.challengeId) {
        return {
            verified: false,
            reason: 'challengeId mismatch in disclosedClaimsProof',
        };
    }
    const expectedChallengeDigest = hashUtf8(input.challengeText);
    if (input.proof.challengeDigest !== expectedChallengeDigest) {
        return {
            verified: false,
            reason: 'challengeDigest mismatch in disclosedClaimsProof',
        };
    }
    const expectedClaimDigest = computeClaimDigest(input.disclosedClaims);
    if (input.proof.claimDigest !== expectedClaimDigest) {
        return {
            verified: false,
            reason: 'claimDigest mismatch in disclosedClaimsProof',
        };
    }
    const expectedCredentialDigest = input.credential ? hashUtf8(input.credential) : undefined;
    if (expectedCredentialDigest && input.proof.credentialDigest !== expectedCredentialDigest) {
        return {
            verified: false,
            reason: 'credentialDigest mismatch in disclosedClaimsProof',
        };
    }
    const recomputedBindingDigest = computeBindingDigest({
        challengeId: input.challengeId,
        challengeDigest: expectedChallengeDigest,
        claimDigest: expectedClaimDigest,
        credentialDigest: expectedCredentialDigest,
        bindingVersion: input.proof.bindingVersion,
    });
    if (input.proof.bindingDigest !== recomputedBindingDigest) {
        return {
            verified: false,
            reason: 'bindingDigest mismatch in disclosedClaimsProof',
        };
    }
    try {
        const recoveredAddress = ethers_1.ethers.verifyMessage(`${DISCLOSURE_BINDING_PREFIX} ${input.proof.bindingDigest}`, input.proof.signedBinding);
        if (recoveredAddress.toLowerCase() !== input.walletAddress.toLowerCase()) {
            return {
                verified: false,
                reason: 'signedBinding signature does not match wallet address',
            };
        }
    }
    catch (error) {
        return {
            verified: false,
            reason: error?.message || 'Unable to verify signedBinding signature',
        };
    }
    return {
        verified: true,
        bindingDigest: recomputedBindingDigest,
    };
}
function parseDisclosedClaims(input) {
    if (input === undefined || input === null) {
        return {};
    }
    if (typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('disclosedClaims must be an object when provided');
    }
    const raw = input;
    const parsed = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!verifierProfiles_service_1.SUPPORTED_VERIFIER_CLAIM_KEYS.includes(key)) {
            throw new Error(`Unsupported disclosed claim key: ${key}`);
        }
        const normalized = normalizeClaimValue(value);
        if (!normalized) {
            throw new Error(`disclosedClaims.${key} must be a non-empty string-compatible value`);
        }
        parsed[key] = normalized;
    }
    return parsed;
}
function buildExpectedClaimValues(input) {
    return {
        subjectDid: input.resolvedDid,
        employeeId: input.resolvedEmployee?.id || input.credentialClaims?.employeeId,
        name: input.resolvedEmployee?.name || input.credentialClaims?.name,
        role: input.credentialClaims?.role || input.resolvedEmployee?.badge,
        department: input.resolvedEmployee?.department || input.credentialClaims?.department,
        email: input.resolvedEmployee?.email || input.credentialClaims?.email,
    };
}
function verifyDisclosedClaims(input) {
    const missingClaims = [];
    const mismatchedClaims = [];
    for (const claimKey of input.requiredClaims) {
        const disclosedValue = input.disclosedClaims[claimKey];
        if (!disclosedValue) {
            missingClaims.push(claimKey);
            continue;
        }
        const expectedValue = input.expectedClaims[claimKey];
        if (!expectedValue || disclosedValue !== expectedValue) {
            mismatchedClaims.push(claimKey);
        }
    }
    return {
        verified: missingClaims.length === 0 && mismatchedClaims.length === 0,
        missingClaims,
        mismatchedClaims,
    };
}
async function verifyCredentialAgainstDid(credential, expectedDid) {
    const verificationResult = await (0, did_jwt_1.verifyJWT)(credential, {
        resolver: undefined,
        audience: undefined,
    });
    const vcPayload = verificationResult.payload;
    if (!vcPayload?.vc || !vcPayload.vc?.credentialSubject) {
        throw new Error('Invalid credential structure');
    }
    const credentialId = (typeof vcPayload.vc?.id === 'string' && vcPayload.vc.id.trim()) ||
        (typeof vcPayload.jti === 'string' && vcPayload.jti.trim()) ||
        null;
    const credentialPolicy = (0, credentialStatus_service_1.getCredentialStatusPolicy)();
    if (credentialPolicy.requireCredentialId && !credentialId) {
        throw new Error('Credential ID is required by policy');
    }
    const credentialStatus = (0, credentialStatus_service_1.getCredentialStatus)(credentialId);
    if (credentialStatus.status === 'revoked') {
        throw new Error(credentialStatus.reason || 'Credential has been revoked');
    }
    if (credentialStatus.status === 'expired') {
        throw new Error(credentialStatus.reason || 'Credential has expired');
    }
    if (credentialPolicy.strictStatusCheck && credentialStatus.status === 'unknown') {
        throw new Error('Credential status is unknown in registry');
    }
    const credentialSubject = vcPayload.vc.credentialSubject;
    if (credentialSubject.id !== expectedDid) {
        throw new Error('Credential not issued to authenticated user');
    }
    const issuer = typeof vcPayload.vc.issuer === 'string'
        ? vcPayload.vc.issuer
        : vcPayload.vc.issuer?.id;
    if (!issuer) {
        throw new Error('Credential issuer is missing');
    }
    const issuerTrust = (0, issuerTrust_service_1.evaluateIssuerTrust)(issuer);
    if (!issuerTrust.issuerTrusted && issuerTrust.strictIssuerTrust) {
        throw new Error('Credential not issued by a trusted issuer');
    }
    if (!issuerTrust.issuerTrusted) {
        console.warn('⚠️ Credential issuer is not in trusted list, but strict mode is disabled:', {
            issuer,
            trustedIssuers: issuerTrust.trustedIssuers,
        });
    }
    if (vcPayload.exp && vcPayload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Credential has expired');
    }
    return {
        credentialId,
        credentialStatus: credentialStatus.status,
        credentialFoundInRegistry: credentialStatus.foundInRegistry,
        issuer,
        issuerTrusted: issuerTrust.issuerTrusted,
        strictIssuerTrust: issuerTrust.strictIssuerTrust,
        subjectDid: credentialSubject.id,
        employeeId: credentialSubject.employeeId,
        name: credentialSubject.name,
        role: credentialSubject.role,
        department: credentialSubject.department,
        email: credentialSubject.email,
    };
}
router.get('/trusted-issuers', (req, res) => {
    const policy = (0, issuerTrust_service_1.getIssuerTrustPolicy)();
    res.json({
        success: true,
        data: policy,
        timestamp: new Date().toISOString(),
    });
});
router.get('/credential-status/:credentialId', (req, res) => {
    const { credentialId } = req.params;
    const policy = (0, credentialStatus_service_1.getCredentialStatusPolicy)();
    const status = (0, credentialStatus_service_1.getCredentialStatus)(credentialId);
    res.json({
        success: true,
        data: {
            policy,
            status,
        },
        timestamp: new Date().toISOString(),
    });
});
router.get('/verifier-profiles', (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const profiles = (0, verifierProfiles_service_1.listVerifierProfiles)({ includeInactive });
    res.json({
        success: true,
        data: profiles,
        timestamp: new Date().toISOString(),
    });
});
router.get('/verifier-profiles/:verifierId', (req, res) => {
    const { verifierId } = req.params;
    const profile = (0, verifierProfiles_service_1.getVerifierProfile)(verifierId);
    if (!profile) {
        res.status(404).json({
            success: false,
            error: 'Verifier profile not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    res.json({
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
    });
});
router.get('/timeline', (req, res) => {
    const did = normalizeOptionalString(req.query.did);
    const userAddress = normalizeOptionalString(req.query.userAddress);
    const employeeId = normalizeOptionalString(req.query.employeeId);
    const companyId = normalizeOptionalString(req.query.companyId);
    const verifierId = normalizeOptionalString(req.query.verifierId);
    const eventTypeValue = normalizeOptionalString(req.query.eventType);
    const statusValue = normalizeOptionalString(req.query.status);
    const from = normalizeOptionalString(req.query.from);
    const to = normalizeOptionalString(req.query.to);
    const limit = parsePositiveInteger(req.query.limit, 50);
    const cursor = parsePositiveInteger(req.query.cursor, 0);
    if (!did && !userAddress && !employeeId && !companyId && !verifierId) {
        res.status(400).json({
            success: false,
            error: 'At least one scope filter is required: did, userAddress, employeeId, companyId, or verifierId',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    if (eventTypeValue && !isAuthTimelineEventType(eventTypeValue)) {
        res.status(400).json({
            success: false,
            error: `Invalid eventType. Allowed values: ${AUTH_TIMELINE_EVENT_TYPES.join(', ')}`,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    if (statusValue && !isAuthTimelineEventStatus(statusValue)) {
        res.status(400).json({
            success: false,
            error: `Invalid status. Allowed values: ${AUTH_TIMELINE_EVENT_STATUS.join(', ')}`,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    const filters = {
        did,
        userAddress,
        employeeId,
        companyId,
        verifierId,
        eventType: eventTypeValue,
        status: statusValue,
        from,
        to,
    };
    const listing = (0, authTimeline_service_1.listAuthTimelineEvents)({
        filters,
        limit,
        cursor,
    });
    const summary = (0, authTimeline_service_1.summarizeAuthTimeline)({ filters });
    res.json({
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
        },
        timestamp: new Date().toISOString(),
    });
});
router.get('/timeline/me', auth_middleware_1.verifyAuthToken, (req, res) => {
    const eventTypeValue = normalizeOptionalString(req.query.eventType);
    const statusValue = normalizeOptionalString(req.query.status);
    const from = normalizeOptionalString(req.query.from);
    const to = normalizeOptionalString(req.query.to);
    const limit = parsePositiveInteger(req.query.limit, 50);
    const cursor = parsePositiveInteger(req.query.cursor, 0);
    if (!req.user?.address && !req.user?.did) {
        res.status(401).json({
            success: false,
            error: 'Authenticated identity is missing in token',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    if (eventTypeValue && !isAuthTimelineEventType(eventTypeValue)) {
        res.status(400).json({
            success: false,
            error: `Invalid eventType. Allowed values: ${AUTH_TIMELINE_EVENT_TYPES.join(', ')}`,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    if (statusValue && !isAuthTimelineEventStatus(statusValue)) {
        res.status(400).json({
            success: false,
            error: `Invalid status. Allowed values: ${AUTH_TIMELINE_EVENT_STATUS.join(', ')}`,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    const filters = {
        did: req.user.did,
        userAddress: req.user.address,
        eventType: eventTypeValue,
        status: statusValue,
        from,
        to,
    };
    const listing = (0, authTimeline_service_1.listAuthTimelineEvents)({
        filters,
        limit,
        cursor,
    });
    const summary = (0, authTimeline_service_1.summarizeAuthTimeline)({ filters });
    res.json({
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
        },
        timestamp: new Date().toISOString(),
    });
});
router.get('/challenge', rateLimiter_middleware_1.challengeRateLimiter, async (req, res) => {
    try {
        const challenge = await generateChallenge({
            apiBaseUrl: resolveApiBaseUrl(req),
        });
        res.json({
            success: true,
            data: challenge,
            message: 'Authentication challenge generated successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error generating challenge:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate authentication challenge',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/challenge', rateLimiter_middleware_1.challengeRateLimiter, (0, validation_middleware_1.validateBody)(validation_middleware_1.authSchemas.challenge), async (req, res) => {
    try {
        const { employeeId, companyId, requestType, verifierId } = req.body;
        if (employeeId) {
            const employee = (0, employeeDirectory_1.getEmployeeById)(employeeId.toUpperCase());
            if (!employee) {
                res.status(404).json({
                    success: false,
                    error: 'Employee not found',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            if (!employee.active) {
                res.status(403).json({
                    success: false,
                    error: 'Employee account is inactive',
                    timestamp: new Date().toISOString()
                });
                return;
            }
        }
        let verifierProfile;
        try {
            verifierProfile = (0, verifierProfiles_service_1.resolveVerifierProfile)({
                verifierId,
                organizationId: companyId,
            });
        }
        catch (profileError) {
            res.status(400).json({
                success: false,
                error: 'Invalid verifier profile input',
                details: profileError?.message || 'Unable to resolve verifier profile',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        if (companyId && verifierProfile.organizationId !== companyId) {
            res.status(400).json({
                success: false,
                error: 'companyId does not match verifier profile organization',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const challenge = await generateChallenge({
            employeeId: employeeId?.toUpperCase(),
            companyId: verifierProfile.organizationId,
            requestType: requestType || 'portal_access',
            verifierProfile,
            apiBaseUrl: resolveApiBaseUrl(req),
        });
        res.json({
            success: true,
            data: challenge,
            message: 'Employee authentication challenge generated successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error generating employee challenge:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate employee authentication challenge',
            timestamp: new Date().toISOString()
        });
    }
});
async function generateChallenge(context) {
    const selectedEmployee = context?.employeeId ? (0, employeeDirectory_1.getEmployeeById)(context.employeeId) : undefined;
    const employee = selectedEmployee
        ? await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(selectedEmployee)
        : undefined;
    if (employee) {
        await (0, employeeOnChainRegistry_1.ensureEmployeeRegisteredOnChain)(employee);
    }
    const badge = (employee?.badge || 'employee');
    const badgeDefinition = (0, employeeDirectory_1.getBadgeDefinition)(badge);
    const timestamp = Date.now();
    const apiBaseUrl = context?.apiBaseUrl || resolveApiBaseUrl();
    const requestType = (context?.requestType || 'portal_access');
    const verifierProfile = context?.verifierProfile
        || (0, verifierProfiles_service_1.resolveVerifierProfile)({ organizationId: context?.companyId });
    if (!verifierProfile.allowedRequestTypes.includes(requestType)) {
        throw new Error(`Verifier ${verifierProfile.verifierId} does not allow request type ${requestType}`);
    }
    if (!verifierProfile.allowedBadges.includes(badge)) {
        throw new Error(`Badge ${badge} is not allowed for verifier ${verifierProfile.verifierId}`);
    }
    const requestedClaims = {
        requestType,
        requiredClaims: (0, verifierProfiles_service_1.resolveRequestedClaims)(verifierProfile, requestType),
        policyVersion: verifierProfile.policyVersion,
        proofRequired: true,
        bindingVersion: DISCLOSURE_BINDING_VERSION,
    };
    const randomPart = crypto_1.default.randomBytes(32).toString('hex');
    const challengeId = crypto_1.default.randomUUID();
    const challenge = [
        `challenge:${randomPart}`,
        `scope:${badgeDefinition.challengeScope}`,
        `badge:${badge}`,
        `employee:${employee?.id || 'unknown'}`,
        `issued:${new Date(timestamp).toISOString()}`,
    ].join('|');
    await (0, challengeStorage_service_1.setChallenge)(challengeId, {
        challenge,
        timestamp,
        used: false,
        employeeId: context?.employeeId,
        employeeName: employee?.name,
        badge,
        permissions: employee?.permissions || [...badgeDefinition.permissions],
        hashId: employee?.hashId,
        didRegistrationTxHash: employee?.didRegistrationTxHash,
        adminGasPayerAddress: SepoliaService_1.sepoliaService.getGasPayerAddress(),
        adminGasPayerEtherscanUrl: SepoliaService_1.sepoliaService.getGasPayerEtherscanUrl(),
        companyId: verifierProfile.organizationId,
        verifierId: verifierProfile.verifierId,
        verifierOrganizationId: verifierProfile.organizationId,
        verifierOrganizationName: verifierProfile.organizationName,
        verifierPolicyVersion: verifierProfile.policyVersion,
        verifierCredentialRequired: verifierProfile.requireCredential,
        requestType,
        requestedClaims,
    }, CHALLENGE_EXPIRY_SECONDS);
    (0, authTimeline_service_1.addAuthTimelineEvent)({
        eventType: 'challenge_created',
        status: 'info',
        reason: 'challenge_issued',
        challengeId,
        did: employee?.did,
        userAddress: employee?.address,
        employeeId: employee?.id,
        companyId: verifierProfile.organizationId,
        verifierId: verifierProfile.verifierId,
        verifierOrganizationId: verifierProfile.organizationId,
        verifierOrganizationName: verifierProfile.organizationName,
        requestType,
        metadata: {
            requiredClaims: requestedClaims.requiredClaims,
            proofRequired: requestedClaims.proofRequired,
            expiresAt: new Date(timestamp + CHALLENGE_EXPIRY_TIME).toISOString(),
        },
    });
    await cleanupExpiredChallenges();
    const qrCodeData = JSON.stringify({
        type: "did-auth-request",
        version: "1.0",
        challengeId,
        challenge,
        domain: 'decentralized-trust.platform',
        companyId: verifierProfile.organizationId,
        verifierId: verifierProfile.verifierId,
        verifier: {
            verifierId: verifierProfile.verifierId,
            organizationId: verifierProfile.organizationId,
            organizationName: verifierProfile.organizationName,
            policyVersion: verifierProfile.policyVersion,
            requireCredential: verifierProfile.requireCredential,
            allowedBadges: verifierProfile.allowedBadges,
            requiredClaimsByRequestType: verifierProfile.requiredClaimsByRequestType,
        },
        requestedClaims,
        timestamp,
        expiresAt: timestamp + CHALLENGE_EXPIRY_TIME,
        apiEndpoint: `${apiBaseUrl}/api/auth/verify`,
        instruction: 'Authenticate with your DID wallet to access Enterprise Portal',
        badge: {
            type: badge,
            label: badgeDefinition.label,
            permissions: employee?.permissions || badgeDefinition.permissions,
        },
        ...(context?.employeeId && {
            employee,
            expectedDID: employee?.did,
            employeeHashId: employee?.hashId,
            didRegistrationTxHash: employee?.didRegistrationTxHash,
            adminGasPayerAddress: SepoliaService_1.sepoliaService.getGasPayerAddress(),
            adminGasPayerEtherscanUrl: SepoliaService_1.sepoliaService.getGasPayerEtherscanUrl(),
        }),
        ...(context?.requestType && { requestType: context.requestType })
    });
    return {
        challengeId,
        challenge,
        expiresIn: Math.floor(CHALLENGE_EXPIRY_TIME / 1000),
        qrCodeData,
        verifier: {
            verifierId: verifierProfile.verifierId,
            organizationId: verifierProfile.organizationId,
            organizationName: verifierProfile.organizationName,
            policyVersion: verifierProfile.policyVersion,
            requireCredential: verifierProfile.requireCredential,
            allowedBadges: verifierProfile.allowedBadges,
            requiredClaimsByRequestType: verifierProfile.requiredClaimsByRequestType,
        },
        requestedClaims,
        ...(context?.employeeId && {
            employee,
        })
    };
}
router.get('/status/:challengeId', async (req, res) => {
    try {
        const { challengeId } = req.params;
        const challengeData = await (0, challengeStorage_service_1.getChallenge)(challengeId);
        if (!challengeData) {
            res.status(404).json({
                success: false,
                error: 'Challenge not found or expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (isChallengeExpired(challengeData)) {
            await (0, challengeStorage_service_1.deleteChallenge)(challengeId);
            (0, authTimeline_service_1.addAuthTimelineEvent)({
                eventType: 'challenge_expired',
                status: 'info',
                reason: 'expired_on_status_check',
                challengeId,
                did: challengeData.did,
                userAddress: challengeData.userAddress,
                employeeId: challengeData.employeeId,
                companyId: challengeData.companyId,
                verifierId: challengeData.verifierId,
                verifierOrganizationId: challengeData.verifierOrganizationId,
                verifierOrganizationName: challengeData.verifierOrganizationName,
                requestType: challengeData.requestType,
            });
            res.status(400).json({
                success: false,
                error: 'Challenge has expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        res.json({
            success: true,
            data: {
                challengeId,
                status: challengeData.used ? 'completed' : 'pending',
                expiresAt: challengeData.timestamp + CHALLENGE_EXPIRY_TIME,
                verifierId: challengeData.verifierId,
                verifierOrganizationId: challengeData.verifierOrganizationId,
                verifierOrganizationName: challengeData.verifierOrganizationName,
                verifierPolicyVersion: challengeData.verifierPolicyVersion,
                verifierCredentialRequired: challengeData.verifierCredentialRequired,
                requestedClaims: challengeData.requestedClaims,
                ...(challengeData.used && challengeData.token && {
                    token: challengeData.token,
                    refreshToken: challengeData.refreshToken,
                    did: challengeData.did,
                    userAddress: challengeData.userAddress,
                    employeeId: challengeData.employeeId,
                    employeeName: challengeData.employeeName,
                    badge: challengeData.badge,
                    permissions: challengeData.permissions,
                    hashId: challengeData.hashId,
                    didRegistrationTxHash: challengeData.didRegistrationTxHash,
                    authRecordTxHash: challengeData.authRecordTxHash,
                    authVerifyTxHash: challengeData.authVerifyTxHash,
                    adminGasPayerAddress: challengeData.adminGasPayerAddress,
                    adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
                    disclosedClaims: challengeData.disclosedClaims,
                    disclosedClaimsVerified: challengeData.disclosedClaimsVerified,
                    disclosedClaimsProofVerified: challengeData.disclosedClaimsProofVerified,
                    disclosedClaimsBindingDigest: challengeData.disclosedClaimsBindingDigest,
                })
            },
            timestamp: new Date().toISOString()
        });
        if (challengeData.used && challengeData.token) {
            setTimeout(() => {
                void (0, challengeStorage_service_1.deleteChallenge)(challengeId).catch((deleteError) => {
                    console.warn('⚠️ Failed to delete completed challenge:', deleteError);
                });
            }, 30000);
        }
    }
    catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check challenge status',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/status/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const challengeEntry = await getChallengeEntryBySessionId(sessionId);
        const matchingChallenge = challengeEntry?.challengeData || null;
        const challengeId = challengeEntry?.challengeId || null;
        if (!matchingChallenge) {
            res.status(404).json({
                success: false,
                error: 'Session not found or expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (isChallengeExpired(matchingChallenge)) {
            await (0, challengeStorage_service_1.deleteChallenge)(challengeId);
            (0, authTimeline_service_1.addAuthTimelineEvent)({
                eventType: 'challenge_expired',
                status: 'info',
                reason: 'expired_on_session_status_check',
                challengeId: challengeId || undefined,
                did: matchingChallenge.did,
                userAddress: matchingChallenge.userAddress,
                employeeId: matchingChallenge.employeeId,
                companyId: matchingChallenge.companyId,
                verifierId: matchingChallenge.verifierId,
                verifierOrganizationId: matchingChallenge.verifierOrganizationId,
                verifierOrganizationName: matchingChallenge.verifierOrganizationName,
                requestType: matchingChallenge.requestType,
            });
            res.status(400).json({
                success: false,
                error: 'Session has expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (matchingChallenge.used && matchingChallenge.token) {
            res.json({
                success: true,
                data: {
                    authenticated: true,
                    sessionId,
                    user: {
                        did: matchingChallenge.did,
                        address: matchingChallenge.userAddress,
                        employeeId: matchingChallenge.employeeId,
                        name: matchingChallenge.employeeName || 'Unknown User',
                        badge: matchingChallenge.badge,
                        permissions: matchingChallenge.permissions,
                        hashId: matchingChallenge.hashId,
                        didRegistrationTxHash: matchingChallenge.didRegistrationTxHash,
                        authRecordTxHash: matchingChallenge.authRecordTxHash,
                        authVerifyTxHash: matchingChallenge.authVerifyTxHash,
                        adminGasPayerAddress: matchingChallenge.adminGasPayerAddress,
                        adminGasPayerEtherscanUrl: matchingChallenge.adminGasPayerEtherscanUrl,
                    },
                    token: matchingChallenge.token,
                    authenticatedAt: new Date(matchingChallenge.timestamp).toISOString()
                },
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.json({
                success: true,
                data: {
                    authenticated: false,
                    pending: true,
                    sessionId,
                    expiresAt: matchingChallenge.timestamp + CHALLENGE_EXPIRY_TIME
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Session status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check session status',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/verify-token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({
                success: false,
                error: 'Token is required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            (0, authTimeline_service_1.addAuthTimelineEvent)({
                eventType: 'token_verified',
                status: 'success',
                reason: 'token_valid',
                challengeId: typeof decoded.challengeId === 'string' ? decoded.challengeId : undefined,
                did: typeof decoded.did === 'string' ? decoded.did : undefined,
                userAddress: typeof decoded.address === 'string' ? decoded.address : undefined,
                employeeId: typeof decoded.employeeId === 'string' ? decoded.employeeId : undefined,
                verifierId: typeof decoded.verifierId === 'string' ? decoded.verifierId : undefined,
                verifierOrganizationId: typeof decoded.verifierOrganizationId === 'string' ? decoded.verifierOrganizationId : undefined,
                verifierOrganizationName: typeof decoded.verifierOrganizationName === 'string' ? decoded.verifierOrganizationName : undefined,
            });
            res.json({
                success: true,
                data: {
                    did: decoded.did,
                    userAddress: decoded.userAddress || decoded.address,
                    challengeId: decoded.challengeId,
                    verifierId: decoded.verifierId,
                    verifierOrganizationId: decoded.verifierOrganizationId,
                    verifierPolicyVersion: decoded.verifierPolicyVersion,
                    requestedClaims: decoded.requestedClaims,
                    disclosedClaims: decoded.disclosedClaims,
                    disclosedClaimsVerified: decoded.disclosedClaimsVerified,
                    disclosedClaimsProofVerified: decoded.disclosedClaimsProofVerified,
                    disclosedClaimsBindingDigest: decoded.disclosedClaimsBindingDigest,
                    issuedAt: decoded.iat,
                    expiresAt: decoded.exp
                },
                message: 'Token is valid',
                timestamp: new Date().toISOString()
            });
        }
        catch (jwtError) {
            (0, authTimeline_service_1.addAuthTimelineEvent)({
                eventType: 'token_verification_failed',
                status: 'failure',
                reason: 'token_invalid_or_expired',
                metadata: {
                    error: jwtError?.message,
                },
            });
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                details: jwtError.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Token verification failed',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/verify', rateLimiter_middleware_1.authRateLimiter, (0, validation_middleware_1.validateBody)(validation_middleware_1.authSchemas.verify), async (req, res) => {
    const requestedChallengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : undefined;
    const requestedVerifierId = typeof req.body?.verifierId === 'string' ? req.body.verifierId : undefined;
    const requestedAddress = typeof req.body?.address === 'string' ? req.body.address : undefined;
    const requestedEmployeeId = typeof req.body?.employeeId === 'string' ? req.body.employeeId : undefined;
    const requestedDid = typeof req.body?.did === 'string' ? req.body.did : undefined;
    let auditStatus = 'failure';
    let auditReason = 'verification_failed';
    let auditHttpStatus = 500;
    let auditChallengeData;
    let auditVerifierProfile;
    let auditResolvedDid;
    let auditResolvedAddress;
    let auditResolvedEmployeeId;
    try {
        const { challengeId, signature, address, message, employeeId, did, credential, verifierId, disclosedClaims, disclosedClaimsProof, } = req.body;
        if (!challengeId || !signature || !address || !message) {
            auditReason = 'missing_required_fields';
            auditHttpStatus = 400;
            res.status(400).json({
                success: false,
                error: 'Missing required fields: challengeId, signature, address, message',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const challengeData = await (0, challengeStorage_service_1.getChallenge)(challengeId);
        auditChallengeData = challengeData || undefined;
        if (!challengeData) {
            auditReason = 'invalid_or_expired_challenge';
            auditHttpStatus = 400;
            res.status(400).json({
                success: false,
                error: 'Invalid or expired challenge',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (challengeData.used) {
            auditReason = 'challenge_already_used';
            auditHttpStatus = 400;
            res.status(400).json({
                success: false,
                error: 'Challenge has already been used',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const now = Date.now();
        if (isChallengeExpired(challengeData, now)) {
            await (0, challengeStorage_service_1.deleteChallenge)(challengeId);
            auditReason = 'challenge_expired';
            auditHttpStatus = 400;
            (0, authTimeline_service_1.addAuthTimelineEvent)({
                eventType: 'challenge_expired',
                status: 'info',
                reason: 'expired_during_verification',
                challengeId,
                did: challengeData.did,
                userAddress: challengeData.userAddress,
                employeeId: challengeData.employeeId,
                companyId: challengeData.companyId,
                verifierId: challengeData.verifierId,
                verifierOrganizationId: challengeData.verifierOrganizationId,
                verifierOrganizationName: challengeData.verifierOrganizationName,
                requestType: challengeData.requestType,
            });
            res.status(400).json({
                success: false,
                error: 'Challenge has expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (verifierId && challengeData.verifierId && verifierId !== challengeData.verifierId) {
            auditReason = 'verifier_mismatch';
            auditHttpStatus = 401;
            res.status(401).json({
                success: false,
                error: 'Verifier mismatch for authentication challenge',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        let verifierProfile;
        try {
            verifierProfile = (0, verifierProfiles_service_1.resolveVerifierProfile)({
                verifierId: challengeData.verifierId || verifierId,
                organizationId: challengeData.companyId,
            });
            auditVerifierProfile = verifierProfile;
        }
        catch (profileError) {
            auditReason = 'verifier_policy_resolution_failed';
            auditHttpStatus = 403;
            res.status(403).json({
                success: false,
                error: 'Verifier policy resolution failed',
                details: profileError?.message || 'Unable to resolve verifier profile',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        try {
            console.log('🔐 Verifying Ethereum signature');
            let signatureValid = false;
            let recoveredAddress = '';
            try {
                recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
                signatureValid = recoveredAddress.toLowerCase() === address.toLowerCase();
                console.log('🔐 Signature verification result:', {
                    signatureValid,
                    expectedAddress: address,
                    recoveredAddress
                });
            }
            catch (error) {
                console.error('Signature verification failed:', error);
                signatureValid = false;
            }
            if (!signatureValid || recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                auditReason = 'signature_verification_failed';
                auditHttpStatus = 401;
                res.status(401).json({
                    success: false,
                    error: 'Signature verification failed - address mismatch',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            if (!message.includes(challengeData.challenge)) {
                auditReason = 'challenge_message_mismatch';
                auditHttpStatus = 401;
                res.status(401).json({
                    success: false,
                    error: 'Invalid challenge in signed message',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            console.log('✅ Signature verification successful for address:', address);
            const challengeEmployee = challengeData.employeeId ? (0, employeeDirectory_1.getEmployeeById)(challengeData.employeeId) : undefined;
            const resolvedEmployee = employeeId ? (0, employeeDirectory_1.getEmployeeById)(employeeId) : challengeEmployee;
            const resolvedAddress = address;
            const resolvedDid = resolvedEmployee?.did || `did:ethr:${resolvedAddress}`;
            auditResolvedAddress = resolvedAddress;
            auditResolvedDid = resolvedDid;
            auditResolvedEmployeeId = resolvedEmployee?.id || challengeData.employeeId;
            (0, authTimeline_service_1.addAuthTimelineEvent)({
                eventType: 'verification_attempted',
                status: 'info',
                reason: 'verification_attempt_started',
                challengeId,
                did: resolvedDid,
                userAddress: resolvedAddress,
                employeeId: auditResolvedEmployeeId,
                companyId: challengeData.companyId,
                verifierId: verifierProfile.verifierId,
                verifierOrganizationId: verifierProfile.organizationId,
                verifierOrganizationName: verifierProfile.organizationName,
                requestType: challengeData.requestType,
            });
            if (did && did !== resolvedDid) {
                auditReason = 'did_mismatch';
                auditHttpStatus = 401;
                res.status(401).json({
                    success: false,
                    error: 'Provided DID does not match authenticated identity',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            let credentialVerified = false;
            let credentialIssuer = null;
            let credentialIssuerTrusted = null;
            let credentialId = null;
            let credentialStatus = null;
            let credentialFoundInRegistry = null;
            let credentialClaims = {};
            if (credential) {
                try {
                    const verifiedCredential = await verifyCredentialAgainstDid(credential, resolvedDid);
                    credentialVerified = true;
                    credentialIssuer = verifiedCredential.issuer;
                    credentialIssuerTrusted = verifiedCredential.issuerTrusted;
                    credentialId = verifiedCredential.credentialId;
                    credentialStatus = verifiedCredential.credentialStatus;
                    credentialFoundInRegistry = verifiedCredential.credentialFoundInRegistry;
                    credentialClaims = {
                        subjectDid: verifiedCredential.subjectDid,
                        employeeId: verifiedCredential.employeeId,
                        name: verifiedCredential.name,
                        role: verifiedCredential.role,
                        department: verifiedCredential.department,
                        email: verifiedCredential.email,
                    };
                    console.log('✅ Optional credential verification successful for DID:', resolvedDid);
                }
                catch (credentialError) {
                    console.error('❌ Optional credential verification failed:', credentialError.message);
                    auditReason = 'credential_verification_failed';
                    auditHttpStatus = 401;
                    res.status(401).json({
                        success: false,
                        error: 'Credential verification failed',
                        details: credentialError.message,
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
            }
            let parsedDisclosedClaims;
            try {
                parsedDisclosedClaims = parseDisclosedClaims(disclosedClaims);
            }
            catch (claimsParseError) {
                auditReason = 'invalid_disclosed_claims_payload';
                auditHttpStatus = 400;
                res.status(400).json({
                    success: false,
                    error: 'Invalid disclosedClaims payload',
                    details: claimsParseError?.message || 'Unable to parse disclosedClaims',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const requiredClaims = challengeData.requestedClaims?.requiredClaims
                || (0, verifierProfiles_service_1.resolveRequestedClaims)(verifierProfile, challengeData.requestType);
            let parsedDisclosedClaimsProof;
            try {
                parsedDisclosedClaimsProof = parseDisclosedClaimsProof(disclosedClaimsProof);
            }
            catch (proofParseError) {
                auditReason = 'invalid_disclosed_claims_proof_payload';
                auditHttpStatus = 400;
                res.status(400).json({
                    success: false,
                    error: 'Invalid disclosedClaimsProof payload',
                    details: proofParseError?.message || 'Unable to parse disclosedClaimsProof',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const expectedClaims = buildExpectedClaimValues({
                resolvedDid,
                resolvedEmployee,
                credentialClaims,
            });
            const disclosedClaimsEvaluation = verifyDisclosedClaims({
                requiredClaims,
                disclosedClaims: parsedDisclosedClaims,
                expectedClaims,
            });
            if (!disclosedClaimsEvaluation.verified) {
                auditReason = 'selective_disclosure_verification_failed';
                auditHttpStatus = 403;
                res.status(403).json({
                    success: false,
                    error: 'Selective disclosure verification failed',
                    details: {
                        missingClaims: disclosedClaimsEvaluation.missingClaims,
                        mismatchedClaims: disclosedClaimsEvaluation.mismatchedClaims,
                        requiredClaims,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            let disclosedClaimsProofVerified = false;
            let disclosedClaimsBindingDigest = null;
            if (requiredClaims.length > 0) {
                if (!parsedDisclosedClaimsProof) {
                    auditReason = 'selective_disclosure_proof_required';
                    auditHttpStatus = 403;
                    res.status(403).json({
                        success: false,
                        error: 'Selective disclosure proof is required',
                        details: {
                            requiredClaims,
                            bindingVersion: DISCLOSURE_BINDING_VERSION,
                        },
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
                const proofEvaluation = verifyDisclosedClaimsProof({
                    challengeId,
                    challengeText: challengeData.challenge,
                    disclosedClaims: parsedDisclosedClaims,
                    credential,
                    walletAddress: resolvedAddress,
                    proof: parsedDisclosedClaimsProof,
                });
                if (!proofEvaluation.verified) {
                    auditReason = 'selective_disclosure_binding_failed';
                    auditHttpStatus = 403;
                    res.status(403).json({
                        success: false,
                        error: 'Selective disclosure cryptographic binding failed',
                        details: {
                            reason: proofEvaluation.reason,
                            requiredClaims,
                            bindingVersion: DISCLOSURE_BINDING_VERSION,
                        },
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
                disclosedClaimsProofVerified = true;
                disclosedClaimsBindingDigest = proofEvaluation.bindingDigest || null;
            }
            const resolvedBadgeForPolicy = (resolvedEmployee?.badge || challengeData.badge || 'employee');
            const policyEvaluation = (0, verifierProfiles_service_1.evaluateVerifierPolicy)(verifierProfile, {
                badge: resolvedBadgeForPolicy,
                requestType: challengeData.requestType,
                credentialProvided: Boolean(credential) || requiredClaims.length > 0,
                credentialVerified: credentialVerified || disclosedClaimsEvaluation.verified,
            });
            if (!policyEvaluation.allowed) {
                auditReason = 'verifier_policy_denied';
                auditHttpStatus = 403;
                res.status(403).json({
                    success: false,
                    error: 'Verifier policy denied authentication',
                    details: policyEvaluation.reason,
                    policy: policyEvaluation.policy,
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const resolvedEmployeeWithChain = resolvedEmployee
                ? await (0, employeeOnChainRegistry_1.enrichEmployeeWithOnChainProfile)(resolvedEmployee)
                : undefined;
            const onChainAuth = resolvedEmployeeWithChain
                ? await (0, employeeOnChainRegistry_1.recordEmployeeAuthenticationOnChain)(resolvedEmployeeWithChain, challengeId, message, signature, { skipOnChainVerification: SHOULD_SKIP_ONCHAIN_VERIFY })
                : undefined;
            challengeData.used = true;
            challengeData.userAddress = resolvedAddress;
            challengeData.did = resolvedDid;
            challengeData.employeeId = resolvedEmployeeWithChain?.id || challengeData.employeeId;
            challengeData.employeeName = resolvedEmployeeWithChain?.name || challengeData.employeeName;
            challengeData.badge = (resolvedEmployeeWithChain?.badge || challengeData.badge || 'employee');
            challengeData.permissions = resolvedEmployeeWithChain?.permissions || challengeData.permissions || [];
            challengeData.hashId = onChainAuth?.profile.hashId || resolvedEmployeeWithChain?.hashId || challengeData.hashId;
            challengeData.didRegistrationTxHash = onChainAuth?.profile.didRegistrationTxHash || resolvedEmployeeWithChain?.didRegistrationTxHash || challengeData.didRegistrationTxHash;
            challengeData.authRecordTxHash = onChainAuth?.authRecordTxHash;
            challengeData.authVerifyTxHash = onChainAuth?.authVerifyTxHash;
            challengeData.adminGasPayerAddress = SepoliaService_1.sepoliaService.getGasPayerAddress();
            challengeData.adminGasPayerEtherscanUrl = SepoliaService_1.sepoliaService.getGasPayerEtherscanUrl();
            challengeData.verifierId = verifierProfile.verifierId;
            challengeData.verifierOrganizationId = verifierProfile.organizationId;
            challengeData.verifierOrganizationName = verifierProfile.organizationName;
            challengeData.verifierPolicyVersion = verifierProfile.policyVersion;
            challengeData.verifierCredentialRequired = verifierProfile.requireCredential;
            challengeData.disclosedClaims = parsedDisclosedClaims;
            challengeData.disclosedClaimsVerified = disclosedClaimsEvaluation.verified;
            challengeData.disclosedClaimsProofVerified = disclosedClaimsProofVerified;
            challengeData.disclosedClaimsBindingDigest = disclosedClaimsBindingDigest || undefined;
            const tokenPayload = {
                address: resolvedAddress,
                did: resolvedDid,
                employeeId: challengeData.employeeId,
                employeeName: challengeData.employeeName,
                badge: challengeData.badge,
                permissions: challengeData.permissions,
                hashId: challengeData.hashId,
                didRegistrationTxHash: challengeData.didRegistrationTxHash,
                authRecordTxHash: challengeData.authRecordTxHash,
                authVerifyTxHash: challengeData.authVerifyTxHash,
                adminGasPayerAddress: challengeData.adminGasPayerAddress,
                adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
                challengeId: challengeId,
                authenticated: true,
                credentialProvided: Boolean(credential),
                credentialVerified,
                credentialIssuer,
                credentialIssuerTrusted,
                credentialId,
                credentialStatus,
                credentialFoundInRegistry,
                verifierId: verifierProfile.verifierId,
                verifierOrganizationId: verifierProfile.organizationId,
                verifierOrganizationName: verifierProfile.organizationName,
                verifierPolicyVersion: verifierProfile.policyVersion,
                verifierCredentialRequired: verifierProfile.requireCredential,
                requestedClaims: challengeData.requestedClaims,
                disclosedClaims: parsedDisclosedClaims,
                disclosedClaimsVerified: disclosedClaimsEvaluation.verified,
                disclosedClaimsProofVerified,
                disclosedClaimsBindingDigest,
                verifierPolicySatisfied: true,
                timestamp: new Date().toISOString()
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, {
                expiresIn: '24h',
                issuer: 'decentralized-trust-platform'
            });
            const refreshToken = (0, refreshToken_service_1.generateRefreshToken)();
            (0, refreshToken_service_1.storeRefreshToken)(refreshToken, resolvedAddress, resolvedDid, 7);
            challengeData.token = token;
            challengeData.refreshToken = refreshToken;
            await persistChallengeState(challengeId, challengeData);
            await cleanupExpiredChallenges();
            auditStatus = 'success';
            auditReason = 'verification_succeeded';
            auditHttpStatus = 200;
            auditResolvedAddress = resolvedAddress;
            auditResolvedDid = resolvedDid;
            auditResolvedEmployeeId = challengeData.employeeId;
            res.status(200).json({
                success: true,
                data: {
                    token: token,
                    refreshToken: refreshToken,
                    address: resolvedAddress,
                    did: resolvedDid,
                    employee: resolvedEmployeeWithChain || null,
                    badge: challengeData.badge,
                    permissions: challengeData.permissions,
                    hashId: challengeData.hashId,
                    didRegistrationTxHash: challengeData.didRegistrationTxHash,
                    authRecordTxHash: challengeData.authRecordTxHash,
                    authVerifyTxHash: challengeData.authVerifyTxHash,
                    adminGasPayerAddress: challengeData.adminGasPayerAddress,
                    adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
                    credentialProvided: Boolean(credential),
                    credentialVerified,
                    credentialIssuer,
                    credentialIssuerTrusted,
                    credentialId,
                    credentialStatus,
                    credentialFoundInRegistry,
                    verifierId: verifierProfile.verifierId,
                    verifierOrganizationId: verifierProfile.organizationId,
                    verifierOrganizationName: verifierProfile.organizationName,
                    verifierPolicyVersion: verifierProfile.policyVersion,
                    verifierCredentialRequired: verifierProfile.requireCredential,
                    requestedClaims: challengeData.requestedClaims,
                    disclosedClaims: parsedDisclosedClaims,
                    disclosedClaimsVerified: disclosedClaimsEvaluation.verified,
                    disclosedClaimsProofVerified,
                    disclosedClaimsBindingDigest,
                    verifierPolicySatisfied: true,
                    challengeId: challengeId,
                    expiresIn: '24h'
                },
                message: 'Authentication successful',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Signature verification error:', error);
            auditReason = 'verification_runtime_exception';
            auditHttpStatus = 401;
            res.status(401).json({
                success: false,
                error: 'Signature verification failed',
                timestamp: new Date().toISOString()
            });
            return;
        }
    }
    catch (error) {
        console.error('Verify endpoint error:', error);
        auditReason = 'verify_endpoint_exception';
        auditHttpStatus = 500;
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
    finally {
        try {
            (0, authTimeline_service_1.addAuthTimelineEvent)({
                eventType: auditStatus === 'success' ? 'verification_succeeded' : 'verification_failed',
                status: auditStatus,
                reason: auditReason,
                challengeId: requestedChallengeId,
                did: auditResolvedDid || requestedDid,
                userAddress: auditResolvedAddress || requestedAddress,
                employeeId: auditResolvedEmployeeId || auditChallengeData?.employeeId || requestedEmployeeId,
                companyId: auditChallengeData?.companyId,
                verifierId: auditVerifierProfile?.verifierId || auditChallengeData?.verifierId || requestedVerifierId,
                verifierOrganizationId: auditVerifierProfile?.organizationId || auditChallengeData?.verifierOrganizationId,
                verifierOrganizationName: auditVerifierProfile?.organizationName || auditChallengeData?.verifierOrganizationName,
                requestType: auditChallengeData?.requestType,
                metadata: {
                    httpStatus: auditHttpStatus,
                    credentialProvided: Boolean(req.body?.credential),
                    disclosedClaimsProvided: Boolean(req.body?.disclosedClaims),
                },
            });
        }
        catch (auditError) {
            console.warn('⚠️ Failed to record auth timeline event:', auditError);
        }
    }
});
router.post('/login', async (req, res) => {
    try {
        const { did, signature, credential, challengeId, message } = req.body;
        if (!did || !signature || !credential || !challengeId || !message) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: did, signature, credential, challengeId, message',
                timestamp: new Date().toISOString()
            });
            return;
        }
        console.log('🔐 Starting credential-aware authentication for DID:', did);
        const challengeData = await (0, challengeStorage_service_1.getChallenge)(challengeId);
        if (!challengeData) {
            res.status(400).json({
                success: false,
                error: 'Invalid or expired challenge',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (challengeData.used) {
            res.status(400).json({
                success: false,
                error: 'Challenge has already been used',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const now = Date.now();
        if (isChallengeExpired(challengeData, now)) {
            await (0, challengeStorage_service_1.deleteChallenge)(challengeId);
            res.status(400).json({
                success: false,
                error: 'Challenge has expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const addressMatch = did.match(/did:ethr:0x([a-fA-F0-9]{40})/);
        if (!addressMatch) {
            res.status(400).json({
                success: false,
                error: 'Invalid DID format',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const userAddress = `0x${addressMatch[1]}`;
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
            res.status(401).json({
                success: false,
                error: 'Signature verification failed - address mismatch',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (!message.includes(challengeData.challenge)) {
            res.status(401).json({
                success: false,
                error: 'Invalid challenge in signed message',
                timestamp: new Date().toISOString()
            });
            return;
        }
        console.log('✅ Step 1: Signature verification successful');
        try {
            const verifiedCredential = await verifyCredentialAgainstDid(credential, did);
            console.log('✅ Step 2: Credential verification successful');
            const employeeRole = verifiedCredential.role;
            const employeeId = verifiedCredential.employeeId;
            const employeeName = verifiedCredential.name;
            const employeeDepartment = verifiedCredential.department;
            const employeeEmail = verifiedCredential.email;
            console.log('👤 Authenticated user:', {
                name: employeeName,
                role: employeeRole,
                department: employeeDepartment,
                employeeId
            });
            const enhancedTokenPayload = {
                did: did,
                address: userAddress,
                employeeId: employeeId,
                name: employeeName,
                role: employeeRole,
                department: employeeDepartment,
                email: employeeEmail,
                challengeId: challengeId,
                authenticated: true,
                credentialVerified: true,
                credentialId: verifiedCredential.credentialId,
                credentialStatus: verifiedCredential.credentialStatus,
                credentialFoundInRegistry: verifiedCredential.credentialFoundInRegistry,
                credentialIssuer: verifiedCredential.issuer,
                credentialIssuerTrusted: verifiedCredential.issuerTrusted,
                isAdmin: employeeRole === 'HR Director',
                timestamp: new Date().toISOString()
            };
            const enhancedToken = jsonwebtoken_1.default.sign(enhancedTokenPayload, JWT_SECRET, {
                expiresIn: '24h',
                issuer: 'decentralized-trust-platform'
            });
            const credentialRefreshToken = (0, refreshToken_service_1.generateRefreshToken)();
            (0, refreshToken_service_1.storeRefreshToken)(credentialRefreshToken, userAddress, did, 7);
            challengeData.used = true;
            challengeData.userAddress = userAddress;
            challengeData.did = did;
            challengeData.token = enhancedToken;
            challengeData.refreshToken = credentialRefreshToken;
            await persistChallengeState(challengeId, challengeData);
            await cleanupExpiredChallenges();
            res.status(200).json({
                success: true,
                data: {
                    token: enhancedToken,
                    refreshToken: credentialRefreshToken,
                    user: {
                        did: did,
                        address: userAddress,
                        employeeId: employeeId,
                        name: employeeName,
                        role: employeeRole,
                        department: employeeDepartment,
                        email: employeeEmail,
                        credentialId: verifiedCredential.credentialId,
                        credentialStatus: verifiedCredential.credentialStatus,
                        credentialFoundInRegistry: verifiedCredential.credentialFoundInRegistry,
                        credentialIssuer: verifiedCredential.issuer,
                        credentialIssuerTrusted: verifiedCredential.issuerTrusted,
                        isAdmin: employeeRole === 'HR Director'
                    },
                    challengeId: challengeId,
                    expiresIn: '24h'
                },
                message: 'Credential-based authentication successful',
                timestamp: new Date().toISOString()
            });
        }
        catch (credentialError) {
            console.error('❌ Credential verification failed:', credentialError.message);
            res.status(401).json({
                success: false,
                error: 'Credential verification failed',
                details: credentialError.message,
                timestamp: new Date().toISOString()
            });
            return;
        }
    }
    catch (error) {
        console.error('❌ Login endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/session-status', auth_middleware_1.verifyAuthToken, (req, res) => {
    try {
        console.log('📊 Session status check for user:', req.user?.address?.substring(0, 10) + '...');
        const sessionInfo = {
            authenticated: true,
            address: req.user?.address,
            accessLevel: req.user?.accessLevel || 'standard',
            premiumGrantedAt: req.user?.premiumGrantedAt,
            sessionActive: true,
            tokenExpiresAt: req.user?.exp ? new Date(req.user.exp * 1000).toISOString() : null,
            lastChecked: new Date().toISOString()
        };
        console.log('✅ Session status:', {
            accessLevel: sessionInfo.accessLevel,
            premiumAccess: sessionInfo.accessLevel === 'premium',
            tokenValid: true
        });
        (0, authTimeline_service_1.addAuthTimelineEvent)({
            eventType: 'session_status_checked',
            status: 'info',
            reason: 'session_status_polled',
            challengeId: req.user?.challengeId,
            did: req.user?.did,
            userAddress: req.user?.address,
            employeeId: req.user?.employeeId,
            verifierId: req.user?.verifierId,
            verifierOrganizationId: req.user?.verifierOrganizationId,
            verifierOrganizationName: req.user?.verifierOrganizationName,
            metadata: {
                accessLevel: sessionInfo.accessLevel,
            },
        });
        res.status(200).json({
            success: true,
            data: sessionInfo,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Session status check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Session check failed',
            message: 'Unable to retrieve session status',
            timestamp: new Date().toISOString()
        });
    }
});
async function cleanupExpiredChallenges() {
    const now = Date.now();
    const challengeIds = await (0, challengeStorage_service_1.getAllChallengeIds)();
    for (const challengeId of challengeIds) {
        const challengeData = await (0, challengeStorage_service_1.getChallenge)(challengeId);
        if (!challengeData) {
            continue;
        }
        if (isChallengeExpired(challengeData, now)) {
            (0, authTimeline_service_1.addAuthTimelineEvent)({
                eventType: 'challenge_expired',
                status: 'info',
                reason: 'expired_by_cleanup_job',
                challengeId,
                did: challengeData.did,
                userAddress: challengeData.userAddress,
                employeeId: challengeData.employeeId,
                companyId: challengeData.companyId,
                verifierId: challengeData.verifierId,
                verifierOrganizationId: challengeData.verifierOrganizationId,
                verifierOrganizationName: challengeData.verifierOrganizationName,
                requestType: challengeData.requestType,
            });
            await (0, challengeStorage_service_1.deleteChallenge)(challengeId);
        }
    }
}
setInterval(() => {
    void cleanupExpiredChallenges().catch((error) => {
        console.warn('⚠️ Challenge cleanup job failed:', error);
    });
}, 10 * 60 * 1000);
router.post('/sepolia-verify', rateLimiter_middleware_1.authRateLimiter, (0, validation_middleware_1.validateBody)(validation_middleware_1.authSchemas.sepoliaVerify), async (req, res) => {
    try {
        const { challengeId, signature, address, message, storeOnChain = true } = req.body;
        console.log('🔗 Starting Sepolia blockchain authentication:', {
            challengeId,
            address,
            storeOnChain,
            serviceConfigured: SepoliaService_1.sepoliaService.isConfigured(),
            serviceReady: SepoliaService_1.sepoliaService.isReady()
        });
        if (!challengeId || !signature || !address || !message) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: challengeId, signature, address, message',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            res.status(400).json({
                success: false,
                error: 'Invalid Ethereum address format',
                timestamp: new Date().toISOString()
            });
            return;
        }
        console.log('🔍 Sepolia-verify: Looking for challengeId:', challengeId);
        const availableChallengeIds = await listChallengeIds();
        console.log('📋 Sepolia-verify: Available challenges:', availableChallengeIds);
        const challengeData = await (0, challengeStorage_service_1.getChallenge)(challengeId);
        if (!challengeData) {
            console.log('❌ Sepolia-verify: Challenge not found in memory');
            res.status(400).json({
                success: false,
                error: 'Invalid or expired challenge',
                details: `Challenge ${challengeId} not found. Available: ${availableChallengeIds.join(', ')}`,
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (challengeData.used) {
            res.status(400).json({
                success: false,
                error: 'Challenge has already been used',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const now = Date.now();
        if (isChallengeExpired(challengeData, now)) {
            await (0, challengeStorage_service_1.deleteChallenge)(challengeId);
            res.status(400).json({
                success: false,
                error: 'Challenge has expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        let isSignatureValid = false;
        try {
            console.log('🔐 Sepolia-verify: Verifying Ethereum signature');
            let recoveredAddress = '';
            try {
                recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
                isSignatureValid = recoveredAddress.toLowerCase() === address.toLowerCase();
                console.log('🔐 Sepolia-verify signature result:', {
                    isSignatureValid,
                    expectedAddress: address,
                    recoveredAddress
                });
            }
            catch (error) {
                console.error('Sepolia-verify Signature verification failed:', error);
                isSignatureValid = false;
            }
            if (!isSignatureValid || recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                console.log('❌ Sepolia-verify Signature verification failed:', {
                    isSignatureValid,
                    expectedAddress: address,
                    recoveredAddress
                });
                res.status(401).json({
                    success: false,
                    error: 'Invalid signature',
                    verification: {
                        offChain: {
                            signatureValid: false,
                            reason: 'Signature does not match address'
                        }
                    },
                    timestamp: new Date().toISOString()
                });
                return;
            }
            if (!message.includes(challengeData.challenge)) {
                console.log('❌ Sepolia-verify Challenge not found in message:', {
                    message: message.substring(0, 100) + '...',
                    expectedChallenge: challengeData.challenge.substring(0, 20) + '...'
                });
                res.status(401).json({
                    success: false,
                    error: 'Invalid challenge in signed message',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            console.log('✅ Sepolia-verify Off-chain signature verification passed');
        }
        catch (error) {
            res.status(401).json({
                success: false,
                error: 'Signature verification failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
            return;
        }
        let blockchainResults = null;
        let blockchainPending = false;
        if (storeOnChain && SepoliaService_1.sepoliaService.isConfigured()) {
            console.log('💾 Starting blockchain operations on Sepolia (ASYNC)...');
            blockchainPending = true;
            const checksummedAddress = ethers_1.ethers.getAddress(address.toLowerCase());
            (async () => {
                try {
                    console.log('🔄 Background: Starting blockchain operations...');
                    const didInfo = await SepoliaService_1.sepoliaService.getEmployeeDIDInfo(checksummedAddress);
                    let registrationResult = null;
                    if (!didInfo.success || !didInfo.didInfo?.isActive) {
                        console.log('📝 Background: Registering employee DID on Sepolia...');
                        const did = `did:ethr:${checksummedAddress}`;
                        const publicKeyJwk = JSON.stringify({
                            kty: 'EC',
                            crv: 'secp256k1',
                            use: 'sig',
                            x: checksummedAddress.substring(2, 34),
                            y: checksummedAddress.substring(34, 66)
                        });
                        registrationResult = await SepoliaService_1.sepoliaService.registerEmployeeDID(checksummedAddress, did, publicKeyJwk);
                        if (registrationResult.success) {
                            console.log('✅ Background: DID registration completed:', registrationResult.txHash);
                        }
                    }
                    console.log('📝 Background: Recording authentication...');
                    const authRecordResult = await SepoliaService_1.sepoliaService.recordAuthentication(challengeId, message, checksummedAddress);
                    if (authRecordResult.success) {
                        console.log('✅ Background: Authentication recorded:', authRecordResult.txHash);
                    }
                    console.log('🔍 Background: Verifying authentication...');
                    const verificationResult = await SepoliaService_1.sepoliaService.verifyAuthentication(challengeId, signature);
                    if (verificationResult.success) {
                        console.log('✅ Background: Blockchain verification completed:', verificationResult.txHash);
                    }
                    if (challengeData) {
                        challengeData.blockchainResults = {
                            registration: registrationResult,
                            authRecord: authRecordResult,
                            verification: verificationResult,
                            didInfo: didInfo.didInfo,
                            completedAt: new Date().toISOString()
                        };
                        await persistChallengeState(challengeId, challengeData);
                    }
                    console.log('🎉 Background: All blockchain operations completed successfully!');
                }
                catch (error) {
                    console.error('❌ Background: Blockchain operations failed:', error);
                    if (challengeData) {
                        challengeData.blockchainError = error?.message || 'Unknown blockchain error';
                        await persistChallengeState(challengeId, challengeData);
                    }
                }
            })();
            console.log('⚡ Response will be sent immediately (blockchain operations continue in background)');
        }
        else if (storeOnChain && !SepoliaService_1.sepoliaService.isConfigured()) {
            console.warn('⚠️ Blockchain storage requested but Sepolia service not configured');
        }
        challengeData.used = true;
        challengeData.userAddress = ethers_1.ethers.getAddress(address.toLowerCase());
        challengeData.did = `did:ethr:${ethers_1.ethers.getAddress(address.toLowerCase())}`;
        const checksummedAddressForToken = ethers_1.ethers.getAddress(address.toLowerCase());
        const tokenPayload = {
            address: checksummedAddressForToken,
            did: `did:ethr:${checksummedAddressForToken}`,
            challengeId: challengeId,
            authenticated: true,
            blockchainPending: blockchainPending,
            timestamp: new Date().toISOString()
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, {
            expiresIn: '24h',
            issuer: 'decentralized-trust-platform'
        });
        const refreshToken = (0, refreshToken_service_1.generateRefreshToken)();
        (0, refreshToken_service_1.storeRefreshToken)(refreshToken, checksummedAddressForToken, `did:ethr:${checksummedAddressForToken}`, 7);
        challengeData.token = token;
        challengeData.refreshToken = refreshToken;
        await persistChallengeState(challengeId, challengeData);
        const response = {
            success: true,
            message: blockchainPending
                ? 'Authentication successful - Blockchain operations processing in background'
                : 'Authentication successful',
            user: {
                address,
                did: `did:ethr:${address}`
            },
            verification: {
                offChain: {
                    signatureValid: isSignatureValid,
                    timestamp: new Date().toISOString()
                },
                blockchain: blockchainPending ? {
                    status: 'pending',
                    message: 'Blockchain operations are being processed. Check /sepolia-history/:address for results.'
                } : null
            },
            links: {
                faucet: 'https://sepoliafaucet.com/',
                explorer: 'https://sepolia.etherscan.io',
                statusCheck: `/api/auth/blockchain-status/${challengeId}`
            },
            token,
            refreshToken,
            expiresIn: '24h',
            timestamp: new Date().toISOString()
        };
        console.log('✅ Sepolia authentication response sent immediately:', {
            address,
            blockchainPending,
            responseTime: Date.now() - challengeData.timestamp + 'ms'
        });
        res.json(response);
    }
    catch (error) {
        console.error('❌ Sepolia blockchain authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Blockchain authentication failed',
            details: error.message,
            service: {
                configured: SepoliaService_1.sepoliaService.isConfigured(),
                config: SepoliaService_1.sepoliaService.getConfig()
            },
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/blockchain-status/:challengeId', async (req, res) => {
    try {
        const { challengeId } = req.params;
        const challengeData = await (0, challengeStorage_service_1.getChallenge)(challengeId);
        if (!challengeData) {
            res.status(404).json({
                success: false,
                error: 'Challenge not found or expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const blockchainResults = challengeData.blockchainResults;
        const blockchainError = challengeData.blockchainError;
        if (blockchainResults) {
            res.json({
                success: true,
                status: 'completed',
                challengeId,
                blockchain: {
                    registration: blockchainResults.registration,
                    authRecord: blockchainResults.authRecord,
                    verification: blockchainResults.verification,
                    didInfo: blockchainResults.didInfo,
                    completedAt: blockchainResults.completedAt
                },
                links: {
                    etherscan: blockchainResults.verification?.txHash
                        ? `https://sepolia.etherscan.io/tx/${blockchainResults.verification.txHash}`
                        : null
                },
                timestamp: new Date().toISOString()
            });
        }
        else if (blockchainError) {
            res.json({
                success: false,
                status: 'failed',
                challengeId,
                error: blockchainError,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.json({
                success: true,
                status: 'pending',
                challengeId,
                message: 'Blockchain operations are still in progress',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check blockchain status',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/sepolia-status', async (req, res) => {
    try {
        if (!SepoliaService_1.sepoliaService.isConfigured()) {
            res.json({
                success: false,
                error: 'Sepolia service not configured',
                setup: {
                    required: [
                        'SEPOLIA_RPC_URL',
                        'SEPOLIA_CONTRACT_ADDRESS',
                        'PLATFORM_PRIVATE_KEY'
                    ],
                    faucets: [
                        'https://sepoliafaucet.com/',
                        'https://www.infura.io/faucet/sepolia'
                    ]
                },
                timestamp: new Date().toISOString()
            });
            return;
        }
        const networkStatus = await SepoliaService_1.sepoliaService.getNetworkStatus();
        const config = SepoliaService_1.sepoliaService.getConfig();
        res.json({
            success: networkStatus.success,
            network: networkStatus.status,
            configuration: {
                rpcUrl: config.rpcUrl,
                contractAddress: config.contractAddress,
                chainId: config.chainId,
                walletAddress: config.walletAddress
            },
            links: {
                explorer: 'https://sepolia.etherscan.io',
                faucet: 'https://sepoliafaucet.com/',
                contract: config.contractAddress
                    ? `https://sepolia.etherscan.io/address/${config.contractAddress}`
                    : null
            },
            error: networkStatus.error,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get Sepolia network status',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/sepolia-history/:address', async (req, res) => {
    try {
        const { address } = req.params;
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            res.status(400).json({
                success: false,
                error: 'Invalid Ethereum address',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (!SepoliaService_1.sepoliaService.isConfigured()) {
            res.status(503).json({
                success: false,
                error: 'Sepolia service not configured',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const didInfo = await SepoliaService_1.sepoliaService.getEmployeeDIDInfo(address);
        res.json({
            success: didInfo.success,
            address,
            did: `did:ethr:${address}`,
            blockchain: didInfo.didInfo || null,
            links: {
                etherscan: `https://sepolia.etherscan.io/address/${address}`,
                profile: didInfo.didInfo?.did || null
            },
            error: didInfo.error,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get authentication history',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/refresh', rateLimiter_middleware_1.authRateLimiter, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({
                success: false,
                error: 'Refresh token is required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const tokenRecord = (0, refreshToken_service_1.getRefreshToken)(refreshToken);
        if (!tokenRecord) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const newTokenPayload = {
            address: tokenRecord.userId,
            did: tokenRecord.did,
            authenticated: true,
            refreshed: true,
            originalIssueDate: tokenRecord.createdAt.toISOString(),
            timestamp: new Date().toISOString()
        };
        const newAccessToken = jsonwebtoken_1.default.sign(newTokenPayload, JWT_SECRET, {
            expiresIn: '24h',
            issuer: 'decentralized-trust-platform'
        });
        const newRefreshToken = (0, refreshToken_service_1.generateRefreshToken)();
        (0, refreshToken_service_1.storeRefreshToken)(newRefreshToken, tokenRecord.userId, tokenRecord.did, 7, tokenRecord.deviceInfo);
        (0, refreshToken_service_1.revokeRefreshToken)(refreshToken);
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            token: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: '24h',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            const revoked = (0, refreshToken_service_1.revokeRefreshToken)(refreshToken);
            res.json({
                success: true,
                message: revoked ? 'Logged out successfully' : 'Already logged out',
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.json({
                success: true,
                message: 'Logged out successfully',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
//# sourceMappingURL=auth.js.map