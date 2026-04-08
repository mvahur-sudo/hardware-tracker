import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AssetCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.assetCategory.findMany({ orderBy: { nameEn: 'asc' } });
  }
}
