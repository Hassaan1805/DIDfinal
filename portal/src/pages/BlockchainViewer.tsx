import React, { useState, useEffect } from 'react';

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
      console.log('🔗 Fetching blockchain data...');
      
      const response = await fetch(`${API_BASE_URL}/blockchain/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch blockchain data');
      }

      setBlockchainData(result.data);
      console.log('✅ Blockchain data loaded:', result.data);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Blockchain data fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockchainData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBlockchainData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const openEtherscan = (hash: string, type: 'tx' | 'address' = 'tx') => {
    const baseUrl = 'https://sepolia.etherscan.io';
    const url = type === 'tx' ? `${baseUrl}/tx/${hash}` : `${baseUrl}/address/${hash}`;
    window.open(url, '_blank');
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Blockchain Connection Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchBlockchainData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔗 Blockchain Data Viewer</h1>
          <p className="text-gray-600 mt-2">
            Live view of DID registrations and transactions on Sepolia testnet
          </p>
        </div>
        <button
          onClick={fetchBlockchainData}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <span>{loading ? '🔄' : '↻'}</span>
          <span>{loading ? 'Loading...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'dids', label: '👥 Registered DIDs' },
            { id: 'transactions', label: '📋 Transactions' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSelectedTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading && !blockchainData ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-4xl mb-4">🔄</div>
              <span className="text-gray-600">Loading blockchain data...</span>
            </div>
          </div>
        ) : blockchainData ? (
          <>
            {selectedTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Network Info */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-blue-800">🌐 Network</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {blockchainData.networkInfo.name || 'Sepolia'}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Chain ID: {blockchainData.networkInfo.chainId || 11155111}
                  </p>
                  <p className="text-xs text-blue-600">
                    Block: #{blockchainData.networkInfo.blockNumber.toLocaleString() || '0'}
                  </p>
                </div>

                {/* Contract Info */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-purple-800">📄 Smart Contract</h3>
                  </div>
                  <div className="text-lg font-bold text-purple-900 break-all">
                    {formatAddress(blockchainData.contractAddress || '0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48')}
                  </div>
                  <button
                    className="mt-2 text-purple-600 border border-purple-200 px-3 py-1 rounded text-sm hover:bg-purple-50"
                    onClick={() => openEtherscan(blockchainData.contractAddress || '0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48', 'address')}
                  >
                    🔗 View on Etherscan
                  </button>
                </div>

                {/* Gas Station Balance */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-green-800">⛽ Gas Station</h3>
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {blockchainData.gasStationBalance || '0.0'} ETH
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Platform wallet balance
                  </p>
                </div>

                {/* Stats */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-orange-800">👥 Registered DIDs</h3>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {blockchainData.stats.totalDIDs || 0}
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    Total identities on-chain
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-teal-800">📋 Transactions</h3>
                  </div>
                  <div className="text-2xl font-bold text-teal-900">
                    {blockchainData.stats.totalTransactions || 0}
                  </div>
                  <p className="text-xs text-teal-600 mt-1">
                    Total blockchain operations
                  </p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-indigo-800">🕒 Last Activity</h3>
                    <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
                  </div>
                  <div className="text-sm font-medium text-indigo-900">
                    {blockchainData.stats.lastActivity || 'No recent activity'}
                  </div>
                  <p className="text-xs text-indigo-600 mt-1">
                    Most recent blockchain operation
                  </p>
                </div>
              </div>
            )}

            {selectedTab === 'dids' && (
              <div className="space-y-4">
                {blockchainData.registeredDIDs?.length ? (
                  blockchainData.registeredDIDs.map((did, index) => (
                    <div key={index} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold">{did.did}</h3>
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                          Block #{did.blockNumber}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4">
                        Ethereum Address: {did.address}
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Public Key:</label>
                          <p className="text-sm font-mono bg-gray-50 p-2 rounded break-all mt-1">
                            {did.publicKey}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {did.timestamp || 'Recently registered'}
                          </span>
                          <button
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            onClick={() => openEtherscan(did.txHash)}
                          >
                            🔗 View Transaction
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-gray-600">No DIDs registered yet</p>
                    <p className="text-sm text-gray-400 mt-2">
                      DIDs will appear here when users authenticate with the mobile app
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'transactions' && (
              <div className="space-y-4">
                {blockchainData.recentTransactions?.length ? (
                  blockchainData.recentTransactions.map((tx, index) => (
                    <div key={index} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            tx.type === 'DID_REGISTRATION' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-600">
                            Block #{tx.blockNumber}
                          </span>
                        </div>
                        <button
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          onClick={() => openEtherscan(tx.hash)}
                        >
                          🔗 View
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="font-medium text-gray-600">Hash:</label>
                          <p className="font-mono">{formatAddress(tx.hash)}</p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-600">Gas Used:</label>
                          <p>{parseInt(tx.gasUsed).toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-600">From:</label>
                          <p className="font-mono">{formatAddress(tx.from)}</p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-600">Timestamp:</label>
                          <p>{tx.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-gray-600">No recent transactions</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Blockchain transactions will appear here
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔗</div>
            <p className="text-gray-600">No blockchain data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainViewer;