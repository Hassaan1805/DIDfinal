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
