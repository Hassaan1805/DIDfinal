export type AuthTimelineEventType =
  | 'challenge_created'
  | 'challenge_expired'
  | 'verification_attempted'
  | 'verification_succeeded'
  | 'verification_failed'
  | 'token_verified'
  | 'token_verification_failed'
  | 'session_status_checked';

export type AuthTimelineEventStatus = 'success' | 'failure' | 'info';

export interface AuthTimelineEvent {
  eventId: string;
  createdAt: string;
  eventType: AuthTimelineEventType;
  status: AuthTimelineEventStatus;
  reason?: string;
  challengeId?: string;
  did?: string;
  userAddress?: string;
  employeeId?: string;
  companyId?: string;
  verifierId?: string;
  verifierOrganizationId?: string;
  verifierOrganizationName?: string;
  requestType?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthTimelineFilters {
  did?: string;
  userAddress?: string;
  employeeId?: string;
  companyId?: string;
  verifierId?: string;
  eventType?: AuthTimelineEventType;
  status?: AuthTimelineEventStatus;
  from?: string;
  to?: string;
}

const DEFAULT_MAX_EVENTS = 5000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_RETENTION_DAYS = 30;

const events: AuthTimelineEvent[] = [];

function parsePositiveInt(input: string | undefined, fallback: number): number {
  if (!input) {
    return fallback;
  }

  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function getMaxEvents(): number {
  return parsePositiveInt(process.env.AUTH_TIMELINE_MAX_EVENTS, DEFAULT_MAX_EVENTS);
}

function getRetentionDays(): number {
  return parsePositiveInt(process.env.AUTH_TIMELINE_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
}

function normalizeString(input: string | undefined): string | undefined {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAddress(value: string | undefined): string | undefined {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  return normalized.toLowerCase();
}

function pruneExpiredEvents(): void {
  const retentionDays = getRetentionDays();
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const eventTime = Date.parse(events[index].createdAt);
    if (Number.isNaN(eventTime) || eventTime < cutoffTime) {
      events.splice(index, 1);
    }
  }
}

export function addAuthTimelineEvent(input: Omit<AuthTimelineEvent, 'eventId' | 'createdAt'> & {
  createdAt?: string;
}): AuthTimelineEvent {
  pruneExpiredEvents();

  const createdAt = normalizeString(input.createdAt) || new Date().toISOString();
  const event: AuthTimelineEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    createdAt,
    eventType: input.eventType,
    status: input.status,
    reason: normalizeString(input.reason),
    challengeId: normalizeString(input.challengeId),
    did: normalizeString(input.did),
    userAddress: normalizeAddress(input.userAddress),
    employeeId: normalizeString(input.employeeId)?.toUpperCase(),
    companyId: normalizeString(input.companyId),
    verifierId: normalizeString(input.verifierId),
    verifierOrganizationId: normalizeString(input.verifierOrganizationId),
    verifierOrganizationName: normalizeString(input.verifierOrganizationName),
    requestType: normalizeString(input.requestType),
    metadata: input.metadata,
  };

  events.unshift(event);

  const maxEvents = getMaxEvents();
  if (events.length > maxEvents) {
    events.splice(maxEvents);
  }

  return event;
}

function withinDateRange(event: AuthTimelineEvent, filters: AuthTimelineFilters): boolean {
  const eventTime = Date.parse(event.createdAt);
  if (Number.isNaN(eventTime)) {
    return false;
  }

  if (filters.from) {
    const fromTime = Date.parse(filters.from);
    if (!Number.isNaN(fromTime) && eventTime < fromTime) {
      return false;
    }
  }

  if (filters.to) {
    const toTime = Date.parse(filters.to);
    if (!Number.isNaN(toTime) && eventTime > toTime) {
      return false;
    }
  }

  return true;
}

export function listAuthTimelineEvents(input: {
  filters?: AuthTimelineFilters;
  limit?: number;
  cursor?: number;
}): {
  events: AuthTimelineEvent[];
  total: number;
  returned: number;
  hasMore: boolean;
  nextCursor: number | null;
} {
  pruneExpiredEvents();

  const filters = input.filters || {};
  const did = normalizeString(filters.did);
  const userAddress = normalizeAddress(filters.userAddress);
  const employeeId = normalizeString(filters.employeeId)?.toUpperCase();
  const companyId = normalizeString(filters.companyId);
  const verifierId = normalizeString(filters.verifierId);

  const filtered = events.filter((event) => {
    if (did && event.did !== did) {
      return false;
    }

    if (userAddress && event.userAddress !== userAddress) {
      return false;
    }

    if (employeeId && event.employeeId !== employeeId) {
      return false;
    }

    if (companyId && event.companyId !== companyId) {
      return false;
    }

    if (verifierId && event.verifierId !== verifierId) {
      return false;
    }

    if (filters.eventType && event.eventType !== filters.eventType) {
      return false;
    }

    if (filters.status && event.status !== filters.status) {
      return false;
    }

    if (!withinDateRange(event, filters)) {
      return false;
    }

    return true;
  });

  const total = filtered.length;
  const limit = Math.min(Math.max(input.limit || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursor = Number.isFinite(input.cursor) && (input.cursor || 0) >= 0 ? Number(input.cursor) : 0;

  const result = filtered.slice(cursor, cursor + limit);
  const nextCursor = cursor + result.length;

  return {
    events: result,
    total,
    returned: result.length,
    hasMore: nextCursor < total,
    nextCursor: nextCursor < total ? nextCursor : null,
  };
}

export function summarizeAuthTimeline(input?: { filters?: AuthTimelineFilters }): {
  total: number;
  success: number;
  failure: number;
  info: number;
  lastEventAt: string | null;
} {
  const listing = listAuthTimelineEvents({
    filters: input?.filters,
    limit: getMaxEvents(),
    cursor: 0,
  });

  let success = 0;
  let failure = 0;
  let info = 0;

  for (const event of listing.events) {
    if (event.status === 'success') {
      success += 1;
    } else if (event.status === 'failure') {
      failure += 1;
    } else {
      info += 1;
    }
  }

  return {
    total: listing.total,
    success,
    failure,
    info,
    lastEventAt: listing.events[0]?.createdAt || null,
  };
}
