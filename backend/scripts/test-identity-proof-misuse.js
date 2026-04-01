const { Wallet } = require('ethers');
const jwt = require('jsonwebtoken');

const BACKEND_BASE_URL_CANDIDATES = [
  'http://127.0.0.1:3001',
  'http://localhost:3001',
  'http://127.0.0.1:3002',
  'http://localhost:3002',
];
let API_URL = '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-key';

function normalizeBaseUrl(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.replace(/\/+$/, '');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 1500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveBackendBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(process.env.BACKEND_BASE_URL);
  const candidates = configuredBaseUrl
    ? [configuredBaseUrl]
    : BACKEND_BASE_URL_CANDIDATES;

  for (const candidateBaseUrl of candidates) {
    try {
      const healthResponse = await fetchWithTimeout(`${candidateBaseUrl}/api/health`, {
        method: 'GET',
      }, 1500);

      if (!healthResponse.ok) {
        continue;
      }

      const text = await healthResponse.text();
      const body = text ? JSON.parse(text) : {};
      const service = typeof body.service === 'string' ? body.service : '';
      if (body.status === 'OK' && service.toLowerCase().includes('backend')) {
        return candidateBaseUrl;
      }
    } catch (_error) {
      // Continue trying next candidate.
    }
  }

  const fallbackHint = configuredBaseUrl
    ? `BACKEND_BASE_URL=${configuredBaseUrl}`
    : 'BACKEND_BASE_URL=http://127.0.0.1:3001';
  throw new Error(
    `Unable to discover a running backend API. Start backend first or set ${fallbackHint}.`
  );
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function apiRequest(path, options = {}) {
  if (!API_URL) {
    throw new Error('API_URL is not configured. resolveBackendBaseUrl must run before apiRequest.');
  }

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

async function issueIdentityProofToken(input) {
  const challengeResponse = await apiRequest('/auth/challenge', {
    method: 'POST',
    body: {
      did: input.did,
      action: input.action,
      requestId: input.requestId,
    },
  });

  assertCondition(
    challengeResponse.status === 201,
    `Expected 201 from /auth/challenge; received ${challengeResponse.status} with body ${JSON.stringify(challengeResponse.body)}`
  );

  const challengePayload = challengeResponse.body.data;
  const signature = await input.wallet.signMessage(challengePayload.challenge);

  const verifyBody = {
    challengeId: challengePayload.challengeId,
    did: input.did,
    message: challengePayload.challenge,
    signature,
    address: input.wallet.address,
  };

  if (input.verifyRequestId !== undefined) {
    verifyBody.requestId = input.verifyRequestId;
  } else if (input.requestId) {
    verifyBody.requestId = input.requestId;
  }

  return apiRequest('/auth/verify', {
    method: 'POST',
    body: verifyBody,
  });
}

async function main() {
  const baseUrl = await resolveBackendBaseUrl();
  API_URL = `${baseUrl}/api/identity`;

  console.log('Starting identity proof misuse validation');
  console.log(`Using backend: ${API_URL}`);

  const wallet = Wallet.createRandom();
  const did = `did:ethr:${wallet.address}`.toLowerCase();

  const registerTokenResponse = await issueIdentityProofToken({
    did,
    action: 'register_profile',
    wallet,
  });

  assertCondition(
    registerTokenResponse.status === 200,
    `Expected 200 from register-profile proof verify; received ${registerTokenResponse.status} with body ${JSON.stringify(registerTokenResponse.body)}`
  );

  const registerToken = registerTokenResponse.body.data.token;
  const registerResponse = await apiRequest('/register', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${registerToken}`,
    },
    body: {
      did,
      walletAddress: wallet.address,
      publicProfile: {
        displayName: 'Proof Misuse Integration User',
        headline: 'Integration validation profile',
      },
    },
  });

  assertCondition(
    registerResponse.status === 201,
    `Expected 201 from /register; received ${registerResponse.status} with body ${JSON.stringify(registerResponse.body)}`
  );

  const requestAResponse = await apiRequest('/enrollment-requests', {
    method: 'POST',
    body: {
      did,
      requesterOrganizationId: 'misuse_org',
      requesterOrganizationName: 'Proof Misuse Org',
      verifierId: 'proof_misuse_verifier',
      purpose: 'Misuse validation request A',
      requestedClaims: ['employeeId', 'name'],
      requestedProfileFields: ['headline'],
    },
  });

  assertCondition(
    requestAResponse.status === 201,
    `Expected 201 from /enrollment-requests (A); received ${requestAResponse.status} with body ${JSON.stringify(requestAResponse.body)}`
  );

  const requestBResponse = await apiRequest('/enrollment-requests', {
    method: 'POST',
    body: {
      did,
      requesterOrganizationId: 'misuse_org',
      requesterOrganizationName: 'Proof Misuse Org',
      verifierId: 'proof_misuse_verifier',
      purpose: 'Misuse validation request B',
      requestedClaims: ['employeeId'],
      requestedProfileFields: ['location'],
    },
  });

  assertCondition(
    requestBResponse.status === 201,
    `Expected 201 from /enrollment-requests (B); received ${requestBResponse.status} with body ${JSON.stringify(requestBResponse.body)}`
  );

  const requestAId = requestAResponse.body.data.requestId;
  const requestBId = requestBResponse.body.data.requestId;

  // Case 1: Wrong action token reused on protected register endpoint
  const listActionTokenResponse = await issueIdentityProofToken({
    did,
    action: 'list_enrollments',
    wallet,
  });

  assertCondition(
    listActionTokenResponse.status === 200,
    `Expected 200 from list-enrollments proof verify; received ${listActionTokenResponse.status} with body ${JSON.stringify(listActionTokenResponse.body)}`
  );

  const wrongActionToken = listActionTokenResponse.body.data.token;
  const wrongActionResponse = await apiRequest('/register', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${wrongActionToken}`,
    },
    body: {
      did,
      walletAddress: wallet.address,
      publicProfile: {
        displayName: 'Wrong Action Attempt',
      },
    },
  });

  assertCondition(
    wrongActionResponse.status === 403,
    `Expected 403 for wrong action token misuse; received ${wrongActionResponse.status} with body ${JSON.stringify(wrongActionResponse.body)}`
  );

  // Case 2a: Wrong requestId submitted during /auth/verify
  const wrongRequestIdVerifyResponse = await issueIdentityProofToken({
    did,
    action: 'enrollment_decision',
    requestId: requestAId,
    verifyRequestId: requestBId,
    wallet,
  });

  assertCondition(
    wrongRequestIdVerifyResponse.status === 403,
    `Expected 403 for wrong requestId during /auth/verify; received ${wrongRequestIdVerifyResponse.status} with body ${JSON.stringify(wrongRequestIdVerifyResponse.body)}`
  );

  // Case 2b: Token bound to request A used for decision on request B
  const decisionTokenResponse = await issueIdentityProofToken({
    did,
    action: 'enrollment_decision',
    requestId: requestAId,
    wallet,
  });

  assertCondition(
    decisionTokenResponse.status === 200,
    `Expected 200 from decision proof verify; received ${decisionTokenResponse.status} with body ${JSON.stringify(decisionTokenResponse.body)}`
  );

  const requestABoundDecisionToken = decisionTokenResponse.body.data.token;
  const wrongDecisionTargetResponse = await apiRequest(`/enrollment-requests/${encodeURIComponent(requestBId)}/decision`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requestABoundDecisionToken}`,
    },
    body: {
      did,
      decision: 'rejected',
      reason: 'Expected mismatch for integration test',
    },
  });

  assertCondition(
    wrongDecisionTargetResponse.status === 403,
    `Expected 403 for requestId-bound token misuse; received ${wrongDecisionTargetResponse.status} with body ${JSON.stringify(wrongDecisionTargetResponse.body)}`
  );

  // Case 3: Expired token rejected by protected listing endpoint
  const expiredToken = jwt.sign(
    {
      proofType: 'identity-owner',
      did,
      address: wallet.address.toLowerCase(),
      action: 'list_enrollments',
      challengeId: 'expired-proof-test',
      timestamp: new Date().toISOString(),
    },
    JWT_SECRET,
    {
      expiresIn: -30,
      issuer: 'decentralized-trust-platform',
      audience: 'identity-api',
      subject: 'identity-owner-proof',
    }
  );

  const expiredTokenResponse = await apiRequest(`/${encodeURIComponent(did)}/enrollment-requests`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${expiredToken}`,
    },
  });

  assertCondition(
    expiredTokenResponse.status === 401,
    `Expected 401 for expired proof token; received ${expiredTokenResponse.status} with body ${JSON.stringify(expiredTokenResponse.body)}`
  );

  console.log('All identity proof misuse assertions passed');
}

main()
  .then(() => {
    console.log('Identity proof misuse validation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Identity proof misuse validation failed:', error.message);
    process.exit(1);
  });
