import {
  Injectable, UnauthorizedException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { UserEntity, TenantEntity, RefreshTokenEntity } from '../database/entities';
import { EmailService } from '../email/email.service';
import { JwtPayload } from './jwt.strategy';

const BCRYPT_ROUNDS = 12;
const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9', '#ef4444', '#14b8a6'];

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TenantEntity) private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(RefreshTokenEntity) private readonly refreshRepo: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Register a new user + tenant (org)
   * This creates the tenant, the owner user, and returns tokens.
   */
  async register(dto: {
    email: string;
    password: string;
    name: string;
    tenantName: string;
  }) {
    // Check if email already exists in any tenant
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Validate password strength
    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Create tenant
    const slug = dto.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingTenant = await this.tenantRepo.findOne({ where: { slug } });
    if (existingTenant) {
      throw new ConflictException('Organization name already taken');
    }

    const tenant = this.tenantRepo.create({
      name: dto.tenantName,
      slug,
      planTier: 'free',
      settings: {
        maxProjects: 3,
        maxUsersPerProject: 10,
        features: {
          dependencies: true,
          resourceView: false,
          customFields: false,
          apiAccess: false,
        },
      },
    });
    await this.tenantRepo.save(tenant);

    // Create owner user
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const initials = dto.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const user = this.userRepo.create({
      tenantId: tenant.id,
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: 'owner',
      initials,
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    });
    await this.userRepo.save(user);

    // Send welcome email
    this.emailService.sendWelcome({
      to: dto.email,
      userName: dto.name,
      tenantName: dto.tenantName,
    }).catch(() => {}); // Don't block registration if email fails

    // Generate tokens
    return this.generateAuthResponse(user, tenant);
  }

  /**
   * Login with email + password
   */
  async login(email: string, password: string) {
    // Must select passwordHash explicitly since it has select: false
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      // Use same error to prevent email enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tenant = await this.tenantRepo.findOneBy({ id: user.tenantId });
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    return this.generateAuthResponse(user, tenant);
  }

  /**
   * Refresh access token using refresh token
   * Implements refresh token rotation for security.
   */
  async refreshTokens(refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Find the refresh token record
    const stored = await this.refreshRepo.findOne({
      where: { tokenHash, revoked: false },
    });

    // If not found by hash, try to verify the JWT and find by user
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.refreshRepo.update(
      { userId: payload.sub, revoked: false },
      { revoked: true },
    );

    // Get user and tenant
    const user = await this.userRepo.findOneBy({ id: payload.sub });
    const tenant = await this.tenantRepo.findOneBy({ id: payload.tenantId });
    if (!user || !tenant) {
      throw new UnauthorizedException('User or tenant not found');
    }

    return this.generateAuthResponse(user, tenant);
  }

  /**
   * Logout — revoke all refresh tokens for user
   */
  async logout(userId: string) {
    await this.refreshRepo.update({ userId, revoked: false }, { revoked: true });
  }

  // ─── Private ─────────────────────────────────────────────────

  private async generateAuthResponse(user: UserEntity, tenant: TenantEntity) {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    };

    // Access token (short-lived)
    const accessToken = this.jwtService.sign(jwtPayload);

    // Refresh token (long-lived, separate secret)
    const refreshToken = this.jwtService.sign(jwtPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRY', '7d'),
    });

    // Store refresh token hash
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tenantId: tenant.id,
        tokenHash,
        expiresAt,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: tenant.id,
        email: user.email,
        name: user.name,
        role: user.role,
        initials: user.initials,
        color: user.color,
        avatarUrl: user.avatarUrl,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        planTier: tenant.planTier,
      },
    };
  }
}
