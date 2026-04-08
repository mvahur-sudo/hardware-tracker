import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAuditContext } from '../common/utils/request-context';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ListAssetsDto } from './dto/list-assets.dto';

@ApiTags('assets')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('dashboard')
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  dashboard() {
    return this.assetsService.dashboard();
  }

  @Get('lookup/qr')
  lookupByQr(@Query('value') value: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.assetsService.lookupByQr(value, user);
  }

  @Get()
  list(@Query() query: ListAssetsDto, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.assetsService.list(query, user);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  create(
    @Body() dto: CreateAssetDto,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.assetsService.create(dto, actor, getAuditContext(req));
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.assetsService.getById(id, user);
  }

  @Get(':id/history')
  history(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.assetsService.history(id, user);
  }

  @Get(':id/qr.png')
  async qrImage(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }, @Res() res: Response) {
    const asset = await this.assetsService.getById(id, user);
    const png = await QRCode.toBuffer(asset.qrCodeValue, { width: 400, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.assetsService.update(id, dto, actor, getAuditContext(req));
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() actor: { id: string }, @Req() req: Request) {
    return this.assetsService.softDelete(id, actor, getAuditContext(req));
  }
}
