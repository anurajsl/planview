/**
 * PlanView — Database Seed Script
 * 
 * Run: npm run seed (from apps/api)
 * Requires: PostgreSQL running with init.sql applied
 * 
 * Creates a demo tenant, users, project, features, stories, subtasks, and dependencies
 * for development and demo purposes.
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  TenantEntity, UserEntity, ProjectEntity, ProjectMemberEntity,
  FeatureEntity, StoryEntity, SubtaskEntity, DependencyEntity,
} from './entities';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://planview:planview_dev_secret_2026@localhost:5432/planview',
  entities: [
    TenantEntity, UserEntity, ProjectEntity, ProjectMemberEntity,
    FeatureEntity, StoryEntity, SubtaskEntity, DependencyEntity,
  ],
  synchronize: false,
});

const d = (offset: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
};

async function seed() {
  await dataSource.initialize();
  console.log('🌱 Seeding database...');

  const tenantRepo = dataSource.getRepository(TenantEntity);
  const userRepo = dataSource.getRepository(UserEntity);
  const projectRepo = dataSource.getRepository(ProjectEntity);
  const memberRepo = dataSource.getRepository(ProjectMemberEntity);
  const featureRepo = dataSource.getRepository(FeatureEntity);
  const storyRepo = dataSource.getRepository(StoryEntity);
  const subtaskRepo = dataSource.getRepository(SubtaskEntity);
  const depRepo = dataSource.getRepository(DependencyEntity);

  // ─── Tenant ───
  const tenant = await tenantRepo.save(tenantRepo.create({
    name: 'Acme Corp',
    slug: 'acme-corp',
    planTier: 'pro',
    settings: {
      maxProjects: 10,
      maxUsersPerProject: 25,
      features: { dependencies: true, resourceView: true, customFields: false, apiAccess: true },
    },
  }));
  console.log('  ✓ Tenant created:', tenant.name);

  // ─── Users ───
  const passwordHash = await bcrypt.hash('password123', 12);
  const users = await userRepo.save([
    userRepo.create({ tenantId: tenant.id, email: 'arjun@acme.com', passwordHash, name: 'Arjun Mehta', role: 'owner', initials: 'AM', color: '#6366f1' }),
    userRepo.create({ tenantId: tenant.id, email: 'sarah@acme.com', passwordHash, name: 'Sarah Chen', role: 'admin', initials: 'SC', color: '#ec4899' }),
    userRepo.create({ tenantId: tenant.id, email: 'david@acme.com', passwordHash, name: 'David Kim', role: 'member', initials: 'DK', color: '#f59e0b' }),
    userRepo.create({ tenantId: tenant.id, email: 'priya@acme.com', passwordHash, name: 'Priya Nair', role: 'member', initials: 'PN', color: '#10b981' }),
    userRepo.create({ tenantId: tenant.id, email: 'liam@acme.com', passwordHash, name: 'Liam Torres', role: 'member', initials: 'LT', color: '#8b5cf6' }),
  ]);
  console.log('  ✓ Users created:', users.length);

  // ─── Project ───
  const project = await projectRepo.save(projectRepo.create({
    tenantId: tenant.id, name: 'PlanView v1.0', description: 'Building the Gantt-first project management platform',
    status: 'active', createdBy: users[0].id,
  }));

  // Add all users as project members
  await memberRepo.save(users.map((u) => memberRepo.create({
    projectId: project.id, userId: u.id, tenantId: tenant.id, role: u.role,
  })));
  console.log('  ✓ Project created with', users.length, 'members');

  // ─── Features ───
  const features = await featureRepo.save([
    featureRepo.create({ tenantId: tenant.id, projectId: project.id, name: 'User Authentication', sortOrder: 0, color: '#6366f1' }),
    featureRepo.create({ tenantId: tenant.id, projectId: project.id, name: 'Dashboard & Analytics', sortOrder: 1, color: '#0ea5e9' }),
    featureRepo.create({ tenantId: tenant.id, projectId: project.id, name: 'Notification System', sortOrder: 2, color: '#f59e0b' }),
  ]);
  console.log('  ✓ Features created:', features.length);

  // ─── Stories ───
  const stories = await storyRepo.save([
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[0].id, name: 'Login & Registration Flow', startDate: d(-10), endDate: d(-1), status: 'done', assigneeId: users[0].id, progress: 100, sortOrder: 0 }),
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[0].id, name: 'OAuth Integration (Google/GitHub)', startDate: d(-3), endDate: d(4), status: 'active', assigneeId: users[1].id, progress: 60, sortOrder: 1 }),
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[0].id, name: 'Role-Based Access Control', startDate: d(2), endDate: d(12), status: 'planned', assigneeId: users[0].id, progress: 0, sortOrder: 2 }),
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[1].id, name: 'Project Overview Dashboard', startDate: d(-5), endDate: d(0), status: 'active', assigneeId: users[2].id, progress: 85, sortOrder: 0 }),
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[1].id, name: 'Analytics Charts & Reports', startDate: d(0), endDate: d(10), status: 'active', assigneeId: users[3].id, progress: 15, sortOrder: 1 }),
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[1].id, name: 'Export to PDF/CSV', startDate: d(8), endDate: d(16), status: 'planned', assigneeId: users[2].id, progress: 0, sortOrder: 2 }),
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[2].id, name: 'In-App Notifications', startDate: d(-8), endDate: d(-2), status: 'delayed', assigneeId: users[4].id, progress: 45, sortOrder: 0 }),
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[2].id, name: 'Email Digest System', startDate: d(1), endDate: d(9), status: 'planned', assigneeId: users[4].id, progress: 0, sortOrder: 1 }),
    storyRepo.create({ tenantId: tenant.id, projectId: project.id, featureId: features[2].id, name: 'Webhook Event System', startDate: d(5), endDate: d(18), status: 'planned', assigneeId: users[1].id, progress: 0, sortOrder: 2 }),
  ]);
  console.log('  ✓ Stories created:', stories.length);

  // ─── Subtasks ───
  const subtaskData = await subtaskRepo.save([
    subtaskRepo.create({ tenantId: tenant.id, storyId: stories[1].id, name: 'Google OAuth setup', startDate: d(-3), endDate: d(0), status: 'done', assigneeId: users[1].id, sortOrder: 0 }),
    subtaskRepo.create({ tenantId: tenant.id, storyId: stories[1].id, name: 'GitHub OAuth setup', startDate: d(0), endDate: d(2), status: 'active', assigneeId: users[1].id, sortOrder: 1 }),
    subtaskRepo.create({ tenantId: tenant.id, storyId: stories[1].id, name: 'Token refresh logic', startDate: d(2), endDate: d(4), status: 'planned', assigneeId: users[1].id, sortOrder: 2 }),
    subtaskRepo.create({ tenantId: tenant.id, storyId: stories[3].id, name: 'Wireframes & design', startDate: d(-5), endDate: d(-3), status: 'done', assigneeId: users[2].id, sortOrder: 0 }),
    subtaskRepo.create({ tenantId: tenant.id, storyId: stories[3].id, name: 'Widget components', startDate: d(-3), endDate: d(-1), status: 'done', assigneeId: users[2].id, sortOrder: 1 }),
    subtaskRepo.create({ tenantId: tenant.id, storyId: stories[3].id, name: 'Data integration', startDate: d(-1), endDate: d(0), status: 'active', assigneeId: users[2].id, sortOrder: 2 }),
    subtaskRepo.create({ tenantId: tenant.id, storyId: stories[4].id, name: 'Chart library evaluation', startDate: d(0), endDate: d(2), status: 'active', assigneeId: users[3].id, sortOrder: 0 }),
    subtaskRepo.create({ tenantId: tenant.id, storyId: stories[4].id, name: 'Build chart components', startDate: d(2), endDate: d(7), status: 'planned', assigneeId: users[3].id, sortOrder: 1 }),
  ]);
  console.log('  ✓ Subtasks created:', subtaskData.length);

  // ─── Dependencies ───
  const deps = await depRepo.save([
    depRepo.create({ tenantId: tenant.id, fromStoryId: stories[0].id, toStoryId: stories[1].id, type: 'FS' }),
    depRepo.create({ tenantId: tenant.id, fromStoryId: stories[1].id, toStoryId: stories[2].id, type: 'FS' }),
    depRepo.create({ tenantId: tenant.id, fromStoryId: stories[3].id, toStoryId: stories[5].id, type: 'FS' }),
    depRepo.create({ tenantId: tenant.id, fromStoryId: stories[6].id, toStoryId: stories[7].id, type: 'FS' }),
  ]);
  console.log('  ✓ Dependencies created:', deps.length);

  console.log('\n✅ Seed complete!');
  console.log('   Login: arjun@acme.com / password123');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
