import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useLocation, useNavigate } from 'react-router-dom';
import Orb from './components/Orb';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type PortalMode = 'login' | 'admin';
type BadgeType = 'employee' | 'manager' | 'admin' | 'auditor';
type AuthStep = 'login' | 'qr' | 'authenticated';
type PortalSection = 'dashboard' | 'projects' | 'security' | 'blockchain' | 'analytics' | 'audit';

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
}

interface StatusData {
  status: 'pending' | 'completed';
  token?: string;
  did?: string;
  userAddress?: string;
  employeeId?: string;
  employeeName?: string;
  badge?: BadgeType;
  permissions?: string[];
  hashId?: string;
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

interface ProjectRecord {
  code: string;
  name: string;
  ownerId: string;
  owner: string;
  progress: number;
  risk: 'Low' | 'Medium' | 'High';
  networkTx: number;
  budget: string;
  eta: string;
  teamMembers: string[];
}

const BADGE_OPTIONS: Array<{ value: BadgeType; label: string }> = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'auditor', label: 'Auditor' },
];

const PROJECT_DATASET: {
  managerTeamMap: Record<string, string[]>;
  catalog: ProjectRecord[];
} = {
  managerTeamMap: {
    EMP001: ['EMP001', 'EMP002', 'EMP003', 'EMP004'],
    EMP002: ['EMP002', 'EMP003', 'EMP004'],
  },
  catalog: [
  {
    code: 'PRJ-001',
    name: 'DID Wallet Authentication Revamp',
    ownerId: 'EMP001',
    owner: 'Zaid',
    progress: 84,
    risk: 'Medium',
    networkTx: 128,
    budget: '$46,000',
    eta: '6 days',
    teamMembers: ['EMP001', 'EMP002', 'EMP003'],
  },
  {
    code: 'PRJ-002',
    name: 'Role Credential Issuance Automation',
    ownerId: 'EMP002',
    owner: 'Hassaan',
    progress: 71,
    risk: 'Low',
    networkTx: 93,
    budget: '$32,500',
    eta: '11 days',
    teamMembers: ['EMP002', 'EMP003', 'EMP004'],
  },
  {
    code: 'PRJ-003',
    name: 'Enterprise Access Insights Dashboard',
    ownerId: 'EMP003',
    owner: 'Atharva',
    progress: 63,
    risk: 'Medium',
    networkTx: 77,
    budget: '$27,300',
    eta: '15 days',
    teamMembers: ['EMP003', 'EMP004'],
  },
  {
    code: 'PRJ-004',
    name: 'Auditor Evidence Vault Integration',
    ownerId: 'EMP004',
    owner: 'Gracian',
    progress: 58,
    risk: 'Medium',
    networkTx: 42,
    budget: '$19,800',
    eta: '19 days',
    teamMembers: ['EMP004', 'EMP001'],
  },
  {
    code: 'PRJ-005',
    name: 'Sepolia Traceability Control Plane',
    ownerId: 'EMP002',
    owner: 'Hassaan',
    progress: 52,
    risk: 'High',
    networkTx: 156,
    budget: '$54,900',
    eta: '24 days',
    teamMembers: ['EMP001', 'EMP002', 'EMP003', 'EMP004'],
  },
  ],
};

const EnterprisePortalProfessional: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<PortalMode>(location.pathname.startsWith('/admin') ? 'admin' : 'login');
  const [isConnected, setIsConnected] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [authStatus, setAuthStatus] = useState<StatusData | null>(null);
  const [portalSection, setPortalSection] = useState<PortalSection>('dashboard');

  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || 'admin-dev-token');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('EMP001');
  const [selectedBadge, setSelectedBadge] = useState<BadgeType>('employee');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  const [error, setError] = useState('');

  const currentEmployee = useMemo(() => {
    const sourceEmployeeId = authStatus?.employeeId || challengeData?.employee?.id;
    return employees.find((employee) => employee.id === sourceEmployeeId) || challengeData?.employee || null;
  }, [authStatus?.employeeId, challengeData?.employee, employees]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        setIsConnected(response.ok);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 10000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setMode(location.pathname.startsWith('/admin') ? 'admin' : 'login');
  }, [location.pathname]);

  useEffect(() => {
    if (mode === 'admin') {
      void loadEmployees();
    }
  }, [mode]);

  const getAuthHeaders = (tokenOverride?: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenOverride || adminToken}`,
  });

  const loadEmployees = async () => {
    setAdminLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        headers: getAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load employees');
      }
      setEmployees(payload.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load employees');
    } finally {
      setAdminLoading(false);
    }
  };

  const applyBadge = async () => {
    if (!selectedEmployeeId) return;
    setAdminLoading(true);
    setAdminMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/admin/employees/${selectedEmployeeId}/badge`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ badge: selectedBadge }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to assign badge');
      }

      const data = payload.data as AdminBadgeData;
      setAdminMessage(`Badge updated: ${data.employee.name} -> ${data.badge.label}. New challenge scope: ${data.badge.challengeScope}`);
      await loadEmployees();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign badge');
    } finally {
      setAdminLoading(false);
    }
  };

  const startLogin = async () => {
    setError('');
    setAuthStatus(null);

    if (!employeeId.trim()) {
      setError('Please enter employee ID');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId.trim().toUpperCase(),
          requestType: 'portal_access',
          companyId: 'dtp_enterprise_001',
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to generate challenge');
      }

      const data = payload.data as ChallengeData;
      setChallengeData(data);
      const qr = await QRCode.toDataURL(data.qrCodeData, {
        width: 360,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrCodeUrl(qr);
      setAuthStep('qr');

      startPolling(data.challengeId);
    } catch (err: any) {
      setError(err?.message || 'Authentication request failed');
    }
  };

  const startPolling = (challengeId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/status/${challengeId}`);
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          clearInterval(intervalId);
          return;
        }

        const data = payload.data as StatusData;
        if (data.status === 'completed' && data.token) {
          clearInterval(intervalId);
          setAuthStatus(data);
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('rbac_badge', data.badge || 'employee');
          localStorage.setItem('rbac_permissions', JSON.stringify(data.permissions || []));
          setAuthStep('authenticated');
        }
      } catch {
        clearInterval(intervalId);
      }
    }, 2000);

    setTimeout(() => clearInterval(intervalId), 5 * 60 * 1000);
  };

  const logout = () => {
    setAuthStep('login');
    setChallengeData(null);
    setQrCodeUrl('');
    setAuthStatus(null);
    setEmployeeId('');
    localStorage.removeItem('authToken');
    localStorage.removeItem('rbac_badge');
    localStorage.removeItem('rbac_permissions');
    setPortalSection('dashboard');
    navigate('/login');
  };

  const saveAdminToken = () => {
    localStorage.setItem('admin_token', adminToken);
    void loadEmployees();
  };

  const renderTopNav = () => (
    <div className="relative z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-center">
        <h1 className="text-white text-xl font-bold">Decentralized Authentication Platform</h1>
      </div>
    </div>
  );

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

      const roleTabs: Array<{ key: PortalSection; label: string }> = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'projects', label: 'Projects' },
        { key: 'security', label: 'Security' },
        { key: 'blockchain', label: 'Blockchain' },
      ];

      if (canSeeAnalytics) {
        roleTabs.push({ key: 'analytics', label: 'Analytics' });
      }

      if (canSeeAuditSections) {
        roleTabs.push({ key: 'audit', label: 'Audit & Compliance' });
      }

      const currentEmployeeId = authStatus?.employeeId || currentEmployee?.id || '';
      const managerTeam = PROJECT_DATASET.managerTeamMap[currentEmployeeId] || [currentEmployeeId];

      const projectPortfolio = PROJECT_DATASET.catalog.filter((project) => {
        if (isAdmin || isAuditor) return true;
        if (isManager) return managerTeam.includes(project.ownerId) || project.teamMembers.some((member) => managerTeam.includes(member));
        return project.ownerId === currentEmployeeId || project.teamMembers.includes(currentEmployeeId);
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
      const didAddress = currentEmployee?.did?.replace('did:ethr:', '') || '';
      const txHref = walletAddress ? `${etherscanBase}/address/${walletAddress}` : etherscanBase;
      const didHref = didAddress ? `${etherscanBase}/address/${didAddress}` : etherscanBase;
      const contractHref = `${etherscanBase}/address/0x7f9A20f9B2AB78f98A4f0E4e1FdEaA67543D1bA2`;

      const exportWholeReport = () => {
        const report = {
          generatedAt: new Date().toISOString(),
          employee: {
            id: currentEmployee?.id,
            name: currentEmployee?.name,
            badge,
            permissions,
          },
          projects: projectPortfolio,
          securityEvents,
          threatLandscape,
          incidentPlaybook,
          blockchainRoutes,
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enterprise-report-${currentEmployee?.id || 'user'}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };

      const renderSection = () => {
        if (portalSection === 'dashboard') {
          return (
            <div className="space-y-5">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">Identity Health</p>
                  <p className="text-white text-2xl font-semibold">97.2%</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">Active Sessions</p>
                  <p className="text-white text-2xl font-semibold">412</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">Credential Validity</p>
                  <p className="text-white text-2xl font-semibold">99.1%</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">Open Risks</p>
                  <p className="text-white text-2xl font-semibold">6</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Operational Highlights</h3>
                  <ul className="text-slate-200 text-sm space-y-2">
                    <li>Challenge success rate improved by 18.4% after badge-aware flow rollout.</li>
                    <li>Median login round trip: 2.3s across the last 500 verifications.</li>
                    <li>No unauthorized privilege grants in the last 14 days.</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Current Employee Context</h3>
                  <p className="text-slate-200 text-sm">Name: {currentEmployee?.name || '-'}</p>
                  <p className="text-slate-200 text-sm">Employee ID: {currentEmployee?.id || '-'}</p>
                  <p className="text-slate-200 text-sm">Badge: <span className="uppercase">{badge}</span></p>
                  <p className="text-slate-200 text-sm">Department: {currentEmployee?.department || '-'}</p>
                  <p className="text-slate-200 text-sm break-all">Hash: {authStatus?.hashId || currentEmployee?.hashId || '-'}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Weekly Verification Volume</h3>
                  <svg viewBox="0 0 420 160" className="w-full h-36">
                    <polyline
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3"
                      points={weeklyVerificationSeries.map((v, i) => `${i * 70},${150 - (v - 1100) / 5}`).join(' ')}
                    />
                    <polyline
                      fill="rgba(52, 211, 153, 0.15)"
                      stroke="none"
                      points={`0,150 ${weeklyVerificationSeries.map((v, i) => `${i * 70},${150 - (v - 1100) / 5}`).join(' ')} 420,150`}
                    />
                  </svg>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-5 overflow-x-auto">
                  <h3 className="text-white font-semibold mb-3">Executive Snapshot</h3>
                  <table className="w-full text-sm min-w-[420px]">
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="py-2 text-slate-300">Access SLA Compliance</td>
                        <td className="py-2 text-slate-100 text-right">99.4%</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-2 text-slate-300">Privileged Role Drift</td>
                        <td className="py-2 text-slate-100 text-right">0.7%</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-2 text-slate-300">On-chain Anchor Latency</td>
                        <td className="py-2 text-slate-100 text-right">1.9s</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-300">Audit Readiness</td>
                        <td className="py-2 text-slate-100 text-right">High</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        if (portalSection === 'projects') {
          return (
            <div className="space-y-5">
              <div className="rounded-xl bg-white/10 border border-white/15 p-5 overflow-x-auto">
                <h3 className="text-white font-semibold mb-4">Team Project Portfolio</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Showing projects scoped to {isManager ? 'manager and team' : isEmployee ? 'current employee' : 'authorized role visibility'}.
                </p>
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="text-slate-300 border-b border-white/15">
                      <th className="text-left py-2 pr-3">Code</th>
                      <th className="text-left py-2 pr-3">Project</th>
                      <th className="text-left py-2 pr-3">Owner</th>
                      <th className="text-left py-2 pr-3">Progress</th>
                      <th className="text-left py-2 pr-3">Risk</th>
                      <th className="text-left py-2 pr-3">Sepolia Tx</th>
                      <th className="text-left py-2 pr-3">Budget</th>
                      <th className="text-left py-2 pr-3">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectPortfolio.map((project) => (
                      <tr key={project.code} className="border-b border-white/10 text-slate-100">
                        <td className="py-3 pr-3 font-mono">{project.code}</td>
                        <td className="py-3 pr-3">{project.name}</td>
                        <td className="py-3 pr-3">{project.owner}</td>
                        <td className="py-3 pr-3">
                          <div className="w-36 bg-slate-800 rounded-full h-2 mb-1">
                            <div className="bg-cyan-400 h-2 rounded-full" style={{ width: `${project.progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-300">{project.progress}%</span>
                        </td>
                        <td className="py-3 pr-3">{project.risk}</td>
                        <td className="py-3 pr-3">{project.networkTx}</td>
                        <td className="py-3 pr-3">{project.budget}</td>
                        <td className="py-3 pr-3">{project.eta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-cyan-500/10 border border-cyan-300/30 p-4">
                  <p className="text-cyan-100 text-sm">Delivery Confidence</p>
                  <p className="text-cyan-50 text-2xl font-semibold">{Math.max(72, 96 - projectPortfolio.length)}%</p>
                </div>
                <div className="rounded-xl bg-fuchsia-500/10 border border-fuchsia-300/30 p-4">
                  <p className="text-fuchsia-100 text-sm">Cross-team Dependencies</p>
                  <p className="text-fuchsia-50 text-2xl font-semibold">23</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-300/30 p-4">
                  <p className="text-amber-100 text-sm">Critical Blockers</p>
                  <p className="text-amber-50 text-2xl font-semibold">{projectPortfolio.filter((p) => p.risk === 'High').length}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Project Burn-up Trend</h3>
                  <svg viewBox="0 0 420 150" className="w-full h-36">
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="3"
                      points={projectBurnupSeries.map((v, i) => `${i * 60},${140 - v}`).join(' ')}
                    />
                  </svg>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Risk Distribution</h3>
                  <div className="flex items-center gap-6">
                    <div
                      className="w-28 h-28 rounded-full"
                      style={{
                        background: 'conic-gradient(#22d3ee 0% 42%, #f59e0b 42% 78%, #ef4444 78% 100%)',
                      }}
                    />
                    <div className="text-sm text-slate-200 space-y-1">
                      <p><span className="text-cyan-300">Low:</span> 42%</p>
                      <p><span className="text-amber-300">Medium:</span> 36%</p>
                      <p><span className="text-red-300">High:</span> 22%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (portalSection === 'security') {
          return (
            <div className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">MFA Enforcement</p>
                  <p className="text-white text-2xl font-semibold">100%</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">Policy Drift</p>
                  <p className="text-white text-2xl font-semibold">1.8%</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">Threat Index</p>
                  <p className="text-white text-2xl font-semibold">Low</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                <h3 className="text-white font-semibold mb-4">Recent Security Events</h3>
                <div className="space-y-3">
                  {securityEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-white/10 p-3 bg-slate-900/40">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-100 font-medium">{event.title}</p>
                        <span className="text-xs uppercase text-slate-300">{event.severity}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{event.id} • {event.status} • Owner: {event.owner} • ETA: {event.eta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Threat Landscape</h3>
                  <div className="space-y-3 text-sm">
                    {threatLandscape.map((threat) => (
                      <div key={threat.vector} className="rounded-lg bg-slate-900/50 border border-white/10 p-3">
                        <p className="text-slate-100 font-medium">{threat.vector}</p>
                        <p className="text-slate-400">Probability: {threat.probability} • Impact: {threat.impact}</p>
                        <p className="text-slate-300">Control: {threat.control}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Incident Response Playbook</h3>
                  <div className="space-y-3 text-sm">
                    {incidentPlaybook.map((item) => (
                      <div key={item.phase} className="rounded-lg bg-slate-900/50 border border-white/10 p-3">
                        <p className="text-slate-100 font-medium">{item.phase}</p>
                        <p className="text-slate-300">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Incident Load (7-day)</h3>
                  <div className="flex items-end gap-2 h-32">
                    {incidentLoadSeries.map((v, idx) => (
                      <div key={idx} className="flex-1 bg-slate-800 rounded-t" style={{ height: `${v * 8}px` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-5 overflow-x-auto">
                  <h3 className="text-white font-semibold mb-3">Incident Response SLA</h3>
                  <table className="w-full text-sm min-w-[420px]">
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="py-2 text-slate-300">MTTD</td>
                        <td className="py-2 text-slate-100 text-right">11m</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-2 text-slate-300">MTTR</td>
                        <td className="py-2 text-slate-100 text-right">38m</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-2 text-slate-300">Containment SLA</td>
                        <td className="py-2 text-slate-100 text-right">97%</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-300">Postmortem Completion</td>
                        <td className="py-2 text-slate-100 text-right">92%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        if (portalSection === 'blockchain') {
          return (
            <div className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">Network</p>
                  <p className="text-white text-2xl font-semibold">Sepolia</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">24h On-chain Auth Tx</p>
                  <p className="text-white text-2xl font-semibold">319</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-slate-300 text-sm">Median Gas Cost</p>
                  <p className="text-white text-2xl font-semibold">0.00042 ETH</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-5 space-y-3">
                <h3 className="text-white font-semibold">Sepolia Blockchain Explorer</h3>
                
                {/* Show the actual contract that manages all DIDs */}
                <a 
                  href={`${etherscanBase}/address/0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="block text-cyan-300 hover:text-cyan-200 break-all p-2 bg-white/5 rounded border border-white/10"
                >
                  <div className="text-xs text-gray-300 mb-1">📋 SimpleDIDRegistry Contract</div>
                  <div className="font-mono text-sm">0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48</div>
                  <div className="text-xs text-gray-400 mt-1">All employee DIDs and authentications are stored here</div>
                </a>

                {/* Employee's personal wallet (if available) */}
                {walletAddress && (
                  <a 
                    href={`${etherscanBase}/address/${walletAddress}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="block text-cyan-300 hover:text-cyan-200 break-all p-2 bg-white/5 rounded border border-white/10"
                  >
                    <div className="text-xs text-gray-300 mb-1">👤 {currentEmployee?.name || 'Employee'}'s Wallet</div>
                    <div className="font-mono text-sm">{walletAddress}</div>
                    <div className="text-xs text-gray-400 mt-1">Personal blockchain wallet address</div>
                  </a>
                )}

                {/* Link to see all recent contract transactions */}
                <a 
                  href={`${etherscanBase}/address/0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48#internaltx`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="block text-green-300 hover:text-green-200 break-all p-2 bg-white/5 rounded border border-white/10"
                >
                  <div className="text-xs text-gray-300 mb-1">📊 View All Authentication Transactions</div>
                  <div className="text-sm">Recent DID registrations and authentications</div>
                  <div className="text-xs text-gray-400 mt-1">Click to see live blockchain activity</div>
                </a>

                {/* Gas payer wallet (the one that actually sends transactions) */}
                <a 
                  href={`${etherscanBase}/address/0xBdA3AC10e1403cFC54Ab2195Aad7Da8a39B775B9`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="block text-orange-300 hover:text-orange-200 break-all p-2 bg-white/5 rounded border border-white/10"
                >
                  <div className="text-xs text-gray-300 mb-1">⛽ Gas Payer Wallet (Backend)</div>
                  <div className="font-mono text-sm">0xBdA3AC10e1403cFC54Ab2195Aad7Da8a39B775B9</div>
                  <div className="text-xs text-gray-400 mt-1">This wallet pays transaction fees for all employees</div>
                </a>
              </div>

              {/* Add helpful explanation */}
              <div className="rounded-xl bg-blue-900/20 border border-blue-500/30 p-5">
                <h3 className="text-blue-300 font-semibold mb-3">🔍 How to Use These Links</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>SimpleDIDRegistry Contract:</strong> This is where ALL employee data is stored. You'll see hundreds of transactions from different employees.</p>
                  <p><strong>Employee Wallet:</strong> {currentEmployee?.name || 'This employee'}'s personal blockchain address. May show their transaction history.</p>
                  <p><strong>Authentication Transactions:</strong> Live feed of all recent logins and DID registrations across your organization.</p>
                  <p><strong>Gas Payer Wallet:</strong> The backend wallet that pays blockchain fees. You'll see it sending transactions to the contract.</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-5 overflow-x-auto">
                <h3 className="text-white font-semibold mb-4">Contract Information</h3>
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="text-slate-300 border-b border-white/15">
                      <th className="text-left py-2 pr-3">Contract</th>
                      <th className="text-left py-2 pr-3">Address</th>
                      <th className="text-left py-2 pr-3">Network</th>
                      <th className="text-left py-2 pr-3">Purpose</th>
                      <th className="text-left py-2 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 text-slate-100">
                      <td className="py-3 pr-3">SimpleDIDRegistry</td>
                      <td className="py-3 pr-3 font-mono">0x80c41...F4D48</td>
                      <td className="py-3 pr-3">Sepolia</td>
                      <td className="py-3 pr-3">DID Storage & Auth</td>
                      <td className="py-3 pr-3 text-green-400">✅ Active</td>
                    </tr>
                    <tr className="border-b border-white/10 text-slate-100">
                      <td className="py-3 pr-3">Gas Payer</td>
                      <td className="py-3 pr-3 font-mono">0xBd43A...75B9</td>
                      <td className="py-3 pr-3">Sepolia</td>
                      <td className="py-3 pr-3">Transaction Fees</td>
                      <td className="py-3 pr-3 text-green-400">✅ Funded</td>
                    </tr>
                    <tr className="border-b border-white/10 text-slate-100">
                      <td className="py-3 pr-3">Employee Count</td>
                      <td className="py-3 pr-3 font-mono">~50 Registered</td>
                      <td className="py-3 pr-3">-</td>
                      <td className="py-3 pr-3">Active Users</td>
                      <td className="py-3 pr-3 text-blue-400">ℹ️ Growing</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <a 
                    href={`${etherscanBase}/address/0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-center"
                  >
                    <div className="text-2xl mb-2">🏢</div>
                    <div className="text-sm text-white font-medium">View Contract</div>
                    <div className="text-xs text-gray-400">SimpleDIDRegistry</div>
                  </a>
                  
                  <a 
                    href={`${etherscanBase}/address/0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48#internaltx`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-center"
                  >
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-sm text-white font-medium">Live Activity</div>
                    <div className="text-xs text-gray-400">Recent Transactions</div>
                  </a>
                  
                  <a 
                    href={`${etherscanBase}/address/0xBdA3AC10e1403cFC54Ab2195Aad7Da8a39B775B9`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-center"
                  >
                    <div className="text-2xl mb-2">⛽</div>
                    <div className="text-sm text-white font-medium">Gas Wallet</div>
                    <div className="text-xs text-gray-400">Backend Wallet</div>
                  </a>

                  {walletAddress && (
                    <a 
                      href={`${etherscanBase}/address/${walletAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-center"
                    >
                      <div className="text-2xl mb-2">👤</div>
                      <div className="text-sm text-white font-medium">My Wallet</div>
                      <div className="text-xs text-gray-400">{currentEmployee?.name}</div>
                    </a>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Block Depth Distribution</h3>
                  <div className="flex items-end gap-1 h-32">
                    {blockDepthDistribution.map((v, idx) => (
                      <div key={idx} className="flex-1 bg-cyan-500/70 rounded-t" style={{ height: `${v * 1.8}px` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Route Throughput (Conceptual)</h3>
                  <svg viewBox="0 0 360 140" className="w-full h-32">
                    <polyline fill="none" stroke="#60a5fa" strokeWidth="3" points="0,108 40,100 80,88 120,95 160,82 200,70 240,64 280,58 320,51 360,45" />
                    <polyline fill="none" stroke="#f472b6" strokeWidth="3" points="0,124 40,118 80,113 120,109 160,103 200,96 240,91 280,86 320,80 360,74" />
                  </svg>
                </div>
              </div>
            </div>
          );
        }

        if (portalSection === 'analytics' && canSeeAnalytics) {
          return (
            <div className="space-y-5">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-300/25 p-4">
                  <p className="text-indigo-100 text-sm">Authentication Throughput</p>
                  <p className="text-indigo-50 text-2xl font-semibold">1,482/day</p>
                </div>
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-300/25 p-4">
                  <p className="text-indigo-100 text-sm">Challenge Completion</p>
                  <p className="text-indigo-50 text-2xl font-semibold">94.6%</p>
                </div>
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-300/25 p-4">
                  <p className="text-indigo-100 text-sm">Avg Verification Time</p>
                  <p className="text-indigo-50 text-2xl font-semibold">2.3s</p>
                </div>
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-300/25 p-4">
                  <p className="text-indigo-100 text-sm">Failure Hotspots</p>
                  <p className="text-indigo-50 text-2xl font-semibold">3</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                <h3 className="text-white font-semibold mb-4">Cross-domain Analysis</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-200">
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-3">
                    <p className="font-medium mb-1">Identity Risk Correlation</p>
                    <p>High risk events are 2.7x more frequent when credentials exceed 45 days without rotation.</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-3">
                    <p className="font-medium mb-1">Department-wise Completion</p>
                    <p>Engineering: 96%, Product: 92%, Design: 90%, Compliance: 98%.</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-3">
                    <p className="font-medium mb-1">Chain Cost Projection</p>
                    <p>Projected Sepolia gas budget for next sprint: 0.198 ETH with 12% confidence variance.</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-3">
                    <p className="font-medium mb-1">Policy Effectiveness</p>
                    <p>New badge guardrails reduced unauthorized scope requests by 43% week-over-week.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                <h3 className="text-white font-semibold mb-4">Visual Trends (Conceptual)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-4">
                    <p className="text-slate-200 text-sm mb-2">Weekly Verification Trend</p>
                    <svg viewBox="0 0 320 120" className="w-full h-28">
                      <polyline
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="3"
                        points="0,95 40,82 80,76 120,61 160,55 200,48 240,44 280,37 320,30"
                      />
                    </svg>
                  </div>
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-4">
                    <p className="text-slate-200 text-sm mb-3">Department Completion Bars</p>
                    <div className="space-y-3 text-xs text-slate-300">
                      {['Engineering 96%', 'Product 92%', 'Design 90%', 'Compliance 98%'].map((item, idx) => (
                        <div key={item}>
                          <p className="mb-1">{item}</p>
                          <div className="h-2 rounded bg-slate-700">
                            <div className="h-2 rounded bg-indigo-400" style={{ width: `${90 + idx * 2}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Verification Cohort Heatmap</h3>
                  <div className="grid grid-cols-7 gap-1">
                    {[28, 32, 41, 46, 53, 60, 67, 22, 31, 36, 47, 52, 58, 65, 19, 25, 30, 39, 45, 50, 57].map((v, i) => (
                      <div key={i} className="h-6 rounded" style={{ backgroundColor: `rgba(56, 189, 248, ${0.15 + v / 100})` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                  <h3 className="text-white font-semibold mb-3">Cost vs Throughput Scatter (Conceptual)</h3>
                  <svg viewBox="0 0 320 160" className="w-full h-36">
                    {[{ x: 30, y: 130 }, { x: 70, y: 112 }, { x: 110, y: 104 }, { x: 150, y: 89 }, { x: 190, y: 78 }, { x: 230, y: 70 }, { x: 270, y: 55 }].map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={6} fill="#34d399" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          );
        }

        if (portalSection === 'audit' && canSeeAuditSections) {
          return (
            <div className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-amber-500/10 border border-amber-300/25 p-4">
                  <p className="text-amber-100 text-sm">Open Findings</p>
                  <p className="text-amber-50 text-2xl font-semibold">9</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-300/25 p-4">
                  <p className="text-amber-100 text-sm">Evidence Packages</p>
                  <p className="text-amber-50 text-2xl font-semibold">34</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-300/25 p-4">
                  <p className="text-amber-100 text-sm">Control Coverage</p>
                  <p className="text-amber-50 text-2xl font-semibold">92%</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 p-5">
                <h3 className="text-white font-semibold mb-4">Essential Auditor Sections</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-200">
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-3">
                    <p className="font-medium mb-1">Evidence Vault</p>
                    <p>Immutable snapshots for authentication flow, role updates, and credential signatures.</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-3">
                    <p className="font-medium mb-1">Policy Drift Monitor</p>
                    <p>Alerts when active permissions diverge from approved role matrix baselines.</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-3">
                    <p className="font-medium mb-1">Exception Tracker</p>
                    <p>All temporary overrides with owner, justification, and expiration timeline.</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/40 border border-white/10 p-3">
                    <p className="font-medium mb-1">Attestation Reports</p>
                    <p>Download-ready reports for quarterly access reviews and external assessments.</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return null;
      };

      return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-cyan-500/15 border border-emerald-400/30 p-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
            <h2 className="text-3xl font-bold text-emerald-200">Authenticated</h2>
            <p className="text-emerald-100 mt-1">{currentEmployee?.name} ({currentEmployee?.id})</p>
            <p className="text-emerald-100">Badge: <span className="font-semibold uppercase">{badge}</span></p>
            <p className="text-emerald-100">Hash ID: <span className="font-mono text-sm">{authStatus?.hashId || currentEmployee?.hashId}</span></p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/20 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-white font-semibold text-lg">Portal Workspace</h3>
              <button
                onClick={exportWholeReport}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
              >
                Export Whole Report
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {roleTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPortalSection(tab.key)}
                  className={`px-4 py-2 rounded-lg border text-sm ${
                    portalSection === tab.key
                      ? 'bg-cyan-500/20 border-cyan-300 text-cyan-100'
                      : 'bg-white/5 border-white/20 text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Available permissions: {permissions.length > 0 ? permissions.join(', ') : 'none'}</p>
          </div>

          {renderSection()}

          {isEmployee && (
            <div className="rounded-2xl bg-cyan-500/10 border border-cyan-400/30 p-4">
              <p className="text-cyan-100 text-sm">Employee scope active. You have operational visibility across Dashboard, Projects, Security, and Blockchain sections.</p>
            </div>
          )}

          {isManagerOrHigher && (
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-400/30 p-4">
              <p className="text-indigo-100 text-sm">Manager/admin scope active. Analytics is enabled with throughput, policy, and network cost analysis.</p>
            </div>
          )}

          {isAuditor && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4">
              <p className="text-amber-100 text-sm">Auditor scope active. Audit and compliance evidence workflows are enabled in read-oriented mode.</p>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 p-4">
              <p className="text-rose-100 text-sm">Admin scope active. Full visibility and enterprise control-plane authority are available.</p>
            </div>
          )}

          <button onClick={logout} className="px-5 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700">Logout</button>
        </div>
      );
    }

    if (authStep === 'qr') {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="rounded-2xl bg-white/10 border border-white/20 p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Scan With Wallet</h2>
            <p className="text-slate-300 mb-5">Employee: {challengeData?.employee?.name} ({challengeData?.employee?.id})</p>
            {qrCodeUrl && <img src={qrCodeUrl} alt="Authentication QR" className="mx-auto rounded-xl bg-white p-3" />}
            <div className="mt-5 text-sm text-slate-300 space-y-1">
              <p>Badge-bound challenge generated for this employee.</p>
              <p>Hash ID: <span className="font-mono">{challengeData?.employee?.hashId}</span></p>
              <p>Wallet will auto-fetch this employee context on scan.</p>
            </div>
            <button onClick={logout} className="mt-6 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600">Cancel</button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-2xl bg-white/10 border border-white/20 p-8">
          <h2 className="text-3xl font-bold text-white mb-2">Employee Login Portal</h2>
          <p className="text-slate-300 mb-6">Enter Employee ID to generate your badge-aware challenge QR.</p>

          <label className="block text-sm text-slate-200 mb-2">Employee ID</label>
          <input
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value.toUpperCase())}
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600 text-white"
            placeholder="EMP001 / EMP002 / EMP003 / EMP004"
          />

          <button
            onClick={startLogin}
            disabled={!isConnected}
            className="mt-5 w-full px-4 py-3 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-700"
          >
            {!isConnected ? 'Backend Offline' : 'Generate Challenge QR'}
          </button>
        </div>
      </div>
    );
  };

  const renderAdminPortal = () => (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="rounded-2xl bg-white/10 border border-white/20 p-5">
        <h2 className="text-3xl font-bold text-white mb-2">Admin Portal</h2>
        <p className="text-slate-300 mb-4">View all employees, inspect hash IDs, and assign digital badges (roles).</p>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600 text-white"
            placeholder="Admin bearer token"
          />
          <button onClick={saveAdminToken} className="px-4 py-3 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700">Load Employees</button>
        </div>
      </div>

      <div className="rounded-2xl bg-white/10 border border-white/20 p-5">
        <h3 className="text-white font-semibold text-xl mb-4">Assign Digital Badge</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <select
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
            className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600 text-white"
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.id} - {employee.name}</option>
            ))}
          </select>

          <select
            value={selectedBadge}
            onChange={(event) => setSelectedBadge(event.target.value as BadgeType)}
            className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600 text-white"
          >
            {BADGE_OPTIONS.map((badge) => (
              <option key={badge.value} value={badge.value}>{badge.label}</option>
            ))}
          </select>

          <button
            onClick={applyBadge}
            disabled={adminLoading || employees.length === 0}
            className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-700"
          >
            Assign Badge
          </button>
        </div>
        {adminMessage && <p className="text-emerald-300 text-sm mt-3">{adminMessage}</p>}
      </div>

      <div className="rounded-2xl bg-white/10 border border-white/20 p-5 overflow-x-auto">
        <h3 className="text-white font-semibold text-xl mb-4">Employees ({employees.length})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left text-slate-300">
              <th className="py-2 pr-3">Employee</th>
              <th className="py-2 pr-3">Department</th>
              <th className="py-2 pr-3">Badge</th>
              <th className="py-2 pr-3">Hash ID</th>
              <th className="py-2 pr-3">Challenge Fingerprint</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-b border-white/10 text-slate-100 align-top">
                <td className="py-2 pr-3">
                  <p className="font-semibold">{employee.name}</p>
                  <p className="text-xs text-slate-400">{employee.id}</p>
                </td>
                <td className="py-2 pr-3">{employee.department}</td>
                <td className="py-2 pr-3 uppercase">{employee.badge}</td>
                <td className="py-2 pr-3 font-mono text-xs break-all">{employee.hashId}</td>
                <td className="py-2 pr-3 font-mono text-xs">{employee.challengeFingerprint || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-60">
        <Orb hue={215} hoverIntensity={1.8} rotateOnHover={true} />
      </div>

      {renderTopNav()}

      {!isConnected && (
        <div className="relative z-20 max-w-7xl mx-auto px-6 pt-4">
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-red-200 text-sm">Backend is offline. Start backend before login/admin operations.</div>
        </div>
      )}

      {error && (
        <div className="relative z-20 max-w-7xl mx-auto px-6 pt-4">
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-rose-200 text-sm">{error}</div>
        </div>
      )}

      <main className="relative z-10">
        {mode === 'admin' ? renderAdminPortal() : renderLoginPortal()}
      </main>
    </div>
  );
};

export default EnterprisePortalProfessional;
