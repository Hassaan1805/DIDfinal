import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface AuthChallenge {
  challengeId: string;
  challenge: string;
  expiresIn: number;
  qrCodeData: string;
}

function App() {
  const [authChallenge, setAuthChallenge] = useState<AuthChallenge | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'retrying'>('connecting');

  const fetchChallenge = async () => {
    try {
      console.log('🔄 Fetching challenge...');
      console.log('🌐 Window location:', window.location.href);
      console.log('🔧 Navigator online:', navigator.onLine);
      
      setLoading(true);
      setConnectionStatus('connecting');
      setError('');
      
      const response = await fetch('/api/auth/challenge', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log(`📡 Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Data received:', data);
      
      if (data.success) {
        setAuthChallenge(data.data);
        setConnectionStatus('connected');
        
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(data.data.qrCodeData, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        setQrCodeUrl(qrCodeDataUrl);
        console.log('✅ QR code generated successfully');
      } else {
        throw new Error('Backend returned success: false');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      if (err instanceof Error) {
        console.error('❌ Error name:', err.constructor.name);
        console.error('❌ Error message:', err.message);
      }
      setConnectionStatus('disconnected');
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  // IMMEDIATE test - call fetch as soon as component mounts
  useEffect(() => {
    console.log('🚀 IMMEDIATE Component mounted, calling fetchChallenge...');
    
    // Call immediately
    fetchChallenge();
    
    // Also call after a short delay
    const timer1 = setTimeout(() => {
      console.log('⏰ 1 second delay call...');
      fetchChallenge();
    }, 1000);
    
    // And another one
    const timer2 = setTimeout(() => {
      console.log('⏰ 3 second delay call...');
      fetchChallenge();
    }, 3000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Manual retry function
  const handleRetry = () => {
    console.log('🔄 Manual retry clicked...');
    fetchChallenge();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-blue-600';
      case 'retrying': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'connecting': return '🔵';
      case 'retrying': return '🟡';
      case 'disconnected': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected to Authentication Service';
      case 'connecting': return 'Connecting to Authentication Service...';
      case 'retrying': return 'Retrying Connection...';
      case 'disconnected': return 'Disconnected from Authentication Service';
      default: return 'Unknown Status';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🔐 Authentication Portal</h1>
          <p className="text-gray-300">Decentralized Trust Platform</p>
        </div>

        {/* Connection Status */}
        <div className="text-center mb-6">
          <div className={`text-lg ${getStatusColor()} mb-2`}>
            {getStatusIcon()} {getStatusText()}
          </div>
          
          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          
          {/* Debug/Test Button */}
          <button
            onClick={handleRetry}
            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            🧪 Test Fetch Now
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="text-red-200 text-sm">
              <strong>Connection Error:</strong> {error}
            </div>
            <button
              onClick={handleRetry}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* QR Code Display */}
        {qrCodeUrl && connectionStatus === 'connected' && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <img src={qrCodeUrl} alt="Authentication QR Code" className="w-64 h-64" />
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Scan this QR code with your wallet app to authenticate
            </p>
            <button
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Generate New QR Code
            </button>
          </div>
        )}

        {/* Challenge Details */}
        {authChallenge && (
          <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white text-lg mb-2">Challenge Details:</h3>
            <div className="text-gray-300 text-sm space-y-1">
              <div><strong>Challenge ID:</strong> {authChallenge.challengeId}</div>
              <div><strong>Expires In:</strong> {authChallenge.expiresIn} seconds</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Secure • Decentralized • Trustless</p>
        </div>
      </div>
    </div>
  );
}

export default App;
