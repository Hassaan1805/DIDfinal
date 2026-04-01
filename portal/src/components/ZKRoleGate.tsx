/**
 * ZKRoleGate Component
 * Gates sensitive sections behind a fresh ZKP role-proof challenge.
 * The user must scan a QR code with their wallet and prove (via selective
 * disclosure) that they hold a badge >= the required level.
 * Once verified, a scoped 15-minute access token is granted.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import type { BadgeType } from '../utils/auth';
import {
  FingerPrintIcon,
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckSolid } from '@heroicons/react/24/solid';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface ZKRoleGateProps {
  children: React.ReactNode;
  require: BadgeType;
  scope: string;
  label?: string;
}

interface ScopedToken {
  token: string;
  scope: string;
  badge: string;
  expiresAt: number;
}

const BADGE_LABELS: Record<BadgeType, string> = {
  employee: 'Employee',
  manager: 'Manager',
  auditor: 'Auditor',
  admin: 'Admin',
};

const BADGE_STYLES: Record<BadgeType, { accent: string; subtle: string; border: string }> = {
  admin:    { accent: '#60a5fa', subtle: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)' },
  auditor:  { accent: '#fbbf24', subtle: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.3)' },
  manager:  { accent: '#a78bfa', subtle: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.3)' },
  employee: { accent: '#94a3b8', subtle: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
};

type GateState = 'idle' | 'loading' | 'qr' | 'polling' | 'verified' | 'error';

export function ZKRoleGate({ children, require, scope, label }: ZKRoleGateProps) {
  const [state, setState] = useState<GateState>('idle');
  const [qrUrl, setQrUrl] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [scopedToken, setScopedToken] = useState<ScopedToken | null>(null);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (state !== 'verified' || !scopedToken) return;
    const tick = () => {
      const remaining = Math.max(0, scopedToken.expiresAt - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setScopedToken(null);
        setState('idle');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, scopedToken]);

  const startChallenge = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/role-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredBadge: require, scope }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || 'Failed to create role challenge');
      const { challengeId: cid, qrCodeData } = payload.data;
      setChallengeId(cid);
      const qr = await QRCode.toDataURL(qrCodeData, {
        width: 260, margin: 2, color: { dark: '#000000', light: '#ffffff' },
      });
      setQrUrl(qr);
      setState('qr');
      startPolling(cid);
    } catch (err: any) {
      setError(err.message || 'Challenge creation failed');
      setState('error');
    }
  }, [require, scope]);

  const startPolling = (cid: string) => {
    setState('polling');
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/status/${cid}`);
        const payload = await res.json();
        if (!res.ok || !payload.success) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setError('Challenge expired or failed');
          setState('error');
          return;
        }
        if (payload.data.status === 'completed' && payload.data.token) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setScopedToken({
            token: payload.data.token,
            scope: payload.data.scope || scope,
            badge: payload.data.badge || require,
            expiresAt: Date.now() + 15 * 60 * 1000,
          });
          setState('verified');
        }
      } catch { /* keep polling */ }
    }, 2000);

    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        if (state !== 'verified') { setError('Challenge timed out'); setState('error'); }
      }
    }, 5 * 60 * 1000);
  };

  const badgeStyle = BADGE_STYLES[require] || BADGE_STYLES.employee;

  // ── Verified ──────────────────────────────────────────────────────────────

  if (state === 'verified' && scopedToken) {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const expiringSoon = timeLeft < 120;

    return (
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          marginBottom: 20,
          background: 'rgba(5,150,105,0.08)',
          border: '1px solid rgba(5,150,105,0.2)',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheckSolid style={{ width: 16, height: 16, color: '#34d399', flexShrink: 0 }} />
            <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>
              ZK proof verified — {BADGE_LABELS[scopedToken.badge as BadgeType] || scopedToken.badge} role confirmed
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: expiringSoon ? '#fca5a5' : '#64748b',
              transition: 'color 0.3s ease',
            }}>
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
            <span style={{ color: '#475569', fontSize: 11 }}>remaining</span>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // ── Challenge UI ──────────────────────────────────────────────────────────

  return (
    <div style={{
      padding: '36px 32px',
      textAlign: 'center',
      background: badgeStyle.subtle,
      border: `1px solid ${badgeStyle.border}`,
      borderRadius: 16,
    }}>
      <style>{`
        @keyframes zkPulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
        @keyframes zkScanLine {
          0% { top: 2%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 94%; opacity: 0; }
        }
      `}</style>

      {/* Icon */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: badgeStyle.subtle,
        border: `1px solid ${badgeStyle.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <FingerPrintIcon style={{ width: 24, height: 24, color: badgeStyle.accent }} />
      </div>

      <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
        {label || 'Zero-Knowledge Role Verification'}
      </h3>
      <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
        This section requires a fresh cryptographic proof of{' '}
        <span style={{ color: badgeStyle.accent, fontWeight: 600 }}>{BADGE_LABELS[require]}</span>{' '}
        access. Scan the QR code with your DID wallet to prove your role without revealing your identity.
      </p>

      {/* Idle */}
      {state === 'idle' && (
        <button
          onClick={startChallenge}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 22px',
            background: badgeStyle.accent === '#60a5fa' ? '#2563eb' : badgeStyle.accent === '#fbbf24' ? '#d97706' : badgeStyle.accent === '#a78bfa' ? '#7c3aed' : '#475569',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            transition: 'all 0.15s ease',
          }}
        >
          <FingerPrintIcon style={{ width: 16, height: 16 }} />
          Begin Role Proof
        </button>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ArrowPathIcon style={{ width: 16, height: 16, color: '#64748b', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#64748b', fontSize: 13 }}>Creating challenge...</span>
        </div>
      )}

      {/* QR + Polling */}
      {(state === 'qr' || state === 'polling') && qrUrl && (
        <div>
          <div style={{
            display: 'inline-block',
            padding: 14,
            background: '#ffffff',
            borderRadius: 14,
            marginBottom: 16,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <img src={qrUrl} alt="Role proof QR" style={{ width: 220, height: 220, display: 'block' }} />
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${badgeStyle.accent}, transparent)`,
              animation: 'zkScanLine 3s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          </div>
          <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 16px' }}>
            Scan to prove <span style={{ color: badgeStyle.accent, fontWeight: 600 }}>{BADGE_LABELS[require]}</span> access
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: badgeStyle.accent,
              display: 'inline-block',
              animation: 'zkPulseDot 1.8s ease-in-out infinite',
            }} />
            <span style={{ color: '#475569', fontSize: 12 }}>Waiting for wallet response...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            <XCircleIcon style={{ width: 16, height: 16, color: '#fca5a5' }} />
            <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>
          </div>
          <button
            onClick={startChallenge}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: '#94a3b8',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <ArrowPathIcon style={{ width: 14, height: 14 }} />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
