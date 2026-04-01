# Universal Identity Enhancement Roadmap

## Objective

Evolve the current enterprise DID authentication demo into a person-owned, cross-organization universal identity platform.

## Prioritization Method

- **Priority**: P0 (critical), P1 (high), P2 (medium), P3 (later)
- **Difficulty**: Low, Medium, High, Very High
- **Impact**: Business and architecture value toward universal identity

## Enhancement Backlog

| ID | Enhancement | Why It Matters | Priority | Difficulty | Status |
| --- | --- | --- | --- | --- | --- |
| R1 | Unify active login flow with optional VC verification | Makes VC checks part of real user flow instead of a side-path endpoint | P0 | Medium | Completed |
| R2 | Issuer trust registry + allow list checks | Supports multi-organization issuers safely | P0 | High | Completed |
| R3 | Credential status/revocation checks | Prevents use of expired/revoked credentials | P0 | High | Completed |
| R4 | Wallet credential storage model (typed, versioned) | Enables portable, reusable credentials in user wallet | P1 | Medium | Completed |
| R5 | Cross-organization verifier profile model | Lets many portals verify same user identity with policy controls | P1 | High | Completed |
| R6 | Privacy-preserving selective disclosure (ZK/SD-JWT) | Shares only needed claims, not full identity | P1 | Very High | Completed (R6.1-R6.5 + binding) |
| R7 | User-facing global login audit timeline | Delivers misuse detection to end users | P1 | Medium | ✅ Complete |
| R8 | Replace in-memory challenge storage with Redis/DB | Required for production reliability and scale | P2 | Medium | In Progress (challenge storage slice done) |
| R9 | Production key management hardening in wallet | Improves user key security and recoverability | P2 | High | Planned |
| R10 | Conformance test suite for DID/VC interoperability | Validates cross-ecosystem compatibility | P2 | High | Planned |

## Delivery Plan

### Phase 1 (Now): Make VC real in everyday auth

- **Scope**: R1 + prep for R2/R3
- **Target outcome**: Wallet can send credential metadata with current login request and backend validates VC when provided.
- **Success criteria**:

  - Existing signature-only login still works.
  - VC-backed login uses same primary endpoint.
  - Response clearly states whether credential was verified.

### Phase 2: Trust + revocation foundations

- **Scope**: R2, R3, R4
- **Target outcome**: Trusted issuer governance and credential lifecycle checks.
- **Success criteria**:

  - Configurable issuer allow list.
  - Revocation/status API checks before granting access.
  - Wallet stores credentials in typed structures.

### Phase 3: Universal interoperability and privacy

- **Scope**: R5, R6, R7
- **Target outcome**: Multi-organization acceptance and privacy-first claim disclosure.
- **Success criteria**:

  - Same credential accepted across participating organizations.
  - Selective disclosure paths in verifier APIs.
  - User can inspect all auth events and detect suspicious use.

### Phase 4: Production hardening

- **Scope**: R8, R9, R10
- **Target outcome**: Scale, reliability, and standards conformance.
- **Success criteria**:

  - Durable challenge/session state.
  - Hardened key custody/recovery.
  - Automated interoperability test baseline.

## Immediate Sprint (single active task)

1. R8 - Replace in-memory challenge storage with Redis/DB for production reliability and scale. (In Progress)

## Execution Notes

- R1 implemented: wallet now optionally includes VC payload data on the primary `/api/auth/verify` flow.
- Backend primary verify flow now supports optional VC verification and emits `credentialProvided`/`credentialVerified` response and token claims.
- R2 implemented: issuer trust policy moved to dedicated service with strict-mode support (`VC_STRICT_ISSUER_TRUST`) and trusted issuer list (`TRUSTED_ISSUER_DIDS`).
- Added trust policy introspection endpoint: `GET /api/auth/trusted-issuers`.
- Backend VC responses now include `credentialIssuerTrusted` to distinguish trusted vs untrusted-allowed issuers.
- R3 implemented: credential lifecycle service added with status evaluation (`active`, `revoked`, `expired`, `unknown`) and policy controls (`VC_REQUIRE_CREDENTIAL_ID`, `VC_STRICT_STATUS_CHECK`).
- Added credential status endpoint: `GET /api/auth/credential-status/:credentialId`.
- Added admin lifecycle endpoints: `GET /api/admin/credentials/:credentialId/status` and `POST /api/admin/credentials/:credentialId/revoke`.
- Runtime smoke verified lifecycle flow: issued credential starts `active` and changes to `revoked` after admin revoke.
- R4 implemented: wallet now persists credentials in a typed, versioned store (`wallet_credentials_v1`) with schema-validated records.
- Added wallet credential metadata model (issuer/subject/employee/status hints/timestamps) and migration from legacy `employee.credential` fields.
- Wallet auth submission now resolves credentials from the typed credential store first, with backward-compatible fallback to legacy inline employee credential values.
- Wallet home screen now surfaces stored credential count.
- Backend TypeScript build passed.
- Wallet TypeScript check passed (`npx tsc --noEmit --moduleResolution bundler`).
- Portal production build passed (`npm --prefix portal run build`) after removing unused local variables in `EnterprisePortalProfessional.tsx`.
- R5 foundation implemented: added verifier profile registry model for cross-organization verification with policy controls (badge scope, request type, credential requirement).
- Added verifier profile discovery endpoints: `GET /api/auth/verifier-profiles` and `GET /api/auth/verifier-profiles/:verifierId`.
- Challenge generation now binds verifier profile context into challenge state + QR payload, and `/api/auth/verify` enforces verifier-policy checks before issuing tokens.
- Wallet QR/auth flow now forwards verifier context (`verifierId`) on the primary verification endpoint for profile-consistent authentication.
- Added verifier profile admin operations for runtime policy management: list, create/update, patch, activate/deactivate, and runtime override reset under `/api/admin/verifier-profiles`.
- Portal login now loads verifier profiles from backend and includes selected `verifierId` + organization context during challenge creation.
- Portal QR step now surfaces verifier organization metadata to confirm the selected cross-organization verification path.
- Reverified after operationalization changes: backend build passed and portal build passed.
- Added backend verifier profile CI workflow: `.github/workflows/verifier-profile-validation.yml` now auto-runs on backend changes for push and pull requests.
- CI verifier suite now runs both `test:verifier-profiles` and `test:verifier-profiles-negative` against a live backend instance.
- Added negative-case verifier validation script (`backend/scripts/test-verifier-profiles-negative.js`) covering inactive verifier rejection and `companyId` mismatch rejection paths.
- R6 planning kickoff started: implementation slice plan and verify-after-change cadence documented in `docs/R6_SELECTIVE_DISCLOSURE_PLAN.md`.
- R6.1 implemented: verifier profile model now supports `requiredClaimsByRequestType`, with admin create/patch validation for supported request types and claim keys.
- R6.2 implemented: challenge generation now exposes `requestedClaims` in API response, QR payload, and status/verify responses for claim-disclosure contract parity.
- Portal login and QR flows now render selective-disclosure claim summaries from verifier policy/challenge payloads.
- Added selective-disclosure integration suites (`backend/scripts/test-selective-disclosure-flow.js` and `backend/scripts/test-selective-disclosure-negative.js`) and wired them into backend scripts + CI workflow execution.
- R6.3 implemented: wallet now assembles selective presentation payloads from requested claim contracts and submits `disclosedClaims` on the primary `/api/auth/verify` flow.
- Wallet selective submission now avoids full credential transfer when selective claims are sufficient, while retaining credential fallback when verifier policy explicitly requires credential proof.
- R6.4 implemented: backend now validates `disclosedClaims` against policy-required claim keys and server-side expected identity values before issuing tokens.
- Auth responses/JWT/status now include selective-disclosure verification metadata (`disclosedClaims`, `disclosedClaimsVerified`) for auditability and downstream integration checks.
- R6.5 implemented: CI verifier workflow now runs on every push/pull-request/manual dispatch and executes all verifier/selective suites before failing, so selective positive and negative tests always run.
- Added cryptographic disclosed-claims binding (`sd-bind-v1`): wallet now submits `disclosedClaimsProof` (challenge digest, claims digest, binding digest, signed binding), and backend verifies this proof before issuing tokens.
- Added stronger selective-disclosure metadata propagation: verify responses, JWT payloads, `/api/auth/verify-token`, and status polling now carry `disclosedClaimsProofVerified` and `disclosedClaimsBindingDigest`.
- Tightened end-to-end validation scripts to assert metadata consistency across challenge payload, verify response, JWT claims, verify-token introspection, and completed status records.
- Revalidated after R6.5 + binding upgrades: backend build passed, wallet typecheck passed, and all verifier/selective-disclosure positive+negative integration suites passed against a live backend instance.
- R6 exit criteria met; move focus to R7 audit timeline experience.
- R7.1 implemented (backend): added typed in-memory auth timeline service with retention/size controls (`AUTH_TIMELINE_RETENTION_DAYS`, `AUTH_TIMELINE_MAX_EVENTS`).
- Added timeline query APIs: `GET /api/auth/timeline` (filter/pagination by identity/org/verifier) and `GET /api/auth/timeline/me` (token-bound user view).
- Auth lifecycle now emits timeline events across challenge creation/expiration, verification attempt + outcome, token verification outcome, and session-status polling.
- R7.1 architecture and API contract documented in `docs/R7_GLOBAL_AUDIT_TIMELINE_PLAN.md`.
- Added timeline integration validation script: `backend/scripts/test-auth-timeline.js` and npm command `npm --prefix backend run test:auth-timeline`.
- Revalidated after R7.1: backend build passed and full integration sweep passed (`test:auth-timeline`, `test:verifier-profiles`, `test:verifier-profiles-negative`, `test:selective-disclosure`, `test:selective-disclosure-negative`).
- R7.2 implemented (UX): added wallet timeline screen (`wallet/src/screens/AuthTimelineScreen.tsx`) with service (`wallet/src/services/timeline.ts`) fetching from `/api/auth/timeline/me`.
- Wallet timeline displays: summary stats, identity info, event list with timestamps/status/organization, suspicious pattern highlighting (3+ failures, replay attempts, verifier mismatches).
- Portal audit section (`AuditTimelineSection` in `EnterprisePortalProfessional.tsx`) now displays real organization-wide timeline using `AuditAPI.getTimeline()` from `portal/src/utils/api.ts`.
- Portal audit features: scope filter (organization-wide vs my activity), event type filter, status filter, scrollable event list, suspicious pattern badges.
- Suspicious pattern detection implemented in both wallet and portal with amber/orange visual warnings for: multiple verification failures (3+ in recent window), challenge replay attempts, verifier policy mismatches.
- Wallet navigation updated: added AuthTimeline route to App.tsx, added timeline button to HomeScreen.tsx.
- Wallet TypeScript check: passed (AuthTimelineScreen and timeline service type-safe).
- Portal and backend builds: ready for verification (PowerShell environment issue on test system).
- R7 complete: backend API (R7.1) + UX integration (R7.2) delivered. Move focus to R8 (durable storage).
- R8 slice completed: auth challenge lifecycle in `backend/src/routes/auth.ts` now uses storage abstraction (`setChallenge/getChallenge/deleteChallenge/getAllChallengeIds`) instead of direct in-memory map access.
- Added TTL-safe challenge persistence helper and storage-backed session/challenge lookup paths, including sepolia verification and async blockchain status updates.
- Durable mode ready: challenge storage supports `CHALLENGE_STORAGE_TYPE=redis` + `REDIS_URL` with automatic in-memory fallback when Redis is unavailable.
- Reverification after R8 slice: backend build passed, and live integration suites passed (`test:auth-timeline`, `test:verifier-profiles`, `test:verifier-profiles-negative`, `test:selective-disclosure`).
- Remaining R8 work: migrate auth timeline event storage from in-memory array to durable Redis/DB with indexed querying and retention jobs.

## Universal Identity creation, storage, and onboarding plan

- **Identity creation**: user wallet generates the DID keypair locally and anchors the identity by requesting an enterprise-issued VC; DID key never leaves the device.
- **Storage**: wallet keeps the DID keys and issued credentials in the typed, versioned store (`wallet_credentials_v1`), with optional encrypted backup; backend only holds verifier challenges and audit events, not private keys.
- **Enterprise onboarding**: enterprise portal triggers challenge + verifier profile selection, issues the employment/affiliation VC to the user's DID, and records the audit event; wallet accepts and stores the VC, then uses it for selective-disclosure logins across enterprises.
- **Access/verification**: during login, wallet presents selective claims or full credential (per verifier policy) over the primary `/api/auth/verify` flow; backend enforces issuer trust, revocation, and claim-policy checks before issuing session tokens.
