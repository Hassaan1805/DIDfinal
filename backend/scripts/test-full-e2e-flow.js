#!/usr/bin/env node

/**
 * Full End-to-End Test Flow
 * 
 * This test covers:
 * 1. User creation via admin API
 * 2. DID anchoring on-chain (if Sepolia configured)
 * 3. Enterprise onboarding (credential issuance)
 * 4. Portal authentication simulation
 * 5. Token verification and timeline checks
 * 
 * Usage: node scripts/test-full-e2e-flow.js
 * 
 * Environment variables:
 * - API_BASE_URL: Base URL for the API (default: http://localhost:3001)
 * - ADMIN_TOKEN: Admin token for admin API calls (default: integration-test-token)
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'integration-test-token';

// Test state
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Utility functions
function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function generateTestEmployee() {
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(20).toString('hex');
  return {
    id: `TEST${timestamp}`,
    name: `Test User ${timestamp}`,
    department: 'E2E Testing',
    email: `test${timestamp}@e2e.test`,
    address: `0x${randomHex}`,
    badge: 'employee',
    registerOnChain: true,
  };
}

async function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function adminRequest(method, path, body = null) {
  return makeRequest(method, `/api${path}`, body, {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  });
}

function recordTest(name, passed, message, duration = 0, skipped = false) {
  const result = { name, passed, skipped, message, duration };
  testResults.tests.push(result);
  if (skipped) {
    testResults.skipped++;
    log('⏭️', `SKIP: ${name} - ${message}`);
  } else if (passed) {
    testResults.passed++;
    log('✅', `PASS: ${name} (${duration}ms)`);
  } else {
    testResults.failed++;
    log('❌', `FAIL: ${name} - ${message}`);
  }
}

// Test Functions
async function testHealthCheck() {
  const start = Date.now();
  try {
    const res = await makeRequest('GET', '/api/health');
    const passed = res.status === 200 && res.data?.status === 'healthy';
    recordTest('Health Check', passed, passed ? '' : `Status: ${res.status}`, Date.now() - start);
    return passed;
  } catch (e) {
    recordTest('Health Check', false, e.message, Date.now() - start);
    return false;
  }
}

async function testBlockchainStatus() {
  const start = Date.now();
  try {
    const res = await makeRequest('GET', '/api/did/status/unified');
    const passed = res.status === 200 && res.data?.success;
    const status = res.data?.data?.overallStatus || 'unknown';
    recordTest('Blockchain Status', passed, passed ? `Status: ${status}` : `Error: ${res.data?.error}`, Date.now() - start);
    return { passed, status, data: res.data?.data };
  } catch (e) {
    recordTest('Blockchain Status', false, e.message, Date.now() - start);
    return { passed: false, status: 'error' };
  }
}

async function testAdminAuth() {
  const start = Date.now();
  try {
    const res = await adminRequest('GET', '/admin/badges');
    const passed = res.status === 200 && res.data?.success;
    recordTest('Admin Authentication', passed, passed ? '' : `Status: ${res.status}, Error: ${res.data?.error}`, Date.now() - start);
    return passed;
  } catch (e) {
    recordTest('Admin Authentication', false, e.message, Date.now() - start);
    return false;
  }
}

async function testListEmployees() {
  const start = Date.now();
  try {
    const res = await adminRequest('GET', '/admin/employees');
    const passed = res.status === 200 && res.data?.success && Array.isArray(res.data?.data);
    const count = res.data?.data?.length || 0;
    recordTest('List Employees', passed, passed ? `Found ${count} employees` : `Error: ${res.data?.error}`, Date.now() - start);
    return { passed, count, employees: res.data?.data || [] };
  } catch (e) {
    recordTest('List Employees', false, e.message, Date.now() - start);
    return { passed: false, count: 0, employees: [] };
  }
}

async function testCreateEmployee(blockchainReady) {
  const start = Date.now();
  const employee = generateTestEmployee();
  
  // If blockchain not ready, skip on-chain registration
  if (!blockchainReady) {
    employee.registerOnChain = false;
  }
  
  try {
    const res = await adminRequest('POST', '/admin/employees', employee);
    const passed = res.status === 201 && res.data?.success;
    const createdEmployee = res.data?.data?.employee;
    
    if (passed) {
      recordTest('Create Employee', true, `Created: ${createdEmployee?.id}`, Date.now() - start);
      return { passed: true, employee: createdEmployee };
    } else {
      recordTest('Create Employee', false, `Error: ${res.data?.error}`, Date.now() - start);
      return { passed: false };
    }
  } catch (e) {
    recordTest('Create Employee', false, e.message, Date.now() - start);
    return { passed: false };
  }
}

async function testUpdateEmployee(employeeId) {
  const start = Date.now();
  try {
    const res = await adminRequest('PATCH', `/admin/employees/${employeeId}`, {
      department: 'E2E Testing - Updated',
    });
    const passed = res.status === 200 && res.data?.success;
    recordTest('Update Employee', passed, passed ? `Updated: ${employeeId}` : `Error: ${res.data?.error}`, Date.now() - start);
    return passed;
  } catch (e) {
    recordTest('Update Employee', false, e.message, Date.now() - start);
    return false;
  }
}

async function testRegisterOnChain(employeeId, blockchainReady) {
  if (!blockchainReady) {
    recordTest('Register On-Chain', false, 'Blockchain not ready', 0, true);
    return { passed: false, skipped: true };
  }
  
  const start = Date.now();
  try {
    const res = await adminRequest('POST', `/admin/employees/${employeeId}/register-onchain`);
    const passed = res.status === 200 && res.data?.success;
    const txHash = res.data?.data?.onChainRegistration?.txHash;
    
    if (passed) {
      recordTest('Register On-Chain', true, `TxHash: ${txHash?.substring(0, 20)}...`, Date.now() - start);
      return { passed: true, txHash };
    } else {
      recordTest('Register On-Chain', false, `Error: ${res.data?.error}`, Date.now() - start);
      return { passed: false };
    }
  } catch (e) {
    recordTest('Register On-Chain', false, e.message, Date.now() - start);
    return { passed: false };
  }
}

async function testIssueCredential(employeeId) {
  const start = Date.now();
  try {
    const res = await adminRequest('POST', '/admin/issue-credential', {
      targetEmployeeId: employeeId,
      badge: 'employee',
    });
    const passed = res.status === 200 && res.data?.success;
    const credentialId = res.data?.data?.credential?.id;
    
    if (passed) {
      recordTest('Issue Credential', true, `Credential: ${credentialId}`, Date.now() - start);
      return { passed: true, credentialId };
    } else {
      recordTest('Issue Credential', false, `Error: ${res.data?.error}`, Date.now() - start);
      return { passed: false };
    }
  } catch (e) {
    recordTest('Issue Credential', false, e.message, Date.now() - start);
    return { passed: false };
  }
}

async function testGetChallenge() {
  const start = Date.now();
  try {
    const res = await makeRequest('GET', '/api/auth/challenge');
    const passed = res.status === 200 && res.data?.success && res.data?.data?.challengeId;
    const challengeId = res.data?.data?.challengeId;
    
    if (passed) {
      recordTest('Get Auth Challenge', true, `Challenge: ${challengeId?.substring(0, 20)}...`, Date.now() - start);
      return { passed: true, challengeId, challenge: res.data?.data?.challenge };
    } else {
      recordTest('Get Auth Challenge', false, `Error: ${res.data?.error}`, Date.now() - start);
      return { passed: false };
    }
  } catch (e) {
    recordTest('Get Auth Challenge', false, e.message, Date.now() - start);
    return { passed: false };
  }
}

async function testDeactivateEmployee(employeeId) {
  const start = Date.now();
  try {
    const res = await adminRequest('POST', `/admin/employees/${employeeId}/deactivate`);
    const passed = res.status === 200 && res.data?.success;
    recordTest('Deactivate Employee', passed, passed ? `Deactivated: ${employeeId}` : `Error: ${res.data?.error}`, Date.now() - start);
    return passed;
  } catch (e) {
    recordTest('Deactivate Employee', false, e.message, Date.now() - start);
    return false;
  }
}

async function testReactivateEmployee(employeeId) {
  const start = Date.now();
  try {
    const res = await adminRequest('POST', `/admin/employees/${employeeId}/reactivate`);
    const passed = res.status === 200 && res.data?.success;
    recordTest('Reactivate Employee', passed, passed ? `Reactivated: ${employeeId}` : `Error: ${res.data?.error}`, Date.now() - start);
    return passed;
  } catch (e) {
    recordTest('Reactivate Employee', false, e.message, Date.now() - start);
    return false;
  }
}

async function testAuthTimeline() {
  const start = Date.now();
  try {
    const res = await makeRequest('GET', '/api/auth/timeline?limit=5');
    const passed = res.status === 200 && res.data?.success;
    const count = res.data?.data?.events?.length || 0;
    recordTest('Auth Timeline', passed, passed ? `Retrieved ${count} events` : `Error: ${res.data?.error}`, Date.now() - start);
    return passed;
  } catch (e) {
    recordTest('Auth Timeline', false, e.message, Date.now() - start);
    return false;
  }
}

async function testEmployeeDetails(employeeId) {
  const start = Date.now();
  try {
    const res = await adminRequest('GET', `/admin/employee/${employeeId}`);
    const passed = res.status === 200 && res.data?.success;
    const employee = res.data?.data;
    
    if (passed) {
      const hasOnChain = !!employee?.didRegistrationTxHash;
      recordTest('Employee Details', true, `On-chain: ${hasOnChain ? 'Yes' : 'No'}`, Date.now() - start);
      return { passed: true, employee };
    } else {
      recordTest('Employee Details', false, `Error: ${res.data?.error}`, Date.now() - start);
      return { passed: false };
    }
  } catch (e) {
    recordTest('Employee Details', false, e.message, Date.now() - start);
    return { passed: false };
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 FULL END-TO-END TEST SUITE');
  console.log('='.repeat(60));
  console.log(`\n📍 API: ${API_BASE_URL}`);
  console.log(`🔑 Admin Token: ${ADMIN_TOKEN.substring(0, 10)}...\n`);

  // Phase 1: Basic connectivity
  log('📋', 'Phase 1: Basic Connectivity');
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    log('💥', 'Backend is not running. Please start the backend first.');
    printSummary();
    process.exit(1);
  }

  // Phase 2: Blockchain status
  log('📋', '\nPhase 2: Blockchain Status');
  const { status: blockchainStatus, data: blockchainData } = await testBlockchainStatus();
  const blockchainReady = blockchainStatus === 'operational';
  if (!blockchainReady) {
    log('⚠️', 'Blockchain not fully operational. Some tests will be skipped.');
    if (blockchainData?.sepolia?.actionableMessages?.length > 0) {
      log('📝', 'Actionable messages:');
      blockchainData.sepolia.actionableMessages.forEach((msg) => log('  •', msg));
    }
  }

  // Phase 3: Admin authentication
  log('📋', '\nPhase 3: Admin Authentication');
  const adminOk = await testAdminAuth();
  if (!adminOk) {
    log('💥', 'Admin authentication failed. Check ADMIN_TOKEN.');
    printSummary();
    process.exit(1);
  }

  // Phase 4: List existing employees
  log('📋', '\nPhase 4: Existing Employees');
  await testListEmployees();

  // Phase 5: User lifecycle
  log('📋', '\nPhase 5: User Lifecycle');
  const { passed: createOk, employee: createdEmployee } = await testCreateEmployee(blockchainReady);
  
  let testEmployeeId = null;
  if (createOk && createdEmployee) {
    testEmployeeId = createdEmployee.id;
    
    // Update
    await testUpdateEmployee(testEmployeeId);
    
    // On-chain registration (if not already done and blockchain ready)
    if (!createdEmployee.didRegistrationTxHash) {
      await testRegisterOnChain(testEmployeeId, blockchainReady);
    }
    
    // Get employee details
    await testEmployeeDetails(testEmployeeId);
    
    // Deactivate/Reactivate cycle
    await testDeactivateEmployee(testEmployeeId);
    await testReactivateEmployee(testEmployeeId);
  }

  // Phase 6: Enterprise onboarding
  log('📋', '\nPhase 6: Enterprise Onboarding');
  if (testEmployeeId) {
    await testIssueCredential(testEmployeeId);
  } else {
    recordTest('Issue Credential', false, 'No test employee created', 0, true);
  }

  // Phase 7: Authentication flow
  log('📋', '\nPhase 7: Authentication Flow');
  await testGetChallenge();
  await testAuthTimeline();

  // Print summary
  printSummary();

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const total = testResults.passed + testResults.failed + testResults.skipped;
  console.log(`\nTotal:   ${total}`);
  console.log(`Passed:  ${testResults.passed} ✅`);
  console.log(`Failed:  ${testResults.failed} ❌`);
  console.log(`Skipped: ${testResults.skipped} ⏭️`);
  
  const passRate = total > 0 ? ((testResults.passed / (total - testResults.skipped)) * 100).toFixed(1) : 0;
  console.log(`\nPass Rate: ${passRate}%`);

  if (testResults.failed > 0) {
    console.log('\n🔴 Failed Tests:');
    testResults.tests
      .filter((t) => !t.passed && !t.skipped)
      .forEach((t) => console.log(`   - ${t.name}: ${t.message}`));
  }

  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    log('🎉', 'All tests passed! Platform is ready.');
  } else {
    log('⚠️', `${testResults.failed} test(s) failed. Review the results above.`);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
