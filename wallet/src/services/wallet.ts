import { ethers } from 'ethers';
import { StorageService } from './storage';
import { networkService } from './network';
import { config, isValidEthereumAddress } from '../config/config';
import {
  WalletCredentialRecordV1,
  WalletCredentialSource,
  WalletCredentialStatusHint,
} from '../types/credentials';
import { zkProver } from './zkp/zkProver';

export interface Employee {
  id: string;
  name: string;
  did: string;
  role: string;
  department?: string;
  email?: string;
  credential?: string;
}

export type VerifierClaimKey = 'subjectDid' | 'employeeId' | 'name' | 'role' | 'department' | 'email';

export interface RequestedClaimsContract {
  requestType: 'portal_access' | 'general_auth';
  requiredClaims: VerifierClaimKey[];
  policyVersion: number;
  proofRequired?: boolean;
  bindingVersion?: string;
}

export type DisclosedClaimsPayload = Partial<Record<VerifierClaimKey, string>>;

interface DisclosedClaimsProofPayload {
  bindingVersion: string;
  challengeId: string;
  challengeDigest: string;
  claimDigest: string;
  credentialDigest?: string;
  bindingDigest: string;
  signedBinding: string;
  createdAt: string;
}

const DISCLOSURE_BINDING_VERSION = 'sd-bind-v1';
const DISCLOSURE_BINDING_PREFIX = 'Selective disclosure binding:';

function computeCredentialFingerprint(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function toIsoFromEpochSeconds(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  const parsed = new Date(value * 1000);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function decodeJwtPayload(credentialJwt: string): Record<string, any> | null {
  const parts = credentialJwt.split('.');
  if (parts.length < 2) {
    return null;
  }

  const payloadSegment = parts[1];
  const padded = payloadSegment
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(payloadSegment.length / 4) * 4, '=');

  if (typeof globalThis.atob !== 'function') {
    return null;
  }

  try {
    const payloadText = globalThis.atob(padded);
    return JSON.parse(payloadText) as Record<string, any>;
  } catch {
    return null;
  }
}

function normalizeDid(value?: string): string | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }
  return value.trim().toLowerCase();
}

function resolveStatusHint(expiresAt?: string): WalletCredentialStatusHint {
  if (!expiresAt) {
    return 'active';
  }

  const epoch = Date.parse(expiresAt);
  if (Number.isNaN(epoch)) {
    return 'unknown';
  }

  return Date.now() > epoch ? 'expired' : 'active';
}

function hashUtf8(value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

function canonicalizeClaims(claims: DisclosedClaimsPayload): string {
  return Object.entries(claims)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value.trim()}`)
    .join('|');
}

function computeClaimDigest(claims: DisclosedClaimsPayload): string {
  const canonical = canonicalizeClaims(claims);
  return hashUtf8(canonical || 'no-claims');
}

function computeBindingDigest(input: {
  challengeId: string;
  challengeDigest: string;
  claimDigest: string;
  credentialDigest?: string;
  bindingVersion: string;
}): string {
  const material = [
    input.challengeId,
    input.challengeDigest,
    input.claimDigest,
    input.credentialDigest || 'no-credential',
    input.bindingVersion,
  ].join('|');

  return hashUtf8(material);
}

export interface AuthRequest {
  challengeId: string;
  platform: string;       // mapped from domain
  timestamp: number | string;
  nonce?: string;
  challenge?: string;
  apiEndpoint?: string;
  employee?: {
    id: string;
    name: string;
    department?: string;
    role?: string;
    badge?: string;
    hashId?: string;
  };
  badge?: {
    type: string;
    label?: string;
    permissions?: string[];
  };
  employeeHashId?: string;
  expectedDID?: string;
  type?: string;
  domain?: string;
  verifierId?: string;
  verifier?: {
    verifierId: string;
    organizationId?: string;
    organizationName?: string;
    policyVersion?: number;
    requireCredential?: boolean;
    allowedBadges?: string[];
  };
  requestedClaims?: RequestedClaimsContract;
}

class WalletService {
  private wallet: ethers.HDNodeWallet | ethers.Wallet | null = null;
  private employees: Employee[] = [];
  private credentials: WalletCredentialRecordV1[] = [];
  /**
   * Initialize wallet (load or create)
   */

  async initialize(): Promise<void> {
    const privateKey = await StorageService.getPrivateKey();
    
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey);
    } else {
      await this.createWallet();
    }

    // Load employees from backend when possible; fallback to locally cached records
    this.employees = await StorageService.getEmployees();
    this.credentials = await StorageService.getCredentialRecords();
    await this.syncEmployeesFromBackend();
    await this.syncCredentialsFromBackend();

    await this.migrateLegacyEmployeeCredentials();
  }

  private buildCredentialRecord(
    credentialJwt: string,
    source: WalletCredentialSource,
    options?: {
      employeeId?: string;
      subjectDid?: string;
    },
  ): WalletCredentialRecordV1 {
    const now = new Date().toISOString();
    const decodedPayload = decodeJwtPayload(credentialJwt);
    const credentialSubject = decodedPayload?.vc?.credentialSubject || {};

    const credentialId =
      (typeof decodedPayload?.vc?.id === 'string' && decodedPayload.vc.id.trim())
      || (typeof decodedPayload?.jti === 'string' && decodedPayload.jti.trim())
      || undefined;

    const issuerDid =
      (typeof decodedPayload?.vc?.issuer === 'string' && decodedPayload.vc.issuer.trim())
      || (typeof decodedPayload?.vc?.issuer?.id === 'string' && decodedPayload.vc.issuer.id.trim())
      || (typeof decodedPayload?.iss === 'string' && decodedPayload.iss.trim())
      || undefined;

    const subjectDid =
      (typeof credentialSubject?.id === 'string' && credentialSubject.id.trim())
      || (typeof options?.subjectDid === 'string' && options.subjectDid.trim())
      || undefined;

    const employeeId =
      (typeof credentialSubject?.employeeId === 'string' && credentialSubject.employeeId.trim())
      || (typeof options?.employeeId === 'string' && options.employeeId.trim())
      || undefined;

    const employeeName =
      (typeof credentialSubject?.name === 'string' && credentialSubject.name.trim()) || undefined;

    const badge =
      (typeof credentialSubject?.badge === 'string' && credentialSubject.badge.trim()) || undefined;

    const issuedAt =
      (typeof decodedPayload?.nbf === 'number' && toIsoFromEpochSeconds(decodedPayload.nbf))
      || (typeof decodedPayload?.iat === 'number' && toIsoFromEpochSeconds(decodedPayload.iat))
      || (typeof decodedPayload?.vc?.issuanceDate === 'string' && decodedPayload.vc.issuanceDate)
      || undefined;

    const expiresAt =
      (typeof decodedPayload?.exp === 'number' && toIsoFromEpochSeconds(decodedPayload.exp))
      || (typeof decodedPayload?.vc?.expirationDate === 'string' && decodedPayload.vc.expirationDate)
      || undefined;

    const recordId = credentialId
      ? `${credentialId}:${computeCredentialFingerprint(credentialJwt)}`
      : `cred:${computeCredentialFingerprint(credentialJwt)}`;

    return {
      schemaVersion: 1,
      recordId,
      credentialJwt,
      credentialId,
      issuerDid,
      subjectDid,
      employeeId,
      issuedAt,
      expiresAt,
      importedAt: now,
      updatedAt: now,
      employeeName,
      badge,
      source,
      statusHint: resolveStatusHint(expiresAt),
    };
  }

  private upsertCredentialRecord(record: WalletCredentialRecordV1): void {
    const byJwtIndex = this.credentials.findIndex((existing) => existing.credentialJwt === record.credentialJwt);
    if (byJwtIndex >= 0) {
      this.credentials[byJwtIndex] = {
        ...this.credentials[byJwtIndex],
        ...record,
        updatedAt: new Date().toISOString(),
      };
      return;
    }

    this.credentials.unshift(record);
  }

  private async migrateLegacyEmployeeCredentials(): Promise<void> {
    let updated = false;

    for (const employee of this.employees) {
      if (!employee.credential || !employee.credential.trim()) {
        continue;
      }

      const legacyRecord = this.buildCredentialRecord(employee.credential, 'legacy-employee', {
        employeeId: employee.id,
        subjectDid: employee.did,
      });

      const exists = this.credentials.some((record) => record.credentialJwt === legacyRecord.credentialJwt);
      if (!exists) {
        this.credentials.unshift(legacyRecord);
        updated = true;
      }
    }

    if (updated) {
      await StorageService.saveCredentialRecords(this.credentials);
      console.log('✅ Migrated legacy employee credentials into typed credential store.');
    }
  }

  private async syncEmployeesFromBackend(): Promise<void> {
    try {
      const response = await networkService.get<{ success?: boolean; data?: Employee[] }>('/api/admin/directory');
      const fetchedEmployees = Array.isArray(response?.data) ? response.data : [];
      if (fetchedEmployees.length > 0) {
        this.employees = fetchedEmployees;
        await StorageService.saveEmployees(this.employees);
        await StorageService.markEmployeesSeeded();
        console.log('✅ Synced employees from backend:', this.employees.length);
        return;
      }
    } catch (error) {
      console.warn('⚠️ Failed to sync employees from backend, using cached records');
    }

    // Fallback to local cache if backend is unavailable.
    if (!this.employees || this.employees.length === 0) {
      console.warn('⚠️ No employees available locally yet. Connect to backend to sync employee directory.');
      this.employees = [];
    }
  }

  async syncCredentialsFromBackend(): Promise<void> {
    const did = this.getDID();
    if (!did) return;

    try {
      const response = await networkService.get<{
        success?: boolean;
        data?: { jwt: string; credentialId: string; employeeId: string; issuedAt: string; expiresAt: string };
      }>(`/api/admin/credential-for-did?did=${encodeURIComponent(did)}`);

      if (response?.success && response.data?.jwt) {
        const { jwt, credentialId, employeeId } = response.data;
        const alreadyStored = this.credentials.some(
          (r) => r.credentialId === credentialId || r.credentialJwt === jwt
        );
        if (!alreadyStored) {
          const record = this.buildCredentialRecord(jwt, 'api', { employeeId, subjectDid: did });
          this.upsertCredentialRecord(record);
          await StorageService.saveCredentialRecords(this.credentials);
          console.log(`✅ Fetched credential from backend for ${employeeId}`);
        }
      }
    } catch {
      // 404 (no credential issued yet) or network error — silent fail, not blocking
    }
  }

  private getCredentialForAuth(employeeId?: string, employeeDid?: string): WalletCredentialRecordV1 | undefined {
    const normalizedDid = normalizeDid(employeeDid);
    const normalizedEmployeeId = employeeId?.trim().toUpperCase();

    const candidates = this.credentials.filter((record) => {
      if (record.statusHint === 'expired') {
        return false;
      }

      const employeeMatch = normalizedEmployeeId
        ? record.employeeId?.trim().toUpperCase() === normalizedEmployeeId
        : false;

      const didMatch = normalizedDid
        ? normalizeDid(record.subjectDid) === normalizedDid
        : false;

      if (normalizedEmployeeId && normalizedDid) {
        return employeeMatch || didMatch;
      }

      if (normalizedEmployeeId) {
        return employeeMatch;
      }

      if (normalizedDid) {
        return didMatch;
      }

      return false;
    });

    if (candidates.length === 0) {
      return undefined;
    }

    return candidates
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  }

  async addCredential(
    credentialJwt: string,
    options?: {
      employeeId?: string;
      subjectDid?: string;
      source?: WalletCredentialSource;
    },
  ): Promise<WalletCredentialRecordV1> {
    const trimmed = credentialJwt.trim();
    if (!trimmed) {
      throw new Error('Credential JWT cannot be empty');
    }

    const record = this.buildCredentialRecord(trimmed, options?.source || 'manual', {
      employeeId: options?.employeeId,
      subjectDid: options?.subjectDid,
    });

    this.upsertCredentialRecord(record);
    await StorageService.saveCredentialRecords(this.credentials);
    return record;
  }

  /**
   * Create a new wallet
   */
  async createWallet(): Promise<ethers.HDNodeWallet | ethers.Wallet> {
    const wallet = ethers.Wallet.createRandom();
    await StorageService.savePrivateKey(wallet.privateKey);
    
    const did = this.formatDID(wallet.address);
    await StorageService.saveDID(did);
    
    this.wallet = wallet;
    return wallet;
  }

  /**
   * Get current wallet
   */
  getWallet(): ethers.HDNodeWallet | ethers.Wallet | null {
    return this.wallet;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Get DID
   */
  getDID(): string | null {
    const address = this.getAddress();
    return address ? this.formatDID(address) : null;
  }

  /**
   * Format address as DID
   */
  private formatDID(address: string): string {
    return `did:ethr:${address}`;
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return await this.wallet.signMessage(message);
  }

  /**
   * Add an employee
   */
  async addEmployee(employee: Employee): Promise<void> {
    if (!isValidEthereumAddress(employee.did.replace('did:ethr:', ''))) {
      throw new Error('Invalid DID format');
    }

    this.employees.push(employee);
    await StorageService.saveEmployees(this.employees);
  }

  /**
   * Get all employees
   */
  getEmployees(): Employee[] {
    return this.employees;
  }

  getCredentials(): WalletCredentialRecordV1[] {
    return this.credentials;
  }

  /**
   * Remove an employee
   */
  async removeEmployee(id: string): Promise<void> {
    this.employees = this.employees.filter(emp => emp.id !== id);
    await StorageService.saveEmployees(this.employees);

    const normalizedEmployeeId = id.trim().toUpperCase();
    const nextCredentials = this.credentials.filter((record) => {
      return record.employeeId?.trim().toUpperCase() !== normalizedEmployeeId;
    });

    if (nextCredentials.length !== this.credentials.length) {
      this.credentials = nextCredentials;
      await StorageService.saveCredentialRecords(this.credentials);
    }
  }

  /**
   * Get auth challenge from backend
   */
  async getAuthChallenge(): Promise<AuthRequest> {
    const response = await networkService.get('/api/auth/challenge');
    return response.data;
  }

  /**
   * Submit auth response
   */
  async submitAuthResponse(
    challengeId: string,
    employeeDID: string,
    challenge?: string,
    apiEndpoint?: string,
    employeeId?: string,
    verifierId?: string,
    requestedClaims?: RequestedClaimsContract,
    verifierCredentialRequired?: boolean,
    badgeType?: string,
  ): Promise<any> {
    const address = this.getAddress();
    if (!address) {
      throw new Error('Wallet not initialized');
    }

    const selectedEmployee = employeeId
      ? this.employees.find((employee) => employee.id === employeeId)
      : this.employees.find((employee) => employee.did?.toLowerCase() === employeeDID?.toLowerCase());
    const credentialRecord = this.getCredentialForAuth(employeeId, employeeDID);
    const credential = credentialRecord?.credentialJwt || selectedEmployee?.credential;

    const disclosureFromCredential = credential ? decodeJwtPayload(credential)?.vc?.credentialSubject : null;
    const disclosedClaims: DisclosedClaimsPayload = {};
    const requiredClaims = requestedClaims?.requiredClaims || [];

    for (const claimKey of requiredClaims) {
      let claimValue: string | undefined;

      if (claimKey === 'subjectDid') {
        claimValue = employeeDID;
      }

      if (claimKey === 'employeeId') {
        claimValue = employeeId || disclosureFromCredential?.employeeId;
      }

      if (claimKey === 'name') {
        claimValue = selectedEmployee?.name || disclosureFromCredential?.name;
      }

      if (claimKey === 'role') {
        claimValue = disclosureFromCredential?.role || disclosureFromCredential?.badge || badgeType || selectedEmployee?.role;
      }

      if (claimKey === 'department') {
        claimValue = selectedEmployee?.department || disclosureFromCredential?.department;
      }

      if (claimKey === 'email') {
        claimValue = selectedEmployee?.email || disclosureFromCredential?.email;
      }

      if (typeof claimValue === 'string' && claimValue.trim()) {
        disclosedClaims[claimKey] = claimValue.trim();
      }
    }

    const missingClaims = requiredClaims.filter((claimKey) => !disclosedClaims[claimKey]);
    if (missingClaims.length > 0) {
      throw new Error(`Unable to assemble selective presentation for required claims: ${missingClaims.join(', ')}`);
    }

    let disclosedClaimsProof: DisclosedClaimsProofPayload | undefined;
    if (requiredClaims.length > 0) {
      const bindingVersion = requestedClaims?.bindingVersion || DISCLOSURE_BINDING_VERSION;
      const challengeText = challenge
        ? `${challenge}`
        : `Challenge: ${challengeId}\nDID: ${employeeDID}`;
      const challengeDigest = hashUtf8(challengeText);
      const claimDigest = computeClaimDigest(disclosedClaims);
      // Only include credentialDigest when the credential will actually be sent in the body.
      // The backend recomputes the binding from what it receives — if no credential is sent,
      // it uses 'no-credential' as the placeholder. Including a digest here without sending
      // the credential causes a bindingDigest mismatch.
      const willSendCredential = Boolean(credential && (verifierCredentialRequired || requiredClaims.length === 0));
      const credentialDigest = willSendCredential ? hashUtf8(credential!) : undefined;
      const bindingDigest = computeBindingDigest({
        challengeId,
        challengeDigest,
        claimDigest,
        credentialDigest,
        bindingVersion,
      });
      const signedBinding = await this.signMessage(`${DISCLOSURE_BINDING_PREFIX} ${bindingDigest}`);

      disclosedClaimsProof = {
        bindingVersion,
        challengeId,
        challengeDigest,
        claimDigest,
        credentialDigest,
        bindingDigest,
        signedBinding,
        createdAt: new Date().toISOString(),
      };
    }

    // Sign a message that includes the actual challenge string (backend verifies this)
    const message = challenge
      ? `${challenge}`
      : `Challenge: ${challengeId}\nDID: ${employeeDID}`;
    const signature = await this.signMessage(message);

    const requestBody: Record<string, unknown> = {
      challengeId,
      signature,
      address,
      message,
      employeeId,
      did: employeeDID,
    };

    if (verifierId) {
      requestBody.verifierId = verifierId;
    }

    if (requiredClaims.length > 0) {
      requestBody.disclosedClaims = disclosedClaims;
      requestBody.disclosedClaimsProof = disclosedClaimsProof;
    }

    if (credential && (verifierCredentialRequired || requiredClaims.length === 0)) {
      requestBody.credential = credential;
      console.log('🪪 Including credential in auth submission for employee:', employeeId, 'recordId:', credentialRecord?.recordId || 'legacy-inline');
    } else if (requiredClaims.length > 0) {
      console.log('🔒 Submitting selective presentation with disclosed claims only:', Object.keys(disclosedClaims));
    }

    // Use the network service's current URL (auto-discovered working URL), not the
    // static config which may have a stale IP from .env. Never trust the QR's apiEndpoint.
    const verifyUrl = `${networkService.getApiUrl()}/api/auth/verify`;
    console.log('📡 Submitting auth to:', verifyUrl, '(apiEndpoint from QR was:', apiEndpoint, ')');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds for network latency
    let response: any;
    try {
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      response = await res.json();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after 30 seconds. Check network connection and backend availability → ${verifyUrl}`);
      }
      throw new Error(`${err.message} → ${verifyUrl}`);
    }

    // Save to history
    await StorageService.addAuthRecord({
      challengeId,
      employeeDID,
      timestamp: new Date().toISOString(),
      success: response.success,
      credentialProvided: Boolean(credential),
      credentialRecordId: credentialRecord?.recordId || null,
      credentialSource: credentialRecord?.source || (selectedEmployee?.credential ? 'legacy-employee' : null),
    });

    return response;
  }

  /**
   * Parse QR code data
   */
  parseQRCode(data: string): AuthRequest | null {
    try {
      console.log('📷 QR raw data length:', data.length);
      console.log('📷 QR raw data:', data.substring(0, 200));
      const parsed = JSON.parse(data);
      console.log('📷 QR parsed keys:', Object.keys(parsed));
      console.log('📷 QR challengeId:', parsed.challengeId);
      console.log('📷 QR domain:', parsed.domain);
      console.log('📷 QR platform:', parsed.platform);
      console.log('📷 QR type:', parsed.type);
      // Accept both portal format (domain) and legacy format (platform)
      if (parsed.challengeId && (parsed.platform || parsed.domain || parsed.type === 'did-auth-request' || parsed.type === 'zk-wallet-prove')) {
        return {
          ...parsed,
          platform: parsed.platform || parsed.domain || 'Enterprise Portal',
        } as AuthRequest;
      }
      console.log('📷 QR rejected: missing challengeId or platform/domain');
      return null;
    } catch (e) {
      console.log('📷 QR parse error:', e);
      return null;
    }
  }

  /**
   * Submit a ZK wallet-prove request.
   *
   * Preferred mode (true ZKP): generates the Groth16 proof ON-DEVICE using snarkjs,
   * then sends only {proof, publicSignals} to the backend. The private key never
   * leaves the wallet.
   *
   * Fallback (legacy): if WebAssembly is unavailable or local proof generation fails,
   * sends zkPrivKey to the backend for server-side proof generation.
   */
  async submitZKWalletProve(
    challengeId: string,
    requiredBadge: string,
    apiEndpoint: string,
  ): Promise<void> {
    if (!this.wallet) throw new Error('Wallet not initialized');

    const zkPrivKey = this.getZKPrivateKey();
    if (!zkPrivKey) throw new Error('Could not derive ZK private key');

    const address = this.wallet.address;
    const message = `zk-wallet-prove:${challengeId}`;
    const signature = await this.wallet.signMessage(message);

    const baseUrl = apiEndpoint.replace(/\/+$/, '');
    const url = `${baseUrl}/auth/zk-wallet-prove`;
    let body: Record<string, any>;

    // Try client-side proof generation (true ZKP)
    if (zkProver.isSupported()) {
      try {
        console.log('[Wallet] WebAssembly available — generating proof on-device (true ZKP)');
        await zkProver.ensureArtifacts(baseUrl);
        const { proof, publicSignals } = await zkProver.generateProof(zkPrivKey, requiredBadge);
        body = { challengeId, address, signature, message, proof, publicSignals };
        console.log('[Wallet] Client-side proof ready — private key stays on device');
      } catch (err: any) {
        console.warn('[Wallet] Client-side proof failed, falling back to server-side:', err.message);
        body = { challengeId, address, signature, message, zkPrivKey };
      }
    } else {
      console.warn('[Wallet] WebAssembly not available — using server-side proof generation');
      body = { challengeId, address, signature, message, zkPrivKey };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s for on-device proof
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal as any,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ZK proof submission failed');
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('Request timed out — proof generation can take up to 90s on device');
      throw err;
    }
  }

  /**
   * Derive a ZK-specific private key from the Ethereum private key.
   * Uses keccak256(pkBytes || ':zk-identity:v1') so leaking the ZK key
   * does NOT expose the Ethereum private key.
   * Returns 64 lowercase hex characters (no 0x prefix) — paste directly into ZKRoleGate.
   */
  getZKPrivateKey(): string | null {
    if (!this.wallet) return null;
    const pkBytes = ethers.getBytes(this.wallet.privateKey); // 32 bytes
    const derived = ethers.keccak256(
      ethers.concat([pkBytes, ethers.toUtf8Bytes(':zk-identity:v1')])
    );
    return derived.slice(2); // strip 0x → 64 hex chars
  }

  /**
   * Export wallet (for backup)
   */
  async exportWallet(): Promise<{ privateKey: string; did: string; address: string }> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    return {
      privateKey: this.wallet.privateKey,
      did: this.getDID()!,
      address: this.wallet.address,
    };
  }

  /**
   * Import wallet from private key
   */
  async importWallet(privateKey: string): Promise<void> {
    const wallet = new ethers.Wallet(privateKey);
    await StorageService.savePrivateKey(privateKey);
    
    const did = this.formatDID(wallet.address);
    await StorageService.saveDID(did);
    
    this.wallet = wallet;
  }

  /**
   * Clear wallet data
   */
  async clearWallet(): Promise<void> {
    await StorageService.clearAll();
    this.wallet = null;
    this.employees = [];
    this.credentials = [];
  }
}

export const walletService = new WalletService();
