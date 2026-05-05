'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { CreateGroupModal, JoinGroupModal } from '@/components/GroupComponents';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { useDashboard } from '@/hooks/useDashboard';
import { InvitationPanel } from '@/features/dashboard/InvitationPanel';

export default function GroupsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const { show, ToastContainer } = useToast();
  const router = useRouter();

  const {
    groups,
    invitations,
    loading,
    updatingInvitation,
    respondToInvitation,
  } = useDashboard(show);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>All Groups</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage all your expense groups</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => setShowJoin(true)}>Join with code</button>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Group</button>
          </div>
        </div>

        <InvitationPanel
          invitations={invitations}
          updatingInvitation={updatingInvitation}
          onRespond={respondToInvitation}
        />

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
                    {g.join_code && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        Code <span style={{ color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: 1 }}>{g.join_code}</span>
                      </div>
                    )}
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
      {showJoin && (
        <JoinGroupModal
          onClose={() => setShowJoin(false)}
          onJoined={(id) => {
            setShowJoin(false);
            show('Group joined!', 'success');
            router.push(`/groups/${id}`);
          }}
        />
      )}
      <ToastContainer />
    </>
  );
}
