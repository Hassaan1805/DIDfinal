# R7 Global Audit Timeline Plan

## Objective

Provide a user-facing and organization-facing authentication timeline that supports misuse detection without exposing private keys or raw sensitive payloads.

## R7.1 Delivered (Backend)

- Added typed auth timeline event service in `backend/src/services/authTimeline.service.ts`.
- Added query APIs:
  - `GET /api/auth/timeline`
  - `GET /api/auth/timeline/me`
- Added runtime event emission in auth routes for:
  - challenge creation
  - challenge expiration
  - verification attempt/success/failure
  - token verification success/failure
  - session status checks

## Event Schema

Each event contains:

- `eventId`
- `createdAt`
- `eventType`
- `status`
- `reason`
- `challengeId`
- `did`
- `userAddress`
- `employeeId`
- `companyId`
- `verifierId`
- `verifierOrganizationId`
- `verifierOrganizationName`
- `requestType`
- `metadata` (free-form structured details)

### Event Type Set

- `challenge_created`
- `challenge_expired`
- `verification_attempted`
- `verification_succeeded`
- `verification_failed`
- `token_verified`
- `token_verification_failed`
- `session_status_checked`

### Status Set

- `success`
- `failure`
- `info`

## Storage Shape and Retention

Current timeline event storage is in-memory for fast iteration and schema stabilization:

- backing store: array of `AuthTimelineEvent`
- insertion: newest first
- retention controls:
  - `AUTH_TIMELINE_MAX_EVENTS` (default `5000`)
  - `AUTH_TIMELINE_RETENTION_DAYS` (default `30`)

R8 progress update:

- challenge/session storage durability is implemented in backend auth routes via storage abstraction and Redis-ready configuration.
- timeline event storage remains in-memory and is the remaining durability target.

Remaining migration target in R8: durable timeline event store (Redis + DB or DB-first) with indexed filters.

## API Contract Draft

### `GET /api/auth/timeline`

Filter by one or more scope keys:

- `did`
- `userAddress`
- `employeeId`
- `companyId`
- `verifierId`

Optional query params:

- `eventType`
- `status`
- `from` (ISO timestamp)
- `to` (ISO timestamp)
- `limit` (default `50`, max `200`)
- `cursor` (offset-based)

Response includes:

- normalized `filters`
- `events`
- `pagination` (`returned`, `total`, `hasMore`, `nextCursor`)
- `summary` (`success`, `failure`, `info`, `lastEventAt`)

### `GET /api/auth/timeline/me`

- requires bearer token (`verifyAuthToken`)
- scope derived from token identity (`did` and/or `address`)
- supports same optional filters/pagination as above

## Security and Privacy Notes

- No private keys or raw signing secrets are stored.
- Timeline stores metadata needed for forensic traceability and user awareness.
- Public timeline endpoint requires at least one identity or organization scope filter.
- Token-bound endpoint (`/timeline/me`) avoids query-side identity spoofing.

## Validation

Run after backend changes:

```bash
npm --prefix backend run build
BACKEND_BASE_URL=http://127.0.0.1:3001 npm --prefix backend run test:auth-timeline
BACKEND_BASE_URL=http://127.0.0.1:3001 npm --prefix backend run test:verifier-profiles
BACKEND_BASE_URL=http://127.0.0.1:3001 npm --prefix backend run test:verifier-profiles-negative
BACKEND_BASE_URL=http://127.0.0.1:3001 npm --prefix backend run test:selective-disclosure
BACKEND_BASE_URL=http://127.0.0.1:3001 npm --prefix backend run test:selective-disclosure-negative
```

## R7.2 Next (Single Active Task)

- Wallet: add timeline screen using `GET /api/auth/timeline/me`.
- Portal: add audit timeline panel with org/verifier filters using `GET /api/auth/timeline`.
- Add basic suspicious-pattern highlighting:
  - repeated failures in short windows
  - verifier mismatch attempts
  - expired challenge replay attempts
