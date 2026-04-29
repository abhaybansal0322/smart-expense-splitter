'use client';

import { useCallback, useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { CreateGroupModal } from '@/components/GroupComponents';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { GroupInvitation, GroupWithDetails } from '@/lib/types';
import Link from 'next/link';
import { Avatar } from '@/components/GroupComponents';

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingInvitation, setUpdatingInvitation] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { show, ToastContainer } = useToast();
  const router = useRouter();

  const fetchGroups = useCallback(async () => {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
  }, [fetchGroups]);

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
      await fetchGroups();
    } catch (error) {
      show(error instanceof Error ? error.message : 'Failed to update invitation', 'error');
    } finally {
      setUpdatingInvitation(null);
    }
  };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>All Groups</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage all your expense groups</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Group</button>
        </div>

        {invitations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {invitations.map((invitation) => {
              const isUpdating = updatingInvitation === invitation.group_id;
              return (
                <div key={invitation.group_id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderColor: 'rgba(245, 158, 11, 0.35)' }}>
                  <Avatar name={invitation.group_name} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--accent-warning)', fontWeight: 700 }}>Group invitation</div>
                    <div style={{ fontWeight: 700 }}>{invitation.group_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {invitation.invited_by_name ? `${invitation.invited_by_name} invited you` : 'You were invited'}
                    </div>
                  </div>
                  <button className="btn-secondary" onClick={() => respondToInvitation(invitation.group_id, 'decline')} disabled={isUpdating}>Decline</button>
                  <button className="btn-primary" onClick={() => respondToInvitation(invitation.group_id, 'accept')} disabled={isUpdating}>
                    {isUpdating ? 'Updating...' : 'Join'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', border: '1px dashed var(--border)', borderRadius: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◈</div>
            <p style={{ color: 'var(--text-muted)' }}>No groups yet. Create one to get started.</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 20 }}>+ Create Group</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(124,111,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>◈</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</div>
                    {g.description && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{g.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {Array.isArray(g.members) && g.members.slice(0, 4).map((m, i) => (
                      <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                        <Avatar name={m.name} size={30} />
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>₹{(g.total_expenses ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.member_count} members</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
                </div>
              </Link>
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
            router.push(`/groups/${id}`);
          }}
        />
      )}
      <ToastContainer />
    </>
  );
}
