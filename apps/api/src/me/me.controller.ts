import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { getAuditContext } from '../common/utils/request-context';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UsersService } from '../users/users.service';

@ApiTags('me')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.profile(user.id);
  }

  @Patch()
  updateMe(
    @Body() dto: Pick<UpdateUserDto, 'firstName' | 'lastName' | 'locale' | 'password'>,
    @CurrentUser() user: { id: string; role: UserRole },
    @Req() req: Request,
  ) {
    return this.usersService.update(user.id, dto, user, getAuditContext(req));
  }
}
