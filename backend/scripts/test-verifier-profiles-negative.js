const BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;
const AUTH_HEADER = {
  Authorization: `Bearer ${process.env.ADMIN_TOKEN || 'integration-test-token'}`,
};

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
  const verifierId = `integration_negative_${Date.now()}`;
  const organizationId = `integration_negative_org_${Date.now()}`;

  console.log('Starting verifier profile negative-case validation');
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
        organizationName: 'Integration Negative Org',
        active: true,
        policyVersion: 1,
        requireCredential: false,
        allowedBadges: ['employee', 'admin'],
        allowedRequestTypes: ['portal_access'],
        requiredClaimsByRequestType: {
          portal_access: ['subjectDid'],
          general_auth: ['subjectDid'],
        },
      },
    });

    assertCondition(createProfile.status === 201, 'Expected 201 from POST /admin/verifier-profiles');
    created = true;

    const deactivateProfile = await apiRequest(`/admin/verifier-profiles/${verifierId}/active`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: { active: false },
    });

    assertCondition(deactivateProfile.status === 200, 'Expected 200 from PATCH /active deactivate');

    const inactiveChallenge = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        companyId: organizationId,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(
      inactiveChallenge.status === 400,
      `Expected 400 for inactive verifier profile; received ${inactiveChallenge.status} with body ${JSON.stringify(inactiveChallenge.body)}`
    );
    assertCondition(
      String(inactiveChallenge.body.error || '').includes('Invalid verifier profile input'),
      'Expected inactive verifier path to return invalid verifier profile input error'
    );
    assertCondition(
      String(inactiveChallenge.body.details || '').toLowerCase().includes('inactive'),
      `Expected inactive verifier detail to mention inactive; received ${JSON.stringify(inactiveChallenge.body)}`
    );

    const reactivateProfile = await apiRequest(`/admin/verifier-profiles/${verifierId}/active`, {
      method: 'PATCH',
      headers: AUTH_HEADER,
      body: { active: true },
    });

    assertCondition(reactivateProfile.status === 200, 'Expected 200 from PATCH /active activate');

    const mismatchChallenge = await apiRequest('/auth/challenge', {
      method: 'POST',
      body: {
        companyId: `${organizationId}_mismatch`,
        requestType: 'portal_access',
        verifierId,
      },
    });

    assertCondition(
      mismatchChallenge.status === 400,
      `Expected 400 for companyId mismatch; received ${mismatchChallenge.status} with body ${JSON.stringify(mismatchChallenge.body)}`
    );
    assertCondition(
      String(mismatchChallenge.body.error || '').includes('companyId does not match verifier profile organization'),
      'Expected companyId mismatch validation error'
    );

    const resetOverride = await apiRequest(`/admin/verifier-profiles/${verifierId}/runtime-override`, {
      method: 'DELETE',
      headers: AUTH_HEADER,
    });

    assertCondition(resetOverride.status === 200, 'Expected 200 from DELETE runtime override endpoint');
    created = false;

    console.log('All verifier profile negative-case assertions passed');
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
    console.log('Verifier profile negative-case validation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verifier profile negative-case validation failed:', error.message);
    process.exit(1);
  });
