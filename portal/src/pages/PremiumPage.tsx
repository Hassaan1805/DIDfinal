import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckSolid } from '@heroicons/react/24/solid';

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

  useEffect(() => {
    const initializePage = async () => {
      await checkSessionStatus();
      await fetchPremiumContent();
    };
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSessionStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) { navigate('/'); return; }
      const response = await fetch('/api/auth/session-status', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Session check failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Session verification failed');
      const sessionData = result.data;
      setUserSession(sessionData);
      if (sessionData.accessLevel !== 'premium') { navigate('/?premium=required'); return; }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setTimeout(() => navigate('/'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchPremiumContent = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch('/api/premium/content', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const result = await response.json();
        setPremiumContent(result.data?.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch premium content:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' }}>
        <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: '50%',
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <ShieldCheckIcon style={{ width: 22, height: 22, color: '#60a5fa', animation: 'spin 1.5s linear infinite' }} />
          </div>
          <h2 style={{ color: '#f8fafc', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Verifying Premium Access</h2>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>Checking your session and access level...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: '50%',
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <LockClosedIcon style={{ width: 22, height: 22, color: '#f87171' }} />
          </div>
          <h2 style={{ color: '#f8fafc', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Access Error</h2>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>{error}</p>
          <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>Redirecting to main page...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
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
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f1f5f9'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
        >
          <ArrowLeftIcon style={{ width: 14, height: 14 }} />
          Back to Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheckSolid style={{ width: 15, height: 15, color: '#34d399' }} />
          <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Premium Content</span>
        </div>
        <div style={{ width: 140 }} />
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Premium Session Banner */}
        {userSession && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '14px 20px',
            background: 'rgba(5,150,105,0.07)',
            border: '1px solid rgba(5,150,105,0.2)',
            borderRadius: 12,
            marginBottom: 32,
            animation: 'fadeUp 0.35s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheckSolid style={{ width: 16, height: 16, color: '#34d399', flexShrink: 0 }} />
              <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>Premium Access Active</span>
              <span style={{ color: '#475569', fontSize: 12 }}>· Verified via Zero-Knowledge Proof</span>
            </div>
            {userSession.premiumGrantedAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockIcon style={{ width: 12, height: 12, color: '#475569' }} />
                <span style={{ color: '#475569', fontSize: 12 }}>
                  Granted: {new Date(userSession.premiumGrantedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 36 }}>
          {[
            { label: 'Premium Content', value: premiumContent.length.toString(), sub: 'Articles Available', accent: '#60a5fa', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.18)', Icon: DocumentTextIcon },
            { label: 'Access Level', value: 'Premium', sub: 'ZK Verified', accent: '#34d399', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.18)', Icon: CheckCircleIcon },
            { label: 'ZK Proofs', value: 'Valid', sub: 'Cryptographically Secure', accent: '#a78bfa', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.18)', Icon: ShieldCheckIcon },
            { label: 'Session', value: 'Active', sub: 'Privacy Protected', accent: '#fbbf24', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.18)', Icon: LockClosedIcon },
          ].map(({ label, value, sub, accent, bg, border, Icon }) => (
            <div key={label} className="stat-card" style={{ borderRadius: 12, animation: 'fadeUp 0.4s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 14, height: 14, color: accent }} />
                </div>
                <span style={{ color: '#475569', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              </div>
              <div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 3 }}>{value}</div>
              <div style={{ color: '#334155', fontSize: 11 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {premiumContent.length > 0 ? (
            premiumContent.map((content, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  padding: '24px 26px',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                  animation: `fadeUp ${0.35 + index * 0.05}s ease both`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{
                        padding: '2px 10px',
                        background: 'rgba(124,58,237,0.12)',
                        border: '1px solid rgba(124,58,237,0.25)',
                        borderRadius: 99,
                        color: '#a78bfa',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {content.category}
                      </span>
                      {content.restricted && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px',
                          background: 'rgba(37,99,235,0.1)',
                          border: '1px solid rgba(37,99,235,0.22)',
                          borderRadius: 99,
                          color: '#60a5fa',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          <LockClosedIcon style={{ width: 9, height: 9 }} />
                          Premium
                        </span>
                      )}
                    </div>
                    <h3 style={{ color: '#f8fafc', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.4 }}>
                      {content.title}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{content.description}</p>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(124,58,237,0.1)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <DocumentTextIcon style={{ width: 18, height: 18, color: '#a78bfa' }} />
                  </div>
                </div>

                <div style={{
                  color: '#94a3b8',
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  marginBottom: 16,
                }}>
                  {content.content}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12 }}>
                    <ClockIcon style={{ width: 12, height: 12 }} />
                    Last updated: {new Date(content.lastUpdated).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#60a5fa', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                    Read More
                    <ArrowRightIcon style={{ width: 12, height: 12 }} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '56px 24px',
              textAlign: 'center',
            }}>
              <DocumentTextIcon style={{ width: 32, height: 32, color: '#334155', margin: '0 auto 14px' }} />
              <h3 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Loading Premium Content</h3>
              <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>Fetching your exclusive Corporate Excellence 2025 content.</p>
            </div>
          )}
        </div>

        {/* ZK Privacy Info */}
        <div style={{
          background: 'rgba(5,150,105,0.05)',
          border: '1px solid rgba(5,150,105,0.15)',
          borderRadius: 16,
          padding: '24px 26px',
          marginTop: 32,
          display: 'flex',
          gap: 18,
          alignItems: 'flex-start',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(5,150,105,0.12)',
            border: '1px solid rgba(5,150,105,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShieldCheckIcon style={{ width: 18, height: 18, color: '#34d399' }} />
          </div>
          <div>
            <h3 style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>Zero-Knowledge Privacy Protection</h3>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, margin: '0 0 14px' }}>
              Your access was verified using zero-knowledge proof technology. You proved NFT ownership{' '}
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>without revealing your wallet address or any personal information</span>.
              Your privacy and anonymity are completely protected.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Privacy Protected', 'Zero-Knowledge', 'Cryptographically Secure'].map((tag) => (
                <span key={tag} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px',
                  background: 'rgba(5,150,105,0.1)',
                  border: '1px solid rgba(5,150,105,0.2)',
                  borderRadius: 99,
                  color: '#34d399',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  <CheckCircleIcon style={{ width: 10, height: 10 }} />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
