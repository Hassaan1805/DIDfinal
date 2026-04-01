const { ethers } = require('ethers');

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:3001';
const API_URL = `${BASE_URL}/api`;
const AUTH_HEADER = {
  Authorization: `Bearer ${process.env.ADMIN_TOKEN || 'integration-test-token'}`,
};
const DISCLOSURE_BINDING_VERSION = 'sd-bind-v1';
const DISCLOSURE_BINDING_PREFIX = 'Selective disclosure binding:';
const TEST_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY
  || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_WALLET = new ethers.Wallet(TEST_PRIVATE_KEY);

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

async function buildDisclosedClaimsProof({ challengeId, challenge, disclosedClaims, credential }) {
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
  const signedBinding = await TEST_WALLET.signMessage(`${DISCLOSURE_BINDING_PREFIX} ${bindingDigest}`);

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
  } catch (error) {
    payload = { rawBody: text };
  }

  return {
    status: response.status,
    ok: response.ok,
    body: payload,
  };
}

async function main() {
  console.log('Starting auth timeline integration validation');
  console.log(`Using backend: ${API_URL}`);
  const verifierId = `integration_timeline_${Date.now()}`;
  const organizationId = `integration_timeline_org_${Date.now()}`;
  let created = false;

  try {
    const createProfile = await apiRequest('/admin/verifier-profiles', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: {
        verifierId,
        organizationId,
        organizationName: 'Timeline Integration Org',
        active: true,
        policyVersion: 1,
        requireCredential: false,
        allowedBadges: ['employee', 'manager', 'admin'],
        allowedRequestTypes: ['portal_access', 'general_auth'],
        requiredClaimsByRequestType: {
          portal_access: ['subjectDid'],
          general_auth: ['subjectDid'],
        },
      },
    });

    assertCondition(createProfile.status === 201, 'Expected 201 from POST /admin/verifier-profiles');
    assertCondition(createProfile.body.success === true, 'Expected success=true when creating verifier profile');
    created = true;

    const challengeResponse = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(challengeResponse.status === 200, 'Expected 200 from POST /auth/challenge');
    assertCondition(challengeResponse.body.success === true, 'Expected success=true from challenge endpoint');

    const challenge = challengeResponse.body.data;
    const testDid = `did:ethr:${TEST_WALLET.address}`;
    const disclosedClaims = {
      subjectDid: testDid,
    };

    const disclosedClaimsProof = await buildDisclosedClaimsProof({
      challengeId: challenge.challengeId,
      challenge: challenge.challenge,
      disclosedClaims,
    });

    const signedMessage = `Please sign this message to authenticate with challenge: ${challenge.challenge}`;
    const signature = await TEST_WALLET.signMessage(signedMessage);

    const verifyResponse = await apiRequest('/auth/verify', {
      method: 'POST',
      body: {
        challengeId: challenge.challengeId,
        signature,
        address: TEST_WALLET.address,
        message: signedMessage,
        verifierId,
        disclosedClaims,
        disclosedClaimsProof,
      },
    });

    assertCondition(
      verifyResponse.status === 200,
      `Expected 200 from POST /auth/verify; received ${verifyResponse.status} with body ${JSON.stringify(verifyResponse.body)}`
    );
    assertCondition(verifyResponse.body.success === true, 'Expected success=true from verify endpoint');

    const token = verifyResponse.body.data?.token;
    assertCondition(typeof token === 'string' && token.length > 20, 'Expected JWT token in verify response');

    const timelineResponse = await apiRequest(
      `/auth/timeline?verifierId=${encodeURIComponent(verifierId)}&limit=20`
    );
    assertCondition(timelineResponse.status === 200, 'Expected 200 from GET /auth/timeline');
    assertCondition(timelineResponse.body.success === true, 'Expected success=true from timeline endpoint');

    const events = timelineResponse.body.data?.events || [];
    const eventTypes = new Set(events.map((event) => event.eventType));
    assertCondition(eventTypes.has('challenge_created'), 'Expected challenge_created event in timeline');
    assertCondition(eventTypes.has('verification_succeeded'), 'Expected verification_succeeded event in timeline');

    const timelineMeResponse = await apiRequest('/auth/timeline/me?limit=20', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assertCondition(timelineMeResponse.status === 200, 'Expected 200 from GET /auth/timeline/me');
    assertCondition(timelineMeResponse.body.success === true, 'Expected success=true from timeline/me endpoint');
    assertCondition(
      (timelineMeResponse.body.data?.events || []).length > 0,
      'Expected at least one event from timeline/me'
    );
  } finally {
    if (created) {
      await apiRequest(`/admin/verifier-profiles/${verifierId}/runtime-override`, {
        method: 'DELETE',
        headers: AUTH_HEADER,
      });
    }
  }

  console.log('All auth timeline integration assertions passed');
}

main()
  .then(() => {
    console.log('Auth timeline integration validation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Auth timeline integration validation failed:', error.message);
    process.exit(1);
  });
