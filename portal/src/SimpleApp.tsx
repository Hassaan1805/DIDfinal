import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface AuthChallenge {
  challengeId: string;
  challenge: string;
  expiresIn: number;
  qrCodeData: string;
}

export default function SimpleApp() {
  const [authChallenge, setAuthChallenge] = useState<AuthChallenge | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('Initializing...');

  const testConnection = async () => {
    try {
      console.log('🧪 Testing basic connectivity...');
      setLoading(true);
      setStatus('Connecting to backend...');
      setError('');
      
      console.log(`🌐 Attempting to connect to: http://localhost:3001/api/auth/challenge`);
      console.log(`🔧 User agent: ${navigator.userAgent}`);
      console.log(`🔧 Current origin: ${window.location.origin}`);
      
      const response = await fetch('http://localhost:3001/api/auth/challenge', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`📡 Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (data.success) {
        setAuthChallenge(data.data);
        setStatus('Connected! Generating QR code...');
        
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
        setStatus('QR Code Ready');
        console.log('✅ QR code generated successfully');
      } else {
        throw new Error('Backend returned success: false');
      }
    } catch (err) {
      console.error('❌ Connection failed:', err);
      setStatus('Connection Failed');
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Simple Portal Test</h1>
          <p className="text-gray-300">Testing Direct Connection</p>
        </div>

        <div className="text-center mb-6">
          <div className="text-lg text-white mb-2">Status: {status}</div>
          
          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="text-red-200 text-sm">
              <strong>Error:</strong> {error}
            </div>
            <button
              onClick={testConnection}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {qrCodeUrl && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <p className="text-gray-300 text-sm">Scan this QR code with the wallet app</p>
            <button
              onClick={testConnection}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh QR Code
            </button>
          </div>
        )}

        {authChallenge && (
          <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white text-lg mb-2">Challenge Details:</h3>
            <div className="text-gray-300 text-sm space-y-1">
              <div><strong>Challenge ID:</strong> {authChallenge.challengeId}</div>
              <div><strong>Expires In:</strong> {authChallenge.expiresIn}s</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
