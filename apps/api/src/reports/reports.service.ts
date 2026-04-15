import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoryEntity, UserEntity, ProjectEntity } from '../database/entities';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(StoryEntity) private readonly storyRepo: Repository<StoryEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ProjectEntity) private readonly projectRepo: Repository<ProjectEntity>,
  ) {}

  async getVelocity(tenantId: string, projectId: string, weeks: number) {
    const project = await this.projectRepo.findOne({ where: { id: projectId, tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    // Get stories completed in the last N weeks, grouped by week
    const result = await this.storyRepo
      .createQueryBuilder('s')
      .select("date_trunc('week', s.updated_at)", 'week')
      .addSelect('COUNT(*)', 'completed')
      .where('s.project_id = :projectId', { projectId })
      .andWhere('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.status = :status', { status: 'done' })
      .andWhere('s.updated_at >= NOW() - :interval::interval', { interval: `${weeks} weeks` })
      .groupBy("date_trunc('week', s.updated_at)")
      .orderBy('week', 'ASC')
      .getRawMany();

    return {
      weeks: result.map((r) => ({
        week: r.week,
        completed: parseInt(r.completed, 10),
      })),
      average: result.length > 0
        ? Math.round(result.reduce((sum, r) => sum + parseInt(r.completed, 10), 0) / result.length * 10) / 10
        : 0,
    };
  }

  async getBurndown(tenantId: string, projectId: string) {
    const stories = await this.storyRepo.find({
      where: { projectId, tenantId },
      select: ['id', 'startDate', 'endDate', 'status', 'createdAt'],
      order: { createdAt: 'ASC' },
    });

    const total = stories.length;
    if (total === 0) return { points: [], total: 0 };

    // Build daily burndown: remaining = total - cumulative done
    const allDates = stories.flatMap((s) => [s.startDate, s.endDate]).filter(Boolean).sort();
    const startDate = allDates[0];
    const endDate = allDates[allDates.length - 1];

    const points: { date: string; remaining: number; ideal: number }[] = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const doneByDate = stories.filter(
        (s) => s.status === 'done' && s.endDate && s.endDate <= dateStr,
      ).length;
      const dayIndex = Math.round((d.getTime() - start.getTime()) / 86400000);

      points.push({
        date: dateStr,
        remaining: total - doneByDate,
        ideal: Math.round((total - (total * dayIndex / Math.max(totalDays - 1, 1))) * 10) / 10,
      });
    }

    return { points, total };
  }

  async getStatusBreakdown(tenantId: string, projectId: string) {
    const result = await this.storyRepo
      .createQueryBuilder('s')
      .select('s.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('s.project_id = :projectId', { projectId })
      .andWhere('s.tenant_id = :tenantId', { tenantId })
      .groupBy('s.status')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    return {
      breakdown: result.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
        percentage: total > 0 ? Math.round((parseInt(r.count, 10) / total) * 100) : 0,
      })),
      total,
    };
  }

  async getMemberWorkload(tenantId: string, projectId: string) {
    const result = await this.storyRepo
      .createQueryBuilder('s')
      .select('s.assignee_id', 'assigneeId')
      .addSelect('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END)", 'active')
      .addSelect("SUM(CASE WHEN s.status = 'done' THEN 1 ELSE 0 END)", 'done')
      .where('s.project_id = :projectId', { projectId })
      .andWhere('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.assignee_id IS NOT NULL')
      .groupBy('s.assignee_id')
      .getRawMany();

    const members = await this.userRepo.find({
      where: { tenantId },
      select: ['id', 'name', 'initials', 'color'],
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    return result.map((r) => {
      const member = memberMap.get(r.assigneeId);
      return {
        assigneeId: r.assigneeId,
        name: member?.name || 'Unknown',
        initials: member?.initials || '??',
        color: member?.color || '#94a3b8',
        total: parseInt(r.total, 10),
        active: parseInt(r.active, 10),
        done: parseInt(r.done, 10),
      };
    });
  }
}
