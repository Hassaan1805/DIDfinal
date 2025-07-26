// Types for DID (Decentralized Identity)
export interface DIDDocument {
  '@context': string[];
  id: string;
  publicKey: PublicKey[];
  authentication: string[];
  service?: ServiceEndpoint[];
  created?: string;
  updated?: string;
}

export interface PublicKey {
  id: string;
  type: string;
  owner: string;
  publicKeyHex?: string;
  publicKeyBase58?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

// Types for Verifiable Credentials
export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  proof?: Proof;
}

export interface VerifiablePresentation {
  '@context': string[];
  id: string;
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof?: Proof;
}

export interface Proof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  jws?: string;
  proofValue?: string;
}

// Authentication and Authorization Types
export interface AuthRequest {
  challenge: string;
  domain: string;
  nonce: string;
  timestamp: number;
}

export interface AuthResponse {
  did: string;
  signature: string;
  proof: VerifiablePresentation;
}

export interface JWTPayload {
  iss: string; // Issuer (DID)
  sub: string; // Subject (DID)
  aud: string; // Audience
  exp: number; // Expiration time
  nbf: number; // Not before
  iat: number; // Issued at
  jti: string; // JWT ID
}

// Platform-specific Types
export interface User {
  id: string;
  did: string;
  publicKey: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface LoginSession {
  sessionId: string;
  userId: string;
  did: string;
  deviceId: string;
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
}

export interface QRCodeData {
  type: 'AUTH_REQUEST' | 'VC_PRESENTATION' | 'DID_EXCHANGE';
  challenge: string;
  callbackUrl: string;
  nonce: string;
  timestamp: number;
  expiresIn: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Blockchain-related Types
export interface ContractAddress {
  network: string;
  address: string;
  deployedAt: string;
}

export interface TransactionResult {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'success' | 'failed';
  timestamp: string;
}

// Error Types
export interface PlatformError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Configuration Types
export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  blockExplorer: string;
  didRegistry: string;
}

export interface PlatformConfig {
  environment: 'development' | 'staging' | 'production';
  networks: Record<string, NetworkConfig>;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  qrCode: {
    expiresIn: number;
    callbackUrl: string;
  };
}
