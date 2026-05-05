'use client';

import { Avatar } from '@/components/Avatar';
import { GroupWithDetails } from '@/lib/types';

export function MembersTab({
  members, addMemberEmail, setAddMemberEmail, onAddMember, addingMember,
}: {
  members: GroupWithDetails['members'];
  addMemberEmail: string;
  setAddMemberEmail: (v: string) => void;
  onAddMember: () => void;
  addingMember: boolean;
}) {
  return (
    <div>
      <div className="glass-card" style={{ padding: '20px', marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Invite Member</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" placeholder="existing-user@example.com" value={addMemberEmail} onChange={(e) => setAddMemberEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onAddMember()} style={{ flex: 1 }} />
          <button className="btn-primary" onClick={onAddMember} disabled={addingMember} style={{ flexShrink: 0 }}>{addingMember ? '...' : 'Invite'}</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>The user must already have an account. They will join after accepting the invitation.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map((m) => (
          <div key={m.id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={m.name} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.email}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
