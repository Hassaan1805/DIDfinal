import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuditAPI } from './utils/api';
import { saveTokens, clearAuth as clearPortalAuth, getCurrentUser } from './utils/auth';
import type { BadgeType } from './utils/auth';
import { RoleGate } from './components/RoleGate';
import { ZKRoleGate } from './components/ZKRoleGate';
import GlassSurface from './components/GlassSurface';
import { PROJECT_DATASET } from './constants/projectDataset';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowRightOnRectangleIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  FolderOpenIcon,
  HomeIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  CubeTransparentIcon,
  UserPlusIcon,
  UsersIcon,
  ArrowPathIcon,
  LinkIcon,
  BuildingOfficeIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type PortalMode = 'login' | 'admin';
type VerifierRequestType = 'portal_access' | 'general_auth';
type VerifierClaimKey = 'subjectDid' | 'employeeId' | 'name' | 'role' | 'department' | 'email';
type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';
type AuthStep = 'login' | 'qr' | 'authenticated';
type LoginPanelStage = 'welcome' | 'form';
type PortalSection = 'dashboard' | 'projects' | 'security' | 'blockchain' | 'analytics' | 'audit';

interface RequestedClaimsData {
  requestType: VerifierRequestType;
  requiredClaims: VerifierClaimKey[];
  policyVersion: number;
}

interface EmployeeRecord {
  id: string;
  name: string;
  department: string;
  email: string;
  address: string;
  did: string;
  active: boolean;
  badge: BadgeType;
  permissions: string[];
  hashId: string;
  challengeFingerprint?: string;
}

interface ChallengeData {
  challengeId: string;
  challenge: string;
  qrCodeData: string;
  employee?: EmployeeRecord;
  verifier?: VerifierProfile;
  requestedClaims?: RequestedClaimsData;
}

interface StatusData {
  status: 'pending' | 'completed';
  token?: string;
  refreshToken?: string;
  did?: string;
  userAddress?: string;
  employeeId?: string;
  employeeName?: string;
  badge?: BadgeType;
  permissions?: string[];
  hashId?: string;
  verifierId?: string;
  verifierOrganizationId?: string;
  verifierOrganizationName?: string;
  verifierPolicyVersion?: number;
  verifierCredentialRequired?: boolean;
  requestedClaims?: RequestedClaimsData;
}

interface VerifierProfile {
  verifierId: string;
  organizationId: string;
  organizationName: string;
  active: boolean;
  policyVersion: number;
  requireCredential: boolean;
  allowedBadges: BadgeType[];
  allowedRequestTypes: VerifierRequestType[];
  requiredClaimsByRequestType: Record<VerifierRequestType, VerifierClaimKey[]>;
}

interface EnrollmentRequestRecord {
  requestId: string;
  did: string;
  requesterOrganizationId: string;
  requesterOrganizationName: string;
  verifierId?: string;
  purpose: string;
  requestedClaims: string[];
  requestedProfileFields: string[];
  status: EnrollmentRequestStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  decidedAt?: string;
  approvedClaims?: string[];
  approvedProfileFields?: string[];
  decisionReason?: string;
}

interface AdminBadgeData {
  employee: EmployeeRecord;
  badge: {
    badge: BadgeType;
    label: string;
    challengeScope: string;
    permissions: string[];
  };
}

const BADGE_OPTIONS: Array<{ value: BadgeType; label: string }> = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'auditor', label: 'Auditor' },
];

const CLAIM_LABELS: Record<VerifierClaimKey, string> = {
  subjectDid: 'Subject DID',
  employeeId: 'Employee ID',
  name: 'Name',
  role: 'Role',
  department: 'Department',
  email: 'Email',
};

function parseCsvList(value: string): string[] {
  return Array.from(
    new Set(
      value.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
    )
  );
}

const BADGE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  admin:    { bg: 'rgba(37,99,235,0.15)',   border: 'rgba(37,99,235,0.35)',   text: '#60a5fa' },
  auditor:  { bg: 'rgba(217,119,6,0.15)',   border: 'rgba(217,119,6,0.35)',   text: '#fbbf24' },
  manager:  { bg: 'rgba(124,58,237,0.15)',  border: 'rgba(124,58,237,0.35)',  text: '#a78bfa' },
  employee: { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)',  text: '#94a3b8' },
};

// ── Audit Timeline ────────────────────────────────────────────────────────────

interface AuditTimelineEvent {
  eventId: string;
  createdAt: string;
  eventType: string;
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

interface AuditTimelineSectionProps {
  companyId: string;
  currentEmployee: EmployeeRecord | null;
}

const AuditTimelineSection: React.FC<AuditTimelineSectionProps> = ({ companyId, currentEmployee }) => {
  const [events, setEvents] = useState<AuditTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total: 0, success: 0, failure: 0, info: 0 });
  const [filterEventType, setFilterEventType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterScope, setFilterScope] = useState<'company' | 'employee'>('company');

  useEffect(() => { loadTimeline(); }, [companyId, currentEmployee, filterEventType, filterStatus, filterScope]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = { limit: 100 };
      if (filterScope === 'company') { filters.companyId = companyId; }
      else if (currentEmployee?.id) { filters.employeeId = currentEmployee.id; }
      if (filterEventType) filters.eventType = filterEventType;
      if (filterStatus) filters.status = filterStatus;
      const response = await AuditAPI.getTimeline(filters);
      if (response.success && response.data) {
        const d = response.data as { events?: AuditTimelineEvent[]; summary?: typeof summary };
        setEvents(d.events || []);
        setSummary(d.summary || { total: 0, success: 0, failure: 0, info: 0 });
      } else { setError('Failed to load timeline'); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally { setLoading(false); }
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      challenge_created: 'Challenge Created',
      challenge_expired: 'Challenge Expired',
      verification_attempted: 'Verification Attempted',
      verification_succeeded: 'Verification Success',
      verification_failed: 'Verification Failed',
      token_verified: 'Token Verified',
      token_verification_failed: 'Token Failed',
      session_status_checked: 'Status Check',
    };
    return labels[eventType] || eventType;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleString();
  };

  const isSuspicious = (event: AuditTimelineEvent, index: number) => {
    if (event.status === 'failure') {
      const recentFailures = events.slice(Math.max(0, index - 5), index + 1)
        .filter(e => e.status === 'failure' && e.eventType.includes('verification'));
      if (recentFailures.length >= 3) return true;
    }
    if (event.eventType === 'challenge_expired' && event.metadata?.expiredReason === 'replay') return true;
    if (event.eventType === 'verification_failed' && event.reason?.includes('verifier mismatch')) return true;
    return false;
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'success') return <CheckCircleIcon style={{ width: 16, height: 16, color: '#34d399' }} />;
    if (status === 'failure') return <XCircleIcon style={{ width: 16, height: 16, color: '#f87171' }} />;
    return <InformationCircleIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />;
  };

  const statusStyle = (s: string) => {
    if (s === 'success') return { bg: 'rgba(5,150,105,0.12)', border: 'rgba(5,150,105,0.3)', text: '#34d399' };
    if (s === 'failure') return { bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.3)', text: '#f87171' };
    return { bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.3)', text: '#60a5fa' };
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 12 }}>
      <ArrowPathIcon style={{ width: 20, height: 20, color: '#60a5fa', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading timeline...</span>
    </div>
  );

  if (error) return (
    <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
      <XCircleIcon style={{ width: 24, height: 24, color: '#f87171', margin: '0 auto 12px' }} />
      <p style={{ color: '#f87171', margin: '0 0 16px', fontSize: 14 }}>{error}</p>
      <button onClick={loadTimeline} className="btn-secondary" style={{ fontSize: 13 }}>Retry</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Events', value: summary.total, color: '#60a5fa', bg: 'rgba(37,99,235,0.08)' },
          { label: 'Successful', value: summary.success, color: '#34d399', bg: 'rgba(5,150,105,0.08)' },
          { label: 'Failures', value: summary.failure, color: '#f87171', bg: 'rgba(220,38,38,0.08)' },
          { label: 'Info', value: summary.info, color: '#94a3b8', bg: 'rgba(100,116,139,0.08)' },
        ].map(item => (
          <div key={item.label} className="stat-card" style={{ background: item.bg }}>
            <p style={{ color: item.color, fontSize: 11, fontWeight: 500, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
            <p style={{ color: '#fff', fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Filters</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Scope', value: filterScope, onChange: (v: string) => setFilterScope(v as 'company' | 'employee'), opts: [['company', 'Organization-wide'], ['employee', 'My Activity']] },
            { label: 'Event Type', value: filterEventType, onChange: setFilterEventType, opts: [['', 'All Types'], ['challenge_created', 'Challenge Created'], ['verification_succeeded', 'Verification Success'], ['verification_failed', 'Verification Failed'], ['token_verified', 'Token Verified']] },
            { label: 'Status', value: filterStatus, onChange: setFilterStatus, opts: [['', 'All Statuses'], ['success', 'Success'], ['failure', 'Failure'], ['info', 'Info']] },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
              <select value={f.value} onChange={e => f.onChange(e.target.value)} className="input-field" style={{ padding: '10px 14px' }}>
                {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Events */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>Authentication Timeline</p>
          <span style={{ color: '#475569', fontSize: 12 }}>{events.length} events</span>
        </div>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <ClipboardDocumentListIcon style={{ width: 40, height: 40, color: '#334155', margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>No events found</p>
            <p style={{ color: '#334155', fontSize: 12, marginTop: 6 }}>Adjust your filters to see results</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 560, overflowY: 'auto' }}>
            {events.map((event, index) => {
              const suspicious = isSuspicious(event, index);
              const ss = statusStyle(event.status);
              return (
                <div key={event.eventId} style={{
                  background: suspicious ? 'rgba(217,119,6,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${suspicious ? 'rgba(217,119,6,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                }}>
                  {suspicious && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <ExclamationTriangleIcon style={{ width: 14, height: 14, color: '#fbbf24' }} />
                      <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suspicious Pattern</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusIcon status={event.status} />
                      <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600 }}>{getEventTypeLabel(event.eventType)}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99, background: ss.bg, border: `1px solid ${ss.border}`, color: ss.text, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{event.status}</span>
                    </div>
                    <span style={{ color: '#475569', fontSize: 11 }}>{formatTimestamp(event.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                    {event.employeeId && <span style={{ color: '#64748b', fontSize: 12 }}>Employee: <span style={{ color: '#94a3b8' }}>{event.employeeId}</span></span>}
                    {event.verifierOrganizationName && <span style={{ color: '#64748b', fontSize: 12 }}>Org: <span style={{ color: '#94a3b8' }}>{event.verifierOrganizationName}</span></span>}
                    {event.reason && <span style={{ color: '#64748b', fontSize: 12, width: '100%' }}>Reason: <span style={{ color: '#94a3b8' }}>{event.reason}</span></span>}
                    {event.challengeId && <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }}>Challenge: {event.challengeId.substring(0, 20)}…</span>}
                    {event.did && <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>DID: {event.did}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const EnterprisePortalProfessional: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<PortalMode>(location.pathname.startsWith('/admin') ? 'admin' : 'login');
  const [isConnected, setIsConnected] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [loginPanelStage, setLoginPanelStage] = useState<LoginPanelStage>('welcome');
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [authStatus, setAuthStatus] = useState<StatusData | null>(null);
  const [portalSection, setPortalSection] = useState<PortalSection>('dashboard');

  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || '');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('EMP001');
  const [selectedBadge, setSelectedBadge] = useState<BadgeType>('employee');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeDepartment, setNewEmployeeDepartment] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeAddress, setNewEmployeeAddress] = useState('');
  const [newEmployeeBadge, setNewEmployeeBadge] = useState<BadgeType>('employee');
  const [registerEmployeeOnChain, setRegisterEmployeeOnChain] = useState(true);
  const [verifierProfiles, setVerifierProfiles] = useState<VerifierProfile[]>([]);
  const [selectedVerifierId, setSelectedVerifierId] = useState('dtp_portal_primary');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [enrollmentDid, setEnrollmentDid] = useState('');
  const [enrollmentRequesterOrganizationId, setEnrollmentRequesterOrganizationId] = useState('dtp_enterprise_001');
  const [enrollmentRequesterOrganizationName, setEnrollmentRequesterOrganizationName] = useState('DTP Enterprise');
  const [enrollmentVerifierId, setEnrollmentVerifierId] = useState('dtp_portal_primary');
  const [enrollmentPurpose, setEnrollmentPurpose] = useState('Verify role-based access eligibility');
  const [enrollmentRequestedClaims, setEnrollmentRequestedClaims] = useState('employeeId, name, role');
  const [enrollmentRequestedProfileFields, setEnrollmentRequestedProfileFields] = useState('headline, location');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<'all' | EnrollmentRequestStatus>('all');
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequestRecord[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState('');
  const [error, setError] = useState('');

  const currentEmployee = useMemo(() => {
    const sourceEmployeeId = authStatus?.employeeId || challengeData?.employee?.id;
    return employees.find((e) => e.id === sourceEmployeeId) || challengeData?.employee || null;
  }, [authStatus?.employeeId, challengeData?.employee, employees]);

  const selectedVerifier = useMemo(
    () => verifierProfiles.find((p) => p.verifierId === selectedVerifierId),
    [selectedVerifierId, verifierProfiles]
  );

  const requestedPortalClaimsPreview = useMemo<VerifierClaimKey[]>(() => {
    const keys = selectedVerifier?.requiredClaimsByRequestType?.portal_access;
    return keys && keys.length > 0 ? keys : ['employeeId'];
  }, [selectedVerifier]);

  const loadEnrollmentRequests = async () => {
    setEnrollmentLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (enrollmentDid.trim()) params.set('did', enrollmentDid.trim());
      if (enrollmentRequesterOrganizationId.trim()) params.set('requesterOrganizationId', enrollmentRequesterOrganizationId.trim());
      if (enrollmentStatusFilter !== 'all') params.set('status', enrollmentStatusFilter);
      const query = params.toString();
      const response = await fetch(`${API_BASE_URL}/identity/enrollment-requests${query ? `?${query}` : ''}`, { headers: getAuthHeaders() });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to load enrollment requests');
      setEnrollmentRequests((payload.data || []) as EnrollmentRequestRecord[]);
    } catch (err: any) {
      setError(err?.message || 'Failed to load enrollment requests');
      setEnrollmentRequests([]);
    } finally { setEnrollmentLoading(false); }
  };

  const createEnrollmentRequestFromAdmin = async () => {
    setEnrollmentLoading(true);
    setEnrollmentMessage('');
    setError('');
    try {
      const did = enrollmentDid.trim();
      if (!did) throw new Error('Target DID is required');
      if (!enrollmentRequesterOrganizationId.trim() || !enrollmentRequesterOrganizationName.trim()) throw new Error('Organization ID and name are required');
      if (!enrollmentPurpose.trim()) throw new Error('Enrollment purpose is required');
      const response = await fetch(`${API_BASE_URL}/identity/enrollment-requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          did,
          requesterOrganizationId: enrollmentRequesterOrganizationId.trim(),
          requesterOrganizationName: enrollmentRequesterOrganizationName.trim(),
          verifierId: enrollmentVerifierId.trim() || undefined,
          purpose: enrollmentPurpose.trim(),
          requestedClaims: parseCsvList(enrollmentRequestedClaims),
          requestedProfileFields: parseCsvList(enrollmentRequestedProfileFields),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to create enrollment request');
      const created = payload.data as EnrollmentRequestRecord;
      setEnrollmentMessage(`Enrollment request ${created.requestId} created for ${created.did}.`);
      await loadEnrollmentRequests();
    } catch (err: any) {
      setError(err?.message || 'Failed to create enrollment request');
    } finally { setEnrollmentLoading(false); }
  };

  useEffect(() => {
    const checkConnection = async () => {
      try { const r = await fetch(`${API_BASE_URL}/health`); setIsConnected(r.ok); }
      catch { setIsConnected(false); }
    };
    checkConnection();
    const id = setInterval(checkConnection, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setMode(location.pathname.startsWith('/admin') ? 'admin' : 'login'); }, [location.pathname]);
  useEffect(() => { if (mode === 'admin') void loadEmployees(); }, [mode]);
  useEffect(() => { if (mode !== 'login' || !isConnected) return; void loadVerifierProfiles(); }, [mode, isConnected]);
  useEffect(() => { if (mode !== 'admin') return; void loadEnrollmentRequests(); }, [mode, enrollmentStatusFilter]);

  const getAuthHeaders = (tokenOverride?: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenOverride || adminToken}`,
  });

  const loadEmployees = async () => {
    setAdminLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE_URL}/admin/employees`, { headers: getAuthHeaders() });
      const p = await r.json();
      if (!r.ok || !p.success) throw new Error(p.error || 'Failed to load employees');
      setEmployees(p.data || []);
    } catch (err: any) { setError(err?.message || 'Failed to load employees'); }
    finally { setAdminLoading(false); }
  };

  const loadVerifierProfiles = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/auth/verifier-profiles`);
      const p = await r.json();
      if (!r.ok || !p.success) throw new Error(p.error || 'Failed to load verifier profiles');
      const profiles = (p.data || []) as VerifierProfile[];
      setVerifierProfiles(profiles);
      if (profiles.length > 0) {
        setSelectedVerifierId(cur => profiles.some(pr => pr.verifierId === cur) ? cur : profiles[0].verifierId);
      }
    } catch (err: any) { console.warn('Failed to load verifier profiles:', err?.message); setVerifierProfiles([]); }
  };

  const applyBadge = async () => {
    if (!selectedEmployeeId) return;
    setAdminLoading(true);
    setAdminMessage('');
    setError('');
    try {
      const r = await fetch(`${API_BASE_URL}/admin/employees/${selectedEmployeeId}/badge`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ badge: selectedBadge }),
      });
      const p = await r.json();
      if (!r.ok || !p.success) throw new Error(p.error || 'Failed to assign badge');
      const data = p.data as AdminBadgeData;
      setAdminMessage(`Badge updated: ${data.employee.name} — ${data.badge.label}`);
      await loadEmployees();
    } catch (err: any) { setError(err?.message || 'Failed to assign badge'); }
    finally { setAdminLoading(false); }
  };

  const createEmployeeFromAdmin = async () => {
    setAdminLoading(true);
    setAdminMessage('');
    setError('');
    try {
      if (!newEmployeeId.trim() || !newEmployeeName.trim() || !newEmployeeDepartment.trim() || !newEmployeeEmail.trim() || !newEmployeeAddress.trim())
        throw new Error('All employee fields are required');
      const r = await fetch(`${API_BASE_URL}/admin/employees`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          id: newEmployeeId.trim().toUpperCase(), name: newEmployeeName.trim(),
          department: newEmployeeDepartment.trim(), email: newEmployeeEmail.trim().toLowerCase(),
          address: newEmployeeAddress.trim(), badge: newEmployeeBadge, registerOnChain: registerEmployeeOnChain,
        }),
      });
      const p = await r.json();
      if (!r.ok || !p.success) throw new Error(p.error || 'Failed to create employee');
      const created = p?.data?.employee as EmployeeRecord | undefined;
      const onChain = p?.data?.onChainRegistration;
      const chainMsg = onChain?.attempted ? (onChain?.success ? ` On-chain tx: ${onChain.txHash || 'completed'}.` : ` On-chain failed: ${onChain.reason || 'unknown'}.`) : '';
      setAdminMessage(`Employee ${created?.id || newEmployeeId.toUpperCase()} created.${chainMsg}`);
      setSelectedEmployeeId(created?.id || newEmployeeId.trim().toUpperCase());
      setNewEmployeeId(''); setNewEmployeeName(''); setNewEmployeeDepartment(''); setNewEmployeeEmail(''); setNewEmployeeAddress(''); setNewEmployeeBadge('employee');
      await loadEmployees();
    } catch (err: any) { setError(err?.message || 'Failed to create employee'); }
    finally { setAdminLoading(false); }
  };

  const startLogin = async () => {
    setError('');
    setAuthStatus(null);
    if (!employeeId.trim()) { setError('Please enter your employee ID'); return; }
    const verifierId = selectedVerifier?.verifierId || selectedVerifierId || 'dtp_portal_primary';
    const organizationId = selectedVerifier?.organizationId || 'dtp_enterprise_001';
    try {
      const r = await fetch(`${API_BASE_URL}/auth/challenge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim().toUpperCase(), requestType: 'portal_access', companyId: organizationId, verifierId }),
      });
      const p = await r.json();
      if (!r.ok || !p.success) throw new Error(p.error || 'Failed to generate challenge');
      const data = p.data as ChallengeData;
      setChallengeData(data);
      const qr = await QRCode.toDataURL(data.qrCodeData, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      setQrCodeUrl(qr);
      setAuthStep('qr');
      startPolling(data.challengeId);
    } catch (err: any) { setError(err?.message || 'Authentication request failed'); }
  };

  const startPolling = (challengeId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/auth/status/${challengeId}`);
        const p = await r.json();
        if (!r.ok || !p.success) { clearInterval(intervalId); return; }
        const data = p.data as StatusData;
        if (data.status === 'completed' && data.token) {
          clearInterval(intervalId);
          setAuthStatus(data);
          if (data.refreshToken) { saveTokens(data.token, data.refreshToken); }
          else { localStorage.setItem('auth_token', data.token); localStorage.setItem('authToken', data.token); }
          setAuthStep('authenticated');
        }
      } catch { clearInterval(intervalId); }
    }, 2000);
    setTimeout(() => clearInterval(intervalId), 5 * 60 * 1000);
  };

  const logout = () => {
    setAuthStep('login'); setChallengeData(null); setQrCodeUrl(''); setAuthStatus(null);
    setLoginPanelStage('welcome');
    setEmployeeId(''); clearPortalAuth(); localStorage.removeItem('authToken');
    setPortalSection('dashboard'); navigate('/login');
  };

  const saveAdminToken = () => {
    localStorage.setItem('admin_token', adminToken);
    void loadEmployees();
    void loadEnrollmentRequests();
  };

  // ── Nav ───────────────────────────────────────────────────────────────────

  const renderTopNav = () => (
    <nav style={{
      position: 'relative', zIndex: 20,
      borderBottom: '1px solid rgba(148,163,184,0.22)',
      background: 'linear-gradient(120deg, rgba(15,23,42,0.58) 0%, rgba(15,23,42,0.44) 46%, rgba(30,64,175,0.26) 100%)',
      backdropFilter: 'blur(18px) saturate(145%)',
      WebkitBackdropFilter: 'blur(18px) saturate(145%)',
      boxShadow: '0 8px 28px rgba(2,6,23,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FingerPrintIcon style={{ width: 18, height: 18, color: '#2563eb' }} />
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em' }}>DID Auth Platform</span>
          <span style={{ marginLeft: 8, color: '#93c5fd', fontSize: 12 }}>Enterprise</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isConnected ? '#10b981' : '#ef4444',
            display: 'inline-block',
            boxShadow: isConnected ? '0 0 6px rgba(16,185,129,0.6)' : '0 0 6px rgba(239,68,68,0.6)',
          }} />
          <span style={{ color: isConnected ? '#6ee7b7' : '#fca5a5', fontSize: 11, fontWeight: 500 }}>
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
    </nav>
  );

  // ── Login Portal ──────────────────────────────────────────────────────────

  const renderLoginPortal = () => {
    if (authStep === 'authenticated') {
      const badge = authStatus?.badge || 'employee';
      const permissions = authStatus?.permissions || [];
      const isEmployee = badge === 'employee';
      const isManager = badge === 'manager';
      const isAuditor = badge === 'auditor';
      const isManagerOrHigher = badge === 'manager' || badge === 'admin';
      const isAdmin = badge === 'admin';
      const canSeeAnalytics = isManager || isAdmin;
      const canSeeAuditSections = isAuditor || isAdmin;
      const etherscanBase = 'https://sepolia.etherscan.io';
      const badgeStyle = BADGE_STYLES[badge] || BADGE_STYLES.employee;

      const roleTabs: Array<{ key: PortalSection; label: string; locked?: boolean; Icon: any }> = [
        { key: 'dashboard', label: 'Dashboard', Icon: HomeIcon },
        { key: 'projects', label: 'Projects', Icon: FolderOpenIcon },
        { key: 'security', label: 'Security', Icon: isAdmin ? ShieldCheckIcon : LockClosedIcon, locked: !isAdmin },
        { key: 'blockchain', label: 'Blockchain', Icon: CubeTransparentIcon },
        { key: 'analytics', label: 'Analytics', Icon: canSeeAnalytics ? ChartBarIcon : LockClosedIcon, locked: !canSeeAnalytics },
        { key: 'audit', label: 'Audit', Icon: canSeeAuditSections ? ClipboardDocumentListIcon : LockClosedIcon, locked: !canSeeAuditSections },
      ];

      const currentEmployeeId = authStatus?.employeeId || currentEmployee?.id || '';
      const managerTeam = PROJECT_DATASET.managerTeamMap[currentEmployeeId] || [currentEmployeeId];
      const projectPortfolio = PROJECT_DATASET.catalog.filter((p) => {
        if (isAdmin || isAuditor) return true;
        if (isManager) return managerTeam.includes(p.ownerId) || p.teamMembers.some(m => managerTeam.includes(m));
        return p.ownerId === currentEmployeeId || p.teamMembers.includes(currentEmployeeId);
      });

      const securityEvents = [
        { id: 'SEC-2481', severity: 'high', title: 'Repeated failed signature verification attempts', status: 'Investigating', owner: 'SOC Team', eta: '2h' },
        { id: 'SEC-2482', severity: 'medium', title: 'Suspicious role escalation request blocked', status: 'Mitigated', owner: 'IAM Team', eta: 'Closed' },
        { id: 'SEC-2483', severity: 'low', title: 'Outdated employee session token expired', status: 'Closed', owner: 'Platform Ops', eta: 'Closed' },
      ];
      const threatLandscape = [
        { vector: 'Credential Replay', probability: 'Medium', impact: 'High', control: 'Nonce binding + short TTL' },
        { vector: 'Phishing-driven signing', probability: 'Medium', impact: 'High', control: 'Domain-bound challenge + wallet warnings' },
        { vector: 'Insider role abuse', probability: 'Low', impact: 'High', control: 'Dual approval + audit trail' },
      ];
      const incidentPlaybook = [
        { phase: 'Detect', action: 'SIEM alerting on anomalous signature and role mutation patterns' },
        { phase: 'Contain', action: 'Auto-suspend suspicious sessions and freeze badge changes' },
        { phase: 'Eradicate', action: 'Rotate affected keys, revoke compromised credentials' },
        { phase: 'Recover', action: 'Reissue credentials and verify policy baselines' },
        { phase: 'Review', action: 'Post-incident RCA with control backlog updates' },
      ];
      const blockchainRoutes = [
        { route: 'Auth Gateway -> Credential Router', fromBlock: 5567131, toBlock: 5567159, level: 'L1', confidence: 'Finalized' },
        { route: 'Credential Router -> Policy Engine', fromBlock: 5567160, toBlock: 5567204, level: 'L2', confidence: 'Confirmed' },
        { route: 'Policy Engine -> Audit Anchor', fromBlock: 5567205, toBlock: 5567240, level: 'L3', confidence: 'Conceptual' },
      ];
      const weeklyVerificationSeries = [1220, 1290, 1335, 1410, 1482, 1540, 1610];
      const blockDepthDistribution = [12, 24, 38, 52, 67, 58, 44, 31, 19, 10];
      const incidentLoadSeries = [11, 9, 13, 7, 5, 6, 4];
      const projectBurnupSeries = [42, 48, 56, 61, 68, 74, 81, 88];
      const walletAddress = authStatus?.userAddress || currentEmployee?.address || '';
      const activeOrganizationId = authStatus?.verifierOrganizationId || challengeData?.verifier?.organizationId || selectedVerifier?.organizationId || 'dtp_enterprise_001';

      const exportWholeReport = () => {
        const report = { generatedAt: new Date().toISOString(), employee: { id: currentEmployee?.id, name: currentEmployee?.name, badge, permissions }, projects: projectPortfolio, securityEvents, threatLandscape, incidentPlaybook, blockchainRoutes };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `enterprise-report-${currentEmployee?.id || 'user'}-${Date.now()}.json`;
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      };

      const sevStyle = (s: string) => s === 'high' ? { color: '#fca5a5', dot: '#ef4444' } : s === 'medium' ? { color: '#fde68a', dot: '#f59e0b' } : { color: '#86efac', dot: '#22c55e' };

      const renderSection = () => {
        if (portalSection === 'dashboard') return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.35s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Identity Health', value: '97.2%', accent: '#34d399' },
                { label: 'Active Sessions', value: '412', accent: '#60a5fa' },
                { label: 'Credential Validity', value: '99.1%', accent: '#a78bfa' },
                { label: 'Open Risks', value: '6', accent: '#fbbf24' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <p style={{ color: '#64748b', fontSize: 11, fontWeight: 500, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                  <p style={{ color: s.accent, fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="glass-card" style={{ padding: '20px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Operational Highlights</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Challenge success rate improved by 18.4% after badge-aware flow rollout.', 'Median login round trip: 2.3s across the last 500 verifications.', 'No unauthorized privilege grants in the last 14 days.'].map(t => (
                    <li key={t} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2563eb', marginTop: 6, flexShrink: 0 }} />
                      <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card" style={{ padding: '20px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Identity Context</p>
                {[
                  ['Name', currentEmployee?.name || '—'],
                  ['Employee ID', currentEmployee?.id || '—'],
                  ['Badge', badge.toUpperCase()],
                  ['Department', currentEmployee?.department || '—'],
                  ['Hash', authStatus?.hashId || currentEmployee?.hashId || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#475569', fontSize: 12 }}>{k}</span>
                    <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: k === 'Hash' ? 'var(--font-mono)' : undefined, wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="glass-card" style={{ padding: '20px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Weekly Verification Volume</p>
                <svg viewBox="0 0 420 160" style={{ width: '100%', height: 120 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline fill="none" stroke="#34d399" strokeWidth="2.5" points={weeklyVerificationSeries.map((v, i) => `${i * 70},${150 - (v - 1100) / 5}`).join(' ')} />
                  <polyline fill="url(#lineGrad)" stroke="none" points={`0,150 ${weeklyVerificationSeries.map((v, i) => `${i * 70},${150 - (v - 1100) / 5}`).join(' ')} 420,150`} />
                </svg>
              </div>
              <div className="glass-card" style={{ padding: '20px 24px', overflowX: 'auto' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Executive Snapshot</p>
                <table className="data-table">
                  <tbody>
                    {[['Access SLA Compliance', '99.4%'], ['Privileged Role Drift', '0.7%'], ['On-chain Anchor Latency', '1.9s'], ['Audit Readiness', 'High']].map(([k, v]) => (
                      <tr key={k}><td style={{ color: '#475569' }}>{k}</td><td style={{ textAlign: 'right', color: '#f1f5f9', fontWeight: 500 }}>{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

        if (portalSection === 'projects') return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.35s ease' }}>
            <div className="glass-card" style={{ padding: '20px 24px', overflowX: 'auto' }}>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>Team Project Portfolio</p>
              <p style={{ color: '#475569', fontSize: 12, margin: '0 0 16px' }}>Scoped to {isManager ? 'manager and team' : isEmployee ? 'current employee' : 'authorized role visibility'}.</p>
              <table className="data-table" style={{ minWidth: 860 }}>
                <thead><tr>
                  {['Code', 'Project', 'Owner', 'Progress', 'Risk', 'Sepolia Tx', 'Budget', 'ETA'].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {projectPortfolio.map(p => (
                    <tr key={p.code}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.code}</td>
                      <td>{p.name}</td>
                      <td>{p.owner}</td>
                      <td>
                        <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginBottom: 4 }}>
                          <div style={{ width: `${p.progress}%`, height: 4, background: '#2563eb', borderRadius: 99, transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ color: '#475569', fontSize: 11 }}>{p.progress}%</span>
                      </td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: p.risk === 'High' ? 'rgba(220,38,38,0.12)' : p.risk === 'Medium' ? 'rgba(217,119,6,0.12)' : 'rgba(5,150,105,0.12)', color: p.risk === 'High' ? '#fca5a5' : p.risk === 'Medium' ? '#fbbf24' : '#34d399' }}>{p.risk}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{p.networkTx}</td>
                      <td>{p.budget}</td>
                      <td>{p.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[{ label: 'Delivery Confidence', value: `${Math.max(72, 96 - projectPortfolio.length)}%`, color: '#34d399' }, { label: 'Cross-team Dependencies', value: '23', color: '#a78bfa' }, { label: 'Critical Blockers', value: `${projectPortfolio.filter(p => p.risk === 'High').length}`, color: '#fbbf24' }].map(s => (
                <div key={s.label} className="stat-card"><p style={{ color: '#64748b', fontSize: 11, fontWeight: 500, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p><p style={{ color: s.color, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>{s.value}</p></div>
              ))}
            </div>
          </div>
        );

        if (portalSection === 'security') return (
          <RoleGate require="admin">
            <ZKRoleGate require="admin" scope="security:view" label="Security Settings — ZK Proof Required">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.35s ease' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[{ label: 'MFA Enforcement', value: '100%', color: '#34d399' }, { label: 'Policy Drift', value: '1.8%', color: '#fbbf24' }, { label: 'Threat Index', value: 'Low', color: '#60a5fa' }].map(s => (
                    <div key={s.label} className="stat-card"><p style={{ color: '#64748b', fontSize: 11, fontWeight: 500, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p><p style={{ color: s.color, fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>{s.value}</p></div>
                  ))}
                </div>
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Recent Security Events</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {securityEvents.map(evt => {
                      const ss = sevStyle(evt.severity);
                      return (
                        <div key={evt.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>{evt.title}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ss.dot, display: 'inline-block' }} />
                              <span style={{ color: ss.color, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{evt.severity}</span>
                            </div>
                          </div>
                          <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{evt.id} · {evt.status} · {evt.owner} · ETA: {evt.eta}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Threat Landscape</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {threatLandscape.map(t => (
                        <div key={t.vector} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px' }}>
                          <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500, margin: '0 0 4px' }}>{t.vector}</p>
                          <p style={{ color: '#475569', fontSize: 12, margin: '0 0 2px' }}>Probability: {t.probability} · Impact: {t.impact}</p>
                          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>Control: {t.control}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Incident Response Playbook</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {incidentPlaybook.map((item, idx) => (
                        <div key={item.phase} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
                          <div>
                            <p style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600, margin: '0 0 2px' }}>{item.phase}</p>
                            <p style={{ color: '#64748b', fontSize: 12, margin: 0, lineHeight: 1.4 }}>{item.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Incident Load (7-day)</p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 96 }}>
                      {incidentLoadSeries.map((v, i) => (
                        <div key={i} style={{ flex: 1, background: 'rgba(37,99,235,0.4)', borderRadius: '4px 4px 0 0', height: `${v * 7}px`, transition: 'height 0.3s ease' }} />
                      ))}
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: '20px 24px', overflowX: 'auto' }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Incident Response SLA</p>
                    <table className="data-table" style={{ minWidth: 320 }}>
                      <tbody>
                        {[['MTTD', '11m'], ['MTTR', '38m'], ['Containment SLA', '97%'], ['Postmortem Completion', '92%']].map(([k, v]) => (
                          <tr key={k}><td style={{ color: '#475569' }}>{k}</td><td style={{ textAlign: 'right', color: '#f1f5f9', fontWeight: 500 }}>{v}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </ZKRoleGate>
          </RoleGate>
        );

        if (portalSection === 'blockchain') return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.35s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[{ label: 'Network', value: 'Sepolia', color: '#a78bfa' }, { label: '24h On-chain Auth Tx', value: '319', color: '#60a5fa' }, { label: 'Median Gas Cost', value: '0.00042 ETH', color: '#34d399' }].map(s => (
                <div key={s.label} className="stat-card"><p style={{ color: '#64748b', fontSize: 11, fontWeight: 500, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p><p style={{ color: s.color, fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{s.value}</p></div>
              ))}
            </div>
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 16px' }}>Sepolia Blockchain Explorer</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { href: `${etherscanBase}/address/0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48`, label: 'SimpleDIDRegistry Contract', addr: '0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48', desc: 'All employee DIDs and authentications stored here', color: '#60a5fa' },
                  ...(walletAddress ? [{ href: `${etherscanBase}/address/${walletAddress}`, label: `${currentEmployee?.name || 'Employee'}'s Wallet`, addr: walletAddress, desc: 'Personal blockchain wallet address', color: '#a78bfa' }] : []),
                  { href: `${etherscanBase}/address/0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48#internaltx`, label: 'Authentication Transactions', addr: 'Recent DID registrations and logins', desc: 'Live feed of all recent blockchain activity', color: '#34d399' },
                  { href: `${etherscanBase}/address/0xBdA3AC10e1403cFC54Ab2195Aad7Da8a39B775B9`, label: 'Gas Payer Wallet', addr: '0xBdA3AC10e1403cFC54Ab2195Aad7Da8a39B775B9', desc: 'Backend wallet paying transaction fees', color: '#fbbf24' },
                ].map(item => (
                  <a key={item.label} href={item.href} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, textDecoration: 'none', transition: 'all 0.15s ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                    <LinkIcon style={{ width: 16, height: 16, color: item.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: item.color, fontSize: 12, fontWeight: 600, margin: '0 0 2px' }}>{item.label}</p>
                      <p style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)', margin: '0 0 2px', wordBreak: 'break-all' }}>{item.addr}</p>
                      <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{item.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px 24px', overflowX: 'auto' }}>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 16px' }}>Contract Information</p>
              <table className="data-table" style={{ minWidth: 720 }}>
                <thead><tr>{['Contract', 'Address', 'Network', 'Purpose', 'Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  <tr><td>SimpleDIDRegistry</td><td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>0x80c41...F4D48</td><td>Sepolia</td><td>DID Storage & Auth</td><td><span style={{ color: '#34d399', fontSize: 12 }}>Active</span></td></tr>
                  <tr><td>Gas Payer</td><td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>0xBd43A...75B9</td><td>Sepolia</td><td>Transaction Fees</td><td><span style={{ color: '#34d399', fontSize: 12 }}>Funded</span></td></tr>
                  <tr><td>Employee Count</td><td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>~50 Registered</td><td>—</td><td>Active Users</td><td><span style={{ color: '#60a5fa', fontSize: 12 }}>Growing</span></td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="glass-card" style={{ padding: '20px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Block Depth Distribution</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 96 }}>
                  {blockDepthDistribution.map((v, i) => (
                    <div key={i} style={{ flex: 1, background: 'rgba(6,182,212,0.5)', borderRadius: '4px 4px 0 0', height: `${v * 1.8}px` }} />
                  ))}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '20px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Route Throughput</p>
                <svg viewBox="0 0 360 140" style={{ width: '100%', height: 96 }}>
                  <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points="0,108 40,100 80,88 120,95 160,82 200,70 240,64 280,58 320,51 360,45" />
                  <polyline fill="none" stroke="#f472b6" strokeWidth="2" points="0,124 40,118 80,113 120,109 160,103 200,96 240,91 280,86 320,80 360,74" />
                </svg>
              </div>
            </div>
          </div>
        );

        if (portalSection === 'analytics') return (
          <RoleGate require="manager">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.35s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[{ label: 'Auth Throughput', value: '1,482/day', color: '#a78bfa' }, { label: 'Challenge Completion', value: '94.6%', color: '#60a5fa' }, { label: 'Avg Verification', value: '2.3s', color: '#34d399' }, { label: 'Failure Hotspots', value: '3', color: '#fbbf24' }].map(s => (
                  <div key={s.label} className="stat-card"><p style={{ color: '#64748b', fontSize: 11, fontWeight: 500, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p><p style={{ color: s.color, fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{s.value}</p></div>
                ))}
              </div>
              <div className="glass-card" style={{ padding: '20px 24px' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Cross-domain Analysis</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[['Identity Risk Correlation', 'High risk events are 2.7x more frequent when credentials exceed 45 days without rotation.'], ['Department-wise Completion', 'Engineering: 96%, Product: 92%, Design: 90%, Compliance: 98%.'], ['Chain Cost Projection', 'Projected Sepolia gas budget for next sprint: 0.198 ETH with 12% confidence variance.'], ['Policy Effectiveness', 'New badge guardrails reduced unauthorized scope requests by 43% week-over-week.']].map(([t, d]) => (
                    <div key={t} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                      <p style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600, margin: '0 0 6px' }}>{t}</p>
                      <p style={{ color: '#64748b', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Department Completion</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[['Engineering', 96], ['Compliance', 98], ['Product', 92], ['Design', 90]].map(([dept, pct]) => (
                      <div key={dept}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>{dept}</span>
                          <span style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                          <div style={{ width: `${pct}%`, height: 4, background: '#a78bfa', borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: '0 0 14px' }}>Verification Cohort</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                    {[28,32,41,46,53,60,67,22,31,36,47,52,58,65,19,25,30,39,45,50,57].map((v, i) => (
                      <div key={i} style={{ height: 20, borderRadius: 3, background: `rgba(56,189,248,${0.12 + v / 100})` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </RoleGate>
        );

        if (portalSection === 'audit') return (
          <RoleGate require="auditor">
            <ZKRoleGate require="auditor" scope="audit:view" label="Audit & Compliance — ZK Proof Required">
              <AuditTimelineSection companyId={activeOrganizationId} currentEmployee={currentEmployee} />
            </ZKRoleGate>
          </RoleGate>
        );

        return null;
      };

      const credentialVerified = getCurrentUser()?.credentialVerified;

      return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.4s ease' }}>
          {/* User identity banner */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: badgeStyle.bg, border: `1px solid ${badgeStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckBadgeIcon style={{ width: 22, height: 22, color: badgeStyle.text }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                  <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 15 }}>{currentEmployee?.name || 'Authenticated'}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 99, background: badgeStyle.bg, border: `1px solid ${badgeStyle.border}`, color: badgeStyle.text, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{badge}</span>
                  {credentialVerified ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', color: '#34d399', fontSize: 10, fontWeight: 600 }}>
                      <ShieldCheckIcon style={{ width: 10, height: 10 }} />Verified
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748b', fontSize: 10, fontWeight: 600 }}>
                      <LockClosedIcon style={{ width: 10, height: 10 }} />Unverified
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#475569', fontSize: 12 }}>{currentEmployee?.id}</span>
                  {currentEmployee?.department && <span style={{ color: '#475569', fontSize: 12 }}>{currentEmployee.department}</span>}
                  {(authStatus?.hashId || currentEmployee?.hashId) && <span style={{ color: '#334155', fontSize: 11, fontFamily: 'var(--font-mono)' }}>Hash: {(authStatus?.hashId || currentEmployee?.hashId || '').substring(0, 16)}…</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={exportWholeReport} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#f1f5f9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}>
                <DocumentArrowDownIcon style={{ width: 14, height: 14 }} />Export
              </button>
              <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.1)'; }}>
                <ArrowRightOnRectangleIcon style={{ width: 14, height: 14 }} />Sign out
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div className="tab-nav" style={{ flexWrap: 'wrap' }}>
              {roleTabs.map(tab => (
                <button key={tab.key} onClick={() => !tab.locked && setPortalSection(tab.key)} className={`tab-btn ${portalSection === tab.key ? 'active' : ''} ${tab.locked ? 'locked' : ''}`}>
                  <tab.Icon style={{ width: 14, height: 14 }} />
                  {tab.label}
                  {tab.locked && <LockClosedIcon style={{ width: 11, height: 11, opacity: 0.5 }} />}
                </button>
              ))}
            </div>
            {permissions.length > 0 && (
              <span style={{ color: '#334155', fontSize: 11 }}>Permissions: {permissions.join(', ')}</span>
            )}
          </div>

          {/* Section content */}
          {renderSection()}

          {/* Role context bar */}
          {(isEmployee || isManagerOrHigher || isAuditor || isAdmin) && (
            <div style={{
              padding: '12px 20px', borderRadius: 10,
              background: isAdmin ? 'rgba(37,99,235,0.06)' : isAuditor ? 'rgba(217,119,6,0.06)' : isManagerOrHigher ? 'rgba(124,58,237,0.06)' : 'rgba(100,116,139,0.06)',
              border: `1px solid ${isAdmin ? 'rgba(37,99,235,0.15)' : isAuditor ? 'rgba(217,119,6,0.15)' : isManagerOrHigher ? 'rgba(124,58,237,0.15)' : 'rgba(100,116,139,0.12)'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <ShieldCheckIcon style={{ width: 14, height: 14, color: isAdmin ? '#60a5fa' : isAuditor ? '#fbbf24' : isManagerOrHigher ? '#a78bfa' : '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: isAdmin ? '#93c5fd' : isAuditor ? '#fde68a' : isManagerOrHigher ? '#c4b5fd' : '#94a3b8', fontSize: 12 }}>
                {isAdmin && 'Admin scope active. Full enterprise control-plane authority available.'}
                {isAuditor && !isAdmin && 'Auditor scope active. Compliance and evidence workflows available in read mode.'}
                {isManagerOrHigher && !isAuditor && !isAdmin && 'Manager scope active. Analytics and team visibility enabled.'}
                {isEmployee && !isManagerOrHigher && !isAuditor && 'Employee scope active. Operational visibility across Dashboard, Projects, and Blockchain.'}
              </span>
            </div>
          )}
        </div>
      );
    }

    // ── QR Step ─────────────────────────────────────────────────────────────

    if (authStep === 'qr') return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 24px', animation: 'fadeUp 0.4s ease' }}>
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={20}
          borderWidth={0.09}
          backgroundOpacity={0.08}
          saturation={1.25}
          displace={0.6}
          distortionScale={-165}
          redOffset={0}
          greenOffset={8}
          blueOffset={16}
          brightness={56}
          opacity={0.94}
          blur={12}
          mixBlendMode="screen"
          className="portal-qr-glass"
        >
          <div className="portal-qr-glass__body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              <QrCodeIcon style={{ width: 18, height: 18, color: '#60a5fa' }} />
              <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Challenge Ready</span>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 28 }}>
              {challengeData?.employee?.name} · {challengeData?.employee?.id}
            </p>

            {qrCodeUrl && (
              <div style={{ display: 'inline-block', position: 'relative', marginBottom: 20 }}>
                <div className="qr-wrapper" style={{ padding: 16, background: '#ffffff', display: 'inline-block' }}>
                  <img src={qrCodeUrl} alt="Authentication QR" style={{ width: 240, height: 240, display: 'block' }} />
                  <div className="qr-scan-line" />
                </div>
                <style>{`@keyframes scanLine { 0% { top: 2%; opacity: 0; } 5% { opacity: 1; } 95% { opacity: 1; } 100% { top: 94%; opacity: 0; } }`}</style>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', animation: 'pulseDot 1.8s ease-in-out infinite', display: 'inline-block' }} />
              <span style={{ color: '#dbeafe', fontSize: 13, fontWeight: 500 }}>Waiting for wallet scan</span>
              <style>{`@keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } }`}</style>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
              {[
                ['Verifier', challengeData?.verifier?.organizationName || authStatus?.verifierOrganizationName || 'Default'],
                ['Claims', (challengeData?.requestedClaims?.requiredClaims || ['employeeId']).map(c => CLAIM_LABELS[c] || c).join(', ')],
                ['Hash ID', challengeData?.employee?.hashId || '—'],
              ].map(([k, v], idx, list) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', borderBottom: idx < list.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>{k}</span>
                  <span style={{ color: '#e2e8f0', fontSize: 12, fontFamily: k === 'Hash ID' ? 'var(--font-mono)' : undefined, wordBreak: 'break-all', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            <button onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(148,163,184,0.22)', borderRadius: 10, color: '#cbd5e1', fontSize: 13, cursor: 'pointer' }}>
              <XCircleIcon style={{ width: 14, height: 14 }} />Cancel
            </button>
          </div>
        </GlassSurface>
      </div>
    );

    // ── Login Step ───────────────────────────────────────────────────────────

    return (
      <div style={{ minHeight: 'calc(100vh - 52px)', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.5s ease' }}>

          {/* Login card */}
          {loginPanelStage === 'welcome' ? (
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={20}
              borderWidth={0.1}
              backgroundOpacity={0.12}
              saturation={1.3}
              displace={0.75}
              distortionScale={-175}
              redOffset={0}
              greenOffset={10}
              blueOffset={18}
              brightness={60}
              opacity={0.94}
              blur={14}
              mixBlendMode="screen"
              className="portal-welcome-glass"
            >
              <div className="portal-welcome-glass__body">
                <p className="portal-welcome-glass__eyebrow">Welcome</p>
                <h2 className="portal-welcome-glass__title">Login To Continue</h2>
                <p className="portal-welcome-glass__description">
                  Access your enterprise DID workspace with secure wallet-based authentication and policy-aware verification.
                </p>

                <button
                  onClick={() => setLoginPanelStage('form')}
                  className="btn-primary"
                  style={{ width: '100%', padding: '13px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <ArrowRightOnRectangleIcon style={{ width: 16, height: 16 }} />
                  Open Login
                </button>
              </div>
            </GlassSurface>
          ) : (
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={20}
              borderWidth={0.09}
              backgroundOpacity={0.08}
              saturation={1.25}
              displace={0.6}
              distortionScale={-165}
              redOffset={0}
              greenOffset={8}
              blueOffset={16}
              brightness={56}
              opacity={0.94}
              blur={12}
              mixBlendMode="screen"
              className="portal-login-glass"
            >
              <div className="portal-login-glass__body">
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Employee ID</label>
                  <input
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value.toUpperCase())}
                    className="input-field"
                    placeholder="EMP001"
                    onKeyDown={e => e.key === 'Enter' && startLogin()}
                    style={{ fontSize: 15, letterSpacing: '0.04em' }}
                  />
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Verification Profile</label>
                  <select value={selectedVerifierId} onChange={e => setSelectedVerifierId(e.target.value)} className="input-field">
                    {verifierProfiles.length === 0 ? (
                      <option value="dtp_portal_primary">dtp_portal_primary (default)</option>
                    ) : (
                      verifierProfiles.map(p => <option key={p.verifierId} value={p.verifierId}>{p.organizationName} ({p.verifierId})</option>)
                    )}
                  </select>
                  {verifierProfiles.length > 0 && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8 }}>
                      <p style={{ color: '#93c5fd', fontSize: 11, margin: 0 }}>Claims: {requestedPortalClaimsPreview.map(c => CLAIM_LABELS[c] || c).join(', ')}</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setLoginPanelStage('welcome')}
                    style={{
                      padding: '13px 16px',
                      fontSize: 13,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>

                  <button
                    onClick={startLogin}
                    disabled={!isConnected}
                    className="btn-primary"
                    style={{ width: '100%', padding: '13px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <QrCodeIcon style={{ width: 16, height: 16 }} />
                    {!isConnected ? 'Backend Offline' : 'Generate Challenge'}
                  </button>
                </div>
              </div>
            </GlassSurface>
          )}

          {/* Security footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
            <ShieldCheckIcon style={{ width: 13, height: 13, color: '#334155' }} />
            <span style={{ color: '#334155', fontSize: 11 }}>Secured by zero-knowledge cryptographic proofs</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Admin Portal ──────────────────────────────────────────────────────────

  const renderAdminPortal = () => (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.4s ease' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <UsersIcon style={{ width: 20, height: 20, color: '#60a5fa' }} />
          <h2 style={{ color: '#f8fafc', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', margin: 0 }}>Admin Portal</h2>
        </div>
        <p style={{ color: '#475569', fontSize: 13, margin: '0 0 16px' }}>Manage employees, assign badges, and inspect identity enrollment requests.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={adminToken}
            onChange={e => setAdminToken(e.target.value)}
            className="input-field"
            placeholder="Admin bearer token"
            type="password"
            style={{ flex: 1 }}
          />
          <button onClick={saveAdminToken} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <ArrowPathIcon style={{ width: 14, height: 14 }} />Load Data
          </button>
        </div>
      </div>

      {/* Create Employee */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <UserPlusIcon style={{ width: 16, height: 16, color: '#a78bfa' }} />
          <h3 style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, margin: 0 }}>Create Employee</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Employee ID', value: newEmployeeId, onChange: (v: string) => setNewEmployeeId(v.toUpperCase()), placeholder: 'EMP005' },
            { label: 'Full Name', value: newEmployeeName, onChange: setNewEmployeeName, placeholder: 'Jane Smith' },
            { label: 'Department', value: newEmployeeDepartment, onChange: setNewEmployeeDepartment, placeholder: 'Engineering' },
            { label: 'Email', value: newEmployeeEmail, onChange: setNewEmployeeEmail, placeholder: 'jane@company.com' },
            { label: 'Wallet Address', value: newEmployeeAddress, onChange: setNewEmployeeAddress, placeholder: '0x...' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
              <input value={f.value} onChange={e => f.onChange(e.target.value)} className="input-field" placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Badge</label>
            <select value={newEmployeeBadge} onChange={e => setNewEmployeeBadge(e.target.value as BadgeType)} className="input-field">
              {BADGE_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={registerEmployeeOnChain} onChange={e => setRegisterEmployeeOnChain(e.target.checked)} style={{ accentColor: '#2563eb' }} />
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Register DID on-chain immediately</span>
          </label>
          <button onClick={createEmployeeFromAdmin} disabled={adminLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserPlusIcon style={{ width: 14, height: 14 }} />{adminLoading ? 'Creating...' : 'Create Employee'}
          </button>
        </div>
        <p style={{ color: '#334155', fontSize: 11, marginTop: 10, marginBottom: 0 }}>Dynamic onboarding creates a new employee profile instantly. On-chain registration attempts DID registration during creation.</p>
      </div>

      {/* Assign Badge */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <ShieldCheckIcon style={{ width: 16, height: 16, color: '#fbbf24' }} />
          <h3 style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, margin: 0 }}>Assign Digital Badge</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Employee</label>
            <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="input-field">
              {employees.map(e => <option key={e.id} value={e.id}>{e.id} — {e.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Badge Level</label>
            <select value={selectedBadge} onChange={e => setSelectedBadge(e.target.value as BadgeType)} className="input-field">
              {BADGE_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <button onClick={applyBadge} disabled={adminLoading || employees.length === 0} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircleIcon style={{ width: 14, height: 14 }} />Apply
          </button>
        </div>
        {adminMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 12px', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: 8 }}>
            <CheckCircleIcon style={{ width: 14, height: 14, color: '#34d399' }} />
            <span style={{ color: '#34d399', fontSize: 12 }}>{adminMessage}</span>
          </div>
        )}
      </div>

      {/* Enrollment Requests */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BuildingOfficeIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />
            <div>
              <h3 style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, margin: 0 }}>Identity Enrollment Requests</h3>
              <p style={{ color: '#475569', fontSize: 12, margin: '2px 0 0' }}>Initiate consent requests by DID and track status.</p>
            </div>
          </div>
          <button onClick={loadEnrollmentRequests} disabled={enrollmentLoading} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <ArrowPathIcon style={{ width: 13, height: 13 }} />Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Target DID', value: enrollmentDid, onChange: setEnrollmentDid, placeholder: 'did:ethr:0x...' },
            { label: 'Organization ID', value: enrollmentRequesterOrganizationId, onChange: setEnrollmentRequesterOrganizationId, placeholder: 'dtp_enterprise_001' },
            { label: 'Organization Name', value: enrollmentRequesterOrganizationName, onChange: setEnrollmentRequesterOrganizationName, placeholder: 'DTP Enterprise' },
            { label: 'Verifier ID', value: enrollmentVerifierId, onChange: setEnrollmentVerifierId, placeholder: 'Optional' },
            { label: 'Purpose', value: enrollmentPurpose, onChange: setEnrollmentPurpose, placeholder: 'Verify role-based access' },
            { label: 'Requested Claims', value: enrollmentRequestedClaims, onChange: setEnrollmentRequestedClaims, placeholder: 'employeeId, name, role' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
              <input value={f.value} onChange={e => f.onChange(e.target.value)} className="input-field" placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Profile Fields</label>
            <input value={enrollmentRequestedProfileFields} onChange={e => setEnrollmentRequestedProfileFields(e.target.value)} className="input-field" placeholder="headline, location" />
          </div>
          <div>
            <label style={{ display: 'block', color: '#475569', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Status Filter</label>
            <select value={enrollmentStatusFilter} onChange={e => setEnrollmentStatusFilter(e.target.value as 'all' | EnrollmentRequestStatus)} className="input-field">
              {[['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['expired', 'Expired']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={createEnrollmentRequestFromAdmin} disabled={enrollmentLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserPlusIcon style={{ width: 14, height: 14 }} />{enrollmentLoading ? 'Creating...' : 'Create Request'}
          </button>
          <span style={{ color: '#334155', fontSize: 11 }}>{enrollmentRequests.length} requests loaded</span>
        </div>

        {enrollmentMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '8px 12px', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8 }}>
            <CheckCircleIcon style={{ width: 14, height: 14, color: '#34d399' }} />
            <span style={{ color: '#34d399', fontSize: 12 }}>{enrollmentMessage}</span>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 960 }}>
            <thead><tr>
              {['Request ID', 'DID', 'Organization', 'Status', 'Requested Scopes', 'Decision', 'Updated'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {enrollmentRequests.map(req => {
                const sc = req.status === 'approved' ? { bg: 'rgba(5,150,105,0.12)', border: 'rgba(5,150,105,0.3)', text: '#34d399' } : req.status === 'rejected' ? { bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.3)', text: '#fca5a5' } : req.status === 'expired' ? { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' } : { bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)', text: '#fbbf24' };
                return (
                  <tr key={req.requestId}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{req.requestId}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, maxWidth: 180, wordBreak: 'break-all' }}>{req.did}</td>
                    <td><p style={{ margin: 0 }}>{req.requesterOrganizationName}</p><p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{req.requesterOrganizationId}</p></td>
                    <td><span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{req.status}</span></td>
                    <td style={{ fontSize: 11 }}><p style={{ margin: '0 0 2px', color: '#94a3b8' }}>{req.requestedClaims.join(', ') || 'None'}</p><p style={{ margin: 0, color: '#475569' }}>{req.requestedProfileFields.join(', ') || 'None'}</p></td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>{req.status === 'approved' ? `Claims: ${(req.approvedClaims || []).join(', ') || 'None'}` : req.status === 'rejected' ? `Reason: ${req.decisionReason || 'Rejected'}` : 'Awaiting decision'}</td>
                    <td style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>{new Date(req.updatedAt).toLocaleString()}</td>
                  </tr>
                );
              })}
              {enrollmentRequests.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#334155', padding: '32px 0' }}>
                  {enrollmentLoading ? 'Loading...' : 'No enrollment requests for current filter'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Directory */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <UsersIcon style={{ width: 16, height: 16, color: '#94a3b8' }} />
          <h3 style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, margin: 0 }}>Employee Directory ({employees.length})</h3>
        </div>
        <table className="data-table">
          <thead><tr>
            {['Employee', 'Department', 'Badge', 'Hash ID', 'Challenge Fingerprint'].map(h => <th key={h}>{h}</th>)}
          </tr></thead>
          <tbody>
            {employees.map(emp => {
              const bs = BADGE_STYLES[emp.badge] || BADGE_STYLES.employee;
              return (
                <tr key={emp.id}>
                  <td><p style={{ margin: 0, fontWeight: 600 }}>{emp.name}</p><p style={{ color: '#475569', fontSize: 11, margin: 0 }}>{emp.id}</p></td>
                  <td>{emp.department}</td>
                  <td><span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, background: bs.bg, border: `1px solid ${bs.border}`, color: bs.text, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{emp.badge}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all', maxWidth: 200 }}>{emp.hashId}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#475569' }}>{emp.challengeFingerprint || '—'}</td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#334155', padding: '32px 0' }}>
                {adminLoading ? 'Loading employees...' : 'Enter admin token and click Load Data'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Root Render ───────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', position: 'relative', overflow: 'hidden' }}>
      {renderTopNav()}

      {/* Error and offline banners */}
      {!isConnected && (
        <div style={{ position: 'relative', zIndex: 20, maxWidth: 1200, margin: '16px auto 0', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10 }}>
            <XCircleIcon style={{ width: 14, height: 14, color: '#fca5a5' }} />
            <span style={{ color: '#fca5a5', fontSize: 13 }}>Backend is offline. Start the backend service before performing login or admin operations.</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: 'relative', zIndex: 20, maxWidth: 1200, margin: '12px auto 0', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10 }}>
            <ExclamationTriangleIcon style={{ width: 14, height: 14, color: '#fca5a5' }} />
            <span style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        </div>
      )}

      <main style={{ position: 'relative', zIndex: 10 }}>
        {mode === 'admin' ? renderAdminPortal() : renderLoginPortal()}
      </main>
    </div>
  );
};

export default EnterprisePortalProfessional;
