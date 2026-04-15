import { useTimelineStore } from '../../stores/timeline.store';

interface SmartSummaryProps {
  summary: {
    dueToday: number;
    startingToday: number;
    overdue: number;
    completedToday: number;
    totalActive: number;
  };
}

const CARDS = [
  { key: 'dueToday', label: 'Due Today', color: '#f59e0b', icon: '📅' },
  { key: 'startingToday', label: 'Starting', color: '#3b82f6', icon: '🚀' },
  { key: 'overdue', label: 'Overdue', color: '#ef4444', icon: '⚠️' },
  { key: 'completedToday', label: 'Completed', color: '#22c55e', icon: '✅' },
] as const;

export default function SmartSummary({ summary }: SmartSummaryProps) {
  const { summaryOpen, toggleSummary } = useTimelineStore();

  if (!summaryOpen) {
    return (
      <button
        onClick={toggleSummary}
        className="absolute bottom-4 right-4 z-30 bg-[#1e3a5f] text-white border-none cursor-pointer rounded-[10px] px-3.5 py-2 text-xs font-semibold shadow-lg flex items-center gap-1.5"
        style={{ fontFamily: 'inherit', boxShadow: '0 2px 12px rgba(30,58,95,0.3)' }}
      >
        📊 Pulse
        {summary.overdue > 0 && (
          <span className="bg-red-500 rounded-lg px-1.5 py-0.5 text-[10px] font-extrabold">
            {summary.overdue}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="absolute bottom-4 right-4 z-30 bg-white rounded-xl p-3.5 shadow-xl border border-slate-200 min-w-[220px]"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Today&apos;s Pulse</span>
        <button onClick={toggleSummary} className="bg-transparent border-none cursor-pointer text-sm text-slate-400 p-0">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CARDS.map(({ key, label, color, icon }) => (
          <div
            key={key}
            className="px-2.5 py-2 rounded-lg"
            style={{ background: color + '08', border: `1px solid ${color}18` }}
          >
            <div className="flex items-center gap-1">
              <span className="text-[13px]">{icon}</span>
              <span className="text-xl font-extrabold" style={{ color }}>
                {(summary as any)[key]}
              </span>
            </div>
            <div className="text-[10.5px] text-slate-500 font-semibold mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
