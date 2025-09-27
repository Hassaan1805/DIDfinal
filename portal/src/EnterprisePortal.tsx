import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

interface EnterprisePortalProps {
  companyName?: string;
  logoUrl?: string;
}

const EnterprisePortal: React.FC<EnterprisePortalProps> = ({ 
  companyName = "Enterprise Portal", 
  logoUrl 
}) => {
  const navigate = useNavigate();
  const [authStep, setAuthStep] = useState(0); // Start at 0 (not authenticated)
  const [isLoading, setIsLoading] = useState(false);
  const [qrData, setQrData] = useState('');

  // Generate QR data for authentication
  useEffect(() => {
    const generateAuthRequest = () => {
      const timestamp = Date.now();
      const challenge = Math.random().toString(36).substring(7);
      const authData = {
        type: 'did_auth',
        timestamp,
        challenge,
        domain: 'decentralized-trust-platform.local',
        callbackUrl: `http://localhost:5174/auth/callback`,
        requestId: `auth_${timestamp}_${challenge}`,
        nonce: Math.random().toString(36).substring(2, 10)
      };
      return JSON.stringify(authData);
    };
    
    setQrData(generateAuthRequest());
  }, [authStep]);

  const handleLoginClick = () => {
    console.log('Login with DID Wallet clicked');
    // Add visual feedback
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAuthStep(1); // Move to QR code generation step
    }, 500);
  };

  const handleScanClick = () => {
    console.log('Simulate Scan clicked');
    setAuthStep(2);
  };

  const handleVerifyClick = () => {
    console.log('Complete Verification clicked');
    setIsLoading(true);
    setTimeout(() => {
      setAuthStep(3);
      setIsLoading(false);
      // Navigate to analytics after success
      setTimeout(() => {
        navigate('/benchmark');
      }, 2000);
    }, 1500);
  };

  const handlePremiumClick = () => {
    console.log('Navigate to Analytics clicked');
    navigate('/benchmark');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Section */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem', background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt="Company Logo" 
              style={{ width: '64px', height: '64px', borderRadius: '12px', marginRight: '1rem' }}
            />
          )}
          <div>
            <h1 style={{ margin: '0', fontSize: '2.5rem', fontWeight: 'bold' }}>
              {companyName}
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.2rem', opacity: 0.9 }}>
              Enterprise DID Authentication Portal
            </p>
          </div>
        </div>
        <p style={{ margin: '0', fontSize: '1rem', opacity: 0.8 }}>
          🔐 Secure Zero-Knowledge Authentication
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="card">
        <h2 className="card-title">Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="btn" 
            onClick={handleLoginClick}
            style={{ minWidth: '200px' }}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Generating QR...' : '🔐 Login with DID Wallet'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handlePremiumClick}
            style={{ minWidth: '150px' }}
          >
            📊 View Analytics
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="card">
        <h3 className="card-title">System Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#F0FDF4', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="connection-dot"></div>
              <strong>Backend Service</strong>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', color: '#059669' }}>Connected</p>
          </div>
          <div style={{ padding: '1rem', background: '#FEF3F2', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%' }}></div>
              <strong>Blockchain Network</strong>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', color: '#DC2626' }}>Offline</p>
          </div>
          <div style={{ padding: '1rem', background: '#FEF3F2', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%' }}></div>
              <strong>ZK Proof Service</strong>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', color: '#DC2626' }}>Offline</p>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Authentication Flow */}
      <div className="card">
        <h2 className="card-title">DID Authentication Flow</h2>
        
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${authStep === 1 ? 'step-active' : authStep > 1 ? 'step-completed' : 'step-pending'}`}>
            <div className="step-icon">
              {authStep > 1 ? '✓' : '📱'}
            </div>
            <div className="step-title">Scan QR Code</div>
            <div className="step-description">Use wallet app to scan</div>
          </div>
          
          <div style={{ width: '2rem', height: '2px', background: authStep > 1 ? '#10B981' : '#E5E7EB' }}></div>
          
          <div className={`step ${authStep === 2 ? 'step-active' : authStep > 2 ? 'step-completed' : 'step-pending'}`}>
            <div className="step-icon">
              {authStep > 2 ? '✓' : '🔐'}
            </div>
            <div className="step-title">Verify Identity</div>
            <div className="step-description">Zero-Knowledge Proof</div>
          </div>
          
          <div style={{ width: '2rem', height: '2px', background: authStep > 2 ? '#10B981' : '#E5E7EB' }}></div>
          
          <div className={`step ${authStep === 3 ? 'step-completed' : 'step-pending'}`}>
            <div className="step-icon">
              {authStep === 3 ? '✓' : '🎯'}
            </div>
            <div className="step-title">Access Granted</div>
            <div className="step-description">Welcome to dashboard</div>
          </div>
=======
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
>>>>>>> 6e9e2198fc49e65c9330337229688545fccdfe6e
        </div>

        {/* Step Content */}
        {authStep === 0 && (
          <div className="qr-section">
            <div style={{ fontSize: '4rem', margin: '2rem 0' }}>🔐</div>
            <h3>Ready to Authenticate</h3>
            <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
              Click "Login with DID Wallet" above to start the authentication process
            </p>
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.1)', 
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <strong>📋 What happens next:</strong>
              <ol style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                <li>QR code will be generated</li>
                <li>Scan with your mobile wallet</li>
                <li>Complete zero-knowledge proof verification</li>
                <li>Access granted to enterprise portal</li>
              </ol>
            </div>
          </div>
        )}

        {authStep === 1 && (
          <div className="qr-section">
            <div className="qr-code-container" style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '12px', 
              display: 'inline-block',
              border: '2px solid #E5E7EB',
              marginBottom: '1rem'
            }}>
              <QRCode 
                value={qrData}
                size={200}
                level="H"
              />
            </div>
            <h3>Scan with Wallet App</h3>
            <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
              Use your mobile wallet to scan this QR code and authenticate your identity
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={handleScanClick}>
                🚀 Simulate Scan
              </button>
              <button className="btn btn-secondary" onClick={() => setQrData(JSON.stringify({
                type: 'did_auth',
                timestamp: Date.now(),
                challenge: Math.random().toString(36).substring(7),
                domain: 'decentralized-trust-platform.local',
                callbackUrl: `http://localhost:5174/auth/callback`,
                requestId: `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                nonce: Math.random().toString(36).substring(2, 10)
              }))}>
                🔄 Refresh QR
              </button>
              <button className="btn btn-secondary" onClick={() => setAuthStep(0)}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {authStep === 2 && (
          <div className="qr-section">
            <div style={{ fontSize: '4rem', margin: '2rem 0' }}>🔐</div>
            <h3>Verifying Identity</h3>
            <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
              Generating zero-knowledge proof to verify your credentials without revealing personal data
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-success" 
                onClick={handleVerifyClick}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Verifying...' : '✅ Complete Verification'}
              </button>
              <button className="btn btn-secondary" onClick={() => setAuthStep(1)}>
                ← Back to QR
              </button>
            </div>
          </div>
        )}

        {authStep === 3 && (
          <div className="qr-section">
            <div style={{ fontSize: '4rem', margin: '2rem 0', color: '#10B981' }}>🎉</div>
            <h3 style={{ color: '#10B981' }}>Authentication Successful!</h3>
            <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
              Welcome to the enterprise portal. Redirecting to your dashboard...
            </p>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: '#E5E7EB', 
              borderRadius: '4px',
              overflow: 'hidden',
              maxWidth: '300px',
              margin: '0 auto 2rem auto'
            }}>
              <div style={{ 
                width: '100%', 
                height: '100%', 
                background: 'linear-gradient(90deg, #10B981, #059669)',
                borderRadius: '4px',
                animation: 'pulse 1s infinite'
              }}></div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => navigate('/benchmark')}>
                🚀 Go to Analytics Dashboard
              </button>
              <button className="btn btn-secondary" onClick={() => setAuthStep(0)}>
                🔄 Start New Session
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔐</div>
          <h3 className="card-title">Zero-Knowledge Privacy</h3>
          <p className="card-description">
            Prove your identity without revealing personal information using advanced cryptographic protocols
          </p>
        </div>

        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
          <h3 className="card-title">Lightning Fast</h3>
          <p className="card-description">
            Seamless authentication experience with sub-second verification times for enterprise users
          </p>
        </div>

        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
          <h3 className="card-title">Enterprise Security</h3>
          <p className="card-description">
            Bank-grade security with blockchain verification and decentralized identity management
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnterprisePortal;
