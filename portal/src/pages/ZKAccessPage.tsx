import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  FingerPrintIcon,
  BookOpenIcon,
  StarIcon,
  BuildingOffice2Icon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckSolid } from '@heroicons/react/24/solid';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ZKChallenge {
  challengeId: string;
  timestamp: number;
  nftContract: string;
  requiredProof: string;
  expiresAt: number;
  instructions: { step1: string; step2: string; step3: string; privacy: string; };
}

interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

interface AccessTier {
  id: string;
  name: string;
  description: string;
  requiredProof: string;
  benefits: string[];
}

interface PremiumData {
  executiveInsights: string[];
  exclusiveResources: Array<{ title: string; description: string; level: string; estimatedReadTime?: string; }>;
  memberBenefits: string[];
}

const ACCESS_TIERS: AccessTier[] = [
  { id: 'basic', name: 'Basic Access', description: 'Standard authenticated access', requiredProof: 'none', benefits: ['Dashboard access', 'Profile management', 'Basic analytics'] },
  { id: 'premium', name: 'Premium Access', description: 'NFT ownership verified via ZK-proof', requiredProof: 'NFT_OWNERSHIP', benefits: ['Executive insights', 'Advanced resources', 'Priority support', 'Beta features'] },
  { id: 'enterprise', name: 'Enterprise Access', description: 'Corporate credentials verified via ZK-proof', requiredProof: 'CORPORATE_CREDENTIAL', benefits: ['Full API access', 'Custom integrations', 'Dedicated support', 'SLA guarantees'] },
];

const TIER_STYLES: Record<string, { accent: string; bg: string; border: string }> = {
  basic:      { accent: '#94a3b8', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
  premium:    { accent: '#a78bfa', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
  enterprise: { accent: '#fbbf24', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.2)'  },
};

const ZKAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<ZKChallenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [anonymousToken, setAnonymousToken] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('basic');
  const [premiumData, setPremiumData] = useState<PremiumData | null>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [manualProof, setManualProof] = useState<string>('');
  const [manualSignals, setManualSignals] = useState<string>('');

  useEffect(() => {
    fetchServiceStatus();
    const storedToken = localStorage.getItem('zkp_anonymous_token');
    if (storedToken) { setAnonymousToken(storedToken); verifyStoredToken(storedToken); }
  }, []);

  const fetchServiceStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/premium/service-info`);
      const data = await response.json();
      if (data.success) setServiceStatus(data.data);
    } catch (err) { console.error('Failed to fetch service status:', err); }
  };

  const verifyStoredToken = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-anonymous-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.success) { setCurrentTier('premium'); fetchPremiumContent(token); }
      else { localStorage.removeItem('zkp_anonymous_token'); setAnonymousToken(null); }
    } catch (err) { localStorage.removeItem('zkp_anonymous_token'); setAnonymousToken(null); }
  };

  const requestChallenge = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/zkp-challenge`);
      const data = await response.json();
      if (data.success) { setChallenge(data.data); setSuccess('Challenge generated! Use your wallet to generate a ZK-proof.'); }
      else setError(data.error || 'Failed to get challenge');
    } catch (err) { setError('Network error: Unable to reach server'); }
    finally { setLoading(false); }
  };

  const submitProof = async (proof: ZKProof, publicSignals: string[]) => {
    setVerifying(true); setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-zkp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof, publicSignals, challengeId: challenge?.challengeId, proofType: 'NFT_OWNERSHIP' }),
      });
      const data = await response.json();
      if (data.success) {
        const token = data.data.anonymousToken;
        setAnonymousToken(token);
        localStorage.setItem('zkp_anonymous_token', token);
        setCurrentTier('premium');
        setSuccess('ZK-proof verified! You now have anonymous premium access.');
        setChallenge(null);
        fetchPremiumContent(token);
      } else { setError(data.message || 'Proof verification failed'); }
    } catch (err) { setError('Network error during verification'); }
    finally { setVerifying(false); }
  };

  const handleManualSubmit = () => {
    try {
      const proof = JSON.parse(manualProof);
      const signals = JSON.parse(manualSignals);
      submitProof(proof, signals);
    } catch (err) { setError('Invalid JSON format for proof or signals'); }
  };

  const fetchPremiumContent = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/premium/content`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) setPremiumData(data.data.content);
    } catch (err) { console.error('Failed to fetch premium content:', err); }
  };

  const clearAccess = () => {
    localStorage.removeItem('zkp_anonymous_token');
    setAnonymousToken(null); setCurrentTier('basic'); setPremiumData(null); setSuccess(null);
  };

  const generateDemoProof = useCallback(() => {
    const demoProof = {
      pi_a: ["12345678901234567890", "98765432109876543210", "1"],
      pi_b: [["11111111111111111111", "22222222222222222222"], ["33333333333333333333", "44444444444444444444"], ["1", "0"]],
      pi_c: ["55555555555555555555", "66666666666666666666", "1"],
      protocol: "groth16", curve: "bn128",
    };
    const demoSignals = ["1", "742d35Cc6634C0532925a3b8D8B5d3d8c0eF7e95".toLowerCase(), "123456789"];
    setManualProof(JSON.stringify(demoProof, null, 2));
    setManualSignals(JSON.stringify(demoSignals, null, 2));
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
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f1f5f9'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
        >
          <ArrowLeftIcon style={{ width: 14, height: 14 }} />
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FingerPrintIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />
          <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>ZK-Proof Access</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: 40, animation: 'fadeUp 0.35s ease both' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          }}>
            <LockClosedIcon style={{ width: 22, height: 22, color: '#60a5fa' }} />
          </div>
          <h1 style={{ color: '#f8fafc', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            Privacy-Preserving Access
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
            Prove NFT ownership without revealing your identity. Access premium content while maintaining complete anonymity.
          </p>
        </div>

        {/* Access Tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 36, animation: 'fadeUp 0.4s ease both' }}>
          {ACCESS_TIERS.map((tier) => {
            const ts = TIER_STYLES[tier.id];
            const isActive = currentTier === tier.id;
            return (
              <div key={tier.id} style={{
                background: isActive ? ts.bg : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? ts.border : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14,
                padding: '18px 20px',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}>
                {isActive && (
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px',
                      background: ts.bg,
                      border: `1px solid ${ts.border}`,
                      borderRadius: 99,
                      color: ts.accent,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      Active
                    </span>
                  </div>
                )}
                <h3 style={{ color: isActive ? ts.accent : '#94a3b8', fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>{tier.name}</h3>
                <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.5, margin: '0 0 14px' }}>{tier.description}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {tier.benefits.map((benefit, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, color: isActive ? '#94a3b8' : '#475569', fontSize: 12 }}>
                      <CheckCircleIcon style={{ width: 12, height: 12, color: isActive ? ts.accent : '#334155', flexShrink: 0 }} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Status Messages */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)', borderRadius: 10, marginBottom: 20 }}>
            <XCircleIcon style={{ width: 15, height: 15, color: '#f87171', flexShrink: 0 }} />
            <span style={{ color: '#fca5a5', fontSize: 13 }}>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.22)', borderRadius: 10, marginBottom: 20 }}>
            <CheckCircleIcon style={{ width: 15, height: 15, color: '#34d399', flexShrink: 0 }} />
            <span style={{ color: '#34d399', fontSize: 13 }}>{success}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ZKP Verification Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FingerPrintIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />
              </div>
              <h2 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>ZK-Proof Verification</h2>
            </div>

            {!anonymousToken ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Step 1 */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>1</span>
                    <h3 style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: 0 }}>Request Challenge</h3>
                  </div>
                  <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.5, margin: '0 0 12px' }}>Get a unique challenge to prove your NFT ownership</p>
                  <button
                    onClick={requestChallenge}
                    disabled={loading}
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px' }}
                  >
                    {loading ? <ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <LockOpenIcon style={{ width: 14, height: 14 }} />}
                    {loading ? 'Generating...' : 'Get Challenge'}
                  </button>
                </div>

                {/* Step 2 */}
                {challenge && (
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>2</span>
                      <h3 style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: 0 }}>Generate Proof</h3>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                      {[
                        { label: 'Challenge ID', value: challenge.challengeId },
                        { label: 'NFT Contract', value: challenge.nftContract },
                        { label: 'Expires', value: new Date(challenge.expiresAt).toLocaleString() },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ marginBottom: 6 }}>
                          <div style={{ color: '#334155', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                          <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{challenge.instructions.step1}</p>
                  </div>
                )}

                {/* Step 3 */}
                {challenge && (
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>3</span>
                      <h3 style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: 0 }}>Submit Proof</h3>
                    </div>
                    <p style={{ color: '#475569', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>Paste the ZK-proof from your wallet:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', color: '#334155', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Proof (JSON)</label>
                        <textarea
                          value={manualProof}
                          onChange={(e) => setManualProof(e.target.value)}
                          placeholder='{"pi_a": [...], "pi_b": [...], "pi_c": [...]}'
                          className="input-field"
                          style={{ height: 100, fontFamily: 'var(--font-mono)', fontSize: 11, resize: 'vertical' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#334155', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Public Signals (JSON Array)</label>
                        <textarea
                          value={manualSignals}
                          onChange={(e) => setManualSignals(e.target.value)}
                          placeholder='["1", "123456789", ...]'
                          className="input-field"
                          style={{ height: 64, fontFamily: 'var(--font-mono)', fontSize: 11, resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={generateDemoProof}
                          className="btn-secondary"
                          style={{ flex: 1, fontSize: 12, padding: '9px' }}
                        >
                          Demo Proof
                        </button>
                        <button
                          onClick={handleManualSubmit}
                          disabled={verifying || !manualProof || !manualSignals}
                          className="btn-primary"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, padding: '9px' }}
                        >
                          {verifying ? <ArrowPathIcon style={{ width: 13, height: 13, animation: 'spin 0.8s linear infinite' }} /> : <CheckCircleIcon style={{ width: 13, height: 13 }} />}
                          {verifying ? 'Verifying...' : 'Submit Proof'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '16px', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.22)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ShieldCheckSolid style={{ width: 16, height: 16, color: '#34d399' }} />
                    <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>Premium Access Active</span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                    Your NFT ownership has been verified via Zero-Knowledge Proof. Your identity remains completely anonymous.
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ color: '#334155', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Anonymous Token</div>
                  <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{anonymousToken.substring(0, 50)}...</div>
                </div>
                <button
                  onClick={clearAccess}
                  className="btn-danger"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px' }}
                >
                  <LockClosedIcon style={{ width: 14, height: 14 }} />
                  Clear Anonymous Access
                </button>
              </div>
            )}
          </div>

          {/* Premium Content Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StarIcon style={{ width: 16, height: 16, color: '#fbbf24' }} />
              </div>
              <h2 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Premium Content</h2>
            </div>

            {premiumData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Executive Insights */}
                <div>
                  <h3 style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Executive Insights</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {premiumData.executiveInsights?.map((insight, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                        <span style={{ color: '#a78bfa', marginTop: 2, flexShrink: 0 }}>›</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exclusive Resources */}
                <div>
                  <h3 style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Exclusive Resources</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {premiumData.exclusiveResources?.map((resource, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <h4 style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: 0 }}>{resource.title}</h4>
                          <span style={{ padding: '2px 7px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 99, color: '#a78bfa', fontSize: 10, fontWeight: 600 }}>{resource.level}</span>
                        </div>
                        <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{resource.description}</p>
                        {resource.estimatedReadTime && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                            <BookOpenIcon style={{ width: 11, height: 11, color: '#334155' }} />
                            <span style={{ color: '#334155', fontSize: 11 }}>{resource.estimatedReadTime}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Member Benefits */}
                <div>
                  <h3 style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Member Benefits</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {premiumData.memberBenefits?.map((benefit, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12 }}>
                        <CheckCircleIcon style={{ width: 12, height: 12, color: '#34d399', flexShrink: 0 }} />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <LockClosedIcon style={{ width: 22, height: 22, color: '#a78bfa' }} />
                </div>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Premium Content Locked</h3>
                <p style={{ color: '#475569', fontSize: 13, margin: 0, lineHeight: 1.5 }}>Verify your NFT ownership via ZK-proof to unlock exclusive content</p>
              </div>
            )}
          </div>
        </div>

        {/* Service Status */}
        {serviceStatus && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: '20px 22px',
            marginTop: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CpuChipIcon style={{ width: 14, height: 14, color: '#60a5fa' }} />
              <h3 style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>ZKP Service Status</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Status', value: serviceStatus.status === 'active' ? 'Active' : 'Demo Mode', color: serviceStatus.status === 'active' ? '#34d399' : '#fbbf24' },
                { label: 'Protocol', value: serviceStatus.protocol || 'Groth16', color: '#a78bfa' },
                { label: 'Curve', value: serviceStatus.curve || 'BN254', color: '#a78bfa' },
                { label: 'NFT Contract', value: serviceStatus.nftContract ? serviceStatus.nftContract.substring(0, 10) + '...' : 'N/A', color: '#60a5fa' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 9, padding: '10px 12px' }}>
                  <div style={{ color: '#334155', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ color, fontSize: 12, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZKAccessPage;
