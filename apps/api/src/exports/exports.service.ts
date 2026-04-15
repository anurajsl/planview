import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectEntity, FeatureEntity, StoryEntity, SubtaskEntity,
  DependencyEntity, UserEntity,
} from '../database/entities';

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(ProjectEntity) private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(FeatureEntity) private readonly featureRepo: Repository<FeatureEntity>,
    @InjectRepository(StoryEntity) private readonly storyRepo: Repository<StoryEntity>,
    @InjectRepository(SubtaskEntity) private readonly subtaskRepo: Repository<SubtaskEntity>,
    @InjectRepository(DependencyEntity) private readonly depRepo: Repository<DependencyEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
  ) {}

  async getProjectData(tenantId: string, projectId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId, tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    const [features, stories, subtasks, dependencies, members] = await Promise.all([
      this.featureRepo.find({ where: { projectId, tenantId }, order: { sortOrder: 'ASC' } }),
      this.storyRepo.find({ where: { projectId, tenantId }, order: { sortOrder: 'ASC' } }),
      this.subtaskRepo
        .createQueryBuilder('st')
        .innerJoin('st.story', 's', 's.project_id = :projectId', { projectId })
        .where('st.tenant_id = :tenantId', { tenantId })
        .orderBy('st.sort_order', 'ASC')
        .getMany(),
      this.depRepo
        .createQueryBuilder('d')
        .innerJoin('d.fromStory', 's', 's.project_id = :projectId', { projectId })
        .where('d.tenant_id = :tenantId', { tenantId })
        .getMany(),
      this.userRepo.find({ where: { tenantId }, select: ['id', 'name', 'email', 'role', 'initials', 'color'] }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      project: { id: project.id, name: project.name, description: project.description, status: project.status },
      features: features.map((f) => ({ id: f.id, name: f.name, color: f.color, sortOrder: f.sortOrder })),
      stories: stories.map((s) => ({
        id: s.id, featureId: s.featureId, name: s.name, description: s.description,
        startDate: s.startDate, endDate: s.endDate, status: s.status,
        assigneeId: s.assigneeId, progress: s.progress, sortOrder: s.sortOrder,
      })),
      subtasks: subtasks.map((st) => ({
        id: st.id, storyId: st.storyId, name: st.name,
        startDate: st.startDate, endDate: st.endDate, status: st.status,
        assigneeId: st.assigneeId, sortOrder: st.sortOrder,
      })),
      dependencies: dependencies.map((d) => ({
        id: d.id, fromStoryId: d.fromStoryId, toStoryId: d.toStoryId, type: d.type,
      })),
      members: members.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role })),
    };
  }

  async getProjectCsv(tenantId: string, projectId: string) {
    const data = await this.getProjectData(tenantId, projectId);
    const memberMap = new Map(data.members.map((m) => [m.id, m.name]));
    const featureMap = new Map(data.features.map((f) => [f.id, f.name]));

    const headers = [
      'Story Name', 'Feature', 'Status', 'Start Date', 'End Date',
      'Progress %', 'Assignee', 'Subtask Count', 'Description',
    ];

    const rows = data.stories.map((s) => {
      const subtaskCount = data.subtasks.filter((st) => st.storyId === s.id).length;
      return [
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${featureMap.get(s.featureId) || ''}"`,
        s.status,
        s.startDate,
        s.endDate,
        s.progress,
        `"${memberMap.get(s.assigneeId || '') || 'Unassigned'}"`,
        subtaskCount,
        `"${(s.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
