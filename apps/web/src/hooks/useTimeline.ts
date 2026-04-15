import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timelineApi, storiesApi, subtasksApi, featuresApi, dependenciesApi, projectsApi, invitationsApi, billingApi } from '../api/client';

// ─── Timeline (main Gantt data) ───
export function useTimeline(projectId: string | null) {
  return useQuery({
    queryKey: ['timeline', projectId],
    queryFn: () => timelineApi.get({ projectId: projectId! }),
    enabled: !!projectId,
    staleTime: 30_000, // 30s before refetch
    refetchOnWindowFocus: true,
  });
}

export function useTimelineSummary(projectId: string | null) {
  return useQuery({
    queryKey: ['timeline-summary', projectId],
    queryFn: () => timelineApi.summary(projectId!),
    enabled: !!projectId,
    staleTime: 15_000,
    refetchInterval: 60_000, // Auto-refresh every minute
  });
}

// ─── Projects ───
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    staleTime: 60_000,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

// ─── Stories ───
export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: storiesApi.create,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['timeline'] });
      qc.invalidateQueries({ queryKey: ['timeline-summary'] });
    },
  });
}

export function useUpdateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      storiesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline'] });
      qc.invalidateQueries({ queryKey: ['timeline-summary'] });
    },
  });
}

export function useMoveStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, startDate, endDate }: { id: string; startDate: string; endDate: string }) =>
      storiesApi.move(id, { startDate, endDate }),
    // Optimistic update for instant drag feedback
    onMutate: async ({ id, startDate, endDate }) => {
      await qc.cancelQueries({ queryKey: ['timeline'] });
      const previous = qc.getQueryData(['timeline']);
      qc.setQueryData(['timeline'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          stories: old.stories.map((s: any) =>
            s.id === id ? { ...s, startDate, endDate } : s,
          ),
        };
      });
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        qc.setQueryData(['timeline'], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: storiesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline'] });
      qc.invalidateQueries({ queryKey: ['timeline-summary'] });
    },
  });
}

// ─── Features ───
export function useCreateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: featuresApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeline'] }),
  });
}

// ─── Subtasks ───
export function useUpdateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) =>
      subtasksApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline'] });
      qc.invalidateQueries({ queryKey: ['timeline-summary'] });
    },
  });
}

// ─── Dependencies ───
export function useCreateDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dependenciesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeline'] }),
  });
}

export function useDeleteDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dependenciesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeline'] }),
  });
}

// ─── Invitations ───
export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: invitationsApi.list,
    staleTime: 30_000,
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invitationsApi.invite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invitationsApi.revoke,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  });
}

// ─── Billing ───
export function useBillingUsage() {
  return useQuery({
    queryKey: ['billing-usage'],
    queryFn: billingApi.getUsage,
    staleTime: 60_000,
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ['billing-subscription'],
    queryFn: billingApi.getSubscription,
    staleTime: 60_000,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: billingApi.createCheckout,
  });
}

export function useCreatePortal() {
  return useMutation({
    mutationFn: billingApi.createPortal,
  });
}
