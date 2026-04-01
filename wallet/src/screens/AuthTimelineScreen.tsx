import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { timelineService, AuthTimelineEvent } from '../services/timeline';
import { useWallet } from '../context/WalletContext';

type AuthTimelineScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AuthTimeline'>;

const BG = '#08080a';
const CARD = '#111115';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#475569';
const ACCENT = '#3b82f6';
const SUCCESS = '#22c55e';
const ERROR = '#ef4444';

const AuthTimelineScreen: React.FC = () => {
  const navigation = useNavigation<AuthTimelineScreenNavigationProp>();
  const { did, address } = useWallet();

  const [events, setEvents] = useState<AuthTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total: 0, success: 0, failure: 0, info: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadTimeline = useCallback(async () => {
    try {
      setError(null);
      const response = await timelineService.getMyTimeline(100);
      if (response.success) {
        setEvents(response.data.events);
        setSummary(response.data.summary);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      } else {
        setError('Failed to load timeline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTimeline();
  }, [loadTimeline]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return SUCCESS;
      case 'failure': return ERROR;
      case 'info':    return ACCENT;
      default:        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (status) {
      case 'success': return 'checkmark-circle';
      case 'failure': return 'close-circle';
      case 'info':    return 'information-circle';
      default:        return 'ellipse-outline';
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      challenge_created:        'Challenge Created',
      challenge_expired:        'Challenge Expired',
      verification_attempted:   'Verification Attempted',
      verification_succeeded:   'Verification Success',
      verification_failed:      'Verification Failed',
      token_verified:           'Token Verified',
      token_verification_failed: 'Token Failed',
      session_status_checked:   'Status Check',
    };
    return labels[eventType] || eventType;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1)    return 'Just now';
    if (diffMins < 60)   return `${diffMins}m ago`;
    if (diffHours < 24)  return `${diffHours}h ago`;
    if (diffDays < 7)    return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isSuspicious = (event: AuthTimelineEvent, index: number): boolean => {
    if (event.status === 'failure') {
      const recentFailures = events
        .slice(Math.max(0, index - 5), index + 1)
        .filter(e => e.status === 'failure' && e.eventType.includes('verification'));
      if (recentFailures.length >= 3) return true;
    }
    if (event.eventType === 'challenge_expired' && event.metadata?.expiredReason === 'replay') return true;
    if (event.eventType === 'verification_failed' && event.reason?.includes('verifier mismatch')) return true;
    return false;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIconRing}>
          <Ionicons name="warning-outline" size={36} color="#ef4444" />
        </View>
        <Text style={styles.errorTitle}>Failed to Load</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadTimeline}>
          <Ionicons name="refresh-outline" size={16} color="#fff" />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
      }
    >
      <Animated.View style={{ opacity: fadeAnim }}>

        {/* ── Summary Stats ── */}
        <View style={styles.summaryRow}>
          {[
            { label: 'Total', value: summary.total, color: TEXT_MUTED },
            { label: 'Success', value: summary.success, color: SUCCESS },
            { label: 'Failures', value: summary.failure, color: ERROR },
            { label: 'Info', value: summary.info, color: ACCENT },
          ].map(({ label, value, color }) => (
            <View key={label} style={[styles.statCard, value > 0 && { borderColor: color + '40' }]}>
              <Text style={[styles.statValue, { color: value > 0 ? color : TEXT_DIM }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Identity strip ── */}
        {(did || address) && (
          <View style={styles.identityStrip}>
            <Ionicons name="finger-print-outline" size={14} color={ACCENT} />
            <Text style={styles.identityText} numberOfLines={1}>
              {did ? `${did.slice(0, 32)}...` : address}
            </Text>
          </View>
        )}

        {/* ── Timeline Header ── */}
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Authentication History</Text>
          <View style={styles.eventCountBadge}>
            <Text style={styles.eventCountText}>{events.length} events</Text>
          </View>
        </View>

        {/* ── Empty State ── */}
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="time-outline" size={40} color="#334155" />
            </View>
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptySubtext}>
              Authentication activity will appear here after your first sign-in.
            </Text>
          </View>
        ) : (
          // Timeline with vertical line
          <View style={styles.timelineList}>
            {events.map((event, index) => {
              const suspicious = isSuspicious(event, index);
              const statusColor = getStatusColor(event.status);
              const isLast = index === events.length - 1;

              return (
                <View key={event.eventId} style={styles.timelineItem}>
                  {/* Vertical line */}
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: statusColor }]}>
                      <Ionicons name={getStatusIcon(event.status)} size={10} color="#fff" />
                    </View>
                    {!isLast && <View style={styles.timelineConnector} />}
                  </View>

                  {/* Event card */}
                  <View style={[
                    styles.eventCard,
                    suspicious && styles.eventCardSuspicious,
                  ]}>
                    {suspicious && (
                      <View style={styles.suspiciousBanner}>
                        <Ionicons name="warning-outline" size={13} color="#fbbf24" />
                        <Text style={styles.suspiciousText}>Suspicious Pattern Detected</Text>
                      </View>
                    )}

                    <View style={styles.eventTop}>
                      <Text style={styles.eventType}>{getEventTypeLabel(event.eventType)}</Text>
                      <Text style={styles.eventTime}>{formatTimestamp(event.createdAt)}</Text>
                    </View>

                    <View style={styles.eventMeta}>
                      <View style={[styles.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor + '50' }]}>
                        <Text style={[styles.statusPillText, { color: statusColor }]}>
                          {event.status.toUpperCase()}
                        </Text>
                      </View>

                      {event.verifierOrganizationName && (
                        <View style={styles.metaChip}>
                          <Ionicons name="business-outline" size={11} color={TEXT_DIM} />
                          <Text style={styles.metaChipText}>{event.verifierOrganizationName}</Text>
                        </View>
                      )}
                    </View>

                    {event.reason && (
                      <View style={styles.eventDetail}>
                        <Text style={styles.eventDetailLabel}>Reason</Text>
                        <Text style={styles.eventDetailValue}>{event.reason}</Text>
                      </View>
                    )}

                    {event.challengeId && (
                      <View style={styles.eventDetail}>
                        <Text style={styles.eventDetailLabel}>Challenge</Text>
                        <Text style={[styles.eventDetailValue, styles.mono]}>
                          {event.challengeId.substring(0, 16)}…
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 48 },

  // Loading / error
  centerContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: { fontSize: 15, color: TEXT_MUTED, marginTop: 8 },
  errorIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: TEXT_DIM, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Identity
  identityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  identityText: { fontSize: 11, color: TEXT_DIM, fontFamily: 'monospace', flex: 1 },

  // Timeline header
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timelineTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  eventCountBadge: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  eventCountText: { fontSize: 11, color: ACCENT, fontWeight: '700' },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#4b5563' },
  emptySubtext: { fontSize: 13, color: TEXT_DIM, textAlign: 'center', lineHeight: 18 },

  // Timeline list
  timelineList: { gap: 0 },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },

  // Timeline line
  timelineLine: {
    alignItems: 'center',
    width: 20,
    paddingTop: 14,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: BORDER,
    marginTop: 4,
    minHeight: 16,
  },

  // Event card
  eventCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  eventCardSuspicious: {
    borderColor: 'rgba(245,158,11,0.45)',
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  suspiciousBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  suspiciousText: { fontSize: 11, color: '#fbbf24', fontWeight: '700' },

  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventType: { fontSize: 14, fontWeight: '600', color: TEXT, flex: 1, paddingRight: 8 },
  eventTime: { fontSize: 11, color: TEXT_DIM, flexShrink: 0 },

  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metaChipText: { fontSize: 11, color: TEXT_DIM },

  eventDetail: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  eventDetailLabel: {
    fontSize: 11,
    color: TEXT_DIM,
    minWidth: 60,
    fontWeight: '600',
    paddingTop: 1,
  },
  eventDetailValue: { fontSize: 12, color: TEXT_MUTED, flex: 1 },
  mono: { fontFamily: 'monospace' },
});

export default AuthTimelineScreen;
