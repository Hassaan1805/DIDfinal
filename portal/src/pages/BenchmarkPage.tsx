import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  ChartBarIcon,
  BoltIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
  ClockIcon,
  InformationCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

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
  didStats: { totalTests: number; successfulTests: number; failureRate: number; averageDuration: number; };
  oauthStats: { totalTests: number; successfulTests: number; failureRate: number; averageDuration: number; };
}

interface ApiResponse {
  success: boolean;
  data: { results: BenchmarkResult[]; summary: BenchmarkSummary; };
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

  const runSingleTest = async (type: 'DID' | 'OAUTH') => {
    const loadingKey = `single-${type}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/benchmark/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await response.json();
      if (data.success) { await fetchResults(); }
      else { setError(`Failed to run ${type} test: ${data.error}`); }
    } catch (err: any) {
      setError(`Error running ${type} test: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const runMultipleTests = async (type: 'DID' | 'OAUTH', count: number = 10) => {
    const loadingKey = `multiple-${type}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/benchmark/run-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, count }),
      });
      const data = await response.json();
      if (data.success) { await fetchResults(); }
      else { setError(`Failed to run ${count}x ${type} tests: ${data.error}`); }
    } catch (err: any) {
      setError(`Error running ${count}x ${type} tests: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const clearResults = async () => {
    if (!window.confirm('Are you sure you want to clear all benchmark results?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/benchmark/results`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) { setResults([]); setSummary(null); setLastUpdated(new Date().toLocaleTimeString()); }
      else { setError('Failed to clear results'); }
    } catch (err: any) {
      setError(`Error clearing results: ${err.message}`);
    }
  };

  const formatDuration = (duration: number): string => `${duration.toFixed(3)}ms`;

  const chartData = summary ? [
    { name: 'DID Auth', averageTime: summary.didStats.averageDuration, tests: summary.didStats.totalTests, failureRate: summary.didStats.failureRate },
    { name: 'OAuth 2.0', averageTime: summary.oauthStats.averageDuration, tests: summary.oauthStats.totalTests, failureRate: summary.oauthStats.failureRate },
  ] : [];

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{
        height: 54,
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ChartBarIcon style={{ width: 17, height: 17, color: '#60a5fa' }} />
          <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Benchmark Suite</span>
          {lastUpdated && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#334155', fontSize: 11 }}>
              <ClockIcon style={{ width: 11, height: 11 }} />
              Updated {lastUpdated}
            </span>
          )}
        </div>
        <button
          onClick={fetchResults}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, color: '#94a3b8', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <ArrowPathIcon style={{ width: 13, height: 13 }} />
          Refresh
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Title */}
        <div style={{ animation: 'fadeUp 0.35s ease both' }}>
          <h1 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            Authentication Benchmark Suite
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Quantitative performance comparison between DID authentication and traditional OAuth 2.0 SSO
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <XCircleIcon style={{ width: 15, height: 15, color: '#f87171', flexShrink: 0 }} />
              <span style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>
            </div>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Control Panel */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '24px',
          animation: 'fadeUp 0.4s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
            <Cog6ToothIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />
            <h2 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Control Panel</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {/* DID Tests */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LockClosedIcon style={{ width: 13, height: 13, color: '#60a5fa' }} />
                </div>
                <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>DID Authentication</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => runSingleTest('DID')}
                  disabled={loading['single-DID']}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', opacity: loading['single-DID'] ? 0.6 : 1 }}
                >
                  {loading['single-DID'] ? <ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <PlayIcon style={{ width: 14, height: 14 }} />}
                  {loading['single-DID'] ? 'Running...' : 'Run Single Test'}
                </button>
                <button
                  onClick={() => runMultipleTests('DID', 10)}
                  disabled={loading['multiple-DID']}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', opacity: loading['multiple-DID'] ? 0.6 : 1 }}
                >
                  {loading['multiple-DID'] ? <ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <ArrowPathIcon style={{ width: 14, height: 14 }} />}
                  {loading['multiple-DID'] ? 'Running...' : 'Run 10x Tests'}
                </button>
              </div>
            </div>

            {/* OAuth Tests */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GlobeAltIcon style={{ width: 13, height: 13, color: '#34d399' }} />
                </div>
                <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>OAuth 2.0 SSO</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => runSingleTest('OAUTH')}
                  disabled={loading['single-OAUTH']}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px',
                    background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)',
                    borderRadius: 10, color: '#34d399', fontSize: 13, fontWeight: 600, cursor: loading['single-OAUTH'] ? 'not-allowed' : 'pointer',
                    opacity: loading['single-OAUTH'] ? 0.6 : 1,
                  }}
                >
                  {loading['single-OAUTH'] ? <ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <PlayIcon style={{ width: 14, height: 14 }} />}
                  {loading['single-OAUTH'] ? 'Running...' : 'Run Single Test'}
                </button>
                <button
                  onClick={() => runMultipleTests('OAUTH', 10)}
                  disabled={loading['multiple-OAUTH']}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', opacity: loading['multiple-OAUTH'] ? 0.6 : 1 }}
                >
                  {loading['multiple-OAUTH'] ? <ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <ArrowPathIcon style={{ width: 14, height: 14 }} />}
                  {loading['multiple-OAUTH'] ? 'Running...' : 'Run 10x Tests'}
                </button>
              </div>
            </div>

            {/* Utilities */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cog6ToothIcon style={{ width: 13, height: 13, color: '#94a3b8' }} />
                </div>
                <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>Utilities</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={fetchResults}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px' }}
                >
                  <ArrowPathIcon style={{ width: 14, height: 14 }} />
                  Refresh Results
                </button>
                <button
                  onClick={clearResults}
                  className="btn-danger"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px' }}
                >
                  <TrashIcon style={{ width: 14, height: 14 }} />
                  Clear All Results
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Dashboard */}
        {summary && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '24px',
            animation: 'fadeUp 0.45s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <ChartBarIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />
              <h2 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Performance Dashboard</h2>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              {[
                {
                  label: 'DID Authentication',
                  tests: summary.didStats.totalTests,
                  avgDuration: summary.didStats.averageDuration,
                  failureRate: summary.didStats.failureRate,
                  accent: '#60a5fa',
                  bg: 'rgba(37,99,235,0.08)',
                  border: 'rgba(37,99,235,0.18)',
                },
                {
                  label: 'OAuth 2.0 SSO',
                  tests: summary.oauthStats.totalTests,
                  avgDuration: summary.oauthStats.averageDuration,
                  failureRate: summary.oauthStats.failureRate,
                  accent: '#34d399',
                  bg: 'rgba(5,150,105,0.08)',
                  border: 'rgba(5,150,105,0.18)',
                },
              ].map(({ label, tests, avgDuration, failureRate, accent, bg, border }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ color: accent, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{tests}</div>
                      <div style={{ color: '#475569', fontSize: 11 }}>Total Tests</div>
                    </div>
                    <div>
                      <div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'var(--font-mono)' }}>{avgDuration.toFixed(1)}ms</div>
                      <div style={{ color: '#475569', fontSize: 11 }}>Avg Duration</div>
                    </div>
                    <div>
                      <div style={{ color: failureRate > 10 ? '#f87171' : '#34d399', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{failureRate.toFixed(1)}%</div>
                      <div style={{ color: '#475569', fontSize: 11 }}>Failure Rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px' }}>
              <div style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Average Authentication Time (ms)</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" style={{ fontSize: '12px' }} tick={{ fill: '#64748b' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(3)} ms`, 'Average Time']}
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#f1f5f9', fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
                  <Bar dataKey="averageTime" fill="#2563eb" name="Average Auth Time (ms)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison */}
            {summary.didStats.totalTests > 0 && summary.oauthStats.totalTests > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                {/* Speed */}
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <BoltIcon style={{ width: 14, height: 14, color: '#fbbf24' }} />
                    <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Speed Comparison</span>
                  </div>
                  {summary.didStats.averageDuration < summary.oauthStats.averageDuration ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <CheckCircleIcon style={{ width: 14, height: 14, color: '#34d399' }} />
                        <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>DID Authentication Wins</span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                        <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>
                          {((summary.oauthStats.averageDuration - summary.didStats.averageDuration) / summary.oauthStats.averageDuration * 100).toFixed(1)}%
                        </span> faster than OAuth 2.0 SSO
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <CheckCircleIcon style={{ width: 14, height: 14, color: '#fbbf24' }} />
                        <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 600 }}>OAuth 2.0 SSO Wins</span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                        <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>
                          {((summary.didStats.averageDuration - summary.oauthStats.averageDuration) / summary.didStats.averageDuration * 100).toFixed(1)}%
                        </span> faster than DID Authentication
                      </p>
                    </div>
                  )}
                </div>

                {/* Reliability */}
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <CheckCircleIcon style={{ width: 14, height: 14, color: '#60a5fa' }} />
                    <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Reliability Comparison</span>
                  </div>
                  {summary.didStats.failureRate <= summary.oauthStats.failureRate ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <CheckCircleIcon style={{ width: 14, height: 14, color: '#34d399' }} />
                        <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>DID More Reliable</span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                        <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>{summary.didStats.failureRate.toFixed(1)}%</span> failure vs OAuth's {summary.oauthStats.failureRate.toFixed(1)}%
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <XCircleIcon style={{ width: 14, height: 14, color: '#fbbf24' }} />
                        <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 600 }}>Higher DID Failure Rate</span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                        <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>{summary.didStats.failureRate.toFixed(1)}%</span> vs OAuth's {summary.oauthStats.failureRate.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Feed */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          overflow: 'hidden',
          animation: 'fadeUp 0.5s ease both',
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockIcon style={{ width: 15, height: 15, color: '#60a5fa' }} />
            <h2 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Live Results Feed</h2>
            {results.length > 0 && (
              <span style={{ marginLeft: 'auto', color: '#334155', fontSize: 12 }}>{results.length} results</span>
            )}
          </div>

          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 24px' }}>
              <ChartBarIcon style={{ width: 32, height: 32, color: '#334155', margin: '0 auto 14px' }} />
              <p style={{ color: '#475569', fontSize: 14, fontWeight: 500, margin: '0 0 6px' }}>No Results Yet</p>
              <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>Run some tests to see benchmark data appear here</p>
            </div>
          ) : (
            <div style={{ padding: '0 0 4px' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr 1fr 1.5fr 0.5fr', gap: 12, padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Test ID', 'Type', 'Duration', 'Status', 'Timestamp', 'Info'].map((h) => (
                  <span key={h} style={{ color: '#334155', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                ))}
              </div>

              <div style={{ maxHeight: 380, overflowY: 'auto', padding: '4px 0' }}>
                {results.slice(0, 50).map((result) => (
                  <div
                    key={result.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1fr 1.2fr 1fr 1.5fr 0.5fr',
                      gap: 12,
                      padding: '10px 24px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <span style={{ color: '#475569', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{result.id.substring(0, 12)}...</span>
                    <span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '2px 8px',
                        background: result.type === 'DID' ? 'rgba(37,99,235,0.1)' : 'rgba(5,150,105,0.1)',
                        border: `1px solid ${result.type === 'DID' ? 'rgba(37,99,235,0.22)' : 'rgba(5,150,105,0.22)'}`,
                        borderRadius: 99,
                        color: result.type === 'DID' ? '#60a5fa' : '#34d399',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {result.type === 'DID' ? <LockClosedIcon style={{ width: 9, height: 9 }} /> : <GlobeAltIcon style={{ width: 9, height: 9 }} />}
                        {result.type}
                      </span>
                    </span>
                    <span style={{ color: '#f8fafc', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatDuration(result.duration)}</span>
                    <span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 7px',
                        background: result.status === 'success' ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)',
                        border: `1px solid ${result.status === 'success' ? 'rgba(5,150,105,0.22)' : 'rgba(220,38,38,0.22)'}`,
                        borderRadius: 99,
                        color: result.status === 'success' ? '#34d399' : '#f87171',
                        fontSize: 10,
                        fontWeight: 600,
                      }}>
                        {result.status === 'success' ? <CheckCircleIcon style={{ width: 9, height: 9 }} /> : <XCircleIcon style={{ width: 9, height: 9 }} />}
                        {result.status}
                      </span>
                    </span>
                    <span style={{ color: '#475569', fontSize: 12 }}>{new Date(result.timestamp).toLocaleTimeString()}</span>
                    <span>
                      {result.details && (
                        <div style={{ position: 'relative', display: 'inline-block' }}
                          onMouseEnter={e => { const tt = (e.currentTarget as HTMLElement).querySelector('.tooltip') as HTMLElement; if (tt) tt.style.opacity = '1'; }}
                          onMouseLeave={e => { const tt = (e.currentTarget as HTMLElement).querySelector('.tooltip') as HTMLElement; if (tt) tt.style.opacity = '0'; }}
                        >
                          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <InformationCircleIcon style={{ width: 13, height: 13, color: '#475569' }} />
                          </button>
                          <div className="tooltip" style={{
                            position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
                            width: 200, background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8, padding: '8px 12px',
                            color: '#94a3b8', fontSize: 11, lineHeight: 1.6,
                            opacity: 0, transition: 'opacity 0.15s ease',
                            pointerEvents: 'none', zIndex: 10,
                          }}>
                            {result.type === 'DID' ? (
                              <>
                                <div>Challenge: {result.details.challengeGeneration?.toFixed(3)}ms</div>
                                <div>Verification: {result.details.signatureVerification?.toFixed(3)}ms</div>
                                <div>Steps: {result.details.totalSteps}</div>
                              </>
                            ) : (
                              <>
                                <div>Network: {result.details.networkLatency?.toFixed(3)}ms</div>
                                <div>User: {result.details.userInteraction?.toFixed(3)}ms</div>
                                <div>Steps: {result.details.totalSteps}</div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {results.length > 50 && (
                <div style={{ padding: '10px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#475569', fontSize: 12, textAlign: 'center' }}>
                  Showing latest 50 of <span style={{ color: '#94a3b8', fontWeight: 600 }}>{results.length}</span> total results
                </div>
              )}
            </div>
          )}
        </div>

        {/* System Info */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '24px',
          animation: 'fadeUp 0.55s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <InformationCircleIcon style={{ width: 15, height: 15, color: '#60a5fa' }} />
            <h2 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>System Information</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              {
                label: 'DID Test Simulation',
                desc: 'Challenge generation → Signature creation → Signature verification → JWT token creation',
                accent: '#60a5fa', bg: 'rgba(37,99,235,0.06)', border: 'rgba(37,99,235,0.15)',
                Icon: LockClosedIcon,
              },
              {
                label: 'OAuth Test Simulation',
                desc: 'Auth redirect (150ms) → User consent (800ms) → Token exchange (400ms) → Profile fetch (250ms)',
                accent: '#34d399', bg: 'rgba(5,150,105,0.06)', border: 'rgba(5,150,105,0.15)',
                Icon: GlobeAltIcon,
              },
              {
                label: 'Backend API',
                desc: '/api/benchmark',
                accent: '#a78bfa', bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.15)',
                Icon: Cog6ToothIcon,
                mono: true,
              },
              {
                label: 'Auto-refresh',
                desc: 'Results update automatically every 5 seconds',
                accent: '#fbbf24', bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.15)',
                Icon: ArrowPathIcon,
              },
            ].map(({ label, desc, accent, bg, border, Icon, mono }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon style={{ width: 14, height: 14, color: accent }} />
                  <span style={{ color: accent, fontSize: 12, fontWeight: 700 }}>{label}</span>
                </div>
                <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BenchmarkPage;
