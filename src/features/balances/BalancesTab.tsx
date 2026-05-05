'use client';

import { Avatar } from '@/components/Avatar';
import { UserBalance } from '@/lib/types';
import { formatIndianNumberCompact } from '@/lib/formatCurrency';

export function BalancesTab({ balances }: { balances: UserBalance[] }) {
  if (balances.length === 0) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No balance data yet</div>;
  }

  const max = Math.max(...balances.map((b) => Math.abs(b.net_balance)), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {balances.map((b) => {
        const isPositive = b.net_balance >= 0;
        const barWidth = Math.abs(b.net_balance) / max;

        return (
          <div key={b.user_id} className="glass-card" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <Avatar name={b.name} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 20, fontWeight: 800,
                  color: isPositive ? 'var(--accent-success)' : 'var(--accent-danger)',
                }}>
                  {isPositive ? '+' : '-'} {formatIndianNumberCompact(Math.abs(b.net_balance))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {isPositive ? 'is owed' : 'owes'}
                </div>
              </div>
            </div>
            {/* Balance bar */}
            <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${barWidth * 100}%`,
                background: isPositive ? 'var(--accent-success)' : 'var(--accent-danger)',
                borderRadius: 3, transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
