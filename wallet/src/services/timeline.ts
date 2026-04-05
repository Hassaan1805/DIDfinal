import { StorageService } from './storage';

export interface AuthTimelineEvent {
  eventId: string;
  createdAt: string;
  eventType:
    | 'challenge_created'
    | 'challenge_expired'
    | 'verification_attempted'
    | 'verification_succeeded'
    | 'verification_failed'
    | 'token_verified'
    | 'token_verification_failed'
    | 'session_status_checked';
  status: 'success' | 'failure' | 'info';
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

export interface TimelineResponse {
  success: boolean;
  data: {
    filters: Record<string, unknown>;
    events: AuthTimelineEvent[];
    pagination: {
      limit: number;
      cursor: number;
      returned: number;
      total: number;
      hasMore: boolean;
      nextCursor: number;
    };
    summary: {
      total: number;
      success: number;
      failure: number;
      info: number;
      lastEventAt: string | null;
    };
  };
  timestamp: string;
}

export const timelineService = {
  async getMyTimeline(
    limit: number = 50,
    cursor?: number,
    eventType?: string,
    status?: string
  ): Promise<TimelineResponse> {
    const history = await StorageService.getAuthHistory();

    // Map local auth records to the AuthTimelineEvent shape
    let events: AuthTimelineEvent[] = history.map((record: any, index: number) => ({
      eventId: record.challengeId || `local-${index}`,
      createdAt: record.timestamp || new Date().toISOString(),
      eventType: (record.success ? 'verification_succeeded' : 'verification_failed') as AuthTimelineEvent['eventType'],
      status: (record.success ? 'success' : 'failure') as AuthTimelineEvent['status'],
      challengeId: record.challengeId,
      did: record.employeeDID,
    }));

    // Apply optional filters
    if (eventType) {
      events = events.filter(e => e.eventType === eventType);
    }
    if (status) {
      events = events.filter(e => e.status === status);
    }

    const startIndex = cursor ?? 0;
    const paginated = events.slice(startIndex, startIndex + limit);

    const summary = {
      total: events.length,
      success: events.filter(e => e.status === 'success').length,
      failure: events.filter(e => e.status === 'failure').length,
      info: events.filter(e => e.status === 'info').length,
      lastEventAt: events.length > 0 ? events[0].createdAt : null,
    };

    return {
      success: true,
      data: {
        filters: { eventType, status },
        events: paginated,
        pagination: {
          limit,
          cursor: startIndex,
          returned: paginated.length,
          total: events.length,
          hasMore: startIndex + limit < events.length,
          nextCursor: startIndex + limit,
        },
        summary,
      },
      timestamp: new Date().toISOString(),
    };
  },
};
