import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAuditContext } from '../common/utils/request-context';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':key')
  getReport(@Param('key') key: string, @Query() query: { days?: string; from?: string; to?: string }) {
    return this.reportsService.getReport(key, {
      days: query.days ? Number(query.days) : undefined,
      from: query.from,
      to: query.to,
    });
  }

  @Get(':key/export/:format')
  async exportReport(
    @Param('key') key: string,
    @Param('format') format: 'csv' | 'xlsx' | 'pdf',
    @Query() query: { days?: string; from?: string; to?: string },
    @CurrentUser() user: { id: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const rows = await this.reportsService.getReport(key, {
      days: query.days ? Number(query.days) : undefined,
      from: query.from,
      to: query.to,
    });
    await this.reportsService.logExport(key, user.id, getAuditContext(req), format);

    let buffer: Buffer;
    let contentType: string;
    if (format === 'csv') {
      buffer = await this.reportsService.toCsv(rows as any[]);
      contentType = 'text/csv';
    } else if (format === 'xlsx') {
      buffer = await this.reportsService.toXlsx(rows as any[], key);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = await this.reportsService.toPdf(key, rows as any[]);
      contentType = 'application/pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${key}.${format}"`);
    res.send(buffer);
  }
}
