import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/client';

export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.listUsers,
    staleTime: 30_000,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useRemoveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.removeUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useTenant() {
  return useQuery({
    queryKey: ['admin-tenant'],
    queryFn: adminApi.getTenant,
    staleTime: 60_000,
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; slug?: string }) =>
      adminApi.updateTenant(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenant'] }),
  });
}

export function useAuditLogs(page: number = 1) {
  return useQuery({
    queryKey: ['admin-audit', page],
    queryFn: () => adminApi.getAuditLogs({ page, limit: 25 }),
    staleTime: 15_000,
  });
}
