import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { SubscriptionEntity, TenantEntity, ProjectEntity, UserEntity, StoryEntity } from '../database/entities';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  save: jest.fn((e) => Promise.resolve({ id: 'sub-1', ...e })),
  create: jest.fn((dto) => dto),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ cnt: '5' }),
  })),
});

describe('BillingService', () => {
  let service: BillingService;
  let subRepo: ReturnType<typeof mockRepo>;
  let projectRepo: ReturnType<typeof mockRepo>;
  let userRepo: ReturnType<typeof mockRepo>;
  let storyRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    subRepo = mockRepo();
    projectRepo = mockRepo();
    userRepo = mockRepo();
    storyRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(SubscriptionEntity), useValue: subRepo },
        { provide: getRepositoryToken(TenantEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(ProjectEntity), useValue: projectRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(StoryEntity), useValue: storyRepo },
        { provide: ConfigService, useValue: { get: jest.fn((k: string, d?: string) => d || '') } },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  describe('enforceLimit', () => {
    it('should throw when project limit reached on free plan', async () => {
      subRepo.findOne.mockResolvedValue({ tenantId: 't1', planTier: 'free', status: 'active' });
      projectRepo.count.mockResolvedValue(3); // free limit is 3
      userRepo.count.mockResolvedValue(1);

      await expect(service.enforceLimit('t1', 'project'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow when under limit', async () => {
      subRepo.findOne.mockResolvedValue({ tenantId: 't1', planTier: 'free', status: 'active' });
      projectRepo.count.mockResolvedValue(1);
      userRepo.count.mockResolvedValue(1);

      await expect(service.enforceLimit('t1', 'project')).resolves.not.toThrow();
    });

    it('should allow unlimited on enterprise plan', async () => {
      subRepo.findOne.mockResolvedValue({ tenantId: 't1', planTier: 'enterprise', status: 'active' });
      projectRepo.count.mockResolvedValue(100);
      userRepo.count.mockResolvedValue(100);

      await expect(service.enforceLimit('t1', 'project')).resolves.not.toThrow();
    });
  });

  describe('getUsage', () => {
    it('should return usage with percentages', async () => {
      subRepo.findOne.mockResolvedValue({ tenantId: 't1', planTier: 'free', status: 'active', cancelAtPeriodEnd: false });
      projectRepo.count.mockResolvedValue(2);
      userRepo.count.mockResolvedValue(3);

      const usage = await service.getUsage('t1');
      expect(usage.planTier).toBe('free');
      expect(usage.usage.projects).toBe(2);
      expect(usage.usage.users).toBe(3);
      expect(usage.percentages.projects).toBe(67); // 2/3 = 67%
    });
  });
});
