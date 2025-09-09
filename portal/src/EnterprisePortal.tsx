import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';

interface AuthChallenge {
  challengeId: string;
  challenge: string;
  expiresIn: number;
  qrCodeData: string;
  employeeId?: string;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  avatar?: string;
  permissions: string[];
  lastLogin?: string;
  status: 'active' | 'inactive' | 'pending';
}

interface AuthenticatedUser {
  did: string;
  address: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  email: string;
  isAdmin: boolean;
  credentialVerified?: boolean;
}

interface VerifiableCredential {
  '@context': string[];
  type: string[];
  credentialSubject: {
    id: string;
    employeeId: string;
    role: string;
    department: string;
    name: string;
    email: string;
  };
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
}

interface PremiumUnlockState {
  isPolling: boolean;
  showModal: boolean;
  timeoutId: NodeJS.Timeout | null;
  startTime: number;
  maxPollTime: number; // 2 minutes in milliseconds
}

interface SessionStatus {
  authenticated: boolean;
  address: string;
  accessLevel: 'standard' | 'premium';
  premiumGrantedAt?: string;
  tokenExpiresAt?: string;
  sessionActive: boolean;
}

interface CompanyPortalProps {
  companyName?: string;
  logoUrl?: string;
  theme?: 'corporate' | 'modern' | 'minimal';
}

// Admin Panel Component for VC Issuance
function AdminPanel({ employee }: { employee: Employee }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuingFor, setIssuingFor] = useState<string | null>(null);
  const [vcQrCode, setVcQrCode] = useState<string>('');
  const [issuedCredential, setIssuedCredential] = useState<{
    employee: Employee;
    credential: string;
    preview: VerifiableCredential;
  } | null>(null);

  // Load employees on component mount
  useEffect(() => {
    const loadEmployeesOnMount = async () => {
      try {
        setLoading(true);
        
        // In production, this would use proper JWT authentication
        const response = await fetch('/api/admin/employees', {
          headers: {
            'Authorization': `Bearer demo-admin-token-${employee.id}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setEmployees(result.data || []);
          }
        }
      } catch (error) {
        console.error('Error loading employees:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEmployeesOnMount();
  }, [employee.id]);

  const issueCredential = async (targetEmployeeId: string) => {
    try {
      setIssuingFor(targetEmployeeId);
      
      const response = await fetch('/api/admin/issue-credential', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer demo-admin-token-${employee.id}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetEmployeeId })
      });

      if (!response.ok) {
        throw new Error('Failed to issue credential');
      }

      const result = await response.json();
      if (result.success) {
        const { credential, employee: targetEmployee, credentialPreview } = result.data;
        
        // Create QR code for the credential offer
        const qrData = JSON.stringify({
          type: 'VC_OFFER',
          credential: credential
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1f2937',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        });

        setVcQrCode(qrCodeDataUrl);
        setIssuedCredential({
          employee: targetEmployee,
          credential,
          preview: credentialPreview
        });
      } else {
        throw new Error(result.error || 'Failed to issue credential');
      }
    } catch (error) {
      console.error('Error issuing credential:', error);
      alert('Failed to issue credential: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIssuingFor(null);
    }
  };

  const closeCredentialModal = () => {
    setIssuedCredential(null);
    setVcQrCode('');
  };

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Admin Panel</h3>
            <p className="text-purple-200">Issue Verifiable Credentials</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Employee Management</h4>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading employees...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((emp) => (
              <div key={emp.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=6366f1&color=ffffff`} 
                      alt={emp.name} 
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h5 className="font-semibold text-gray-800">{emp.name}</h5>
                      <p className="text-sm text-gray-600">{emp.role} • {emp.department}</p>
                      <p className="text-xs text-gray-500">{emp.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {emp.status}
                    </span>
                    
                    {emp.status === 'active' && (
                      <button
                        onClick={() => issueCredential(emp.id)}
                        disabled={issuingFor === emp.id}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        {issuingFor === emp.id ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Issuing...</span>
                          </div>
                        ) : (
                          'Issue Employee Credential'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credential Issuance Modal */}
      {issuedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Credential Issued!</h3>
                  <p className="text-green-100">Employee can now scan this QR code</p>
                </div>
                <button
                  onClick={closeCredentialModal}
                  className="text-white hover:bg-white/20 p-2 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Employee Info */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
                <div className="flex items-center space-x-3">
                  <img 
                    src={issuedCredential.employee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(issuedCredential.employee.name)}&background=3b82f6&color=ffffff`} 
                    alt={issuedCredential.employee.name} 
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-800">{issuedCredential.employee.name}</h4>
                    <p className="text-sm text-blue-700">{issuedCredential.employee.role}</p>
                    <p className="text-xs text-gray-600">{issuedCredential.employee.department}</p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Scan to Accept Credential</h4>
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block">
                  <img src={vcQrCode} alt="Credential QR Code" className="w-60 h-60" />
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Have the employee scan this QR code with their DID Wallet app to accept the credential.
                </p>
              </div>

              {/* Credential Preview */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h5 className="font-semibold text-gray-800 mb-3">Credential Details:</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">Employee Credential</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium">{issuedCredential.preview.credentialSubject.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{issuedCredential.preview.credentialSubject.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issued:</span>
                    <span className="font-medium">
                      {new Date(issuedCredential.preview.issuanceDate).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Professional Enterprise Portal Component
function EnterprisePortal({ 
  companyName = "Decentralized Trust Platform", 
  logoUrl
}: CompanyPortalProps) {
  const [authChallenge, setAuthChallenge] = useState<AuthChallenge | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [authStep, setAuthStep] = useState<'login' | 'qr' | 'authenticating' | 'success' | 'dashboard'>('login');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [countdown, setCountdown] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Premium access state
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [premiumUnlock, setPremiumUnlock] = useState<PremiumUnlockState>({
    isPolling: false,
    showModal: false,
    timeoutId: null,
    startTime: 0,
    maxPollTime: 2 * 60 * 1000 // 2 minutes
  });
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [userHasPremiumAccess, setUserHasPremiumAccess] = useState<boolean>(false);

  // Enhanced professional employee database
  const mockEmployeeDatabase: Record<string, Employee> = {
    'EMP001': {
      id: 'EMP001',
      name: 'John Doe',
      department: 'Engineering',
      role: 'Senior Software Engineer',
      email: 'john.doe@company.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
      permissions: ['portal_access', 'dev_tools', 'code_review', 'deployment'],
      lastLogin: '2025-07-12 14:30:00',
      status: 'active'
    },
    'EMP002': {
      id: 'EMP002',
      name: 'Jane Smith',
      department: 'Human Resources',
      role: 'HR Director',
      email: 'jane.smith@company.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b3f4abd3?w=150&h=150&fit=crop&crop=face&auto=format',
      permissions: ['portal_access', 'hr_tools', 'employee_data', 'payroll'],
      lastLogin: '2025-07-13 09:15:00',
      status: 'active'
    },
    'EMP003': {
      id: 'EMP003',
      name: 'Mike Johnson',
      department: 'Finance',
      role: 'Chief Financial Officer',
      email: 'mike.johnson@company.com',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face&auto=format',
      permissions: ['portal_access', 'financial_data', 'budget_approval', 'reports'],
      lastLogin: '2025-07-13 08:45:00',
      status: 'active'
    },
    'EMP004': {
      id: 'EMP004',
      name: 'Sarah Wilson',
      department: 'Marketing',
      role: 'Marketing Manager',
      email: 'sarah.wilson@company.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format',
      permissions: ['portal_access', 'marketing_tools', 'campaign_management'],
      lastLogin: '2025-07-12 16:20:00',
      status: 'active'
    },
    'EMP005': {
      id: 'EMP005',
      name: 'David Chen',
      department: 'Operations',
      role: 'Operations Director',
      email: 'david.chen@company.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format',
      permissions: ['portal_access', 'operations_dashboard', 'facility_management'],
      lastLogin: '2025-07-13 07:30:00',
      status: 'active'
    }
  };

  // Update current time and check for existing authentication
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    };
    
    // Check for existing authentication
    const checkExistingAuth = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          // Decode JWT to extract user information
          const base64Url = authToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const decoded = JSON.parse(jsonPayload);
          
          // Check if token is not expired
          if (decoded.exp && decoded.exp > Math.floor(Date.now() / 1000)) {
            const authenticatedUserData: AuthenticatedUser = {
              did: decoded.did,
              address: decoded.address,
              employeeId: decoded.employeeId,
              name: decoded.name,
              role: decoded.role,
              department: decoded.department,
              email: decoded.email,
              isAdmin: decoded.isAdmin,
              credentialVerified: decoded.credentialVerified
            };
            
            setAuthenticatedUser(authenticatedUserData);
            setAuthStep('dashboard');
            
            // Also set employee data for compatibility
            const employeeData: Employee = {
              id: decoded.employeeId,
              name: decoded.name,
              department: decoded.department,
              role: decoded.role,
              email: decoded.email,
              permissions: decoded.isAdmin ? ['admin', 'hr_director'] : ['employee'],
              status: 'active' as const
            };
            setEmployee(employeeData);
            
            console.log('🔐 Existing authentication found:', {
              name: decoded.name,
              role: decoded.role,
              isAdmin: decoded.isAdmin
            });
          } else {
            // Token expired, clear it
            localStorage.removeItem('authToken');
          }
        }
      } catch (error) {
        console.error('Error checking existing authentication:', error);
        localStorage.removeItem('authToken');
      }
    };
    
    updateTime();
    checkExistingAuth();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // QR code countdown timer
  useEffect(() => {
    if (authStep === 'qr' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [authStep, countdown]);

  const fetchChallenge = async (empId: string) => {
    try {
      console.log('🔄 Fetching challenge for employee:', empId);
      
      setLoading(true);
      setConnectionStatus('connecting');
      setError('');
      
      // Try POST first for employee-specific challenge
      const response = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          employeeId: empId,
          companyId: 'COMPANY_001',
          requestType: 'portal_access'
        })
      });
      
      if (!response.ok) {
        // Fallback to GET request
        const fallbackResponse = await fetch('/api/auth/challenge', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
        
        if (!fallbackResponse.ok) {
          throw new Error(`Authentication service unavailable`);
        }
        
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success) {
          setAuthChallenge({ ...fallbackData.data, employeeId: empId });
          setConnectionStatus('connected');
          
          // Generate QR code with employee context
          const qrData = JSON.stringify({
            ...fallbackData.data,
            employeeId: empId,
            companyId: 'COMPANY_001',
            action: 'portal_access',
            companyName
          });
          
          const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: 280,
            margin: 3,
            color: {
              dark: '#1f2937',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
          
          setQrCodeUrl(qrCodeDataUrl);
          setCountdown(300); // 5 minutes
          setAuthStep('qr');
        }
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setAuthChallenge(data.data);
        setConnectionStatus('connected');
        
        const qrCodeDataUrl = await QRCode.toDataURL(data.data.qrCodeData, {
          width: 280,
          margin: 3,
          color: {
            dark: '#1f2937',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        });
        
        setQrCodeUrl(qrCodeDataUrl);
        setCountdown(300); // 5 minutes
        setAuthStep('qr');
      } else {
        throw new Error(data.error || 'Failed to generate authentication challenge');
      }
      
    } catch (err) {
      console.error('❌ Error fetching challenge:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeLogin = () => {
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID');
      return;
    }

    const foundEmployee = mockEmployeeDatabase[employeeId.toUpperCase()];
    if (foundEmployee) {
      if (foundEmployee.status !== 'active') {
        setError('Employee account is not active. Please contact HR.');
        return;
      }
      
      setEmployee(foundEmployee);
      setError('');
      fetchChallenge(employeeId.toUpperCase());
    } else {
      setError('Employee ID not found. Please check your ID or contact HR.');
    }
  };

  const handleNewLogin = () => {
    setAuthStep('login');
    setEmployeeId('');
    setEmployee(null);
    setAuthChallenge(null);
    setQrCodeUrl('');
    setError('');
    setCountdown(0);
  };

  /**
   * Premium Access Methods
   */

  // Check current session status
  const checkSessionStatus = async (): Promise<SessionStatus | null> => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const response = await fetch('http://localhost:3001/api/auth/session-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Session status check failed:', response.status);
        return null;
      }

      const result = await response.json();
      if (result.success && result.data) {
        const status = result.data as SessionStatus;
        setSessionStatus(status);
        setUserHasPremiumAccess(status.accessLevel === 'premium');
        return status;
      }

      return null;
    } catch (error) {
      console.error('Failed to check session status:', error);
      return null;
    }
  };

  // Handle premium content unlock button click
  const handleUnlockPremiumContent = () => {
    console.log('🎯 Starting premium content unlock flow...');
    
    // Show modal and start polling
    setPremiumUnlock(prev => ({
      ...prev,
      showModal: true,
      isPolling: true,
      startTime: Date.now()
    }));

    // Start polling for premium access
    startPremiumAccessPolling();
  };

  // Start polling for premium access upgrade
  const startPremiumAccessPolling = () => {
    console.log('🔄 Starting premium access polling...');

    const pollInterval = setInterval(async () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - premiumUnlock.startTime;

      // Check timeout (2 minutes)
      if (elapsedTime >= premiumUnlock.maxPollTime) {
        console.log('⏰ Premium access polling timed out');
        stopPremiumAccessPolling();
        return;
      }

      // Check session status
      const status = await checkSessionStatus();
      if (status && status.accessLevel === 'premium') {
        console.log('🎉 Premium access detected! Redirecting...');
        stopPremiumAccessPolling();
        
        // Navigate to premium page
        setTimeout(() => {
          navigate('/premium');
        }, 1000);
        return;
      }

      console.log('⏳ Still polling for premium access...', {
        elapsed: Math.round(elapsedTime / 1000) + 's',
        remaining: Math.round((premiumUnlock.maxPollTime - elapsedTime) / 1000) + 's'
      });
    }, 3000); // Poll every 3 seconds

    // Store interval ID for cleanup
    setPremiumUnlock(prev => ({
      ...prev,
      timeoutId: pollInterval
    }));
  };

  // Stop premium access polling
  const stopPremiumAccessPolling = () => {
    console.log('🛑 Stopping premium access polling');
    
    if (premiumUnlock.timeoutId) {
      clearInterval(premiumUnlock.timeoutId);
    }

    setPremiumUnlock({
      isPolling: false,
      showModal: false,
      timeoutId: null,
      startTime: 0,
      maxPollTime: 2 * 60 * 1000
    });
  };

  // Close premium unlock modal
  const closePremiumModal = () => {
    stopPremiumAccessPolling();
  };

  // Navigate to premium content (if user already has access)
  const navigateToPremiumContent = () => {
    navigate('/premium');
  };

  // Check for premium access requirement from URL params
  useEffect(() => {
    const checkPremiumRequirement = async () => {
      if (searchParams.get('premium') === 'required') {
        // User was redirected from premium page, show upgrade prompt
        console.log('🔒 Premium access required - showing upgrade prompt');
        await checkSessionStatus();
      }
    };

    if (authStep === 'dashboard') {
      checkPremiumRequirement();
    }
  }, [authStep, searchParams]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (premiumUnlock.timeoutId) {
        clearInterval(premiumUnlock.timeoutId);
      }
    };
  }, [premiumUnlock.timeoutId]);

  const simulateWalletScan = () => {
    setAuthStep('authenticating');
    setTimeout(() => {
      setAuthStep('success');
      setTimeout(() => {
        setAuthStep('dashboard');
      }, 2000);
    }, 3000);
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDepartmentColor = (department: string) => {
    const colors: Record<string, string> = {
      'Engineering': 'bg-blue-100 text-blue-800',
      'Human Resources': 'bg-green-100 text-green-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Marketing': 'bg-purple-100 text-purple-800',
      'Operations': 'bg-gray-100 text-gray-800'
    };
    return colors[department] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Professional Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Company Logo" className="h-10 w-auto" />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {companyName.split(' ').map(word => word[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{companyName}</h1>
                <p className="text-sm text-gray-500">Enterprise Portal</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{currentTime}</p>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Login Step */}
          {authStep === 'login' && (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Employee Access</h2>
                  <p className="text-blue-100 mt-2">Secure authentication with DID technology</p>
                </div>
              </div>

              <div className="p-8">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="employeeId" className="block text-sm font-semibold text-gray-700 mb-2">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      id="employeeId"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Enter your Employee ID"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      onKeyPress={(e) => e.key === 'Enter' && handleEmployeeLogin()}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleEmployeeLogin}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Generating QR Code...</span>
                      </div>
                    ) : (
                      'Generate Secure QR Code'
                    )}
                  </button>
                </div>

                {/* Demo Section */}
                <div className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Demo Employee IDs:</p>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {Object.values(mockEmployeeDatabase).slice(0, 3).map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="font-medium text-gray-900">{emp.id}</div>
                            <div className="text-gray-500">{emp.name}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(emp.department)}`}>
                          {emp.department}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Step */}
          {authStep === 'qr' && employee && (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-8 py-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Scan QR Code</h2>
                  <p className="text-green-100 mt-2">Use your DID Wallet to authenticate</p>
                </div>
              </div>

              <div className="p-8">
                {/* Employee Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-2xl mb-6">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={employee.avatar} 
                      alt={employee.name} 
                      className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{employee.name}</h3>
                      <p className="text-blue-700 font-semibold">{employee.role}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDepartmentColor(employee.department)}`}>
                          {employee.department}
                        </span>
                        <span className="text-sm text-gray-500">• {employee.id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                {qrCodeUrl ? (
                  <div className="text-center">
                    <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 inline-block shadow-lg">
                      <img src={qrCodeUrl} alt="Authentication QR Code" className="w-70 h-70" />
                    </div>
                    
                    {/* Timer */}
                    <div className="mt-4 flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-gray-600">
                        Expires in: <span className="text-orange-600 font-bold">{formatCountdown(countdown)}</span>
                      </span>
                    </div>
                    
                    {/* Demo Button */}
                    <button
                      onClick={simulateWalletScan}
                      className="mt-6 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      🧪 Simulate Wallet Scan (Demo)
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Generating secure QR code...</p>
                  </div>
                )}

                <button
                  onClick={handleNewLogin}
                  className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
            </div>
          )}

          {/* Authenticating Step */}
          {authStep === 'authenticating' && employee && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="animate-spin w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">Authenticating...</h2>
                <p className="text-gray-600 mt-2">Verifying your digital identity credentials</p>
                
                <div className="mt-6 flex items-center justify-center space-x-4">
                  <img src={employee.avatar} alt={employee.name} className="w-12 h-12 rounded-full" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">{employee.name}</p>
                    <p className="text-sm text-gray-500">{employee.role}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Step */}
          {authStep === 'success' && employee && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">Authentication Successful!</h2>
                <p className="text-gray-600 mt-2">Welcome back, {employee.name}</p>
                
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-center space-x-4">
                    <img src={employee.avatar} alt={employee.name} className="w-12 h-12 rounded-full" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{employee.name}</p>
                      <p className="text-sm text-green-600">{employee.role} • {employee.department}</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 mt-4">Redirecting to portal dashboard...</p>
              </div>
            </div>
          )}

          {/* Dashboard Step */}
          {authStep === 'dashboard' && employee && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img src={employee.avatar} alt={employee.name} className="w-12 h-12 rounded-full border-2 border-white" />
                    <div>
                      <h2 className="text-xl font-bold text-white">{employee.name}</h2>
                      <p className="text-blue-100">{employee.role}</p>
                      {authenticatedUser?.credentialVerified && (
                        <div className="flex items-center space-x-1 mt-1">
                          <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-green-300">Credential Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleNewLogin}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>

              <div className="p-8">
                {/* Role-Based Admin Panel - Only show for HR Director */}
                {authenticatedUser?.isAdmin && authenticatedUser.role === 'HR Director' && (
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-purple-800 font-semibold">Administrator Access Granted</span>
                      </div>
                      <p className="text-purple-700 text-sm mt-1">
                        Your role as {authenticatedUser.role} has been verified via your Employee Credential.
                      </p>
                    </div>
                    <AdminPanel employee={employee} />
                  </div>
                )}

                {/* Role-Based Access Notice */}
                {authenticatedUser && !authenticatedUser.isAdmin && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-blue-800 font-semibold">Employee Access</span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      Your role as {authenticatedUser.role} has been verified. Contact HR for admin access if needed.
                    </p>
                  </div>
                )}

                {/* Premium Corporate Content Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Premium Corporate Content
                  </h3>
                  
                  {userHasPremiumAccess ? (
                    // User has premium access - show access granted card
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-green-800">
                              🎉 Premium Access Active
                            </h4>
                            <p className="text-green-700 text-sm">
                              Corporate Excellence 2025 NFT verified via Zero-Knowledge Proof
                            </p>
                            {sessionStatus?.premiumGrantedAt && (
                              <p className="text-green-600 text-xs mt-1">
                                Granted: {new Date(sessionStatus.premiumGrantedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={navigateToPremiumContent}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span>View Premium Content</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // User needs to unlock premium access
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-purple-800">
                              🔐 Exclusive Corporate Content
                            </h4>
                            <p className="text-purple-700 text-sm mb-2">
                              Access premium insights and strategies for Corporate Excellence 2025 NFT holders
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-purple-600">
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span>Zero-Knowledge Proof</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Complete Privacy</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Anonymous Access</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleUnlockPremiumContent}
                          disabled={premiumUnlock.isPolling}
                          className={`px-6 py-3 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                            premiumUnlock.isPolling
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                        >
                          {premiumUnlock.isPolling ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>Waiting for Wallet...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span>Unlock with DID Wallet</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Available Services
                  {authenticatedUser && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Role: {authenticatedUser.role})
                    </span>
                  )}
                </h3>
                
                <div className="grid gap-4">
                  {employee.permissions.map((permission) => (
                    <div key={permission} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-800 capitalize">{permission.replace('_', ' ')}</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">
                      {authenticatedUser?.credentialVerified 
                        ? `Authenticated via Verifiable Credential • Role: ${authenticatedUser.role}` 
                        : 'Authenticated via DID'} • Session expires in 8 hours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Premium Unlock Modal */}
        {premiumUnlock.showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    🔐 Premium Access Unlock
                  </h3>
                  <button
                    onClick={closePremiumModal}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-800 mb-2">
                    Waiting for DID Wallet
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Please open your DID Wallet app and use the <strong>"Unlock Premium Content"</strong> feature to continue.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h5 className="font-semibold text-blue-800 mb-2">Instructions:</h5>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Open your DID Wallet mobile app</li>
                    <li>2. Go to the main screen</li>
                    <li>3. Tap "Unlock Premium Content"</li>
                    <li>4. Complete the ZK-proof generation</li>
                    <li>5. Your session will be automatically upgraded</li>
                  </ol>
                </div>

                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="text-gray-600">
                    Polling for session upgrade...
                  </span>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    This process will timeout in{' '}
                    {Math.max(0, Math.round((premiumUnlock.maxPollTime - (Date.now() - premiumUnlock.startTime)) / 1000))}{' '}
                    seconds
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-800">Zero-Knowledge Privacy</p>
                        <p className="text-xs text-green-700 mt-1">
                          Your wallet address and personal information remain completely private during this process.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default EnterprisePortal;
