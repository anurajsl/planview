import { create } from 'zustand';

export type ViewMode = 'day' | 'week' | 'month';
export type Grouping = 'feature' | 'assignee' | 'status';
export type MainView = 'gantt' | 'resource';

interface TimelineState {
  // View
  viewMode: ViewMode;
  grouping: Grouping;
  mainView: MainView;
  setViewMode: (mode: ViewMode) => void;
  setGrouping: (g: Grouping) => void;
  setMainView: (v: MainView) => void;

  // Selection
  selectedStoryId: string | null;
  selectStory: (id: string | null) => void;

  // Expansion
  expandedStories: Set<string>;
  collapsedFeatures: Set<string>;
  toggleStoryExpand: (id: string) => void;
  toggleFeatureCollapse: (id: string) => void;

  // Filters
  searchQuery: string;
  statusFilters: Set<string>;
  assigneeFilters: Set<string>;
  setSearch: (q: string) => void;
  toggleStatusFilter: (status: string) => void;
  toggleAssigneeFilter: (id: string) => void;
  clearFilters: () => void;

  // UI state
  sidebarOpen: boolean;
  summaryOpen: boolean;
  toggleSidebar: () => void;
  toggleSummary: () => void;

  // Active project
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  viewMode: 'week',
  grouping: 'feature',
  mainView: 'gantt',
  setViewMode: (mode) => set({ viewMode: mode }),
  setGrouping: (g) => set({ grouping: g }),
  setMainView: (v) => set({ mainView: v }),

  selectedStoryId: null,
  selectStory: (id) => set({ selectedStoryId: id }),

  expandedStories: new Set(),
  collapsedFeatures: new Set(),
  toggleStoryExpand: (id) =>
    set((state) => {
      const next = new Set(state.expandedStories);
      next.has(id) ? next.delete(id) : next.add(id);
      return { expandedStories: next };
    }),
  toggleFeatureCollapse: (id) =>
    set((state) => {
      const next = new Set(state.collapsedFeatures);
      next.has(id) ? next.delete(id) : next.add(id);
      return { collapsedFeatures: next };
    }),

  searchQuery: '',
  statusFilters: new Set(),
  assigneeFilters: new Set(),
  setSearch: (q) => set({ searchQuery: q }),
  toggleStatusFilter: (status) =>
    set((state) => {
      const next = new Set(state.statusFilters);
      next.has(status) ? next.delete(status) : next.add(status);
      return { statusFilters: next };
    }),
  toggleAssigneeFilter: (id) =>
    set((state) => {
      const next = new Set(state.assigneeFilters);
      next.has(id) ? next.delete(id) : next.add(id);
      return { assigneeFilters: next };
    }),
  clearFilters: () =>
    set({ searchQuery: '', statusFilters: new Set(), assigneeFilters: new Set() }),

  sidebarOpen: true,
  summaryOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSummary: () => set((s) => ({ summaryOpen: !s.summaryOpen })),

  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
}));
