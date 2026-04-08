import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { ReportsModule } from '../reports/reports.module';
import { ExportsController } from './exports.controller';

@Module({
  imports: [AssetsModule, ReportsModule],
  controllers: [ExportsController],
})
export class ExportsModule {}
