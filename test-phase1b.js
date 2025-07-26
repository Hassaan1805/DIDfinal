#!/usr/bin/env node

/**
 * End-to-End Test Suite for Phase 1b: QR Code Authentication
 * 
 * This script tests the complete authentication flow:
 * 1. Challenge generation
 * 2. Challenge status polling
 * 3. Message signing with wallet
 * 4. Authentication verification
 * 5. JWT token validation
 * 
 * Prerequisites:
 * - Backend server running on localhost:3001
 * - At least one DID created from Phase 1a testing
 */

const { ethers } = require('ethers');

const API_BASE_URL = 'http://localhost:3001/api';

class Phase1bTestSuite {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  async logTest(testName, success, details = '') {
    this.totalTests++;
    if (success) {
      this.passedTests++;
      console.log(`✅ ${testName}`);
      if (details) console.log(`   ${details}`);
    } else {
      console.log(`❌ ${testName} - ${details}`);
    }
    this.testResults.push({ testName, success, details });
  }

  async testChallengeGeneration() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/challenge`);
      const data = await response.json();
      
      const success = response.ok && 
                     data.success && 
                     data.data.challengeId &&
                     data.data.challenge &&
                     data.data.challenge.length === 64 && // 32 bytes = 64 hex chars
                     data.data.expiresIn === 300;
      
      await this.logTest(
        'Challenge Generation',
        success,
        success ? `Challenge ID: ${data.data.challengeId.substring(0, 8)}...` : `Error: ${data.error || 'Unknown error'}`
      );
      
      return success ? data.data : null;
    } catch (error) {
      await this.logTest('Challenge Generation', false, error.message);
      return null;
    }
  }

  async testChallengeStatus(challengeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status/${challengeId}`);
      const data = await response.json();
      
      const success = response.ok && 
                     data.success && 
                     data.data.challengeId === challengeId &&
                     data.data.status === 'pending';
      
      await this.logTest(
        'Challenge Status Check',
        success,
        success ? `Status: ${data.data.status}` : `Error: ${data.error || 'Unknown error'}`
      );
      
      return success;
    } catch (error) {
      await this.logTest('Challenge Status Check', false, error.message);
      return false;
    }
  }

  async testAuthenticationFlow() {
    try {
      // Step 1: Generate challenge
      const challengeData = await this.testChallengeGeneration();
      if (!challengeData) return false;

      // Step 2: Check challenge status
      const statusCheck = await this.testChallengeStatus(challengeData.challengeId);
      if (!statusCheck) return false;

      // Step 3: Create a test wallet and sign the challenge
      const testWallet = ethers.Wallet.createRandom();
      console.log(`🔐 Test wallet address: ${testWallet.address}`);
      
      // For testing, we need to first register a DID for this wallet
      // (In real usage, this would be done from Phase 1a)
      const didCreationResponse = await fetch(`${API_BASE_URL}/did/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: testWallet.address,
          publicKey: testWallet.signingKey.compressedPublicKey
        })
      });

      const didCreationData = await didCreationResponse.json();
      if (!didCreationResponse.ok || !didCreationData.success) {
        await this.logTest('DID Registration for Test', false, didCreationData.error);
        return false;
      }

      await this.logTest('DID Registration for Test', true, `DID: ${didCreationData.data.did}`);

      // Step 4: Sign the challenge
      const signature = await testWallet.signMessage(challengeData.challenge);
      console.log(`✍️ Signature: ${signature.substring(0, 20)}...`);

      // Step 5: Authenticate with the signed challenge
      const authResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challengeData.challengeId,
          did: didCreationData.data.did,
          signature: signature,
          userAddress: testWallet.address
        })
      });

      const authData = await authResponse.json();
      
      const authSuccess = authResponse.ok && 
                         authData.success && 
                         authData.data.token &&
                         authData.data.did === didCreationData.data.did;

      await this.logTest(
        'Authentication Flow',
        authSuccess,
        authSuccess ? `JWT Token received (${authData.data.token.substring(0, 20)}...)` : `Error: ${authData.error || 'Unknown error'}`
      );

      // Step 6: Verify the JWT token
      if (authSuccess) {
        const tokenVerifyResponse = await fetch(`${API_BASE_URL}/auth/verify-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: authData.data.token
          })
        });

        const tokenVerifyData = await tokenVerifyResponse.json();
        
        const tokenSuccess = tokenVerifyResponse.ok && 
                           tokenVerifyData.success && 
                           tokenVerifyData.data.did === didCreationData.data.did;

        await this.logTest(
          'JWT Token Verification',
          tokenSuccess,
          tokenSuccess ? `Token valid for DID: ${tokenVerifyData.data.did}` : `Error: ${tokenVerifyData.error || 'Unknown error'}`
        );

        return authSuccess && tokenSuccess;
      }

      return authSuccess;

    } catch (error) {
      await this.logTest('Authentication Flow', false, error.message);
      return false;
    }
  }

  async testInvalidInputs() {
    const testCases = [
      {
        name: 'Invalid Challenge ID',
        body: {
          challengeId: 'invalid-uuid',
          did: 'did:ethr:0x1234567890123456789012345678901234567890',
          signature: '0x1234....',
          userAddress: '0x1234567890123456789012345678901234567890'
        },
        expectedError: 'Invalid or expired challenge ID'
      },
      {
        name: 'Missing DID',
        body: {
          challengeId: crypto.randomUUID(),
          signature: '0x1234....',
          userAddress: '0x1234567890123456789012345678901234567890'
        },
        expectedError: 'Missing required fields'
      },
      {
        name: 'Invalid DID Format',
        body: {
          challengeId: crypto.randomUUID(),
          did: 'invalid-did-format',
          signature: '0x1234....',
          userAddress: '0x1234567890123456789012345678901234567890'
        },
        expectedError: 'Invalid DID format'
      }
    ];

    for (const testCase of testCases) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testCase.body)
        });

        const data = await response.json();
        const success = !response.ok && !data.success && data.error.includes(testCase.expectedError);

        await this.logTest(
          `Validation: ${testCase.name}`,
          success,
          success ? '' : `Expected "${testCase.expectedError}", got "${data.error}"`
        );
      } catch (error) {
        await this.logTest(`Validation: ${testCase.name}`, false, error.message);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Phase 1b QR Code Authentication Test Suite\n');
    console.log('Testing Authentication API at:', API_BASE_URL);
    console.log('=' .repeat(70));

    // Test 1: Invalid input validation
    await this.testInvalidInputs();

    // Test 2: Complete authentication flow
    await this.testAuthenticationFlow();

    // Print summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 Test Results Summary');
    console.log('=' .repeat(70));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.totalTests - this.passedTests}`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

    if (this.passedTests === this.totalTests) {
      console.log('\n🎉 All tests passed! Phase 1b authentication backend is working correctly.');
      console.log('\n✅ Phase 1b Backend Complete:');
      console.log('  • Challenge generation endpoint ✅');
      console.log('  • Authentication verification ✅');
      console.log('  • JWT token management ✅');
      console.log('  • Challenge status polling ✅');
      console.log('  • Cryptographic signature verification ✅');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the implementation.');
    }

    return {
      totalTests: this.totalTests,
      passedTests: this.passedTests,
      successRate: (this.passedTests / this.totalTests) * 100,
      allPassed: this.passedTests === this.totalTests
    };
  }
}

// Run the test suite
async function main() {
  const testSuite = new Phase1bTestSuite();
  const results = await testSuite.runAllTests();
  
  // Exit with appropriate code
  process.exit(results.allPassed ? 0 : 1);
}

// Add fetch polyfill for Node.js
if (!globalThis.fetch) {
  try {
    globalThis.fetch = require('node-fetch');
  } catch (e) {
    console.error('Please install node-fetch: npm install node-fetch');
    process.exit(1);
  }
}

// Add crypto polyfill
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto || require('crypto');
}

main().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
