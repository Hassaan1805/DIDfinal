import { useState } from 'react';
import QRCode from 'qrcode';

interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  address: string;
}

interface ChallengeData {
  challengeId: string;
  challenge: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
  data?: {
    employee?: {
      name: string;
    };
    token?: string;
  };
}

// Employee database matching backend
const employees: Record<string, Employee> = {
  'EMP001': {
    id: 'EMP001',
    name: 'Zaid',
    department: 'Engineering',
    role: 'CEO & Founder',
    email: 'zaid@decentralized-trust.platform',
    address: '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F'
  },
  'EMP002': {
    id: 'EMP002',
    name: 'Hassaan',
    department: 'Engineering', 
    role: 'CTO & Co-Founder',
    email: 'hassaan@decentralized-trust.platform',
    address: '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F'
  },
  'EMP003': {
    id: 'EMP003',
    name: 'Atharva',
    department: 'Engineering',
    role: 'Lead Frontend Developer', 
    email: 'atharva@decentralized-trust.platform',
    address: '0x1234567890123456789012345678901234567890'
  },
  'EMP004': {
    id: 'EMP004',
    name: 'Gracian',
    department: 'Engineering',
    role: 'Senior Backend Developer',
    email: 'gracian@decentralized-trust.platform', 
    address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'
  }
};

export default function TestPortal() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);

  const generateChallenge = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }

    setLoading(true);
    setError('');
    setAuthResult(null);

    try {
      const emp = employees[selectedEmployee];
      setEmployee(emp);

      // Get real challenge from backend
      const response = await fetch('http://localhost:3001/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to generate challenge');
      }

      const data = await response.json();
      setChallengeData(data.data);

      // Create authentication payload
      const authPayload = {
        type: 'did-auth-request',
        challengeId: data.data.challengeId,
        challenge: data.data.challenge,
        employee: {
          id: emp.id,
          name: emp.name,
          address: emp.address
        },
        message: `Sign this message to authenticate with challenge: ${data.data.challenge}`,
        apiEndpoint: 'http://localhost:3001/api/auth/verify',
        timestamp: Date.now()
      };

      const payloadString = JSON.stringify(authPayload, null, 2);
      setQrPayload(payloadString);

      // Generate QR code with the simple format first
      const simpleFormat = `http://localhost:3001/api/auth/verify?challenge=${data.data.challenge}&employee=${selectedEmployee}&address=${emp.address}`;
      
      const qrUrl = await QRCode.toDataURL(simpleFormat, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1F2937',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrUrl);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate challenge');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const testAuthentication = async () => {
    if (!challengeData || !employee) {
      setError('No challenge data available');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challengeData.challengeId,
          signature: 'demo_signature_for_development',
          address: employee.address,
          message: `Sign this message to authenticate with challenge: ${challengeData.challenge}`
        })
      });

      const result = await response.json();
      setAuthResult(result);

      if (!response.ok) {
        throw new Error(result.message || 'Authentication failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 DID Authentication Test Portal
          </h1>
          <p className="text-gray-600">
            Generate QR codes and test authentication flow
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            
            {/* Employee Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Select Employee</h2>
              <div className="space-y-3">
                {Object.values(employees).map((emp) => (
                  <label key={emp.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="employee"
                      value={emp.id}
                      checked={selectedEmployee === emp.id}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">{emp.name} ({emp.id})</div>
                      <div className="text-sm text-gray-500">{emp.role}</div>
                      <div className="text-xs text-gray-400 font-mono">{emp.address}</div>
                    </div>
                  </label>
                ))}
              </div>
              
              <button
                onClick={generateChallenge}
                disabled={!selectedEmployee || loading}
                className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Generating...' : '🔄 Generate Challenge & QR Code'}
              </button>
            </div>

            {/* Quick Test */}
            {challengeData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Test</h2>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-medium">Challenge ID:</span>
                    <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                      {challengeData.challengeId}
                    </div>
                  </div>
                  <button
                    onClick={testAuthentication}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? '⏳ Testing...' : '🧪 Test Authentication'}
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800">❌ {error}</div>
              </div>
            )}

            {/* Auth Result */}
            {authResult && (
              <div className={`border rounded-lg p-4 ${
                authResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className={`font-medium ${authResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {authResult.success ? '✅ Authentication Successful!' : '❌ Authentication Failed'}
                </div>
                {authResult.data?.employee && (
                  <div className="mt-2 text-sm">
                    <div>Employee: {authResult.data.employee.name}</div>
                    <div>Token Length: {authResult.data.token?.length || 0} characters</div>
                  </div>
                )}
                {authResult.message && (
                  <div className="mt-2 text-sm text-gray-600">{authResult.message}</div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - QR Code & Data */}
          <div className="space-y-6">
            
            {/* QR Code Display */}
            {qrCodeUrl && (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-xl font-semibold mb-4">🔲 Authentication QR Code</h2>
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img src={qrCodeUrl} alt="Authentication QR Code" className="max-w-full" />
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Scan with wallet app or copy data below for manual testing
                </p>
              </div>
            )}

            {/* QR Data */}
            {qrPayload && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">📋 QR Code Data</h2>
                  <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      copied 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96 border">
                  {qrPayload}
                </pre>
                <div className="mt-4 text-sm text-gray-600">
                  <div>💡 <strong>Testing Tips:</strong></div>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Copy this data to test wallet manually</li>
                    <li>Use the "Quick Test" button for automated testing</li>
                    <li>Check backend logs for detailed authentication flow</li>
                    <li>Development mode accepts "demo_signature_for_development"</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
