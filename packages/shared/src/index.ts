// ═══════════════════════════════════════════════════════════════
// PlanView — Shared Types
// Single source of truth for API contracts, entities, and enums
// ═══════════════════════════════════════════════════════════════

// ─── Enums ──────────────────────────────────────────────────────

export enum PlanTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum StoryStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  DONE = 'done',
  DELAYED = 'delayed',
}

export enum SubtaskStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  DONE = 'done',
}

export enum DependencyType {
  FS = 'FS', // Finish-to-Start
  FF = 'FF', // Finish-to-Finish
  SS = 'SS', // Start-to-Start
  SF = 'SF', // Start-to-Finish
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
}

// ─── Entity Interfaces ─────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  planTier: PlanTier;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  maxProjects: number;
  maxUsersPerProject: number;
  features: {
    dependencies: boolean;
    resourceView: boolean;
    customFields: boolean;
    apiAccess: boolean;
  };
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  initials: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: UserRole;
  tenantId: string;
}

export interface Feature {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  sortOrder: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  tenantId: string;
  projectId: string;
  featureId: string;
  name: string;
  description?: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;
  status: StoryStatus;
  assigneeId?: string;
  progress: number; // 0-100
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  tenantId: string;
  storyId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status: SubtaskStatus;
  assigneeId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Dependency {
  id: string;
  tenantId: string;
  fromStoryId: string;
  toStoryId: string;
  type: DependencyType;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  ipHash: string;
  createdAt: string;
}

export interface SavedView {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  filters: ViewFilters;
  grouping: 'feature' | 'assignee' | 'status';
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ViewFilters {
  statuses?: StoryStatus[];
  assigneeIds?: string[];
  featureIds?: string[];
  dateRange?: { from: string; to: string };
  search?: string;
}

// ─── API Request/Response Types ─────────────────────────────────

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenantName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: Tenant;
}

export interface RefreshRequest {
  refreshToken: string;
}

// CRUD
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateFeatureRequest {
  projectId: string;
  name: string;
  color?: string;
}

export interface UpdateFeatureRequest {
  name?: string;
  color?: string;
  sortOrder?: number;
}

export interface CreateStoryRequest {
  projectId: string;
  featureId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  assigneeId?: string;
  status?: StoryStatus;
}

export interface UpdateStoryRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: StoryStatus;
  assigneeId?: string;
  progress?: number;
  featureId?: string;
  sortOrder?: number;
}

export interface MoveStoryRequest {
  startDate: string;
  endDate: string;
}

export interface CreateSubtaskRequest {
  storyId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  assigneeId?: string;
}

export interface UpdateSubtaskRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: SubtaskStatus;
  assigneeId?: string;
  sortOrder?: number;
}

export interface CreateDependencyRequest {
  fromStoryId: string;
  toStoryId: string;
  type?: DependencyType;
}

// Timeline
export interface TimelineQuery {
  projectId: string;
  from?: string;
  to?: string;
  statuses?: StoryStatus[];
  assigneeIds?: string[];
  featureIds?: string[];
}

export interface TimelineResponse {
  features: Feature[];
  stories: Story[];
  subtasks: Subtask[];
  dependencies: Dependency[];
  members: (User & { role: UserRole })[];
}

// Smart Summary
export interface SmartSummaryResponse {
  dueToday: number;
  startingToday: number;
  overdue: number;
  completedToday: number;
  totalActive: number;
  overdueStories: Story[];
  overloadedUsers: { user: User; storyCount: number }[];
}

// Pagination
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// WebSocket Events
export enum WsEvent {
  STORY_UPDATED = 'story:updated',
  STORY_CREATED = 'story:created',
  STORY_DELETED = 'story:deleted',
  STORY_MOVED = 'story:moved',
  SUBTASK_UPDATED = 'subtask:updated',
  DEPENDENCY_CREATED = 'dependency:created',
  DEPENDENCY_DELETED = 'dependency:deleted',
  USER_CURSOR = 'user:cursor',
  USER_PRESENCE = 'user:presence',
}

export interface WsPayload<T = unknown> {
  event: WsEvent;
  tenantId: string;
  projectId: string;
  actorId: string;
  data: T;
  timestamp: string;
}

// ─── Utility Types ──────────────────────────────────────────────

export type WithTenant<T> = T & { tenantId: string };
export type WithTimestamps<T> = T & { createdAt: string; updatedAt: string };

// ─── Invitations ────────────────────────────────────────────────

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface InviteUserRequest {
  email: string;
  role?: UserRole;
}

export interface InviteUserResponse {
  invitation: Invitation;
  message: string;
}

export interface AcceptInviteRequest {
  token: string;
  name: string;
  password: string;
}

// ─── Billing & Subscriptions ────────────────────────────────────

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export interface PlanLimits {
  maxProjects: number;
  maxUsersPerTenant: number;
  maxStoriesPerProject: number;
  features: {
    dependencies: boolean;
    resourceView: boolean;
    customFields: boolean;
    apiAccess: boolean;
    sso: boolean;
    auditLog: boolean;
    webhooks: boolean;
    dataExport: boolean;
  };
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxProjects: 3,
    maxUsersPerTenant: 5,
    maxStoriesPerProject: 50,
    features: {
      dependencies: true,
      resourceView: false,
      customFields: false,
      apiAccess: false,
      sso: false,
      auditLog: false,
      webhooks: false,
      dataExport: false,
    },
  },
  pro: {
    maxProjects: 25,
    maxUsersPerTenant: 50,
    maxStoriesPerProject: 500,
    features: {
      dependencies: true,
      resourceView: true,
      customFields: true,
      apiAccess: true,
      sso: false,
      auditLog: true,
      webhooks: true,
      dataExport: true,
    },
  },
  enterprise: {
    maxProjects: -1, // unlimited
    maxUsersPerTenant: -1,
    maxStoriesPerProject: -1,
    features: {
      dependencies: true,
      resourceView: true,
      customFields: true,
      apiAccess: true,
      sso: true,
      auditLog: true,
      webhooks: true,
      dataExport: true,
    },
  },
};

export interface Subscription {
  id: string;
  tenantId: string;
  paymentProvider: 'none' | 'stripe' | 'razorpay';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  razorpayCustomerId: string | null;
  razorpaySubscriptionId: string | null;
  razorpayPlanId: string | null;
  planTier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutRequest {
  planTier: PlanTier;
  billing?: 'monthly' | 'yearly';
  provider?: 'stripe' | 'razorpay';
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResponse {
  checkoutUrl?: string;   // Stripe redirect
  sessionId?: string;     // Stripe session
  razorpaySubscriptionId?: string; // Razorpay sub ID for frontend SDK
  razorpayKeyId?: string;          // Razorpay publishable key
  provider: 'stripe' | 'razorpay';
}

export interface BillingPortalRequest {
  returnUrl: string;
}

export interface BillingPortalResponse {
  portalUrl: string;
}

export interface UsageResponse {
  planTier: PlanTier;
  limits: PlanLimits;
  usage: {
    projects: number;
    users: number;
    storiesInLargestProject: number;
  };
  percentages: {
    projects: number;
    users: number;
    stories: number;
  };
}
