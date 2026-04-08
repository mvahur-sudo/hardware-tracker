import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditContext } from '../common/utils/request-context';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getReport(key: string, params?: { days?: number; from?: string; to?: string }) {
    switch (key) {
      case 'inventory-by-category': {
        const categories = await this.prisma.assetCategory.findMany({
          include: { _count: { select: { assets: { where: { deletedAt: null } } } } },
          orderBy: { nameEn: 'asc' },
        });
        return categories.map((item) => ({
          key: item.key,
          nameEn: item.nameEn,
          nameEt: item.nameEt,
          count: item._count.assets,
        }));
      }
      case 'inventory-by-status': {
        return this.prisma.asset.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: true,
        });
      }
      case 'assigned-by-employee': {
        return this.prisma.assignment.findMany({
          where: { returnedAt: null },
          include: {
            asset: { select: { id: true, assetTag: true, brand: true, model: true } },
            user: { select: { firstName: true, lastName: true, email: true } },
          },
          orderBy: { assignedAt: 'desc' },
        });
      }
      case 'warranty-expiring': {
        const days = params?.days ?? 30;
        return this.prisma.asset.findMany({
          where: {
            deletedAt: null,
            warrantyEndDate: {
              gte: new Date(),
              lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
            },
          },
          include: { currentAssignee: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { warrantyEndDate: 'asc' },
        });
      }
      case 'assets-in-maintenance': {
        return this.prisma.maintenanceRecord.findMany({
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          include: { asset: true, createdBy: { select: { firstName: true, lastName: true } } },
          orderBy: { startedAt: 'desc' },
        });
      }
      case 'maintenance-costs': {
        const from = params?.from ? new Date(params.from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const to = params?.to ? new Date(params.to) : new Date();
        return this.prisma.maintenanceRecord.findMany({
          where: { startedAt: { gte: from, lte: to } },
          include: { asset: true },
          orderBy: { startedAt: 'desc' },
        });
      }
      case 'retired-disposed': {
        return this.prisma.asset.findMany({
          where: { deletedAt: null, status: { in: ['RETIRED', 'DISPOSED'] } },
          include: { category: true },
          orderBy: { updatedAt: 'desc' },
        });
      }
      case 'recent-activity': {
        return this.prisma.auditLog.findMany({
          take: 100,
          include: { actorUser: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        });
      }
      default:
        throw new NotFoundException('Unknown report');
    }
  }

  async logExport(key: string, actorUserId: string, audit: AuditContext, format: string) {
    await this.auditLogsService.create({
      ...audit,
      actorUserId,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: key,
      metadata: { format },
    });
  }

  async toCsv(rows: any[]): Promise<Buffer> {
    if (!rows.length) return Buffer.from('');
    const flatRows = rows.map((row) => flatten(row));
    const headers = Object.keys(flatRows[0]);
    const lines = [headers.join(',')];
    for (const row of flatRows) {
      lines.push(headers.map((key) => csvValue(row[key])).join(','));
    }
    return Buffer.from(lines.join('\n'), 'utf8');
  }

  async toXlsx(rows: any[], sheetName = 'Report'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);
    const flatRows = rows.map((row) => flatten(row));
    const headers = flatRows.length ? Object.keys(flatRows[0]) : [];
    if (headers.length) {
      sheet.columns = headers.map((header) => ({ header, key: header, width: 24 }));
      flatRows.forEach((row) => sheet.addRow(row));
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async toPdf(title: string, rows: any[]): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.fontSize(18).text(title);
      doc.moveDown();
      rows.slice(0, 50).forEach((row) => {
        doc.fontSize(10).text(JSON.stringify(flatten(row), null, 2));
        doc.moveDown();
      });
      doc.end();
    });
  }
}

function csvValue(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`;
  return str;
}

function flatten(obj: any, prefix = '', acc: Record<string, string | number | null> = {}) {
  Object.entries(obj ?? {}).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value instanceof Date) {
      acc[nextKey] = value.toISOString();
    } else if (value === null || value === undefined) {
      acc[nextKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, nextKey, acc);
    } else {
      acc[nextKey] = Array.isArray(value) ? JSON.stringify(value) : (value as any);
    }
  });
  return acc;
}
