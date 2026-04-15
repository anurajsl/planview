import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from '../database/entities';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const makeUser = (overrides: Partial<UserEntity> = {}): Partial<UserEntity> => ({
  id: 'u1', tenantId: 't1', email: 'test@test.com', name: 'Test', role: 'member', ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    repo = mockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: repo },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  describe('updateRole', () => {
    it('should reject invalid role', async () => {
      await expect(service.updateRole('t1', 'u1', 'u2', 'superadmin'))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject self role change', async () => {
      await expect(service.updateRole('t1', 'u1', 'u1', 'admin'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should reject non-owner assigning owner role', async () => {
      repo.findOne
        .mockResolvedValueOnce(makeUser({ id: 'u1', role: 'admin' }))
        .mockResolvedValueOnce(makeUser({ id: 'u2', role: 'member' }));
      await expect(service.updateRole('t1', 'u1', 'u2', 'owner'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should reject changing role of equal/higher rank user', async () => {
      repo.findOne
        .mockResolvedValueOnce(makeUser({ id: 'u1', role: 'admin' }))
        .mockResolvedValueOnce(makeUser({ id: 'u2', role: 'admin' }));
      await expect(service.updateRole('t1', 'u1', 'u2', 'member'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to change any role', async () => {
      repo.findOne
        .mockResolvedValueOnce(makeUser({ id: 'u1', role: 'owner' }))
        .mockResolvedValueOnce(makeUser({ id: 'u2', role: 'admin' }))
        .mockResolvedValueOnce(makeUser({ id: 'u2', role: 'member' }));
      const result = await service.updateRole('t1', 'u1', 'u2', 'member');
      expect(repo.update).toHaveBeenCalledWith({ id: 'u2' }, { role: 'member' });
    });
  });

  describe('remove', () => {
    it('should reject self-removal', async () => {
      await expect(service.remove('t1', 'u1', 'u1'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should reject removing the owner', async () => {
      repo.findOne
        .mockResolvedValueOnce(makeUser({ id: 'u1', role: 'admin' }))
        .mockResolvedValueOnce(makeUser({ id: 'u2', role: 'owner' }));
      await expect(service.remove('t1', 'u1', 'u2'))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
