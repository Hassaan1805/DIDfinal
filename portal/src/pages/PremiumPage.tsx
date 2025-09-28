import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernCard, StatsCard } from '../components/ModernCard';

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

      const response = await fetch('/api/auth/session-status', {
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

      const response = await fetch('/api/premium/content', {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-100/40 flex items-center justify-center p-6">
        <ModernCard className="max-w-md border-0 shadow-2xl">
          <div className="p-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Verifying Premium Access
            </h2>
            <p className="text-gray-600 text-lg">
              Checking your session and access level...
            </p>
          </div>
        </ModernCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50/30 to-pink-100/40 flex items-center justify-center p-6">
        <ModernCard className="max-w-md border-0 shadow-2xl">
          <div className="p-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Access Error
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              {error}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to main page...
            </p>
          </div>
        </ModernCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-100/40">
      {/* Enhanced Header */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium mb-6">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Premium Access Verified
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                🎉 Premium Corporate Content
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl leading-relaxed">
                Exclusive content for Corporate Excellence 2025 NFT holders
              </p>
            </div>
            <button
              onClick={handleBackToDashboard}
              className="group bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-4 rounded-2xl transition-all duration-300 flex items-center space-x-3 border border-white/30 hover:border-white/50 hover:scale-105"
            >
              <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-lg font-medium">Back to Dashboard</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-10 relative z-10">
        {/* Premium Access Status */}
        {userSession && (
          <ModernCard className="mb-12 border-0 shadow-2xl overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10"></div>
              <div className="relative p-8">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Premium Access Active
                    </h2>
                    <p className="text-lg text-gray-600">
                      Verified via Zero-Knowledge Proof •{' '}
                      {userSession.premiumGrantedAt && 
                        `Granted: ${new Date(userSession.premiumGrantedAt).toLocaleString()}`
                      }
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-green-400 to-emerald-500 text-white">
                      ✓ ZK Verified
                    </span>
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-400 to-indigo-500 text-white">
                      ✓ Premium Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ModernCard>
        )}

        {/* Premium Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard
            title="Premium Content"
            value={premiumContent.length.toString()}
            subtitle="Articles Available"
            trend={{ value: 25, isPositive: true }}
            icon="📄"
            color="blue"
          />
          <StatsCard
            title="Access Level"
            value="Premium"
            subtitle="ZK Verified"
            trend={{ value: 100, isPositive: true }}
            icon="🔐"
            color="green"
          />
          <StatsCard
            title="ZK Proofs"
            value="Valid"
            subtitle="Cryptographically Secure"
            trend={{ value: 99, isPositive: true }}
            icon="✅"
            color="purple"
          />
          <StatsCard
            title="Session Status"
            value="Active"
            subtitle="Privacy Protected"
            trend={{ value: 100, isPositive: true }}
            icon="🛡️"
            color="orange"
          />
        </div>

        {/* Premium Content Grid */}
        <div className="space-y-8">
          {premiumContent.length > 0 ? (
            premiumContent.map((content, index) => (
              <ModernCard key={index} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-blue-500/5 group-hover:from-indigo-500/10 group-hover:via-purple-500/10 group-hover:to-blue-500/10 transition-all duration-500"></div>
                  <div className="relative p-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-4">
                          <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg">
                            {content.category}
                          </span>
                          {content.restricted && (
                            <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-sm font-semibold rounded-full shadow-lg">
                              🔒 Premium Only
                            </span>
                          )}
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-indigo-700 transition-colors duration-300">
                          {content.title}
                        </h3>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                          {content.description}
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center ml-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="prose prose-lg prose-gray max-w-none">
                      <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {content.content}
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Last updated: {new Date(content.lastUpdated).toLocaleDateString()}
                        </p>
                        <div className="flex items-center text-indigo-600 font-medium group-hover:text-indigo-700 cursor-pointer">
                          <span>Read More</span>
                          <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ModernCard>
            ))
          ) : (
            <ModernCard className="border-0 shadow-xl">
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Loading Premium Content...
                </h3>
                <p className="text-lg text-gray-600">
                  Fetching your exclusive Corporate Excellence 2025 content.
                </p>
              </div>
            </ModernCard>
          )}
        </div>

        {/* Zero-Knowledge Proof Info */}
        <ModernCard className="mt-12 border-0 shadow-xl overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10"></div>
            <div className="relative p-10">
              <div className="flex items-start space-x-6">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Zero-Knowledge Privacy Protection
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Your access to this premium content was verified using zero-knowledge proof technology. 
                    This means you proved ownership of the Corporate Excellence 2025 NFT <strong className="text-gray-800">without revealing 
                    your wallet address or any personal information</strong>. Your privacy and anonymity are 
                    completely protected while ensuring only legitimate NFT holders can access this content.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-6">
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-green-400 to-emerald-500 text-white">
                      ✓ Privacy Protected
                    </span>
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-400 to-indigo-500 text-white">
                      ✓ Zero-Knowledge
                    </span>
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-400 to-pink-500 text-white">
                      ✓ Cryptographically Secure
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModernCard>
      </div>
    </div>
  );
};

export default PremiumPage;
