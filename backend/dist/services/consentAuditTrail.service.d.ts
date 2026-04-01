import type { EnrollmentDecision } from './identityProfile.service';
export interface ConsentAuditEvent {
    auditId: string;
    createdAt: string;
    requestId: string;
    did: string;
    decision: EnrollmentDecision;
    decidedAt?: string;
    requesterOrganizationId: string;
    requesterOrganizationName: string;
    verifierId?: string;
    purpose: string;
    approvedClaims: string[];
    approvedProfileFields: string[];
    reason?: string;
    actorAddress?: string;
    actorChallengeId?: string;
    actorAction?: string;
}
export interface ConsentAuditFilters {
    did?: string;
    requestId?: string;
    requesterOrganizationId?: string;
    decision?: EnrollmentDecision;
    from?: string;
    to?: string;
}
export declare function isConsentAuditTrailEnabled(): boolean;
export declare function addConsentAuditEvent(input: Omit<ConsentAuditEvent, 'auditId' | 'createdAt'> & {
    createdAt?: string;
}): ConsentAuditEvent | null;
export declare function listConsentAuditEvents(input?: {
    filters?: ConsentAuditFilters;
    limit?: number;
    cursor?: number;
}): {
    events: ConsentAuditEvent[];
    total: number;
    returned: number;
    hasMore: boolean;
    nextCursor: number | null;
};
export declare function summarizeConsentAuditEvents(input?: {
    filters?: ConsentAuditFilters;
}): {
    total: number;
    approved: number;
    rejected: number;
    lastEventAt: string | null;
};
export declare function getConsentAuditConfiguration(): {
    enabled: boolean;
    storageFilePath: string;
    maxEvents: number;
};
//# sourceMappingURL=consentAuditTrail.service.d.ts.map