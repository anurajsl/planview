import { useState } from 'react';

interface DetailDrawerProps {
  story: any;
  subtasks: any[];
  dependencies: any[];
  allStories: any[];
  features: any[];
  members: any[];
  onUpdate: (data: any) => void;
  onDelete?: (id: string, name: string) => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: '#94a3b8' },
  { value: 'active', label: 'Active', color: '#3b82f6' },
  { value: 'done', label: 'Done', color: '#22c55e' },
  { value: 'delayed', label: 'Delayed', color: '#ef4444' },
];

const formatDate = (s: string) => {
  const dt = new Date(s + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

export default function DetailDrawer({
  story, subtasks, dependencies, allStories, features, members, onUpdate, onDelete, onClose,
}: DetailDrawerProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!story) return null;

  const feature = features.find((f: any) => f.id === story.featureId);
  const assignee = members.find((m: any) => m.id === story.assigneeId);
  const isOverdue = story.status !== 'done' && story.endDate < new Date().toISOString().split('T')[0];
  const statusInfo = STATUS_OPTIONS.find((s) => s.value === story.status) || STATUS_OPTIONS[0];

  const startEdit = (field: string, val: string) => {
    setEditing(field);
    setEditValue(val);
  };
  const commitEdit = (field: string) => {
    if (editValue !== story[field]) {
      onUpdate({ [field]: editValue });
    }
    setEditing(null);
  };

  return (
    <div
      className="w-[340px] flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto shadow-[-2px_0_12px_rgba(0,0,0,0.04)]"
      style={{ animation: 'slideIn 0.2s ease' }}
    >
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* Header */}
      <div className="px-[18px] py-4 border-b border-slate-100 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {feature?.name || 'Uncategorized'}
          </div>
          {editing === 'name' ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit('name')}
              onKeyDown={(e) => e.key === 'Enter' && commitEdit('name')}
              className="text-base font-bold text-slate-800 w-full border-b-2 border-blue-500 outline-none bg-transparent"
            />
          ) : (
            <div
              className="text-base font-bold text-slate-800 leading-snug cursor-pointer hover:text-blue-600"
              onClick={() => startEdit('name', story.name)}
            >
              {story.name}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md bg-slate-100 border-none cursor-pointer text-sm text-slate-500 flex items-center justify-center hover:bg-slate-200"
        >
          ✕
        </button>
      </div>

      {/* Status selector */}
      <div className="px-[18px] py-3">
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ status: opt.value })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all"
              style={{
                background: story.status === opt.value ? opt.color + '15' : 'transparent',
                border: `1.5px solid ${story.status === opt.value ? opt.color : '#e5e7eb'}`,
                color: story.status === opt.value ? opt.color : '#9ca3af',
              }}
            >
              <div className="w-[7px] h-[7px] rounded-full" style={{ background: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
        {isOverdue && (
          <div className="mt-2 text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-200 inline-block">
            ⚠️ {Math.abs(daysBetween(story.endDate, new Date().toISOString().split('T')[0]))} days overdue
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="px-[18px]">
        {[
          { label: 'Assignee', value: assignee?.name || 'Unassigned', icon: '👤' },
          { label: 'Start', value: formatDate(story.startDate), icon: '📅', field: 'startDate' },
          { label: 'End', value: formatDate(story.endDate), icon: '🏁', field: 'endDate' },
          { label: 'Duration', value: `${daysBetween(story.startDate, story.endDate) + 1} days`, icon: '⏱️' },
          { label: 'Progress', value: `${story.progress}%`, icon: '📊' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-center py-2.5 border-b border-slate-50">
            <span className="text-sm mr-2 w-5 text-center">{icon}</span>
            <span className="text-xs text-slate-400 font-semibold w-20">{label}</span>
            <span className="text-[13px] text-slate-700 font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="px-[18px] py-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Progress</div>
        <div className="w-full h-2 rounded bg-slate-100">
          <div
            className="h-full rounded transition-all"
            style={{
              width: `${story.progress}%`,
              background: story.progress === 100 ? '#22c55e' : '#3b82f6',
            }}
          />
        </div>
      </div>

      {/* Subtasks */}
      {subtasks.length > 0 && (
        <div className="px-[18px] pb-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Subtasks ({subtasks.filter((s: any) => s.status === 'done').length}/{subtasks.length})
          </div>
          {subtasks.map((st: any) => {
            const stColor = st.status === 'done' ? '#22c55e' : st.status === 'active' ? '#3b82f6' : '#94a3b8';
            return (
              <div key={st.id} className="flex items-center gap-2 px-2.5 py-[7px] rounded-md mb-[3px] bg-[#fafbfc] border border-slate-100">
                <div
                  className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[9px] text-white"
                  style={{
                    border: `2px solid ${stColor}`,
                    background: st.status === 'done' ? stColor : 'transparent',
                  }}
                >
                  {st.status === 'done' && '✓'}
                </div>
                <span
                  className="text-[12.5px] flex-1"
                  style={{
                    color: st.status === 'done' ? '#9ca3af' : '#374151',
                    textDecoration: st.status === 'done' ? 'line-through' : 'none',
                  }}
                >
                  {st.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Dependencies */}
      {dependencies.length > 0 && (
        <div className="px-[18px] pb-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dependencies</div>
          {dependencies.map((dep: any) => {
            const isFrom = dep.fromStoryId === story.id;
            const other = allStories.find((s: any) => s.id === (isFrom ? dep.toStoryId : dep.fromStoryId));
            return (
              <div key={dep.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md mb-[3px] bg-[#fafbfc] border border-slate-100 text-xs">
                <span className="font-bold" style={{ color: isFrom ? '#f59e0b' : '#8b5cf6' }}>
                  {isFrom ? '→ blocks' : '← blocked by'}
                </span>
                <span className="text-slate-700 font-medium flex-1 truncate">{other?.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Danger zone */}
      {onDelete && (
        <div className="px-[18px] pb-5 mt-2">
          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={() => onDelete(story.id, story.name)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              style={{
                border: '1px solid #fecaca',
                background: '#fff',
                color: '#ef4444',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              🗑️ Delete Story
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
