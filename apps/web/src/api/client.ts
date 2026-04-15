import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor: attach JWT ───
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('planview_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: auto-refresh on 401 ───
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('planview_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('planview_access_token', data.accessToken);
        localStorage.setItem('planview_refresh_token', data.refreshToken);

        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens and redirect to login
        localStorage.removeItem('planview_access_token');
        localStorage.removeItem('planview_refresh_token');
        localStorage.removeItem('planview_user');
        localStorage.removeItem('planview_tenant');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── API Functions ───

export const authApi = {
  register: (data: { email: string; password: string; name: string; tenantName: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
};

export const projectsApi = {
  list: () => api.get('/projects').then((r) => r.data),
  get: (id: string) => api.get(`/projects/${id}`).then((r) => r.data),
  create: (data: { name: string; description?: string }) =>
    api.post('/projects', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/projects/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
};

export const featuresApi = {
  list: (projectId: string) =>
    api.get('/features', { params: { projectId } }).then((r) => r.data),
  create: (data: { projectId: string; name: string; color?: string }) =>
    api.post('/features', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/features/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/features/${id}`).then((r) => r.data),
};

export const storiesApi = {
  list: (projectId: string) =>
    api.get('/stories', { params: { projectId } }).then((r) => r.data),
  get: (id: string) => api.get(`/stories/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/stories', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/stories/${id}`, data).then((r) => r.data),
  move: (id: string, data: { startDate: string; endDate: string }) =>
    api.patch(`/stories/${id}/move`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/stories/${id}`).then((r) => r.data),
};

export const subtasksApi = {
  list: (storyId: string) =>
    api.get('/subtasks', { params: { storyId } }).then((r) => r.data),
  create: (data: any) => api.post('/subtasks', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/subtasks/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/subtasks/${id}`).then((r) => r.data),
};

export const dependenciesApi = {
  create: (data: { fromStoryId: string; toStoryId: string; type?: string }) =>
    api.post('/dependencies', data).then((r) => r.data),
  delete: (id: string) => api.delete(`/dependencies/${id}`).then((r) => r.data),
};

export const timelineApi = {
  get: (params: {
    projectId: string;
    from?: string;
    to?: string;
    statuses?: string[];
    assigneeIds?: string[];
  }) =>
    api.get('/timeline', {
      params: {
        ...params,
        statuses: params.statuses?.join(','),
        assigneeIds: params.assigneeIds?.join(','),
      },
    }).then((r) => r.data),
  summary: (projectId: string) =>
    api.get('/timeline/summary', { params: { projectId } }).then((r) => r.data),
};

export const usersApi = {
  list: () => api.get('/users').then((r) => r.data),
  get: (id: string) => api.get(`/users/${id}`).then((r) => r.data),
};

export const invitationsApi = {
  list: () => api.get('/invitations').then((r) => r.data),
  invite: (data: { email: string; role?: string }) =>
    api.post('/invitations', data).then((r) => r.data),
  revoke: (id: string) => api.delete(`/invitations/${id}`).then((r) => r.data),
  accept: (data: { token: string; name: string; password: string }) =>
    api.post('/invitations/accept', data).then((r) => r.data),
};

export const billingApi = {
  getUsage: () => api.get('/billing/usage').then((r) => r.data),
  getSubscription: () => api.get('/billing/subscription').then((r) => r.data),
  getProviders: () => api.get('/billing/providers').then((r) => r.data),
  createCheckout: (data: { planTier: string; billing?: string; provider?: string; successUrl: string; cancelUrl: string }) =>
    api.post('/billing/checkout', data).then((r) => r.data),
  createPortal: (data: { returnUrl: string }) =>
    api.post('/billing/portal', data).then((r) => r.data),
  verifyRazorpay: (data: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) =>
    api.post('/billing/razorpay/verify', data).then((r) => r.data),
};

// ─── Admin API ───

export const adminApi = {
  // Users management
  listUsers: () => api.get('/users').then((r) => r.data),
  getUser: (id: string) => api.get(`/users/${id}`).then((r) => r.data),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/users/${id}/role`, { role }).then((r) => r.data),
  removeUser: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),

  // Tenant / org settings
  getTenant: () => api.get('/tenants/current').then((r) => r.data),
  updateTenant: (data: { name?: string; slug?: string }) =>
    api.patch('/tenants/current', data).then((r) => r.data),

  // Audit logs
  getAuditLogs: (params?: { page?: number; limit?: number }) =>
    api.get('/audit', { params }).then((r) => r.data),
};

// ─── Integrations API ───

export const integrationsApi = {
  list: () => api.get('/integrations').then((r) => r.data),
  create: (data: { provider: string; baseUrl: string; apiToken: string; username?: string; projectKey?: string }) =>
    api.post('/integrations', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/integrations/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/integrations/${id}`).then((r) => r.data),
  test: (id: string) => api.post(`/integrations/${id}/test`).then((r) => r.data),
  testWebhook: (provider: string, webhookUrl: string) =>
    api.post('/integrations/test-webhook', { provider, webhookUrl }).then((r) => r.data),
  searchJira: (q: string) => api.get('/integrations/jira/search', { params: { q } }).then((r) => r.data),
  searchGitLabIssues: (q: string) => api.get('/integrations/gitlab/issues', { params: { q } }).then((r) => r.data),
  searchGitLabMRs: (q: string) => api.get('/integrations/gitlab/merge-requests', { params: { q } }).then((r) => r.data),
  getStoryLinks: (storyId: string) => api.get(`/integrations/links/${storyId}`).then((r) => r.data),
  linkStory: (data: { storyId: string; provider: string; linkType: string; externalId: string; externalKey?: string; externalUrl?: string; title?: string }) =>
    api.post('/integrations/links', data).then((r) => r.data),
  unlinkStory: (id: string) => api.delete(`/integrations/links/${id}`).then((r) => r.data),
};

// ─── Exports API ───

export const exportsApi = {
  downloadJson: (projectId: string) =>
    api.get(`/exports/project/${projectId}/json`, { responseType: 'blob' }).then((r) => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `planview-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click(); window.URL.revokeObjectURL(url);
    }),
  downloadCsv: (projectId: string) =>
    api.get(`/exports/project/${projectId}/csv`, { responseType: 'blob' }).then((r) => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `planview-stories-${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); window.URL.revokeObjectURL(url);
    }),
};

// ─── Reports API ───

export const reportsApi = {
  velocity: (projectId: string, weeks?: number) =>
    api.get(`/reports/project/${projectId}/velocity`, { params: { weeks } }).then((r) => r.data),
  burndown: (projectId: string) =>
    api.get(`/reports/project/${projectId}/burndown`).then((r) => r.data),
  statusBreakdown: (projectId: string) =>
    api.get(`/reports/project/${projectId}/status-breakdown`).then((r) => r.data),
  memberWorkload: (projectId: string) =>
    api.get(`/reports/project/${projectId}/member-workload`).then((r) => r.data),
};
