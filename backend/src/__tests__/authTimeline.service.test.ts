import {
  addAuthTimelineEvent,
  listAuthTimelineEvents,
  summarizeAuthTimeline,
  AuthTimelineEvent,
} from '../services/authTimeline.service';

describe('AuthTimeline Service', () => {
  test('should add an event and return it with generated fields', () => {
    const event = addAuthTimelineEvent({
      eventType: 'challenge_created',
      status: 'info',
      challengeId: 'ch-timeline-1',
      did: 'did:ethr:0x1234567890abcdef1234567890abcdef12345678',
    });

    expect(event.eventId).toBeDefined();
    expect(event.eventId).toMatch(/^evt_/);
    expect(event.createdAt).toBeDefined();
    expect(event.eventType).toBe('challenge_created');
    expect(event.status).toBe('info');
    expect(event.challengeId).toBe('ch-timeline-1');
  });

  test('should normalize addresses to lowercase', () => {
    const event = addAuthTimelineEvent({
      eventType: 'verification_succeeded',
      status: 'success',
      userAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
    });

    expect(event.userAddress).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
  });

  test('should normalize employee IDs to uppercase', () => {
    const event = addAuthTimelineEvent({
      eventType: 'verification_succeeded',
      status: 'success',
      employeeId: 'emp001',
    });

    expect(event.employeeId).toBe('EMP001');
  });

  test('should trim whitespace from string fields', () => {
    const event = addAuthTimelineEvent({
      eventType: 'challenge_created',
      status: 'info',
      did: '  did:ethr:0x1234567890abcdef1234567890abcdef12345678  ',
      reason: '  test reason  ',
    });

    expect(event.did).toBe('did:ethr:0x1234567890abcdef1234567890abcdef12345678');
    expect(event.reason).toBe('test reason');
  });

  test('should list events with default pagination', () => {
    // Add several events
    for (let i = 0; i < 5; i++) {
      addAuthTimelineEvent({
        eventType: 'verification_attempted',
        status: 'info',
        challengeId: `list-test-${i}`,
      });
    }

    const result = listAuthTimelineEvents({});
    expect(result.events.length).toBeGreaterThanOrEqual(5);
    expect(result.total).toBeGreaterThanOrEqual(5);
    expect(typeof result.returned).toBe('number');
    expect(typeof result.hasMore).toBe('boolean');
  });

  test('should filter events by DID', () => {
    const testDid = 'did:ethr:0xfiltertest1234567890abcdef12345678';
    addAuthTimelineEvent({
      eventType: 'verification_succeeded',
      status: 'success',
      did: testDid,
    });

    const result = listAuthTimelineEvents({
      filters: { did: testDid },
    });

    expect(result.events.length).toBeGreaterThanOrEqual(1);
    result.events.forEach((event) => {
      expect(event.did).toBe(testDid);
    });
  });

  test('should filter events by event type', () => {
    addAuthTimelineEvent({
      eventType: 'verification_failed',
      status: 'failure',
      reason: 'Invalid signature',
    });

    const result = listAuthTimelineEvents({
      filters: { eventType: 'verification_failed' },
    });

    expect(result.events.length).toBeGreaterThanOrEqual(1);
    result.events.forEach((event) => {
      expect(event.eventType).toBe('verification_failed');
    });
  });

  test('should filter events by status', () => {
    addAuthTimelineEvent({
      eventType: 'verification_succeeded',
      status: 'success',
    });

    const result = listAuthTimelineEvents({
      filters: { status: 'success' },
    });

    expect(result.events.length).toBeGreaterThanOrEqual(1);
    result.events.forEach((event) => {
      expect(event.status).toBe('success');
    });
  });

  test('should respect limit parameter', () => {
    const result = listAuthTimelineEvents({ limit: 2 });
    expect(result.returned).toBeLessThanOrEqual(2);
  });

  test('should support cursor-based pagination', () => {
    // Add enough events
    for (let i = 0; i < 5; i++) {
      addAuthTimelineEvent({
        eventType: 'challenge_created',
        status: 'info',
        challengeId: `pagination-${i}`,
      });
    }

    const page1 = listAuthTimelineEvents({ limit: 3, cursor: 0 });
    expect(page1.returned).toBeLessThanOrEqual(3);

    if (page1.hasMore && page1.nextCursor !== null) {
      const page2 = listAuthTimelineEvents({ limit: 3, cursor: page1.nextCursor });
      expect(page2.returned).toBeGreaterThanOrEqual(1);
    }
  });

  test('should order events newest first', () => {
    addAuthTimelineEvent({
      eventType: 'challenge_created',
      status: 'info',
      challengeId: 'order-first',
    });

    addAuthTimelineEvent({
      eventType: 'verification_succeeded',
      status: 'success',
      challengeId: 'order-second',
    });

    const result = listAuthTimelineEvents({});
    if (result.events.length >= 2) {
      const first = new Date(result.events[0].createdAt).getTime();
      const second = new Date(result.events[1].createdAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });

  test('summarizeAuthTimeline should return correct counts', () => {
    addAuthTimelineEvent({ eventType: 'verification_succeeded', status: 'success' });
    addAuthTimelineEvent({ eventType: 'verification_failed', status: 'failure' });
    addAuthTimelineEvent({ eventType: 'challenge_created', status: 'info' });

    const summary = summarizeAuthTimeline();
    expect(summary.total).toBeGreaterThanOrEqual(3);
    expect(summary.success).toBeGreaterThanOrEqual(1);
    expect(summary.failure).toBeGreaterThanOrEqual(1);
    expect(summary.info).toBeGreaterThanOrEqual(1);
    expect(summary.lastEventAt).toBeDefined();
  });

  test('should handle metadata field', () => {
    const event = addAuthTimelineEvent({
      eventType: 'verification_succeeded',
      status: 'success',
      metadata: { ip: '127.0.0.1', userAgent: 'TestAgent/1.0' },
    });

    expect(event.metadata).toEqual({ ip: '127.0.0.1', userAgent: 'TestAgent/1.0' });
  });

  test('should handle empty/undefined optional fields gracefully', () => {
    const event = addAuthTimelineEvent({
      eventType: 'challenge_created',
      status: 'info',
      did: '',
      reason: '   ',
    });

    expect(event.did).toBeUndefined();
    expect(event.reason).toBeUndefined();
  });
});
