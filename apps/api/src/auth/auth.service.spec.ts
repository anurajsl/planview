import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserEntity, TenantEntity, RefreshTokenEntity } from '../database/entities';
import { EmailService } from '../email/email.service';

const mockRepo = () => ({
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((entity) => Promise.resolve({ id: 'uuid-1', ...entity })),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  })),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockRepo>;
  let tenantRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    userRepo = mockRepo();
    tenantRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(TenantEntity), useValue: tenantRepo },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRepo() },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'mock-token'), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn((key: string, def?: string) => def || 'test') } },
        { provide: EmailService, useValue: { sendWelcome: jest.fn(() => Promise.resolve(true)) } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('should reject duplicate email', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.register({
        email: 'test@test.com', password: 'password123', name: 'Test', tenantName: 'Acme',
      })).rejects.toThrow(ConflictException);
    });

    it('should reject short password', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.register({
        email: 'test@test.com', password: 'short', name: 'Test', tenantName: 'Acme',
      })).rejects.toThrow(BadRequestException);
    });

    it('should create tenant and user on valid registration', async () => {
      userRepo.findOne.mockResolvedValue(null);
      tenantRepo.findOne.mockResolvedValue(null);
      tenantRepo.save.mockResolvedValue({ id: 'tenant-1', name: 'Acme', slug: 'acme', planTier: 'free' });
      userRepo.save.mockResolvedValue({
        id: 'user-1', tenantId: 'tenant-1', email: 'test@test.com',
        name: 'Test', role: 'owner', initials: 'T', color: '#6366f1',
      });

      const result = await service.register({
        email: 'test@test.com', password: 'password123', name: 'Test', tenantName: 'Acme',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.role).toBe('owner');
      expect(tenantRepo.save).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should reject invalid email', async () => {
      const qb = userRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(null);
      await expect(service.login('bad@test.com', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject wrong password', async () => {
      const hash = await bcrypt.hash('correct', 12);
      const qb = userRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue({ id: 'u1', email: 'test@test.com', passwordHash: hash, tenantId: 't1' });
      tenantRepo.findOneBy.mockResolvedValue({ id: 't1' });
      await expect(service.login('test@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });
});
