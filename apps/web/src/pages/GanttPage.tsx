import { useEffect, useState, useCallback } from 'react';
import {
  useTimeline, useTimelineSummary, useProjects, useMoveStory,
  useUpdateStory, useCreateStory, useCreateFeature, useDeleteStory,
  useCreateProject, useCreateDependency, useDeleteDependency,
} from '../hooks/useTimeline';
import { useTimelineStore } from '../stores/timeline.store';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';
import TopBar from '../components/layout/TopBar';
import Sidebar from '../components/layout/Sidebar';
import GanttChart from '../components/gantt/GanttChart';
import DetailDrawer from '../components/gantt/DetailDrawer';
import SmartSummary from '../components/gantt/SmartSummary';
import CreateStoryModal from '../components/gantt/CreateStoryModal';
import CreateFeatureModal from '../components/gantt/CreateFeatureModal';
import CreateProjectModal from '../components/gantt/CreateProjectModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ToastContainer from '../components/common/ToastContainer';
import InviteUserModal from '../components/gantt/InviteUserModal';
import ResourceView from '../components/gantt/ResourceView';
import BillingModal from '../components/gantt/BillingModal';
import OnboardingWizard from '../components/common/OnboardingWizard';
import { useWebSocket } from '../hooks/useWebSocket';
import { exportsApi } from '../api/client';

export default function GanttPage() {
  const { activeProjectId, setActiveProject, selectedStoryId, selectStory, mainView } = useTimelineStore();
  const user = useAuthStore((s) => s.user);
  const toast = useToastStore();

  // WebSocket for real-time updates + presence
  const { onlineUsers, isConnected, broadcastCursor } = useWebSocket(activeProjectId);

  // Modal state
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreateFeature, setShowCreateFeature] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'story'; id: string; name: string } | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Fetch projects and auto-select the first one
  const { data: projects } = useProjects();
  useEffect(() => {
    if (projects?.length && !activeProjectId) {
      setActiveProject(projects[0].id);
    }
  }, [projects, activeProjectId, setActiveProject]);

  // Fetch timeline data for active project
  const { data: timeline, isLoading, error } = useTimeline(activeProjectId);
  const { data: summary } = useTimelineSummary(activeProjectId);

  // Mutations with toast feedback
  const moveStory = useMoveStory();
  const updateStory = useUpdateStory();
  const createStory = useCreateStory();
  const createFeature = useCreateFeature();
  const deleteStory = useDeleteStory();
  const createProject = useCreateProject();
  const createDependency = useCreateDependency();
  const deleteDependency = useDeleteDependency();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Esc closes drawer or modals
      if (e.key === 'Escape') {
        if (selectedStoryId) { selectStory(null); return; }
      }
      // N for new story (when not in an input)
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        setShowCreateStory(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedStoryId, selectStory]);

  const handleDeleteStory = useCallback((storyId: string, storyName: string) => {
    setDeleteTarget({ type: 'story', id: storyId, name: storyName });
  }, []);

  // Broadcast cursor position to collaborators when selection changes
  useEffect(() => {
    broadcastCursor(selectedStoryId);
  }, [selectedStoryId, broadcastCursor]);

  // Show onboarding wizard for new users with no projects
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('planview_onboarding_done') === 'true',
  );
  const showOnboarding = !onboardingDismissed && projects && projects.length === 0;

  if (showOnboarding) {
    return (
      <>
        <ToastContainer />
        <OnboardingWizard
          userName={user?.name || 'there'}
          onComplete={(projectId) => {
            localStorage.setItem('planview_onboarding_done', 'true');
            setOnboardingDismissed(true);
            setActiveProject(projectId);
          }}
          onSkip={() => {
            localStorage.setItem('planview_onboarding_done', 'true');
            setOnboardingDismissed(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f5f6f8]">
      {/* Toast notifications */}
      <ToastContainer />

      {/* Top Bar */}
      <TopBar
        projects={projects || []}
        activeProjectId={activeProjectId}
        onProjectChange={setActiveProject}
        userName={user?.name || ''}
        userInitials={user?.initials || '??'}
        userColor={user?.color || '#6366f1'}
        onCreateStory={() => setShowCreateStory(true)}
        onCreateFeature={() => setShowCreateFeature(true)}
        onCreateProject={() => setShowCreateProject(true)}
        onInviteUser={() => setShowInviteUser(true)}
        onBilling={() => setShowBilling(true)}
        onExportJson={() => { if (activeProjectId) exportsApi.downloadJson(activeProjectId); }}
        onExportCsv={() => { if (activeProjectId) exportsApi.downloadCsv(activeProjectId); }}
        onlineUsers={onlineUsers}
        isConnected={isConnected}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile sidebar toggle */}
        <button
          className="sidebar-mobile-toggle fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center shadow-lg border-none cursor-pointer md:hidden"
          onClick={() => setShowMobileSidebar((v) => !v)}
          style={{ fontFamily: 'inherit', fontSize: 16 }}
        >
          ☰
        </button>

        {/* Mobile sidebar overlay */}
        {showMobileSidebar && (
          <div className="sidebar-mobile-overlay" onClick={() => setShowMobileSidebar(false)}>
            <div className="sidebar-mobile" onClick={(e) => e.stopPropagation()}>
              <Sidebar
                features={timeline?.features || []}
                stories={timeline?.stories || []}
                selectedStoryId={selectedStoryId}
                onCreateFeature={() => setShowCreateFeature(true)}
              />
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="sidebar-desktop" style={{ display: 'flex', alignSelf: 'stretch' }}>
          <Sidebar
            features={timeline?.features || []}
            stories={timeline?.stories || []}
            selectedStoryId={selectedStoryId}
            onCreateFeature={() => setShowCreateFeature(true)}
          />
        </div>

        {/* Gantt area */}
        <div className="flex-1 relative overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-400 font-medium">Loading timeline...</span>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3">⚠️</div>
                <div className="text-sm font-semibold text-slate-700">Failed to load timeline</div>
                <div className="text-xs text-slate-400 mt-1">Check your connection and try again</div>
              </div>
            </div>
          ) : mainView === 'resource' ? (
            <ResourceView
              stories={timeline?.stories || []}
              members={timeline?.members || []}
              onSelectStory={(id) => selectStory(id)}
            />
          ) : (
            <GanttChart
              features={timeline?.features || []}
              stories={timeline?.stories || []}
              subtasks={timeline?.subtasks || []}
              dependencies={timeline?.dependencies || []}
              members={timeline?.members || []}
              onMoveStory={(id, startDate, endDate) => {
                moveStory.mutate({ id, startDate, endDate }, {
                  onSuccess: () => toast.success('Story moved'),
                  onError: () => toast.error('Failed to move story'),
                });
              }}
              onUpdateStory={(id, data) => {
                updateStory.mutate({ id, ...data });
              }}
              onCreateDependency={(fromId, toId) => {
                createDependency.mutate({ fromStoryId: fromId, toStoryId: toId }, {
                  onSuccess: () => toast.success('Dependency created'),
                  onError: (err: any) => toast.error(err?.response?.data?.message?.[0] || 'Failed to create dependency'),
                });
              }}
              onDeleteDependency={(id) => {
                deleteDependency.mutate(id, {
                  onSuccess: () => toast.success('Dependency removed'),
                  onError: () => toast.error('Failed to remove dependency'),
                });
              }}
            />
          )}

          {/* Smart Summary */}
          {summary && mainView === 'gantt' && <SmartSummary summary={summary} />}
        </div>

        {/* Detail Drawer */}
        {selectedStoryId && timeline && (
          <DetailDrawer
            story={timeline.stories.find((s: any) => s.id === selectedStoryId)}
            subtasks={timeline.subtasks?.filter((st: any) => st.storyId === selectedStoryId) || []}
            dependencies={timeline.dependencies?.filter(
              (d: any) => d.fromStoryId === selectedStoryId || d.toStoryId === selectedStoryId
            ) || []}
            allStories={timeline.stories}
            features={timeline.features}
            members={timeline.members || []}
            onUpdate={(data) => {
              updateStory.mutate({ id: selectedStoryId, ...data }, {
                onSuccess: () => toast.success('Story updated'),
                onError: () => toast.error('Failed to update story'),
              });
            }}
            onDelete={(id, name) => handleDeleteStory(id, name)}
            onClose={() => selectStory(null)}
          />
        )}
      </div>

      {/* ─── Modals ─── */}
      <CreateStoryModal
        open={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onSubmit={(data) => {
          createStory.mutate(data, {
            onSuccess: () => { setShowCreateStory(false); toast.success('Story created'); },
            onError: () => toast.error('Failed to create story'),
          });
        }}
        projectId={activeProjectId || ''}
        features={timeline?.features || []}
        members={timeline?.members || []}
        isLoading={createStory.isPending}
      />

      <CreateFeatureModal
        open={showCreateFeature}
        onClose={() => setShowCreateFeature(false)}
        onSubmit={(data) => {
          createFeature.mutate(data, {
            onSuccess: () => { setShowCreateFeature(false); toast.success('Feature created'); },
            onError: () => toast.error('Failed to create feature'),
          });
        }}
        projectId={activeProjectId || ''}
        isLoading={createFeature.isPending}
      />

      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSubmit={(data) => {
          createProject.mutate(data, {
            onSuccess: (project: any) => {
              setShowCreateProject(false);
              setActiveProject(project.id);
              toast.success(`Project "${data.name}" created`);
            },
            onError: () => toast.error('Failed to create project'),
          });
        }}
        isLoading={createProject.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type || 'item'}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone. All subtasks and dependencies will also be removed.`}
        confirmLabel="Delete"
        isLoading={deleteStory.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteStory.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(`"${deleteTarget.name}" deleted`);
              setDeleteTarget(null);
              if (selectedStoryId === deleteTarget.id) selectStory(null);
            },
            onError: () => toast.error('Failed to delete'),
          });
        }}
      />

      {/* Invite User */}
      <InviteUserModal
        open={showInviteUser}
        onClose={() => setShowInviteUser(false)}
      />

      {/* Billing */}
      <BillingModal
        open={showBilling}
        onClose={() => setShowBilling(false)}
      />
    </div>
  );
}
