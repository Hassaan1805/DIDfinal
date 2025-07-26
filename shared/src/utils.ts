import { v4 as uuidv4 } from 'uuid';
import { QRCodeData, AuthRequest } from './types';

// Utility functions for DID operations
export class DIDUtils {
  /**
   * Generate a unique nonce for authentication challenges
   */
  static generateNonce(): string {
    return uuidv4();
  }

  /**
   * Generate a challenge for authentication
   */
  static generateChallenge(): string {
    return uuidv4();
  }

  /**
   * Create an authentication request object
   */
  static createAuthRequest(domain: string): AuthRequest {
    return {
      challenge: this.generateChallenge(),
      domain,
      nonce: this.generateNonce(),
      timestamp: Date.now()
    };
  }

  /**
   * Create QR code data for authentication
   */
  static createQRCodeData(
    type: QRCodeData['type'],
    callbackUrl: string,
    expiresIn: number = 300 // 5 minutes default
  ): QRCodeData {
    return {
      type,
      challenge: this.generateChallenge(),
      callbackUrl,
      nonce: this.generateNonce(),
      timestamp: Date.now(),
      expiresIn
    };
  }

  /**
   * Validate if a timestamp is within the acceptable range
   */
  static isTimestampValid(timestamp: number, maxAgeMs: number = 300000): boolean {
    const now = Date.now();
    const age = now - timestamp;
    return age >= 0 && age <= maxAgeMs;
  }

  /**
   * Format a DID string
   */
  static formatDID(method: string, identifier: string): string {
    return `did:${method}:${identifier}`;
  }

  /**
   * Parse a DID string into its components
   */
  static parseDID(did: string): { method: string; identifier: string } | null {
    const match = did.match(/^did:([^:]+):(.+)$/);
    if (!match) return null;
    
    return {
      method: match[1],
      identifier: match[2]
    };
  }
}

// Utility functions for blockchain operations
export class BlockchainUtils {
  /**
   * Validate an Ethereum address
   */
  static isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate a transaction hash
   */
  static isValidTransactionHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Convert Wei to Ether
   */
  static weiToEther(wei: string): string {
    // Simple conversion - in production, use ethers.js utils
    const weiValue = BigInt(wei);
    const etherValue = weiValue / BigInt(10 ** 18);
    return etherValue.toString();
  }

  /**
   * Convert Ether to Wei
   */
  static etherToWei(ether: string): string {
    // Simple conversion - in production, use ethers.js utils
    const etherValue = BigInt(ether);
    const weiValue = etherValue * BigInt(10 ** 18);
    return weiValue.toString();
  }
}

// Utility functions for validation
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate JWT format (basic check)
   */
  static isValidJWTFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Validate if a string is a valid JSON
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
}

// Utility functions for formatting
export class FormatUtils {
  /**
   * Format a date to ISO string
   */
  static formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Format a timestamp to human-readable string
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }

  /**
   * Truncate a string to a specific length
   */
  static truncateString(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  }

  /**
   * Format an Ethereum address for display
   */
  static formatAddress(address: string): string {
    if (!BlockchainUtils.isValidEthereumAddress(address)) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}

// Utility functions for security
export class SecurityUtils {
  /**
   * Generate a random string
   */
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a secure random hex string
   */
  static generateSecureHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash a string using a simple algorithm (for demo purposes)
   * In production, use proper cryptographic libraries
   */
  static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}
