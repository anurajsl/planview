import { create } from 'zustand';
import { authApi } from '../api/client';

interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  avatarUrl?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  planTier: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; tenantName: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('planview_access_token', res.accessToken);
    localStorage.setItem('planview_refresh_token', res.refreshToken);
    localStorage.setItem('planview_user', JSON.stringify(res.user));
    localStorage.setItem('planview_tenant', JSON.stringify(res.tenant));
    set({ user: res.user, tenant: res.tenant, isAuthenticated: true });
  },

  register: async (data) => {
    const res = await authApi.register(data);
    localStorage.setItem('planview_access_token', res.accessToken);
    localStorage.setItem('planview_refresh_token', res.refreshToken);
    localStorage.setItem('planview_user', JSON.stringify(res.user));
    localStorage.setItem('planview_tenant', JSON.stringify(res.tenant));
    set({ user: res.user, tenant: res.tenant, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue logout even if API fails
    }
    localStorage.removeItem('planview_access_token');
    localStorage.removeItem('planview_refresh_token');
    localStorage.removeItem('planview_user');
    localStorage.removeItem('planview_tenant');
    set({ user: null, tenant: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem('planview_access_token');
    const userStr = localStorage.getItem('planview_user');
    const tenantStr = localStorage.getItem('planview_tenant');

    if (token && userStr && tenantStr) {
      try {
        set({
          user: JSON.parse(userStr),
          tenant: JSON.parse(tenantStr),
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
