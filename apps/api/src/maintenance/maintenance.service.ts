import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, MaintenanceStatus, MaintenanceType, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditContext } from '../common/utils/request-context';
import { AssetsService } from '../assets/assets.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { ReportIssueDto } from './dto/report-issue.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly assetsService: AssetsService,
  ) {}

  private async syncAssetStatus(tx: PrismaService | any, assetId: string, actorId: string) {
    const openRecords = await tx.maintenanceRecord.count({
      where: { assetId, status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] } },
    });

    await tx.asset.update({
      where: { id: assetId },
      data: {
        status: openRecords > 0 ? AssetStatus.IN_MAINTENANCE : undefined,
        updatedById: actorId,
      },
    });
  }

  async list(currentUser: { id: string; role: UserRole }) {
    return this.prisma.maintenanceRecord.findMany({
      where:
        currentUser.role === UserRole.EMPLOYEE
          ? { asset: { currentAssigneeId: currentUser.id, deletedAt: null } }
          : undefined,
      include: {
        asset: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async create(dto: CreateMaintenanceDto, actor: { id: string }, audit: AuditContext) {
    const asset = await this.prisma.asset.findFirst({ where: { id: dto.assetId, deletedAt: null } });
    if (!asset) throw new NotFoundException('Asset not found');

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceRecord.create({
        data: {
          assetId: dto.assetId,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          vendor: dto.vendor,
          cost: dto.cost,
          startedAt: new Date(dto.startedAt),
          completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
          status: dto.status ?? MaintenanceStatus.OPEN,
          createdById: actor.id,
        },
        include: { asset: true },
      });

      if (created.status === MaintenanceStatus.OPEN || created.status === MaintenanceStatus.IN_PROGRESS) {
        await tx.asset.update({
          where: { id: dto.assetId },
          data: { status: AssetStatus.IN_MAINTENANCE, updatedById: actor.id },
        });
      }

      return created;
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'MAINTENANCE_CREATED',
      entityType: 'MaintenanceRecord',
      entityId: record.id,
      metadata: { assetId: dto.assetId, status: record.status, type: record.type },
    });

    return record;
  }

  async update(id: string, dto: UpdateMaintenanceDto, actor: { id: string }, audit: AuditContext) {
    const record = await this.prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Maintenance record not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          assetId: dto.assetId,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          vendor: dto.vendor,
          cost: dto.cost,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
          status: dto.status,
        },
      });

      if (dto.status === MaintenanceStatus.DONE || dto.status === MaintenanceStatus.CANCELED) {
        const openCount = await tx.maintenanceRecord.count({
          where: {
            assetId: record.assetId,
            status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] },
            id: { not: id },
          },
        });

        await tx.asset.update({
          where: { id: record.assetId },
          data: {
            status: openCount > 0 ? AssetStatus.IN_MAINTENANCE : AssetStatus.IN_STOCK,
            updatedById: actor.id,
          },
        });
      }

      return item;
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'MAINTENANCE_UPDATED',
      entityType: 'MaintenanceRecord',
      entityId: id,
      metadata: dto as any,
    });

    return updated;
  }

  async reportIssue(dto: ReportIssueDto, actor: { id: string }, audit: AuditContext) {
    await this.assetsService.assertManageableForEmployee(dto.assetId, actor.id);
    return this.create(
      {
        assetId: dto.assetId,
        type: MaintenanceType.REPAIR,
        title: dto.title,
        description: dto.description,
        startedAt: new Date().toISOString(),
        status: MaintenanceStatus.OPEN,
      },
      actor,
      audit,
    );
  }
}
