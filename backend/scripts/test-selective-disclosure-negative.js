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
  const verifierId = `integration_selective_negative_${Date.now()}`;
  const organizationId = `integration_selective_negative_org_${Date.now()}`;
  const employeeId = 'EMP001';
  const testAddress = TEST_WALLET.address;

  console.log('Starting selective-disclosure negative validation');
  console.log(`Using backend: ${API_URL}`);
  console.log(`Verifier ID: ${verifierId}`);

  let created = false;

  try {
    const invalidCreateEmptyClaims = await apiRequest('/admin/verifier-profiles', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: {
        verifierId,
        organizationId,
        organizationName: 'Integration Selective Negative Org',
        active: true,
        policyVersion: 1,
        requireCredential: false,
        allowedBadges: ['employee', 'admin'],
        allowedRequestTypes: ['portal_access'],
        requiredClaimsByRequestType: {
          portal_access: [],
        },
      },
    });

    assertCondition(
      invalidCreateEmptyClaims.status === 400,
      `Expected 400 for empty claim requirements; received ${invalidCreateEmptyClaims.status} with body ${JSON.stringify(invalidCreateEmptyClaims.body)}`
    );
    assertCondition(
      String(invalidCreateEmptyClaims.body.error || '').includes('requiredClaimsByRequestType.portal_access'),
      'Expected validation error for requiredClaimsByRequestType.portal_access'
    );

    const createValidProfile = await apiRequest('/admin/verifier-profiles', {
      method: 'POST',
      headers: AUTH_HEADER,
      body: {
        verifierId,
        organizationId,
        organizationName: 'Integration Selective Negative Org',
        active: true,
        policyVersion: 1,
        requireCredential: false,
        allowedBadges: ['employee', 'admin'],
        allowedRequestTypes: ['portal_access'],
        requiredClaimsByRequestType: {
          portal_access: ['employeeId', 'role'],
          general_auth: ['employeeId'],
        },
      },
    });

    assertCondition(createValidProfile.status === 201, 'Expected 201 for valid profile creation');
    created = true;

    const invalidPatchUnsupportedRequestType = await apiRequest(`/admin/verifier-profiles/${verifierId}`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: {
        requiredClaimsByRequestType: {
          guest_access: ['employeeId'],
        },
      },
    });

    assertCondition(
      invalidPatchUnsupportedRequestType.status === 400,
      `Expected 400 for unsupported request type key; received ${invalidPatchUnsupportedRequestType.status} with body ${JSON.stringify(invalidPatchUnsupportedRequestType.body)}`
    );
    assertCondition(
      String(invalidPatchUnsupportedRequestType.body.error || '').includes('Unsupported request type in requiredClaimsByRequestType'),
      'Expected unsupported request type validation message'
    );

    const invalidPatchUnknownClaim = await apiRequest(`/admin/verifier-profiles/${verifierId}`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: {
        requiredClaimsByRequestType: {
          portal_access: ['unknown_claim_key'],
        },
      },
    });

    assertCondition(
      invalidPatchUnknownClaim.status === 400,
      `Expected 400 for unknown claim key; received ${invalidPatchUnknownClaim.status} with body ${JSON.stringify(invalidPatchUnknownClaim.body)}`
    );
    assertCondition(
      String(invalidPatchUnknownClaim.body.error || '').includes('must include at least one supported claim key'),
      'Expected unknown claim key validation message'
    );

    const missingClaimChallenge = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        employeeId,
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(missingClaimChallenge.status === 200, 'Expected challenge generation for missing-claim test');

    const missingClaimDisclosedClaims = {
      employeeId,
    };
    const missingClaimProof = await buildDisclosedClaimsProof({
      challengeId: missingClaimChallenge.body.data.challengeId,
      challenge: missingClaimChallenge.body.data.challenge,
      disclosedClaims: missingClaimDisclosedClaims,
    });
    const missingClaimSignature = await signAuthChallengeMessage(missingClaimChallenge.body.data.challenge);

    const missingClaimVerify = await apiRequest('/auth/verify', {
      method: 'POST',
      body: {
        challengeId: missingClaimChallenge.body.data.challengeId,
        signature: missingClaimSignature.signature,
        address: testAddress,
        message: missingClaimSignature.message,
        employeeId,
        verifierId,
        disclosedClaims: missingClaimDisclosedClaims,
        disclosedClaimsProof: missingClaimProof,
      },
    });

    assertCondition(
      missingClaimVerify.status === 403,
      `Expected 403 for missing required disclosed claim; received ${missingClaimVerify.status} with body ${JSON.stringify(missingClaimVerify.body)}`
    );
    assertCondition(
      String(missingClaimVerify.body.error || '').includes('Selective disclosure verification failed'),
      'Expected selective disclosure verification failure for missing claims'
    );

    const mismatchedClaimChallenge = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        employeeId,
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(mismatchedClaimChallenge.status === 200, 'Expected challenge generation for mismatched-claim test');

    const mismatchedDisclosedClaims = {
      employeeId,
      role: 'manager',
    };
    const mismatchedProof = await buildDisclosedClaimsProof({
      challengeId: mismatchedClaimChallenge.body.data.challengeId,
      challenge: mismatchedClaimChallenge.body.data.challenge,
      disclosedClaims: mismatchedDisclosedClaims,
    });
    const mismatchedSignature = await signAuthChallengeMessage(mismatchedClaimChallenge.body.data.challenge);

    const mismatchedClaimVerify = await apiRequest('/auth/verify', {
      method: 'POST',
      body: {
        challengeId: mismatchedClaimChallenge.body.data.challengeId,
        signature: mismatchedSignature.signature,
        address: testAddress,
        message: mismatchedSignature.message,
        employeeId,
        verifierId,
        disclosedClaims: mismatchedDisclosedClaims,
        disclosedClaimsProof: mismatchedProof,
      },
    });

    assertCondition(
      mismatchedClaimVerify.status === 403,
      `Expected 403 for mismatched disclosed claim; received ${mismatchedClaimVerify.status} with body ${JSON.stringify(mismatchedClaimVerify.body)}`
    );
    assertCondition(
      String(mismatchedClaimVerify.body.error || '').includes('Selective disclosure verification failed'),
      'Expected selective disclosure verification failure for mismatched claims'
    );

    const missingProofChallenge = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        employeeId,
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(missingProofChallenge.status === 200, 'Expected challenge generation for missing-proof test');

    const missingProofSignature = await signAuthChallengeMessage(missingProofChallenge.body.data.challenge);
    const missingProofVerify = await apiRequest('/auth/verify', {
      method: 'POST',
      body: {
        challengeId: missingProofChallenge.body.data.challengeId,
        signature: missingProofSignature.signature,
        address: testAddress,
        message: missingProofSignature.message,
        employeeId,
        verifierId,
        disclosedClaims: {
          employeeId,
          role: 'employee',
        },
      },
    });

    assertCondition(
      missingProofVerify.status === 403,
      `Expected 403 when disclosedClaimsProof is missing; received ${missingProofVerify.status} with body ${JSON.stringify(missingProofVerify.body)}`
    );
    assertCondition(
      String(missingProofVerify.body.error || '').includes('Selective disclosure proof is required'),
      'Expected explicit selective disclosure proof required error'
    );

    const tamperedProofChallenge = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        employeeId,
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(tamperedProofChallenge.status === 200, 'Expected challenge generation for tampered-proof test');

    const tamperedDisclosedClaims = {
      employeeId,
      role: 'employee',
    };
    const tamperedProof = await buildDisclosedClaimsProof({
      challengeId: tamperedProofChallenge.body.data.challengeId,
      challenge: tamperedProofChallenge.body.data.challenge,
      disclosedClaims: tamperedDisclosedClaims,
    });
    const tamperedSignature = await signAuthChallengeMessage(tamperedProofChallenge.body.data.challenge);

    const tamperedProofVerify = await apiRequest('/auth/verify', {
      method: 'POST',
      body: {
        challengeId: tamperedProofChallenge.body.data.challengeId,
        signature: tamperedSignature.signature,
        address: testAddress,
        message: tamperedSignature.message,
        employeeId,
        verifierId,
        disclosedClaims: tamperedDisclosedClaims,
        disclosedClaimsProof: {
          ...tamperedProof,
          claimDigest: hashUtf8('tampered-claim-digest'),
        },
      },
    });

    assertCondition(
      tamperedProofVerify.status === 403,
      `Expected 403 for tampered disclosedClaimsProof; received ${tamperedProofVerify.status} with body ${JSON.stringify(tamperedProofVerify.body)}`
    );
    assertCondition(
      String(tamperedProofVerify.body.error || '').includes('Selective disclosure cryptographic binding failed'),
      'Expected cryptographic binding failure for tampered disclosedClaimsProof'
    );

    const challengeResponse = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        employeeId,
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(challengeResponse.status === 200, 'Expected challenge generation to succeed after negative checks');
    assertCondition(
      Array.isArray(challengeResponse.body.data?.requestedClaims?.requiredClaims),
      'Expected requestedClaims.requiredClaims to be present after valid challenge generation'
    );

    const resetOverride = await apiRequest(`/admin/verifier-profiles/${verifierId}/runtime-override`, {
      method: 'DELETE',
      headers: AUTH_HEADER,
    });

    assertCondition(resetOverride.status === 200, 'Expected 200 from DELETE runtime override endpoint');
    created = false;

    console.log('All selective-disclosure negative assertions passed');
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
    console.log('Selective-disclosure negative validation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Selective-disclosure negative validation failed:', error.message);
    process.exit(1);
  });
