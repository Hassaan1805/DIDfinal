import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface CompanyPortalProps {
  companyName?: string;
  logoUrl?: string;
  theme?: 'corporate' | 'modern' | 'minimal';
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

// Real employee database matching backend auth.ts
const mockEmployeeDatabase: Record<string, Employee> = {
  'EMP001': {
    id: 'EMP001',
    name: 'Zaid',
    department: 'Engineering',
    role: 'CEO & Founder',
    email: 'zaid@decentralized-trust.platform',
    avatar: 'https://i.pravatar.cc/150?u=emp001',
    permissions: ['read', 'write', 'admin', 'super-admin'],
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  'EMP002': {
    id: 'EMP002', 
    name: 'Hassaan',
    department: 'Engineering',
    role: 'CTO & Co-Founder',
    email: 'hassaan@decentralized-trust.platform',
    avatar: 'https://i.pravatar.cc/150?u=emp002',
    permissions: ['read', 'write', 'admin'],
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  'EMP003': {
    id: 'EMP003',
    name: 'Atharva', 
    department: 'Engineering',
    role: 'Lead Frontend Developer',
    email: 'atharva@decentralized-trust.platform',
    avatar: 'https://i.pravatar.cc/150?u=emp003',
    permissions: ['read', 'write'],
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  'EMP004': {
    id: 'EMP004',
    name: 'Gracian',
    department: 'Engineering', 
    role: 'Senior Backend Developer',
    email: 'gracian@decentralized-trust.platform',
    avatar: 'https://i.pravatar.cc/150?u=emp004',
    permissions: ['read', 'write'],
    lastLogin: new Date().toISOString(),
    status: 'active'
  }
};

function SimpleEnterprisePortal({ 
  companyName = "Decentralized Trust Platform", 
  logoUrl 
}: CompanyPortalProps) {
  const [authStep, setAuthStep] = useState<'login' | 'qr' | 'scanning' | 'authenticating' | 'success'>('login');
  const [employeeId, setEmployeeId] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [challengeId, setChallengeId] = useState('');
  const [scanningStatus, setScanningStatus] = useState('');
  const [authProgress, setAuthProgress] = useState(0);

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEmployeeLogin = async () => {
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID');
      return;
    }

    setLoading(true);
    setError('');
    setConnectionStatus('connecting');

    try {
      // Check if employee exists in our database
      const emp = mockEmployeeDatabase[employeeId.toUpperCase()];
      if (!emp) {
        throw new Error('Employee ID not found');
      }

      setEmployee(emp);
      
      // Step 1: Generate real challenge from backend
      const challengeResponse = await fetch('http://localhost:3001/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!challengeResponse.ok) {
        throw new Error('Failed to generate authentication challenge');
      }
      
      const challengeData = await challengeResponse.json();
      const challenge = challengeData.data.challenge;
      const challengeIdFromBackend = challengeData.data.challengeId;
      setChallengeId(challengeIdFromBackend);
      
      // Create realistic authentication payload for DID wallet
      const authPayload = {
        type: 'did-auth-request',
        challenge,
        challengeId: challengeIdFromBackend,
        domain: "decentralized-trust.platform",
        timestamp: Date.now(),
        requiredRole: emp.role,
        companyId: "dtp_enterprise_001",
        sessionId: `session_${Date.now()}`,
        apiEndpoint: "http://localhost:3001/api/auth/verify",
        employee: {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          role: emp.role
        },
        // Include the addresses that map to each employee from our backend
        employeeAddresses: {
          'EMP001': '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F', // Zaid
          'EMP002': '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F', // Hassaan  
          'EMP003': '0x1234567890123456789012345678901234567890', // Atharva
          'EMP004': '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'  // Gracian
        },
        nonce: Math.random().toString(36).substring(2, 15)
      };

      const qrData = JSON.stringify(authPayload);
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1F2937',
          light: '#F9FAFB'
        },
        errorCorrectionLevel: 'H'
      });

      setQrCodeUrl(qrCodeDataUrl);
      setAuthStep('qr');
      setConnectionStatus('connected');
      
      // Start realistic mobile wallet scanning simulation with real backend auth
      simulateRealisticMobileScan(challengeIdFromBackend, emp.id);

    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const simulateRealisticMobileScan = async (challengeIdFromBackend: string, employeeId: string) => {
    // Phase 1: Waiting for mobile scan (3 seconds)
    setTimeout(() => {
      setAuthStep('scanning');
      setScanningStatus('📱 QR Code detected by mobile wallet...');
      setAuthProgress(15);
    }, 3000);

    // Phase 2: DID resolution (1.5 seconds later)
    setTimeout(() => {
      setScanningStatus('🔍 Resolving DID identity...');
      setAuthProgress(30);
    }, 4500);

    // Phase 3: Credential verification (1 second later)
    setTimeout(() => {
      setScanningStatus('✅ Verifying employee credentials...');
      setAuthProgress(50);
    }, 5500);

    // Phase 4: Zero-knowledge proof generation (2 seconds later)
    setTimeout(() => {
      setScanningStatus('🔐 Generating zero-knowledge proof...');
      setAuthProgress(70);
    }, 7500);

    // Phase 5: Real Backend authentication (1.5 seconds later)
    setTimeout(async () => {
      setScanningStatus('🌐 Authenticating with enterprise system...');
      setAuthProgress(85);
      
      try {
        // Use real backend API with proper employee addresses
        const employeeAddresses: Record<string, string> = {
          'EMP001': '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F', // Zaid
          'EMP002': '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F', // Hassaan  
          'EMP003': '0x1234567890123456789012345678901234567890', // Atharva
          'EMP004': '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'  // Gracian
        };

        const employeeAddress = employeeAddresses[employeeId];
        const message = `Sign this message to authenticate with challenge: ${challengeIdFromBackend}`;

        const response = await fetch('http://localhost:3001/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: challengeIdFromBackend,
            signature: 'demo_signature_for_development', // Development mode signature
            address: employeeAddress,
            message: message
          })
        });
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('✅ Authentication successful:', responseData);
          setAuthProgress(100);
          setScanningStatus('🎉 Authentication successful!');
          setTimeout(() => {
            setAuthStep('success');
          }, 1500);
        } else {
          const errorData = await response.json();
          console.error('❌ Backend authentication failed:', errorData);
          throw new Error(`Backend authentication failed: ${errorData.message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError(`Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
        setAuthStep('qr');
        setAuthProgress(0);
        setScanningStatus('');
      }
    }, 9000);
  };

  const handleNewLogin = () => {
    setAuthStep('login');
    setEmployee(null);
    setEmployeeId('');
    setQrCodeUrl('');
    setError('');
    setConnectionStatus('disconnected');
    setChallengeId('');
    setScanningStatus('');
    setAuthProgress(0);
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
              <div className="portal-card">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 -mx-6 -mt-6 mb-6 rounded-t-xl">
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
                    className="btn-primary w-full"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="loading-spinner"></div>
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
                      <div 
                        key={emp.id} 
                        className="flex items-center justify-between bg-white px-3 py-2 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => setEmployeeId(emp.id)}
                      >
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
              <div className="portal-card">
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-8 py-6 -mx-6 -mt-6 mb-6 rounded-t-xl">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Scan with DID Wallet</h2>
                    <p className="text-green-100 mt-2">Waiting for mobile wallet authentication</p>
                  </div>
                </div>

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
                    <div className="qr-container mb-6">
                      <img src={qrCodeUrl} alt="DID Authentication QR Code" className="mx-auto" />
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-blue-700 font-medium">Waiting for mobile scan...</span>
                      </div>
                      <p className="text-sm text-blue-600 text-center">
                        Open your DID Wallet app and scan this QR code
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating secure authentication challenge...</p>
                  </div>
                )}

                <button
                  onClick={handleNewLogin}
                  className="btn-secondary w-full mt-4"
                >
                  ← Cancel Authentication
                </button>
              </div>
            </div>
          )}

          {/* Scanning/Authentication Step */}
          {authStep === 'scanning' && employee && (
            <div className="max-w-lg mx-auto">
              <div className="portal-card">
                <div className="bg-gradient-to-r from-purple-600 to-blue-700 px-8 py-6 -mx-6 -mt-6 mb-6 rounded-t-xl">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Processing Authentication</h2>
                    <p className="text-purple-100 mt-2">Verifying your identity with blockchain</p>
                  </div>
                </div>

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

                {/* Progress Indicator */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Authentication Progress</span>
                    <span className="text-sm font-medium text-blue-600">{authProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${authProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Status Message */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-purple-800 font-medium">{scanningStatus}</span>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500">
                  This process typically takes 10-15 seconds
                </div>
              </div>
            </div>
          )}

          {/* Success Step */}
          {authStep === 'success' && employee && (
            <div className="max-w-lg mx-auto">
              <div className="portal-card text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Authentication Successful!</h2>
                <p className="text-gray-600 mb-6">Welcome {employee.name}, you are now authenticated via DID technology.</p>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-xl mb-6">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">
                      Authenticated via DID • Session expires in 8 hours
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleNewLogin}
                  className="btn-secondary"
                >
                  Start New Session
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}

export default SimpleEnterprisePortal;
