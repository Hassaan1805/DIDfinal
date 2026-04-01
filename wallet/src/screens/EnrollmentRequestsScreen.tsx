import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import { useNetwork } from '../context/NetworkContext';
import {
  EnrollmentRequest,
  EnrollmentRequestStatus,
  identityService,
} from '../services/identity';
import { StorageService } from '../services/storage';

const BG = '#08080a';
const CARD = '#111115';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#475569';
const ACCENT = '#3b82f6';
const ACCENT_LIGHT = '#60a5fa';
const SUCCESS = '#22c55e';
const ERROR = '#ef4444';
const WARNING = '#fbbf24';

const STATUS_FILTERS: Array<'all' | EnrollmentRequestStatus> = [
  'all', 'pending', 'approved', 'rejected', 'expired',
];

const STATUS_STYLES: Record<EnrollmentRequestStatus, { color: string; bg: string; border: string }> = {
  pending:  { color: WARNING, bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)' },
  approved: { color: SUCCESS, bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.3)' },
  rejected: { color: ERROR,   bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)' },
  expired:  { color: TEXT_DIM, bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
};

type RequestScopeSelection = { claims: string[]; profileFields: string[] };

interface ConsentReceiptRecord {
  requestId: string;
  did: string;
  decision: 'approved' | 'rejected';
  decidedAt: string;
  approvedClaims: string[];
  approvedProfileFields: string[];
  requesterOrganizationName: string;
  requesterOrganizationId: string;
  purpose: string;
  reason?: string;
}

function sanitizeFileSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'receipt';
}

function buildReceiptExportJson(receipt: ConsentReceiptRecord): string {
  return JSON.stringify({ exportType: 'consent-receipt', exportVersion: 1, exportedAt: new Date().toISOString(), receipt }, null, 2);
}

function dedupeItems(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter((v) => v.length > 0)));
}

const EnrollmentRequestsScreen: React.FC = () => {
  const { did, address, signMessage } = useWallet();
  const { isConnected } = useNetwork();

  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentRequestStatus>('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [scopeSelections, setScopeSelections] = useState<Record<string, RequestScopeSelection>>({});
  const [latestReceipt, setLatestReceipt] = useState<ConsentReceiptRecord | null>(null);
  const [consentHistory, setConsentHistory] = useState<ConsentReceiptRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isExportingReceipt, setIsExportingReceipt] = useState(false);

  const loadConsentHistory = useCallback(async () => {
    try {
      const stored = await StorageService.getConsentHistory();
      setConsentHistory(Array.isArray(stored) ? (stored as ConsentReceiptRecord[]) : []);
    } catch {
      setConsentHistory([]);
    }
  }, []);

  const syncScopeSelections = useCallback((nextRequests: EnrollmentRequest[]) => {
    setScopeSelections((prev) => {
      const next: Record<string, RequestScopeSelection> = {};
      for (const req of nextRequests) {
        if (req.status !== 'pending') continue;
        const rClaims = dedupeItems(req.requestedClaims);
        const rFields = dedupeItems(req.requestedProfileFields);
        const prior = prev[req.requestId];
        next[req.requestId] = {
          claims: prior ? rClaims.filter((c) => prior.claims.includes(c)) : rClaims,
          profileFields: prior ? rFields.filter((f) => prior.profileFields.includes(f)) : rFields,
        };
      }
      return next;
    });
  }, []);

  const toggleScopeSelection = useCallback(
    (requestId: string, scopeType: keyof RequestScopeSelection, value: string) => {
      setScopeSelections((prev) => {
        const cur = prev[requestId] || { claims: [], profileFields: [] };
        const vals = cur[scopeType];
        return {
          ...prev,
          [requestId]: {
            ...cur,
            [scopeType]: vals.includes(value) ? vals.filter((v) => v !== value) : [...vals, value],
          },
        };
      });
    },
    []
  );

  const loadRequests = useCallback(async () => {
    if (!did || !address) {
      setErrorMessage('Wallet DID or address not available.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      const result = await identityService.listEnrollmentRequests(
        did,
        statusFilter === 'all' ? undefined : statusFilter,
        { did, walletAddress: address, signMessage }
      );
      setRequests(result);
      syncScopeSelections(result);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to load enrollment requests.');
    } finally {
      setIsLoading(false);
    }
  }, [did, address, statusFilter, signMessage, syncScopeSelections]);

  React.useEffect(() => {
    if (!isConnected) return;
    void loadRequests();
  }, [isConnected, loadRequests]);

  React.useEffect(() => {
    void loadConsentHistory();
  }, [loadConsentHistory]);

  const applyDecision = async (request: EnrollmentRequest, decision: 'approved' | 'rejected') => {
    if (!did || !address) { setErrorMessage('Wallet DID or address not available.'); return; }

    const sel = scopeSelections[request.requestId];
    const approvedClaims = decision === 'approved' ? dedupeItems(sel?.claims || request.requestedClaims) : [];
    const approvedProfileFields = decision === 'approved' ? dedupeItems(sel?.profileFields || request.requestedProfileFields) : [];

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const updated = await identityService.decideEnrollmentRequest(
        {
          requestId: request.requestId,
          did,
          decision,
          approvedClaims,
          approvedProfileFields,
          reason: decision === 'approved' ? 'Approved in wallet' : 'Rejected in wallet',
        },
        { did, walletAddress: address, signMessage }
      );

      const receipt: ConsentReceiptRecord = {
        requestId: updated.requestId,
        did,
        decision,
        decidedAt: updated.decidedAt || updated.updatedAt || new Date().toISOString(),
        approvedClaims: updated.approvedClaims || [],
        approvedProfileFields: updated.approvedProfileFields || [],
        requesterOrganizationName: updated.requesterOrganizationName,
        requesterOrganizationId: updated.requesterOrganizationId,
        purpose: updated.purpose,
        reason: updated.decisionReason,
      };

      setLatestReceipt(receipt);
      try {
        await StorageService.addConsentRecord(receipt);
        await loadConsentHistory();
      } catch { /* keep UX resilient */ }

      setStatusMessage(`Request ${decision === 'approved' ? 'approved' : 'rejected'} successfully.`);
      await loadRequests();
    } catch (error: any) {
      setErrorMessage(error?.message || `Failed to ${decision} request.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportReceipt = useCallback(async (receipt: ConsentReceiptRecord) => {
    const fileName = `consent-receipt-${sanitizeFileSegment(receipt.requestId)}-${sanitizeFileSegment(receipt.decidedAt.replace(/[:.]/g, '-'))}.json`;
    const content = buildReceiptExportJson(receipt);
    setIsExportingReceipt(true);
    try {
      if (Platform.OS === 'web') {
        const g = globalThis as any;
        const blob = new g.Blob([content], { type: 'application/json;charset=utf-8' });
        const url = g.URL.createObjectURL(blob);
        const a = g.document.createElement('a');
        a.href = url; a.download = fileName;
        g.document.body.appendChild(a); a.click(); g.document.body.removeChild(a);
        g.URL.revokeObjectURL(url);
        setStatusMessage(`Exported: ${fileName}`);
      } else {
        await Share.share({ title: 'Consent Receipt', message: content });
        setStatusMessage('Receipt shared successfully.');
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Export failed.');
    } finally {
      setIsExportingReceipt(false);
    }
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadRequests} tintColor={ACCENT} />
      }
    >
      {/* ── Header Info ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="mail-outline" size={20} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Enrollment Inbox</Text>
            <Text style={styles.headerSubtitle}>Review and approve enrollment requests</Text>
          </View>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="wifi-outline" size={13} color={isConnected ? SUCCESS : ERROR} />
            <Text style={[styles.metaValue, { color: isConnected ? SUCCESS : ERROR }]}>
              {isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaCount}>
            {pendingCount} pending
          </Text>
        </View>

        <Text style={styles.didText} numberOfLines={1}>
          {did ? `${did.slice(0, 36)}...` : 'DID not available'}
        </Text>
      </View>

      {/* ── Filter Pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((filter) => {
          const active = filter === statusFilter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
              disabled={isSubmitting}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Status Messages ── */}
      {statusMessage ? (
        <View style={[styles.messageBanner, styles.successBanner]}>
          <Ionicons name="checkmark-circle-outline" size={15} color="#86efac" />
          <Text style={styles.successText}>{statusMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={[styles.messageBanner, styles.errorBanner]}>
          <Ionicons name="warning-outline" size={15} color="#fca5a5" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* ── Latest Receipt ── */}
      {latestReceipt ? (
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Ionicons name="document-text-outline" size={16} color="#86efac" />
            <Text style={styles.receiptTitle}>Consent Receipt</Text>
          </View>
          {[
            { label: 'Request ID', value: latestReceipt.requestId.slice(0, 20) + '...' },
            { label: 'Decision', value: latestReceipt.decision.toUpperCase() },
            { label: 'Time', value: new Date(latestReceipt.decidedAt).toLocaleString() },
            { label: 'Claims', value: latestReceipt.approvedClaims.join(', ') || 'None' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{label}</Text>
              <Text style={styles.receiptValue}>{value}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.exportBtn, isExportingReceipt && styles.btnDisabled]}
            onPress={() => exportReceipt(latestReceipt)}
            disabled={isExportingReceipt}
          >
            <Ionicons name="share-outline" size={15} color="#86efac" />
            <Text style={styles.exportBtnText}>
              {isExportingReceipt ? 'Exporting...' : 'Export Receipt JSON'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Consent History ── */}
      <View style={styles.historyCard}>
        <TouchableOpacity
          style={styles.historyHeaderRow}
          onPress={() => setShowHistory((p) => !p)}
        >
          <View style={styles.historyHeaderLeft}>
            <Ionicons name="archive-outline" size={15} color={TEXT_MUTED} />
            <Text style={styles.historyTitle}>Consent History</Text>
            {consentHistory.length > 0 && (
              <View style={styles.historyCountBadge}>
                <Text style={styles.historyCountText}>{consentHistory.length}</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={showHistory ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={16}
            color={ACCENT_LIGHT}
          />
        </TouchableOpacity>

        {consentHistory.length === 0 ? (
          <Text style={styles.historyEmpty}>No local receipts yet.</Text>
        ) : showHistory ? (
          consentHistory.slice(0, 8).map((rec) => (
            <View key={`${rec.requestId}-${rec.decidedAt}`} style={styles.historyItem}>
              <View style={styles.historyItemTop}>
                <Text style={styles.historyItemId} numberOfLines={1}>
                  {rec.requestId.slice(0, 20)}...
                </Text>
                <View style={[
                  styles.historyDecisionBadge,
                  { backgroundColor: rec.decision === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' },
                ]}>
                  <Text style={[
                    styles.historyDecisionText,
                    { color: rec.decision === 'approved' ? SUCCESS : ERROR },
                  ]}>
                    {rec.decision.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyItemOrg}>{rec.requesterOrganizationName}</Text>
              <Text style={styles.historyItemDate}>{new Date(rec.decidedAt).toLocaleString()}</Text>
              <TouchableOpacity
                style={[styles.smallExportBtn, isExportingReceipt && styles.btnDisabled]}
                onPress={() => exportReceipt(rec)}
                disabled={isExportingReceipt}
              >
                <Ionicons name="share-outline" size={12} color={ACCENT_LIGHT} />
                <Text style={styles.smallExportBtnText}>Export</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.historyHint}>Tap to show recent receipts</Text>
        )}
      </View>

      {/* ── Loading ── */}
      {isLoading && requests.length === 0 && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderText}>Loading requests...</Text>
        </View>
      )}

      {/* ── Empty state ── */}
      {!isLoading && requests.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="mail-open-outline" size={36} color="#334155" />
          </View>
          <Text style={styles.emptyTitle}>No Requests</Text>
          <Text style={styles.emptyText}>
            {statusFilter === 'all'
              ? 'No enrollment requests found.'
              : `No ${statusFilter} requests.`}
          </Text>
        </View>
      )}

      {/* ── Request Cards ── */}
      {requests.map((request) => {
        const st = STATUS_STYLES[request.status] || STATUS_STYLES.expired;
        const sel = scopeSelections[request.requestId] || {
          claims: dedupeItems(request.requestedClaims),
          profileFields: dedupeItems(request.requestedProfileFields),
        };
        const noScopes = sel.claims.length === 0 && sel.profileFields.length === 0;

        return (
          <View key={request.requestId} style={styles.requestCard}>
            {/* Request header */}
            <View style={styles.requestHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orgName}>{request.requesterOrganizationName}</Text>
                <Text style={styles.orgId} numberOfLines={1}>{request.requesterOrganizationId}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                <Text style={[styles.statusBadgeText, { color: st.color }]}>
                  {request.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Meta */}
            {[
              { icon: 'information-circle-outline' as const, label: 'Purpose', value: request.purpose },
              { icon: 'person-outline' as const, label: 'Verifier', value: request.verifierId || 'Not specified' },
              { icon: 'calendar-outline' as const, label: 'Created', value: new Date(request.createdAt).toLocaleDateString() },
              { icon: 'time-outline' as const, label: 'Expires', value: new Date(request.expiresAt).toLocaleDateString() },
            ].map(({ icon, label, value }) => (
              <View key={label} style={styles.requestMetaRow}>
                <Ionicons name={icon} size={13} color={TEXT_DIM} />
                <Text style={styles.requestMetaLabel}>{label}:</Text>
                <Text style={styles.requestMetaValue} numberOfLines={1}>{value}</Text>
              </View>
            ))}

            {/* Claims summary */}
            {(request.requestedClaims.length > 0 || request.requestedProfileFields.length > 0) && (
              <View style={styles.claimsSummary}>
                {request.requestedClaims.length > 0 && (
                  <View style={styles.claimsGroup}>
                    <Text style={styles.claimsGroupLabel}>Claims</Text>
                    <View style={styles.claimsChipRow}>
                      {request.requestedClaims.map((c) => (
                        <View key={c} style={styles.claimChip}>
                          <Text style={styles.claimChipText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {request.requestedProfileFields.length > 0 && (
                  <View style={styles.claimsGroup}>
                    <Text style={styles.claimsGroupLabel}>Profile Fields</Text>
                    <View style={styles.claimsChipRow}>
                      {request.requestedProfileFields.map((f) => (
                        <View key={f} style={styles.claimChip}>
                          <Text style={styles.claimChipText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Pending: scope selector + actions */}
            {request.status === 'pending' ? (
              <View style={styles.approvalSection}>
                <View style={styles.scopeBox}>
                  <View style={styles.scopeBoxHeader}>
                    <Ionicons name="options-outline" size={14} color={TEXT_MUTED} />
                    <Text style={styles.scopeBoxTitle}>Scope Selection</Text>
                    <Text style={styles.scopeBoxMeta}>
                      {sel.claims.length}/{request.requestedClaims.length} claims ·{' '}
                      {sel.profileFields.length}/{request.requestedProfileFields.length} fields
                    </Text>
                  </View>

                  {request.requestedClaims.length > 0 && (
                    <>
                      <Text style={styles.scopeSubLabel}>Claims</Text>
                      <View style={styles.scopeChipWrap}>
                        {request.requestedClaims.map((claim) => {
                          const selected = sel.claims.includes(claim);
                          return (
                            <TouchableOpacity
                              key={`${request.requestId}-c-${claim}`}
                              style={[styles.scopeChip, selected && styles.scopeChipSelected]}
                              onPress={() => toggleScopeSelection(request.requestId, 'claims', claim)}
                              disabled={isSubmitting}
                            >
                              {selected && <Ionicons name="checkmark-outline" size={11} color="#86efac" />}
                              <Text style={[styles.scopeChipText, selected && styles.scopeChipTextSelected]}>
                                {claim}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {request.requestedProfileFields.length > 0 && (
                    <>
                      <Text style={styles.scopeSubLabel}>Profile Fields</Text>
                      <View style={styles.scopeChipWrap}>
                        {request.requestedProfileFields.map((field) => {
                          const selected = sel.profileFields.includes(field);
                          return (
                            <TouchableOpacity
                              key={`${request.requestId}-f-${field}`}
                              style={[styles.scopeChip, selected && styles.scopeChipSelected]}
                              onPress={() => toggleScopeSelection(request.requestId, 'profileFields', field)}
                              disabled={isSubmitting}
                            >
                              {selected && <Ionicons name="checkmark-outline" size={11} color="#86efac" />}
                              <Text style={[styles.scopeChipText, selected && styles.scopeChipTextSelected]}>
                                {field}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {noScopes && (
                    <View style={styles.scopeWarning}>
                      <Ionicons name="warning-outline" size={13} color={WARNING} />
                      <Text style={styles.scopeWarningText}>
                        No scopes selected — approval will grant nothing.
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.approveBtn, isSubmitting && styles.btnDisabled]}
                    onPress={() => applyDecision(request, 'approved')}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="checkmark-outline" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>
                      {isSubmitting ? 'Processing...' : 'Approve Selected'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rejectBtn, isSubmitting && styles.btnDisabled]}
                    onPress={() => applyDecision(request, 'rejected')}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-outline" size={16} color="#fff" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.decisionInfo}>
                <Ionicons
                  name={
                    request.status === 'approved'
                      ? 'checkmark-circle-outline'
                      : request.status === 'rejected'
                      ? 'close-circle-outline'
                      : 'time-outline'
                  }
                  size={14}
                  color={st.color}
                />
                <Text style={[styles.decisionInfoText, { color: st.color }]}>
                  {request.status === 'approved'
                    ? `Approved: ${(request.approvedClaims || []).join(', ') || 'No claims'}`
                    : request.status === 'rejected'
                    ? `Rejected: ${request.decisionReason || 'No reason given'}`
                    : 'Request no longer actionable.'}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 48 },

  // Header
  headerCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    padding: 16,
    marginBottom: 14,
    gap: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  headerSubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  pendingBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '800', color: WARNING },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaValue: { fontSize: 12, fontWeight: '600' },
  metaDot: { color: TEXT_DIM, fontSize: 12 },
  metaCount: { fontSize: 12, color: TEXT_DIM },
  didText: { fontSize: 11, color: TEXT_DIM, fontFamily: 'monospace' },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14, paddingRight: 4 },
  filterChip: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterChipText: { fontSize: 11, color: TEXT_MUTED, fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },

  // Messages
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  successBanner: { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.28)' },
  errorBanner: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.28)' },
  successText: { fontSize: 13, color: '#86efac', flex: 1 },
  errorText: { fontSize: 13, color: '#fca5a5', flex: 1 },

  // Receipt card
  receiptCard: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.28)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  receiptTitle: { fontSize: 13, fontWeight: '700', color: '#86efac' },
  receiptRow: { flexDirection: 'row', gap: 8 },
  receiptLabel: { fontSize: 12, color: TEXT_DIM, minWidth: 64 },
  receiptValue: { fontSize: 12, color: '#dcfce7', flex: 1 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  exportBtnText: { fontSize: 12, color: '#86efac', fontWeight: '700' },

  // History
  historyCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  historyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: TEXT_MUTED },
  historyCountBadge: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historyCountText: { fontSize: 11, color: ACCENT_LIGHT, fontWeight: '700' },
  historyEmpty: { fontSize: 12, color: TEXT_DIM },
  historyHint: { fontSize: 12, color: TEXT_DIM },
  historyItem: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    gap: 3,
  },
  historyItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyItemId: { fontSize: 12, color: TEXT_MUTED, fontFamily: 'monospace', flex: 1 },
  historyDecisionBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historyDecisionText: { fontSize: 10, fontWeight: '800' },
  historyItemOrg: { fontSize: 12, color: TEXT, fontWeight: '600' },
  historyItemDate: { fontSize: 11, color: TEXT_DIM },
  smallExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  smallExportBtnText: { fontSize: 11, color: ACCENT_LIGHT, fontWeight: '700' },

  // Loader / empty
  loaderWrap: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  loaderText: { color: TEXT_MUTED, fontSize: 14 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#4b5563' },
  emptyText: { fontSize: 13, color: TEXT_DIM, textAlign: 'center' },

  // Request card
  requestCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  requestHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  orgName: { fontSize: 15, fontWeight: '700', color: TEXT },
  orgId: { fontSize: 11, color: TEXT_DIM, marginTop: 2 },
  statusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },

  requestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestMetaLabel: { fontSize: 12, color: TEXT_DIM, minWidth: 52 },
  requestMetaValue: { fontSize: 12, color: TEXT_MUTED, flex: 1 },

  // Claims summary
  claimsSummary: { gap: 8 },
  claimsGroup: { gap: 4 },
  claimsGroupLabel: {
    fontSize: 10,
    color: TEXT_DIM,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  claimsChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  claimChip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  claimChipText: { fontSize: 11, color: TEXT_MUTED },

  // Approval section
  approvalSection: { gap: 10 },
  scopeBox: {
    backgroundColor: '#0a0a0d',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  scopeBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scopeBoxTitle: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },
  scopeBoxMeta: { fontSize: 11, color: TEXT_DIM, marginLeft: 'auto' },
  scopeSubLabel: {
    fontSize: 10,
    color: TEXT_DIM,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginTop: 4,
  },
  scopeChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: CARD,
  },
  scopeChipSelected: {
    borderColor: 'rgba(34,197,94,0.4)',
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  scopeChipText: { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },
  scopeChipTextSelected: { color: '#86efac' },
  scopeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: 6,
    padding: 8,
  },
  scopeWarningText: { fontSize: 11, color: WARNING, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SUCCESS,
    borderRadius: 10,
    paddingVertical: 12,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ERROR,
    borderRadius: 10,
    paddingVertical: 12,
  },
  rejectBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.45 },

  decisionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 4,
  },
  decisionInfoText: { fontSize: 12, flex: 1, lineHeight: 17 },
});

export default EnrollmentRequestsScreen;
