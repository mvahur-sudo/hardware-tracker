import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAuditContext } from '../common/utils/request-context';
import { AssetsService } from '../assets/assets.service';
import { ListAssetsDto } from '../assets/dto/list-assets.dto';
import { ReportsService } from '../reports/reports.service';

@ApiTags('exports')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
@Controller('exports')
export class ExportsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('assets')
  async exportAssets(
    @Query() query: ListAssetsDto & { format?: 'csv' | 'xlsx' | 'pdf' },
    @CurrentUser() user: { id: string; role: UserRole },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.assetsService.list({ ...query, page: 1, pageSize: 5000 }, user);
    const format = query.format ?? 'csv';
    await this.reportsService.logExport('assets', user.id, getAuditContext(req), format);
    let buffer: Buffer;
    let contentType: string;
    if (format === 'csv') {
      buffer = await this.reportsService.toCsv(result.items as any[]);
      contentType = 'text/csv';
    } else if (format === 'xlsx') {
      buffer = await this.reportsService.toXlsx(result.items as any[], 'Assets');
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = await this.reportsService.toPdf('Assets Export', result.items as any[]);
      contentType = 'application/pdf';
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="assets.${format}"`);
    res.send(buffer);
  }
}
