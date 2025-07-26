// Network configurations
export const NETWORKS = {
  MAINNET: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io'
  },
  SEPOLIA: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  GANACHE: {
    name: 'Ganache Local',
    chainId: 1337,
    rpcUrl: 'http://127.0.0.1:7545',
    blockExplorer: null
  }
} as const;

// DID method constants
export const DID_METHODS = {
  ETHR: 'ethr',
  ION: 'ion',
  KEY: 'key',
  WEB: 'web'
} as const;

// Credential types
export const CREDENTIAL_TYPES = {
  VERIFIABLE_CREDENTIAL: 'VerifiableCredential',
  EMPLOYMENT_CREDENTIAL: 'EmploymentCredential',
  ROLE_CREDENTIAL: 'RoleCredential',
  ACCESS_CREDENTIAL: 'AccessCredential'
} as const;

// API endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  AUTH: {
    LOGIN: '/api/auth/login',
    VERIFY: '/api/auth/verify',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout'
  },
  DID: {
    CREATE: '/api/did/create',
    GET: '/api/did/:address',
    UPDATE: '/api/did/:address',
    REVOKE: '/api/did/:address'
  },
  CREDENTIALS: {
    ISSUE: '/api/credentials/issue',
    VERIFY: '/api/credentials/verify',
    REVOKE: '/api/credentials/revoke'
  }
} as const;

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // DID errors
  DID_NOT_FOUND: 'DID_NOT_FOUND',
  DID_ALREADY_EXISTS: 'DID_ALREADY_EXISTS',
  INVALID_DID_FORMAT: 'INVALID_DID_FORMAT',
  
  // Blockchain errors
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

// JWT constants
export const JWT_CONFIG = {
  ALGORITHM: 'HS256',
  DEFAULT_EXPIRES_IN: '24h',
  REFRESH_EXPIRES_IN: '7d',
  ISSUER: 'decentralized-trust-platform',
  AUDIENCE: 'platform-users'
} as const;

// QR Code constants
export const QR_CODE_CONFIG = {
  DEFAULT_SIZE: 256,
  ERROR_CORRECTION_LEVEL: 'M' as const,
  DEFAULT_EXPIRES_IN: 300, // 5 minutes
  MAX_EXPIRES_IN: 3600 // 1 hour
} as const;

// Validation constants
export const VALIDATION_RULES = {
  DID_MIN_LENGTH: 20,
  DID_MAX_LENGTH: 100,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif']
} as const;

// Role and permission constants
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  GUEST: 'guest'
} as const;

export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin'
} as const;

// Platform metadata
export const PLATFORM_INFO = {
  NAME: 'Decentralized Trust Platform',
  VERSION: '1.0.0',
  DESCRIPTION: 'Next-generation DID-based authentication for enterprises',
  AUTHOR: 'DecentralizedTrustPlatform Team',
  LICENSE: 'MIT',
  LOCATION: 'Mumbai, India',
  YEAR: '2025'
} as const;

// Development constants
export const DEV_CONFIG = {
  DEFAULT_PORT: 3001,
  DEFAULT_HOST: 'localhost',
  LOG_LEVEL: 'debug',
  CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:5173'],
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_REQUEST_SIZE: '10mb'
} as const;
