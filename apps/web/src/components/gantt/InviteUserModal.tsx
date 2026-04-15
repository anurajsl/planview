import { useState } from 'react';
import Modal from '../common/Modal';
import { useInvitations, useInviteUser, useRevokeInvitation } from '../../hooks/useTimeline';
import { useToastStore } from '../../stores/toast.store';

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
}

const ROLES = [
  { value: 'member', label: 'Member', desc: 'Can view and edit stories' },
  { value: 'admin', label: 'Admin', desc: 'Can manage members and settings' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access' },
];

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  accepted: { bg: '#d1fae5', color: '#065f46', label: 'Accepted' },
  expired: { bg: '#f3f4f6', color: '#6b7280', label: 'Expired' },
  revoked: { bg: '#fee2e2', color: '#991b1b', label: 'Revoked' },
};

export default function InviteUserModal({ open, onClose }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const toast = useToastStore();

  const { data: invitations } = useInvitations();
  const inviteUser = useInviteUser();
  const revokeInvite = useRevokeInvitation();

  const handleSubmit = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    inviteUser.mutate(
      { email: email.trim().toLowerCase(), role },
      {
        onSuccess: () => {
          toast.success(`Invitation sent to ${email}`);
          setEmail('');
          setRole('member');
        },
        onError: (err: any) => {
          setError(err.response?.data?.message || 'Failed to send invitation');
        },
      },
    );
  };

  const handleRevoke = (id: string, invEmail: string) => {
    revokeInvite.mutate(id, {
      onSuccess: () => toast.info(`Invitation to ${invEmail} revoked`),
      onError: () => toast.error('Failed to revoke invitation'),
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'inherit',
    color: '#374151', outline: 'none', background: '#fafbfc',
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite Team Members">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{
            fontSize: 12, color: '#ef4444', background: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px',
          }}>
            {error}
          </div>
        )}

        {/* Email input */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            Email Address *
          </label>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="colleague@company.com"
            style={inputStyle}
          />
        </div>

        {/* Role selector */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
            Role
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                  border: `1.5px solid ${role === r.value ? '#3b82f6' : '#e5e7eb'}`,
                  background: role === r.value ? '#eff6ff' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: `2px solid ${role === r.value ? '#3b82f6' : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {role === r.value && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Send button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={inviteUser.isPending}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#1e3a5f', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: inviteUser.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: inviteUser.isPending ? 0.6 : 1,
            }}
          >
            {inviteUser.isPending ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>

        {/* Pending invitations list */}
        {invitations && invitations.length > 0 && (
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Invitations ({invitations.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {invitations.map((inv: any) => {
                const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.pending;
                return (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 6,
                      background: '#fafbfc', border: '1px solid #f3f4f6',
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: '#374151', flex: 1, fontWeight: 500 }}>
                      {inv.email}
                    </span>
                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>
                      {inv.role}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                      background: badge.bg, color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => handleRevoke(inv.id, inv.email)}
                        style={{
                          fontSize: 10, color: '#ef4444', background: 'none',
                          border: 'none', cursor: 'pointer', fontWeight: 600,
                          padding: '2px 4px',
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
