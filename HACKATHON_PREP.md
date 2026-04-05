# Hackathon Prep — KJ Somaiya Web3 Track
**Event:** Devfolio Hackathon @ KJ Somaiya Vidyavihar  
**Date:** April 11–12, 2026 (24 hours)  
**Track:** Web3 (+ AI hybrid angle)  
**Today:** April 5, 2026 — 6 days to go

---

## Project: Decentralized Trust Platform

Full-stack DID authentication system with:
- On-chain DID registry (Sepolia testnet)
- Challenge-response QR auth (portal → mobile wallet)
- Verifiable Credentials with selective disclosure
- Zero-Knowledge Proof premium content gating
- Audit timeline with suspicious pattern detection
- **[NEW — build during hackathon]** AI Anomaly Detection on auth timeline
- **[NEW — build during hackathon]** Natural Language DID Query via LLM

---

## Demo Setup (local is fine — in-person judging)

- Backend: `http://localhost:3001`
- Portal: `http://localhost:5173`
- Wallet: Expo Go on phone, same WiFi
- Blockchain: Sepolia (have Ganache as offline backup)

---

## Week Plan (April 5–10)

### Day 1 — April 5 (Today): Plan + Smoke Test
- [ ] Create this prep file ✅
- [ ] Run full end-to-end demo flow: portal → QR → wallet scan → auth → ZKP premium upgrade
- [ ] Fix any blockers found during smoke test
- [ ] Confirm Sepolia contract is live: `0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48`
- [ ] Confirm wallet connects over LAN (phone on same WiFi)

### Day 2 — April 6: Demo Flow Lock + Feature Design
- [ ] Second clean run of full demo — time it (target: 3 min demo)
- [ ] Design the two AI features (architecture decisions below)
- [ ] Decide: Claude API (claude-haiku-4-5) or local/mock LLM for hackathon
- [ ] Write the API contract for both new features before coding

### Day 3 — April 7: Build AI Feature 1 — Anomaly Detection
- [ ] Backend: `POST /api/ai/analyze-timeline` — runs pattern analysis on recent events
- [ ] Backend: anomaly scoring logic (rule-based + LLM explanation)
- [ ] Portal: Anomaly alert widget on dashboard
- [ ] Test with simulated suspicious events

### Day 4 — April 8: Build AI Feature 2 — Natural Language Query
- [ ] Backend: `POST /api/ai/query` — accepts `{ question: string }`, returns timeline results
- [ ] LLM layer: parse NL → timeline filters → call timeline service → return results
- [ ] Portal: NL query input box + results display on audit page
- [ ] Test with real queries

### Day 5 — April 9: Polish + Pitch Prep
- [ ] UI polish pass on portal (clean up any broken layouts, loading states)
- [ ] Remove certificate authenticator references from the portal nav (it's not part of the pitch)
- [ ] Prepare slide deck: 5 slides max (Problem / Solution / Architecture / Demo / Impact)
- [ ] Rehearse pitch using the script in `PITCH_SCRIPT.md`
- [ ] Full demo rehearsal with timing

### Day 6 — April 10: Final Check + Rest
- [ ] One final clean end-to-end demo run
- [ ] Confirm `.env` files are set with correct IP for the laptop you're bringing
- [ ] Charge phone, bring USB cable
- [ ] Pack: laptop charger, phone, USB-C cable, any HDMI adapter if pitching on screen
- [ ] Rest — don't code anything new today

---

## Hackathon Day Plan (April 11–12)

### Hour 0–2: Setup
- Get to venue, set up laptop
- Run `npm run start` and `npx expo start` — confirm everything works on venue WiFi
- If WiFi is unreliable, switch to Ganache (offline mode per SETUP.md)
- Update `PRIMARY_HOST_IP` in `.env.development` and `EXPO_PUBLIC_API_URL` in `wallet/.env` to venue IP

### Hour 2–18: Build + Polish
Focus exclusively on the two AI features if not already done pre-hackathon.
Do NOT rebuild anything that already works.

**AI Feature 1: Anomaly Detection**
See implementation plan below.

**AI Feature 2: Natural Language Query**
See implementation plan below.

### Hour 18–22: Integration + Testing
- Integrate both AI features into the portal UI
- Test the demo flow end-to-end with new features included
- Fix any bugs

### Hour 22–24: Submission
- Devfolio submission: project title, description, tech stack, screenshots/video
- GitHub repo: make sure it's public and README is clean
- Demo video: 2–3 min screen recording as backup (Devfolio usually requires it)

---

## Feature Implementation Plans

---

### Feature 1: AI Anomaly Detection on Auth Timeline

**What it does:**  
Analyzes recent auth events in real-time and flags suspicious patterns. Each anomaly gets a risk score and an AI-generated natural language explanation.

**Patterns to detect:**
| Pattern | Threshold | Risk Level |
|---|---|---|
| Multiple failed logins from same address | 3+ in 10 min | HIGH |
| Challenge replay attempt | Any | CRITICAL |
| Same DID auth'd from multiple verifiers simultaneously | 2+ concurrent | MEDIUM |
| Auth at unusual hour (2am–5am) | Any | LOW |
| Rapid successive challenges (brute force) | 5+ in 5 min | HIGH |

**Backend endpoint:**
```
POST /api/ai/analyze-timeline
Response: {
  riskScore: number (0-100),
  anomalies: [{ pattern, count, affectedDID, riskLevel, explanation }],
  summary: string (LLM-generated plain English summary),
  analyzedAt: ISO timestamp
}
```

**LLM role:**  
Rule-based logic detects the patterns. The LLM (claude-haiku-4-5) receives the detected anomaly list and generates a human-readable summary paragraph explaining what it found and what it means. This is fast, cheap, and impressive in a demo.

**Portal UI:**  
A risk banner at the top of the dashboard:
- Green: "No suspicious activity detected"
- Amber: "2 anomalies detected — review audit log"
- Red: "CRITICAL: Replay attack detected"

Click to expand and see each anomaly with the AI explanation.

---

### Feature 2: Natural Language DID Query

**What it does:**  
A search box on the audit page where you type plain English and get timeline results back.

**Example queries:**
- "Show me all failed logins this week"
- "Which DIDs authenticated with org EMP-CORP today?"
- "Were there any replay attacks in the last 24 hours?"
- "Show me successful logins after midnight"

**Backend endpoint:**
```
POST /api/ai/query
Body: { question: string, userContext?: { companyId, verifierId } }
Response: {
  parsedFilters: AuthTimelineFilters,
  events: AuthTimelineEvent[],
  naturalLanguageSummary: string,
  totalCount: number
}
```

**LLM role:**  
Send the question + available filter schema to Claude. It returns a JSON object of `AuthTimelineFilters`. Apply those filters to the timeline service, return the results + a plain English summary of what was found.

**System prompt for the LLM:**
```
You are an assistant that converts natural language questions into structured 
query filters for an authentication audit system. Extract filters from the question.
Available filters: did, userAddress, employeeId, companyId, verifierId, 
eventType (challenge_created|challenge_expired|verification_attempted|
verification_succeeded|verification_failed|token_verified|token_verification_failed|
session_status_checked), status (success|failure|info), from (ISO date), to (ISO date).
Return ONLY valid JSON matching the AuthTimelineFilters schema. No explanation.
```

**Portal UI:**  
- Search bar on the Audit Timeline page
- "Ask anything about your auth history..."
- Results render below in the existing event list format
- A one-line AI summary above the results: "Found 7 failed login attempts from DID:ethr:0x... in the last 24 hours"

---

## Pitch Strategy

**Track:** Web3 (but position as AI + Web3 — unique angle most teams won't have)

**Narrative:** Identity is the most broken part of Web2. Passwords get leaked, SSO means trusting Google/Facebook, and you have zero privacy. We built a system where *you* own your identity on the blockchain, authenticate without passwords, and prove things about yourself without revealing anything — using Zero-Knowledge Proofs.

**The killer demo moment:** The judge watches you open a QR code on the portal, scan it with a phone, and get logged in — no password, no Google, just a cryptographic signature. Then unlock premium content by proving NFT ownership without revealing the wallet address. That's the "wow" moment.

**The AI angle:** The same system that protects your identity also watches it. AI monitors every login, detects anomalies in real-time, and you can ask it anything in plain English.

See `PITCH_SCRIPT.md` for the full rehearsed script.

---

## Tech Stack Summary (for Devfolio submission)

- **Blockchain:** Ethereum Sepolia Testnet — DID Registry smart contract (Solidity + Hardhat)
- **Identity:** W3C DIDs (`did:ethr`), Verifiable Credentials (VC-JWT), Selective Disclosure
- **Zero-Knowledge Proofs:** Circom + SnarkJS (Groth16) — privacy-preserving NFT ownership
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + Vite + TypeScript
- **Mobile:** Expo React Native (iOS + Android)
- **AI:** Claude API (claude-haiku-4-5) — anomaly detection + NL query
- **Standards:** W3C DID Core, W3C VC Data Model, EIP-712

---

## Devfolio Submission Checklist
- [ ] Project title: "Decentralized Trust Platform"
- [ ] Tagline: "Own your identity. Prove anything. Share nothing."
- [ ] Description: 3–4 paragraphs (problem, solution, tech, AI angle)
- [ ] Tech stack tags: Ethereum, Solidity, React, Node.js, Zero Knowledge Proofs, AI
- [ ] GitHub repo link (public)
- [ ] Demo video (2–3 min)
- [ ] Screenshots: portal dashboard, QR auth, mobile wallet, anomaly dashboard, NL query

---

## Risk / Fallback Plan

| Risk | Mitigation |
|---|---|
| Venue WiFi breaks | Switch to Ganache offline mode |
| Sepolia RPC rate limit | Infura key in .env, have backup Alchemy key ready |
| Expo wallet can't connect | Use same hotspot from phone as WiFi |
| Claude API slow/down | Pre-cache demo responses, have mock fallback |
| Demo crashes mid-judge | Have a screen recording ready as backup |
