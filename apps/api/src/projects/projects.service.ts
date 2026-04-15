import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity, ProjectMemberEntity } from '../database/entities';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity) private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(ProjectMemberEntity) private readonly memberRepo: Repository<ProjectMemberEntity>,
  ) {}

  async findAll(tenantId: string) {
    return this.projectRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const project = await this.projectRepo.findOne({
      where: { id, tenantId },
      relations: ['members', 'members.user'],
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(tenantId: string, userId: string, dto: { name: string; description?: string }) {
    const project = this.projectRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: 'active',
    });
    const saved = await this.projectRepo.save(project);

    // Add creator as project owner
    await this.memberRepo.save(
      this.memberRepo.create({
        projectId: saved.id,
        userId,
        tenantId,
        role: 'owner',
      }),
    );

    return this.findOne(tenantId, saved.id);
  }

  async update(tenantId: string, id: string, dto: { name?: string; description?: string; status?: string }) {
    const project = await this.findOne(tenantId, id);
    Object.assign(project, dto);
    await this.projectRepo.save(project);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const project = await this.findOne(tenantId, id);
    await this.projectRepo.remove(project);
    return { deleted: true, id };
  }
}
