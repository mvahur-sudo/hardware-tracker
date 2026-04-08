import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { getAuditContext } from '../common/utils/request-context';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password);
    const cookieDomain = process.env.COOKIE_DOMAIN;

    res.cookie('ht_at', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: cookieDomain === 'localhost' ? undefined : cookieDomain,
      maxAge: 1000 * 60 * 60 * 12,
      path: '/',
    });

    await this.auditLogsService.create({
      ...getAuditContext(req),
      actorUserId: result.user.id,
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: result.user.id,
      metadata: { email: result.user.email },
    });

    return result.user;
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: { id: string },
  ) {
    res.clearCookie('ht_at', { path: '/' });
    await this.auditLogsService.create({
      ...getAuditContext(req),
      actorUserId: user.id,
      action: 'AUTH_LOGOUT',
      entityType: 'User',
      entityId: user.id,
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  getMe(@CurrentUser() user: any) {
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
