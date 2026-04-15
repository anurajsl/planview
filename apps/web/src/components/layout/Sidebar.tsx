import { useTimelineStore } from '../../stores/timeline.store';

interface SidebarProps {
  features: any[];
  stories: any[];
  selectedStoryId: string | null;
  onCreateFeature?: () => void;
}

const statusDot: Record<string, string> = {
  active: '#3b82f6',
  done: '#22c55e',
  delayed: '#ef4444',
  planned: '#94a3b8',
};

export default function Sidebar({ features, stories, selectedStoryId, onCreateFeature }: SidebarProps) {
  const {
    sidebarOpen, toggleSidebar, collapsedFeatures, toggleFeatureCollapse, selectStory,
  } = useTimelineStore();

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="absolute left-0 top-[72px] z-30 w-6 h-12 bg-[#1e3a5f] text-white text-xs flex items-center justify-center rounded-r-md border-none cursor-pointer"
      >
        ▶
      </button>
    );
  }

  return (
    <div className="w-[260px] flex-shrink-0 bg-[#0f172a] flex flex-col overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="px-3.5 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Features & Stories
        </span>
        <button
          onClick={toggleSidebar}
          className="bg-transparent border-none text-slate-500 cursor-pointer text-base p-0.5 hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      {/* Feature tree */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-4">
        {features.map((feature: any) => {
          const fStories = stories.filter((s: any) => s.featureId === feature.id);
          const collapsed = collapsedFeatures.has(feature.id);
          return (
            <div key={feature.id} className="mb-1">
              <button
                onClick={() => toggleFeatureCollapse(feature.id)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border-none cursor-pointer transition-colors"
              >
                <span
                  className="text-[10px] text-slate-500 transition-transform"
                  style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}
                >
                  ▼
                </span>
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: feature.color }} />
                <span className="text-[13px] font-semibold text-slate-200 flex-1 text-left truncate">
                  {feature.name}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">{fStories.length}</span>
              </button>

              {!collapsed && fStories.map((story: any) => (
                <button
                  key={story.id}
                  onClick={() => selectStory(story.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 pl-8 rounded border-none cursor-pointer transition-colors"
                  style={{
                    background: selectedStoryId === story.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  }}
                >
                  <div
                    className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                    style={{ background: statusDot[story.status] || statusDot.planned }}
                  />
                  <span
                    className="text-[12.5px] flex-1 text-left truncate"
                    style={{ color: selectedStoryId === story.id ? '#93c5fd' : '#cbd5e1' }}
                  >
                    {story.name}
                  </span>
                </button>
              ))}
            </div>
          );
        })}

        {features.length === 0 && (
          <div className="text-center text-slate-500 text-xs mt-8 px-4">
            No features yet. Create one to start planning.
          </div>
        )}
      </div>

      {/* Add feature button */}
      {onCreateFeature && (
        <div className="px-3 pb-3 flex-shrink-0">
          <button
            onClick={onCreateFeature}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 text-xs font-semibold cursor-pointer bg-transparent hover:border-slate-400 hover:text-slate-300 transition-colors"
            style={{ fontFamily: 'inherit' }}
          >
            <span className="text-sm">+</span> Add Feature
          </button>
        </div>
      )}
    </div>
  );
}
