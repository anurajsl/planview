import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoryEntity, SubtaskEntity } from '../database/entities';
import { CreateStoryDto, UpdateStoryDto, MoveStoryDto } from './dto/story.dto';
import { EventsGateway } from '../websocket/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(StoryEntity) private readonly storyRepo: Repository<StoryEntity>,
    @InjectRepository(SubtaskEntity) private readonly subtaskRepo: Repository<SubtaskEntity>,
    private readonly events: EventsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(tenantId: string, projectId: string) {
    return this.storyRepo.find({
      where: { tenantId, projectId },
      relations: ['assignee', 'subtasks', 'subtasks.assignee'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const story = await this.storyRepo.findOne({
      where: { id, tenantId },
      relations: ['assignee', 'subtasks', 'subtasks.assignee', 'feature'],
    });
    if (!story) throw new NotFoundException('Story not found');
    return story;
  }

  async create(tenantId: string, dto: CreateStoryDto) {
    this.validateDates(dto.startDate, dto.endDate);

    // Get next sort order
    const maxSort = await this.storyRepo
      .createQueryBuilder('s')
      .select('MAX(s.sort_order)', 'max')
      .where('s.tenant_id = :tenantId AND s.feature_id = :featureId', {
        tenantId,
        featureId: dto.featureId,
      })
      .getRawOne();

    const story = this.storyRepo.create({
      ...dto,
      tenantId,
      status: dto.status || 'planned',
      progress: 0,
      sortOrder: (maxSort?.max ?? -1) + 1,
    });

    const saved = await this.storyRepo.save(story);
    const result = await this.findOne(tenantId, saved.id);
    this.events.broadcastToProject(tenantId, dto.projectId, 'story:created', result, '');

    // Notify chat channels
    this.notifications.notify({
      tenantId,
      event: 'story.created',
      title: '📋 New Story Created',
      body: `*${dto.name}* was added (${dto.startDate} → ${dto.endDate})`,
      color: '#3b82f6',
    }).catch(() => {});

    return result;
  }

  async update(tenantId: string, id: string, dto: UpdateStoryDto) {
    const story = await this.findOne(tenantId, id);

    if (dto.startDate || dto.endDate) {
      this.validateDates(
        dto.startDate || story.startDate,
        dto.endDate || story.endDate,
      );
    }

    Object.assign(story, dto);
    await this.storyRepo.save(story);
    const result = await this.findOne(tenantId, id);
    this.events.broadcastToProject(tenantId, story.projectId, 'story:updated', result, '');

    // Notify on status change to done
    if (dto.status === 'done') {
      this.notifications.notify({
        tenantId,
        event: 'story.completed',
        title: '✅ Story Completed',
        body: `*${story.name}* has been marked as done`,
        color: '#22c55e',
      }).catch(() => {});
    }

    return result;
  }

  /**
   * Move story on timeline (drag operation)
   * Preserves duration, shifts both dates.
   */
  async move(tenantId: string, id: string, dto: MoveStoryDto) {
    this.validateDates(dto.startDate, dto.endDate);
    const story = await this.findOne(tenantId, id);

    story.startDate = dto.startDate;
    story.endDate = dto.endDate;
    await this.storyRepo.save(story);

    const result = await this.findOne(tenantId, id);
    this.events.broadcastToProject(tenantId, story.projectId, 'story:moved', result, '');
    return result;
  }

  async delete(tenantId: string, id: string) {
    const story = await this.findOne(tenantId, id);
    const projectId = story.projectId;
    await this.storyRepo.remove(story);
    this.events.broadcastToProject(tenantId, projectId, 'story:deleted', { id }, '');
    return { deleted: true, id };
  }

  /**
   * Recalculate story progress from subtask completion
   */
  async recalculateProgress(tenantId: string, storyId: string) {
    const subtasks = await this.subtaskRepo.find({
      where: { tenantId, storyId },
    });

    if (subtasks.length === 0) return;

    const doneCount = subtasks.filter((s) => s.status === 'done').length;
    const progress = Math.round((doneCount / subtasks.length) * 100);

    await this.storyRepo.update({ id: storyId, tenantId }, { progress });
  }

  // ─── Private ─────────────────────────────────────────────────

  private validateDates(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }
  }
}
