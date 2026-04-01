import { ethers } from 'ethers';
import { EmployeeRecord } from './employeeDirectory';
import { EMPLOYEE_WALLETS } from './employeeWallets';
import { sepoliaService } from './SepoliaService';

export interface EmployeeOnChainProfile {
  employeeId: string;
  address: string;
  did: string;
  hashId: string;
  didRegistrationTxHash: string;
  didRegistrationBlockNumber?: number;
  didRegistrationTimestamp?: string;
  lastAuthRecordTxHash?: string;
  lastAuthVerifyTxHash?: string;
  updatedAt: string;
}

const onChainProfiles = new Map<string, EmployeeOnChainProfile>();

function deriveHashId(employeeId: string, address: string, registrationTxHash: string): string {
  return ethers.keccak256(
    ethers.toUtf8Bytes(`${employeeId}|${address.toLowerCase()}|${registrationTxHash.toLowerCase()}`)
  );
}

function buildPublicKeyPayload(employeeId: string, employee: EmployeeRecord): string {
  const wallet = EMPLOYEE_WALLETS.get(employeeId.toUpperCase());

  if (!wallet?.privateKey) {
    // For dynamically provisioned employees we may only have wallet address + DID.
    // We still provide a deterministic public key envelope for contract metadata.
    const pseudoPublicKey = ethers.keccak256(
      ethers.toUtf8Bytes(`${employeeId}|${employee.address.toLowerCase()}|${employee.did.toLowerCase()}`)
    );

    return JSON.stringify({
      kty: 'EC',
      crv: 'secp256k1',
      alg: 'ES256K',
      kid: employee.did,
      x: pseudoPublicKey,
      dynamicProvisioned: true,
    });
  }

  const signingKey = new ethers.SigningKey(wallet.privateKey);
  return JSON.stringify({
    kty: 'EC',
    crv: 'secp256k1',
    alg: 'ES256K',
    kid: wallet.did,
    x: signingKey.publicKey,
  });
}

async function resolveRegistrationTransaction(address: string, txHashHint?: string): Promise<{
  txHash: string;
  blockNumber?: number;
  timestamp?: string;
}> {
  if (txHashHint && txHashHint !== 'already-registered') {
    return { txHash: txHashHint };
  }

  const latestRegistration = await sepoliaService.getLatestDidRegistrationTx(address);
  if (!latestRegistration.success || !latestRegistration.txHash) {
    throw new Error(latestRegistration.error || 'Unable to resolve DID registration transaction hash');
  }

  return {
    txHash: latestRegistration.txHash,
    blockNumber: latestRegistration.blockNumber,
    timestamp: latestRegistration.timestamp,
  };
}

export function getEmployeeOnChainProfile(employeeId: string): EmployeeOnChainProfile | undefined {
  return onChainProfiles.get(employeeId.toUpperCase());
}

export async function ensureEmployeeRegisteredOnChain(employee: EmployeeRecord & { hashId?: string }): Promise<EmployeeOnChainProfile> {
  const employeeId = employee.id.toUpperCase();
  const cached = onChainProfiles.get(employeeId);
  if (cached) {
    return cached;
  }

  if (!sepoliaService.isReady()) {
    console.warn(`⚠️  Sepolia not configured — using local profile for ${employeeId} (on-chain registration skipped)`);
    const localTxHash = ethers.keccak256(
      ethers.toUtf8Bytes(`local|${employeeId}|${employee.address.toLowerCase()}|${employee.did.toLowerCase()}`)
    );
    const profile: EmployeeOnChainProfile = {
      employeeId,
      address: employee.address,
      did: employee.did,
      hashId: deriveHashId(employeeId, employee.address, localTxHash),
      didRegistrationTxHash: localTxHash,
      updatedAt: new Date().toISOString(),
    };
    onChainProfiles.set(employeeId, profile);
    return profile;
  }

  const registrationResult = await sepoliaService.registerEmployeeDID(
    employee.address,
    employee.did,
    buildPublicKeyPayload(employeeId, employee)
  );

  if (!registrationResult.success) {
    throw new Error(registrationResult.error || 'Failed to register employee DID on-chain');
  }

  const resolvedTx = await resolveRegistrationTransaction(employee.address, registrationResult.txHash);
  const profile: EmployeeOnChainProfile = {
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

export async function enrichEmployeeWithOnChainProfile<T extends EmployeeRecord & { hashId?: string }>(employee: T): Promise<T & {
  hashId: string;
  didRegistrationTxHash: string;
  didRegistrationBlockNumber?: number;
  didRegistrationTimestamp?: string;
  lastAuthRecordTxHash?: string;
  lastAuthVerifyTxHash?: string;
}> {
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

export async function recordEmployeeAuthenticationOnChain(
  employee: EmployeeRecord & { hashId?: string },
  challengeId: string,
  message: string,
  signature: string,
  options?: { skipOnChainVerification?: boolean }
): Promise<{
  profile: EmployeeOnChainProfile;
  authRecordTxHash: string;
  authVerifyTxHash?: string;
}> {
  const profile = await ensureEmployeeRegisteredOnChain(employee);

  if (!sepoliaService.isReady()) {
    console.warn(`⚠️  Sepolia not configured — skipping on-chain auth record for ${employee.id}`);
    const updated: EmployeeOnChainProfile = { ...profile, updatedAt: new Date().toISOString() };
    onChainProfiles.set(employee.id.toUpperCase(), updated);
    return { profile: updated, authRecordTxHash: profile.didRegistrationTxHash };
  }

  const authRecordResult = await sepoliaService.recordAuthentication(challengeId, message, employee.address);
  if (!authRecordResult.success || !authRecordResult.txHash) {
    throw new Error(authRecordResult.error || 'Failed to record authentication on-chain');
  }

  let verifyTxHash: string | undefined;
  const shouldSkipOnChainVerification = options?.skipOnChainVerification === true;
  if (!shouldSkipOnChainVerification) {
    const verifyResult = await sepoliaService.verifyAuthentication(challengeId, signature);
    if (!verifyResult.success || !verifyResult.txHash) {
      throw new Error(verifyResult.error || 'Failed to verify authentication on-chain');
    }
    verifyTxHash = verifyResult.txHash;
  }

  const updated: EmployeeOnChainProfile = {
    ...profile,
    lastAuthRecordTxHash: authRecordResult.txHash,
    lastAuthVerifyTxHash: verifyTxHash,
    updatedAt: new Date().toISOString(),
  };

  onChainProfiles.set(employee.id.toUpperCase(), updated);

  return {
    profile: updated,
    authRecordTxHash: authRecordResult.txHash,
    authVerifyTxHash: verifyTxHash,
  };
}
