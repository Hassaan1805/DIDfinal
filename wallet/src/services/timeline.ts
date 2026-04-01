import { networkService } from './network';

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
    const apiUrl = networkService.getApiUrl();
    
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor !== undefined) {
      params.append('cursor', cursor.toString());
    }
    if (eventType) {
      params.append('eventType', eventType);
    }
    if (status) {
      params.append('status', status);
    }

    const url = `${apiUrl}/auth/timeline/me?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as TimelineResponse;
  },
};
