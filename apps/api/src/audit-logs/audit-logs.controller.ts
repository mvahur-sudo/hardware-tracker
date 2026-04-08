import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('audit-logs')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  async list(
    @Query() query: PaginationQueryDto & { action?: string; entityType?: string; search?: string },
  ) {
    return this.auditLogsService.list(query);
  }
}
