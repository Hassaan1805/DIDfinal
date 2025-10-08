import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { 
  ShieldCheckIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';

interface ChallengeData {
  challengeId: string;
  challenge: string;
  expiresIn: number;
  qrCodeData: string;
}

interface AuthStatus {
  challengeId: string;
  status: 'pending' | 'completed';
  expiresAt: number;
  token?: string;
  did?: string;
  userAddress?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [qrCodeData, setQrCodeData] = useState<string>('');
  // const [challengeId, setChallengeId] = useState<string>(''); // Removed unused variable
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [authStatus, setAuthStatus] = useState<'pending' | 'completed' | 'expired'>('pending');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  // Cleanup intervals on component unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Fetch challenge on component mount
  useEffect(() => {
    const initializeChallenge = async () => {
      await fetchChallenge();
    };
    initializeChallenge();
  }, []);

  const fetchChallenge = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/auth/challenge`);
      const result: ApiResponse<ChallengeData> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate challenge');
      }

      const { challengeId, qrCodeData, expiresIn } = result.data;
      
      setQrCodeData(qrCodeData);
      // setChallengeId(challengeId); // Removed since challengeId state is not used
      setTimeRemaining(expiresIn);
      setAuthStatus('pending');
      
      // Start polling for authentication status
      startPolling(challengeId);
      
      // Start countdown timer
      startCountdown();
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Challenge fetch error:', err);
      setError(errorMessage || 'Failed to generate QR code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = (challengeId: string) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/status/${challengeId}`);
        const result: ApiResponse<AuthStatus> = await response.json();

        if (!response.ok || !result.success || !result.data) {
          console.warn('Status check failed:', result.error);
          return;
        }

        const { status, token, did, userAddress } = result.data;

        if (status === 'completed' && token) {
          // Authentication successful!
          setAuthStatus('completed');
          
          // Store JWT token securely
          localStorage.setItem('authToken', token);
          localStorage.setItem('userDID', did || '');
          localStorage.setItem('userAddress', userAddress || '');
          
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // Stop countdown
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          // Show success message briefly, then redirect
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        }

      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  const startCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
        if (newTime <= 0) {
          // Challenge expired
          setAuthStatus('expired');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    fetchChallenge();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating QR Code</h2>
            <p className="text-gray-600">Please wait while we prepare your login code...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Login Successful!</h2>
            <p className="text-gray-600 mb-4">Welcome to the Decentralized Trust Platform</p>
            <div className="flex items-center justify-center">
              <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin mr-2" />
              <span className="text-blue-600 font-semibold">Redirecting to dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Code Expired</h2>
            <p className="text-gray-600 mb-6">The QR code has expired. Please generate a new one to continue.</p>
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
            >
              Generate New QR Code
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
          <div className="flex items-center justify-center mb-2">
            <ShieldCheckIcon className="h-8 w-8 mr-3" />
            <h1 className="text-2xl font-bold">Secure Login</h1>
          </div>
          <p className="text-blue-100 text-center text-sm">
            Decentralized Trust Platform
          </p>
        </div>

        {/* QR Code Section */}
        <div className="p-8">
          <div className="text-center mb-6">
            <QrCodeIcon className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Scan to Login
            </h2>
            <p className="text-gray-600 text-sm">
              Use your DID Wallet app to scan this QR code and authenticate securely
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-inner">
              <QRCode
                value={qrCodeData}
                size={200}
                level="M"
                includeMargin={true}
                className="block"
              />
            </div>
          </div>

          {/* Status and Timer */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-sm text-gray-600 ml-3">Waiting for scan...</span>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-500">Expires in</div>
                <div className="text-lg font-bold text-gray-900 font-mono">
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <QrCodeIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">How to Login</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open your DID Wallet mobile app</li>
                      <li>Tap "Scan to Login" or the QR scanner</li>
                      <li>Point your camera at the QR code above</li>
                      <li>Confirm the login request in your wallet</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleRetry}
              className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition duration-200 text-sm"
            >
              Generate New QR Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
