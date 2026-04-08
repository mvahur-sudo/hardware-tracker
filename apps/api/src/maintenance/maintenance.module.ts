import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [AuditLogsModule, AssetsModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
