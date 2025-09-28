import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ModernCard, StatsCard } from '../components/ModernCard';
import './BenchmarkPage.css';

// Types for API responses
interface BenchmarkResult {
  id: string;
  type: 'DID' | 'OAUTH';
  duration: number;
  status: 'success' | 'failed';
  timestamp: string;
  details?: {
    challengeGeneration?: number;
    signatureVerification?: number;
    totalSteps?: number;
    networkLatency?: number;
    userInteraction?: number;
  };
}

interface BenchmarkSummary {
  totalTests: number;
  didStats: {
    totalTests: number;
    successfulTests: number;
    failureRate: number;
    averageDuration: number;
  };
  oauthStats: {
    totalTests: number;
    successfulTests: number;
    failureRate: number;
    averageDuration: number;
  };
}

interface ApiResponse {
  success: boolean;
  data: {
    results: BenchmarkResult[];
    summary: BenchmarkSummary;
  };
  message: string;
  timestamp: string;
}

const API_BASE_URL = '/api';

const BenchmarkPage: React.FC = () => {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch all benchmark results
  const fetchResults = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/benchmark/results`);
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setResults(data.data.results);
        setSummary(data.data.summary);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setError('Failed to fetch benchmark results');
      }
    } catch (err: any) {
      setError(`Error fetching results: ${err.message}`);
    }
  };

  // Run a single benchmark test
  const runSingleTest = async (type: 'DID' | 'OAUTH') => {
    const loadingKey = `single-${type}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/benchmark/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh results to show the new test
        await fetchResults();
      } else {
        setError(`Failed to run ${type} test: ${data.error}`);
      }
    } catch (err: any) {
      setError(`Error running ${type} test: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Run multiple benchmark tests
  const runMultipleTests = async (type: 'DID' | 'OAUTH', count: number = 10) => {
    const loadingKey = `multiple-${type}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/benchmark/run-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, count }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh results to show the new tests
        await fetchResults();
      } else {
        setError(`Failed to run ${count}x ${type} tests: ${data.error}`);
      }
    } catch (err: any) {
      setError(`Error running ${count}x ${type} tests: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Clear all results
  const clearResults = async () => {
    if (!window.confirm('Are you sure you want to clear all benchmark results?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/benchmark/results`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResults([]);
        setSummary(null);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setError('Failed to clear results');
      }
    } catch (err: any) {
      setError(`Error clearing results: ${err.message}`);
    }
  };

  // Format duration for display
  const formatDuration = (duration: number): string => {
    return `${duration.toFixed(3)}ms`;
  };

  // Prepare chart data
  const chartData = summary ? [
    {
      name: 'DID Authentication',
      averageTime: summary.didStats.averageDuration,
      tests: summary.didStats.totalTests,
      failureRate: summary.didStats.failureRate,
    },
    {
      name: 'OAuth 2.0 SSO',
      averageTime: summary.oauthStats.averageDuration,
      tests: summary.oauthStats.totalTests,
      failureRate: summary.oauthStats.failureRate,
    },
  ] : [];

  // Auto-refresh results every 5 seconds
  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-100/40 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Enhanced Header */}
        <ModernCard className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 px-8 py-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c6-6 30-6 30 0s-24 6-30 0'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
            </div>
            
            <div className="relative text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Authentication Benchmark Suite</h1>
              <p className="text-blue-100 text-xl font-medium mb-6">
                Quantitative performance comparison between DID authentication and traditional OAuth 2.0 SSO
              </p>
              
              {lastUpdated && (
                <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full inline-flex items-center space-x-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-white font-medium">Last updated: {lastUpdated}</span>
                </div>
              )}
            </div>
          </div>
        </ModernCard>

        {error && (
          <ModernCard className="border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-pink-50">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-red-700 font-medium text-lg">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="w-8 h-8 bg-red-200 hover:bg-red-300 text-red-700 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                ✕
              </button>
            </div>
          </ModernCard>
        )}

        {/* Enhanced Control Panel */}
        <ModernCard className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-700 px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Control Panel</h2>
                <p className="text-emerald-100 text-lg font-medium">Execute benchmarks and analyze performance</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* DID Authentication Tests */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span>DID Authentication</span>
                </h3>
                
                <button
                  onClick={() => runSingleTest('DID')}
                  disabled={loading['single-DID']}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-3"
                >
                  {loading['single-DID'] ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Run Single Test</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => runMultipleTests('DID', 10)}
                  disabled={loading['multiple-DID']}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-3"
                >
                  {loading['multiple-DID'] ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Run 10x Tests</span>
                    </>
                  )}
                </button>
              </div>

              {/* OAuth 2.0 SSO Tests */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <span>OAuth 2.0 SSO</span>
                </h3>
                
                <button
                  onClick={() => runSingleTest('OAUTH')}
                  disabled={loading['single-OAUTH']}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-3"
                >
                  {loading['single-OAUTH'] ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Run Single Test</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => runMultipleTests('OAUTH', 10)}
                  disabled={loading['multiple-OAUTH']}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-3"
                >
                  {loading['multiple-OAUTH'] ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Run 10x Tests</span>
                    </>
                  )}
                </button>
              </div>

              {/* Utilities */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                  </div>
                  <span>Utilities</span>
                </h3>
                
                <button
                  onClick={fetchResults}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh Results</span>
                </button>
                
                <button
                  onClick={clearResults}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-700 hover:from-red-700 hover:to-pink-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear All Results</span>
                </button>
              </div>
            </div>
          </div>
        </ModernCard>

        {/* Enhanced Performance Dashboard */}
        {summary && (
          <ModernCard className="overflow-hidden border-0 shadow-xl">
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 px-8 py-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Performance Dashboard</h2>
                  <p className="text-orange-100 text-lg font-medium">Real-time analytics and comparison metrics</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Enhanced KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatsCard
                  title="DID Authentication"
                  subtitle="Decentralized Identity"
                  value={summary.didStats.totalTests.toString()}
                  label="Tests Run"
                  gradient="from-blue-500 to-indigo-600"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                  additionalStats={[
                    { label: 'Failure Rate', value: `${summary.didStats.failureRate.toFixed(1)}%` },
                    { label: 'Avg Duration', value: formatDuration(summary.didStats.averageDuration) }
                  ]}
                />

                <StatsCard
                  title="OAuth 2.0 SSO"
                  subtitle="Traditional Authentication"
                  value={summary.oauthStats.totalTests.toString()}
                  label="Tests Run"
                  gradient="from-green-500 to-emerald-600"
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  }
                  additionalStats={[
                    { label: 'Failure Rate', value: `${summary.oauthStats.failureRate.toFixed(1)}%` },
                    { label: 'Avg Duration', value: formatDuration(summary.oauthStats.averageDuration) }
                  ]}
                />
              </div>

              {/* Enhanced Chart */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-2xl p-8 border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span>Average Authentication Time Comparison</span>
                </h3>
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" style={{ fontSize: '14px', fontWeight: '500' }} />
                      <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} style={{ fontSize: '12px' }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(3)} ms`,
                          name === 'averageTime' ? 'Average Time' : name
                        ]}
                        labelFormatter={(label) => `${label}`}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="averageTime" 
                        fill="url(#gradient1)" 
                        name="Average Authentication Time (ms)"
                        radius={[8, 8, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Enhanced Performance Analysis */}
              {summary.didStats.totalTests > 0 && summary.oauthStats.totalTests > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ModernCard className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-blue-800 mb-4 flex items-center space-x-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Speed Comparison</span>
                      </h4>
                      {summary.didStats.averageDuration < summary.oauthStats.averageDuration ? (
                        <div className="bg-green-100 border border-green-300 rounded-xl p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-green-800 font-bold text-lg">DID Authentication Wins!</span>
                          </div>
                          <p className="text-green-700 font-medium">
                            <span className="text-2xl font-bold">
                              {((summary.oauthStats.averageDuration - summary.didStats.averageDuration) / summary.oauthStats.averageDuration * 100).toFixed(1)}%
                            </span> faster than OAuth 2.0 SSO
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-100 border border-amber-300 rounded-xl p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-amber-800 font-bold text-lg">OAuth 2.0 SSO Wins</span>
                          </div>
                          <p className="text-amber-700 font-medium">
                            <span className="text-2xl font-bold">
                              {((summary.didStats.averageDuration - summary.oauthStats.averageDuration) / summary.didStats.averageDuration * 100).toFixed(1)}%
                            </span> faster than DID Authentication
                          </p>
                        </div>
                      )}
                    </div>
                  </ModernCard>
                  
                  <ModernCard className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-purple-800 mb-4 flex items-center space-x-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Reliability Comparison</span>
                      </h4>
                      {summary.didStats.failureRate <= summary.oauthStats.failureRate ? (
                        <div className="bg-green-100 border border-green-300 rounded-xl p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-green-800 font-bold text-lg">DID More Reliable!</span>
                          </div>
                          <p className="text-green-700 font-medium">
                            <span className="text-2xl font-bold">{summary.didStats.failureRate.toFixed(1)}%</span> failure rate
                            vs OAuth's <span className="text-xl font-bold">{summary.oauthStats.failureRate.toFixed(1)}%</span>
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-100 border border-amber-300 rounded-xl p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-amber-800 font-bold text-lg">Higher DID Failure Rate</span>
                          </div>
                          <p className="text-amber-700 font-medium">
                            <span className="text-2xl font-bold">{summary.didStats.failureRate.toFixed(1)}%</span> vs OAuth's
                            <span className="text-xl font-bold"> {summary.oauthStats.failureRate.toFixed(1)}%</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </ModernCard>
                </div>
              )}
            </div>
          </ModernCard>
        )}

        {/* Enhanced Results Feed */}
        <ModernCard className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-700 px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Live Results Feed</h2>
                <p className="text-cyan-100 text-lg font-medium">Real-time benchmark test results</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {results.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-600 mb-3">No Results Yet</h3>
                <p className="text-gray-500 text-lg">Run some tests to see benchmark data appear here!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-6 border border-gray-200">
                  <div className="grid grid-cols-6 gap-4 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <div>Test ID</div>
                    <div>Type</div>
                    <div>Duration</div>
                    <div>Status</div>
                    <div>Timestamp</div>
                    <div>Details</div>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {results.slice(0, 50).map((result) => (
                    <div
                      key={result.id}
                      className={`grid grid-cols-6 gap-4 p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.01] ${
                        result.status === 'success'
                          ? result.type === 'DID'
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300'
                            : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300'
                          : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:border-red-300'
                      }`}
                    >
                      <div className="font-mono text-sm text-gray-600">
                        {result.id.substring(0, 8)}...
                      </div>
                      
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          result.type === 'DID'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {result.type === 'DID' ? (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              DID
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                              OAuth
                            </>
                          )}
                        </span>
                      </div>
                      
                      <div className="font-mono text-sm font-bold text-gray-800">
                        {formatDuration(result.duration)}
                      </div>
                      
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          result.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.status === 'success' ? '✅' : '❌'} {result.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                      
                      <div>
                        {result.details && (
                          <div className="relative group">
                            <button className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors duration-200">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                              {result.type === 'DID' ? (
                                <>
                                  <p>Challenge: {result.details.challengeGeneration?.toFixed(3)}ms</p>
                                  <p>Verification: {result.details.signatureVerification?.toFixed(3)}ms</p>
                                  <p>Steps: {result.details.totalSteps}</p>
                                </>
                              ) : (
                                <>
                                  <p>Network: {result.details.networkLatency?.toFixed(3)}ms</p>
                                  <p>User Interaction: {result.details.userInteraction?.toFixed(3)}ms</p>
                                  <p>Steps: {result.details.totalSteps}</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {results.length > 50 && (
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <p className="text-blue-700 font-medium">
                      Showing latest 50 results out of <span className="font-bold">{results.length}</span> total tests
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModernCard>

        {/* Enhanced System Information */}
        <ModernCard className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-gray-700 via-gray-800 to-black px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">System Information</h2>
                <p className="text-gray-300 text-lg font-medium">Technical details and configuration</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center space-x-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>DID Test Simulation</span>
                </h3>
                <p className="text-blue-700 leading-relaxed">
                  Challenge generation → Signature creation → Signature verification → JWT token creation
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center space-x-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span>OAuth Test Simulation</span>
                </h3>
                <p className="text-green-700 leading-relaxed">
                  Authorization redirect (150ms) → User consent (800ms) → Token exchange (400ms) → Profile fetch (250ms)
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center space-x-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Backend API</span>
                </h3>
                <p className="text-purple-700 leading-relaxed font-mono text-sm">
                  /api/benchmark
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center space-x-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Auto-refresh</span>
                </h3>
                <p className="text-amber-700 leading-relaxed">
                  Results update automatically every 5 seconds
                </p>
              </div>
            </div>
          </div>
        </ModernCard>

      </div>
    </div>
  );
};

export default BenchmarkPage;
