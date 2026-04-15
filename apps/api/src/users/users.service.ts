import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities';

const ROLE_HIERARCHY = ['viewer', 'member', 'manager', 'admin', 'owner'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findAll(tenantId: string) {
    return this.userRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRole(tenantId: string, actorId: string, targetId: string, newRole: string) {
    if (!ROLE_HIERARCHY.includes(newRole)) {
      throw new BadRequestException(`Invalid role: ${newRole}`);
    }

    if (actorId === targetId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const [actor, target] = await Promise.all([
      this.userRepo.findOne({ where: { id: actorId, tenantId } }),
      this.userRepo.findOne({ where: { id: targetId, tenantId } }),
    ]);

    if (!actor || !target) throw new NotFoundException('User not found');

    // Only owner can assign owner role
    if (newRole === 'owner' && actor.role !== 'owner') {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }

    // Can't change role of someone with equal or higher rank (unless you're owner)
    const actorRank = ROLE_HIERARCHY.indexOf(actor.role);
    const targetRank = ROLE_HIERARCHY.indexOf(target.role);
    if (actor.role !== 'owner' && targetRank >= actorRank) {
      throw new ForbiddenException('Cannot change role of a user with equal or higher rank');
    }

    // If transferring ownership, demote current owner to admin
    if (newRole === 'owner') {
      await this.userRepo.update({ id: actorId }, { role: 'admin' });
    }

    await this.userRepo.update({ id: targetId }, { role: newRole });
    return this.userRepo.findOne({ where: { id: targetId, tenantId } });
  }

  async remove(tenantId: string, actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new ForbiddenException('Cannot remove yourself');
    }

    const [actor, target] = await Promise.all([
      this.userRepo.findOne({ where: { id: actorId, tenantId } }),
      this.userRepo.findOne({ where: { id: targetId, tenantId } }),
    ]);

    if (!actor || !target) throw new NotFoundException('User not found');

    if (target.role === 'owner') {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    const actorRank = ROLE_HIERARCHY.indexOf(actor.role);
    const targetRank = ROLE_HIERARCHY.indexOf(target.role);
    if (actor.role !== 'owner' && targetRank >= actorRank) {
      throw new ForbiddenException('Cannot remove a user with equal or higher rank');
    }

    await this.userRepo.delete({ id: targetId, tenantId });
    return { deleted: true };
  }
}
