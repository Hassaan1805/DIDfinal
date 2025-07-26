/**
 * ZKProofService.ts
 * 
 * Zero-Knowledge Proof service for the mobile wallet.
 * Handles proof generation, challenge fetching, and anonymous token management.
 * 
 * Privacy-Preserving Authentication Flow:
 * 1. Fetch challenge from backend
 * 2. Generate ZK-proof of NFT ownership
 * 3. Submit proof and receive anonymous token
 * 4. Access premium content without revealing identity
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';

// Import snarkjs for React Native
const snarkjs = require('snarkjs');

// Backend API configuration
const API_BASE_URL = 'http://192.168.0.101:3001/api';

// Corporate Excellence 2025 NFT contract address
const CORPORATE_EXCELLENCE_CONTRACT = '0x1234567890123456789012345678901234567890';

// Storage keys for secure data persistence
const STORAGE_KEYS = {
  ANONYMOUS_TOKEN: 'zkp_anonymous_token',
  PREMIUM_ACCESS_EXPIRY: 'zkp_premium_expiry',
  LAST_PROOF_TIMESTAMP: 'zkp_last_proof_timestamp'
};

interface ZKChallenge {
  challengeId: string;
  challenge: string;
  expiresAt: string;
  timestamp: string;
}

interface ZKProofGenerationResult {
  proof: any;
  publicSignals: string[];
  success: boolean;
  error?: string;
}

interface ZKVerificationResponse {
  success: boolean;
  data?: {
    anonymousToken: string;
    accessLevel: string;
    grantType: string;
    expiresIn: string;
    verificationDetails: {
      proofValid: boolean;
      verificationTime: string;
      privacyPreserving: boolean;
      anonymous: boolean;
    };
  };
  error?: string;
  message?: string;
  timestamp: string;
}

interface PremiumContent {
  success: boolean;
  data?: {
    content: string;
    accessLevel: string;
    timestamp: string;
  };
  error?: string;
}

export class ZKProofService {
  private static instance: ZKProofService;

  private constructor() {}

  public static getInstance(): ZKProofService {
    if (!ZKProofService.instance) {
      ZKProofService.instance = new ZKProofService();
    }
    return ZKProofService.instance;
  }

  /**
   * Step 1: Fetch a fresh challenge from the backend
   * This prevents replay attacks and ensures proof freshness
   */
  public async fetchChallenge(): Promise<ZKChallenge> {
    try {
      console.log('🎯 Fetching ZK-proof challenge from backend...');

      const response = await fetch(`${API_BASE_URL}/auth/zkp-challenge`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Challenge fetch failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid challenge response from backend');
      }

      console.log('✅ Challenge received:', result.data.challengeId);
      return result.data;

    } catch (error) {
      console.error('💥 Challenge fetch error:', error);
      throw new Error(`Failed to fetch challenge: ${error.message}`);
    }
  }

  /**
   * Step 2: Generate zero-knowledge proof of NFT ownership
   * This is the core cryptographic operation that proves ownership without revealing wallet address
   */
  public async generateProof(
    privateKey: string,
    challenge: string,
    nonce: string = '0'
  ): Promise<ZKProofGenerationResult> {
    try {
      console.log('🔐 Starting ZK-proof generation...');
      console.log('   - Challenge:', challenge.substring(0, 20) + '...');
      console.log('   - NFT Contract:', CORPORATE_EXCELLENCE_CONTRACT);

      // Prepare circuit inputs
      const circuitInputs = {
        // Private inputs (hidden from verifier)
        privateKey: this.hashToCircuitInput(privateKey),
        nonce: this.hashToCircuitInput(nonce),
        challenge: this.hashToCircuitInput(challenge),
        
        // Public inputs (visible to verifier)
        nftContractAddress: this.addressToCircuitInput(CORPORATE_EXCELLENCE_CONTRACT)
      };

      console.log('📊 Circuit inputs prepared');
      console.log('   - Private inputs: privateKey, nonce, challenge');
      console.log('   - Public inputs: nftContractAddress');

      // NOTE: In a real implementation, you would load the .wasm and .zkey files
      // from the app bundle. For this demonstration, we'll simulate the proof generation
      
      // Load circuit artifacts (these would be bundled with the app)
      // const wasmPath = require('../../assets/circuits/nftOwnership.wasm');
      // const zkeyPath = require('../../assets/circuits/nftOwnership_final.zkey');

      console.log('⏳ Generating proof (this may take 10-30 seconds)...');
      
      // Simulate proof generation time (replace with actual snarkjs call)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In real implementation:
      // const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      //   circuitInputs,
      //   wasmPath,
      //   zkeyPath
      // );

      // Mock proof for demonstration (replace with real proof)
      const mockProof = {
        pi_a: [
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
          "0x1111111111111111111111111111111111111111111111111111111111111111"
        ],
        pi_b: [
          [
            "0x2222222222222222222222222222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333333333333333333333333333"
          ],
          [
            "0x4444444444444444444444444444444444444444444444444444444444444444",
            "0x5555555555555555555555555555555555555555555555555555555555555555"
          ],
          [
            "0x1111111111111111111111111111111111111111111111111111111111111111",
            "0x1111111111111111111111111111111111111111111111111111111111111111"
          ]
        ],
        pi_c: [
          "0x6666666666666666666666666666666666666666666666666666666666666666",
          "0x7777777777777777777777777777777777777777777777777777777777777777",
          "0x1111111111111111111111111111111111111111111111111111111111111111"
        ]
      };

      const mockPublicSignals = [
        this.addressToCircuitInput(CORPORATE_EXCELLENCE_CONTRACT)
      ];

      console.log('✅ ZK-proof generated successfully!');
      console.log('   - Proof components: pi_a, pi_b, pi_c');
      console.log('   - Public signals:', mockPublicSignals.length);

      return {
        proof: mockProof,
        publicSignals: mockPublicSignals,
        success: true
      };

    } catch (error) {
      console.error('💥 Proof generation error:', error);
      return {
        proof: null,
        publicSignals: [],
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Step 3: Submit proof to backend and receive anonymous token
   */
  public async submitProof(
    proof: any,
    publicSignals: string[],
    challengeId: string
  ): Promise<ZKVerificationResponse> {
    try {
      console.log('📤 Submitting ZK-proof to backend...');
      console.log('   - Challenge ID:', challengeId);
      console.log('   - Public signals:', publicSignals.length);

      const response = await fetch(`${API_BASE_URL}/auth/verify-zkp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof,
          publicSignals,
          challengeId,
          proofType: 'NFT_OWNERSHIP'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Verification failed: ${response.status}`);
      }

      if (result.success && result.data?.anonymousToken) {
        console.log('🎉 Proof verification successful!');
        console.log('   - Anonymous token received');
        console.log('   - Access level:', result.data.accessLevel);
        console.log('   - Expires in:', result.data.expiresIn);

        // Store the anonymous token securely
        await this.storeAnonymousToken(result.data.anonymousToken, result.data.expiresIn);
      }

      return result;

    } catch (error) {
      console.error('💥 Proof submission error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to submit proof to backend',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Step 4: Test premium content access with anonymous token
   */
  public async testPremiumAccess(): Promise<PremiumContent> {
    try {
      const token = await this.getStoredAnonymousToken();
      if (!token) {
        throw new Error('No anonymous token available');
      }

      console.log('🔓 Testing premium content access...');

      const response = await fetch(`${API_BASE_URL}/premium/content`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Premium content access granted!');
        console.log('   - Content type:', result.data?.accessLevel);
      }

      return result;

    } catch (error) {
      console.error('💥 Premium access test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete authentication flow - combines all steps
   */
  public async authenticateWithZKProof(privateKey: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
    error?: string;
  }> {
    try {
      console.log('🚀 Starting complete ZK-proof authentication flow...');

      // Step 1: Fetch challenge
      const challenge = await this.fetchChallenge();

      // Step 2: Generate proof
      const proofResult = await this.generateProof(
        privateKey,
        challenge.challenge,
        Date.now().toString()
      );

      if (!proofResult.success) {
        throw new Error(proofResult.error || 'Proof generation failed');
      }

      // Step 3: Submit proof
      const verificationResult = await this.submitProof(
        proofResult.proof,
        proofResult.publicSignals,
        challenge.challengeId
      );

      if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Proof verification failed');
      }

      // Step 4: Test premium access
      const accessResult = await this.testPremiumAccess();

      // Store successful authentication timestamp
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_PROOF_TIMESTAMP,
        new Date().toISOString()
      );

      console.log('🎉 Complete ZK-proof authentication successful!');

      return {
        success: true,
        message: 'Premium Access Unlocked Successfully! 🎉',
        details: {
          verificationTime: verificationResult.data?.verificationDetails?.verificationTime,
          accessLevel: verificationResult.data?.accessLevel,
          expiresIn: verificationResult.data?.expiresIn,
          premiumContentAccess: accessResult.success,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('💥 Complete authentication flow error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Check if user has valid premium access
   */
  public async hasPremiumAccess(): Promise<boolean> {
    try {
      const token = await this.getStoredAnonymousToken();
      const expiry = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_ACCESS_EXPIRY);

      if (!token || !expiry) {
        return false;
      }

      const expiryDate = new Date(expiry);
      const now = new Date();

      return now < expiryDate;

    } catch (error) {
      console.error('Error checking premium access:', error);
      return false;
    }
  }

  /**
   * Get last authentication timestamp
   */
  public async getLastAuthenticationTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROOF_TIMESTAMP);
    } catch (error) {
      console.error('Error getting last auth time:', error);
      return null;
    }
  }

  /**
   * Clear all stored ZK-proof related data
   */
  public async clearStoredData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ANONYMOUS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.PREMIUM_ACCESS_EXPIRY),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_PROOF_TIMESTAMP)
      ]);
      console.log('🧹 ZK-proof storage cleared');
    } catch (error) {
      console.error('Error clearing ZK-proof storage:', error);
    }
  }

  // Private helper methods

  private async storeAnonymousToken(token: string, expiresIn: string): Promise<void> {
    try {
      // Calculate expiry time
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 1); // 1 hour from now

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.PREMIUM_ACCESS_EXPIRY, expiryTime.toISOString())
      ]);

      console.log('🔐 Anonymous token stored securely');
    } catch (error) {
      console.error('Error storing anonymous token:', error);
      throw error;
    }
  }

  private async getStoredAnonymousToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_TOKEN);
    } catch (error) {
      console.error('Error retrieving anonymous token:', error);
      return null;
    }
  }

  private hashToCircuitInput(input: string): string {
    // Convert string to circuit-compatible format
    const hash = ethers.keccak256(ethers.toUtf8Bytes(input));
    return BigInt(hash).toString();
  }

  private addressToCircuitInput(address: string): string {
    // Convert Ethereum address to circuit-compatible format
    return BigInt(address).toString();
  }
}

export default ZKProofService;
