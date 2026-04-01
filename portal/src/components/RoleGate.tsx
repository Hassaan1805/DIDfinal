import { getCurrentUser, badgeMeetsRequirement } from '../utils/auth';
import type { BadgeType } from '../utils/auth';
import type { ReactNode } from 'react';
import { LockClosedIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

interface RoleGateProps {
  children: ReactNode;
  require: BadgeType;
  fallback?: ReactNode;
}

const BADGE_LABELS: Record<BadgeType, string> = {
  employee: 'Employee',
  manager: 'Manager',
  auditor: 'Auditor',
  admin: 'Admin',
};

const BADGE_STYLES: Record<BadgeType, { accent: string; subtle: string; border: string }> = {
  admin:    { accent: '#60a5fa', subtle: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.2)' },
  auditor:  { accent: '#fbbf24', subtle: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.2)' },
  manager:  { accent: '#a78bfa', subtle: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.2)' },
  employee: { accent: '#94a3b8', subtle: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
};

export function RoleGate({ children, require, fallback }: RoleGateProps) {
  const user = getCurrentUser();
  const userBadge = user?.badge || 'employee';

  if (badgeMeetsRequirement(userBadge, require)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  const style = BADGE_STYLES[require];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
      textAlign: 'center',
      background: style.subtle,
      border: `1px solid ${style.border}`,
      borderRadius: 16,
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: `rgba(${require === 'admin' ? '37,99,235' : require === 'auditor' ? '217,119,6' : require === 'manager' ? '124,58,237' : '100,116,139'},0.15)`,
        border: `1px solid ${style.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
        <LockClosedIcon style={{ width: 20, height: 20, color: style.accent }} />
      </div>
      <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        Access Restricted
      </p>
      <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
        This section requires{' '}
        <span style={{ color: style.accent, fontWeight: 600 }}>{BADGE_LABELS[require]}</span>
        {' '}access or higher.
        <br />Your current badge does not meet this requirement.
      </p>
    </div>
  );
}
