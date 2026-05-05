'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { CreateGroupModal, Avatar } from '@/components/GroupComponents';
import { useToast } from '@/components/Toast';
import { GroupInvitation, GroupWithDetails } from '@/lib/types';
import { useRouter } from 'next/navigation';

/** Format a rupee amount into compact Indian notation (Lakh / Crore). */
function formatIndianCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_00_00_000) {
    const val = (abs / 1_00_00_000).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}₹${val} Cr`;
  }
  if (abs >= 1_00_000) {
    const val = (abs / 1_00_000).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}₹${val} L`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}₹${val} K`;
  }
  return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingInvitation, setUpdatingInvitation] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { show, ToastContainer } = useToast();
  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, invitationsRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/group-invitations'),
      ]);
      const [groupsData, invitationsData] = await Promise.all([
        groupsRes.json(),
        invitationsRes.json(),
      ]);
      setGroups(groupsData.groups ?? []);
      setInvitations(invitationsData.invitations ?? []);
    } catch {
      show('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, [fetchDashboard]);

  const respondToInvitation = async (groupId: string, action: 'accept' | 'decline') => {
    setUpdatingInvitation(groupId);
    try {
      const res = await fetch('/api/group-invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update invitation');
      show(action === 'accept' ? 'Invitation accepted' : 'Invitation declined', 'success');
      await fetchDashboard();
    } catch (error) {
      show(error instanceof Error ? error.message : 'Failed to update invitation', 'error');
    } finally {
      setUpdatingInvitation(null);
    }
  };

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

        <InvitationPanel
          invitations={invitations}
          updatingInvitation={updatingInvitation}
          onRespond={respondToInvitation}
        />

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }} className="animate-fade-in">
          {[
            { label: 'Total Groups', value: groups.length, icon: '◈', color: 'var(--accent-primary)' },
            { label: 'Total Expenses', value: formatIndianCurrency(totalExpenses), icon: '₹', color: 'var(--accent-secondary)' },
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
            fetchDashboard();
            router.push(`/groups/${id}`);
          }}
        />
      )}
      <ToastContainer />
    </>
  );
}

function InvitationPanel({
  invitations,
  updatingInvitation,
  onRespond,
}: {
  invitations: GroupInvitation[];
  updatingInvitation: string | null;
  onRespond: (groupId: string, action: 'accept' | 'decline') => void;
}) {
  if (invitations.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {invitations.map((invitation) => {
          const isUpdating = updatingInvitation === invitation.group_id;
          return (
            <div
              key={invitation.group_id}
              className="glass-card"
              style={{
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                borderColor: 'rgba(245, 158, 11, 0.35)',
              }}
            >
              <Avatar name={invitation.group_name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--accent-warning)', fontWeight: 700, marginBottom: 2 }}>
                  Group invitation
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{invitation.group_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {invitation.invited_by_name ? `${invitation.invited_by_name} invited you` : 'You were invited'}
                  {' '}· {invitation.accepted_member_count} current member{invitation.accepted_member_count === 1 ? '' : 's'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-secondary"
                  onClick={() => onRespond(invitation.group_id, 'decline')}
                  disabled={isUpdating}
                >
                  Decline
                </button>
                <button
                  className="btn-primary"
                  onClick={() => onRespond(invitation.group_id, 'accept')}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Join'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
              {formatIndianCurrency(group.total_expenses ?? 0)}
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
