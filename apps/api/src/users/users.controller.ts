import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getAuditContext } from '../common/utils/request-context';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  list(@Query() query: PaginationQueryDto & { role?: UserRole; search?: string }) {
    return this.usersService.list(query);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: { id: string; role: UserRole },
    @Req() req: Request,
  ) {
    return this.usersService.create(dto, actor, getAuditContext(req));
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: { id: string; role: UserRole },
    @Req() req: Request,
  ) {
    return this.usersService.update(id, dto, actor, getAuditContext(req));
  }
}
