# R6 Implementation Plan: Privacy-Preserving Selective Disclosure

## Objective

Implement selective disclosure so verifiers receive only policy-required claims instead of full credential payloads.

## Current Baseline

- Backend verifies full credential payload in `POST /api/auth/verify`.
- Wallet stores typed credential records and can resolve credential metadata.
- Portal can select verifier profiles and bind verifier context in challenge creation.
- Verifier profiles already define policy controls; selective disclosure will extend policy with claim-level requirements.

## Scope for R6

- Add verifier claim requirements for each request type.
- Add challenge-time disclosure request so wallet knows what to present.
- Add wallet selective presentation assembly.
- Add backend verification for disclosed claims and policy-level claim checks.
- Add portal controls for disclosure profile previews.

## Incremental Delivery Slices

### R6.1 - Policy Model Extension (Backend)

- Extend verifier profile model to include required claim keys per request type.
- Expose claim requirements in `/api/auth/verifier-profiles` and challenge response payload.
- Keep existing behavior backward compatible when no claim requirements are configured.

Verification after change:
- `npm --prefix backend run build`
- `npm --prefix backend run test:verifier-profiles`
- `npm --prefix backend run test:verifier-profiles-negative`

### R6.2 - Challenge Disclosure Contract (Backend + Portal)

- Include a `requestedClaims` structure in challenge response and QR payload.
- Show requested claim summary in portal login view and QR details.
- Preserve current login path if `requestedClaims` is absent.

Verification after change:
- `npm --prefix backend run build`
- `npm --prefix portal run build`

### R6.3 - Wallet Selective Presentation Builder

- Add a wallet module that derives a minimal claim presentation object from stored credential JWT payload.
- Bind selective presentation to challengeId to prevent replay across sessions.
- Submit selective presentation in `POST /api/auth/verify` alongside existing fields.

Verification after change:
- `npx --prefix wallet tsc --noEmit --moduleResolution bundler -p DIDfinal/wallet/tsconfig.json`
- `npm --prefix backend run build`

### R6.4 - Backend Selective Claim Verification

- Verify disclosed claims against signed credential content and policy requirements.
- Return claim-level verification metadata in response (e.g., required claims satisfied / missing keys).
- Keep existing token compatibility fields while adding new selective-disclosure claims.

Verification after change:
- `npm --prefix backend run build`
- `npm --prefix backend run test:verifier-profiles`
- `npm --prefix backend run test:verifier-profiles-negative`

### R6.5 - End-to-End Validation + CI Extension

- Add selective-disclosure positive/negative validation scripts under `backend/scripts`.
- Extend `.github/workflows/verifier-profile-validation.yml` to include selective-disclosure checks.

Verification after change:
- `npm --prefix backend run build`
- Run full verifier suite locally against a live backend instance.
- Confirm CI workflow passes on PR.

## Verify-After-Change Cadence

- For each code edit, run the smallest impacted check immediately.
- After completing each slice, run full impacted sweep:
  - backend build
  - wallet typecheck (if wallet touched)
  - portal build (if portal touched)
  - verifier validation scripts
- Do not move to next slice until all checks pass.

## Initial Risks and Mitigations

- Risk: Claim extraction drift across credential variants.
  - Mitigation: centralize mapping and add explicit fallback handling.
- Risk: Breaking backward compatibility for existing full credential path.
  - Mitigation: keep legacy verification path active until selective mode is stable.
- Risk: Increased auth payload complexity.
  - Mitigation: version challenge/request schema and keep response compatibility fields.

## Exit Criteria for R6

- Verifier can request claim-level disclosure policy.
- Wallet sends only requested claim values (or proof artifacts) for authentication.
- Backend enforces claim policy and issues token only when policy is satisfied.
- CI includes selective-disclosure regression checks.
