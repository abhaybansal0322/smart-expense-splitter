'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { CreateGroupModal, Avatar } from '@/components/GroupComponents';
import { useToast } from '@/components/Toast';
import { GroupWithDetails } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { show, ToastContainer } = useToast();
  const router = useRouter();

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data.groups ?? []);
    } catch {
      show('Failed to load groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const totalPending = groups.reduce((s, g) => s + (g.pending_settlements ?? 0), 0);
  const totalExpenses = groups.reduce((s, g) => s + (g.total_expenses ?? 0), 0);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }} className="animate-fade-in">
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Expense Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              Track and settle group expenses with zero friction
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ fontSize: 15, padding: '12px 24px' }}>
            + New Group
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }} className="animate-fade-in">
          {[
            { label: 'Total Groups', value: groups.length, icon: '◈', color: 'var(--accent-primary)' },
            { label: 'Total Expenses', value: `₹${totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: '₹', color: 'var(--accent-secondary)' },
            { label: 'Pending Settlements', value: totalPending, icon: '⏳', color: totalPending > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' },
          ].map((stat) => (
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

        {/* Groups grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card" style={{ padding: 24, height: 180 }}>
                <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 14, width: '80%' }} />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed var(--border)', borderRadius: 20,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No groups yet</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Create a group to start splitting expenses with friends</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              + Create First Group
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            show('Group created!', 'success');
            fetchGroups();
            router.push(`/groups/${id}`);
          }}
        />
      )}
      <ToastContainer />
    </>
  );
}

function GroupCard({ group }: { group: GroupWithDetails }) {
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
              ₹{(group.total_expenses ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
