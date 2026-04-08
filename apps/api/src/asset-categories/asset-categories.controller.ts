import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import { AssetCategoriesService } from './asset-categories.service';

@ApiTags('asset-categories')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(private readonly assetCategoriesService: AssetCategoriesService) {}

  @Get()
  list() {
    return this.assetCategoriesService.list();
  }
}
