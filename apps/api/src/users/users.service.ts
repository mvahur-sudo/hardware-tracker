import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditContext } from '../common/utils/request-context';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async list(query: PaginationQueryDto & { role?: UserRole; search?: string }) {
    const where: Prisma.UserWhereInput = {
      role: query.role || undefined,
      OR: query.search
        ? [
            { email: { contains: query.search, mode: 'insensitive' } },
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: query.sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          locale: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async create(dto: CreateUserDto, actor: { id: string; role: UserRole }, audit: AuditContext) {
    if (actor.role !== UserRole.SUPERADMIN && dto.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN may create SUPERADMIN users');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BadRequestException('Email already exists');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hashSync(dto.password, 12),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        locale: dto.locale ?? 'en',
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locale: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: { id: string; role: UserRole }, audit: AuditContext) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (actor.role !== UserRole.SUPERADMIN && user.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN may modify SUPERADMIN users');
    }

    if (actor.role !== UserRole.SUPERADMIN && dto.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN may assign SUPERADMIN role');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email?.toLowerCase(),
        passwordHash: dto.password ? hashSync(dto.password, 12) : undefined,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        locale: dto.locale,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locale: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: dto as unknown as Prisma.InputJsonValue,
    });

    if (dto.role && dto.role !== user.role) {
      await this.auditLogsService.create({
        ...audit,
        actorUserId: actor.id,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: id,
        metadata: { from: user.role, to: dto.role },
      });
    }

    return updated;
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locale: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
