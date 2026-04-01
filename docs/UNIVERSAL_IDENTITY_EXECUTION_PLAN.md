# Universal Identity Execution Plan

## Objective

Deliver a production-ready, user-owned universal identity platform where:

- users create and own their DID in wallet,
- DID ownership is anchored publicly on-chain,
- profile and resume data are portable and verifiable,
- enterprise enrollment is explicit and consent-driven in wallet,
- the same user identity can be used across multiple organizations.

## Product Principles

1. User key ownership first (private keys never leave wallet device).
2. Blockchain as trust anchor, not raw personal-data dump.
3. Selective disclosure by default.
4. Explicit wallet consent for enrollment and data sharing.
5. Auditable events with privacy-safe metadata.

## Target Architecture

### Identity Layer

- Root DID anchored on-chain (`did:ethr:*`).
- Optional pairwise DID aliases per verifier/organization for privacy.
- DID document supports key rotation and recovery methods.

### Data Layer

- On-chain:
  - DID ownership anchors,
  - profile version hash commitments,
  - credential status/revocation references,
  - consent receipt hashes (optional but recommended).
- Off-chain:
  - encrypted profile/resume payloads,
  - public profile snapshot for discovery,
  - encrypted backup/sync metadata.

### Consent & Enrollment Layer

- Organization creates enrollment request against DID.
- Wallet displays claims/purpose/retention and asks approve/reject.
- Approved response mints exchange artifact (signed consent + selective claims).
- Organization issues employment credential back to user DID.

### Verification Layer

- Existing verifier profile policy model remains central.
- Required claims by request type are enforced.
- Disclosed claim binding proof remains mandatory when required.

## Enhancement Backlog (Execution)

### EPIC A - User-Owned Onboarding

- In-app DID creation flow hardening (secure key storage, backups, recovery).
- On-chain DID registration as first-class wallet onboarding step.
- Profile bootstrap wizard (public summary + private details split).

### EPIC B - Portable Profile + Resume

- Structured profile schema (versioned): identity, links, resume metadata, skills.
- Public profile projection endpoint for enterprise discovery.
- Encrypted profile pointers and hash commitments for integrity checks.

### EPIC C - Consentual Enterprise Enrollment

- Enrollment request API and wallet inbox.
- Approval/rejection API and signed decision receipts.
- Consent timeline in wallet and portal audit views.

### EPIC D - Credential Lifecycle Interop

- Enterprise issuance flow integrated with approval result.
- Credential import UX in wallet (QR/deep link/push).
- Revocation/status checks and issuer trust federation hardening.

### EPIC E - Production Hardening

- Persist all in-memory stores to Redis + DB.
- Add rate limits, abuse controls, and idempotency keys.
- Key rotation/recovery playbooks and policy enforcement.

## Phase Plan

### Phase 1 (Current Sprint) - Foundation APIs

Deliverables:

- identity registration API,
- public profile retrieval API,
- enrollment request creation/listing APIs,
- enrollment decision API.

Exit criteria:

- APIs available and documented,
- backend build passes,
- data contracts stable for wallet/portal integration.

### Phase 2 - Wallet UX Integration

Deliverables:

- profile editor screen,
- enrollment request inbox screen,
- consent approval/rejection flow.

Exit criteria:

- user can register profile and approve/reject enterprise enrollment fully in wallet.

### Phase 3 - Enterprise Enrollment UX

Deliverables:

- portal flow to submit enrollment requests by DID,
- portal status view for pending/approved/rejected requests,
- credential issuance trigger on approval.

Exit criteria:

- complete organization-to-wallet-to-organization enrollment loop.

### Phase 4 - Persistence + Compliance

Deliverables:

- DB-backed identity, consent, profile metadata storage,
- retention/erasure policy handling,
- compliance-ready audit views.

Exit criteria:

- no critical identity state stored in process memory only.

## Risks & Mitigations

1. Privacy risk from over-sharing:
   - enforce field-level visibility and selective disclosure defaults.
2. Key loss:
   - ship recovery flows before mainnet production.
3. Vendor lock-in in off-chain profile hosting:
   - use portable URI+hash model and schema versioning.
4. Consent replay/misuse:
   - short-lived enrollment requests + nonce + signature verification.

## Work Started in This Session

- Phase 1 kickoff implementation started in backend:
  - identity profile registration/public profile APIs,
  - enrollment request lifecycle (create/list/decision) APIs.
