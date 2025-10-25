import React, { useState } from 'react';

interface ZKProofSectionProps {
  FLASK_API_URL: string;
}

const ZKProofSection: React.FC<ZKProofSectionProps> = ({ FLASK_API_URL }) => {
  const [activeProofTab, setActiveProofTab] = useState<'ownership' | 'attribute' | 'selective' | 'batch'>('ownership');
  
  // Ownership Proof States
  const [ownershipSerialNumber, setOwnershipSerialNumber] = useState('');
  const [ownerSecret, setOwnerSecret] = useState('');
  const [proofId, setProofId] = useState('');
  const [ownershipResult, setOwnershipResult] = useState<any>(null);
  const [ownershipLoading, setOwnershipLoading] = useState(false);
  
  // Attribute Proof States
  const [attrSerialNumber, setAttrSerialNumber] = useState('');
  const [attribute, setAttribute] = useState('completion_date');
  const [predicateType, setPredicateType] = useState('greater_than');
  const [predicateValue, setPredicateValue] = useState('');
  const [attrResult, setAttrResult] = useState<any>(null);
  const [attrLoading, setAttrLoading] = useState(false);
  
  // Selective Disclosure States
  const [selectiveSerialNumber, setSelectiveSerialNumber] = useState('');
  const [selectiveSecret, setSelectiveSecret] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [selectiveResult, setSelectiveResult] = useState<any>(null);
  const [selectiveLoading, setSelectiveLoading] = useState(false);
  
  // Batch Verify States
  const [batchProofIds, setBatchProofIds] = useState('');
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const availableAttributes = [
    'name', 'organization', 'issue_date', 'expiry_date', 
    'completion_date', 'issuer', 'serial_number'
  ];

  // Ownership Proof Handlers
  const handleGenerateOwnershipProof = async () => {
    setOwnershipLoading(true);
    setOwnershipResult(null);

    try {
      const response = await fetch(`${FLASK_API_URL}/zk/generate_ownership_proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: ownershipSerialNumber,
          owner_secret: ownerSecret
        })
      });

      const data = await response.json();
      if (response.ok) {
        setProofId(data.proof_id);
        setOwnershipResult({ ...data, type: 'generate' });
      } else {
        setOwnershipResult({ error: data.error, type: 'generate' });
      }
    } catch (error: any) {
      setOwnershipResult({ error: error.message, type: 'generate' });
    } finally {
      setOwnershipLoading(false);
    }
  };

  const handleVerifyOwnershipProof = async () => {
    setOwnershipLoading(true);
    setOwnershipResult(null);

    try {
      const response = await fetch(`${FLASK_API_URL}/zk/verify_ownership_proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof_id: proofId,
          serial_number: ownershipSerialNumber,
          owner_secret: ownerSecret
        })
      });

      const data = await response.json();
      setOwnershipResult({ ...data, type: 'verify' });
    } catch (error: any) {
      setOwnershipResult({ error: error.message, type: 'verify' });
    } finally {
      setOwnershipLoading(false);
    }
  };

  // Attribute Proof Handler
  const handleProveAttribute = async () => {
    setAttrLoading(true);
    setAttrResult(null);

    try {
      const response = await fetch(`${FLASK_API_URL}/zk/prove_attribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: attrSerialNumber,
          attribute: attribute,
          predicate: predicateType,
          value: predicateValue
        })
      });

      const data = await response.json();
      setAttrResult(data);
    } catch (error: any) {
      setAttrResult({ error: error.message });
    } finally {
      setAttrLoading(false);
    }
  };

  // Selective Disclosure Handler
  const handleSelectiveDisclosure = async () => {
    setSelectiveLoading(true);
    setSelectiveResult(null);

    try {
      const response = await fetch(`${FLASK_API_URL}/zk/selective_disclosure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: selectiveSerialNumber,
          owner_secret: selectiveSecret,
          disclosed_attributes: selectedAttributes
        })
      });

      const data = await response.json();
      setSelectiveResult(data);
    } catch (error: any) {
      setSelectiveResult({ error: error.message });
    } finally {
      setSelectiveLoading(false);
    }
  };

  // Batch Verify Handler
  const handleBatchVerify = async () => {
    setBatchLoading(true);
    setBatchResult(null);

    try {
      const proofIdsArray = batchProofIds.split(',').map(id => id.trim()).filter(id => id);
      
      const response = await fetch(`${FLASK_API_URL}/zk/batch_verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof_ids: proofIdsArray
        })
      });

      const data = await response.json();
      setBatchResult(data);
    } catch (error: any) {
      setBatchResult({ error: error.message });
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleAttribute = (attr: string) => {
    setSelectedAttributes(prev =>
      prev.includes(attr) ? prev.filter(a => a !== attr) : [...prev, attr]
    );
  };

  return (
    <div className="space-y-6">
      <div
        className="p-10 rounded-2xl border border-purple-500"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        }}
      >
        <h3 className="text-3xl font-bold text-purple-400 mb-4">🔐 Zero-Knowledge Proofs</h3>
        <p className="text-lg text-gray-300 mb-6">
          Prove certificate ownership and attributes without revealing sensitive information.
          ZK proofs enable privacy-preserving verification.
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'ownership', label: '🔑 Ownership Proof', icon: '🔑' },
            { id: 'attribute', label: '🎯 Attribute Proof', icon: '🎯' },
            { id: 'selective', label: '🎭 Selective Disclosure', icon: '🎭' },
            { id: 'batch', label: '⚡ Batch Verify', icon: '⚡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveProofTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeProofTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ownership Proof Tab */}
        {activeProofTab === 'ownership' && (
          <div className="space-y-4">
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-bold mb-2">💡 What is Ownership Proof?</h4>
              <p className="text-gray-300 text-sm">
                Prove you own a certificate without revealing your private secret. Perfect for authentication
                without exposing sensitive credentials.
              </p>
            </div>

            <input
              type="text"
              placeholder="Certificate Serial Number *"
              value={ownershipSerialNumber}
              onChange={(e) => setOwnershipSerialNumber(e.target.value)}
              className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
            />

            <input
              type="password"
              placeholder="Owner Secret (Private Key) *"
              value={ownerSecret}
              onChange={(e) => setOwnerSecret(e.target.value)}
              className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
            />

            {proofId && (
              <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-300 text-sm"><strong>Proof ID:</strong> {proofId}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGenerateOwnershipProof}
                disabled={ownershipLoading || !ownershipSerialNumber || !ownerSecret}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
              >
                {ownershipLoading ? '⏳ Generating...' : '🔑 Generate Proof'}
              </button>

              {proofId && (
                <button
                  onClick={handleVerifyOwnershipProof}
                  disabled={ownershipLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
                >
                  {ownershipLoading ? '⏳ Verifying...' : '✅ Verify Proof'}
                </button>
              )}
            </div>

            {ownershipResult && (
              <div className={`p-4 rounded-lg border ${
                ownershipResult.success ? 'bg-green-600/20 border-green-500/30' : 'bg-red-600/20 border-red-500/30'
              }`}>
                <h4 className={`font-bold mb-2 ${ownershipResult.success ? 'text-green-300' : 'text-red-300'}`}>
                  {ownershipResult.success ? '✅ Success' : '❌ Failed'}
                </h4>
                <p className="text-gray-300">{ownershipResult.message || ownershipResult.error}</p>
                {ownershipResult.commitment && (
                  <p className="text-gray-400 text-xs mt-2 break-all">
                    <strong>Commitment:</strong> {ownershipResult.commitment}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attribute Proof Tab */}
        {activeProofTab === 'attribute' && (
          <div className="space-y-4">
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-bold mb-2">💡 What is Attribute Proof?</h4>
              <p className="text-gray-300 text-sm">
                Prove an attribute meets a condition without revealing its value. Example: "My completion date
                is after 2024-01-01" without showing the exact date.
              </p>
            </div>

            <input
              type="text"
              placeholder="Certificate Serial Number *"
              value={attrSerialNumber}
              onChange={(e) => setAttrSerialNumber(e.target.value)}
              className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={attribute}
                onChange={(e) => setAttribute(e.target.value)}
                className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
              >
                {availableAttributes.map(attr => (
                  <option key={attr} value={attr}>{attr.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>

              <select
                value={predicateType}
                onChange={(e) => setPredicateType(e.target.value)}
                className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
              >
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Predicate Value *"
              value={predicateValue}
              onChange={(e) => setPredicateValue(e.target.value)}
              className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
            />

            <button
              onClick={handleProveAttribute}
              disabled={attrLoading || !attrSerialNumber || !predicateValue}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
            >
              {attrLoading ? '⏳ Proving...' : '🎯 Prove Attribute'}
            </button>

            {attrResult && (
              <div className={`p-4 rounded-lg border ${
                attrResult.success ? 'bg-green-600/20 border-green-500/30' : 'bg-red-600/20 border-red-500/30'
              }`}>
                <h4 className={`font-bold mb-2 ${attrResult.success ? 'text-green-300' : 'text-red-300'}`}>
                  {attrResult.success ? '✅ Predicate Satisfied' : '❌ Predicate Not Satisfied'}
                </h4>
                <p className="text-gray-300">{attrResult.message || attrResult.error}</p>
                {attrResult.commitment && (
                  <p className="text-gray-400 text-xs mt-2 break-all">
                    <strong>Commitment:</strong> {attrResult.commitment}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selective Disclosure Tab */}
        {activeProofTab === 'selective' && (
          <div className="space-y-4">
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-bold mb-2">💡 What is Selective Disclosure?</h4>
              <p className="text-gray-300 text-sm">
                Choose which attributes to reveal and which to keep hidden. Show your name and issuer,
                but hide dates and other sensitive information.
              </p>
            </div>

            <input
              type="text"
              placeholder="Certificate Serial Number *"
              value={selectiveSerialNumber}
              onChange={(e) => setSelectiveSerialNumber(e.target.value)}
              className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
            />

            <input
              type="password"
              placeholder="Owner Secret *"
              value={selectiveSecret}
              onChange={(e) => setSelectiveSecret(e.target.value)}
              className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
            />

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-gray-300 font-bold mb-3">Select Attributes to Disclose:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableAttributes.map(attr => (
                  <label
                    key={attr}
                    className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-700/30"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAttributes.includes(attr)}
                      onChange={() => toggleAttribute(attr)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-300 text-sm">{attr.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleSelectiveDisclosure}
              disabled={selectiveLoading || !selectiveSerialNumber || !selectiveSecret || selectedAttributes.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
            >
              {selectiveLoading ? '⏳ Creating...' : '🎭 Create Selective Disclosure'}
            </button>

            {selectiveResult && (
              <div className={`p-4 rounded-lg border ${
                selectiveResult.success ? 'bg-green-600/20 border-green-500/30' : 'bg-red-600/20 border-red-500/30'
              }`}>
                <h4 className={`font-bold mb-2 ${selectiveResult.success ? 'text-green-300' : 'text-red-300'}`}>
                  {selectiveResult.success ? '✅ Disclosure Created' : '❌ Failed'}
                </h4>
                <p className="text-gray-300 mb-3">{selectiveResult.message || selectiveResult.error}</p>
                
                {selectiveResult.disclosed_attributes && (
                  <div className="space-y-2">
                    <p className="text-green-300 font-bold">Disclosed Attributes:</p>
                    <div className="bg-gray-800/50 rounded p-2 text-sm">
                      {Object.entries(selectiveResult.disclosed_attributes).map(([key, value]) => (
                        <p key={key} className="text-gray-300">
                          <strong>{key}:</strong> {String(value)}
                        </p>
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs">
                      {selectiveResult.hidden_attributes_count} attributes kept hidden with ZK proofs
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Batch Verify Tab */}
        {activeProofTab === 'batch' && (
          <div className="space-y-4">
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-bold mb-2">💡 What is Batch Verification?</h4>
              <p className="text-gray-300 text-sm">
                Verify multiple ZK proofs at once. Useful for employers verifying multiple candidates'
                certificates simultaneously.
              </p>
            </div>

            <textarea
              placeholder="Enter Proof IDs (comma-separated) *"
              value={batchProofIds}
              onChange={(e) => setBatchProofIds(e.target.value)}
              rows={4}
              className="w-full p-3 bg-gray-800/50 text-white rounded-lg border border-purple-500/30 focus:border-purple-500 focus:outline-none"
            />

            <button
              onClick={handleBatchVerify}
              disabled={batchLoading || !batchProofIds}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
            >
              {batchLoading ? '⏳ Verifying...' : '⚡ Batch Verify Proofs'}
            </button>

            {batchResult && (
              <div className={`p-4 rounded-lg border ${
                batchResult.success ? 'bg-green-600/20 border-green-500/30' : 'bg-red-600/20 border-red-500/30'
              }`}>
                <h4 className="font-bold mb-2 text-green-300">
                  ✅ Verified {batchResult.verified_count} of {batchResult.total} proofs
                </h4>
                
                <div className="space-y-2 mt-3">
                  {batchResult.results?.map((result: any, index: number) => (
                    <div
                      key={index}
                      className={`p-2 rounded ${
                        result.verified ? 'bg-green-600/10' : 'bg-red-600/10'
                      }`}
                    >
                      <p className="text-sm">
                        <span className={result.verified ? 'text-green-300' : 'text-red-300'}>
                          {result.verified ? '✅' : '❌'}
                        </span>
                        {' '}
                        <span className="text-gray-300">Proof ID: {result.proof_id}</span>
                        {result.type && (
                          <span className="text-gray-400 ml-2">({result.type})</span>
                        )}
                      </p>
                      {result.error && (
                        <p className="text-red-300 text-xs ml-6">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ZKProofSection;
