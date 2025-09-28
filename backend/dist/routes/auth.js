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
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.authRoutes = router;
const blockchainService = new blockchainService_1.BlockchainService({
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    contractAddress: process.env.DID_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
});
const employeeDatabase = new Map([
    ['EMP001', {
            id: 'EMP001',
            name: 'Zaid',
            department: 'Engineering',
            role: 'CEO',
            email: 'zaid@company.com',
            active: true
        }],
    ['EMP002', {
            id: 'EMP002',
            name: 'Hassaan',
            department: 'Engineering',
            role: 'CTO',
            email: 'hassaan@company.com',
            active: true
        }],
    ['EMP003', {
            id: 'EMP003',
            name: 'Atharva',
            department: 'Product',
            role: 'Product Manager',
            email: 'atharva@company.com',
            active: true
        }],
    ['EMP004', {
            id: 'EMP004',
            name: 'Gracian',
            department: 'Design',
            role: 'Senior Designer',
            email: 'gracian@company.com',
            active: true
        }]
]);
const challenges = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-key';
const CHALLENGE_EXPIRY_TIME = 5 * 60 * 1000;
router.get('/challenge', async (req, res) => {
    try {
        const challenge = await generateChallenge();
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
router.post('/challenge', async (req, res) => {
    try {
        const { employeeId, companyId, requestType } = req.body;
        if (employeeId) {
            const employee = employeeDatabase.get(employeeId.toUpperCase());
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
        const challenge = await generateChallenge({
            employeeId: employeeId?.toUpperCase(),
            companyId,
            requestType: requestType || 'portal_access'
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
    const challenge = crypto_1.default.randomBytes(32).toString('hex');
    const challengeId = crypto_1.default.randomUUID();
    challenges.set(challengeId, {
        challenge,
        timestamp: Date.now(),
        used: false,
        employeeId: context?.employeeId,
        companyId: context?.companyId,
        requestType: context?.requestType
    });
    cleanupExpiredChallenges();
    const qrCodeData = JSON.stringify({
        type: "did-auth-request",
        version: "1.0",
        challengeId,
        challenge,
        domain: 'decentralized-trust.platform',
        companyId: context?.companyId || 'dtp_enterprise_001',
        timestamp: Date.now(),
        expiresAt: Date.now() + CHALLENGE_EXPIRY_TIME,
        apiEndpoint: 'http://localhost:3001/api/auth/verify',
        instruction: 'Authenticate with your DID wallet to access Enterprise Portal',
        ...(context?.employeeId && {
            employee: employeeDatabase.get(context.employeeId),
            expectedDID: `did:ethr:${employeeDatabase.get(context.employeeId)?.email?.includes('zaid') ? '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F' : '0x1234567890123456789012345678901234567890'}`
        }),
        ...(context?.requestType && { requestType: context.requestType })
    });
    return {
        challengeId,
        challenge,
        expiresIn: Math.floor(CHALLENGE_EXPIRY_TIME / 1000),
        qrCodeData,
        ...(context?.employeeId && {
            employee: employeeDatabase.get(context.employeeId)
        })
    };
}
router.get('/status/:challengeId', async (req, res) => {
    try {
        const { challengeId } = req.params;
        const challengeData = challenges.get(challengeId);
        if (!challengeData) {
            res.status(404).json({
                success: false,
                error: 'Challenge not found or expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (Date.now() - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
            challenges.delete(challengeId);
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
                ...(challengeData.used && challengeData.token && {
                    token: challengeData.token,
                    did: challengeData.did,
                    userAddress: challengeData.userAddress
                })
            },
            timestamp: new Date().toISOString()
        });
        if (challengeData.used && challengeData.token) {
            setTimeout(() => {
                challenges.delete(challengeId);
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
        let matchingChallenge = null;
        let challengeId = null;
        for (const [cId, challengeData] of challenges.entries()) {
            if (cId.includes(sessionId) || challengeData.challenge.includes(sessionId)) {
                matchingChallenge = challengeData;
                challengeId = cId;
                break;
            }
        }
        if (!matchingChallenge) {
            res.status(404).json({
                success: false,
                error: 'Session not found or expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (Date.now() - matchingChallenge.timestamp > CHALLENGE_EXPIRY_TIME) {
            challenges.delete(challengeId);
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
                        name: employeeDatabase.get(matchingChallenge.employeeId || '')?.name || 'Unknown User'
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
            res.json({
                success: true,
                data: {
                    did: decoded.did,
                    userAddress: decoded.userAddress,
                    issuedAt: decoded.iat,
                    expiresAt: decoded.exp
                },
                message: 'Token is valid',
                timestamp: new Date().toISOString()
            });
        }
        catch (jwtError) {
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
router.post('/verify', async (req, res) => {
    try {
        const { challengeId, signature, address, message } = req.body;
        if (!challengeId || !signature || !address || !message) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: challengeId, signature, address, message',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const challengeData = challenges.get(challengeId);
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
        if (now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
            challenges.delete(challengeId);
            res.status(400).json({
                success: false,
                error: 'Challenge has expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        try {
            const isDevelopmentMode = process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true';
            console.log('🔧 Environment check:', {
                NODE_ENV: process.env.NODE_ENV,
                DEMO_MODE: process.env.DEMO_MODE,
                isDevelopmentMode
            });
            let signatureValid = false;
            let recoveredAddress = '';
            if (isDevelopmentMode) {
                console.log('🔧 Development mode: Accepting demo signature');
                signatureValid = true;
                recoveredAddress = address;
            }
            else {
                console.log('🔐 Production mode: Verifying real signature');
                try {
                    recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
                    signatureValid = recoveredAddress.toLowerCase() === address.toLowerCase();
                }
                catch (error) {
                    console.error('Signature verification failed:', error);
                    signatureValid = false;
                }
            }
            if (!signatureValid || recoveredAddress.toLowerCase() !== address.toLowerCase()) {
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
            console.log('✅ Signature verification successful for address:', address);
            challengeData.used = true;
            challengeData.userAddress = address;
            const tokenPayload = {
                address: address,
                challengeId: challengeId,
                authenticated: true,
                timestamp: new Date().toISOString()
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, {
                expiresIn: '24h',
                issuer: 'decentralized-trust-platform'
            });
            challengeData.token = token;
            cleanupExpiredChallenges();
            res.status(200).json({
                success: true,
                data: {
                    token: token,
                    address: address,
                    challengeId: challengeId,
                    expiresIn: '24h'
                },
                message: 'Authentication successful',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Signature verification error:', error);
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
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/verify', async (req, res) => {
    try {
        const { type, challenge, sessionId, did, signature, timestamp: authTimestamp, userCredentials, approved } = req.body;
        if (approved === false) {
            res.status(200).json({
                success: true,
                data: {
                    authenticated: false,
                    denied: true,
                    sessionId
                },
                message: 'Authentication denied by user',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (!type || !challenge || !sessionId || !did || !signature || !userCredentials) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields for authentication',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (type !== 'did-auth-response') {
            res.status(400).json({
                success: false,
                error: 'Invalid authentication response type',
                timestamp: new Date().toISOString()
            });
            return;
        }
        let originalChallenge = null;
        let challengeKey = null;
        for (const [key, challengeData] of challenges.entries()) {
            if (key.includes(sessionId) || challengeData.challenge.includes(sessionId)) {
                originalChallenge = challengeData;
                challengeKey = key;
                break;
            }
        }
        if (!originalChallenge) {
            res.status(400).json({
                success: false,
                error: 'Invalid or expired authentication session',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (originalChallenge.used) {
            res.status(400).json({
                success: false,
                error: 'Authentication session already completed',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (Date.now() - originalChallenge.timestamp > CHALLENGE_EXPIRY_TIME) {
            challenges.delete(challengeKey);
            res.status(400).json({
                success: false,
                error: 'Authentication session has expired',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const didMatch = did.match(/^did:ethr:(0x[a-fA-F0-9]{40})$/);
        if (!didMatch) {
            res.status(400).json({
                success: false,
                error: 'Invalid DID format',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const userAddress = didMatch[1];
        try {
            const messageToVerify = JSON.stringify({
                challenge: challenge,
                did: did,
                timestamp: authTimestamp
            });
            const recoveredAddress = ethers_1.ethers.verifyMessage(messageToVerify, signature);
            if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
                res.status(401).json({
                    success: false,
                    error: 'Signature verification failed',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            console.log('✅ DID authentication successful for:', userCredentials.name);
            originalChallenge.used = true;
            originalChallenge.userAddress = userAddress;
            originalChallenge.did = did;
            originalChallenge.employeeId = userCredentials.employeeId;
            const tokenPayload = {
                did: did,
                address: userAddress,
                employeeId: userCredentials.employeeId,
                name: userCredentials.name,
                role: userCredentials.role,
                department: userCredentials.department,
                companyId: userCredentials.companyId,
                sessionId: sessionId,
                authenticated: true,
                timestamp: new Date().toISOString()
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, {
                expiresIn: '24h',
                issuer: 'decentralized-trust-platform'
            });
            originalChallenge.token = token;
            console.log(`🎉 User ${userCredentials.name} (${userCredentials.role}) authenticated successfully`);
            res.status(200).json({
                success: true,
                data: {
                    authenticated: true,
                    token: token,
                    user: {
                        did: did,
                        address: userAddress,
                        employeeId: userCredentials.employeeId,
                        name: userCredentials.name,
                        role: userCredentials.role,
                        department: userCredentials.department,
                        companyId: userCredentials.companyId
                    },
                    sessionId: sessionId,
                    expiresIn: '24h'
                },
                message: `Welcome, ${userCredentials.name}! Authentication successful.`,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Signature verification error:', error);
            res.status(401).json({
                success: false,
                error: 'Authentication signature verification failed',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Passwordless auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during authentication',
            timestamp: new Date().toISOString()
        });
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
        const challengeData = challenges.get(challengeId);
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
        if (now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
            challenges.delete(challengeId);
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
            const COMPANY_DID = process.env.COMPANY_DID || 'did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
            const verificationResult = await (0, did_jwt_1.verifyJWT)(credential, {
                resolver: undefined,
                audience: undefined
            });
            const vcPayload = verificationResult.payload;
            if (!vcPayload.vc || !vcPayload.vc.credentialSubject) {
                throw new Error('Invalid credential structure');
            }
            const credentialSubject = vcPayload.vc.credentialSubject;
            if (credentialSubject.id !== did) {
                throw new Error('Credential not issued to authenticated user');
            }
            if (vcPayload.vc.issuer !== COMPANY_DID) {
                throw new Error('Credential not issued by authorized company');
            }
            if (vcPayload.exp && vcPayload.exp < Math.floor(Date.now() / 1000)) {
                throw new Error('Credential has expired');
            }
            console.log('✅ Step 2: Credential verification successful');
            const employeeRole = credentialSubject.role;
            const employeeId = credentialSubject.employeeId;
            const employeeName = credentialSubject.name;
            const employeeDepartment = credentialSubject.department;
            const employeeEmail = credentialSubject.email;
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
                isAdmin: employeeRole === 'HR Director',
                timestamp: new Date().toISOString()
            };
            const enhancedToken = jsonwebtoken_1.default.sign(enhancedTokenPayload, JWT_SECRET, {
                expiresIn: '24h',
                issuer: 'decentralized-trust-platform'
            });
            challengeData.used = true;
            challengeData.userAddress = userAddress;
            challengeData.did = did;
            challengeData.token = enhancedToken;
            cleanupExpiredChallenges();
            res.status(200).json({
                success: true,
                data: {
                    token: enhancedToken,
                    user: {
                        did: did,
                        address: userAddress,
                        employeeId: employeeId,
                        name: employeeName,
                        role: employeeRole,
                        department: employeeDepartment,
                        email: employeeEmail,
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
function cleanupExpiredChallenges() {
    const now = Date.now();
    for (const [challengeId, challengeData] of challenges.entries()) {
        if (now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME) {
            challenges.delete(challengeId);
        }
    }
}
setInterval(cleanupExpiredChallenges, 10 * 60 * 1000);
//# sourceMappingURL=auth.js.map