'use client';

import { Avatar } from '@/components/Avatar';
import { Activity } from '@/lib/types';
import { formatIndianCurrency, formatIndianNumberCompact, formatRelativeTime } from '@/lib/formatCurrency';

export function ActivityTab({ activity, loading }: { activity: Activity[]; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 12, width: '30%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
        <p>No activity yet in this group.</p>
      </div>
    );
  }

  const renderActivityText = (a: Activity) => {
    const userName = <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.user.name}</span>;
    const amount = Number(a.metadata.amount ?? 0);
    const oldAmount = Number(a.metadata.old_amount ?? 0);
    const newAmount = Number(a.metadata.new_amount ?? 0);
    const description = String(a.metadata.description ?? 'expense');

    switch (a.action) {
      case 'EXPENSE_CREATED':
        return <>{userName} added {description} <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatIndianNumberCompact(amount)}</span></>;
      case 'EXPENSE_UPDATED':
        return <>{userName} updated expense from <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatIndianNumberCompact(oldAmount)}</span> → <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatIndianNumberCompact(newAmount)}</span></>;
      case 'EXPENSE_DELETED':
        return <>{userName} deleted {description} ({formatIndianNumberCompact(amount)})</>;
      case 'SETTLEMENT_CREATED':
        return <>{userName} paid <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>{formatIndianNumberCompact(amount)}</span></>;
      default:
        return <>{`${a.user.name} performed an action`}</>;
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--border)', marginLeft: 9 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {activity.map((a) => (
          <div key={a.id} style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ position: 'absolute', left: -20, top: 6, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary)', border: '2px solid var(--bg-primary)', zIndex: 1 }} />
            <Avatar name={a.user.name} size={32} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{renderActivityText(a)}</p>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>{formatRelativeTime(a.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
