# Pitch Script — Decentralized Trust Platform
**KJ Somaiya Hackathon | April 11–12, 2026**
**Track: Web3 + AI**
**Target: 3 min walkthrough | 5–7 min full slot**

---

## Numbers to Know Cold (memorize before the event)

| Fact | Value |
|---|---|
| Smart contracts deployed | 3 (DIDAuthRegistry is primary) |
| Live testnet | Ethereum Sepolia |
| Contract address | `0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48` |
| ZKP system | Groth16 on BN128 curve |
| ZK public signals | 19 total |
| ZK Merkle tree depth | 8 levels |
| Hash function in circuits | Poseidon (ZK-friendly, not SHA) |
| Test suites | 9 Jest suites (auth, VC, ZKP, timeline, credentials, verifier profiles, etc.) |
| Auth event types tracked | 8 types in timeline |
| Challenge validity (on-chain) | 5 minutes |
| Challenge validity (backend) | 10 minutes |
| JWT algorithm | HS256 |
| Key storage on mobile | Expo SecureStore (hardware-backed OS enclave) |
| Credential lifecycle states | 4 — active, revoked, expired, unknown |
| Selective disclosure fields | 6 — DID, employeeId, name, role, department, email |
| Backend framework | Node.js + Express + TypeScript |
| Smart contract security | OpenZeppelin v5 — ReentrancyGuard, ECDSA, Ownable |
| Identity standard | W3C DID Core + W3C Verifiable Credentials v1 |
| ZKP library | SnarkJS v0.7.3 + Circom 2.0 |
| Ethereum library | ethers.js v6 |
| Roadmap items completed | R1 through R7 (full enterprise feature set) |

---

## The Hook (say this the moment a judge walks up — 15 seconds)

> "Every app you use knows your password and your email. One breach and your digital life is exposed. We built a system where you authenticate with zero passwords — your identity lives on the Ethereum blockchain — and you can prove things about yourself without revealing anything. Zero-Knowledge Proofs. W3C standards. Real Sepolia deployment. Running live right now."

---

## Problem (30 seconds)

> "Identity on the internet is fundamentally broken. You have a username and password on every platform. When any one of those companies gets breached — and they do — your credentials are exposed. Even 'Sign in with Google' just moves the trust problem: now Google controls your digital identity. They can suspend it, sell the data, or shut it down.
>
> And privacy is worse. To prove you work at a company, you hand over your name, ID number, date of birth, email — your entire profile — just to verify *one thing*. You share everything just to prove something small."

---

## Solution (45 seconds)

> "We built a Decentralized Identity platform. Your identity is a cryptographic key pair — generated on your phone using ethers.js v6 — and it never leaves your device. Your DID — Decentralized Identifier — is anchored on the Ethereum Sepolia blockchain. It looks like `did:ethr:0x...` — a W3C standard used by enterprises worldwide.
>
> To log into any system, you scan a QR code. Your phone signs a cryptographic challenge. The backend verifies your ECDSA signature against your DID on-chain. You're authenticated. No password. No central authority. Nobody can delete or revoke your identity except you.
>
> For privacy, we use Zero-Knowledge Proofs with Groth16 — the same proof system used in Zcash and Tornado Cash. You can prove you own an NFT, hold a credential, or belong to an organization — without revealing your wallet address, your name, or any personal information. Mathematically guaranteed. Computationally infeasible to fake."

---

## Live Demo Walkthrough (90 seconds — run this while talking)

### Step 1 — Portal opens, QR appears
> "This is our enterprise web portal — React, Vite, TypeScript. Any organization deploys this. Notice there's no username field, no password box. Instead it generates a QR code containing a cryptographic challenge — a random nonce with a 10-minute expiry window, signed server-side."

### Step 2 — Scan with wallet
> "I'm opening our mobile wallet — built in Expo React Native, runs on iOS and Android. This wallet holds my DID. The private key is stored in the OS secure enclave — Expo SecureStore — hardware-backed on both platforms. It has never touched a server. Watch — I scan the QR..."

*(scan the code)*

> "My phone just signed that challenge with my Ethereum private key and sent the signature back. The backend is now verifying it."

### Step 3 — Authenticated, JWT issued
> "We're in. Here's what happened server-side in that half second: the backend recovered the signer address from the ECDSA signature using ethers.js, checked my DID is registered and active on the Sepolia smart contract, validated the challenge hasn't expired, and issued a JWT — HS256 — containing my DID, employee ID, role, permissions, and verification metadata.
>
> You can look up this contract on Etherscan right now — every DID registration, every auth event, is on-chain."

*(show Etherscan link or have it open in another tab)*

### Step 4 — ZK Proof premium unlock
> "Now the interesting part. This premium section is token-gated — only accessible to holders of the Corporate Excellence NFT. But I don't want to reveal my wallet address to get in.
>
> I click 'Unlock Premium'. My phone runs a Circom 2.0 ZK circuit locally. The circuit takes my private key, derives my address using a Poseidon hash — that's a ZK-friendly hash function — computes an ownership commitment, then traverses an 8-level Merkle tree to prove membership, outputting 19 public signals. Signal zero must equal 1 — that's the validity flag. The proof is three elliptic curve points on BN128 — pi_a, pi_b, pi_c — about 200 bytes total.
>
> The backend loads the verification key, runs snarkjs.groth16.verify — takes under 10 milliseconds — and upgrades my session. My wallet address was never sent. No one knows which address holds the NFT. That's zero-knowledge."

*(show premium content appearing)*

---

## AI Features (45 seconds)

> "We also built AI on top of the identity layer.
>
> Every login — challenge created, signature verified, failure, replay attempt — gets emitted as a typed event into our auth timeline. There are 8 event types. We run AI anomaly detection over this in real-time: three or more failed logins from the same address inside 10 minutes gets flagged HIGH risk. A challenge replay attempt — someone trying to reuse a captured QR — gets flagged CRITICAL. We send the detected pattern list to Claude and it generates a plain English explanation of the threat with a risk score from 0 to 100.
>
> The second feature: natural language queries over the audit log. You type 'Show me all failed logins from org EMP-CORP this week' — Claude parses that into structured timeline filters — DID, status, date range, event type — hits our timeline API, and returns the results with a one-line summary. No SQL. No dropdown filters. You just ask."

---

## Security Deep Dive (say this if a technical judge is interested)

> "Security wasn't an afterthought — it's the architecture.
>
> On-chain: all mutation functions in our smart contracts use OpenZeppelin v5's ReentrancyGuard. Signature verification uses `ECDSA.recover()` and `MessageHashUtils.toEthSignedMessageHash()` — the audited OpenZeppelin implementation, not a custom one. Only the contract owner can record authentications and issue credentials. Every on-chain auth event emits an indexed event for full auditability.
>
> Off-chain: the backend validates Groth16 proof structure before calling snarkjs — it checks for the three components pi_a, pi_b, pi_c and validates all 19 public signals are numeric strings within the BN254 field size. A malformed proof is rejected before any cryptographic operation runs. Rate limiting is applied at both the challenge and auth endpoints separately.
>
> Credentials: we have a full credential lifecycle — four states: active, revoked, expired, unknown. Issuers are validated against a trusted issuer registry with strict-mode enforcement. When strict mode is on, a credential from an untrusted issuer hard-fails authentication, not just warns.
>
> Selective disclosure: when you log in, you only share the claims the verifier policy requires. Six possible fields — DID, employee ID, name, role, department, email — and each disclosed claim is cryptographically bound to the challenge via a sha256 digest and re-signed by the wallet. The backend checks the binding proof before issuing a token. So even if someone intercepts disclosed claims in transit, they can't replay them against a different challenge.
>
> Mobile: private key lives in Expo SecureStore — on Android this maps to the Android Keystore system, hardware-backed on modern devices. On iOS, it maps to the Secure Enclave. We derived a separate ZK-specific private key for proof generation so the main Ethereum signing key is never exposed to the circuit."

---

## Architecture (30 seconds — for technical judges)

> "Six modules in a monorepo. Smart contracts in Solidity 0.8.20 with Hardhat — deployed and verified on Sepolia. Backend in Node.js TypeScript — 9 Jest test suites covering auth middleware, VC issuance, ZKP verification, timeline, credential status, issuer trust, verifier profiles, challenge storage, and refresh tokens. React Vite portal with role-gate components and ZK-gate components. Expo React Native wallet, cross-platform. Circom 2.0 circuits with SnarkJS v0.7.3 using BN128 Groth16. Shared TypeScript types across the whole stack.
>
> Standards compliance: W3C DID Core, W3C Verifiable Credentials Data Model v1, EIP-712 for typed signatures. Not a toy — production architecture."

---

## Why This Beats Existing Solutions

| | Password Auth | OAuth / SSO | Our Platform |
|---|---|---|---|
| Server breach exposure | Full | Partial | None — key never on server |
| Identity ownership | Company | Google/Facebook | You |
| Privacy | None | Partial | Zero-Knowledge |
| Revocation control | Vendor | Vendor | Smart contract |
| Cross-org portability | No | Limited | Yes — W3C standards |
| Proof of attributes | Share everything | Share profile | Share only what's asked |
| Auditability | Centralized logs | Centralized | On-chain + timeline |

---

## Impact / Why It Matters (20 seconds)

> "Every sector that needs verifiable identity with privacy compliance — healthcare, finance, education, enterprise HR — has this problem. A doctor can prove their medical license without revealing their full credentials. A student can prove their degree without revealing their university ID. An employee can authenticate across five different companies using one identity that no one can take away.
>
> We built the infrastructure layer. The DID registry is live. The auth flow works. The ZK proofs run on a phone. The AI watches the system. This is deployable today."

---

## Closing Line (5 seconds)

> "Self-sovereign identity. Zero-knowledge privacy. AI-powered security. W3C standards on Ethereum. That's the Decentralized Trust Platform."

---

## 3-Minute Speedrun (if the judge is in a hurry)

> "We built decentralized identity auth. No passwords — you scan a QR code, your phone signs a cryptographic challenge, backend verifies your ECDSA signature against your DID on the Ethereum Sepolia blockchain and issues a JWT. For premium content we use Groth16 Zero-Knowledge Proofs — Circom circuit, 8-level Merkle tree, 19 public signals — prove NFT ownership without revealing your wallet address. AI layer on top does real-time anomaly detection on login events and natural language queries over the audit log. W3C DID Core compliant, 9 test suites, OpenZeppelin v5 security, running live. Want to see the demo?"

---

## Judge Q&A — Likely Questions + Exact Answers

---

**Q: What's a DID?**
> "DID stands for Decentralized Identifier. It's a W3C standard — the same organization that defines HTML and CSS. It looks like `did:ethr:0x1a2b...` — a globally unique identifier where the method — `ethr` in our case — specifies that it's anchored on Ethereum. It maps to a cryptographic key pair: you control the private key, so you control the identity. No company can create it for you, ban it, or take it away. Ours are in `did:ethr` format because we deploy on Ethereum, but the same spec works on any blockchain."

---

**Q: How is this different from just MetaMask sign-in?**
> "MetaMask gives you a wallet signature for authentication — that's the bottom layer. We build the entire identity stack on top. First: Verifiable Credentials — structured, tamper-evident digital certificates issued by trusted organizations, following the W3C VC Data Model. They have a lifecycle — active, revoked, expired — and we check revocation status on every login. Second: selective disclosure — you share only the claims the verifier policy requires, and each disclosed claim is cryptographically bound to the specific challenge so it can't be replayed. Third: Zero-Knowledge Proofs — MetaMask sign-in reveals your wallet address every time. Our ZKP system proves things about you without ever sending your address. Fourth: a full audit trail, verifier profiles, issuer trust registry, and RBAC — enterprise auth, not just a wallet signature."

---

**Q: Explain Zero-Knowledge Proofs like I'm not a crypto person.**
> "Here's the intuition: prove you know the password to a room without telling anyone the password — and in a way that's mathematically impossible to fake. In our case: prove you own an NFT without revealing which wallet holds it. The circuit takes your private key as a secret input, derives your address using a Poseidon hash — a hash function designed for ZK systems — computes a commitment to your NFT ownership, and traverses an 8-level Merkle tree to prove your address is in the set of NFT holders. The output is just three elliptic curve points on the BN128 curve — about 200 bytes — which anybody can verify in under 10 milliseconds. The math is Groth16, a proof system built on bilinear pairings — it's used in Zcash, Tornado Cash, and zkSync. The key property: the proof reveals nothing about the private input, and it's computationally infeasible to forge."

*→ Show them: `circuits/circuits/nftOwnership.circom:14` (NFTOwnership template), `:16` (privateKey private input), `:27` (isValid output), `:38` (Num2Bits 252-bit constraint), `:39-40` (Poseidon address derivation), `:41` (Merkle hashers — 8 levels), `:46` (ownership commitment Poseidon)*
*→ Verification side: `backend/src/services/zkproof.service.ts:69` (verifyNFTOwnershipProof function), `:101` (snarkjs.groth16.verify call), `:186-208` (pi_a/pi_b/pi_c structure validation), `:220-263` (19 public signals + BN254 field size check at :249)*

---

**Q: What makes the smart contract secure?**
> "Three layers. First: all state-mutating functions — registering a DID, recording an authentication, issuing a credential — use OpenZeppelin v5's ReentrancyGuard. That prevents reentrancy attacks where a malicious caller re-enters the function mid-execution to drain state. Second: signature recovery uses OpenZeppelin's audited `ECDSA.recover()` and `MessageHashUtils.toEthSignedMessageHash()` — we don't implement cryptography ourselves, we use battle-tested audited code. Third: only the contract owner can record authentications and issue credentials. The DID registry is public-write for registration — any user can anchor their DID — but authentication state is owner-controlled, so the backend acts as the oracle and nobody can write false auth records."

*→ Show them: `contracts/contracts/DIDAuthRegistry.sol:6-7` (OpenZeppelin imports), `:15-16` (ReentrancyGuard inheritance + ECDSA using statement), `:85` (registerDID), `:115` (recordAuthentication — owner-only), `:144` (verifyAuthentication — ECDSA.recover), `:65` (CHALLENGE_VALIDITY = 300 seconds)*

---

**Q: How is the private key protected on the phone?**
> "We use Expo SecureStore — on Android this maps directly to the Android Keystore system, which is hardware-backed on modern devices using a dedicated security chip. On iOS it maps to the Secure Enclave. The key is a 32-byte Ethereum private key generated locally at wallet creation using ethers.js v6's `Wallet.createRandom()` — cryptographically secure random generation. It's stored encrypted, hardware-backed where available, and it has never left the device. For ZK proof generation, we derive a separate ZK-specific private key from the main Ethereum key — so even if somehow the proof generation process was compromised, the main signing key remains protected."

*→ Show them: `wallet/src/services/storage.ts:2` (SecureStore import), `:34-35` (SecureStore write), `:38-39` (AsyncStorage fallback with warning)*
*→ Key generation: `wallet/src/services/wallet.ts:437` (Wallet.createRandom()), `:473` (did:ethr: DID construction)*
*→ ZK key isolation: `wallet/src/services/zkp/zkProver.ts:33` (ZKProverService class), `:106-107` (derived ZK private key — separate from main key), `:130-133` (groth16.prove call)*

---

**Q: What does the JWT contain?**
> "Our JWT uses HS256 — HMAC-SHA256. The payload follows the W3C Verifiable Credentials format embedded in a JWT: the issuer DID, subject DID, a UUID credential ID, not-before and expiration timestamps, and a `vc` claim containing the credential subject — which includes employee ID, name, badge, permissions array, a hash ID for tamper detection, and the on-chain DID registration transaction hash so you can verify the identity was actually anchored on-chain. After a selective disclosure login, the JWT also carries `disclosedClaims`, `disclosedClaimsVerified`, and `disclosedClaimsBindingDigest` — so downstream services can see exactly what was verified and how."

*→ Show them: `backend/src/services/vcJwt.service.ts:31` (issueEmploymentVcJwt function), `:42-58` (vc claim with @context and W3C structure), `:49-57` (credentialSubject — employeeId, name, badge, permissions, hashId, didRegistrationTxHash), `:62` (HS256 algorithm)*

---

**Q: What's the AI doing specifically?**
> "Two things. For anomaly detection: our auth timeline emits 8 types of events — challenge created and expired, verification attempted and succeeded and failed, token verification, session status checks. We run pattern detection across the recent event window looking for: 3 or more failures from the same address in 10 minutes — flagged HIGH; any challenge replay attempt — flagged CRITICAL; simultaneous authentication of the same DID across multiple verifiers — flagged MEDIUM; auth events at unusual hours and rapid challenge creation that looks like brute force — flagged LOW and HIGH respectively. We send the detected pattern list to Claude, which generates a plain English paragraph explaining what it found and what it means in practice. The risk score is 0 to 100.
>
> For natural language query: we send the user's question plus the `AuthTimelineFilters` schema to Claude as a system prompt. It returns structured JSON — DID, status, event type, date range — we pass that to our timeline service, get the events, pass the results back to Claude for a one-line summary, and render everything. No query language. Non-technical admins can use it."

*→ Timeline event types: `backend/src/services/authTimeline.service.ts:1-9` (all 8 AuthTimelineEventType definitions), `:101` (addAuthTimelineEvent — where events are emitted)*
*→ Timeline API: `backend/src/routes/auth.ts:671` (GET /timeline with filters), `:754` (GET /timeline/me — token-bound user view), `:79` (CHALLENGE_EXPIRY_TIME constant)*
*→ AI endpoints (to be built): `POST /api/ai/analyze-timeline` and `POST /api/ai/query` — see HACKATHON_PREP.md for full spec*

---

**Q: Can this scale?**
> "The smart contract scales with Ethereum — it's just mappings, standard Solidity storage patterns. The backend is stateless — every request is independently verifiable, no session state on the Node process itself. Challenge storage already has a Redis backend wired in — you set `CHALLENGE_STORAGE_TYPE=redis` and a `REDIS_URL` and it switches automatically, in-memory is just the local dev fallback. The auth timeline's durable storage migration is planned — right now it's in-memory which is fine for demo and small orgs. For production you add a database, the query interface stays the same. The ZK proof generation is on-device so it doesn't scale with backend traffic at all."

*→ Show them: `backend/src/services/challengeStorage.service.ts` (Redis abstraction — CHALLENGE_STORAGE_TYPE env switch), `backend/src/services/redis.service.ts` (ioredis integration)*
*→ On-chain storage: `contracts/contracts/DIDAuthRegistry.sol:66-67` (totalRegistrations + totalAuthentications counters — simple uint256 mappings, trivially scales with Ethereum)*

---

**Q: Why Ethereum? Why not Solana or Polygon?**
> "The `did:ethr` method — the DID method we use — is the most widely deployed DID method in production. It has the most mature tooling: ethr-did library, universal DID resolver, integration with the broader VC ecosystem. Sepolia is the current canonical Ethereum testnet with full Etherscan support. Moving to Polygon, Optimism, or any EVM chain is a one-line config change — we just update the RPC URL and chain ID. The contracts are standard Solidity, no chain-specific opcodes. We chose Ethereum first because the identity tooling is most mature there."

---

**Q: What's a Verifiable Credential?**
> "Think of it as a tamper-evident digital certificate. It has an issuer — identified by their DID — a subject — also identified by their DID — a set of claims about the subject, and a cryptographic signature from the issuer that makes it tamper-evident. We follow the W3C VC Data Model v1, the same standard used by the EU Digital Identity Wallet and most enterprise SSI systems. Our credentials carry employment data — employee ID, name, badge, role, permissions. They have a lifecycle — they can be revoked by the issuer, they expire on a date, and we check status on every authentication. The credential never needs to go back to the issuer to be verified — the signature is self-contained."

*→ Show them: `backend/src/services/credentialStatus.service.ts:4` (4 lifecycle states: active/revoked/expired/unknown), `:156` (revokeCredential function), `:214` (expiry check)*
*→ Issuer trust: `backend/src/services/issuerTrust.service.ts:38-52` (trusted issuers list from env), `:50` (strictIssuerTrust flag), `:54` (evaluateIssuerTrust — called on every login)*

---

**Q: What's selective disclosure?**
> "Normally a credential is all-or-nothing — share the whole thing or nothing. Selective disclosure lets you share only specific claims. Our verifier profile system defines a policy: 'this portal only needs employee ID and role'. When you authenticate, your wallet extracts just those two fields from your credential. But it also cryptographically binds them to the specific challenge — it takes a SHA256 of the challenge nonce plus a digest of the disclosed claims, signs that binding with your wallet key, and sends the binding proof with the claims. The backend verifies the binding proof before issuing a token. So an attacker who captures your disclosed claims from one login cannot replay them against a different challenge — they'd need your private key to generate a valid binding for the new nonce."

*→ Show them: `backend/src/routes/auth.ts:81-82` (DISCLOSURE_BINDING_VERSION + DISCLOSURE_BINDING_PREFIX constants), `:95-104` (DisclosedClaimsProofPayload interface), `:278` (parseDisclosedClaimsProof), `:323` (verifyDisclosedClaimsProof — main logic), `:349-355` (challenge digest check), `:357-363` (claims digest check), `:373-379` (binding digest computation), `:388-405` (signature verification against wallet key)*
*→ Claim keys in portal: `portal/src/EnterprisePortalProfessional.tsx:41` (VerifierClaimKey type — all 6 fields), `:143-150` (CLAIM_LABELS display map)*

---

## Code Map — Full Reference (open this in VS Code during the hackathon)

> Use `Ctrl+G` in VS Code to jump to any line number instantly. Keep this file open in a split pane.

---

### Smart Contracts
| What | File | Lines |
|---|---|---|
| ReentrancyGuard + ECDSA imports | `contracts/contracts/DIDAuthRegistry.sol` | 6–7 |
| Contract inherits ReentrancyGuard, uses ECDSA | `contracts/contracts/DIDAuthRegistry.sol` | 15–16 |
| DIDRegistered event | `contracts/contracts/DIDAuthRegistry.sol` | 20–24 |
| AuthenticationRecorded event | `contracts/contracts/DIDAuthRegistry.sol` | 26–31 |
| CHALLENGE_VALIDITY = 300s constant | `contracts/contracts/DIDAuthRegistry.sol` | 65 |
| totalRegistrations + totalAuthentications | `contracts/contracts/DIDAuthRegistry.sol` | 66–67 |
| registerDID function | `contracts/contracts/DIDAuthRegistry.sol` | 85 |
| recordAuthentication (owner-only) | `contracts/contracts/DIDAuthRegistry.sol` | 115 |
| verifyAuthentication (ECDSA.recover) | `contracts/contracts/DIDAuthRegistry.sol` | 144 |
| issueCredential (owner-only) | `contracts/contracts/DIDAuthRegistry.sol` | 181 |

---

### ZKP Circuit
| What | File | Lines |
|---|---|---|
| NFTOwnership template | `circuits/circuits/nftOwnership.circom` | 14 |
| privateKey private input signal | `circuits/circuits/nftOwnership.circom` | 16 |
| isValid output signal | `circuits/circuits/nftOwnership.circom` | 27 |
| Num2Bits(252) — private key constraint | `circuits/circuits/nftOwnership.circom` | 38 |
| Poseidon — public address derivation | `circuits/circuits/nftOwnership.circom` | 39–40 |
| Poseidon — 8-level Merkle tree hashers | `circuits/circuits/nftOwnership.circom` | 41 |
| Poseidon — ownership commitment | `circuits/circuits/nftOwnership.circom` | 46 |

---

### ZKP Verification (Backend)
| What | File | Lines |
|---|---|---|
| verifyNFTOwnershipProof function | `backend/src/services/zkproof.service.ts` | 69 |
| Verification key loading | `backend/src/services/zkproof.service.ts` | 28 |
| snarkjs.groth16.verify call | `backend/src/services/zkproof.service.ts` | 101 |
| pi_a / pi_b / pi_c structure validation | `backend/src/services/zkproof.service.ts` | 186–208 |
| 19 public signals validation | `backend/src/services/zkproof.service.ts` | 220–263 |
| BN254 field size constant | `backend/src/services/zkproof.service.ts` | 249 |

---

### Auth Endpoints (Backend)
| What | File | Lines |
|---|---|---|
| CHALLENGE_EXPIRY_TIME constant (10 min) | `backend/src/routes/auth.ts` | 79 |
| DISCLOSURE_BINDING_VERSION + PREFIX | `backend/src/routes/auth.ts` | 81–82 |
| DisclosedClaimsProofPayload interface | `backend/src/routes/auth.ts` | 95–104 |
| GET /challenge endpoint | `backend/src/routes/auth.ts` | 829 |
| POST /challenge endpoint | `backend/src/routes/auth.ts` | 854 |
| POST /verify endpoint | `backend/src/routes/auth.ts` | 1473 |
| GET /timeline endpoint | `backend/src/routes/auth.ts` | 671 |
| GET /timeline/me endpoint | `backend/src/routes/auth.ts` | 754 |
| parseDisclosedClaimsProof | `backend/src/routes/auth.ts` | 278 |
| verifyDisclosedClaimsProof | `backend/src/routes/auth.ts` | 323 |
| Challenge digest check | `backend/src/routes/auth.ts` | 349–355 |
| Claims digest check | `backend/src/routes/auth.ts` | 357–363 |
| Binding digest computation | `backend/src/routes/auth.ts` | 373–379 |
| Signature verification (wallet key) | `backend/src/routes/auth.ts` | 388–405 |

---

### Verifiable Credentials
| What | File | Lines |
|---|---|---|
| issueEmploymentVcJwt function | `backend/src/services/vcJwt.service.ts` | 31 |
| W3C vc claim with @context | `backend/src/services/vcJwt.service.ts` | 42–58 |
| credentialSubject (employeeId, name, badge, permissions) | `backend/src/services/vcJwt.service.ts` | 49–57 |
| HS256 algorithm | `backend/src/services/vcJwt.service.ts` | 62 |
| 4 lifecycle states (active/revoked/expired/unknown) | `backend/src/services/credentialStatus.service.ts` | 4 |
| revokeCredential function | `backend/src/services/credentialStatus.service.ts` | 156 |
| Expiry check | `backend/src/services/credentialStatus.service.ts` | 214 |
| evaluateIssuerTrust — called on every login | `backend/src/services/issuerTrust.service.ts` | 54 |
| Strict issuer trust flag | `backend/src/services/issuerTrust.service.ts` | 50 |
| Trusted issuers list from env | `backend/src/services/issuerTrust.service.ts` | 38–52 |

---

### Auth Timeline + AI
| What | File | Lines |
|---|---|---|
| All 8 AuthTimelineEventType definitions | `backend/src/services/authTimeline.service.ts` | 1–9 |
| addAuthTimelineEvent function | `backend/src/services/authTimeline.service.ts` | 101 |
| AuthTimelineFilters interface | `backend/src/services/authTimeline.service.ts` | 30–40 |

---

### Mobile Wallet
| What | File | Lines |
|---|---|---|
| SecureStore import | `wallet/src/services/storage.ts` | 2 |
| SecureStore write (hardware-backed) | `wallet/src/services/storage.ts` | 34–35 |
| AsyncStorage fallback with warning | `wallet/src/services/storage.ts` | 38–39 |
| ethers Wallet.createRandom() | `wallet/src/services/wallet.ts` | 437 |
| did:ethr: DID construction | `wallet/src/services/wallet.ts` | 473 |
| ZKProverService class | `wallet/src/services/zkp/zkProver.ts` | 33 |
| generateProof function | `wallet/src/services/zkp/zkProver.ts` | 93 |
| ZK private key derivation (isolated from main key) | `wallet/src/services/zkp/zkProver.ts` | 106–107 |
| groth16.prove call (on-device) | `wallet/src/services/zkp/zkProver.ts` | 130–133 |

---

### Portal
| What | File | Lines |
|---|---|---|
| VerifierClaimKey type (all 6 selective disclosure fields) | `portal/src/EnterprisePortalProfessional.tsx` | 41 |
| CLAIM_LABELS display map | `portal/src/EnterprisePortalProfessional.tsx` | 143–150 |
| RoleGate import + usage | `portal/src/EnterprisePortalProfessional.tsx` | 7, 851 |
| ZKRoleGate import + usage | `portal/src/EnterprisePortalProfessional.tsx` | 8, 852, 1043 |
| RoleGate component definition | `portal/src/components/RoleGate.tsx` | 26 |
| ZKRoleGate component definition | `portal/src/components/ZKRoleGate.tsx` | 101 |

---

### Redis / Scalability
| What | File | Lines |
|---|---|---|
| Redis abstraction + CHALLENGE_STORAGE_TYPE env switch | `backend/src/services/challengeStorage.service.ts` | — |
| ioredis integration | `backend/src/services/redis.service.ts` | — |

---

## Body Language + Delivery Tips

- **Open the portal the moment a judge walks over.** They see it working before you explain anything.
- **Hand the phone to the judge.** Ask them to scan the QR code themselves. When *they* just logged in with your system, the demo lands differently.
- **On the ZKP step** — the proof takes a moment to generate on-device. Narrate it: "My phone is running the Groth16 circuit right now — Poseidon hashes, Merkle tree traversal, all on-device — the proof comes back as three elliptic curve points..."
- **Read the judge.** If they nod at "Groth16" and "BN128", go deep. If they look blank at "Zero-Knowledge Proof", pivot to the intuition version immediately.
- **Drop the contract address casually** when showing the portal: "you can verify this on Etherscan — `0x80c4...` — every DID registration is there." Judges who know blockchain will immediately respect that.
- **Don't rush the AI demo.** Type the NL query slowly so they can read it. The moment it returns a clean structured result from a plain English question is a strong wow moment.
- **End with a question back to the judge.** "Want to see the ZK proof generation again?" or "Want me to try a different query?" Keeps them at your table longer.
