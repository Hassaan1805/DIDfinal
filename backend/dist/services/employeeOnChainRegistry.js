"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeeOnChainProfile = getEmployeeOnChainProfile;
exports.ensureEmployeeRegisteredOnChain = ensureEmployeeRegisteredOnChain;
exports.enrichEmployeeWithOnChainProfile = enrichEmployeeWithOnChainProfile;
exports.recordEmployeeAuthenticationOnChain = recordEmployeeAuthenticationOnChain;
const ethers_1 = require("ethers");
const employeeWallets_1 = require("./employeeWallets");
const SepoliaService_1 = require("./SepoliaService");
const onChainProfiles = new Map();
function deriveHashId(employeeId, address, registrationTxHash) {
    return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(`${employeeId}|${address.toLowerCase()}|${registrationTxHash.toLowerCase()}`));
}
function buildPublicKeyPayload(employeeId) {
    const wallet = employeeWallets_1.EMPLOYEE_WALLETS.get(employeeId.toUpperCase());
    if (!wallet) {
        throw new Error(`Missing employee wallet for ${employeeId}`);
    }
    const signingKey = new ethers_1.ethers.SigningKey(wallet.privateKey);
    return JSON.stringify({
        kty: 'EC',
        crv: 'secp256k1',
        alg: 'ES256K',
        kid: wallet.did,
        x: signingKey.publicKey,
    });
}
async function resolveRegistrationTransaction(address, txHashHint) {
    if (txHashHint && txHashHint !== 'already-registered') {
        return { txHash: txHashHint };
    }
    const latestRegistration = await SepoliaService_1.sepoliaService.getLatestDidRegistrationTx(address);
    if (!latestRegistration.success || !latestRegistration.txHash) {
        throw new Error(latestRegistration.error || 'Unable to resolve DID registration transaction hash');
    }
    return {
        txHash: latestRegistration.txHash,
        blockNumber: latestRegistration.blockNumber,
        timestamp: latestRegistration.timestamp,
    };
}
function getEmployeeOnChainProfile(employeeId) {
    return onChainProfiles.get(employeeId.toUpperCase());
}
async function ensureEmployeeRegisteredOnChain(employee) {
    const employeeId = employee.id.toUpperCase();
    const cached = onChainProfiles.get(employeeId);
    if (cached) {
        return cached;
    }
    if (!SepoliaService_1.sepoliaService.isReady()) {
        throw new Error('Sepolia service is not ready. Configure Sepolia environment variables before authentication.');
    }
    const registrationResult = await SepoliaService_1.sepoliaService.registerEmployeeDID(employee.address, employee.did, buildPublicKeyPayload(employeeId));
    if (!registrationResult.success) {
        throw new Error(registrationResult.error || 'Failed to register employee DID on-chain');
    }
    const resolvedTx = await resolveRegistrationTransaction(employee.address, registrationResult.txHash);
    const profile = {
        employeeId,
        address: employee.address,
        did: employee.did,
        hashId: deriveHashId(employeeId, employee.address, resolvedTx.txHash),
        didRegistrationTxHash: resolvedTx.txHash,
        didRegistrationBlockNumber: resolvedTx.blockNumber,
        didRegistrationTimestamp: resolvedTx.timestamp,
        updatedAt: new Date().toISOString(),
    };
    onChainProfiles.set(employeeId, profile);
    return profile;
}
async function enrichEmployeeWithOnChainProfile(employee) {
    const profile = await ensureEmployeeRegisteredOnChain(employee);
    return {
        ...employee,
        hashId: profile.hashId,
        didRegistrationTxHash: profile.didRegistrationTxHash,
        didRegistrationBlockNumber: profile.didRegistrationBlockNumber,
        didRegistrationTimestamp: profile.didRegistrationTimestamp,
        lastAuthRecordTxHash: profile.lastAuthRecordTxHash,
        lastAuthVerifyTxHash: profile.lastAuthVerifyTxHash,
    };
}
async function recordEmployeeAuthenticationOnChain(employee, challengeId, message, signature) {
    const profile = await ensureEmployeeRegisteredOnChain(employee);
    const authRecordResult = await SepoliaService_1.sepoliaService.recordAuthentication(challengeId, message, employee.address);
    if (!authRecordResult.success || !authRecordResult.txHash) {
        throw new Error(authRecordResult.error || 'Failed to record authentication on-chain');
    }
    const verifyResult = await SepoliaService_1.sepoliaService.verifyAuthentication(challengeId, signature);
    if (!verifyResult.success || !verifyResult.txHash) {
        throw new Error(verifyResult.error || 'Failed to verify authentication on-chain');
    }
    const updated = {
        ...profile,
        lastAuthRecordTxHash: authRecordResult.txHash,
        lastAuthVerifyTxHash: verifyResult.txHash,
        updatedAt: new Date().toISOString(),
    };
    onChainProfiles.set(employee.id.toUpperCase(), updated);
    return {
        profile: updated,
        authRecordTxHash: authRecordResult.txHash,
        authVerifyTxHash: verifyResult.txHash,
    };
}
//# sourceMappingURL=employeeOnChainRegistry.js.map