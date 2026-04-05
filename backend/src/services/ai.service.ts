import { GoogleGenerativeAI } from '@google/generative-ai';
import { listAuthTimelineEvents, AuthTimelineEvent, AuthTimelineFilters } from './authTimeline.service';

// ---------------------------------------------------------------------------
// Client initialisation
// ---------------------------------------------------------------------------

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Text model — used for explanations and summaries
const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// JSON model — forces application/json output, no markdown fences needed
const jsonModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: { responseMimeType: 'application/json' },
});

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DetectedAnomaly {
  pattern: string;
  count: number;
  affectedDIDs: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanation: string;
}

export interface AnomalyDetectionResult {
  riskScore: number;
  anomalies: DetectedAnomaly[];
  summary: string;
  analyzedAt: string;
}

export interface TimelineQueryResult {
  parsedFilters: AuthTimelineFilters;
  events: AuthTimelineEvent[];
  naturalLanguageSummary: string;
  totalCount: number;
}

// Internal — anomaly without explanation, before LLM enrichment
interface RawAnomaly {
  pattern: string;
  count: number;
  affectedDIDs: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ---------------------------------------------------------------------------
// LLM helpers
// ---------------------------------------------------------------------------

async function callText(prompt: string): Promise<string> {
  const result = await textModel.generateContent(prompt);
  const raw = result.response.text().trim();
  // Strip surrounding quotes that Gemini occasionally wraps around short responses
  return raw.replace(/^["']|["']$/g, '');
}

async function callJSON(prompt: string): Promise<unknown> {
  const result = await jsonModel.generateContent(prompt);
  return JSON.parse(result.response.text().trim());
}

// ---------------------------------------------------------------------------
// Risk score
// ---------------------------------------------------------------------------

const RISK_POINTS: Record<string, number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
};

function computeRiskScore(anomalies: RawAnomaly[]): number {
  const total = anomalies.reduce((sum, a) => sum + (RISK_POINTS[a.riskLevel] ?? 0), 0);
  return Math.min(total, 100);
}

// ---------------------------------------------------------------------------
// Rule-based anomaly detection (no LLM)
// ---------------------------------------------------------------------------

function detectAnomalies(events: AuthTimelineEvent[]): RawAnomaly[] {
  const anomalies: RawAnomaly[] = [];

  // Sort ascending by time — required for correct sliding-window logic
  const sorted = [...events].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

  // ── Rule 1: Multiple failed logins from same address (3+ in 10 min) ────────
  const failedByAddress = new Map<string, AuthTimelineEvent[]>();
  for (const e of sorted) {
    if (e.eventType === 'verification_failed' && e.status === 'failure' && e.userAddress) {
      const list = failedByAddress.get(e.userAddress) ?? [];
      list.push(e);
      failedByAddress.set(e.userAddress, list);
    }
  }
  const rule1Addresses: string[] = [];
  const rule1DIDs = new Set<string>();
  for (const [addr, evts] of failedByAddress) {
    for (let i = 0; i <= evts.length - 3; i++) {
      const span = Date.parse(evts[i + 2].createdAt) - Date.parse(evts[i].createdAt);
      if (span <= 10 * 60 * 1000) {
        rule1Addresses.push(addr);
        evts.forEach(e => { if (e.did) rule1DIDs.add(e.did); });
        break;
      }
    }
  }
  if (rule1Addresses.length > 0) {
    anomalies.push({
      pattern: 'Multiple failed logins from same address',
      count: rule1Addresses.length,
      affectedDIDs: [...rule1DIDs],
      riskLevel: 'HIGH',
    });
  }

  // ── Rule 2: Challenge replay attempt ────────────────────────────────────────
  const replayEvents = sorted.filter(
    e =>
      e.eventType === 'verification_failed' &&
      e.reason != null &&
      /replay|expired challenge/i.test(e.reason),
  );
  if (replayEvents.length > 0) {
    anomalies.push({
      pattern: 'Challenge replay attempt',
      count: replayEvents.length,
      affectedDIDs: [...new Set(replayEvents.map(e => e.did).filter(Boolean) as string[])],
      riskLevel: 'CRITICAL',
    });
  }

  // ── Rule 3: Same DID used across 2+ verifiers ───────────────────────────────
  const verifiersByDID = new Map<string, Set<string>>();
  for (const e of sorted) {
    if (
      (e.eventType === 'verification_succeeded' || e.eventType === 'token_verified') &&
      e.did &&
      e.verifierId
    ) {
      const set = verifiersByDID.get(e.did) ?? new Set<string>();
      set.add(e.verifierId);
      verifiersByDID.set(e.did, set);
    }
  }
  const multiVerifierDIDs = [...verifiersByDID.entries()]
    .filter(([, s]) => s.size >= 2)
    .map(([did]) => did);
  if (multiVerifierDIDs.length > 0) {
    anomalies.push({
      pattern: 'Same DID authenticated from multiple verifiers',
      count: multiVerifierDIDs.length,
      affectedDIDs: multiVerifierDIDs,
      riskLevel: 'MEDIUM',
    });
  }

  // ── Rule 4: Auth at unusual hour (2 am – 5 am UTC) ──────────────────────────
  const unusualHour = sorted.filter(e => {
    const h = new Date(e.createdAt).getUTCHours();
    return h >= 2 && h <= 4;
  });
  if (unusualHour.length > 0) {
    anomalies.push({
      pattern: 'Authentication at unusual hour (2 am–5 am UTC)',
      count: unusualHour.length,
      affectedDIDs: [...new Set(unusualHour.map(e => e.did).filter(Boolean) as string[])],
      riskLevel: 'LOW',
    });
  }

  // ── Rule 5: Rapid successive challenges — brute force (5+ in 5 min) ─────────
  const challengesByAddress = new Map<string, AuthTimelineEvent[]>();
  for (const e of sorted) {
    if (e.eventType === 'challenge_created' && e.userAddress) {
      const list = challengesByAddress.get(e.userAddress) ?? [];
      list.push(e);
      challengesByAddress.set(e.userAddress, list);
    }
  }
  const rule5Addresses: string[] = [];
  const rule5DIDs = new Set<string>();
  for (const [addr, evts] of challengesByAddress) {
    for (let i = 0; i <= evts.length - 5; i++) {
      const span = Date.parse(evts[i + 4].createdAt) - Date.parse(evts[i].createdAt);
      if (span <= 5 * 60 * 1000) {
        rule5Addresses.push(addr);
        evts.forEach(e => { if (e.did) rule5DIDs.add(e.did); });
        break;
      }
    }
  }
  if (rule5Addresses.length > 0) {
    anomalies.push({
      pattern: 'Rapid successive challenges (potential brute force)',
      count: rule5Addresses.length,
      affectedDIDs: [...rule5DIDs],
      riskLevel: 'HIGH',
    });
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// Feature 1: Anomaly Detection
// ---------------------------------------------------------------------------

export async function analyzeTimeline(input: {
  companyId?: string;
  verifierId?: string;
  windowMinutes?: number;
}): Promise<AnomalyDetectionResult> {
  const windowMinutes = input.windowMinutes ?? 60;
  const from = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { events } = listAuthTimelineEvents({
    filters: { companyId: input.companyId, verifierId: input.verifierId, from },
    limit: 200,
  });

  const rawAnomalies = detectAnomalies(events);
  const riskScore = computeRiskScore(rawAnomalies);

  let enrichedAnomalies: DetectedAnomaly[] = rawAnomalies.map(a => ({
    ...a,
    explanation: '',
  }));
  let summary = '';

  try {
    if (rawAnomalies.length === 0) {
      summary = await callText(
        `You are a security analyst for a blockchain authentication system. ` +
        `In the last ${windowMinutes} minutes, ${events.length} authentication events were analyzed ` +
        `and no anomalies were detected. Write one reassuring sentence confirming normal activity.`,
      );
    } else {
      const forPrompt = rawAnomalies.map(a => ({
        pattern: a.pattern,
        count: a.count,
        riskLevel: a.riskLevel,
        affectedDIDCount: a.affectedDIDs.length,
      }));

      const prompt =
        `You are a security analyst for a blockchain-based decentralized identity authentication system. ` +
        `The following anomalies were detected in the last ${windowMinutes} minutes across ${events.length} total events:\n\n` +
        `${JSON.stringify(forPrompt, null, 2)}\n\n` +
        `For each anomaly provide a one-sentence plain English explanation of what it means and why it is a security concern. ` +
        `Also write a short paragraph (2-3 sentences) summarizing the overall security situation.\n\n` +
        `Respond in this exact JSON format:\n` +
        `{"explanations":[{"pattern":"...","explanation":"..."}],"summary":"..."}`;

      const parsed = (await callJSON(prompt)) as {
        explanations: Array<{ pattern: string; explanation: string }>;
        summary: string;
      };

      enrichedAnomalies = rawAnomalies.map(a => {
        const match = parsed.explanations?.find(e => e.pattern === a.pattern);
        return { ...a, explanation: match?.explanation ?? 'No explanation available.' };
      });
      summary = parsed.summary ?? 'Analysis complete.';
    }
  } catch (err) {
    console.error('[ai.service] Gemini enrichment failed:', err);
    enrichedAnomalies = rawAnomalies.map(a => ({
      ...a,
      explanation: 'AI explanation unavailable.',
    }));
    summary =
      rawAnomalies.length > 0
        ? `${rawAnomalies.length} anomaly pattern(s) detected. Risk score: ${riskScore}/100. AI summary unavailable.`
        : 'No anomalies detected. AI summary unavailable.';
  }

  return { riskScore, anomalies: enrichedAnomalies, summary, analyzedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Feature 2: Natural Language Timeline Query
// ---------------------------------------------------------------------------

function buildNLFilterPrompt(question: string, contextHint: string): string {
  const now = new Date().toISOString();
  return (
    `You convert natural language questions into JSON query filters for an auth audit system.\n` +
    `Current UTC time: ${now}\n\n` +
    `Available filter fields (all optional):\n` +
    `  did          — string\n` +
    `  userAddress  — string\n` +
    `  employeeId   — string\n` +
    `  companyId    — string\n` +
    `  verifierId   — string\n` +
    `  eventType    — one of: challenge_created, challenge_expired, verification_attempted,\n` +
    `                  verification_succeeded, verification_failed, token_verified,\n` +
    `                  token_verification_failed, session_status_checked\n` +
    `  status       — one of: success, failure, info\n` +
    `  from         — ISO 8601 date string (start of range)\n` +
    `  to           — ISO 8601 date string (end of range)\n\n` +
    `RULES:\n` +
    `- Return a flat JSON object with ONLY the fields that apply. No wrapper key.\n` +
    `- Example for "failed logins last 24 hours": {"eventType":"verification_failed","status":"failure","from":"<24h ago ISO>"}\n` +
    `- Do NOT include explanations, markdown, or extra keys.\n\n` +
    `Question: ${question}${contextHint}`
  );
}

export async function queryTimeline(input: {
  question: string;
  context?: { companyId?: string; verifierId?: string };
}): Promise<TimelineQueryResult> {
  let parsedFilters: AuthTimelineFilters = {};

  // Step 1: LLM extracts filters from the question
  try {
    const contextHint =
      input.context?.companyId
        ? `\nContext: companyId = "${input.context.companyId}"` +
          (input.context.verifierId ? `, verifierId = "${input.context.verifierId}"` : '')
        : '';

    const filterPrompt = buildNLFilterPrompt(input.question, contextHint);
    const raw = (await callJSON(filterPrompt)) as Record<string, unknown>;

    // Sanitise: if the model returned { filters: {...} } instead of flat object, unwrap it
    const flat: Record<string, unknown> =
      raw && typeof raw === 'object' && !Array.isArray(raw) && raw['filters'] && typeof raw['filters'] === 'object'
        ? (raw['filters'] as Record<string, unknown>)
        : raw;

    // Only keep known AuthTimelineFilters keys — discard any hallucinated fields
    const allowed = new Set(['did', 'userAddress', 'employeeId', 'companyId', 'verifierId', 'eventType', 'status', 'from', 'to']);
    parsedFilters = Object.fromEntries(
      Object.entries(flat).filter(([k]) => allowed.has(k)),
    ) as AuthTimelineFilters;
  } catch (err) {
    console.error('[ai.service] Filter extraction failed, using empty filters:', err);
    parsedFilters = {};
  }

  // Step 2: Force-inject trusted context values — prevents prompt injection via question field
  if (input.context?.companyId) parsedFilters.companyId = input.context.companyId;
  if (input.context?.verifierId) parsedFilters.verifierId = input.context.verifierId;

  // Step 3: Fetch matching events
  const { events, total } = listAuthTimelineEvents({ filters: parsedFilters, limit: 50 });

  // Step 4: LLM generates a natural language summary
  let naturalLanguageSummary: string;

  if (events.length === 0) {
    naturalLanguageSummary = 'No events matched your query.';
  } else {
    try {
      // Strip metadata to reduce token usage
      const slim = events.map(({ metadata: _m, ...rest }) => rest);
      const summaryPrompt =
        `You are an authentication audit assistant. ` +
        `A user asked: "${input.question}"\n\n` +
        `Here are the ${events.length} matching events (of ${total} total):\n` +
        `${JSON.stringify(slim, null, 2)}\n\n` +
        `Write one concise sentence summarising what was found.`;

      naturalLanguageSummary = await callText(summaryPrompt);
    } catch (err) {
      console.error('[ai.service] Summary generation failed:', err);
      naturalLanguageSummary = `Found ${events.length} event(s) matching your query.`;
    }
  }

  return { parsedFilters, events, naturalLanguageSummary, totalCount: total };
}
