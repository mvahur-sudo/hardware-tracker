import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditContext } from '../common/utils/request-context';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async assign(dto: AssignAssetDto, actor: { id: string }, audit: AuditContext) {
    const [asset, assignee] = await Promise.all([
      this.prisma.asset.findFirst({ where: { id: dto.assetId, deletedAt: null } }),
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
    ]);

    if (!asset) throw new NotFoundException('Asset not found');
    if (!assignee || !assignee.isActive) throw new NotFoundException('Assignee not found');
    if (asset.status === AssetStatus.ASSIGNED && asset.currentAssigneeId) {
      throw new BadRequestException('Asset is already assigned');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          assetId: dto.assetId,
          userId: dto.userId,
          assignedById: actor.id,
          expectedReturnAt: dto.expectedReturnAt ? new Date(dto.expectedReturnAt) : undefined,
          notes: dto.notes,
        },
        include: {
          asset: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      await tx.asset.update({
        where: { id: dto.assetId },
        data: {
          status: AssetStatus.ASSIGNED,
          currentAssigneeId: dto.userId,
          updatedById: actor.id,
        },
      });

      return assignment;
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'ASSIGNMENT_CREATED',
      entityType: 'Asset',
      entityId: dto.assetId,
      metadata: { assigneeId: dto.userId, expectedReturnAt: dto.expectedReturnAt ?? null },
    });

    return result;
  }

  async returnAsset(id: string, dto: ReturnAssetDto, actor: { id: string }, audit: AuditContext) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.returnedAt) throw new BadRequestException('Assignment already returned');

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.assignment.update({
        where: { id },
        data: {
          returnedAt: new Date(),
          returnCondition: dto.returnCondition,
          notes: dto.notes ?? assignment.notes,
        },
      });

      await tx.asset.update({
        where: { id: assignment.assetId },
        data: {
          status: AssetStatus.IN_STOCK,
          currentAssigneeId: null,
          condition: dto.returnCondition,
          updatedById: actor.id,
        },
      });

      return updatedAssignment;
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'ASSIGNMENT_RETURNED',
      entityType: 'Asset',
      entityId: assignment.assetId,
      metadata: { assignmentId: id, returnCondition: dto.returnCondition ?? null },
    });

    return result;
  }
}
