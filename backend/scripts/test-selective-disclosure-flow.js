const { ethers } = require('ethers');

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;
const AUTH_HEADER = {
  Authorization: `Bearer ${process.env.ADMIN_TOKEN || 'integration-test-token'}`,
};
const DISCLOSURE_BINDING_VERSION = 'sd-bind-v1';
const DISCLOSURE_BINDING_PREFIX = 'Selective disclosure binding:';
const TEST_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_WALLET = new ethers.Wallet(TEST_PRIVATE_KEY);

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertArrayIncludesAll(actual, expected, message) {
  const actualSet = new Set(actual);
  const missing = expected.filter((item) => !actualSet.has(item));
  if (missing.length > 0) {
    throw new Error(`${message}. Missing: ${missing.join(', ')}`);
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

async function signAuthChallengeMessage(challenge) {
  const message = `Please sign this message to authenticate with challenge: ${challenge}`;
  const signature = await TEST_WALLET.signMessage(message);

  return {
    message,
    signature,
  };
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT token format');
  }

  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
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

async function main() {
  const verifierId = `integration_selective_${Date.now()}`;
  const organizationId = `integration_selective_org_${Date.now()}`;
  const expectedPortalClaims = ['subjectDid'];
  const testAddress = TEST_WALLET.address;
  const testDid = `did:ethr:${testAddress}`;

  console.log('Starting selective-disclosure positive validation');
  console.log(`Using backend: ${API_URL}`);
  console.log(`Verifier ID: ${verifierId}`);

  let created = false;

  try {
    const createProfile = await apiRequest('/admin/verifier-profiles', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: {
        verifierId,
        organizationId,
        organizationName: 'Integration Selective Org',
        active: true,
        policyVersion: 7,
        requireCredential: false,
        allowedBadges: ['employee', 'admin'],
        allowedRequestTypes: ['portal_access', 'general_auth'],
        requiredClaimsByRequestType: {
          portal_access: expectedPortalClaims,
          general_auth: ['subjectDid'],
        },
      },
    });

    assertCondition(createProfile.status === 201, 'Expected 201 from POST /admin/verifier-profiles');
    assertCondition(createProfile.body.success === true, 'Expected success=true when creating verifier profile');
    assertArrayIncludesAll(
      createProfile.body.data.requiredClaimsByRequestType.portal_access || [],
      expectedPortalClaims,
      'Created profile should retain portal_access required claims'
    );
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
    assertCondition(challengeResponse.body.success === true, 'Expected success=true when generating challenge');

    const challengeData = challengeResponse.body.data;
    assertCondition(challengeData.requestedClaims?.requestType === 'portal_access', 'Expected requestType=portal_access in challenge requestedClaims');
    assertCondition(challengeData.requestedClaims?.proofRequired === true, 'Expected proofRequired=true in challenge requestedClaims');
    assertCondition(
      challengeData.requestedClaims?.bindingVersion === DISCLOSURE_BINDING_VERSION,
      `Expected bindingVersion=${DISCLOSURE_BINDING_VERSION} in challenge requestedClaims`
    );
    assertArrayIncludesAll(
      challengeData.requestedClaims?.requiredClaims || [],
      expectedPortalClaims,
      'Challenge response should include required portal claims'
    );

    const qrPayload = JSON.parse(challengeData.qrCodeData);
    assertCondition(qrPayload.requestedClaims?.requestType === 'portal_access', 'QR payload should expose portal_access requestedClaims');
    assertCondition(qrPayload.requestedClaims?.proofRequired === true, 'QR payload should require cryptographic proof for selective disclosure');
    assertCondition(
      qrPayload.requestedClaims?.bindingVersion === DISCLOSURE_BINDING_VERSION,
      'QR payload should include disclosed-claims binding version'
    );
    assertArrayIncludesAll(
      qrPayload.requestedClaims?.requiredClaims || [],
      expectedPortalClaims,
      'QR payload should include required portal claims'
    );

    const statusResponse = await apiRequest(`/auth/status/${challengeData.challengeId}`);
    assertCondition(statusResponse.status === 200, 'Expected 200 from GET /auth/status/:challengeId');
    assertCondition(statusResponse.body.data?.status === 'pending', 'Expected challenge status to be pending before verification');
    assertArrayIncludesAll(
      statusResponse.body.data?.requestedClaims?.requiredClaims || [],
      expectedPortalClaims,
      'Status payload should include required portal claims'
    );
    assertCondition(statusResponse.body.data?.requestedClaims?.proofRequired === true, 'Status payload should include proofRequired=true');

    const disclosedClaims = {
      subjectDid: testDid,
    };
    const disclosedClaimsProof = await buildDisclosedClaimsProof({
      challengeId: challengeData.challengeId,
      challenge: challengeData.challenge,
      disclosedClaims,
    });
    const authSignature = await signAuthChallengeMessage(challengeData.challenge);

    const verifyResponse = await apiRequest('/auth/verify', {
      method: 'POST',
      body: {
        challengeId: challengeData.challengeId,
        signature: authSignature.signature,
        address: testAddress,
        message: authSignature.message,
        verifierId,
        disclosedClaims,
        disclosedClaimsProof,
      },
    });

    assertCondition(
      verifyResponse.status === 200,
      `Expected 200 from POST /auth/verify; received ${verifyResponse.status} with body ${JSON.stringify(verifyResponse.body)}`
    );
    assertArrayIncludesAll(
      verifyResponse.body.data?.requestedClaims?.requiredClaims || [],
      expectedPortalClaims,
      'Verify response should include required portal claims'
    );
    assertCondition(
      verifyResponse.body.data?.disclosedClaimsVerified === true,
      'Verify response should report disclosedClaimsVerified=true'
    );
    assertCondition(
      verifyResponse.body.data?.disclosedClaimsProofVerified === true,
      'Verify response should report disclosedClaimsProofVerified=true'
    );
    assertCondition(
      typeof verifyResponse.body.data?.disclosedClaimsBindingDigest === 'string' && verifyResponse.body.data.disclosedClaimsBindingDigest.length > 0,
      'Verify response should include disclosedClaimsBindingDigest'
    );

    const token = verifyResponse.body.data?.token;
    assertCondition(typeof token === 'string' && token.length > 0, 'Verify response should include a JWT token');

    const tokenPayload = decodeJwtPayload(token);
    assertCondition(tokenPayload.challengeId === challengeData.challengeId, 'JWT challengeId should match challenge response challengeId');
    assertCondition(tokenPayload.verifierId === verifierId, 'JWT verifierId should match challenge verifierId');
    assertCondition(tokenPayload.disclosedClaimsVerified === true, 'JWT should include disclosedClaimsVerified=true');
    assertCondition(tokenPayload.disclosedClaimsProofVerified === true, 'JWT should include disclosedClaimsProofVerified=true');
    assertCondition(
      tokenPayload.disclosedClaimsBindingDigest === verifyResponse.body.data.disclosedClaimsBindingDigest,
      'JWT disclosedClaimsBindingDigest should match verify response'
    );

    const verifyTokenResponse = await apiRequest('/auth/verify-token', {
      method: 'POST',
      body: { token },
    });
    assertCondition(verifyTokenResponse.status === 200, 'Expected 200 from POST /auth/verify-token');
    assertCondition(
      verifyTokenResponse.body.data?.disclosedClaimsBindingDigest === verifyResponse.body.data.disclosedClaimsBindingDigest,
      'verify-token endpoint should return disclosedClaimsBindingDigest consistent with verify response'
    );

    const completedStatusResponse = await apiRequest(`/auth/status/${challengeData.challengeId}`);
    assertCondition(completedStatusResponse.status === 200, 'Expected 200 from GET /auth/status/:challengeId after verification');
    assertCondition(completedStatusResponse.body.data?.status === 'completed', 'Expected challenge status to be completed after verification');
    assertCondition(completedStatusResponse.body.data?.token === token, 'Status token should match verify response token');
    assertCondition(
      completedStatusResponse.body.data?.disclosedClaimsProofVerified === true,
      'Status payload should report disclosedClaimsProofVerified=true'
    );
    assertCondition(
      completedStatusResponse.body.data?.disclosedClaimsBindingDigest === verifyResponse.body.data.disclosedClaimsBindingDigest,
      'Status disclosedClaimsBindingDigest should match verify response'
    );

    const resetOverride = await apiRequest(`/admin/verifier-profiles/${verifierId}/runtime-override`, {
      method: 'DELETE',
      headers: AUTH_HEADER,
    });

    assertCondition(resetOverride.status === 200, 'Expected 200 from DELETE runtime override endpoint');
    created = false;

    console.log('All selective-disclosure positive assertions passed');
  } finally {
    if (created) {
      await apiRequest(`/admin/verifier-profiles/${verifierId}/runtime-override`, {
        method: 'DELETE',
        headers: AUTH_HEADER,
      });
    }
  }
}

main()
  .then(() => {
    console.log('Selective-disclosure positive validation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Selective-disclosure positive validation failed:', error.message);
    process.exit(1);
  });
