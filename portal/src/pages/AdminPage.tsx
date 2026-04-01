import React, { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../utils/api';
import {
  UserPlusIcon,
  UsersIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  LinkIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
} from '@heroicons/react/24/outline';

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

type BadgeType = 'employee' | 'manager' | 'admin' | 'auditor';

const BADGE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  admin:    { bg: 'rgba(37,99,235,0.12)',   border: 'rgba(37,99,235,0.28)',   text: '#60a5fa' },
  auditor:  { bg: 'rgba(217,119,6,0.12)',   border: 'rgba(217,119,6,0.28)',   text: '#fbbf24' },
  manager:  { bg: 'rgba(124,58,237,0.12)',  border: 'rgba(124,58,237,0.28)',  text: '#a78bfa' },
  employee: { bg: 'rgba(100,116,139,0.1)',  border: 'rgba(100,116,139,0.22)', text: '#94a3b8' },
};

const AdminPage: React.FC = () => {
  const [adminToken, setAdminToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [blockchainStatus, setBlockchainStatus] = useState<BlockchainStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const [newEmployee, setNewEmployee] = useState({
    id: '',
    name: '',
    department: '',
    email: '',
    address: '',
    badge: 'employee' as BadgeType,
    registerOnChain: true,
  });

  const clearMessages = () => {
    setError('');
    setSuccess('');
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
    setEmployees([]);
    setAdminToken('');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    clearMessages();

    try {
      const [employeesRes, statusRes] = await Promise.all([
        AdminAPI.listEmployees(),
        AdminAPI.getBlockchainStatus(),
      ]);

      if (employeesRes.success && employeesRes.data) {
        setEmployees(employeesRes.data as Employee[]);
      }

      if (statusRes.success && statusRes.data) {
        setBlockchainStatus(statusRes.data as BlockchainStatus);
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

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const result = await AdminAPI.createEmployee(newEmployee);
      if (result.success) {
        showToast(`Employee ${newEmployee.id} created successfully!`);
        setNewEmployee({ id: '', name: '', department: '', email: '', address: '', badge: 'employee', registerOnChain: true });
        loadData();
        setActiveTab('list');
      } else {
        showToast(result.error || 'Failed to create employee', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create employee', 'error');
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
        minHeight: '100vh',
        background: '#050505',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        fontFamily: 'var(--font-sans)',
      }}>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        `}</style>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease both' }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(37,99,235,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <ShieldCheckIcon style={{ width: 24, height: 24, color: '#60a5fa' }} />
            </div>
            <h1 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
              Admin Portal
            </h1>
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>Enter your admin token to continue</p>
          </div>

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

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '28px 28px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Admin Token"
                  className="input-field"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  style={{ paddingLeft: 40 }}
                />
                <KeyIcon style={{ width: 15, height: 15, color: '#475569', position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
              <button
                onClick={handleLogin}
                className="btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px' }}
              >
                <ShieldCheckIcon style={{ width: 16, height: 16 }} />
                Authenticate
              </button>
            </div>
            <p style={{ color: '#334155', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
              Use the configured ADMIN_TOKEN from your environment
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated ──────────────────────────────────────────────────────────

  const chainColors = blockchainStatus ? getStatusColor(blockchainStatus.overallStatus) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-sans)' }}>
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 18px',
            background: chainColors.bg,
            border: `1px solid ${chainColors.border}`,
            borderRadius: 12,
            marginBottom: 24,
            animation: 'fadeUp 0.4s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: chainColors.dot,
                boxShadow: `0 0 6px ${chainColors.dot}`,
              }} />
              <CubeTransparentIcon style={{ width: 15, height: 15, color: chainColors.text }} />
              <span style={{ color: chainColors.text, fontSize: 13, fontWeight: 600 }}>
                Blockchain: {blockchainStatus.overallStatus.charAt(0).toUpperCase() + blockchainStatus.overallStatus.slice(1)}
              </span>
              {blockchainStatus.sepolia.networkStatus && (
                <span style={{ color: '#64748b', fontSize: 12 }}>
                  · Balance: {blockchainStatus.sepolia.networkStatus.walletBalance}
                  {blockchainStatus.sepolia.networkStatus.contractDeployed ? ' · Contract Deployed' : ' · Contract Not Deployed'}
                </span>
              )}
            </div>
            {blockchainStatus.sepolia.actionableMessages.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ExclamationTriangleIcon style={{ width: 13, height: 13, color: '#fbbf24' }} />
                <span style={{ color: '#fbbf24', fontSize: 12 }}>{blockchainStatus.sepolia.actionableMessages[0]}</span>
              </div>
            )}
          </div>
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

        {/* Page Header */}
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.35s ease both' }}>
          <h1 style={{ color: '#f8fafc', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            User Management
          </h1>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
            {employees.length} user{employees.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        {/* Tabs */}
        <div className="tab-nav" style={{ marginBottom: 24, display: 'inline-flex' }}>
          <button
            onClick={() => setActiveTab('list')}
            className={`tab-btn${activeTab === 'list' ? ' active' : ''}`}
          >
            <UsersIcon style={{ width: 14, height: 14 }} />
            Users ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`tab-btn${activeTab === 'create' ? ' active' : ''}`}
          >
            <UserPlusIcon style={{ width: 14, height: 14 }} />
            Create User
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'list' && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            overflow: 'hidden',
            animation: 'fadeUp 0.4s ease both',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Badge</th>
                    <th>Status</th>
                    <th>On-Chain</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const bs = BADGE_STYLES[employee.badge] || BADGE_STYLES.employee;
                    return (
                      <tr key={employee.id}>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8' }}>{employee.id}</span>
                        </td>
                        <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{employee.name}</td>
                        <td style={{ color: '#64748b' }}>{employee.department}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: bs.bg,
                            border: `1px solid ${bs.border}`,
                            color: bs.text,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}>
                            {employee.badge}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: employee.active ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)',
                            border: `1px solid ${employee.active ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`,
                            color: employee.active ? '#34d399' : '#f87171',
                            fontSize: 11,
                            fontWeight: 600,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                            {employee.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {employee.didRegistrationTxHash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${employee.didRegistrationTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34d399', fontSize: 12 }}
                            >
                              <LinkIcon style={{ width: 12, height: 12 }} />
                              Registered
                            </a>
                          ) : employee.onChainStatus === 'pending' ? (
                            <span style={{ color: '#fbbf24', fontSize: 12 }}>Pending</span>
                          ) : (
                            <span style={{ color: '#334155', fontSize: 12 }}>Not registered</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {!employee.didRegistrationTxHash && employee.active && (
                              <button
                                onClick={() => handleRegisterOnChain(employee.id)}
                                disabled={loading}
                                title="Register DID on-chain"
                                style={{
                                  padding: '5px',
                                  background: 'rgba(37,99,235,0.1)',
                                  border: '1px solid rgba(37,99,235,0.22)',
                                  borderRadius: 7,
                                  color: '#60a5fa',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  opacity: loading ? 0.5 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <LinkIcon style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                            {employee.active && (
                              <button
                                onClick={() => handleIssueCredential(employee.id)}
                                disabled={loading}
                                title="Issue credential"
                                style={{
                                  padding: '5px',
                                  background: 'rgba(124,58,237,0.1)',
                                  border: '1px solid rgba(124,58,237,0.22)',
                                  borderRadius: 7,
                                  color: '#a78bfa',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  opacity: loading ? 0.5 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <KeyIcon style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleActive(employee)}
                              disabled={loading}
                              title={employee.active ? 'Deactivate' : 'Reactivate'}
                              style={{
                                padding: '5px',
                                background: employee.active ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)',
                                border: `1px solid ${employee.active ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)'}`,
                                borderRadius: 7,
                                color: employee.active ? '#f87171' : '#34d399',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {employee.active
                                ? <XCircleIcon style={{ width: 14, height: 14 }} />
                                : <CheckCircleIcon style={{ width: 14, height: 14 }} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <UsersIcon style={{ width: 28, height: 28, color: '#334155' }} />
                          <span style={{ color: '#475569', fontSize: 13 }}>No employees found. Create one to get started.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Employee Form */}
        {activeTab === 'create' && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '28px',
            animation: 'fadeUp 0.4s ease both',
          }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#f8fafc', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 4px' }}>
                Create New Employee
              </h2>
              <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>Register a new identity in the system</p>
            </div>

            <form onSubmit={handleCreateEmployee} style={{ maxWidth: 680 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                    EMPLOYEE ID *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.id}
                    onChange={(e) => setNewEmployee({ ...newEmployee, id: e.target.value })}
                    placeholder="e.g., EMP005"
                    required
                    className="input-field"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                    FULL NAME *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="e.g., John Doe"
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                    DEPARTMENT *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    placeholder="e.g., Engineering"
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                    EMAIL *
                  </label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="e.g., john@company.com"
                    required
                    className="input-field"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                    WALLET ADDRESS *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.address}
                    onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                    placeholder="0x..."
                    required
                    pattern="^0x[a-fA-F0-9]{40}$"
                    className="input-field"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                  <p style={{ color: '#334155', fontSize: 11, marginTop: 5 }}>Ethereum address (0x followed by 40 hex characters)</p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: 12, fontWeight: 500, marginBottom: 6, letterSpacing: '0.03em' }}>
                    BADGE
                  </label>
                  <select
                    value={newEmployee.badge}
                    onChange={(e) => setNewEmployee({ ...newEmployee, badge: e.target.value as BadgeType })}
                    className="input-field"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div
                      onClick={() => setNewEmployee({ ...newEmployee, registerOnChain: !newEmployee.registerOnChain })}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `1px solid ${newEmployee.registerOnChain ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.15)'}`,
                        background: newEmployee.registerOnChain ? 'rgba(37,99,235,0.2)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {newEmployee.registerOnChain && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Register DID on-chain immediately</span>
                  </label>
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
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
