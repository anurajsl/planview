import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubtaskEntity } from '../database/entities';
import { StoriesService } from '../stories/stories.service';

@Injectable()
export class SubtasksService {
  constructor(
    @InjectRepository(SubtaskEntity) private readonly subtaskRepo: Repository<SubtaskEntity>,
    private readonly storiesService: StoriesService,
  ) {}

  async findByStory(tenantId: string, storyId: string) {
    return this.subtaskRepo.find({
      where: { tenantId, storyId },
      relations: ['assignee'],
      order: { sortOrder: 'ASC' },
    });
  }

  async create(tenantId: string, dto: {
    storyId: string; name: string;
    startDate?: string; endDate?: string; assigneeId?: string;
  }) {
    const maxSort = await this.subtaskRepo
      .createQueryBuilder('st')
      .select('MAX(st.sort_order)', 'max')
      .where('st.tenant_id = :tenantId AND st.story_id = :storyId', {
        tenantId, storyId: dto.storyId,
      })
      .getRawOne();

    const subtask = this.subtaskRepo.create({
      ...dto,
      tenantId,
      status: 'planned',
      sortOrder: (maxSort?.max ?? -1) + 1,
    });
    const saved = await this.subtaskRepo.save(subtask);

    // Recalculate parent story progress
    await this.storiesService.recalculateProgress(tenantId, dto.storyId);

    return saved;
  }

  async update(tenantId: string, id: string, dto: {
    name?: string; status?: string;
    startDate?: string; endDate?: string; assigneeId?: string; sortOrder?: number;
  }) {
    const subtask = await this.subtaskRepo.findOne({ where: { id, tenantId } });
    if (!subtask) throw new NotFoundException('Subtask not found');

    Object.assign(subtask, dto);
    const saved = await this.subtaskRepo.save(subtask);

    // Recalculate parent story progress
    await this.storiesService.recalculateProgress(tenantId, subtask.storyId);

    return saved;
  }

  async delete(tenantId: string, id: string) {
    const subtask = await this.subtaskRepo.findOne({ where: { id, tenantId } });
    if (!subtask) throw new NotFoundException('Subtask not found');

    const storyId = subtask.storyId;
    await this.subtaskRepo.remove(subtask);

    // Recalculate parent story progress
    await this.storiesService.recalculateProgress(tenantId, storyId);

    return { deleted: true, id };
  }
}
