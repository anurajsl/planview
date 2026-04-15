import { useTimelineStore, ViewMode } from '../../stores/timeline.store';
import { useAuthStore } from '../../stores/auth.store';
import PresenceIndicator from '../common/PresenceIndicator';
import ThemeToggle from '../common/ThemeToggle';

interface OnlineUser {
  userId: string;
  name: string;
  initials: string;
  color: string;
  cursor?: { storyId: string | null };
}

interface TopBarProps {
  projects: any[];
  activeProjectId: string | null;
  onProjectChange: (id: string) => void;
  userName: string;
  userInitials: string;
  userColor: string;
  onCreateStory?: () => void;
  onCreateFeature?: () => void;
  onCreateProject?: () => void;
  onInviteUser?: () => void;
  onBilling?: () => void;
  onExportJson?: () => void;
  onExportCsv?: () => void;
  onlineUsers?: OnlineUser[];
  isConnected?: boolean;
}

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

const STATUS_CHIPS = [
  { key: 'active', label: 'Active', color: '#3b82f6' },
  { key: 'done', label: 'Done', color: '#22c55e' },
  { key: 'delayed', label: 'Delayed', color: '#ef4444' },
  { key: 'planned', label: 'Planned', color: '#94a3b8' },
];

export default function TopBar({
  projects, activeProjectId, onProjectChange, userName, userInitials, userColor,
  onCreateStory, onCreateFeature, onCreateProject, onInviteUser, onBilling,
  onExportJson, onExportCsv, onlineUsers, isConnected,
}: TopBarProps) {
  const { viewMode, setViewMode, mainView, setMainView, searchQuery, setSearch, statusFilters, toggleStatusFilter } =
    useTimelineStore();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="h-14 flex items-center gap-3 px-5 z-50 flex-shrink-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 3px var(--shadow)' }}>
      {/* Brand */}
      <div className="flex items-center gap-2.5 mr-2">
        <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#3b82f6] text-white text-sm font-bold">
          P
        </div>
        <span className="text-[17px] font-bold text-[#1e3a5f] tracking-tight">PlanView</span>
      </div>

      <div className="w-px h-7 bg-slate-200" />

      {/* Project selector */}
      <select
        value={activeProjectId || ''}
        onChange={(e) => onProjectChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 border border-slate-200 bg-[#fafbfc] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {projects.map((p: any) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Main view toggle */}
      <div className="flex rounded-lg overflow-hidden border border-slate-200">
        {[
          { key: 'gantt' as const, label: '📊 Gantt' },
          { key: 'resource' as const, label: '👥 Resources' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMainView(key)}
            className={`px-3 py-1.5 text-xs font-semibold border-none cursor-pointer transition-colors ${
              mainView === key
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
            style={{ fontFamily: 'inherit' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* View mode switcher (only in Gantt view) */}
      {mainView === 'gantt' && (
      <div className="flex rounded-lg overflow-hidden border border-slate-200">
        {VIEW_MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            className={`px-3.5 py-1.5 text-xs font-semibold tracking-wide border-none cursor-pointer transition-colors ${
              viewMode === key
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      {/* + New button */}
      <div className="relative group">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e3a5f] text-white cursor-pointer border-none hover:bg-[#264d78] transition-colors"
          style={{ fontFamily: 'inherit' }}
        >
          <span className="text-sm leading-none">+</span> New
        </button>
        <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          {onCreateStory && (
            <button
              onClick={onCreateStory}
              className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent font-medium"
              style={{ fontFamily: 'inherit' }}
            >
              📋 New Story
            </button>
          )}
          {onCreateFeature && (
            <button
              onClick={onCreateFeature}
              className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent font-medium"
              style={{ fontFamily: 'inherit' }}
            >
              📁 New Feature
            </button>
          )}
          {onCreateProject && (
            <>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={onCreateProject}
                className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent font-medium"
                style={{ fontFamily: 'inherit' }}
              >
                🏗️ New Project
              </button>
            </>
          )}
          {onInviteUser && (
            <button
              onClick={onInviteUser}
              className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent font-medium"
              style={{ fontFamily: 'inherit' }}
            >
              👤 Invite Member
            </button>
          )}
          {(onExportJson || onExportCsv) && (
            <>
              <div className="h-px bg-slate-100 my-1" />
              {onExportJson && (
                <button
                  onClick={onExportJson}
                  className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent font-medium"
                  style={{ fontFamily: 'inherit' }}
                >
                  📥 Export JSON
                </button>
              )}
              {onExportCsv && (
                <button
                  onClick={onExportCsv}
                  className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent font-medium"
                  style={{ fontFamily: 'inherit' }}
                >
                  📊 Export CSV
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-[#fafbfc] w-52">
        <span className="text-[13px] text-slate-400">🔍</span>
        <input
          type="text"
          placeholder="Search stories..."
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none outline-none bg-transparent text-[13px] text-slate-700 w-full font-[inherit]"
        />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-1">
        {STATUS_CHIPS.map(({ key, label, color }) => {
          const active = statusFilters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleStatusFilter(key)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all"
              style={{
                border: `1.5px solid ${active ? color : '#e5e7eb'}`,
                background: active ? `${color}15` : '#fff',
                color: active ? color : '#9ca3af',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="w-px h-7 bg-slate-200" />

      {/* Online collaborators */}
      {onlineUsers && (
        <PresenceIndicator onlineUsers={onlineUsers} isConnected={isConnected ?? false} />
      )}

      <div className="w-px h-7 bg-slate-200" />

      {/* User avatar + theme + billing + admin + logout */}
      <div className="flex items-center gap-2">
        {onBilling && (
          <button
            onClick={onBilling}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
            style={{
              border: '1px solid var(--border, #e5e7eb)',
              background: 'transparent',
              color: 'var(--text-secondary, #6b7280)',
              fontFamily: 'inherit',
            }}
          >
            💳 Plan
          </button>
        )}
        <a
          href="/admin"
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors no-underline"
          style={{
            border: '1px solid var(--border, #e5e7eb)',
            background: 'transparent',
            color: 'var(--text-secondary, #6b7280)',
            fontFamily: 'inherit',
          }}
        >
          ⚙️ Admin
        </a>
        <a
          href="/reports"
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors no-underline"
          style={{
            border: '1px solid var(--border, #e5e7eb)',
            background: 'transparent',
            color: 'var(--text-secondary, #6b7280)',
            fontFamily: 'inherit',
          }}
        >
          📊 Reports
        </a>
        <ThemeToggle />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white cursor-pointer"
          style={{ background: userColor }}
          title={userName}
        >
          {userInitials}
        </div>
        <button
          onClick={() => logout()}
          className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer bg-transparent border-none"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
