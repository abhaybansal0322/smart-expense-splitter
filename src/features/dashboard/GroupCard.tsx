'use client';

import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { GroupWithDetails } from '@/lib/types';
import { formatIndianNumberCompact } from '@/lib/formatCurrency';

export function GroupCard({ group }: { group: GroupWithDetails }) {
  const members = Array.isArray(group.members) ? group.members : [];
  const hasPending = (group.pending_settlements ?? 0) > 0;

  return (
    <Link href={`/groups/${group.id}`} style={{ textDecoration: 'none' }}>
      <div className="glass-card" style={{ padding: 24, cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{group.name}</h3>
            {group.description && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{group.description}</p>
            )}
          </div>
          {hasPending && (
            <span className="badge badge-yellow" style={{ flexShrink: 0 }}>
              {group.pending_settlements} pending
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          {members.slice(0, 5).map((m, i) => (
            <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: members.length - i }}>
              <Avatar name={m.name} size={32} />
            </div>
          ))}
          {members.length > 5 && (
            <div style={{
              marginLeft: -10, width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bg-elevated)', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
            }}>
              +{members.length - 5}
            </div>
          )}
          <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>TOTAL SPENT</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatIndianNumberCompact(group.total_expenses ?? 0)}
            </div>
          </div>
          <div style={{
            fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            View details →
          </div>
        </div>
      </div>
    </Link>
  );
}
