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
  const verifierId = `integration_profile_${Date.now()}`;
  const organizationId = `integration_org_${Date.now()}`;
  const testAddress = TEST_WALLET.address;
  const testDid = `did:ethr:${testAddress}`;

  console.log('Starting verifier profile integration validation');
  console.log(`Using backend: ${API_URL}`);
  console.log(`Verifier ID: ${verifierId}`);

  let created = false;

  try {
    const listInitial = await apiRequest('/admin/verifier-profiles', {
      headers: AUTH_HEADER,
    });
    assertCondition(listInitial.status === 200, 'Expected 200 from GET /admin/verifier-profiles');
    assertCondition(listInitial.body.success === true, 'Expected success=true when listing verifier profiles');

    const createProfile = await apiRequest('/admin/verifier-profiles', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: {
        verifierId,
        organizationId,
        organizationName: 'Integration Test Org',
        active: true,
        policyVersion: 1,
        requireCredential: true,
        allowedBadges: ['employee', 'admin'],
        allowedRequestTypes: ['portal_access'],
        requiredClaimsByRequestType: {
          portal_access: ['subjectDid'],
          general_auth: ['subjectDid'],
        },
      },
    });

    assertCondition(createProfile.status === 201, 'Expected 201 from POST /admin/verifier-profiles');
    assertCondition(createProfile.body.success === true, 'Expected success=true after creating verifier profile');
    assertCondition(createProfile.body.data.verifierId === verifierId, 'Created verifier profile id mismatch');
    created = true;

    const deactivateProfile = await apiRequest(`/admin/verifier-profiles/${verifierId}/active`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: { active: false },
    });
    assertCondition(deactivateProfile.status === 200, 'Expected 200 from PATCH /active deactivate');
    assertCondition(deactivateProfile.body.data.active === false, 'Verifier profile should be inactive');

    const activateProfile = await apiRequest(`/admin/verifier-profiles/${verifierId}/active`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: { active: true },
    });
    assertCondition(activateProfile.status === 200, 'Expected 200 from PATCH /active activate');
    assertCondition(activateProfile.body.data.active === true, 'Verifier profile should be active');

    const deniedChallenge = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(deniedChallenge.status === 200, 'Expected 200 from POST /auth/challenge for denied case');
    const deniedChallengeId = deniedChallenge.body.data.challengeId;
    const deniedChallengeText = deniedChallenge.body.data.challenge;

    const deniedVerify = await apiRequest('/auth/verify', {
      method: 'POST',
      body: {
        challengeId: deniedChallengeId,
        signature: 'demo-signature',
        address: testAddress,
        message: `Please sign this message to authenticate with challenge: ${deniedChallengeText}`,
        verifierId,
      },
    });

    assertCondition(
      deniedVerify.status === 403,
      `Expected 403 when selective disclosure claims are missing; received ${deniedVerify.status} with body ${JSON.stringify(deniedVerify.body)}`
    );
    assertCondition(
      String(deniedVerify.body.error || '').includes('Selective disclosure verification failed'),
      'Expected selective disclosure verification failure when required claims are missing'
    );

    const patchProfile = await apiRequest(`/admin/verifier-profiles/${verifierId}`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: {
        policyVersion: 2,
        requireCredential: false,
      },
    });

    assertCondition(patchProfile.status === 200, 'Expected 200 from PATCH /admin/verifier-profiles/:verifierId');
    assertCondition(
      patchProfile.body.data.requireCredential === false,
      'Expected patched verifier profile to allow verification without credential'
    );

    const allowedChallenge = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(allowedChallenge.status === 200, 'Expected 200 from POST /auth/challenge for allowed case');
    const allowedChallengeId = allowedChallenge.body.data.challengeId;
    const allowedChallengeText = allowedChallenge.body.data.challenge;
    const allowedDisclosedClaims = {
      subjectDid: testDid,
    };
    const allowedProof = await buildDisclosedClaimsProof({
      challengeId: allowedChallengeId,
      challenge: allowedChallengeText,
      disclosedClaims: allowedDisclosedClaims,
    });
    const allowedAuthSignature = await signAuthChallengeMessage(allowedChallengeText);

    const allowedVerify = await apiRequest('/auth/verify', {
      method: 'POST',
      body: {
        challengeId: allowedChallengeId,
        signature: allowedAuthSignature.signature,
        address: testAddress,
        message: allowedAuthSignature.message,
        verifierId,
        disclosedClaims: allowedDisclosedClaims,
        disclosedClaimsProof: allowedProof,
      },
    });

    assertCondition(
      allowedVerify.status === 200,
      `Expected 200 after profile patch disables credential requirement; received ${allowedVerify.status} with body ${JSON.stringify(allowedVerify.body)}`
    );
    assertCondition(allowedVerify.body.success === true, 'Expected success=true for allowed verification');
    assertCondition(allowedVerify.body.data.verifierId === verifierId, 'Expected verifierId in allowed auth response');
    assertCondition(
      allowedVerify.body.data.verifierPolicySatisfied === true,
      'Expected verifierPolicySatisfied=true for allowed verification'
    );

    const resetOverride = await apiRequest(`/admin/verifier-profiles/${verifierId}/runtime-override`, {
      method: 'DELETE',
      headers: AUTH_HEADER,
    });

    assertCondition(resetOverride.status === 200, 'Expected 200 from DELETE runtime override endpoint');
    created = false;

    const lookupAfterReset = await apiRequest(`/auth/verifier-profiles/${verifierId}`);
    assertCondition(lookupAfterReset.status === 404, 'Expected 404 for verifier profile after runtime override reset');

    console.log('All verifier profile integration assertions passed');
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
    console.log('Verifier profile integration validation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verifier profile integration validation failed:', error.message);
    process.exit(1);
  });
