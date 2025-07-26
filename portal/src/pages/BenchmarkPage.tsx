import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

const API_BASE_URL = 'http://localhost:3001/api';

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
    <div className="benchmark-page">
      <div className="benchmark-header">
        <h1>🧪 Authentication Benchmark Suite</h1>
        <p className="benchmark-description">
          Quantitative performance comparison between DID authentication and traditional OAuth 2.0 SSO
        </p>
        {lastUpdated && (
          <p className="last-updated">Last updated: {lastUpdated}</p>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Task 1: Control Panel */}
      <div className="control-panel">
        <h2>🎮 Control Panel</h2>
        <div className="control-buttons">
          <div className="button-group">
            <h3>DID Authentication Tests</h3>
            <button
              className="btn btn-primary"
              onClick={() => runSingleTest('DID')}
              disabled={loading['single-DID']}
            >
              {loading['single-DID'] ? '⏳ Running...' : '🔐 Run DID Auth Test'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => runMultipleTests('DID', 10)}
              disabled={loading['multiple-DID']}
            >
              {loading['multiple-DID'] ? '⏳ Running...' : '🔐 Run 10x DID Tests'}
            </button>
          </div>

          <div className="button-group">
            <h3>OAuth 2.0 SSO Tests</h3>
            <button
              className="btn btn-primary"
              onClick={() => runSingleTest('OAUTH')}
              disabled={loading['single-OAUTH']}
            >
              {loading['single-OAUTH'] ? '⏳ Running...' : '🌐 Run OAuth SSO Test'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => runMultipleTests('OAUTH', 10)}
              disabled={loading['multiple-OAUTH']}
            >
              {loading['multiple-OAUTH'] ? '⏳ Running...' : '🌐 Run 10x OAuth Tests'}
            </button>
          </div>

          <div className="button-group">
            <h3>Utilities</h3>
            <button className="btn btn-info" onClick={fetchResults}>
              🔄 Refresh Results
            </button>
            <button className="btn btn-danger" onClick={clearResults}>
              🗑️ Clear All Results
            </button>
          </div>
        </div>
      </div>

      {/* Task 3: Performance Dashboard */}
      {summary && (
        <div className="performance-dashboard">
          <h2>📊 Performance Dashboard</h2>
          
          {/* Requirement 2: KPI Cards */}
          <div className="kpi-cards">
            <div className="kpi-card did-card">
              <div className="kpi-header">
                <h3>🔐 DID Authentication</h3>
                <span className="kpi-badge">Decentralized</span>
              </div>
              <div className="kpi-stats">
                <div className="kpi-stat">
                  <span className="kpi-value">{summary.didStats.totalTests}</span>
                  <span className="kpi-label">Total Tests Run</span>
                </div>
                <div className="kpi-stat">
                  <span className="kpi-value">{summary.didStats.failureRate.toFixed(1)}%</span>
                  <span className="kpi-label">Failure Rate</span>
                </div>
                <div className="kpi-stat">
                  <span className="kpi-value">{formatDuration(summary.didStats.averageDuration)}</span>
                  <span className="kpi-label">Avg Duration</span>
                </div>
              </div>
            </div>

            <div className="kpi-card oauth-card">
              <div className="kpi-header">
                <h3>🌐 OAuth 2.0 SSO</h3>
                <span className="kpi-badge">Traditional</span>
              </div>
              <div className="kpi-stats">
                <div className="kpi-stat">
                  <span className="kpi-value">{summary.oauthStats.totalTests}</span>
                  <span className="kpi-label">Total Tests Run</span>
                </div>
                <div className="kpi-stat">
                  <span className="kpi-value">{summary.oauthStats.failureRate.toFixed(1)}%</span>
                  <span className="kpi-label">Failure Rate</span>
                </div>
                <div className="kpi-stat">
                  <span className="kpi-value">{formatDuration(summary.oauthStats.averageDuration)}</span>
                  <span className="kpi-label">Avg Duration</span>
                </div>
              </div>
            </div>
          </div>

          {/* Requirement 1: Bar Chart */}
          <div className="chart-container">
            <h3>📈 Average Authentication Time Comparison</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(3)} ms`,
                    name === 'averageTime' ? 'Average Time' : name
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="averageTime" 
                  fill="#8884d8" 
                  name="Average Authentication Time (ms)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Analysis */}
          <div className="performance-analysis">
            <h3>🎯 Performance Analysis</h3>
            {summary.didStats.totalTests > 0 && summary.oauthStats.totalTests > 0 && (
              <div className="analysis-cards">
                <div className="analysis-card">
                  <h4>Speed Comparison</h4>
                  {summary.didStats.averageDuration < summary.oauthStats.averageDuration ? (
                    <p className="positive">
                      ✅ DID Authentication is <strong>
                        {((summary.oauthStats.averageDuration - summary.didStats.averageDuration) / summary.oauthStats.averageDuration * 100).toFixed(1)}%
                      </strong> faster than OAuth 2.0 SSO
                    </p>
                  ) : (
                    <p className="negative">
                      ⚠️ OAuth 2.0 SSO is <strong>
                        {((summary.didStats.averageDuration - summary.oauthStats.averageDuration) / summary.didStats.averageDuration * 100).toFixed(1)}%
                      </strong> faster than DID Authentication
                    </p>
                  )}
                </div>
                
                <div className="analysis-card">
                  <h4>Reliability Comparison</h4>
                  {summary.didStats.failureRate <= summary.oauthStats.failureRate ? (
                    <p className="positive">
                      ✅ DID Authentication has <strong>{summary.didStats.failureRate.toFixed(1)}%</strong> failure rate
                      vs OAuth's <strong>{summary.oauthStats.failureRate.toFixed(1)}%</strong>
                    </p>
                  ) : (
                    <p className="negative">
                      ⚠️ DID Authentication has higher failure rate: <strong>{summary.didStats.failureRate.toFixed(1)}%</strong>
                      vs OAuth's <strong>{summary.oauthStats.failureRate.toFixed(1)}%</strong>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task 2: Live Results Feed */}
      <div className="results-feed">
        <h2>📋 Live Results Feed</h2>
        <div className="results-table-container">
          {results.length === 0 ? (
            <div className="no-results">
              <p>No benchmark results yet. Run some tests to see data!</p>
            </div>
          ) : (
            <table className="results-table">
              <thead>
                <tr>
                  <th>Test ID</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 50).map((result) => (
                  <tr key={result.id} className={`result-row ${result.status} ${result.type.toLowerCase()}`}>
                    <td className="test-id">{result.id.substring(0, 8)}...</td>
                    <td className="test-type">
                      <span className={`type-badge ${result.type.toLowerCase()}`}>
                        {result.type === 'DID' ? '🔐 DID' : '🌐 OAuth'}
                      </span>
                    </td>
                    <td className="duration">{formatDuration(result.duration)}</td>
                    <td className="status">
                      <span className={`status-badge ${result.status}`}>
                        {result.status === 'success' ? '✅' : '❌'} {result.status}
                      </span>
                    </td>
                    <td className="timestamp">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="details">
                      {result.details && (
                        <div className="details-tooltip">
                          <span className="details-trigger">ℹ️</span>
                          <div className="details-content">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {results.length > 50 && (
          <p className="results-note">
            Showing latest 50 results out of {results.length} total tests
          </p>
        )}
      </div>

      {/* System Information */}
      <div className="system-info">
        <h2>ℹ️ System Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <strong>DID Test Simulation:</strong>
            <p>Challenge generation → Signature creation → Signature verification → JWT token creation</p>
          </div>
          <div className="info-item">
            <strong>OAuth Test Simulation:</strong>
            <p>Authorization redirect (150ms) → User consent (800ms) → Token exchange (400ms) → Profile fetch (250ms)</p>
          </div>
          <div className="info-item">
            <strong>Backend API:</strong>
            <p>http://localhost:3001/api/benchmark</p>
          </div>
          <div className="info-item">
            <strong>Auto-refresh:</strong>
            <p>Results update every 5 seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkPage;
