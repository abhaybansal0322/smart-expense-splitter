'use client';

import { formatIndianCurrency, formatIndianNumberCompact } from '@/lib/formatCurrency';

interface StatsBarProps {
  groupsCount: number;
  totalExpenses: number;
  totalPending: number;
}

export function StatsBar({ groupsCount, totalExpenses, totalPending }: StatsBarProps) {
  const stats = [
    { label: 'Total Groups', value: groupsCount, icon: '◈', color: 'var(--accent-primary)' },
    { label: 'Total Expenses', value: formatIndianNumberCompact(totalExpenses), icon: '₹', color: 'var(--accent-secondary)' },
    { label: 'Pending Settlements', value: totalPending, icon: '⏳', color: totalPending > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }} className="animate-fade-in">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${stat.color}1a`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: stat.color,
            }}>
              {stat.icon}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
