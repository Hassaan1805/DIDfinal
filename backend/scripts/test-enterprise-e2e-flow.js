const { ethers } = require('ethers');

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:3001';
const API_URL = `${BASE_URL}/api`;
const EMPLOYEE_ID = process.env.TEST_EMPLOYEE_ID || 'EMP001';
const VERIFIER_ID = process.env.TEST_VERIFIER_ID || 'dtp_portal_primary';
const COMPANY_ID = process.env.TEST_COMPANY_ID || 'dtp_enterprise_001';
const REQUEST_TYPE = 'portal_access';
const DISCLOSURE_BINDING_VERSION = 'sd-bind-v1';
const DISCLOSURE_BINDING_PREFIX = 'Selective disclosure binding:';

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function deriveEmployeePrivateKey(employeeId) {
  // Mirrors backend/src/services/employeeWallets.ts deterministic key generation.
  return ethers.keccak256(ethers.toUtf8Bytes(`employee_${employeeId}_private_key_2025`));
}

function hashUtf8(value) {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

function canonicalizeClaims(claims) {
  return Object.entries(claims)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value.trim()}`)
    .join('|');
}

function computeBindingDigest({ challengeId, challengeDigest, claimDigest, credentialDigest, bindingVersion }) {
  const material = [
    challengeId,
    challengeDigest,
    claimDigest,
    credentialDigest || 'no-credential',
    bindingVersion,
  ].join('|');

  return hashUtf8(material);
}

async function buildDisclosedClaimsProof({ challengeId, challenge, disclosedClaims, wallet, credential }) {
  const challengeDigest = hashUtf8(challenge);
  const claimDigest = hashUtf8(canonicalizeClaims(disclosedClaims) || 'no-claims');
  const credentialDigest = credential ? hashUtf8(credential) : undefined;
  const bindingDigest = computeBindingDigest({
    challengeId,
    challengeDigest,
    claimDigest,
    credentialDigest,
    bindingVersion: DISCLOSURE_BINDING_VERSION,
  });
  const signedBinding = await wallet.signMessage(`${DISCLOSURE_BINDING_PREFIX} ${bindingDigest}`);

  return {
    bindingVersion: DISCLOSURE_BINDING_VERSION,
    challengeId,
    challengeDigest,
    claimDigest,
    credentialDigest,
    bindingDigest,
    signedBinding,
    createdAt: new Date().toISOString(),
  };
}

async function apiRequest(path, options = {}) {
  const requestOptions = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };

  if (options.body !== undefined) {
    requestOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, requestOptions);
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_error) {
    payload = { rawBody: text };
  }

  return {
    status: response.status,
    ok: response.ok,
    body: payload,
  };
}

function buildDisclosedClaims(requiredClaims, employee) {
  const claimResolvers = {
    subjectDid: () => employee.did,
    employeeId: () => employee.id,
    name: () => employee.name,
    role: () => employee.badge,
    department: () => employee.department,
    email: () => employee.email,
  };

  const disclosedClaims = {};
  for (const claimKey of requiredClaims || []) {
    const resolver = claimResolvers[claimKey];
    if (!resolver) {
      throw new Error(`Unsupported required claim key in contract: ${claimKey}`);
    }

    const resolved = resolver();
    if (!resolved || !String(resolved).trim()) {
      throw new Error(`Unable to resolve required claim value: ${claimKey}`);
    }

    disclosedClaims[claimKey] = String(resolved).trim();
  }

  return disclosedClaims;
}

async function main() {
  console.log('Starting enterprise E2E flow validation');
  console.log(`Using backend: ${API_URL}`);
  console.log(`Employee: ${EMPLOYEE_ID}, verifier: ${VERIFIER_ID}, company: ${COMPANY_ID}`);

  const challengeResponse = await apiRequest('/auth/challenge', {
    method: 'POST',
    body: {
      employeeId: EMPLOYEE_ID,
      companyId: COMPANY_ID,
      requestType: REQUEST_TYPE,
      verifierId: VERIFIER_ID,
    },
  });

  assertCondition(challengeResponse.status === 200, `Expected 200 from /auth/challenge, got ${challengeResponse.status}`);
  assertCondition(challengeResponse.body.success === true, 'Expected success=true from challenge endpoint');

  const challengeData = challengeResponse.body.data;
  const employee = challengeData.employee;
  assertCondition(employee && employee.id === EMPLOYEE_ID, 'Challenge response missing expected employee context');

  const requiredClaims = challengeData.requestedClaims?.requiredClaims || [];
  const disclosedClaims = buildDisclosedClaims(requiredClaims, employee);

  const employeePrivateKey = deriveEmployeePrivateKey(employee.id);
  const wallet = new ethers.Wallet(employeePrivateKey);
  assertCondition(
    wallet.address.toLowerCase() === employee.address.toLowerCase(),
    `Derived wallet address mismatch for ${employee.id}`
  );

  const authMessage = `Please sign this message to authenticate with challenge: ${challengeData.challenge}`;
  const authSignature = await wallet.signMessage(authMessage);

  const disclosedClaimsProof = await buildDisclosedClaimsProof({
    challengeId: challengeData.challengeId,
    challenge: challengeData.challenge,
    disclosedClaims,
    wallet,
  });

  const verifyResponse = await apiRequest('/auth/verify', {
    method: 'POST',
    body: {
      challengeId: challengeData.challengeId,
      signature: authSignature,
      address: employee.address,
      message: authMessage,
      employeeId: employee.id,
      did: employee.did,
      verifierId: VERIFIER_ID,
      disclosedClaims,
      disclosedClaimsProof,
    },
  });

  assertCondition(
    verifyResponse.status === 200,
    `Expected 200 from /auth/verify, got ${verifyResponse.status} body=${JSON.stringify(verifyResponse.body)}`
  );
  assertCondition(verifyResponse.body.success === true, 'Expected success=true from verify endpoint');
  assertCondition(verifyResponse.body.data?.token, 'Verify response did not include token');
  assertCondition(verifyResponse.body.data?.did === employee.did, 'Verify response DID mismatch');
  assertCondition(verifyResponse.body.data?.verifierId === VERIFIER_ID, 'Verify response verifier mismatch');
  assertCondition(verifyResponse.body.data?.disclosedClaimsVerified === true, 'Expected disclosedClaimsVerified=true');
  assertCondition(verifyResponse.body.data?.disclosedClaimsProofVerified === true, 'Expected disclosedClaimsProofVerified=true');

  const token = verifyResponse.body.data.token;

  const tokenValidationResponse = await apiRequest('/auth/verify-token', {
    method: 'POST',
    body: { token },
  });

  assertCondition(tokenValidationResponse.status === 200, 'Expected 200 from /auth/verify-token');
  assertCondition(tokenValidationResponse.body.success === true, 'Expected success=true from verify-token endpoint');

  const challengeStatusResponse = await apiRequest(`/auth/status/${challengeData.challengeId}`);
  assertCondition(challengeStatusResponse.status === 200, 'Expected 200 from /auth/status/:challengeId');
  assertCondition(challengeStatusResponse.body.data?.status === 'completed', 'Challenge status should be completed');

  const timelineMeResponse = await apiRequest('/auth/timeline/me?limit=20', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assertCondition(timelineMeResponse.status === 200, 'Expected 200 from /auth/timeline/me');
  assertCondition(timelineMeResponse.body.success === true, 'Expected success=true from timeline/me endpoint');
  assertCondition((timelineMeResponse.body.data?.events || []).length > 0, 'Expected timeline/me to return events');

  console.log('Enterprise E2E flow assertions passed');
  console.log(
    JSON.stringify(
      {
        employeeId: employee.id,
        did: employee.did,
        challengeId: challengeData.challengeId,
        verifierId: verifyResponse.body.data?.verifierId,
        authRecordTxHash: verifyResponse.body.data?.authRecordTxHash || null,
        authVerifyTxHash: verifyResponse.body.data?.authVerifyTxHash || null,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => {
    console.log('Enterprise E2E flow validation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Enterprise E2E flow validation failed:', error.message);
    process.exit(1);
  });
