import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface VirtualRow {
  id: string;
  type: 'feature-header' | 'story' | 'subtask';
  height: number;
  data: any;
  parentId?: string; // story ID for subtasks, feature ID for stories
}

interface UseVirtualRowsOptions {
  rows: VirtualRow[];
  containerHeight: number;
  bufferCount?: number; // extra rows above/below viewport
}

interface VirtualState {
  visibleRows: (VirtualRow & { offsetY: number })[];
  totalHeight: number;
  scrollTop: number;
  setScrollTop: (v: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * useVirtualRows
 *
 * Virtualizes a list of variable-height rows for the Gantt chart.
 * Only rows within the viewport (plus a configurable buffer) are
 * rendered. All others are replaced by empty space.
 *
 * This enables smooth 60fps scrolling with 1000+ stories.
 *
 * Row heights:
 *   - Feature header: 36px
 *   - Story row: 44px
 *   - Subtask row: 32px
 */
export function useVirtualRows({
  rows,
  containerHeight,
  bufferCount = 8,
}: UseVirtualRowsOptions): VirtualState {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Precompute cumulative offsets for all rows
  const { offsets, totalHeight } = useMemo(() => {
    const offsets: number[] = [];
    let cumulative = 0;
    for (const row of rows) {
      offsets.push(cumulative);
      cumulative += row.height;
    }
    return { offsets, totalHeight: cumulative };
  }, [rows]);

  // Binary search for the first visible row
  const findStartIndex = useCallback(
    (scrollPos: number) => {
      let lo = 0;
      let hi = offsets.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (offsets[mid] + rows[mid].height < scrollPos) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      return Math.max(0, lo - bufferCount);
    },
    [offsets, rows, bufferCount],
  );

  // Compute visible rows
  const visibleRows = useMemo(() => {
    if (rows.length === 0) return [];

    const startIdx = findStartIndex(scrollTop);
    const viewBottom = scrollTop + containerHeight;
    const result: (VirtualRow & { offsetY: number })[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      const offsetY = offsets[i];
      if (offsetY > viewBottom + bufferCount * 44) break; // past viewport + buffer

      result.push({ ...rows[i], offsetY });
    }

    return result;
  }, [rows, scrollTop, containerHeight, offsets, findStartIndex, bufferCount]);

  // Sync scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return { visibleRows, totalHeight, scrollTop, setScrollTop, containerRef };
}

/**
 * Builds the flat row list from features, stories, subtasks
 * accounting for collapsed features and expanded stories.
 */
export function buildRowList(
  features: any[],
  stories: any[],
  subtasks: any[],
  filteredStoryIds: Set<string>,
  collapsedFeatures: Set<string>,
  expandedStories: Set<string>,
): VirtualRow[] {
  const rows: VirtualRow[] = [];

  for (const feature of features) {
    const fStories = stories.filter(
      (s: any) => s.featureId === feature.id && filteredStoryIds.has(s.id),
    );
    if (fStories.length === 0) continue;

    // Feature header row
    rows.push({
      id: `fh-${feature.id}`,
      type: 'feature-header',
      height: 36,
      data: { feature, storyCount: fStories.length, doneCount: fStories.filter((s: any) => s.status === 'done').length },
    });

    if (collapsedFeatures.has(feature.id)) continue;

    for (const story of fStories) {
      // Story row
      rows.push({
        id: `s-${story.id}`,
        type: 'story',
        height: 44,
        data: story,
        parentId: feature.id,
      });

      // Subtask rows (only if expanded)
      if (expandedStories.has(story.id)) {
        const stSubs = subtasks.filter(
          (st: any) => st.storyId === story.id && st.startDate && st.endDate,
        );
        for (const subtask of stSubs) {
          rows.push({
            id: `st-${subtask.id}`,
            type: 'subtask',
            height: 32,
            data: subtask,
            parentId: story.id,
          });
        }
      }
    }
  }

  return rows;
}
