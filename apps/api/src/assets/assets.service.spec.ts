import { AssetsService } from './assets.service';

describe('AssetsService', () => {
  const prisma = {
    asset: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    assetCategory: { findMany: jest.fn() },
    maintenanceRecord: { count: jest.fn() },
    auditLog: { findMany: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const auditLogsService = { create: jest.fn() } as any;
  const service = new AssetsService(prisma, auditLogsService);

  beforeEach(() => jest.clearAllMocks());

  it('creates assets with QR values', async () => {
    prisma.asset.create.mockResolvedValue({ id: 'a1', assetTag: 'LT-1', status: 'IN_STOCK' });
    const result = await service.create({ assetTag: 'LT-1', categoryId: 'c1', brand: 'Dell', model: 'XPS' }, { id: 'admin' }, {});
    expect(prisma.asset.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ qrCodeValue: 'asset:LT-1' }) }));
    expect(result.id).toBe('a1');
  });
});
