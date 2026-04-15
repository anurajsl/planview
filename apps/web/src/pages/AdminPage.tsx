import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useUsers, useUpdateUserRole, useRemoveUser, useTenant, useUpdateTenant, useAuditLogs } from '../hooks/useAdmin';
import { useBillingUsage } from '../hooks/useTimeline';
import { useToastStore } from '../stores/toast.store';
import { integrationsApi } from '../api/client';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ThemeToggle from '../components/common/ThemeToggle';

type Tab = 'members' | 'settings' | 'usage' | 'audit' | 'integrations';

const ROLES = ['viewer', 'member', 'manager', 'admin', 'owner'];
const ROLE_COLORS: Record<string, string> = {
  owner: '#8b5cf6', admin: '#3b82f6', manager: '#f59e0b', member: '#22c55e', viewer: '#94a3b8',
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('members');
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Access Denied</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Only Owners and Admins can access the admin console.</div>
          <button onClick={() => navigate('/')} style={linkBtnStyle}>← Back to Gantt</button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'members', label: 'Members', icon: '👥' },
    { key: 'settings', label: 'Organization', icon: '⚙️' },
    { key: 'usage', label: 'Usage', icon: '📊' },
    { key: 'integrations', label: 'Integrations', icon: '🔗' },
    { key: 'audit', label: 'Audit Log', icon: '📋' },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      {/* Header */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0,
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 3px var(--shadow)',
      }}>
        <button onClick={() => navigate('/')} style={{ ...linkBtnStyle, marginRight: 8 }}>← Gantt</button>
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Admin Console</div>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
        <div style={{
          width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', background: user?.color || '#6366f1',
        }}>
          {user?.initials}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar tabs */}
        <div style={{
          width: 200, padding: '16px 10px', borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                background: tab === t.key ? 'var(--bg-hover, #f1f5f9)' : 'transparent',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {tab === 'members' && <MembersTab currentUserId={user?.id || ''} />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'usage' && <UsageTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'audit' && <AuditTab />}
        </div>
      </div>
    </div>
  );
}

// ─── Members Tab ────────────────────────────────────────────

function MembersTab({ currentUserId }: { currentUserId: string }) {
  const { data: users, isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const removeUser = useRemoveUser();
  const toast = useToastStore();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  if (isLoading) return <Loading />;

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        Team Members ({users?.length || 0})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users?.map((u: any) => (
          <div key={u.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', background: u.color || '#6366f1', flexShrink: 0,
            }}>
              {u.initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {u.name} {u.id === currentUserId && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(you)</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
            </div>

            {/* Role selector */}
            <select
              value={u.role}
              disabled={u.id === currentUserId || u.role === 'owner'}
              onChange={(e) => {
                updateRole.mutate(
                  { id: u.id, role: e.target.value },
                  {
                    onSuccess: () => toast.success(`Role updated to ${e.target.value}`),
                    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update role'),
                  },
                );
              }}
              style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1.5px solid ${ROLE_COLORS[u.role] || '#e5e7eb'}`,
                color: ROLE_COLORS[u.role] || 'var(--text-secondary)',
                background: `${ROLE_COLORS[u.role]}10` || 'transparent',
                cursor: u.id === currentUserId ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>

            {/* Remove button */}
            {u.id !== currentUserId && u.role !== 'owner' && (
              <button
                onClick={() => setConfirmRemove(u.id)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove Member"
        message="This will remove the user from your organization. They will lose access to all projects."
        onConfirm={() => {
          if (confirmRemove) {
            removeUser.mutate(confirmRemove, {
              onSuccess: () => { toast.success('User removed'); setConfirmRemove(null); },
              onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove user'),
            });
          }
        }}
        onClose={() => setConfirmRemove(null)}
      />
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────

function SettingsTab() {
  const { data: tenant, isLoading } = useTenant();
  const updateTenant = useUpdateTenant();
  const toast = useToastStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [dirty, setDirty] = useState(false);

  if (isLoading) return <Loading />;

  // Initialize form on first load
  if (tenant && !dirty && name === '') {
    setName(tenant.name || '');
    setSlug(tenant.slug || '');
  }

  const handleSave = () => {
    updateTenant.mutate(
      { name, slug },
      {
        onSuccess: () => { toast.success('Organization updated'); setDirty(false); },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
      },
    );
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        Organization Settings
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={labelStyle}>
          Organization Name
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); }}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Slug (URL identifier)
          <input
            value={slug}
            onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setDirty(true); }}
            style={inputStyle}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Used in URLs: planview.app/{slug}</span>
        </label>

        <label style={labelStyle}>
          Plan Tier
          <input value={tenant?.planTier?.toUpperCase() || 'FREE'} disabled style={{ ...inputStyle, opacity: 0.6 }} />
        </label>

        <button
          onClick={handleSave}
          disabled={!dirty || updateTenant.isPending}
          style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: 'none', background: dirty ? '#1e3a5f' : '#94a3b8', color: '#fff',
            cursor: dirty ? 'pointer' : 'not-allowed', fontFamily: 'inherit', alignSelf: 'flex-start',
          }}
        >
          {updateTenant.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Usage Tab ──────────────────────────────────────────────

function UsageTab() {
  const { data: usage, isLoading } = useBillingUsage();

  if (isLoading) return <Loading />;
  if (!usage) return <div style={{ color: 'var(--text-muted)' }}>No usage data available.</div>;

  const metrics = [
    { label: 'Projects', used: usage.usage.projects, max: usage.limits.maxProjects, pct: usage.percentages.projects, icon: '🏗️' },
    { label: 'Team Members', used: usage.usage.users, max: usage.limits.maxUsers, pct: usage.percentages.users, icon: '👥' },
    { label: 'Stories (largest project)', used: usage.usage.storiesInLargestProject, max: usage.limits.maxStories, pct: usage.percentages.stories, icon: '📋' },
  ];

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        Usage Dashboard
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        Current plan: {usage.planTier.charAt(0).toUpperCase() + usage.planTier.slice(1)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {metrics.map(({ label, used, max, pct, icon }) => (
          <div key={label} style={{
            padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-surface)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{icon} {label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                {used} / {max === -1 ? '∞' : max}
              </span>
            </div>
            <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--border, #e5e7eb)' }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.3s',
                width: max === -1 ? '5%' : `${Math.min(100, pct)}%`,
                background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e',
              }} />
            </div>
            {pct > 80 && max !== -1 && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, fontWeight: 500 }}>
                ⚠️ Approaching limit — consider upgrading your plan
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Audit Tab ──────────────────────────────────────────────

function AuditTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page);

  if (isLoading) return <Loading />;

  const logs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (data?.pageSize || 25));

  const actionColors: Record<string, string> = {
    CREATE: '#22c55e', UPDATE: '#3b82f6', DELETE: '#ef4444', LOGIN: '#8b5cf6', LOGOUT: '#94a3b8', EXPORT: '#f59e0b',
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        Audit Log
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {total} total entries
      </div>

      {logs.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No audit entries yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs.map((log: any) => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-surface)', fontSize: 12,
            }}>
              <span style={{
                padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                color: '#fff', background: actionColors[log.action] || '#94a3b8',
                minWidth: 52, textAlign: 'center',
              }}>
                {log.action}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{log.resourceType}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, flex: 1 }}>
                {log.resourceId?.slice(0, 8)}...
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={pageBtnStyle}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={pageBtnStyle}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Integrations Tab ───────────────────────────────────────

function IntegrationsTab() {
  const toast = useToastStore();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<string | null>(null); // 'jira' | 'gitlab' | null
  const [formData, setFormData] = useState({ baseUrl: '', apiToken: '', username: '', projectKey: '' });
  const [saving, setSaving] = useState(false);

  const loadIntegrations = async () => {
    try {
      const data = await integrationsApi.list();
      setIntegrations(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useState(() => { loadIntegrations(); });

  const handleSave = async (provider: string) => {
    setSaving(true);
    try {
      await integrationsApi.create({ provider, ...formData });
      toast.success(`${provider} connected successfully`);
      setShowForm(null);
      setFormData({ baseUrl: '', apiToken: '', username: '', projectKey: '' });
      loadIntegrations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to connect ${provider}`);
    }
    setSaving(false);
  };

  const handleTest = async (id: string, provider: string) => {
    try {
      await integrationsApi.test(id);
      toast.success(`${provider} connection is working`);
    } catch {
      toast.error(`${provider} connection failed`);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await integrationsApi.remove(id);
      toast.success('Integration removed');
      loadIntegrations();
    } catch {
      toast.error('Failed to remove integration');
    }
  };

  if (loading) return <Loading />;

  const jira = integrations.find((i: any) => i.provider === 'jira');
  const gitlab = integrations.find((i: any) => i.provider === 'gitlab');
  const existingMap = new Map(integrations.map((i: any) => [i.provider, i]));

  const PROVIDERS = [
    { key: 'jira', name: 'Jira', icon: '🔵', desc: 'Link stories to Jira issues. Requires Atlassian API token.', urlPlaceholder: 'https://yourteam.atlassian.net', needsUsername: true, needsToken: true },
    { key: 'gitlab', name: 'GitLab', icon: '🦊', desc: 'Link stories to GitLab issues and merge requests.', urlPlaceholder: 'https://gitlab.com', needsUsername: false, needsToken: true },
    { key: 'slack', name: 'Slack', icon: '💬', desc: 'Get notifications in Slack when stories are created or completed.', urlPlaceholder: 'https://hooks.slack.com/services/...', needsUsername: false, needsToken: false },
    { key: 'teams', name: 'Microsoft Teams', icon: '🟣', desc: 'Get notifications in Teams channels.', urlPlaceholder: 'https://outlook.office.com/webhook/...', needsUsername: false, needsToken: false },
    { key: 'google_chat', name: 'Google Chat', icon: '🟢', desc: 'Get notifications in Google Chat spaces.', urlPlaceholder: 'https://chat.googleapis.com/v1/spaces/...', needsUsername: false, needsToken: false },
  ];

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        Integrations
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PROVIDERS.map((p) => {
          const existing = existingMap.get(p.key);
          const isFormOpen = showForm === p.key;

          return (
            <div key={p.key} style={{
              padding: '16px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                </div>
                {existing ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', background: '#22c55e15', padding: '2px 8px', borderRadius: 4 }}>Connected</span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', background: '#94a3b815', padding: '2px 8px', borderRadius: 4 }}>Not connected</span>
                )}
              </div>

              {existing && !isFormOpen && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>{existing.baseUrl}</span>
                  <button onClick={() => handleTest(existing.id, p.name)} style={smallBtnStyle}>Test</button>
                  <button onClick={() => handleRemove(existing.id)} style={{ ...smallBtnStyle, color: '#ef4444', borderColor: '#fecaca' }}>Remove</button>
                </div>
              )}

              {!existing && !isFormOpen && (
                <button onClick={() => setShowForm(p.key)} style={{ ...smallBtnStyle, marginTop: 8 }}>
                  + Connect {p.name}
                </button>
              )}

              {isFormOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  <input placeholder={p.urlPlaceholder} value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })} style={inputStyle} />
                  {p.needsUsername && (
                    <input placeholder="Email / Username" value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={inputStyle} />
                  )}
                  {p.needsToken && (
                    <input placeholder="API Token / Personal Access Token" type="password" value={formData.apiToken}
                      onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })} style={inputStyle} />
                  )}
                  {p.needsToken && (
                    <input placeholder="Project Key (optional)" value={formData.projectKey}
                      onChange={(e) => setFormData({ ...formData, projectKey: e.target.value })} style={inputStyle} />
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleSave(p.key)} disabled={saving || !formData.baseUrl || (p.needsToken && !formData.apiToken)}
                      style={{ ...smallBtnStyle, background: '#1e3a5f', color: '#fff', border: 'none', opacity: saving ? 0.6 : 1 }}>
                      {saving ? 'Connecting...' : 'Connect'}
                    </button>
                    <button onClick={() => setShowForm(null)} style={smallBtnStyle}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
  border: '1px solid var(--border, #e5e7eb)', background: 'transparent',
  color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
};

// ─── Shared Styles ──────────────────────────────────────────

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
      <div style={{ width: 16, height: 16, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      Loading...
    </div>
  );
}

const linkBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: '1px solid var(--border, #e5e7eb)', background: 'transparent',
  color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 12,
};

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  border: '1px solid var(--border, #e5e7eb)', background: 'var(--bg-surface, #fff)',
  color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none',
};

const pageBtnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
  border: '1px solid var(--border, #e5e7eb)', background: 'transparent',
  color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
};
