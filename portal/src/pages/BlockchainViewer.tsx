import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon,
  LinkIcon,
  CubeTransparentIcon,
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
  BoltIcon,
  DocumentTextIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface BlockchainData {
  contractAddress: string;
  networkInfo: {
    name: string;
    chainId: number;
    blockNumber: number;
  };
  gasStationBalance: string;
  registeredDIDs: Array<{
    address: string;
    did: string;
    publicKey: string;
    txHash: string;
    blockNumber: number;
    timestamp?: string;
  }>;
  recentTransactions: Array<{
    hash: string;
    from: string;
    to: string;
    blockNumber: number;
    gasUsed: string;
    timestamp: string;
    type: 'DID_REGISTRATION' | 'CONTRACT_CALL';
  }>;
  stats: {
    totalDIDs: number;
    totalTransactions: number;
    lastActivity: string;
  };
}

const BlockchainViewer: React.FC = () => {
  const [blockchainData, setBlockchainData] = useState<BlockchainData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'dids' | 'transactions'>('overview');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  const fetchBlockchainData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/blockchain/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch blockchain data');
      setBlockchainData(result.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockchainData();
    const interval = setInterval(fetchBlockchainData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatAddress = (address: string) => `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  const openEtherscan = (hash: string, type: 'tx' | 'address' = 'tx') => {
    const baseUrl = 'https://sepolia.etherscan.io';
    const url = type === 'tx' ? `${baseUrl}/tx/${hash}` : `${baseUrl}/address/${hash}`;
    window.open(url, '_blank');
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 16,
          padding: '32px',
          textAlign: 'center',
        }}>
          <XCircleIcon style={{ width: 36, height: 36, color: '#f87171', margin: '0 auto 16px' }} />
          <h2 style={{ color: '#f8fafc', fontSize: 17, fontWeight: 700, margin: '0 0 10px' }}>Blockchain Connection Error</h2>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>{error}</p>
          <button
            onClick={fetchBlockchainData}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <ArrowPathIcon style={{ width: 15, height: 15 }} />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulseDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
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
          <CubeTransparentIcon style={{ width: 17, height: 17, color: '#60a5fa' }} />
          <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Blockchain Viewer</span>
          <span style={{ color: '#334155', fontSize: 12 }}>/ Sepolia Testnet</span>
        </div>
        <button
          onClick={fetchBlockchainData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: '#94a3b8',
            fontSize: 12,
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <ArrowPathIcon style={{ width: 13, height: 13, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Loading state */}
        {loading && !blockchainData && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 14 }}>
            <ArrowPathIcon style={{ width: 28, height: 28, color: '#334155', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#475569', fontSize: 13 }}>Loading blockchain data...</span>
          </div>
        )}

        {blockchainData && (
          <>
            {/* Tab Navigation */}
            <div className="tab-nav" style={{ marginBottom: 28, display: 'inline-flex' }}>
              <button onClick={() => setSelectedTab('overview')} className={`tab-btn${selectedTab === 'overview' ? ' active' : ''}`}>
                <ChartBarIcon style={{ width: 14, height: 14 }} />
                Overview
              </button>
              <button onClick={() => setSelectedTab('dids')} className={`tab-btn${selectedTab === 'dids' ? ' active' : ''}`}>
                <UsersIcon style={{ width: 14, height: 14 }} />
                Registered DIDs ({blockchainData.registeredDIDs?.length || 0})
              </button>
              <button onClick={() => setSelectedTab('transactions')} className={`tab-btn${selectedTab === 'transactions' ? ' active' : ''}`}>
                <DocumentTextIcon style={{ width: 14, height: 14 }} />
                Transactions ({blockchainData.recentTransactions?.length || 0})
              </button>
            </div>

            {/* Overview */}
            {selectedTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, animation: 'fadeUp 0.35s ease both' }}>
                {/* Network */}
                <div className="stat-card" style={{ borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CubeTransparentIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />
                    </div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Network</span>
                  </div>
                  <div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>
                    {blockchainData.networkInfo.name || 'Sepolia'}
                  </div>
                  <div style={{ color: '#475569', fontSize: 12 }}>Chain ID: {blockchainData.networkInfo.chainId || 11155111}</div>
                  <div style={{ color: '#475569', fontSize: 12 }}>Block #{(blockchainData.networkInfo.blockNumber || 0).toLocaleString()}</div>
                </div>

                {/* Contract */}
                <div className="stat-card" style={{ borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CpuChipIcon style={{ width: 16, height: 16, color: '#a78bfa' }} />
                    </div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Smart Contract</span>
                  </div>
                  <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
                    {formatAddress(blockchainData.contractAddress || '0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48')}
                  </div>
                  <button
                    onClick={() => openEtherscan(blockchainData.contractAddress || '0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48', 'address')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                      borderRadius: 7, color: '#a78bfa', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    <ArrowTopRightOnSquareIcon style={{ width: 11, height: 11 }} />
                    View on Etherscan
                  </button>
                </div>

                {/* Gas Station */}
                <div className="stat-card" style={{ borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BoltIcon style={{ width: 16, height: 16, color: '#34d399' }} />
                      </div>
                      <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gas Station</span>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulseDot 2s ease-in-out infinite' }} />
                  </div>
                  <div style={{ color: '#f8fafc', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {blockchainData.gasStationBalance || '0.0'} ETH
                  </div>
                  <div style={{ color: '#475569', fontSize: 12 }}>Platform wallet balance</div>
                </div>

                {/* Total DIDs */}
                <div className="stat-card" style={{ borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UsersIcon style={{ width: 16, height: 16, color: '#fbbf24' }} />
                    </div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Registered DIDs</span>
                  </div>
                  <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {blockchainData.stats.totalDIDs || 0}
                  </div>
                  <div style={{ color: '#475569', fontSize: 12 }}>Total identities on-chain</div>
                </div>

                {/* Transactions */}
                <div className="stat-card" style={{ borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DocumentTextIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />
                    </div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transactions</span>
                  </div>
                  <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {blockchainData.stats.totalTransactions || 0}
                  </div>
                  <div style={{ color: '#475569', fontSize: 12 }}>Total blockchain operations</div>
                </div>

                {/* Last Activity */}
                <div className="stat-card" style={{ borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ClockIcon style={{ width: 16, height: 16, color: '#94a3b8' }} />
                      </div>
                      <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Activity</span>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: 'pulseDot 2s ease-in-out infinite' }} />
                  </div>
                  <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 500, lineHeight: 1.5, marginBottom: 4 }}>
                    {blockchainData.stats.lastActivity || 'No recent activity'}
                  </div>
                  <div style={{ color: '#475569', fontSize: 12 }}>Most recent operation</div>
                </div>
              </div>
            )}

            {/* DIDs */}
            {selectedTab === 'dids' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.35s ease both' }}>
                {blockchainData.registeredDIDs?.length ? (
                  blockchainData.registeredDIDs.map((did, index) => (
                    <div key={index} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 14,
                      padding: '20px 22px',
                      transition: 'border-color 0.2s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                          <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{did.did}</div>
                          <div style={{ color: '#475569', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{did.address}</div>
                        </div>
                        <span style={{
                          padding: '3px 10px',
                          background: 'rgba(37,99,235,0.1)',
                          border: '1px solid rgba(37,99,235,0.2)',
                          borderRadius: 99,
                          color: '#60a5fa',
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          Block #{did.blockNumber}
                        </span>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ color: '#334155', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Public Key</div>
                        <div style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: '#64748b',
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          wordBreak: 'break-all',
                        }}>
                          {did.publicKey}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#475569', fontSize: 12 }}>{did.timestamp || 'Recently registered'}</span>
                        <button
                          onClick={() => openEtherscan(did.txHash)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px',
                            background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                            borderRadius: 8, color: '#60a5fa', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          }}
                        >
                          <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
                          View Transaction
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                    <UsersIcon style={{ width: 36, height: 36, color: '#334155', margin: '0 auto 14px' }} />
                    <p style={{ color: '#475569', fontSize: 14, fontWeight: 500, margin: '0 0 6px' }}>No DIDs registered yet</p>
                    <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>DIDs will appear here when users authenticate with the mobile app</p>
                  </div>
                )}
              </div>
            )}

            {/* Transactions */}
            {selectedTab === 'transactions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.35s ease both' }}>
                {blockchainData.recentTransactions?.length ? (
                  blockchainData.recentTransactions.map((tx, index) => (
                    <div key={index} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 14,
                      padding: '18px 22px',
                      transition: 'border-color 0.2s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            padding: '3px 10px',
                            background: tx.type === 'DID_REGISTRATION' ? 'rgba(37,99,235,0.1)' : 'rgba(100,116,139,0.1)',
                            border: `1px solid ${tx.type === 'DID_REGISTRATION' ? 'rgba(37,99,235,0.22)' : 'rgba(100,116,139,0.22)'}`,
                            borderRadius: 99,
                            color: tx.type === 'DID_REGISTRATION' ? '#60a5fa' : '#94a3b8',
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            {tx.type.replace('_', ' ')}
                          </span>
                          <span style={{ color: '#475569', fontSize: 12 }}>Block #{tx.blockNumber}</span>
                        </div>
                        <button
                          onClick={() => openEtherscan(tx.hash)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px',
                            background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)',
                            borderRadius: 7, color: '#60a5fa', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          }}
                        >
                          <ArrowTopRightOnSquareIcon style={{ width: 11, height: 11 }} />
                          View
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                        {[
                          { label: 'Hash', value: formatAddress(tx.hash), mono: true },
                          { label: 'Gas Used', value: parseInt(tx.gasUsed).toLocaleString(), mono: false },
                          { label: 'From', value: formatAddress(tx.from), mono: true },
                          { label: 'Timestamp', value: tx.timestamp, mono: false },
                        ].map(({ label, value, mono }) => (
                          <div key={label}>
                            <div style={{ color: '#334155', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                            <div style={{ color: '#94a3b8', fontSize: 12, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)' }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                    <DocumentTextIcon style={{ width: 36, height: 36, color: '#334155', margin: '0 auto 14px' }} />
                    <p style={{ color: '#475569', fontSize: 14, fontWeight: 500, margin: '0 0 6px' }}>No recent transactions</p>
                    <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>Blockchain transactions will appear here</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!loading && !blockchainData && !error && (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <CubeTransparentIcon style={{ width: 36, height: 36, color: '#334155', margin: '0 auto 14px' }} />
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>No blockchain data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainViewer;
