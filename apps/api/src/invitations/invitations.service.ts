import {
  Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { InvitationEntity, UserEntity, TenantEntity } from '../database/entities';
import { EmailService } from '../email/email.service';

const INVITE_EXPIRY_DAYS = 7;
const BCRYPT_ROUNDS = 12;
const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9', '#ef4444', '#14b8a6'];

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(InvitationEntity) private readonly inviteRepo: Repository<InvitationEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TenantEntity) private readonly tenantRepo: Repository<TenantEntity>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Send an invitation to join the tenant.
   */
  async invite(tenantId: string, invitedBy: string, dto: { email: string; role?: string }) {
    // Check if user already exists in tenant
    const existingUser = await this.userRepo.findOne({
      where: { tenantId, email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User is already a member of this organization');
    }

    // Check for pending invite
    const existingInvite = await this.inviteRepo.findOne({
      where: { tenantId, email: dto.email, status: 'pending' },
    });
    if (existingInvite) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    // Generate secure token
    const token = uuid() + '-' + uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invitation = this.inviteRepo.create({
      tenantId,
      email: dto.email.toLowerCase().trim(),
      role: dto.role || 'member',
      invitedBy,
      token,
      expiresAt,
      status: 'pending',
    });

    const saved = await this.inviteRepo.save(invitation);

    // Send invitation email
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const inviter = await this.userRepo.findOne({ where: { id: invitedBy } });
    await this.emailService.sendInvitation({
      to: dto.email,
      inviterName: inviter?.name || 'A team member',
      tenantName: tenant?.name || 'your organization',
      token,
      role: dto.role || 'member',
    });

    return {
      invitation: saved,
      message: `Invitation sent to ${dto.email}. They have ${INVITE_EXPIRY_DAYS} days to accept.`,
      // Include invite URL for dev/testing (remove in production)
      inviteUrl: `/invite/${token}`,
    };
  }

  /**
   * List all invitations for a tenant.
   */
  async findAll(tenantId: string) {
    return this.inviteRepo.find({
      where: { tenantId },
      relations: ['inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Accept an invitation — creates the user account.
   */
  async accept(token: string, dto: { name: string; password: string }) {
    const invitation = await this.inviteRepo.findOne({
      where: { token, status: 'pending' },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    if (new Date() > invitation.expiresAt) {
      await this.inviteRepo.update(invitation.id, { status: 'expired' });
      throw new BadRequestException('Invitation has expired');
    }

    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Check user doesn't already exist
    const existing = await this.userRepo.findOne({
      where: { tenantId: invitation.tenantId, email: invitation.email },
    });
    if (existing) {
      throw new ConflictException('User already exists in this organization');
    }

    // Create user
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const initials = dto.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const user = this.userRepo.create({
      tenantId: invitation.tenantId,
      email: invitation.email,
      passwordHash,
      name: dto.name,
      role: invitation.role,
      initials,
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    });
    await this.userRepo.save(user);

    // Mark invitation as accepted
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await this.inviteRepo.save(invitation);

    return { user, message: 'Invitation accepted. You can now log in.' };
  }

  /**
   * Revoke a pending invitation.
   */
  async revoke(tenantId: string, id: string) {
    const invitation = await this.inviteRepo.findOne({
      where: { id, tenantId, status: 'pending' },
    });
    if (!invitation) {
      throw new NotFoundException('Pending invitation not found');
    }

    invitation.status = 'revoked';
    await this.inviteRepo.save(invitation);
    return { message: 'Invitation revoked' };
  }
}
