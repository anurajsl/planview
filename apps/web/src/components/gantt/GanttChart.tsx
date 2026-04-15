import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useTimelineStore } from '../../stores/timeline.store';
import DependencyLines from './DependencyLines';
import { useVirtualRows, buildRowList } from '../../hooks/useVirtualRows';

interface GanttChartProps {
  features: any[];
  stories: any[];
  subtasks: any[];
  dependencies: any[];
  members: any[];
  onMoveStory: (id: string, startDate: string, endDate: string) => void;
  onUpdateStory: (id: string, data: any) => void;
  onCreateDependency?: (fromStoryId: string, toStoryId: string) => void;
  onDeleteDependency?: (id: string) => void;
}

const STATUS_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  active: { bg: '#eff6ff', bar: '#3b82f6', text: '#1e40af' },
  done: { bg: '#f0fdf4', bar: '#22c55e', text: '#166534' },
  delayed: { bg: '#fef2f2', bar: '#ef4444', text: '#991b1b' },
  planned: { bg: '#f8fafc', bar: '#94a3b8', text: '#475569' },
  overdue: { bg: '#fef2f2', bar: '#ef4444', text: '#991b1b' },
};

const parseDate = (s: string) => new Date(s + 'T00:00:00');
const daysBetween = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
const todayStr = () => new Date().toISOString().split('T')[0];

export default function GanttChart({
  features, stories, subtasks, dependencies, members, onMoveStory, onUpdateStory,
  onCreateDependency, onDeleteDependency,
}: GanttChartProps) {
  const {
    viewMode, expandedStories, collapsedFeatures,
    toggleStoryExpand, toggleFeatureCollapse, selectStory,
    selectedStoryId, searchQuery, statusFilters,
  } = useTimelineStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    storyId: string; startX: number; origStart: string; origEnd: string; mode: 'move' | 'resize-end';
  } | null>(null);
  const [dragDelta, setDragDelta] = useState(0); // pixels dragged

  // ─── Dependency linking state ───
  const [linkDrag, setLinkDrag] = useState<{
    fromStoryId: string; fromX: number; fromY: number; mouseX: number; mouseY: number;
  } | null>(null);
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);

  const today = todayStr();
  const colWidth = viewMode === 'day' ? 48 : viewMode === 'week' ? 32 : 12;

  // Filter stories
  const filteredStories = useMemo(() => {
    return stories.filter((s: any) => {
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilters.size > 0 && !statusFilters.has(s.status)) return false;
      return true;
    });
  }, [stories, searchQuery, statusFilters]);

  // Calculate timeline bounds
  const bounds = useMemo(() => {
    const allDates = [...filteredStories, ...subtasks].flatMap((t: any) =>
      [t.startDate, t.endDate].filter(Boolean)
    );
    if (allDates.length === 0) {
      const now = new Date();
      const min = new Date(now); min.setDate(min.getDate() - 15);
      const max = new Date(now); max.setDate(max.getDate() + 30);
      return { min, max, totalDays: 45 };
    }
    const min = new Date(Math.min(...allDates.map((d: string) => parseDate(d).getTime())));
    const max = new Date(Math.max(...allDates.map((d: string) => parseDate(d).getTime())));
    min.setDate(min.getDate() - 5);
    max.setDate(max.getDate() + 10);
    return { min, max, totalDays: Math.round((max.getTime() - min.getTime()) / 86400000) };
  }, [filteredStories, subtasks]);

  const timelineWidth = bounds.totalDays * colWidth;

  const getBarPos = useCallback(
    (startDate: string, endDate: string) => {
      const startDay = Math.round((parseDate(startDate).getTime() - bounds.min.getTime()) / 86400000);
      const dur = daysBetween(startDate, endDate) + 1;
      return { left: startDay * colWidth, width: Math.max(dur * colWidth - 2, 20) };
    },
    [bounds, colWidth],
  );

  const todayOffset = useMemo(() => {
    return Math.round((new Date().getTime() - bounds.min.getTime()) / 86400000) * colWidth;
  }, [bounds, colWidth]);

  // Generate dates for header
  const dates = useMemo(() => {
    const result: Date[] = [];
    const cur = new Date(bounds.min);
    while (cur <= bounds.max) {
      result.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [bounds]);

  // Auto-scroll to today on mount
  useEffect(() => {
    if (timelineRef.current) {
      const w = timelineRef.current.offsetWidth;
      timelineRef.current.scrollLeft = Math.max(0, todayOffset - w / 3);
    }
  }, [todayOffset]);

  // Drag handlers for moving stories
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, story: any, mode: 'move' | 'resize-end' = 'move') => {
      e.preventDefault();
      e.stopPropagation();
      setDragState({
        storyId: story.id,
        startX: e.clientX,
        origStart: story.startDate,
        origEnd: story.endDate,
        mode,
      });
    }, [],
  );

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      setDragDelta(dx);
    };
    const onUp = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const daysDelta = Math.round(dx / colWidth);
      if (daysDelta !== 0) {
        const origStart = parseDate(dragState.origStart);
        const origEnd = parseDate(dragState.origEnd);

        if (dragState.mode === 'move') {
          const newStart = new Date(origStart); newStart.setDate(newStart.getDate() + daysDelta);
          const newEnd = new Date(origEnd); newEnd.setDate(newEnd.getDate() + daysDelta);
          onMoveStory(
            dragState.storyId,
            newStart.toISOString().split('T')[0],
            newEnd.toISOString().split('T')[0],
          );
        } else {
          const newEnd = new Date(origEnd); newEnd.setDate(newEnd.getDate() + daysDelta);
          if (newEnd >= origStart) {
            onMoveStory(
              dragState.storyId,
              dragState.origStart,
              newEnd.toISOString().split('T')[0],
            );
          }
        }
      }
      setDragState(null);
      setDragDelta(0);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragState, colWidth, onMoveStory]);

  const getMember = (id: string) => members.find((m: any) => m.id === id);
  const isOverdue = (s: any) => s.status !== 'done' && s.endDate < today;

  // ─── Link drag handlers ───
  const handleLinkDragStart = useCallback(
    (e: React.MouseEvent, storyId: string, portX: number, portY: number) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      setLinkDrag({
        fromStoryId: storyId,
        fromX: portX,
        fromY: portY,
        mouseX: e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0),
        mouseY: e.clientY - rect.top + (timelineRef.current?.scrollTop || 0),
      });
    }, [],
  );

  useEffect(() => {
    if (!linkDrag) return;
    const onMove = (e: MouseEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      setLinkDrag((prev) => prev ? {
        ...prev,
        mouseX: e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0),
        mouseY: e.clientY - rect.top + (timelineRef.current?.scrollTop || 0),
      } : null);
    };
    const onUp = (e: MouseEvent) => {
      // Find which story the mouse is over
      if (hoveredStoryId && hoveredStoryId !== linkDrag.fromStoryId && onCreateDependency) {
        onCreateDependency(linkDrag.fromStoryId, hoveredStoryId);
      }
      setLinkDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [linkDrag, hoveredStoryId, onCreateDependency]);

  return (
    <div ref={timelineRef} className="flex-1 overflow-x-auto overflow-y-auto relative">
      {/* Timeline header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 h-11 flex" style={{ width: timelineWidth, minWidth: '100%' }}>
        {dates.map((date, i) => {
          const isT = date.toISOString().split('T')[0] === today;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const showLabel =
            viewMode === 'day' ||
            (viewMode === 'week' && date.getDay() === 1) ||
            (viewMode === 'month' && date.getDate() === 1);
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-center flex-shrink-0"
              style={{
                width: colWidth,
                borderRight: `1px solid ${showLabel ? '#e5e7eb' : '#f3f4f6'}`,
                background: isT ? '#eff6ff' : isWeekend ? '#fafbfc' : '#fff',
              }}
            >
              {showLabel && (
                <>
                  <span className="text-[9.5px] text-slate-400 font-medium leading-none">
                    {date.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span
                    className="text-xs leading-tight"
                    style={{ fontWeight: isT ? 800 : 600, color: isT ? '#2563eb' : '#374151' }}
                  >
                    {viewMode === 'month'
                      ? date.toLocaleDateString('en-US', { month: 'short' })
                      : date.getDate()}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Gantt body — virtualized */}
      {(() => {
        // Build flat row list for virtual scrolling
        const filteredIds = new Set(filteredStories.map((s: any) => s.id));
        const allRows = buildRowList(features, filteredStories, subtasks, filteredIds, collapsedFeatures, expandedStories);

        // Calculate total height
        const totalBodyHeight = allRows.reduce((sum, r) => sum + r.height, 0);

        // Compute cumulative offsets
        const offsets: number[] = [];
        let cum = 0;
        for (const row of allRows) { offsets.push(cum); cum += row.height; }

        // Get scroll position from the parent container
        const scrollEl = timelineRef.current;
        const scrollTop = scrollEl ? scrollEl.scrollTop - 44 : 0; // subtract header height
        const viewportHeight = scrollEl ? scrollEl.clientHeight : 800;
        const BUFFER = 8;

        // Binary search for first visible row
        let startIdx = 0;
        {
          let lo = 0, hi = offsets.length - 1;
          while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (offsets[mid] + allRows[mid].height < scrollTop) lo = mid + 1;
            else hi = mid;
          }
          startIdx = Math.max(0, lo - BUFFER);
        }

        // Collect visible rows
        const visibleRows: { row: typeof allRows[0]; y: number }[] = [];
        for (let i = startIdx; i < allRows.length; i++) {
          const y = offsets[i];
          if (y > scrollTop + viewportHeight + BUFFER * 44) break;
          visibleRows.push({ row: allRows[i], y });
        }

        return (
          <div className="relative" style={{ width: timelineWidth, minWidth: '100%', height: totalBodyHeight }}>
            {/* Grid + Weekend shading */}
            <div className="absolute inset-0 pointer-events-none">
              {dates.map((date, i) => (
                <div key={i} className="absolute top-0 bottom-0" style={{
                  left: i * colWidth, width: colWidth,
                  borderRight: '1px solid var(--border-light, #f3f4f6)',
                  background: (date.getDay() === 0 || date.getDay() === 6) ? 'var(--gantt-weekend, rgba(0,0,0,0.015))' : 'transparent',
                }} />
              ))}
            </div>

            {/* Today line */}
            <div className="absolute top-0 bottom-0 z-10" style={{
              left: todayOffset + colWidth / 2, width: 2,
              background: '#ef4444', opacity: 0.7,
              boxShadow: '0 0 8px rgba(239,68,68,0.3)',
            }}>
              <div className="absolute -top-0.5 -left-1 w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>

            {/* Dependency lines */}
            <DependencyLines
              dependencies={dependencies}
              stories={filteredStories}
              features={features}
              filteredStoryIds={filteredIds}
              collapsedFeatures={collapsedFeatures}
              expandedStories={expandedStories}
              subtasks={subtasks}
              getBarPos={getBarPos}
              timelineWidth={timelineWidth}
              onDeleteDependency={onDeleteDependency}
            />

            {/* Dependency link drag preview line */}
            {linkDrag && (
              <svg style={{
                position: 'absolute', top: 0, left: 0,
                width: timelineWidth, height: '100%',
                pointerEvents: 'none', zIndex: 30, overflow: 'visible',
              }}>
                <line
                  x1={linkDrag.fromX} y1={linkDrag.fromY - 44}
                  x2={linkDrag.mouseX} y2={linkDrag.mouseY - 44}
                  stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
                  opacity={0.8}
                />
                <circle cx={linkDrag.fromX} cy={linkDrag.fromY - 44} r={4} fill="#3b82f6" />
                <circle cx={linkDrag.mouseX} cy={linkDrag.mouseY - 44} r={4} fill="#3b82f6" opacity={0.6} />
              </svg>
            )}

            {/* CSS for connector port hover visibility */}
            <style>{`
              .dep-port { pointer-events: none; }
              div:hover > div > .dep-port { opacity: 1 !important; pointer-events: auto !important; }
              .dep-port:hover { transform: translateY(-50%) scale(1.3) !important; }
            `}</style>

            {/* Virtualized rows — absolutely positioned */}
            {visibleRows.map(({ row, y }) => {
              if (row.type === 'feature-header') {
                const { feature, storyCount, doneCount } = row.data;
                const collapsed = collapsedFeatures.has(feature.id);
                const pct = storyCount > 0 ? Math.round((doneCount / storyCount) * 100) : 0;
                return (
                  <div key={row.id} className="absolute left-0 right-0" style={{ top: y, height: row.height }}>
                    <div
                      onClick={() => toggleFeatureCollapse(feature.id)}
                      className="h-full flex items-center gap-2 px-3.5 cursor-pointer relative z-[5]"
                      style={{ background: feature.color + '08', borderBottom: `1px solid ${feature.color}20` }}
                    >
                      <span className="text-[10px] transition-transform" style={{ color: feature.color, transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>▼</span>
                      <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: feature.color }} />
                      <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{feature.name}</span>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{doneCount}/{storyCount}</span>
                      <div className="w-[60px] h-1 rounded" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: feature.color }} />
                      </div>
                    </div>
                  </div>
                );
              }

              if (row.type === 'story') {
                const story = row.data;
                const stSubs = subtasks.filter((st: any) => st.storyId === story.id);
                const expanded = expandedStories.has(story.id);
                const pos = getBarPos(story.startDate, story.endDate);
                const ov = isOverdue(story);
                const sc = STATUS_COLORS[ov ? 'overdue' : story.status] || STATUS_COLORS.planned;
                const member = getMember(story.assigneeId);
                const dur = daysBetween(story.startDate, story.endDate) + 1;
                const isSelected = selectedStoryId === story.id;
                const isDragging = dragState?.storyId === story.id;
                const barLeft = isDragging && dragState?.mode === 'move' ? pos.left + dragDelta : pos.left;
                const barWidth = isDragging && dragState?.mode === 'resize-end' ? Math.max(pos.width + dragDelta, 20) : pos.width;

                return (
                  <div key={row.id} className="absolute left-0 right-0" style={{ top: y, height: row.height }}>
                    <div className="h-full relative transition-colors" style={{
                      borderBottom: '1px solid var(--border-light, #f3f4f6)',
                      background: isSelected ? 'var(--gantt-row-selected, #eff6ff)' : 'var(--gantt-row, #fff)',
                    }}
                      onMouseEnter={() => setHoveredStoryId(story.id)}
                      onMouseLeave={() => { if (!linkDrag) setHoveredStoryId(null); }}
                    >
                      <div
                        className="absolute top-[7px] rounded-md overflow-hidden flex items-center"
                        style={{
                          left: barLeft, width: barWidth, height: 30,
                          background: sc.bg, border: `1.5px solid ${sc.bar}${isDragging ? '60' : '30'}`,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          boxShadow: isDragging ? `0 4px 16px ${sc.bar}30` : isSelected ? `0 0 0 2px ${sc.bar}40` : '0 1px 2px rgba(0,0,0,0.05)',
                          zIndex: isDragging ? 20 : 1, opacity: isDragging ? 0.9 : 1,
                          transition: isDragging ? 'none' : 'box-shadow 0.15s',
                        }}
                        onClick={() => { if (!isDragging) selectStory(story.id); }}
                        onMouseDown={(e) => handleMouseDown(e, story, 'move')}
                      >
                        <div className="absolute top-0 left-0 bottom-0" style={{ width: `${story.progress}%`, background: sc.bar + '18', borderRight: story.progress > 0 && story.progress < 100 ? `2px solid ${sc.bar}40` : 'none' }} />
                        {stSubs.length > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); toggleStoryExpand(story.id); }}
                            className="w-[18px] h-[18px] ml-1 flex-shrink-0 flex items-center justify-center rounded-[3px] bg-black/[0.06] border-none cursor-pointer text-[8px] z-[2] transition-transform"
                            style={{ color: sc.text, transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}
                            onMouseDown={(e) => e.stopPropagation()}>▶</button>
                        )}
                        <div className="flex-1 px-1.5 overflow-hidden z-[2] flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate" style={{ color: sc.text }}>{story.name}</span>
                          {barWidth > 120 && <span className="text-[10px] flex-shrink-0" style={{ color: sc.text + '99' }}>{dur}d</span>}
                        </div>
                        {barWidth > 80 && <span className="text-[10px] font-bold mr-1 z-[2] flex-shrink-0" style={{ color: sc.text }}>{story.progress}%</span>}
                        {member && (
                          <div className="w-[22px] h-[22px] rounded-full mr-1 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white z-[2] border-2 border-white shadow-sm"
                            style={{ background: member.color || '#6366f1' }}>{member.initials || '??'}</div>
                        )}
                        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-[3]"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, story, 'resize-end'); }} />

                        {/* ─── Connector ports for dependency linking ─── */}
                        {/* Left port (target) */}
                        <div
                          className="dep-port dep-port-left"
                          style={{
                            position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)',
                            width: 10, height: 10, borderRadius: '50%',
                            background: linkDrag && linkDrag.fromStoryId !== story.id ? '#3b82f6' : '#94a3b8',
                            border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            cursor: 'crosshair', zIndex: 5,
                            opacity: linkDrag ? (linkDrag.fromStoryId !== story.id ? 1 : 0.3) : 0,
                            transition: 'opacity 0.15s',
                            pointerEvents: 'auto',
                          }}
                        />
                        {/* Right port (source) */}
                        <div
                          className="dep-port dep-port-right"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const barRight = barLeft + barWidth;
                            const barCenterY = 22; // approx center of bar in row
                            handleLinkDragStart(e, story.id, barRight, y + barCenterY);
                          }}
                          style={{
                            position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)',
                            width: 10, height: 10, borderRadius: '50%',
                            background: '#3b82f6', border: '2px solid #fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            cursor: 'crosshair', zIndex: 5,
                            opacity: linkDrag ? (linkDrag.fromStoryId === story.id ? 1 : 0) : 0,
                            transition: 'opacity 0.15s',
                            pointerEvents: 'auto',
                          }}
                        />
                      </div>
                      {ov && (
                        <div className="absolute top-2.5 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 whitespace-nowrap"
                          style={{ left: pos.left + pos.width + 6 }}>{Math.abs(daysBetween(story.endDate, today))}d overdue</div>
                      )}
                    </div>
                  </div>
                );
              }

              if (row.type === 'subtask') {
                const st = row.data;
                if (!st.startDate || !st.endDate) return null;
                const stPos = getBarPos(st.startDate, st.endDate);
                const stSc = STATUS_COLORS[st.status] || STATUS_COLORS.planned;
                const stMember = getMember(st.assigneeId);
                return (
                  <div key={row.id} className="absolute left-0 right-0" style={{ top: y, height: row.height, background: 'var(--bg-hover, #fafbfc)', borderBottom: '1px solid var(--border-light, #f8f9fa)' }}>
                    <div className="absolute top-1.5 rounded overflow-hidden flex items-center gap-1 px-1.5"
                      style={{ left: stPos.left + 8, width: stPos.width - 8, height: 20, background: stSc.bar + '15', border: `1px solid ${stSc.bar}25` }}>
                      <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: stSc.bar }} />
                      <span className="text-[11px] truncate" style={{ color: stSc.text }}>{st.name}</span>
                      {stMember && <span className="text-[9px] font-bold ml-auto flex-shrink-0" style={{ color: stMember.color }}>{stMember.initials}</span>}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Empty state */}
            {filteredStories.length === 0 && (
              <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                <div className="text-3xl mb-2">🔍</div>
                <div className="text-sm font-semibold">No stories match your filters</div>
                <div className="text-xs mt-1">Try adjusting your search or status filters</div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
