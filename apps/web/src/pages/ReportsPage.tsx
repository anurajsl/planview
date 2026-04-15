import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useProjects } from '../hooks/useTimeline';
import { reportsApi } from '../api/client';
import ThemeToggle from '../components/common/ThemeToggle';

const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6', done: '#22c55e', delayed: '#ef4444', planned: '#94a3b8',
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: projects } = useProjects();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [velocity, setVelocity] = useState<any>(null);
  const [burndown, setBurndown] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [workload, setWorkload] = useState<any>(null);

  useEffect(() => {
    if (projects?.length && !projectId) setProjectId(projects[0].id);
  }, [projects, projectId]);

  useEffect(() => {
    if (!projectId) return;
    reportsApi.velocity(projectId).then(setVelocity).catch(() => {});
    reportsApi.burndown(projectId).then(setBurndown).catch(() => {});
    reportsApi.statusBreakdown(projectId).then(setStatusData).catch(() => {});
    reportsApi.memberWorkload(projectId).then(setWorkload).catch(() => {});
  }, [projectId]);

  const maxVelocity = velocity?.weeks?.length
    ? Math.max(...velocity.weeks.map((w: any) => w.completed), 1)
    : 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      {/* Header */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 3px var(--shadow)',
      }}>
        <button onClick={() => navigate('/')} style={linkBtnStyle}>← Gantt</button>
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>📊 Reports</div>
        <select
          value={projectId || ''}
          onChange={(e) => setProjectId(e.target.value)}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--bg-input)',
            color: 'var(--text-primary)', fontFamily: 'inherit',
          }}
        >
          {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
      </div>

      {/* Dashboard grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16, padding: 20, maxWidth: 1200, margin: '0 auto',
      }}>

        {/* Velocity Chart */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>🚀 Velocity (stories/week)</div>
          {velocity?.weeks?.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, padding: '8px 0' }}>
              {velocity.weeks.map((w: any, i: number) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>{w.completed}</span>
                  <div style={{
                    width: '100%', maxWidth: 32, borderRadius: 4,
                    height: `${(w.completed / maxVelocity) * 80 + 4}px`,
                    background: '#3b82f6', transition: 'height 0.3s',
                  }} />
                  <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                    {new Date(w.week).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyStyle}>No completed stories yet</div>
          )}
          {velocity?.average > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Average: <span style={{ fontWeight: 700, color: '#3b82f6' }}>{velocity.average}</span> stories/week
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>📋 Status Breakdown</div>
          {statusData?.breakdown?.length > 0 ? (
            <>
              {/* Stacked bar */}
              <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                {statusData.breakdown.map((s: any) => (
                  <div key={s.status} style={{
                    width: `${s.percentage}%`, background: STATUS_COLORS[s.status] || '#94a3b8',
                    minWidth: s.percentage > 0 ? 4 : 0, transition: 'width 0.3s',
                  }} title={`${s.status}: ${s.count}`} />
                ))}
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {statusData.breakdown.map((s: any) => (
                  <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[s.status] || '#94a3b8' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {s.status} ({s.count})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={emptyStyle}>No stories yet</div>
          )}
        </div>

        {/* Burndown Chart */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>📉 Burndown</div>
          {burndown?.points?.length > 0 ? (
            <svg viewBox={`0 0 ${burndown.points.length} ${burndown.total + 2}`} style={{ width: '100%', height: 140 }} preserveAspectRatio="none">
              {/* Ideal line */}
              <polyline
                points={burndown.points.map((p: any, i: number) => `${i},${p.ideal}`).join(' ')}
                fill="none" stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="2 1"
              />
              {/* Actual line */}
              <polyline
                points={burndown.points.map((p: any, i: number) => `${i},${p.remaining}`).join(' ')}
                fill="none" stroke="#3b82f6" strokeWidth={0.8}
              />
              {/* Fill under actual */}
              <polygon
                points={`0,${burndown.total} ${burndown.points.map((p: any, i: number) => `${i},${p.remaining}`).join(' ')} ${burndown.points.length - 1},${burndown.total}`}
                fill="#3b82f620"
              />
            </svg>
          ) : (
            <div style={emptyStyle}>Not enough data for burndown</div>
          )}
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>— Actual</span>
            <span style={{ borderBottom: '1px dashed #e5e7eb' }}>--- Ideal</span>
            <span style={{ marginLeft: 'auto' }}>Total: {burndown?.total || 0} stories</span>
          </div>
        </div>

        {/* Member Workload */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>👥 Team Workload</div>
          {workload?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workload.map((m: any) => (
                <div key={m.assigneeId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff', background: m.color, flexShrink: 0,
                  }}>{m.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 2, background: 'var(--border)' }}>
                      <div style={{ width: `${(m.done / Math.max(m.total, 1)) * 100}%`, background: '#22c55e' }} />
                      <div style={{ width: `${(m.active / Math.max(m.total, 1)) * 100}%`, background: '#3b82f6' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                    {m.done}/{m.total}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyStyle}>No assigned stories</div>
          )}
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)', borderRadius: 12, padding: 20,
  border: '1px solid var(--border)', boxShadow: '0 1px 3px var(--shadow)',
};
const cardTitleStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12,
};
const emptyStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center',
};
const linkBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
};
