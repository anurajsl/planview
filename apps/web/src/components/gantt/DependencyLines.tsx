import { useMemo } from 'react';

interface DependencyLinesProps {
  dependencies: any[];
  stories: any[];
  features: any[];
  filteredStoryIds: Set<string>;
  collapsedFeatures: Set<string>;
  expandedStories: Set<string>;
  subtasks: any[];
  getBarPos: (startDate: string, endDate: string) => { left: number; width: number };
  timelineWidth: number;
  onDeleteDependency?: (id: string) => void;
}

// Fixed row heights matching GanttChart rendering
const FEATURE_HEADER_H = 36;
const STORY_ROW_H = 44;
const SUBTASK_ROW_H = 32;

/**
 * Computes the Y center position for each story row in the Gantt chart.
 * Must match the exact rendering order in GanttChart.tsx.
 */
function computeStoryYPositions(
  features: any[],
  stories: any[],
  filteredStoryIds: Set<string>,
  collapsedFeatures: Set<string>,
  expandedStories: Set<string>,
  subtasks: any[],
): Map<string, number> {
  const positions = new Map<string, number>();
  let y = 0;

  for (const feature of features) {
    const fStories = stories.filter(
      (s: any) => s.featureId === feature.id && filteredStoryIds.has(s.id),
    );
    if (fStories.length === 0) continue;

    // Feature header
    y += FEATURE_HEADER_H;

    if (collapsedFeatures.has(feature.id)) continue;

    for (const story of fStories) {
      // Story row — center Y is at y + half the row height
      positions.set(story.id, y + STORY_ROW_H / 2);
      y += STORY_ROW_H;

      // Expanded subtasks
      if (expandedStories.has(story.id)) {
        const stSubs = subtasks.filter((st: any) => st.storyId === story.id);
        y += stSubs.filter((st: any) => st.startDate && st.endDate).length * SUBTASK_ROW_H;
      }
    }
  }

  return positions;
}

export default function DependencyLines({
  dependencies, stories, features, filteredStoryIds, collapsedFeatures,
  expandedStories, subtasks, getBarPos, timelineWidth, onDeleteDependency,
}: DependencyLinesProps) {
  const storyYMap = useMemo(
    () => computeStoryYPositions(features, stories, filteredStoryIds, collapsedFeatures, expandedStories, subtasks),
    [features, stories, filteredStoryIds, collapsedFeatures, expandedStories, subtasks],
  );

  // Calculate total height for SVG
  const totalHeight = useMemo(() => {
    let h = 0;
    for (const feature of features) {
      const fStories = stories.filter(
        (s: any) => s.featureId === feature.id && filteredStoryIds.has(s.id),
      );
      if (fStories.length === 0) continue;
      h += FEATURE_HEADER_H;
      if (collapsedFeatures.has(feature.id)) continue;
      for (const story of fStories) {
        h += STORY_ROW_H;
        if (expandedStories.has(story.id)) {
          h += subtasks.filter((st: any) => st.storyId === story.id && st.startDate && st.endDate).length * SUBTASK_ROW_H;
        }
      }
    }
    return h;
  }, [features, stories, filteredStoryIds, collapsedFeatures, expandedStories, subtasks]);

  // Build line data for visible dependencies
  const lines = useMemo(() => {
    return dependencies
      .map((dep: any) => {
        const fromStory = stories.find((s: any) => s.id === dep.fromStoryId);
        const toStory = stories.find((s: any) => s.id === dep.toStoryId);
        if (!fromStory || !toStory) return null;

        const fromY = storyYMap.get(dep.fromStoryId);
        const toY = storyYMap.get(dep.toStoryId);
        if (fromY === undefined || toY === undefined) return null;

        const fromPos = getBarPos(fromStory.startDate, fromStory.endDate);
        const toPos = getBarPos(toStory.startDate, toStory.endDate);

        // Finish-to-Start: line from end of "from" bar to start of "to" bar
        const x1 = fromPos.left + fromPos.width; // right edge of source
        const y1 = fromY;
        const x2 = toPos.left; // left edge of target
        const y2 = toY;

        return { id: dep.id, x1, y1, x2, y2, type: dep.type || 'FS' };
      })
      .filter(Boolean) as { id: string; x1: number; y1: number; x2: number; y2: number; type: string }[];
  }, [dependencies, stories, storyYMap, getBarPos]);

  if (lines.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: timelineWidth,
        height: totalHeight,
        pointerEvents: 'none',
        zIndex: 8,
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Arrowhead marker */}
        <marker
          id="dep-arrow"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L8,3 L0,6 Z" fill="#94a3b8" />
        </marker>
        <marker
          id="dep-arrow-hover"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L8,3 L0,6 Z" fill="#3b82f6" />
        </marker>
      </defs>

      {lines.map((line) => {
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;

        // Determine path shape based on relative positions
        let path: string;

        if (dx > 20) {
          // Target is to the right — simple curved connector
          const midX = line.x1 + dx / 2;
          path = `M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`;
        } else {
          // Target is to the left or overlapping — route around with an S-curve
          const gap = 24;
          const routeX = Math.max(line.x1, line.x2) + gap;
          const belowY = Math.max(line.y1, line.y2) + 20;

          if (Math.abs(dy) < 10) {
            // Same row — go under
            path = `M ${line.x1} ${line.y1} L ${routeX} ${line.y1} L ${routeX} ${belowY} L ${line.x2 - gap} ${belowY} L ${line.x2 - gap} ${line.y2} L ${line.x2} ${line.y2}`;
          } else {
            // Different rows — step down/up and route
            const rightX = line.x1 + gap;
            const leftX = line.x2 - gap;
            const midY = (line.y1 + line.y2) / 2;
            path = `M ${line.x1} ${line.y1} L ${rightX} ${line.y1} Q ${rightX + 8} ${line.y1}, ${rightX + 8} ${line.y1 + (dy > 0 ? 8 : -8)} L ${rightX + 8} ${midY} L ${leftX - 8} ${midY} L ${leftX - 8} ${line.y2 + (dy > 0 ? -8 : 8)} Q ${leftX - 8} ${line.y2}, ${leftX} ${line.y2} L ${line.x2} ${line.y2}`;
          }
        }

        return (
          <g key={line.id} className="dep-line-group" style={{ pointerEvents: 'auto' }}>
            {/* Invisible thick hit area for hover */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: 'pointer' }}
            />
            {/* Visible line */}
            <path
              d={path}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="none"
              markerEnd="url(#dep-arrow)"
              style={{ transition: 'stroke 0.15s' }}
            />
            {/* Delete button at midpoint — visible on hover */}
            {onDeleteDependency && (
              <g
                className="dep-delete-btn"
                onClick={(e) => { e.stopPropagation(); onDeleteDependency(line.id); }}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={(line.x1 + line.x2) / 2}
                  cy={(line.y1 + line.y2) / 2}
                  r={8}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                <text
                  x={(line.x1 + line.x2) / 2}
                  y={(line.y1 + line.y2) / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize={10}
                  fontWeight={700}
                  style={{ pointerEvents: 'none' }}
                >×</text>
              </g>
            )}
            <style>{`
              .dep-line-group:hover path:nth-child(2) {
                stroke: #3b82f6 !important;
                stroke-width: 2 !important;
              }
              .dep-line-group:hover path:nth-child(2) {
                marker-end: url(#dep-arrow-hover) !important;
              }
              .dep-delete-btn { opacity: 0; transition: opacity 0.15s; }
              .dep-line-group:hover .dep-delete-btn { opacity: 1; }
              .dep-delete-btn:hover circle { fill: #dc2626 !important; }
            `}</style>
            {/* Connection dots */}
            <circle cx={line.x1} cy={line.y1} r={3} fill="#cbd5e1" className="dep-dot" />
            <circle cx={line.x2} cy={line.y2} r={3} fill="#cbd5e1" className="dep-dot" />
            <style>{`
              .dep-line-group:hover .dep-dot { fill: #3b82f6 !important; r: 4; }
            `}</style>
          </g>
        );
      })}
    </svg>
  );
}
