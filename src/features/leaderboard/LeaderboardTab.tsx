'use client';

import { GroupLeaderboardEntry } from '@/lib/types';

export function LeaderboardTab({ leaderboard }: { leaderboard: GroupLeaderboardEntry[] }) {
  if (leaderboard.length === 0) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No leaderboard data yet</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {leaderboard.map((entry) => (
        <div key={entry.user_id} className="glass-card" style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '56px 1fr auto', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            color: entry.rank === 1 ? '#f59e0b' : 'var(--text-secondary)',
            background: entry.rank === 1 ? 'rgba(245, 158, 11, 0.14)' : 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}>
            #{entry.rank}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800 }}>{entry.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.email}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <span className="badge badge-purple">Paid Rs. {entry.total_paid.toFixed(2)}</span>
              <span className="badge badge-green">Settled Rs. {entry.settled_paid.toFixed(2)}</span>
              <span className="badge">{entry.settleups_confirmed} settle ups</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-primary)' }}>{entry.score.toFixed(0)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>smart score</div>
          </div>
        </div>
      ))}
    </div>
  );
}
