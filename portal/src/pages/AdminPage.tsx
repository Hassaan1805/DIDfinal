import React, { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../utils/api';
import {
  UserPlusIcon,
  UsersIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  LinkIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import GlassSurface from '../components/GlassSurface';

interface Employee {
  id: string;
  name: string;
  department: string;
  email: string;
  address: string;
  did: string;
  active: boolean;
  badge: string;
  permissions: string[];
  hashId?: string;
  didRegistrationTxHash?: string;
  onChainStatus?: string;
  credential?: {
    issued: boolean;
    credentialId?: string;
    issuedAt?: string;
    expiresAt?: string;
    status?: 'active' | 'revoked' | 'expired' | 'unknown';
  };
}

interface BlockchainStatus {
  overallStatus: 'operational' | 'degraded' | 'unavailable';
  sepolia: {
    ready: boolean;
    status: string;
    actionableMessages: string[];
    networkStatus?: {
      walletBalance: string;
      contractDeployed: boolean;
    };
  };
}

interface EnrollmentRequest {
  requestId: string;
  did: string;
  requesterOrganizationId: string;
  requesterOrganizationName: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  decidedAt?: string;
  decisionReason?: string;
  employeeData?: { id: string; name: string; department: string; email: string; badge: string };
}

type BadgeType = 'employee' | 'manager' | 'admin' | 'auditor';
type AdminLoginStage = 'welcome' | 'form';
type ActiveTab = 'list' | 'enroll' | 'enrollments';

const BADGE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  admin:    { bg: 'rgba(37,99,235,0.12)',   border: 'rgba(37,99,235,0.28)',   text: '#60a5fa' },
  auditor:  { bg: 'rgba(217,119,6,0.12)',   border: 'rgba(217,119,6,0.28)',   text: '#fbbf24' },
  manager:  { bg: 'rgba(124,58,237,0.12)',  border: 'rgba(124,58,237,0.28)',  text: '#a78bfa' },
  employee: { bg: 'rgba(100,116,139,0.1)',  border: 'rgba(100,116,139,0.22)', text: '#94a3b8' },
};

const AdminPage: React.FC = () => {
  const [adminToken, setAdminToken] = useState<string>('');
  const [adminLoginStage, setAdminLoginStage] = useState<AdminLoginStage>('welcome');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
  const [blockchainStatus, setBlockchainStatus] = useState<BlockchainStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [badgeEdits, setBadgeEdits] = useState<Record<string, BadgeType>>({});

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const [newEnrollment, setNewEnrollment] = useState({
    id: '',
    name: '',
    department: '',
    email: '',
    address: '',
    badge: 'employee' as BadgeType,
  });

  const clearMessages = () => {
    setError('');
  };

  const handleLogin = () => {
    if (!adminToken.trim()) {
      setError('Please enter an admin token');
      return;
    }
    AdminAPI.setAdminToken(adminToken);
    setIsAuthenticated(true);
    clearMessages();
    loadData();
  };

  const handleLogout = () => {
    AdminAPI.clearAdminToken();
    setIsAuthenticated(false);
    setAdminLoginStage('welcome');
    setEmployees([]);
    setAdminToken('');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    clearMessages();

    try {
      const [employeesRes, statusRes, enrollmentsRes] = await Promise.all([
        AdminAPI.listEmployees(),
        AdminAPI.getBlockchainStatus(),
        AdminAPI.listEnrollmentRequests(),
      ]);

      if (employeesRes.success && employeesRes.data) {
        setEmployees(employeesRes.data as Employee[]);
      }

      if (statusRes.success && statusRes.data) {
        setBlockchainStatus(statusRes.data as BlockchainStatus);
      }

      if (enrollmentsRes.success && enrollmentsRes.data) {
        setEnrollmentRequests(enrollmentsRes.data as EnrollmentRequest[]);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setError('Authentication failed. Please check your admin token.');
        setIsAuthenticated(false);
      } else {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = AdminAPI.getAdminToken();
    if (savedToken) {
      setAdminToken(savedToken);
      AdminAPI.setAdminToken(savedToken);
      AdminAPI.listEmployees()
        .then(() => {
          setIsAuthenticated(true);
          loadData();
        })
        .catch(() => {
          AdminAPI.clearAdminToken();
          setAdminToken('');
        });
    }
  }, [loadData]);

  // Silent background poll — keeps enrollment status + user list current without spinner
  useEffect(() => {
    if (!isAuthenticated) return;
    const poll = async () => {
      try {
        const [empRes, enrollRes] = await Promise.all([
          AdminAPI.listEmployees(),
          AdminAPI.listEnrollmentRequests(),
        ]);
        if (empRes.success && empRes.data) setEmployees(empRes.data as Employee[]);
        if (enrollRes.success && enrollRes.data) setEnrollmentRequests(enrollRes.data as EnrollmentRequest[]);
      } catch { /* silent */ }
    };
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  const handleSendEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    const did = `did:ethr:${newEnrollment.address.trim().toLowerCase()}`;
    try {
      const result = await AdminAPI.sendEnrollmentRequest({
        did,
        requesterOrganizationId: 'dtp_enterprise_001',
        requesterOrganizationName: 'DTP Enterprise',
        purpose: 'Employee onboarding',
        employeeData: {
          id: newEnrollment.id.trim().toUpperCase(),
          name: newEnrollment.name.trim(),
          department: newEnrollment.department.trim(),
          email: newEnrollment.email.trim().toLowerCase(),
          badge: newEnrollment.badge,
        },
      });
      if (result.success) {
        showToast(`Enrollment request sent to ${newEnrollment.name} — waiting for wallet approval`);
        setNewEnrollment({ id: '', name: '', department: '', email: '', address: '', badge: 'employee' });
        loadData();
        setActiveTab('enrollments');
      } else {
        showToast(result.error || 'Failed to send enrollment request', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send enrollment request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOnChain = async (employeeId: string) => {
    setLoading(true);
    clearMessages();
    try {
      const result = await AdminAPI.registerOnChain(employeeId);
      if (result.success) {
        showToast(`Employee ${employeeId} registered on-chain!`);
        loadData();
      } else {
        showToast(result.error || 'Failed to register on-chain', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to register on-chain', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCredential = async (employeeId: string) => {
    setLoading(true);
    clearMessages();
    try {
      const result = await AdminAPI.issueCredential(employeeId);
      if (result.success) {
        showToast(`Credential issued to ${employeeId}!`);
        loadData();
      } else {
        showToast(result.error || 'Failed to issue credential', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to issue credential', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!window.confirm(`Permanently delete ${employee.id} (${employee.name})? This cannot be undone.`)) return;
    setLoading(true);
    clearMessages();
    try {
      const result = await AdminAPI.deleteEmployee(employee.id);
      if (result.success) {
        showToast(`Employee ${employee.id} permanently deleted`);
        loadData();
      } else {
        showToast(result.error || 'Failed to delete employee', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete employee', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    setLoading(true);
    clearMessages();
    try {
      const result = employee.active
        ? await AdminAPI.deactivateEmployee(employee.id)
        : await AdminAPI.reactivateEmployee(employee.id);
      if (result.success) {
        showToast(`Employee ${employee.id} ${employee.active ? 'deactivated' : 'reactivated'}!`);
        loadData();
      } else {
        showToast(result.error || 'Failed to update employee status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBadge = async (employee: Employee) => {
    const newBadge = badgeEdits[employee.id] || employee.badge;
    setLoading(true);
    clearMessages();
    try {
      const result = await AdminAPI.issueCredential(employee.id, newBadge);
      if (result.success) {
        showToast(`Badge updated to ${newBadge} and credential re-issued for ${employee.id}`);
        setBadgeEdits(prev => { const n = { ...prev }; delete n[employee.id]; return n; });
        loadData();
      } else {
        showToast(result.error || 'Failed to update badge', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update badge', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCredential = async (employee: Employee) => {
    if (!window.confirm(`Revoke credential for ${employee.id} (${employee.name})?\n\nThey will lose badge-level access until a new credential is issued.`)) return;
    setLoading(true);
    clearMessages();
    try {
      const result = await AdminAPI.revokeCredential(employee.id);
      if (result.success) {
        showToast(`Credential revoked for ${employee.id}`);
        loadData();
      } else {
        showToast(result.error || 'Failed to revoke credential', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke credential', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return { dot: '#34d399', text: '#34d399', bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.25)' };
      case 'degraded': return { dot: '#fbbf24', text: '#fbbf24', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.25)' };
      default: return { dot: '#f87171', text: '#f87171', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)' };
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 52px)',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        fontFamily: 'var(--font-sans)',
      }}>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        `}</style>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease both' }}>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.22)',
              borderRadius: 10,
              marginBottom: 16,
            }}>
              <XCircleIcon style={{ width: 15, height: 15, color: '#f87171', flexShrink: 0 }} />
              <span style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>
            </div>
          )}

          {adminLoginStage === 'welcome' ? (
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
                <p className="portal-welcome-glass__eyebrow">Admin Access</p>
                <h2 className="portal-welcome-glass__title">Welcome To Admin</h2>
                <p className="portal-welcome-glass__description">
                  Manage users, badges, and on-chain actions from a secured enterprise control panel.
                </p>

                <button
                  onClick={() => setAdminLoginStage('form')}
                  className="btn-primary"
                  style={{ width: '100%', padding: '13px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <ArrowRightOnRectangleIcon style={{ width: 16, height: 16 }} />
                  Open Admin Login
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
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Admin Token</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      value={adminToken}
                      onChange={(e) => setAdminToken(e.target.value)}
                      placeholder="Enter admin token"
                      className="input-field"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      style={{ paddingLeft: 40 }}
                    />
                    <KeyIcon style={{ width: 15, height: 15, color: '#94a3b8', position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setAdminLoginStage('welcome')}
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
                    onClick={handleLogin}
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '13px 20px' }}
                  >
                    <ShieldCheckIcon style={{ width: 16, height: 16 }} />
                    Authenticate
                  </button>
                </div>

                <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 14, marginBottom: 0, textAlign: 'center' }}>
                  Use the configured ADMIN_TOKEN from your environment
                </p>
              </div>
            </GlassSurface>
          )}
        </div>
      </div>
    );
  }

  // ── Authenticated ──────────────────────────────────────────────────────────

  const chainColors = blockchainStatus ? getStatusColor(blockchainStatus.overallStatus) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 18px',
          borderRadius: 12,
          animation: 'toastIn 0.25s ease both',
          background: toast.type === 'success' ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.3)'}`,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          maxWidth: 360,
        }}>
          {toast.type === 'success'
            ? <CheckCircleIcon style={{ width: 16, height: 16, color: '#34d399', flexShrink: 0 }} />
            : <XCircleIcon style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0 }} />}
          <span style={{ color: toast.type === 'success' ? '#34d399' : '#fca5a5', fontSize: 13, fontWeight: 500 }}>
            {toast.message}
          </span>
        </div>
      )}

      {/* Top Nav */}
      <div style={{
        height: 54,
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheckIcon style={{ width: 18, height: 18, color: '#60a5fa' }} />
          <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Admin Portal</span>
          <span style={{ color: '#334155', fontSize: 12 }}>/ Management</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <ArrowPathIcon style={{ width: 13, height: 13, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <ArrowRightOnRectangleIcon style={{ width: 13, height: 13 }} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Blockchain Status */}
        {blockchainStatus && chainColors && (
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={14}
            borderWidth={0.08}
            backgroundOpacity={0.08}
            saturation={1.2}
            displace={0.4}
            distortionScale={-145}
            redOffset={0}
            greenOffset={6}
            blueOffset={12}
            brightness={56}
            opacity={0.94}
            blur={10}
            mixBlendMode="screen"
            className="admin-panel-glass admin-panel-glass--status"
            style={{ marginBottom: 24, animation: 'fadeUp 0.4s ease both' }}
          >
            <div className="admin-panel-glass__body admin-panel-glass__body--compact">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                padding: 0,
                background: chainColors.bg,
                border: `1px solid ${chainColors.border}`,
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', flexWrap: 'wrap' }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: chainColors.dot,
                    boxShadow: `0 0 6px ${chainColors.dot}`,
                  }} />
                  <CubeTransparentIcon style={{ width: 15, height: 15, color: chainColors.text }} />
                  <span style={{ color: chainColors.text, fontSize: 13, fontWeight: 700 }}>
                    Blockchain: {blockchainStatus.overallStatus.charAt(0).toUpperCase() + blockchainStatus.overallStatus.slice(1)}
                  </span>
                  {blockchainStatus.sepolia.networkStatus && (
                    <span style={{ color: '#cbd5e1', fontSize: 12 }}>
                      · Balance: {blockchainStatus.sepolia.networkStatus.walletBalance}
                      {blockchainStatus.sepolia.networkStatus.contractDeployed ? ' · Contract Deployed' : ' · Contract Not Deployed'}
                    </span>
                  )}
                </div>
                {blockchainStatus.sepolia.actionableMessages.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px' }}>
                    <ExclamationTriangleIcon style={{ width: 13, height: 13, color: '#fbbf24' }} />
                    <span style={{ color: '#fbbf24', fontSize: 12 }}>{blockchainStatus.sepolia.actionableMessages[0]}</span>
                  </div>
                )}
              </div>
            </div>
          </GlassSurface>
        )}

        {/* Error Banner */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.22)',
            borderRadius: 10,
            marginBottom: 20,
          }}>
            <XCircleIcon style={{ width: 15, height: 15, color: '#f87171', flexShrink: 0 }} />
            <span style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* Page Header + Tabs */}
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={16}
          borderWidth={0.08}
          backgroundOpacity={0.08}
          saturation={1.2}
          displace={0.45}
          distortionScale={-150}
          redOffset={0}
          greenOffset={6}
          blueOffset={12}
          brightness={56}
          opacity={0.94}
          blur={10}
          mixBlendMode="screen"
          className="admin-panel-glass"
          style={{ marginBottom: 24, animation: 'fadeUp 0.35s ease both' }}
        >
          <div className="admin-panel-glass__body">
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ color: '#f8fafc', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
                User Management
              </h1>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                {employees.length} active · {enrollmentRequests.filter(r => r.status === 'pending').length} pending enrollment
              </p>
            </div>

            <div className="tab-nav admin-tab-nav" style={{ display: 'inline-flex' }}>
              <button
                onClick={() => setActiveTab('list')}
                className={`tab-btn${activeTab === 'list' ? ' active' : ''}`}
              >
                <UsersIcon style={{ width: 14, height: 14 }} />
                Users ({employees.length})
              </button>
              <button
                onClick={() => setActiveTab('enrollments')}
                className={`tab-btn${activeTab === 'enrollments' ? ' active' : ''}`}
              >
                <ShieldCheckIcon style={{ width: 14, height: 14 }} />
                Enrollments ({enrollmentRequests.length})
                {enrollmentRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span style={{
                    marginLeft: 4,
                    background: '#fbbf24',
                    color: '#000',
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                  }}>
                    {enrollmentRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('enroll')}
                className={`tab-btn${activeTab === 'enroll' ? ' active' : ''}`}
              >
                <UserPlusIcon style={{ width: 14, height: 14 }} />
                Enroll User
              </button>
            </div>
          </div>
        </GlassSurface>

        {/* Users Table */}
        {activeTab === 'list' && (
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={14}
            borderWidth={0.08}
            backgroundOpacity={0.08}
            saturation={1.2}
            displace={0.38}
            distortionScale={-140}
            redOffset={0}
            greenOffset={6}
            blueOffset={10}
            brightness={54}
            opacity={0.94}
            blur={9}
            mixBlendMode="screen"
            className="admin-panel-glass admin-table-glass"
            style={{ animation: 'fadeUp 0.4s ease both' }}
          >
            <div className="admin-panel-glass__body">
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table admin-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Badge</th>
                    <th>Status</th>
                    <th>Credential</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const bs = BADGE_STYLES[employee.badge] || BADGE_STYLES.employee;
                    const isExpanded = expandedId === employee.id;
                    const editBadge = (badgeEdits[employee.id] || employee.badge) as BadgeType;
                    const cred = employee.credential;
                    const credColor = !cred?.issued
                      ? { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', text: '#64748b', label: 'Not issued' }
                      : cred.status === 'active'
                        ? { bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.25)', text: '#34d399', label: 'Active' }
                        : cred.status === 'revoked'
                          ? { bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)', text: '#f87171', label: 'Revoked' }
                          : { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', text: '#94a3b8', label: cred.status ?? 'Unknown' };

                    const btnBase: React.CSSProperties = {
                      padding: '5px', borderRadius: 7, cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center',
                    };

                    return (
                      <React.Fragment key={employee.id}>
                        {/* ── Summary row ── */}
                        <tr
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpandedId(isExpanded ? null : employee.id)}
                        >
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8' }}>{employee.id}</span>
                          </td>
                          <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{employee.name}</td>
                          <td style={{ color: '#cbd5e1' }}>{employee.department}</td>
                          <td>
                            <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, background: bs.bg, border: `1px solid ${bs.border}`, color: bs.text, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              {employee.badge}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: employee.active ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)', border: `1px solid ${employee.active ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`, color: employee.active ? '#34d399' : '#f87171', fontSize: 11, fontWeight: 600 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                              {employee.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: credColor.bg, border: `1px solid ${credColor.border}`, color: credColor.text, fontSize: 11, fontWeight: 600 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                              {credColor.label}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                              {!employee.didRegistrationTxHash && employee.active && (
                                <button onClick={() => handleRegisterOnChain(employee.id)} disabled={loading} title="Register DID on-chain"
                                  style={{ ...btnBase, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.22)', color: '#60a5fa' }}>
                                  <LinkIcon style={{ width: 14, height: 14 }} />
                                </button>
                              )}
                              <button onClick={() => handleToggleActive(employee)} disabled={loading} title={employee.active ? 'Deactivate' : 'Reactivate'}
                                style={{ ...btnBase, background: employee.active ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)', border: `1px solid ${employee.active ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)'}`, color: employee.active ? '#f87171' : '#34d399' }}>
                                {employee.active ? <XCircleIcon style={{ width: 14, height: 14 }} /> : <CheckCircleIcon style={{ width: 14, height: 14 }} />}
                              </button>
                              <button onClick={() => handleDeleteEmployee(employee)} disabled={loading} title="Permanently delete"
                                style={{ ...btnBase, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)', color: '#f87171', opacity: loading ? 0.5 : 0.7 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                </svg>
                              </button>
                              <button onClick={() => setExpandedId(isExpanded ? null : employee.id)} title={isExpanded ? 'Collapse' : 'Manage'}
                                style={{ ...btnBase, background: isExpanded ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', border: `1px solid ${isExpanded ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.2)'}`, color: '#818cf8' }}>
                                {isExpanded ? <ChevronUpIcon style={{ width: 14, height: 14 }} /> : <ChevronDownIcon style={{ width: 14, height: 14 }} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ── Expand panel ── */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: '0 0 8px', border: 'none' }}>
                              <div style={{ margin: '0 2px 0', background: 'rgba(15,18,32,0.7)', border: '1px solid rgba(99,102,241,0.15)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '20px 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>

                                {/* Permissions */}
                                <div>
                                  <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, margin: '0 0 10px' }}>Permissions</p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {employee.permissions.length > 0 ? employee.permissions.map(p => (
                                      <span key={p} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 7px', borderRadius: 5, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', whiteSpace: 'nowrap' }}>{p}</span>
                                    )) : (
                                      <span style={{ color: '#64748b', fontSize: 12 }}>No permissions assigned</span>
                                    )}
                                  </div>
                                </div>

                                {/* Badge & Credential */}
                                <div>
                                  <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Badge & Credential</p>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                                    <select
                                      value={editBadge}
                                      onChange={e => setBadgeEdits(prev => ({ ...prev, [employee.id]: e.target.value as BadgeType }))}
                                      onClick={e => e.stopPropagation()}
                                      style={{ flex: 1, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', fontSize: 12, cursor: 'pointer' }}
                                    >
                                      {(['employee', 'manager', 'admin', 'auditor'] as BadgeType[]).map(b => (
                                        <option key={b} value={b} style={{ background: '#1e2030' }}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={e => { e.stopPropagation(); handleUpdateBadge(employee); }}
                                      disabled={loading}
                                      title="Update badge and re-issue credential"
                                      style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#818cf8', fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                                    >
                                      <KeyIcon style={{ width: 12, height: 12 }} />
                                      Update & Re-issue
                                    </button>
                                  </div>
                                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: cred?.issued ? 6 : 0 }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: credColor.bg, border: `1px solid ${credColor.border}`, color: credColor.text, fontSize: 11, fontWeight: 600 }}>
                                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                                        Credential {credColor.label}
                                      </span>
                                      {cred?.issued && cred.status === 'active' && (
                                        <button
                                          onClick={e => { e.stopPropagation(); handleRevokeCredential(employee); }}
                                          disabled={loading}
                                          title="Revoke credential"
                                          style={{ padding: '4px 8px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 7, color: '#f87171', fontSize: 10, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                          <NoSymbolIcon style={{ width: 11, height: 11 }} />
                                          Revoke
                                        </button>
                                      )}
                                    </div>
                                    {cred?.issued && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
                                        {cred.issuedAt && <span style={{ color: '#64748b', fontSize: 11 }}>Issued: <span style={{ color: '#94a3b8' }}>{new Date(cred.issuedAt).toLocaleDateString()}</span></span>}
                                        {cred.expiresAt && <span style={{ color: '#64748b', fontSize: 11 }}>Expires: <span style={{ color: '#94a3b8' }}>{new Date(cred.expiresAt).toLocaleDateString()}</span></span>}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Identity */}
                                <div>
                                  <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Identity</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[
                                      { label: 'DID', value: employee.did.length > 24 ? `${employee.did.slice(0, 18)}…${employee.did.slice(-6)}` : employee.did },
                                      { label: 'Address', value: employee.address.length > 20 ? `${employee.address.slice(0, 10)}…${employee.address.slice(-6)}` : employee.address },
                                      { label: 'Email', value: employee.email },
                                    ].map(({ label, value }) => (
                                      <div key={label} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                                        <span style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, width: 52 }}>{label}</span>
                                        <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: label !== 'Email' ? 'var(--font-mono)' : undefined, wordBreak: 'break-all' }}>{value}</span>
                                      </div>
                                    ))}
                                    {employee.didRegistrationTxHash && (
                                      <a href={`https://sepolia.etherscan.io/tx/${employee.didRegistrationTxHash}`} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34d399', fontSize: 11, marginTop: 2 }}>
                                        <LinkIcon style={{ width: 11, height: 11 }} />
                                        On-chain
                                      </a>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {enrollmentRequests
                    .filter(r => r.status === 'pending' && r.employeeData)
                    .map(req => {
                      const bs = BADGE_STYLES[req.employeeData!.badge] || BADGE_STYLES.employee;
                      return (
                        <tr key={`pending-${req.requestId}`} style={{ opacity: 0.75 }}>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8' }}>{req.employeeData!.id}</span></td>
                          <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{req.employeeData!.name}</td>
                          <td style={{ color: '#cbd5e1' }}>{req.employeeData!.department}</td>
                          <td>
                            <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, background: bs.bg, border: `1px solid ${bs.border}`, color: bs.text, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              {req.employeeData!.badge}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                              Requested
                            </span>
                          </td>
                          <td><span style={{ color: '#94a3b8', fontSize: 12 }}>—</span></td>
                          <td><span style={{ color: '#94a3b8', fontSize: 12 }}>—</span></td>
                        </tr>
                      );
                    })}
                  {employees.length === 0 && enrollmentRequests.filter(r => r.status === 'pending').length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <UsersIcon style={{ width: 28, height: 28, color: '#64748b' }} />
                          <span style={{ color: '#94a3b8', fontSize: 13 }}>No employees found. Create one to get started.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </GlassSurface>
        )}

        {/* Enrollments List */}
        {activeTab === 'enrollments' && (
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={14}
            borderWidth={0.08}
            backgroundOpacity={0.08}
            saturation={1.2}
            displace={0.38}
            distortionScale={-140}
            redOffset={0}
            greenOffset={6}
            blueOffset={10}
            brightness={54}
            opacity={0.94}
            blur={9}
            mixBlendMode="screen"
            className="admin-panel-glass admin-table-glass"
            style={{ animation: 'fadeUp 0.4s ease both' }}
          >
            <div className="admin-panel-glass__body">
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table admin-data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Badge</th>
                      <th>Sent To (DID)</th>
                      <th>Status</th>
                      <th>Sent</th>
                      <th>Decided</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentRequests.map((req) => {
                      const bs = BADGE_STYLES[req.employeeData?.badge || 'employee'] || BADGE_STYLES.employee;
                      const statusColors: Record<string, { bg: string; border: string; color: string }> = {
                        pending:  { bg: 'rgba(217,119,6,0.1)',  border: 'rgba(217,119,6,0.25)',  color: '#fbbf24' },
                        approved: { bg: 'rgba(5,150,105,0.1)',  border: 'rgba(5,150,105,0.25)',  color: '#34d399' },
                        rejected: { bg: 'rgba(220,38,38,0.1)',  border: 'rgba(220,38,38,0.25)',  color: '#f87171' },
                        expired:  { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
                      };
                      const sc = statusColors[req.status] || statusColors.pending;
                      return (
                        <tr key={req.requestId}>
                          <td>
                            <div style={{ color: '#f1f5f9', fontWeight: 500 }}>{req.employeeData?.name || '—'}</div>
                            <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{req.employeeData?.id || '—'}</div>
                          </td>
                          <td style={{ color: '#cbd5e1' }}>{req.employeeData?.department || '—'}</td>
                          <td>
                            <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, background: bs.bg, border: `1px solid ${bs.border}`, color: bs.text, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              {req.employeeData?.badge || '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748b' }}>
                              {req.did.length > 20 ? `${req.did.slice(0, 14)}…${req.did.slice(-6)}` : req.did}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontSize: 11, fontWeight: 600 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: 12 }}>
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ color: '#64748b', fontSize: 12 }}>
                            {req.decidedAt ? new Date(req.decidedAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {enrollmentRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <ShieldCheckIcon style={{ width: 28, height: 28, color: '#64748b' }} />
                            <span style={{ color: '#94a3b8', fontSize: 13 }}>No enrollment requests yet. Use "Enroll User" to send one.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassSurface>
        )}

        {/* Enroll User Form */}
        {activeTab === 'enroll' && (
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={16}
            borderWidth={0.08}
            backgroundOpacity={0.08}
            saturation={1.2}
            displace={0.45}
            distortionScale={-150}
            redOffset={0}
            greenOffset={6}
            blueOffset={12}
            brightness={56}
            opacity={0.94}
            blur={10}
            mixBlendMode="screen"
            className="admin-panel-glass"
            style={{ animation: 'fadeUp 0.4s ease both' }}
          >
            <div className="admin-panel-glass__body">
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ color: '#f8fafc', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 4px' }}>
                  Enroll New User
                </h2>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                  Sends an enrollment request to the user's wallet. They must approve before their account is created.
                </p>
              </div>

              <form onSubmit={handleSendEnrollment} style={{ maxWidth: 680 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                      EMPLOYEE ID *
                    </label>
                    <input
                      type="text"
                      value={newEnrollment.id}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, id: e.target.value })}
                      placeholder="e.g., EMP005"
                      required
                      className="input-field"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      value={newEnrollment.name}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, name: e.target.value })}
                      placeholder="e.g., John Doe"
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                      DEPARTMENT *
                    </label>
                    <input
                      type="text"
                      value={newEnrollment.department}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, department: e.target.value })}
                      placeholder="e.g., Engineering"
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                      EMAIL *
                    </label>
                    <input
                      type="email"
                      value={newEnrollment.email}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, email: e.target.value })}
                      placeholder="e.g., john@company.com"
                      required
                      className="input-field"
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                      WALLET ADDRESS *
                    </label>
                    <input
                      type="text"
                      value={newEnrollment.address}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, address: e.target.value })}
                      placeholder="0x..."
                      required
                      pattern="^0x[a-fA-F0-9]{40}$"
                      className="input-field"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                    />
                    <p style={{ color: '#64748b', fontSize: 11, marginTop: 5 }}>
                      User shares this from their wallet. The enrollment request will be sent to their DID.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                      BADGE
                    </label>
                    <select
                      value={newEnrollment.badge}
                      onChange={(e) => setNewEnrollment({ ...newEnrollment, badge: e.target.value as BadgeType })}
                      className="input-field"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </div>
                </div>

                <div style={{ paddingTop: 8 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px' }}
                  >
                    {loading
                      ? <ArrowPathIcon style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />
                      : <UserPlusIcon style={{ width: 16, height: 16 }} />}
                    Send Enrollment Request
                  </button>
                </div>
              </form>
            </div>
          </GlassSurface>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
