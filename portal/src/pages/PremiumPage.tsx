import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * PremiumPage Component
 * 
 * Protected premium content page that requires 'premium' access level.
 * Displays exclusive corporate content for users who have proven 
 * Corporate Excellence 2025 NFT ownership via ZK-proof.
 */

interface PremiumContent {
  title: string;
  category: string;
  description: string;
  content: string;
  lastUpdated: string;
  restricted: boolean;
}

interface UserSession {
  authenticated: boolean;
  address: string;
  accessLevel: 'standard' | 'premium';
  premiumGrantedAt?: string;
  tokenExpiresAt?: string;
}

const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [premiumContent, setPremiumContent] = useState<PremiumContent[]>([]);

  // Check authentication and access level on component mount
  useEffect(() => {
    const initializePage = async () => {
      await checkSessionStatus();
      await fetchPremiumContent();
    };
    
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Check current session status and access level
   */
  const checkSessionStatus = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No authentication token found');
        navigate('/');
        return;
      }

      const response = await fetch('http://localhost:3001/api/auth/session-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Session check failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Session verification failed');
      }

      const sessionData = result.data;
      setUserSession(sessionData);

      console.log('✅ Session status verified:', {
        authenticated: sessionData.authenticated,
        accessLevel: sessionData.accessLevel,
        premiumAccess: sessionData.accessLevel === 'premium'
      });

      // Redirect if user doesn't have premium access
      if (sessionData.accessLevel !== 'premium') {
        console.log('❌ Premium access required but user has:', sessionData.accessLevel);
        navigate('/?premium=required');
        return;
      }

    } catch (error: unknown) {
      console.error('❌ Session status check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Redirect to main page on session error
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch premium content from backend
   */
  const fetchPremiumContent = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/premium/content', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPremiumContent(result.data?.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch premium content:', error);
    }
  };

  /**
   * Handle back to dashboard
   */
  const handleBackToDashboard = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Verifying Premium Access
            </h2>
            <p className="text-gray-600">
              Checking your session and access level...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Access Error
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to main page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  🎉 Premium Corporate Content
                </h1>
                <p className="text-purple-100">
                  Exclusive content for Corporate Excellence 2025 NFT holders
                </p>
              </div>
              <button
                onClick={handleBackToDashboard}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>

          {/* Premium Access Status */}
          {userSession && (
            <div className="px-8 py-4 bg-green-50 border-b border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-800 font-semibold">
                    Premium Access Active
                  </p>
                  <p className="text-green-700 text-sm">
                    Verified via Zero-Knowledge Proof •{' '}
                    {userSession.premiumGrantedAt && 
                      `Granted: ${new Date(userSession.premiumGrantedAt).toLocaleString()}`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Premium Content Grid */}
        <div className="grid gap-6">
          {premiumContent.length > 0 ? (
            premiumContent.map((content, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                          {content.category}
                        </span>
                        {content.restricted && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                            🔒 Premium Only
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {content.title}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {content.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="prose prose-gray max-w-none">
                    <div className="text-gray-700 whitespace-pre-line">
                      {content.content}
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Last updated: {new Date(content.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Loading Premium Content...
              </h3>
              <p className="text-gray-600">
                Fetching your exclusive Corporate Excellence 2025 content.
              </p>
            </div>
          )}
        </div>

        {/* Zero-Knowledge Proof Info */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-800 mb-2">
                Zero-Knowledge Privacy Protection
              </h3>
              <p className="text-indigo-700 text-sm leading-relaxed">
                Your access to this premium content was verified using zero-knowledge proof technology. 
                This means you proved ownership of the Corporate Excellence 2025 NFT <strong>without revealing 
                your wallet address or any personal information</strong>. Your privacy and anonymity are 
                completely protected while ensuring only legitimate NFT holders can access this content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
