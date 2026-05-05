'use client';

import { Avatar } from '@/components/Avatar';
import { GroupInvitation } from '@/lib/types';

interface InvitationPanelProps {
  invitations: GroupInvitation[];
  updatingInvitation: string | null;
  onRespond: (groupId: string, action: 'accept' | 'decline') => void;
}

export function InvitationPanel({
  invitations,
  updatingInvitation,
  onRespond,
}: InvitationPanelProps) {
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
