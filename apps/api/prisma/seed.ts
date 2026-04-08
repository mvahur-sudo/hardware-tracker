import { PrismaClient, UserLocale, UserRole, AssetStatus, AssetCondition, MaintenanceStatus, MaintenanceType, AssetCategoryKey } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { key: AssetCategoryKey.LAPTOP, nameEn: 'Laptop', nameEt: 'Sülearvuti' },
    { key: AssetCategoryKey.MONITOR, nameEn: 'Monitor', nameEt: 'Monitor' },
    { key: AssetCategoryKey.MOUSE, nameEn: 'Mouse', nameEt: 'Hiir' },
    { key: AssetCategoryKey.KEYBOARD, nameEn: 'Keyboard', nameEt: 'Klaviatuur' },
    { key: AssetCategoryKey.ACCESSORY, nameEn: 'Accessory', nameEt: 'Tarvik' },
  ];

  for (const category of categories) {
    await prisma.assetCategory.upsert({
      where: { key: category.key },
      update: category,
      create: category,
    });
  }

  const password = hashSync('ChangeMe123!', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'superadmin@company.local' },
      update: {},
      create: {
        email: 'superadmin@company.local',
        passwordHash: password,
        firstName: 'Sofia',
        lastName: 'Admin',
        role: UserRole.SUPERADMIN,
        locale: UserLocale.en,
      },
    }),
    prisma.user.upsert({
      where: { email: 'itadmin@company.local' },
      update: {},
      create: {
        email: 'itadmin@company.local',
        passwordHash: password,
        firstName: 'Ivo',
        lastName: 'Support',
        role: UserRole.IT_ADMIN,
        locale: UserLocale.et,
      },
    }),
    prisma.user.upsert({
      where: { email: 'mari@company.local' },
      update: {},
      create: {
        email: 'mari@company.local',
        passwordHash: password,
        firstName: 'Mari',
        lastName: 'Tamm',
        role: UserRole.EMPLOYEE,
        locale: UserLocale.et,
      },
    }),
    prisma.user.upsert({
      where: { email: 'john@company.local' },
      update: {},
      create: {
        email: 'john@company.local',
        passwordHash: password,
        firstName: 'John',
        lastName: 'Miller',
        role: UserRole.EMPLOYEE,
        locale: UserLocale.en,
      },
    }),
    prisma.user.upsert({
      where: { email: 'kadi@company.local' },
      update: {},
      create: {
        email: 'kadi@company.local',
        passwordHash: password,
        firstName: 'Kadi',
        lastName: 'Põld',
        role: UserRole.EMPLOYEE,
        locale: UserLocale.et,
      },
    }),
  ]);

  const [superadmin, itAdmin, mari, john, kadi] = users;
  const categoryMap = new Map((await prisma.assetCategory.findMany()).map((item) => [item.key, item.id]));

  const assetData = [
    ['LT-0001', 'Dell', 'Latitude 7440', AssetCategoryKey.LAPTOP, AssetStatus.ASSIGNED, mari.id],
    ['LT-0002', 'Lenovo', 'ThinkPad X1 Carbon', AssetCategoryKey.LAPTOP, AssetStatus.ASSIGNED, john.id],
    ['LT-0003', 'HP', 'EliteBook 840', AssetCategoryKey.LAPTOP, AssetStatus.IN_STOCK, null],
    ['MN-0001', 'Dell', 'P2723DE', AssetCategoryKey.MONITOR, AssetStatus.ASSIGNED, mari.id],
    ['MN-0002', 'LG', '27UP850', AssetCategoryKey.MONITOR, AssetStatus.IN_STOCK, null],
    ['MS-0001', 'Logitech', 'MX Master 3S', AssetCategoryKey.MOUSE, AssetStatus.ASSIGNED, john.id],
    ['KB-0001', 'Keychron', 'K8 Pro', AssetCategoryKey.KEYBOARD, AssetStatus.ASSIGNED, john.id],
    ['AC-0001', 'Anker', 'USB-C Dock 575', AssetCategoryKey.ACCESSORY, AssetStatus.IN_MAINTENANCE, null],
    ['AC-0002', 'Apple', 'Magic Keyboard', AssetCategoryKey.ACCESSORY, AssetStatus.RETIRED, null],
  ] as const;

  for (const [assetTag, brand, model, categoryKey, status, assigneeId] of assetData) {
    await prisma.asset.upsert({
      where: { assetTag },
      update: {},
      create: {
        assetTag,
        serialNumber: `${assetTag}-SN`,
        qrCodeValue: `asset:${assetTag}`,
        categoryId: categoryMap.get(categoryKey)!,
        brand,
        model,
        status,
        condition: AssetCondition.GOOD,
        purchaseDate: new Date('2025-01-15T00:00:00Z'),
        purchasePrice: 1299,
        warrantyEndDate: new Date('2027-01-15T00:00:00Z'),
        vendor: 'Tech Supplier OÜ',
        location: status === AssetStatus.IN_STOCK ? 'Main Warehouse' : 'Tallinn Office',
        currentAssigneeId: assigneeId,
        createdById: superadmin.id,
        updatedById: itAdmin.id,
      },
    });
  }

  const laptop1 = await prisma.asset.findUniqueOrThrow({ where: { assetTag: 'LT-0001' } });
  const laptop2 = await prisma.asset.findUniqueOrThrow({ where: { assetTag: 'LT-0002' } });
  const monitor1 = await prisma.asset.findUniqueOrThrow({ where: { assetTag: 'MN-0001' } });
  const dock = await prisma.asset.findUniqueOrThrow({ where: { assetTag: 'AC-0001' } });

  const assignments = [
    { assetId: laptop1.id, userId: mari.id, assignedAt: new Date('2025-10-01T09:00:00Z') },
    { assetId: monitor1.id, userId: mari.id, assignedAt: new Date('2025-10-01T09:05:00Z') },
    { assetId: laptop2.id, userId: john.id, assignedAt: new Date('2025-11-03T09:00:00Z') },
  ];

  for (const assignment of assignments) {
    const exists = await prisma.assignment.findFirst({ where: { assetId: assignment.assetId, userId: assignment.userId, returnedAt: null } });
    if (!exists) {
      await prisma.assignment.create({
        data: {
          ...assignment,
          assignedById: itAdmin.id,
          notes: 'Seeded assignment',
        },
      });
    }
  }

  const existingMaintenance = await prisma.maintenanceRecord.findFirst({ where: { assetId: dock.id } });
  if (!existingMaintenance) {
    await prisma.maintenanceRecord.create({
      data: {
        assetId: dock.id,
        type: MaintenanceType.REPAIR,
        title: 'Dock not powering displays',
        description: 'Users reported intermittent disconnects and blank external monitors.',
        vendor: 'DeviceFix OÜ',
        cost: 75,
        startedAt: new Date('2026-03-20T08:00:00Z'),
        status: MaintenanceStatus.IN_PROGRESS,
        createdById: itAdmin.id,
      },
    });
  }

  const logs = [
    ['AUTH_LOGIN', superadmin.id, 'User', superadmin.id],
    ['ASSET_CREATED', itAdmin.id, 'Asset', laptop1.id],
    ['ASSIGNMENT_CREATED', itAdmin.id, 'Asset', laptop1.id],
    ['MAINTENANCE_CREATED', itAdmin.id, 'MaintenanceRecord', dock.id],
  ] as const;

  for (const [action, actorUserId, entityType, entityId] of logs) {
    const exists = await prisma.auditLog.findFirst({ where: { action, actorUserId, entityId } });
    if (!exists) {
      await prisma.auditLog.create({
        data: {
          action,
          actorUserId,
          entityType,
          entityId,
          metadata: { seeded: true },
          ipAddress: '127.0.0.1',
          userAgent: 'seed-script',
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
