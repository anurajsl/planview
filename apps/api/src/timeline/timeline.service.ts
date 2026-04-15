import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  StoryEntity, SubtaskEntity, FeatureEntity,
  DependencyEntity, ProjectMemberEntity, UserEntity,
} from '../database/entities';

export interface TimelineQuery {
  projectId: string;
  from?: string;
  to?: string;
  statuses?: string[];
  assigneeIds?: string[];
  featureIds?: string[];
}

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(StoryEntity) private readonly storyRepo: Repository<StoryEntity>,
    @InjectRepository(SubtaskEntity) private readonly subtaskRepo: Repository<SubtaskEntity>,
    @InjectRepository(FeatureEntity) private readonly featureRepo: Repository<FeatureEntity>,
    @InjectRepository(DependencyEntity) private readonly depRepo: Repository<DependencyEntity>,
    @InjectRepository(ProjectMemberEntity) private readonly memberRepo: Repository<ProjectMemberEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Fetch all data needed for the Gantt view in parallel.
   * This is the primary API call for the frontend.
   * Designed to be < 200ms for 100 stories.
   */
  async getTimeline(tenantId: string, query: TimelineQuery) {
    const { projectId, from, to, statuses, assigneeIds, featureIds } = query;

    // Build story query with filters
    const storyQb = this.storyRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.assignee', 'assignee')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.project_id = :projectId', { projectId });

    if (from) storyQb.andWhere('s.end_date >= :from', { from });
    if (to) storyQb.andWhere('s.start_date <= :to', { to });
    if (statuses?.length) storyQb.andWhere('s.status IN (:...statuses)', { statuses });
    if (assigneeIds?.length) storyQb.andWhere('s.assignee_id IN (:...assigneeIds)', { assigneeIds });
    if (featureIds?.length) storyQb.andWhere('s.feature_id IN (:...featureIds)', { featureIds });

    storyQb.orderBy('s.sort_order', 'ASC').addOrderBy('s.created_at', 'ASC');

    // Execute all queries in parallel for speed
    const [stories, features, dependencies, memberRecords] = await Promise.all([
      storyQb.getMany(),
      this.featureRepo.find({
        where: { tenantId, projectId },
        order: { sortOrder: 'ASC' },
      }),
      this.depRepo.find({ where: { tenantId } }),
      this.memberRepo.find({
        where: { tenantId, projectId },
        relations: ['user'],
      }),
    ]);

    // Fetch subtasks for all stories in one query
    const storyIds = stories.map((s) => s.id);
    const subtasks = storyIds.length
      ? await this.subtaskRepo.find({
          where: { tenantId, storyId: In(storyIds) },
          relations: ['assignee'],
          order: { sortOrder: 'ASC' },
        })
      : [];

    // Filter dependencies to only include visible stories
    const storyIdSet = new Set(storyIds);
    const visibleDeps = dependencies.filter(
      (d) => storyIdSet.has(d.fromStoryId) && storyIdSet.has(d.toStoryId),
    );

    const members = memberRecords.map((m) => ({
      ...m.user,
      role: m.role,
    }));

    return { features, stories, subtasks, dependencies: visibleDeps, members };
  }

  /**
   * Smart Summary — quick-glance project health
   */
  async getSummary(tenantId: string, projectId: string) {
    const today = new Date().toISOString().split('T')[0];

    const [dueToday, startingToday, overdue, completedToday, totalActive] =
      await Promise.all([
        this.storyRepo.count({
          where: { tenantId, projectId, endDate: today, status: In(['planned', 'active', 'delayed']) as any },
        }),
        this.storyRepo.count({
          where: { tenantId, projectId, startDate: today },
        }),
        this.storyRepo
          .createQueryBuilder('s')
          .where('s.tenant_id = :tenantId', { tenantId })
          .andWhere('s.project_id = :projectId', { projectId })
          .andWhere('s.end_date < :today', { today })
          .andWhere('s.status != :done', { done: 'done' })
          .getCount(),
        this.storyRepo.count({
          where: { tenantId, projectId, status: 'done', endDate: today },
        }),
        this.storyRepo.count({
          where: { tenantId, projectId, status: 'active' },
        }),
      ]);

    // Overdue stories with details
    const overdueStories = await this.storyRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.assignee', 'a')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.project_id = :projectId', { projectId })
      .andWhere('s.end_date < :today', { today })
      .andWhere('s.status != :done', { done: 'done' })
      .orderBy('s.end_date', 'ASC')
      .getMany();

    // Overloaded users (more than 3 active stories)
    const overloaded = await this.storyRepo
      .createQueryBuilder('s')
      .select('s.assignee_id', 'assigneeId')
      .addSelect('COUNT(*)', 'count')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.project_id = :projectId', { projectId })
      .andWhere('s.status = :active', { active: 'active' })
      .andWhere('s.assignee_id IS NOT NULL')
      .groupBy('s.assignee_id')
      .having('COUNT(*) > 3')
      .getRawMany();

    return {
      dueToday,
      startingToday,
      overdue,
      completedToday,
      totalActive,
      overdueStories,
      overloadedUsers: overloaded,
    };
  }
}
