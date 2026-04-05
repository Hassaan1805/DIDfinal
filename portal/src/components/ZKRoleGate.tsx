/**
 * ZKRoleGate — Groth16 ZK role proof gate.
 *
 * Primary flow (QR):
 *  1. Portal creates a zk-wallet-prove challenge → displays as QR
 *  2. User opens wallet app, scans the QR
 *  3. Wallet derives ZK key, POSTs to /api/auth/zk-wallet-prove
 *  4. Backend generates + verifies the Groth16 proof server-side, marks challenge done
 *  5. Portal polls /api/auth/status/:challengeId → gets scoped JWT → children render
 *
 * Fallback (manual key entry): user can switch to typing the ZK key directly in the browser.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import type { BadgeType } from '../utils/auth';
import {
  FingerPrintIcon,
  XCircleIcon,
  ArrowPathIcon,
  KeyIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckSolid } from '@heroicons/react/24/solid';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Must match ROLE_HASHES in backend/src/routes/auth.ts
const ROLE_HASHES: Record<string, string> = {
  employee: '1000',
  manager:  '1001',
  auditor:  '1002',
  admin:    '1003',
};

const BADGE_LABELS: Record<string, string> = {
  employee: 'Employee', manager: 'Manager', auditor: 'Auditor', admin: 'Admin',
};

const BADGE_STYLES: Record<string, { accent: string; subtle: string; border: string }> = {
  admin:    { accent: '#60a5fa', subtle: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)' },
  auditor:  { accent: '#fbbf24', subtle: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.3)' },
  manager:  { accent: '#a78bfa', subtle: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.3)' },
  employee: { accent: '#94a3b8', subtle: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
};

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

type GateState =
  | 'loading-challenge'   // creating the initial challenge
  | 'qr-ready'            // QR displayed, polling for wallet scan
  | 'verified'            // scoped token received
  | 'error'
  | 'manual'              // fallback: manual key entry
  | 'manual-registering'
  | 'manual-ready'
  | 'manual-generating';

function getAuthToken(): string | null {
  return localStorage.getItem('authToken') || localStorage.getItem('auth_token');
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

function resolveApiBase(): string {
  // Wallet (on phone) can't reach localhost — use explicit LAN IP when set
  const pub = import.meta.env.VITE_PUBLIC_API_BASE_URL;
  if (pub) return pub;
  const env = import.meta.env.VITE_API_BASE_URL;
  if (env && !env.startsWith('/')) return env;
  return window.location.origin + '/api';
}

async function computeMerkleRoot(poseidon: any, F: any, pkField: bigint, roleHash: bigint): Promise<string> {
  const addr = F.toObject(poseidon([pkField, BigInt(0)]));
  const leaf = F.toObject(poseidon([addr, roleHash, BigInt(1)]));
  let node: bigint = leaf;
  for (let i = 0; i < 8; i++) {
    node = F.toObject(poseidon([node, BigInt(0)]));
  }
  return node.toString();
}

export function ZKRoleGate({ children, require, scope, label }: ZKRoleGateProps) {
  const [state, setState] = useState<GateState>('loading-challenge');
  const [challengeId, setChallengeId] = useState('');
  const [qrPayload, setQrPayload]   = useState('');
  const [scopedToken, setScopedToken] = useState<ScopedToken | null>(null);
  const [error, setError]           = useState('');
  const [statusMsg, setStatusMsg]   = useState('');
  const [timeLeft, setTimeLeft]     = useState(0);
  const [pkInput, setPkInput]       = useState('');
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const badgeStyle = BADGE_STYLES[require] || BADGE_STYLES.employee;

  // ── Create challenge + start polling ────────────────────────────────────────
  const startQRFlow = useCallback(async () => {
    setState('loading-challenge');
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/zk-wallet-challenge`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ requiredBadge: require, scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create challenge');

      const id = data.data.challengeId;
      setChallengeId(id);

      const payload = JSON.stringify({
        type:          'zk-wallet-prove',
        challengeId:   id,
        platform:      'Enterprise Portal',
        requiredBadge: require,
        scope,
        apiEndpoint:   resolveApiBase(),
      });
      setQrPayload(payload);
      setState('qr-ready');

      // Poll every 2s for the wallet to complete the proof
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`${API_BASE_URL}/auth/status/${id}`);
          if (!pr.ok) {
            console.warn(`[ZKRoleGate] poll status ${pr.status} for ${id}`);
            return;
          }
          const pd = await pr.json();
          if (pd.data?.status === 'completed' && pd.data?.token) {
            clearInterval(pollRef.current!);
            setScopedToken({
              token:     pd.data.token,
              scope:     pd.data.scope || scope,
              badge:     pd.data.badge || require,
              expiresAt: Date.now() + 15 * 60 * 1000,
            });
            setState('verified');
          }
        } catch (e) { console.warn('[ZKRoleGate] poll error:', e); }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create QR challenge');
      setState('error');
    }
  }, [require, scope]);

  useEffect(() => {
    startQRFlow();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [startQRFlow]);

  // ── Countdown timer when verified ───────────────────────────────────────────
  useEffect(() => {
    if (state !== 'verified' || !scopedToken) return;
    const tick = () => {
      const remaining = Math.max(0, scopedToken.expiresAt - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) { setScopedToken(null); startQRFlow(); clearInterval(timerRef.current!); }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, scopedToken, startQRFlow]);

  // ── Manual fallback: check ZK identity ──────────────────────────────────────
  const enterManualMode = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setError(''); setPkInput('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/zk-identity`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) { setState('error'); setError(data.error || 'Auth check failed'); return; }
      setState(data.data.hasZkIdentity ? 'manual-ready' : 'manual');
    } catch {
      setState('error'); setError('Network error');
    }
  }, []);

  const handleManualRegister = useCallback(async () => {
    const pkHex = pkInput.startsWith('0x') ? pkInput.slice(2) : pkInput;
    if (!/^[0-9a-fA-F]{64}$/.test(pkHex)) { setError('Must be 64 hex chars'); return; }
    setState('manual-registering'); setError(''); setStatusMsg('Computing ZK identity…');
    try {
      const MAX_252 = BigInt(2) ** BigInt(252);
      const pkField = BigInt('0x' + pkHex) % MAX_252;
      const { buildPoseidon } = await import('circomlibjs');
      const poseidon = await buildPoseidon();
      const F = poseidon.F;
      const zkAddress = F.toObject(poseidon([pkField, BigInt(0)])).toString();
      const merkleRoots: Record<string, string> = {};
      for (const [role, hash] of Object.entries(ROLE_HASHES)) {
        merkleRoots[role] = await computeMerkleRoot(poseidon, F, pkField, BigInt(hash));
      }
      setStatusMsg('Registering…');
      const res = await fetch(`${API_BASE_URL}/auth/zk-identity`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ zkAddress, merkleRoots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setPkInput(''); setState('manual-ready'); setStatusMsg('');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setState('manual'); setStatusMsg('');
    }
  }, [pkInput]);

  const handleManualProve = useCallback(async () => {
    const pkHex = pkInput.startsWith('0x') ? pkInput.slice(2) : pkInput;
    if (!/^[0-9a-fA-F]{64}$/.test(pkHex)) { setError('Must be 64 hex chars'); return; }
    setState('manual-generating'); setError('');
    try {
      const MAX_252 = BigInt(2) ** BigInt(252);
      const pkField = BigInt('0x' + pkHex) % MAX_252;
      setStatusMsg('Fetching challenge…');
      const chalRes = await fetch(`${API_BASE_URL}/auth/zk-role-challenge`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ requiredBadge: require, scope }),
      });
      const chalData = await chalRes.json();
      if (!chalRes.ok) throw new Error(chalData.error || 'Challenge fetch failed');
      const { challengeId: cid, roleHash, merkleRoot } = chalData.data;

      setStatusMsg('Generating Groth16 proof (~5s)…');
      const snarkjs = await import('snarkjs');
      const { proof, publicSignals } = await (snarkjs as any).groth16.fullProve(
        {
          privateKey:         pkField.toString(),
          nonce:              '0',
          tokenId:            '1',
          nftContractAddress: roleHash,
          merkleRoot,
          merkleProof:        Array(8).fill('0'),
          merkleIndices:      Array(8).fill('0'),
        },
        '/zkp/nftOwnership.wasm',
        '/zkp/nftOwnership_0001.zkey',
      );
      setStatusMsg('Submitting proof…');
      const verRes = await fetch(`${API_BASE_URL}/auth/zk-role-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: cid, proof, publicSignals }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error(verData.error || 'Proof verification failed');
      setPkInput('');
      setScopedToken({ token: verData.data.token, scope: verData.data.scope, badge: verData.data.badge, expiresAt: Date.now() + 15 * 60 * 1000 });
      setState('verified'); setStatusMsg('');
    } catch (err: any) {
      setError(err.message || 'Proof generation failed');
      setState('manual-ready'); setStatusMsg('');
    }
  }, [pkInput, require, scope]);

  // ── Verified ─────────────────────────────────────────────────────────────────
  if (state === 'verified' && scopedToken) {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', marginBottom: 20, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheckSolid style={{ width: 16, height: 16, color: '#34d399', flexShrink: 0 }} />
            <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>
              Groth16 ZK proof verified — {BADGE_LABELS[scopedToken.badge] || scopedToken.badge} role confirmed
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: timeLeft < 120 ? '#fca5a5' : '#64748b' }}>
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
        {children}
      </div>
    );
  }

  // ── Loading challenge ─────────────────────────────────────────────────────────
  if (state === 'loading-challenge') {
    return (
      <div style={ctr(badgeStyle)}>
        <style>{SPIN}</style>
        <ArrowPathIcon style={{ width: 20, height: 20, color: '#64748b', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Preparing ZK challenge…</p>
      </div>
    );
  }

  // ── QR ready — wallet scans this ─────────────────────────────────────────────
  if (state === 'qr-ready') {
    return (
      <div style={ctr(badgeStyle)}>
        <style>{SPIN}</style>
        <div style={iconRing(badgeStyle)}>
          <QrCodeIcon style={{ width: 24, height: 24, color: badgeStyle.accent }} />
        </div>
        <h3 style={H3}>{label || 'Scan with Wallet to Authenticate'}</h3>
        <p style={P}>
          Open the wallet app, tap <strong style={{ color: badgeStyle.accent }}>Scan QR</strong>, and scan this code.
          The wallet will generate a <strong style={{ color: badgeStyle.accent }}>Groth16 ZK proof</strong> and send it automatically.
        </p>

        {/* QR code */}
        <div style={{ padding: 16, background: '#fff', borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
          <QRCode value={qrPayload} size={200} level="M" />
        </div>

        {/* Polling indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          <ArrowPathIcon style={{ width: 13, height: 13, color: '#64748b', animation: 'spin 1.2s linear infinite' }} />
          <span style={{ color: '#64748b', fontSize: 12 }}>Waiting for wallet scan…</span>
        </div>

        {/* Fallback to manual */}
        <button
          onClick={enterManualMode}
          style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Enter key manually instead
        </button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div style={ctr(badgeStyle)}>
        <style>{SPIN}</style>
        <XCircleIcon style={{ width: 20, height: 20, color: '#fca5a5', margin: '0 auto 10px' }} />
        <p style={{ color: '#fca5a5', fontSize: 13, margin: '0 0 16px' }}>{error}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={startQRFlow} style={ghostBtn}>
            <ArrowPathIcon style={{ width: 14, height: 14 }} /> Show QR again
          </button>
          <button onClick={enterManualMode} style={ghostBtn}>
            <KeyIcon style={{ width: 14, height: 14 }} /> Manual key
          </button>
        </div>
      </div>
    );
  }

  // ── Manual: not registered ────────────────────────────────────────────────────
  if (state === 'manual' || state === 'manual-registering') {
    return (
      <div style={ctr(badgeStyle)}>
        <style>{SPIN}</style>
        <div style={iconRing(badgeStyle)}><KeyIcon style={{ width: 24, height: 24, color: badgeStyle.accent }} /></div>
        <h3 style={H3}>One-Time ZK Identity Setup</h3>
        <p style={P}>Get your ZK key from the wallet app → Identity Profile → ZK Identity Key.</p>
        <input type="password" placeholder="0x… private key (64 hex)" value={pkInput}
          onChange={e => { setPkInput(e.target.value); setError(''); }}
          style={pkInputStyle} disabled={state === 'manual-registering'} />
        {error && <p style={errTxt}>{error}</p>}
        {statusMsg && <p style={dimTxt}>{statusMsg}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button onClick={handleManualRegister} disabled={state === 'manual-registering' || !pkInput} style={btn(badgeStyle, state === 'manual-registering' || !pkInput)}>
            {state === 'manual-registering' ? <><ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> Computing…</> : 'Register'}
          </button>
          <button onClick={startQRFlow} style={ghostBtn}><QrCodeIcon style={{ width: 14, height: 14 }} /> Use QR</button>
        </div>
      </div>
    );
  }

  // ── Manual: ready to prove ─────────────────────────────────────────────────
  if (state === 'manual-ready' || state === 'manual-generating') {
    return (
      <div style={ctr(badgeStyle)}>
        <style>{SPIN}</style>
        <div style={iconRing(badgeStyle)}><FingerPrintIcon style={{ width: 24, height: 24, color: badgeStyle.accent }} /></div>
        <h3 style={H3}>{label || 'ZK Role Proof Required'}</h3>
        <p style={P}>Enter your ZK key to generate a browser-side Groth16 proof (~5s).</p>
        <input type="password" placeholder="0x… private key (64 hex)" value={pkInput}
          onChange={e => { setPkInput(e.target.value); setError(''); }}
          style={pkInputStyle} disabled={state === 'manual-generating'} />
        {error && <p style={errTxt}>{error}</p>}
        {statusMsg && <p style={dimTxt}>{statusMsg}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button onClick={handleManualProve} disabled={state === 'manual-generating' || !pkInput} style={btn(badgeStyle, state === 'manual-generating' || !pkInput)}>
            {state === 'manual-generating' ? <><ArrowPathIcon style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> {statusMsg || 'Generating…'}</> : <><FingerPrintIcon style={{ width: 14, height: 14 }} /> Generate Proof</>}
          </button>
          <button onClick={startQRFlow} style={ghostBtn}><QrCodeIcon style={{ width: 14, height: 14 }} /> Use QR</button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const SPIN = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
const ctr = (bs: { subtle: string; border: string }) => ({ padding: '36px 32px', textAlign: 'center' as const, background: bs.subtle, border: `1px solid ${bs.border}`, borderRadius: 16 });
const iconRing = (bs: { subtle: string; border: string }) => ({ width: 52, height: 52, borderRadius: '50%', background: bs.subtle, border: `1px solid ${bs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' });
const H3: React.CSSProperties = { color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em' };
const P: React.CSSProperties  = { color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' };
const pkInputStyle: React.CSSProperties = { width: '100%', maxWidth: 380, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' };
const btn = (bs: { accent: string }, disabled: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: disabled ? 'rgba(255,255,255,0.05)' : bs.accent === '#60a5fa' ? '#2563eb' : bs.accent === '#fbbf24' ? '#d97706' : bs.accent === '#a78bfa' ? '#7c3aed' : '#475569', border: 'none', borderRadius: 8, color: disabled ? '#475569' : '#fff', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 });
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#64748b', fontSize: 13, cursor: 'pointer' };
const errTxt: React.CSSProperties  = { color: '#fca5a5', fontSize: 12, marginTop: 8, margin: '8px 0 0' };
const dimTxt: React.CSSProperties  = { color: '#64748b',  fontSize: 12, marginTop: 8, margin: '8px 0 0' };
