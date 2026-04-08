import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ListAssetsDto } from './dto/list-assets.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditContext } from '../common/utils/request-context';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private buildWhere(query: ListAssetsDto): Prisma.AssetWhereInput {
    const warrantyWindow = query.warrantyWindow ? Number(query.warrantyWindow) : undefined;

    return {
      deletedAt: null,
      status: query.status,
      condition: query.condition,
      categoryId: query.categoryId,
      currentAssigneeId: query.assigneeId,
      location: query.location ? { contains: query.location, mode: 'insensitive' } : undefined,
      warrantyEndDate: warrantyWindow
        ? {
            gte: new Date(),
            lte: new Date(Date.now() + warrantyWindow * 24 * 60 * 60 * 1000),
          }
        : undefined,
      maintenance: query.maintenanceState
        ? { some: { status: query.maintenanceState as any } }
        : undefined,
      OR: query.search
        ? [
            { assetTag: { contains: query.search, mode: 'insensitive' } },
            { serialNumber: { contains: query.search, mode: 'insensitive' } },
            { model: { contains: query.search, mode: 'insensitive' } },
            { brand: { contains: query.search, mode: 'insensitive' } },
            { currentAssignee: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { currentAssignee: { lastName: { contains: query.search, mode: 'insensitive' } } },
            { currentAssignee: { email: { contains: query.search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
  }

  async dashboard() {
    const [
      totalAssets,
      byStatus,
      byCategory,
      warrantyExpiringSoon,
      openMaintenanceCases,
      recentAuditEvents,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { deletedAt: null } }),
      this.prisma.asset.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.assetCategory.findMany({
        include: {
          _count: { select: { assets: { where: { deletedAt: null } } } },
        },
        orderBy: { nameEn: 'asc' },
      }),
      this.prisma.asset.findMany({
        where: {
          deletedAt: null,
          warrantyEndDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        take: 10,
        orderBy: { warrantyEndDate: 'asc' },
      }),
      this.prisma.maintenanceRecord.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    return {
      totalAssets,
      byStatus,
      byCategory: byCategory.map((category) => ({
        id: category.id,
        key: category.key,
        nameEn: category.nameEn,
        nameEt: category.nameEt,
        count: category._count.assets,
      })),
      warrantyExpiringSoon,
      openMaintenanceCases,
      recentAuditEvents,
    };
  }

  async list(query: ListAssetsDto, currentUser: { id: string; role: UserRole }) {
    const where = this.buildWhere(query);

    if (currentUser.role === UserRole.EMPLOYEE) {
      where.currentAssigneeId = currentUser.id;
    }

    const orderByField = query.sortBy && ['assetTag', 'brand', 'model', 'status', 'createdAt', 'updatedAt'].includes(query.sortBy)
      ? query.sortBy
      : 'updatedAt';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: {
          category: true,
          currentAssignee: { select: { id: true, email: true, firstName: true, lastName: true } },
          maintenance: {
            where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [orderByField]: query.sortOrder },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async create(dto: CreateAssetDto, actor: { id: string }, audit: AuditContext) {
    const asset = await this.prisma.asset.create({
      data: {
        assetTag: dto.assetTag,
        serialNumber: dto.serialNumber,
        qrCodeValue: `asset:${dto.assetTag}`,
        categoryId: dto.categoryId,
        brand: dto.brand,
        model: dto.model,
        status: dto.status ?? AssetStatus.IN_STOCK,
        condition: dto.condition ?? 'GOOD',
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchasePrice: dto.purchasePrice,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        vendor: dto.vendor,
        location: dto.location,
        notes: dto.notes,
        createdById: actor.id,
        updatedById: actor.id,
      },
      include: { category: true },
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'ASSET_CREATED',
      entityType: 'Asset',
      entityId: asset.id,
      metadata: { assetTag: asset.assetTag, status: asset.status },
    });

    return asset;
  }

  async getById(id: string, currentUser: { id: string; role: UserRole }) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(currentUser.role === UserRole.EMPLOYEE ? { currentAssigneeId: currentUser.id } : {}),
      },
      include: {
        category: true,
        currentAssignee: { select: { id: true, email: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        maintenance: {
          orderBy: { startedAt: 'desc' },
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, actor: { id: string }, audit: AuditContext) {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) throw new NotFoundException('Asset not found');

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        updatedById: actor.id,
      },
      include: { category: true, currentAssignee: true },
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'ASSET_UPDATED',
      entityType: 'Asset',
      entityId: id,
      metadata: dto as unknown as Prisma.InputJsonValue,
    });

    if (dto.status && dto.status !== asset.status) {
      await this.auditLogsService.create({
        ...audit,
        actorUserId: actor.id,
        action: 'ASSET_STATUS_CHANGED',
        entityType: 'Asset',
        entityId: id,
        metadata: { from: asset.status, to: dto.status },
      });
    }

    return updated;
  }

  async softDelete(id: string, actor: { id: string }, audit: AuditContext) {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status === AssetStatus.ASSIGNED) {
      throw new BadRequestException('Assigned assets must be returned before deletion');
    }

    await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actor.id },
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'ASSET_DELETED',
      entityType: 'Asset',
      entityId: id,
      metadata: { assetTag: asset.assetTag },
    });

    return { success: true };
  }

  async lookupByQr(value: string, currentUser: { id: string; role: UserRole }) {
    if (!value) throw new BadRequestException('QR value is required');
    const asset = await this.prisma.asset.findFirst({
      where: {
        qrCodeValue: value,
        deletedAt: null,
        ...(currentUser.role === UserRole.EMPLOYEE ? { currentAssigneeId: currentUser.id } : {}),
      },
      select: { id: true, assetTag: true },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async history(id: string, currentUser: { id: string; role: UserRole }) {
    const asset = await this.getById(id, currentUser);

    const audit = await this.prisma.auditLog.findMany({
      where: { entityType: 'Asset', entityId: id },
      include: { actorUser: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      asset: { id: asset.id, assetTag: asset.assetTag },
      assignments: asset.assignments,
      maintenance: asset.maintenance,
      audit,
    };
  }

  async assertManageableForEmployee(assetId: string, userId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, currentAssigneeId: userId, deletedAt: null },
    });
    if (!asset) throw new ForbiddenException('Asset is not assigned to this user');
    return asset;
  }
}
