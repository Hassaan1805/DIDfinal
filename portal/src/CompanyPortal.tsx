import { useState, useEffect } from 'react';
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
}

interface CompanyPortalProps {
  companyName?: string;
  logoUrl?: string;
}

function CompanyPortal({ companyName = "Decentralized Trust Platform", logoUrl }: CompanyPortalProps) {
  const [authChallenge, setAuthChallenge] = useState<AuthChallenge | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [authStep, setAuthStep] = useState<'login' | 'qr' | 'authenticating' | 'success'>('login');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Mock employee database - in production this would be from your HR system
  const mockEmployeeDatabase: Record<string, Employee> = {
    'EMP001': {
      id: 'EMP001',
      name: 'John Doe',
      department: 'Engineering',
      role: 'Senior Developer',
      email: 'john.doe@company.com'
    },
    'EMP002': {
      id: 'EMP002',
      name: 'Jane Smith',
      department: 'HR',
      role: 'HR Manager',
      email: 'jane.smith@company.com'
    },
    'EMP003': {
      id: 'EMP003',
      name: 'Mike Johnson',
      department: 'Finance',
      role: 'Financial Analyst',
      email: 'mike.johnson@company.com'
    }
  };

  const fetchChallenge = async (empId: string) => {
    try {
      console.log('🔄 Fetching challenge for employee:', empId);
      
      setLoading(true);
      setConnectionStatus('connecting');
      setError('');
      
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
      
      console.log(`📡 Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // Fallback to GET request if POST is not implemented yet
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
            action: 'portal_access'
          });
          
          const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          setQrCodeUrl(qrCodeDataUrl);
          setAuthStep('qr');
        }
        return;
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

    // Check if employee exists (in production, this would be validated by backend)
    const foundEmployee = mockEmployeeDatabase[employeeId.toUpperCase()];
    if (foundEmployee) {
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
  };

  // Simulate wallet scan completion (in production, this would come from backend polling)
  const simulateWalletScan = () => {
    setAuthStep('authenticating');
    setTimeout(() => {
      setAuthStep('success');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          {logoUrl && <img src={logoUrl} alt="Company Logo" className="h-16 mx-auto mb-4" />}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{companyName}</h1>
          <p className="text-gray-600">Employee Portal Access</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {authStep === 'login' && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">Employee Login</h2>
                <p className="text-gray-600 mt-2">Enter your Employee ID to access the portal</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    id="employeeId"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g., EMP001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleEmployeeLogin()}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleEmployeeLogin}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  {loading ? 'Generating QR Code...' : 'Generate QR Code'}
                </button>
              </div>

              {/* Demo Employee IDs */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Demo Employee IDs:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>EMP001 - John Doe (Engineering)</div>
                  <div>EMP002 - Jane Smith (HR)</div>
                  <div>EMP003 - Mike Johnson (Finance)</div>
                </div>
              </div>
            </div>
          )}

          {authStep === 'qr' && employee && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">Scan QR Code</h2>
                <p className="text-gray-600 mt-2">Open your DID Wallet app and scan the code below</p>
              </div>

              {/* Employee Info */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{employee.name}</p>
                    <p className="text-sm text-gray-600">{employee.role} • {employee.department}</p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              {qrCodeUrl ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                    <img src={qrCodeUrl} alt="Authentication QR Code" className="w-64 h-64" />
                  </div>
                  <p className="text-sm text-gray-500 mt-4">QR code expires in 5 minutes</p>
                  
                  {/* For demo purposes - simulate scan button */}
                  <button
                    onClick={simulateWalletScan}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    🧪 Simulate Wallet Scan (Demo)
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Generating QR code...</p>
                </div>
              )}

              <button
                onClick={handleNewLogin}
                className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                ← Back to Login
              </button>
            </div>
          )}

          {authStep === 'authenticating' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Authenticating...</h2>
              <p className="text-gray-600 mt-2">Verifying your DID credentials</p>
            </div>
          )}

          {authStep === 'success' && employee && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Access Granted!</h2>
              <p className="text-gray-600 mt-2">Welcome to the company portal, {employee.name}</p>
              
              <div className="mt-6 space-y-3">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200">
                  Enter Portal Dashboard
                </button>
                <button
                  onClick={handleNewLogin}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Connection Status Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-gray-600">
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
              <span className="text-gray-400">🔐 Secured by DID</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyPortal;
