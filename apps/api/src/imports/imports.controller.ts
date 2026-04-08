import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAuditContext } from '../common/utils/request-context';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.IT_ADMIN)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get('assets/template')
  async template(@Query('format') format: 'csv' | 'xlsx' = 'csv', @Res() res: Response) {
    const buffer = this.importsService.template(format);
    res.setHeader(
      'Content-Type',
      format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="assets-template.${format}"`);
    res.send(buffer);
  }

  @Post('assets/preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  preview(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.importsService.preview(file, actor, getAuditContext(req));
  }

  @Post('assets/commit')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  commit(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.importsService.commit(file, actor, getAuditContext(req));
  }
}
