import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Orb from './components/Orb';
import PixelBlast from './components/backgrounds/PixelBlast';

// Employee data matching backend
const employees = [
  { id: 'EMP001', name: 'Zaid', role: 'CEO & Founder', department: 'Engineering', email: 'zaid@company.com', address: '0x1234567890123456789012345678901234567890' },
  { id: 'EMP002', name: 'Sarah', role: 'CTO', department: 'Engineering', email: 'sarah@company.com', address: '0x2345678901234567890123456789012345678901' },
  { id: 'EMP003', name: 'Mike', role: 'Head of Security', department: 'Security', email: 'mike@company.com', address: '0x3456789012345678901234567890123456789012' },
  { id: 'EMP004', name: 'Lisa', role: 'Product Manager', department: 'Product', email: 'lisa@company.com', address: '0x4567890123456789012345678901234567890123' }
];

interface AuthChallenge {
  challengeId: string;
  challenge: string;
  message: string;
  timestamp: number;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  address: string;
}

interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  securityScore: number;
  systemUptime: string;
}

const EnterprisePortalProfessional: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [authStep, setAuthStep] = useState<'login' | 'qr' | 'scanning' | 'authenticated'>('login');
  
  // Quick access to authenticated dashboard for UI development
  const quickAuthForTesting = () => {
    const testEmployee = employees[0]; // Use Zaid as test user
    setCurrentEmployee(testEmployee);
    setAuthStep('authenticated');
    localStorage.setItem('authToken', 'test-token-123');
    localStorage.setItem('currentEmployee', JSON.stringify(testEmployee));
  };
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats] = useState<DashboardStats>({
    totalEmployees: 2847,
    activeProjects: 127,
    securityScore: 98,
    systemUptime: '99.9%'
  });

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('🔍 Checking backend health...');
        const response = await fetch('http://localhost:3001/api/health');
        const isHealthy = response.ok;
        console.log(`🏥 Backend health check:`, { status: response.status, ok: response.ok, healthy: isHealthy });
        setIsConnected(isHealthy);
      } catch (error) {
        console.error('❌ Health check failed:', error);
        setIsConnected(false);
      }
    };
    
    // Initial check
    checkConnection();
    
    // Set up periodic health checks every 10 seconds
    const healthInterval = setInterval(checkConnection, 10000);
    
    return () => clearInterval(healthInterval);
  }, []);

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const employeeData = localStorage.getItem('currentEmployee');
    
    if (token && employeeData) {
      setCurrentEmployee(JSON.parse(employeeData));
      setAuthStep('authenticated');
    }
  }, []);

  const handleLogin = async () => {
    if (!employeeId.trim()) {
      alert('Please enter your Employee ID');
      return;
    }

    const employee = employees.find(emp => emp.id === employeeId.trim());
    if (!employee) {
      alert('Employee ID not found. Please contact your administrator.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/auth/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee.id,
          address: employee.address,
          domain: 'enterprise.portal.com'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate challenge');
      }

      const challengeResponse = await response.json();
      console.log('Challenge data received:', JSON.stringify(challengeResponse, null, 2)); // More detailed debug log
      
      // Extract the actual challenge data from the nested response
      const challengeData = challengeResponse.data;
      setChallenge(challengeData);
      setCurrentEmployee(employee);

      // Generate QR code with proper DID authentication request structure
      const qrData = JSON.stringify({
        type: "did-auth-request",
        challenge: challengeData.challenge || `challenge_${Date.now()}`, // Fallback if challenge missing
        challengeId: challengeData.challengeId || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`, // Fallback if challengeId missing
        domain: "decentralized-trust.platform",
        timestamp: new Date(challengeData.timestamp || Date.now()).getTime(),
        requiredRole: employee.role,
        companyId: "dtp_enterprise_001",
        sessionId: `session_${new Date(challengeData.timestamp || Date.now()).getTime()}`,
        apiEndpoint: "http://localhost:3001/api/auth/verify",
        employee: {
          id: employee.id,
          name: employee.name,
          department: employee.department,
          role: employee.role
        },
        employeeAddresses: {
          "EMP001": "0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F",
          "EMP002": "0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F",
          "EMP003": "0x1234567890123456789012345678901234567890",
          "EMP004": "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
        },
        nonce: Math.random().toString(36).substring(2, 15)
      });

      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        }
      });

      setQrCodeUrl(qrUrl);
      setAuthStep('qr');
      
      // Start polling for authentication using the actual challengeId from the API response
      startAuthenticationPolling(challengeData.challengeId);
      
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication failed. Please try again.');
    }
  };

  const startAuthenticationPolling = (challengeId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/auth/status/${challengeId}`);
        const statusResponse = await response.json();
        console.log('Polling response:', statusResponse); // Debug log
        
        // Extract the actual status data from the nested response
        const statusData = statusResponse.data;

        if (statusData && statusData.status === 'completed' && statusData.token) {
          clearInterval(pollInterval);
          
          // Store authentication data
          localStorage.setItem('authToken', statusData.token);
          if (statusData.userAddress) {
            localStorage.setItem('userAddress', statusData.userAddress);
          }
          
          // Find the employee from our local data
          const authenticatedEmployee = employees.find(emp => emp.address === statusData.userAddress) || currentEmployee;
          if (authenticatedEmployee) {
            localStorage.setItem('currentEmployee', JSON.stringify(authenticatedEmployee));
            setCurrentEmployee(authenticatedEmployee);
          }
          
          setAuthStep('authenticated');
          setShowWelcome(true);
          
          // Hide welcome message after 3 seconds
          setTimeout(() => setShowWelcome(false), 3000);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Clear polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentEmployee');
    setCurrentEmployee(null);
    setAuthStep('login');
    setEmployeeId('');
    setQrCodeUrl('');
    setChallenge(null);
    setActiveTab('dashboard');
  };

  const renderLoginScreen = () => (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Animated Orb Background - Single Central Orb */}
      <div className="absolute inset-0 opacity-60">
        <Orb hue={242} hoverIntensity={2.0} rotateOnHover={true} />
      </div>

      {/* Navigation Header */}
      <nav style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }} className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-xl shadow-purple-500/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">
                Decentralized Identity Authentication
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Login Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {/* Main Login Card */}
        <div className="relative w-full max-w-lg z-10">
        <div className="bg-white/10 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl shadow-2xl p-8 border border-white/20 shadow-black/20">
          {/* Header Card */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Enterprise Portal</h1>
            <p className="text-gray-300 font-medium">Secure • Decentralized • Innovative</p>
          </div>

          {/* Connection Status Card */}
          <div className={`flex items-center justify-center mb-6 p-4 rounded-xl border backdrop-blur-md transition-all ${
            isConnected 
              ? 'bg-green-500/20 text-green-200 border-green-400/30 shadow-green-500/20' 
              : 'bg-red-500/20 text-red-200 border-red-400/30 shadow-red-500/20'
          } shadow-lg`}>
            <div className={`w-3 h-3 rounded-full mr-3 animate-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="font-semibold">{isConnected ? '🟢 System Online' : '🔴 System Offline'}</span>
          </div>

          {/* Login Form Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20 shadow-inner">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-3">Employee Identification</label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/60 focus:ring-4 focus:ring-blue-400/20 transition-all font-medium"
                  placeholder="Enter your Employee ID (e.g., EMP001)"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={!isConnected}
                className="w-full bg-gradient-to-r from-blue-500/80 to-purple-600/80 hover:from-blue-600/90 hover:to-purple-700/90 disabled:from-gray-500/60 disabled:to-gray-600/60 backdrop-blur-sm text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg border border-white/20"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>{!isConnected ? 'System Offline' : 'Authenticate with Wallet'}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-white/20">
            <p className="text-xs text-gray-400">Powered by Decentralized Identity Technology</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );

  const renderQRScreen = () => (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Animated Orb Background - Single Central Orb */}
      <div className="absolute inset-0 opacity-60">
        <Orb hue={242} hoverIntensity={2.0} rotateOnHover={true} />
      </div>

      {/* Navigation Header */}
      <nav style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }} className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-xl shadow-purple-500/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-lg">
                Decentralized Identity Authentication
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* QR Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-white/20 z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Wallet Authentication</h2>
          <p className="text-blue-200">Scan QR code with your mobile wallet</p>
        </div>

        {/* Employee Info */}
        {currentEmployee && (
          <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {currentEmployee.name[0]}
              </div>
              <div>
                <h3 className="text-white font-semibold">{currentEmployee.name}</h3>
                <p className="text-blue-200 text-sm">{currentEmployee.role}</p>
                <p className="text-blue-300 text-xs">{currentEmployee.department}</p>
              </div>
            </div>
          </div>
        )}

        {/* QR Code with Glassmorphism */}
        <div 
          className="rounded-2xl p-6 mb-6 border border-white/20"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          {qrCodeUrl && (
            <div className="bg-white rounded-xl p-4 mx-auto w-fit">
              <img src={qrCodeUrl} alt="Authentication QR Code" className="w-full max-w-xs mx-auto" />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-blue-200">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Waiting for wallet authentication...</span>
          </div>
          
          <div className="text-sm text-blue-300">
            <div className="mb-2">📱 Open your mobile wallet</div>
            <div className="mb-2">📷 Scan the QR code above</div>
            <div>✅ Approve the authentication request</div>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={() => setAuthStep('login')}
          className="w-full mt-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 px-6 rounded-xl transition-all"
        >
          Cancel Authentication
        </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* PixelBlast Background Animation */}
      <div className="absolute inset-0 opacity-70">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#8B5CF6"
          patternScale={3}
          patternDensity={1.8}
          enableRipples={true}
          rippleIntensityScale={1.5}
          rippleSpeed={0.4}
          speed={0.8}
          transparent={true}
          edgeFade={0.3}
        />
      </div>

      {/* Header with Glassmorphism */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }} className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Enterprise Portal</h1>
                <p className="text-sm text-gray-300">Decentralized Trust Platform</p>
              </div>
            </div>

            {currentEmployee && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                    {currentEmployee.name[0]}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-white">{currentEmployee.name}</p>
                    <p className="text-xs text-gray-300">{currentEmployee.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-white/20 hover:scale-105"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Welcome Message with Glassmorphism */}
      {showWelcome && (
        <div 
          className="fixed top-4 right-4 z-50 text-white px-6 py-4 rounded-lg shadow-xl transform transition-all animate-pulse border border-white/20"
          style={{
            background: 'rgba(34, 197, 94, 0.2)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
          }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Welcome back, {currentEmployee?.name}!</span>
          </div>
        </div>
      )}

      {/* Navigation - Invisible Background with Glassmorphism Buttons */}
      <nav className="relative z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
              { id: 'projects', label: 'Projects', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { id: 'security', label: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 my-4 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 border ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-blue-400/30'
                    : 'text-gray-300 hover:text-white border-white/20'
                }`}
                style={{
                  background: activeTab === tab.id 
                    ? 'rgba(59, 130, 246, 0.15)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                  boxShadow: activeTab === tab.id
                    ? '0 8px 32px rgba(59, 130, 246, 0.2)'
                    : '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content with Dark Theme */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid with Glassmorphism */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Employees', value: dashboardStats.totalEmployees, icon: '👥', color: 'blue' },
                { label: 'Active Projects', value: dashboardStats.activeProjects, icon: '📊', color: 'green' },
                { label: 'Security Score', value: `${dashboardStats.securityScore}%`, icon: '🛡️', color: 'purple' },
                { label: 'System Uptime', value: dashboardStats.systemUptime, icon: '⚡', color: 'yellow' }
              ].map((stat, index) => (
                <div 
                  key={index} 
                  className="rounded-xl p-6 border border-white/20 hover:scale-105 transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-300">{stat.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                    <div className="text-2xl">{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity with Glassmorphism */}
            <div 
              className="rounded-xl border border-white/20"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div className="p-6 border-b border-white/20">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    { user: 'Sarah Chen', action: 'logged in via mobile wallet', time: '2 minutes ago', type: 'login' },
                    { user: 'Mike Johnson', action: 'completed security audit', time: '15 minutes ago', type: 'security' },
                    { user: 'Lisa Wong', action: 'created new project proposal', time: '1 hour ago', type: 'project' },
                    { user: 'System', action: 'backup completed successfully', time: '2 hours ago', type: 'system' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'login' ? 'bg-green-400' :
                        activity.type === 'security' ? 'bg-red-400' :
                        activity.type === 'project' ? 'bg-blue-400' : 'bg-gray-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          <span className="font-medium">{activity.user}</span> {activity.action}
                        </p>
                        <p className="text-xs text-gray-300">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Active Projects</h2>
              <button 
                className="px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 border border-white/20"
                style={{
                  background: 'rgba(59, 130, 246, 0.3)',
                  backdropFilter: 'blur(20px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)',
                }}
              >
                New Project
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'DID Authentication Platform', progress: 85, team: 4, status: 'active' },
                { name: 'Zero-Knowledge Proof System', progress: 60, team: 6, status: 'active' },
                { name: 'Mobile Wallet Integration', progress: 95, team: 3, status: 'review' },
                { name: 'Enterprise Portal Redesign', progress: 30, team: 5, status: 'planning' }
              ].map((project, index) => (
                <div 
                  key={index} 
                  className="rounded-xl p-6 border border-white/20 hover:scale-105 transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">{project.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      project.status === 'review' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2">
                      <div 
                        className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-300">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {project.team} team members
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Security Dashboard</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div 
                className="rounded-xl p-6 border border-white/20"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <h3 className="font-semibold text-white mb-4">Security Score</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">98%</div>
                  <p className="text-sm text-gray-300">Excellent security posture</p>
                </div>
              </div>
              
              <div 
                className="rounded-xl p-6 border border-white/20"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <h3 className="font-semibold text-white mb-4">Recent Logins</h3>
                <div className="space-y-3">
                  {[
                    { user: 'Zaid', time: '2 minutes ago', location: 'Mumbai, India' },
                    { user: 'Sarah', time: '15 minutes ago', location: 'San Francisco, USA' },
                    { user: 'Mike', time: '1 hour ago', location: 'London, UK' }
                  ].map((login, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{login.user}</p>
                        <p className="text-xs text-gray-300">{login.location}</p>
                      </div>
                      <span className="text-xs text-gray-300">{login.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
            
            <div 
              className="rounded-xl p-6 border border-white/20"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
            >
              <h3 className="font-semibold text-white mb-4">Authentication Methods</h3>
              <div className="space-y-4">
                {[
                  { method: 'Mobile Wallet', percentage: 75, count: 2135 },
                  { method: 'Hardware Token', percentage: 20, count: 568 },
                  { method: 'Biometric', percentage: 5, count: 142 }
                ].map((method, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-white">{method.method}</span>
                      <span className="text-xs text-gray-300">({method.count} users)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-700/50 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full"
                          style={{ width: `${method.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-300 w-10">{method.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  if (authStep === 'authenticated') {
    return renderDashboard();
  } else if (authStep === 'qr') {
    return renderQRScreen();
  } else {
    return renderLoginScreen();
  }
};

export default EnterprisePortalProfessional;