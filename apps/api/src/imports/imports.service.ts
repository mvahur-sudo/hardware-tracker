import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetCondition, AssetStatus, ImportFormat, ImportJobStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditContext } from '../common/utils/request-context';

export interface ParsedImportRow {
  assetTag: string;
  serialNumber: string;
  categoryKey: string;
  brand: string;
  model: string;
  status: string;
  condition: string;
  purchaseDate: string;
  purchasePrice: string;
  warrantyEndDate: string;
  vendor: string;
  location: string;
  notes: string;
}

export interface ParsedValidationRow {
  rowNumber: number;
  row: ParsedImportRow;
  errors: string[];
  valid: boolean;
}

const TEMPLATE_HEADERS = [
  'assetTag',
  'serialNumber',
  'categoryKey',
  'brand',
  'model',
  'status',
  'condition',
  'purchaseDate',
  'purchasePrice',
  'warrantyEndDate',
  'vendor',
  'location',
  'notes',
];

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  template(format: 'csv' | 'xlsx') {
    if (format === 'csv') {
      return Buffer.from(`${TEMPLATE_HEADERS.join(',')}\n`, 'utf8');
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  }

  parseFile(file: Express.Multer.File): ParsedImportRow[] {
    const name = file.originalname.toLowerCase();
    if (name.endsWith('.csv')) {
      const [headerLine, ...lines] = file.buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
      const headers = splitCsv(headerLine);
      return lines.map((line: string) => {
        const values = splitCsv(line);
        return Object.fromEntries(
          headers.map((header, index) => [header, values[index] ?? '']),
        ) as unknown as ParsedImportRow;
      });
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json<ParsedImportRow>(sheet, { defval: '' });
    }
    throw new BadRequestException('Unsupported file format');
  }

  async preview(file: Express.Multer.File, actor: { id: string }, audit: AuditContext) {
    const rows = this.parseFile(file);
    const categories = await this.prisma.assetCategory.findMany();
    const categoryMap = new Map(categories.map((category) => [category.key, category.id]));
    const existingTags = new Set(
      (await this.prisma.asset.findMany({ select: { assetTag: true } })).map((asset) => asset.assetTag),
    );

    const validation: ParsedValidationRow[] = rows.map((row: ParsedImportRow, index: number) => {
      const errors: string[] = [];
      if (!row.assetTag) errors.push('assetTag is required');
      if (!row.brand) errors.push('brand is required');
      if (!row.model) errors.push('model is required');
      if (!row.categoryKey || !categoryMap.has(row.categoryKey as any)) errors.push('Invalid categoryKey');
      if (row.status && !Object.values(AssetStatus).includes(row.status as AssetStatus)) errors.push('Invalid status');
      if (row.condition && !Object.values(AssetCondition).includes(row.condition as AssetCondition)) errors.push('Invalid condition');
      if (row.assetTag && existingTags.has(row.assetTag)) errors.push('Duplicate assetTag already exists');
      return { rowNumber: index + 2, row, errors, valid: errors.length === 0 };
    });

    const summary = {
      totalRows: rows.length,
      validRows: validation.filter((row: ParsedValidationRow) => row.valid).length,
      invalidRows: validation.filter((row: ParsedValidationRow) => !row.valid).length,
      rows: validation,
    };

    await this.prisma.importJob.create({
      data: {
        createdById: actor.id,
        fileName: file.originalname,
        format: file.originalname.toLowerCase().endsWith('.csv') ? ImportFormat.CSV : ImportFormat.XLSX,
        status: ImportJobStatus.PREVIEWED,
        summary: summary as any,
      },
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'IMPORT_PREVIEWED',
      entityType: 'ImportJob',
      entityId: file.originalname,
      metadata: { totalRows: summary.totalRows, validRows: summary.validRows },
    });

    return summary;
  }

  async commit(file: Express.Multer.File, actor: { id: string }, audit: AuditContext) {
    const preview = await this.preview(file, actor, audit);
    const validRows = preview.rows.filter((row: ParsedValidationRow) => row.valid);
    const categories = await this.prisma.assetCategory.findMany();
    const categoryMap = new Map(categories.map((category) => [category.key, category.id]));

    const created = await this.prisma.$transaction(
      validRows.map((item: ParsedValidationRow) =>
        this.prisma.asset.create({
          data: {
            assetTag: item.row.assetTag,
            serialNumber: item.row.serialNumber || null,
            qrCodeValue: `asset:${item.row.assetTag}`,
            categoryId: categoryMap.get(item.row.categoryKey as any)!,
            brand: item.row.brand,
            model: item.row.model,
            status: (item.row.status as AssetStatus) || AssetStatus.IN_STOCK,
            condition: (item.row.condition as AssetCondition) || AssetCondition.GOOD,
            purchaseDate: item.row.purchaseDate ? new Date(item.row.purchaseDate) : undefined,
            purchasePrice: item.row.purchasePrice ? Number(item.row.purchasePrice) : undefined,
            warrantyEndDate: item.row.warrantyEndDate ? new Date(item.row.warrantyEndDate) : undefined,
            vendor: item.row.vendor || null,
            location: item.row.location || null,
            notes: item.row.notes || null,
            createdById: actor.id,
            updatedById: actor.id,
          },
        }),
      ),
    );

    await this.prisma.importJob.create({
      data: {
        createdById: actor.id,
        fileName: file.originalname,
        format: file.originalname.toLowerCase().endsWith('.csv') ? ImportFormat.CSV : ImportFormat.XLSX,
        status: ImportJobStatus.COMPLETED,
        summary: { created: created.length, preview } as any,
      },
    });

    await this.auditLogsService.create({
      ...audit,
      actorUserId: actor.id,
      action: 'IMPORT_COMPLETED',
      entityType: 'ImportJob',
      entityId: file.originalname,
      metadata: { created: created.length },
    });

    return { created: created.length, preview };
  }
}

function splitCsv(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
