import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAuditContext } from '../common/utils/request-context';
import { AssignmentsService } from './assignments.service';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';

@ApiTags('assignments')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('assign')
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  assign(
    @Body() dto: AssignAssetDto,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.assignmentsService.assign(dto, actor, getAuditContext(req));
  }

  @Post(':id/return')
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  returnAsset(
    @Param('id') id: string,
    @Body() dto: ReturnAssetDto,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.assignmentsService.returnAsset(id, dto, actor, getAuditContext(req));
  }
}
