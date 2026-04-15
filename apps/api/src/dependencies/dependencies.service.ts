import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DependencyEntity } from '../database/entities';

@Injectable()
export class DependenciesService {
  constructor(
    @InjectRepository(DependencyEntity) private readonly depRepo: Repository<DependencyEntity>,
  ) {}

  async findByProject(tenantId: string, storyIds: string[]) {
    if (!storyIds.length) return [];
    return this.depRepo
      .createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('(d.from_story_id IN (:...ids) OR d.to_story_id IN (:...ids))', { ids: storyIds })
      .getMany();
  }

  async create(tenantId: string, dto: { fromStoryId: string; toStoryId: string; type?: string }) {
    if (dto.fromStoryId === dto.toStoryId) {
      throw new BadRequestException('Cannot create self-dependency');
    }

    // Check for existing dependency
    const existing = await this.depRepo.findOne({
      where: { tenantId, fromStoryId: dto.fromStoryId, toStoryId: dto.toStoryId },
    });
    if (existing) throw new BadRequestException('Dependency already exists');

    // Check for circular dependency (simple reverse check)
    const reverse = await this.depRepo.findOne({
      where: { tenantId, fromStoryId: dto.toStoryId, toStoryId: dto.fromStoryId },
    });
    if (reverse) throw new BadRequestException('Circular dependency detected');

    const dep = this.depRepo.create({
      ...dto,
      tenantId,
      type: dto.type || 'FS',
    });
    return this.depRepo.save(dep);
  }

  async delete(tenantId: string, id: string) {
    const dep = await this.depRepo.findOne({ where: { id, tenantId } });
    if (!dep) throw new NotFoundException('Dependency not found');
    await this.depRepo.remove(dep);
    return { deleted: true, id };
  }
}
