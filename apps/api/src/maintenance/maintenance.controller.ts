import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAuditContext } from '../common/utils/request-context';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { ReportIssueDto } from './dto/report-issue.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('maintenance')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  list(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.maintenanceService.list(user);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  create(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.maintenanceService.create(dto, actor, getAuditContext(req));
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.maintenanceService.update(id, dto, actor, getAuditContext(req));
  }

  @Post('report-issue')
  @Roles(UserRole.EMPLOYEE)
  reportIssue(
    @Body() dto: ReportIssueDto,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.maintenanceService.reportIssue(dto, actor, getAuditContext(req));
  }
}
