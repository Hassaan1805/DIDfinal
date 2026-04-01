import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, badgeMeetsRequirement } from '../utils/auth';
import type { BadgeType } from '../utils/auth';
import type { ReactNode } from 'react';
import { LockClosedIcon, ArrowLeftIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

interface ProtectedRouteProps {
  children: ReactNode;
  requireBadge?: BadgeType;
}

const BADGE_LABELS: Record<BadgeType, string> = {
  employee: 'Employee',
  manager: 'Manager',
  auditor: 'Auditor',
  admin: 'Admin',
};

const BADGE_STYLES: Record<string, { accent: string; subtle: string; border: string }> = {
  admin:    { accent: '#60a5fa', subtle: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.25)' },
  auditor:  { accent: '#fbbf24', subtle: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.25)' },
  manager:  { accent: '#a78bfa', subtle: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.25)' },
  employee: { accent: '#94a3b8', subtle: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.25)' },
};

export function ProtectedRoute({ children, requireBadge }: ProtectedRouteProps) {
  const location = useLocation();
  const authenticated = isAuthenticated();

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireBadge) {
    const user = getCurrentUser();
    const userBadge = user?.badge || 'employee';

    if (!badgeMeetsRequirement(userBadge, requireBadge)) {
      const requiredStyle = BADGE_STYLES[requireBadge] || BADGE_STYLES.employee;
      const userStyle = BADGE_STYLES[userBadge] || BADGE_STYLES.employee;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          padding: '32px 24px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 400,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '40px 36px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
          }}>
            {/* Icon */}
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: requiredStyle.subtle,
              border: `1px solid ${requiredStyle.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <LockClosedIcon style={{ width: 24, height: 24, color: requiredStyle.accent }} />
            </div>

            <h2 style={{ color: '#f8fafc', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
              Access Restricted
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' }}>
              This route requires{' '}
              <span style={{ color: requiredStyle.accent, fontWeight: 600 }}>{BADGE_LABELS[requireBadge]}</span>
              {' '}access or higher to proceed.
            </p>

            {/* Badge comparison */}
            <div style={{
              display: 'flex',
              gap: 10,
              marginBottom: 24,
            }}>
              <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                <p style={{ color: '#334155', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Your Badge</p>
                <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, background: userStyle.subtle, border: `1px solid ${userStyle.border}`, color: userStyle.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {BADGE_LABELS[userBadge as BadgeType] || userBadge}
                </span>
              </div>
              <div style={{ flex: 1, padding: '10px 12px', background: requiredStyle.subtle, border: `1px solid ${requiredStyle.border}`, borderRadius: 10 }}>
                <p style={{ color: '#334155', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Required</p>
                <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, background: requiredStyle.subtle, border: `1px solid ${requiredStyle.border}`, color: requiredStyle.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {BADGE_LABELS[requireBadge]}
                </span>
              </div>
            </div>

            <button
              onClick={() => window.history.back()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#94a3b8',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; (e.currentTarget as HTMLElement).style.color = '#f1f5f9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            >
              <ArrowLeftIcon style={{ width: 14, height: 14 }} />
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
