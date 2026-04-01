export type AuthTimelineEventType = 'challenge_created' | 'challenge_expired' | 'verification_attempted' | 'verification_succeeded' | 'verification_failed' | 'token_verified' | 'token_verification_failed' | 'session_status_checked';
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
export declare function addAuthTimelineEvent(input: Omit<AuthTimelineEvent, 'eventId' | 'createdAt'> & {
    createdAt?: string;
}): AuthTimelineEvent;
export declare function listAuthTimelineEvents(input: {
    filters?: AuthTimelineFilters;
    limit?: number;
    cursor?: number;
}): {
    events: AuthTimelineEvent[];
    total: number;
    returned: number;
    hasMore: boolean;
    nextCursor: number | null;
};
export declare function summarizeAuthTimeline(input?: {
    filters?: AuthTimelineFilters;
}): {
    total: number;
    success: number;
    failure: number;
    info: number;
    lastEventAt: string | null;
};
//# sourceMappingURL=authTimeline.service.d.ts.map