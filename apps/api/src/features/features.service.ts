import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureEntity } from '../database/entities';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(FeatureEntity) private readonly featureRepo: Repository<FeatureEntity>,
  ) {}

  async findAll(tenantId: string, projectId: string) {
    return this.featureRepo.find({
      where: { tenantId, projectId },
      order: { sortOrder: 'ASC' },
    });
  }

  async create(tenantId: string, dto: { projectId: string; name: string; color?: string }) {
    const maxSort = await this.featureRepo
      .createQueryBuilder('f')
      .select('MAX(f.sort_order)', 'max')
      .where('f.tenant_id = :tenantId AND f.project_id = :projectId', {
        tenantId, projectId: dto.projectId,
      })
      .getRawOne();

    const feature = this.featureRepo.create({
      ...dto,
      tenantId,
      color: dto.color || '#6366f1',
      sortOrder: (maxSort?.max ?? -1) + 1,
    });
    return this.featureRepo.save(feature);
  }

  async update(tenantId: string, id: string, dto: { name?: string; color?: string; sortOrder?: number }) {
    const feature = await this.featureRepo.findOne({ where: { id, tenantId } });
    if (!feature) throw new NotFoundException('Feature not found');
    Object.assign(feature, dto);
    return this.featureRepo.save(feature);
  }

  async delete(tenantId: string, id: string) {
    const feature = await this.featureRepo.findOne({ where: { id, tenantId } });
    if (!feature) throw new NotFoundException('Feature not found');
    await this.featureRepo.remove(feature);
    return { deleted: true, id };
  }
}
