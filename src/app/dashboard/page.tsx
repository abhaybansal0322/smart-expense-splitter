'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { CreateGroupModal } from '@/components/GroupComponents';
import { useToast } from '@/components/Toast';
import { useDashboard } from '@/hooks/useDashboard';
import { InvitationPanel } from '@/features/dashboard/InvitationPanel';
import { GroupCard } from '@/features/dashboard/GroupCard';
import { StatsBar } from '@/features/dashboard/StatsBar';

export default function DashboardPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { show, ToastContainer } = useToast();
  const router = useRouter();

  const {
    groups,
    invitations,
    loading,
    updatingInvitation,
    fetchDashboard,
    respondToInvitation,
  } = useDashboard(show);

  const totalPending = groups.reduce((s, g) => s + (g.pending_settlements ?? 0), 0);
  const totalExpenses = groups.reduce((s, g) => s + (g.total_expenses ?? 0), 0);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }} className="animate-fade-in">
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
              splitkaro Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              Track and settle group expenses with zero friction.
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

        <StatsBar
          groupsCount={groups.length}
          totalExpenses={totalExpenses}
          totalPending={totalPending}
        />

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
            <div style={{ fontSize: 48, marginBottom: 16 }}>SK</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No groups yet</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Create a group to start splitting expenses with friends.</p>
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
