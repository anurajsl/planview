import { useMemo } from 'react';

interface ResourceViewProps {
  stories: any[];
  members: any[];
  onSelectStory: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6',
  done: '#22c55e',
  delayed: '#ef4444',
  planned: '#94a3b8',
};

const todayStr = () => new Date().toISOString().split('T')[0];

export default function ResourceView({ stories, members, onSelectStory }: ResourceViewProps) {
  const today = todayStr();

  const grouped = useMemo(() => {
    const map = new Map<string, { member: any; stories: any[]; activeCount: number; overloaded: boolean }>();

    // Group by assignee
    for (const story of stories) {
      const key = story.assigneeId || '__unassigned';
      if (!map.has(key)) {
        const member = members.find((m: any) => m.id === story.assigneeId) || {
          id: '__unassigned', name: 'Unassigned', initials: '?', color: '#94a3b8',
        };
        map.set(key, { member, stories: [], activeCount: 0, overloaded: false });
      }
      const group = map.get(key)!;
      group.stories.push(story);
      if (story.status === 'active') group.activeCount++;
    }

    // Mark overloaded (>3 active stories)
    for (const group of map.values()) {
      group.overloaded = group.activeCount > 3;
      group.stories.sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
    }

    // Sort: overloaded first, then by active count desc
    return Array.from(map.values()).sort((a, b) => {
      if (a.overloaded !== b.overloaded) return a.overloaded ? -1 : 1;
      return b.activeCount - a.activeCount;
    });
  }, [stories, members]);

  return (
    <div style={{ padding: 20, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        Resource Workload
      </div>

      {grouped.map(({ member, stories: memberStories, activeCount, overloaded }) => (
        <div
          key={member.id}
          style={{
            marginBottom: 16, borderRadius: 10, overflow: 'hidden',
            border: `1px solid ${overloaded ? '#fecaca' : 'var(--border)'}`,
            background: 'var(--bg-surface)',
          }}
        >
          {/* Member header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: overloaded ? '#fef2f2' : 'var(--bg-surface)',
            borderBottom: `1px solid ${overloaded ? '#fecaca' : 'var(--border-light)'}`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: member.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
              border: overloaded ? '2px solid #ef4444' : '2px solid #fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}>
              {member.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {member.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {activeCount} active · {memberStories.length} total
              </div>
            </div>
            {overloaded && (
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#ef4444',
                background: '#fef2f2', padding: '3px 8px', borderRadius: 6,
                border: '1px solid #fecaca',
              }}>
                ⚠️ Overloaded
              </div>
            )}

            {/* Workload bar */}
            <div style={{ width: 80, height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${Math.min(100, (activeCount / 5) * 100)}%`,
                background: overloaded ? '#ef4444' : activeCount > 2 ? '#f59e0b' : '#22c55e',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {/* Story list */}
          <div style={{ padding: '4px 8px 8px' }}>
            {memberStories.map((story: any) => {
              const isOverdue = story.status !== 'done' && story.endDate < today;
              const color = isOverdue ? '#ef4444' : STATUS_COLORS[story.status] || '#94a3b8';
              return (
                <div
                  key={story.id}
                  onClick={() => onSelectStory(story.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 12.5, color: 'var(--text-primary)', flex: 1,
                    textDecoration: story.status === 'done' ? 'line-through' : 'none',
                    opacity: story.status === 'done' ? 0.5 : 1,
                  }}>
                    {story.name}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                    {story.progress}%
                  </span>
                  {isOverdue && (
                    <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>overdue</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No stories assigned yet</div>
        </div>
      )}
    </div>
  );
}
