import { BadRequestException } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsService', () => {
  const prisma = {
    asset: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    assignment: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const auditLogsService = { create: jest.fn() } as any;
  const service = new AssignmentsService(prisma, auditLogsService);

  beforeEach(() => jest.clearAllMocks());

  it('prevents assigning an already assigned asset', async () => {
    prisma.asset.findFirst.mockResolvedValue({ id: 'a1', status: 'ASSIGNED', currentAssigneeId: 'u1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', isActive: true });

    await expect(service.assign({ assetId: 'a1', userId: 'u2' }, { id: 'admin' }, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns an asset and logs the action', async () => {
    prisma.assignment.findUnique.mockResolvedValue({ id: 'as1', assetId: 'a1', returnedAt: null });
    prisma.$transaction.mockImplementation(async (fn: any) => fn({
      assignment: { update: jest.fn().mockResolvedValue({ id: 'as1' }) },
      asset: { update: jest.fn().mockResolvedValue({ id: 'a1' }) },
    }));

    const result = await service.returnAsset('as1', { returnCondition: 'GOOD' }, { id: 'admin' }, {});
    expect(result.id).toBe('as1');
    expect(auditLogsService.create).toHaveBeenCalled();
  });
});
