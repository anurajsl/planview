import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Unique, Check,
} from 'typeorm';

// ─── TENANT ─────────────────────────────────────────────────────
@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ name: 'plan_tier', length: 20, default: 'free' })
  planTier: string;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserEntity, (user) => user.tenant)
  users: UserEntity[];

  @OneToMany(() => ProjectEntity, (project) => project.tenant)
  projects: ProjectEntity[];
}

// ─── USER ───────────────────────────────────────────────────────
@Entity('users')
@Unique(['tenantId', 'email'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ length: 20, default: 'member' })
  role: string;

  @Column({ length: 5 })
  initials: string;

  @Column({ length: 7, default: '#6366f1' })
  color: string;

  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255, nullable: true, select: false })
  refreshTokenHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;
}

// ─── PROJECT ────────────────────────────────────────────────────
@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @OneToMany(() => FeatureEntity, (feature) => feature.project)
  features: FeatureEntity[];

  @OneToMany(() => StoryEntity, (story) => story.project)
  stories: StoryEntity[];

  @OneToMany(() => ProjectMemberEntity, (pm) => pm.project)
  members: ProjectMemberEntity[];
}

// ─── PROJECT MEMBER ─────────────────────────────────────────────
@Entity('project_members')
export class ProjectMemberEntity {
  @Column({ name: 'project_id', type: 'uuid', primary: true })
  projectId: string;

  @Column({ name: 'user_id', type: 'uuid', primary: true })
  userId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 20, default: 'member' })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ProjectEntity, (project) => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}

// ─── FEATURE ────────────────────────────────────────────────────
@Entity('features')
export class FeatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ length: 7, default: '#6366f1' })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ProjectEntity, (project) => project.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @OneToMany(() => StoryEntity, (story) => story.feature)
  stories: StoryEntity[];
}

// ─── STORY ──────────────────────────────────────────────────────
@Entity('stories')
@Check(`"end_date" >= "start_date"`)
export class StoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'feature_id', type: 'uuid' })
  featureId: string;

  @Column({ length: 500 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ length: 20, default: 'planned' })
  status: string;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ProjectEntity, (project) => project.stories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @ManyToOne(() => FeatureEntity, (feature) => feature.stories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feature_id' })
  feature: FeatureEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: UserEntity;

  @OneToMany(() => SubtaskEntity, (subtask) => subtask.story)
  subtasks: SubtaskEntity[];
}

// ─── SUBTASK ────────────────────────────────────────────────────
@Entity('subtasks')
export class SubtaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'story_id', type: 'uuid' })
  storyId: string;

  @Column({ length: 500 })
  name: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ length: 20, default: 'planned' })
  status: string;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => StoryEntity, (story) => story.subtasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'story_id' })
  story: StoryEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: UserEntity;
}

// ─── DEPENDENCY ─────────────────────────────────────────────────
@Entity('dependencies')
@Unique(['fromStoryId', 'toStoryId'])
@Check(`"from_story_id" != "to_story_id"`)
export class DependencyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'from_story_id', type: 'uuid' })
  fromStoryId: string;

  @Column({ name: 'to_story_id', type: 'uuid' })
  toStoryId: string;

  @Column({ length: 2, default: 'FS' })
  type: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => StoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_story_id' })
  fromStory: StoryEntity;

  @ManyToOne(() => StoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_story_id' })
  toStory: StoryEntity;
}

// ─── AUDIT LOG ──────────────────────────────────────────────────
@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ length: 20 })
  action: string;

  @Column({ name: 'resource_type', length: 50 })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ type: 'jsonb', default: {} })
  changes: Record<string, any>;

  @Column({ name: 'ip_hash', type: 'varchar', length: 64, nullable: true })
  ipHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// ─── SAVED VIEW ─────────────────────────────────────────────────
@Entity('saved_views')
export class SavedViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'jsonb', default: {} })
  filters: Record<string, any>;

  @Column({ length: 20, default: 'feature' })
  grouping: string;

  @Column({ name: 'is_shared', default: false })
  isShared: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// ─── REFRESH TOKEN ──────────────────────────────────────────────
@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'token_hash', length: 255 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// ─── INVITATION ─────────────────────────────────────────────
@Entity('invitations')
export class InvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 20, default: 'member' })
  role: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string;

  @Column({ length: 255, unique: true })
  token: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'invited_by' })
  inviter: UserEntity;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;
}

// ─── SUBSCRIPTION ───────────────────────────────────────────
@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', unique: true })
  tenantId: string;

  @Column({ name: 'payment_provider', length: 20, default: 'none' })
  paymentProvider: string; // 'none' | 'stripe' | 'razorpay'

  @Column({ name: 'stripe_customer_id', type: 'varchar', length: 255, nullable: true })
  stripeCustomerId: string | null;

  @Column({ name: 'stripe_subscription_id', type: 'varchar', length: 255, nullable: true })
  stripeSubscriptionId: string | null;

  @Column({ name: 'razorpay_customer_id', type: 'varchar', length: 255, nullable: true })
  razorpayCustomerId: string | null;

  @Column({ name: 'razorpay_subscription_id', type: 'varchar', length: 255, nullable: true })
  razorpaySubscriptionId: string | null;

  @Column({ name: 'razorpay_plan_id', type: 'varchar', length: 255, nullable: true })
  razorpayPlanId: string | null;

  @Column({ name: 'plan_tier', length: 20, default: 'free' })
  planTier: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: true })
  currentPeriodStart: Date | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;
}

// ─── INTEGRATION ────────────────────────────────────────────
@Entity('integrations')
@Unique(['tenantId', 'provider'])
export class IntegrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 20 })
  provider: string;

  @Column({ name: 'base_url', length: 500 })
  baseUrl: string;

  @Column({ name: 'api_token_encrypted', type: 'text' })
  apiTokenEncrypted: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ name: 'project_key', type: 'varchar', length: 100, nullable: true })
  projectKey: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;
}

// ─── STORY LINK ─────────────────────────────────────────────
@Entity('story_links')
@Unique(['storyId', 'provider', 'externalId'])
export class StoryLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'story_id', type: 'uuid' })
  storyId: string;

  @Column({ name: 'integration_id', type: 'uuid' })
  integrationId: string;

  @Column({ length: 20 })
  provider: string;

  @Column({ name: 'link_type', length: 20, default: 'issue' })
  linkType: string;

  @Column({ name: 'external_id', length: 255 })
  externalId: string;

  @Column({ name: 'external_key', type: 'varchar', length: 255, nullable: true })
  externalKey: string | null;

  @Column({ name: 'external_url', type: 'varchar', length: 500, nullable: true })
  externalUrl: string | null;

  @Column({ name: 'external_status', type: 'varchar', length: 100, nullable: true })
  externalStatus: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string | null;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => StoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'story_id' })
  story: StoryEntity;

  @ManyToOne(() => IntegrationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: IntegrationEntity;
}
