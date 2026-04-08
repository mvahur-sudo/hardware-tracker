import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MeController } from './me/me.controller';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module';
import { AssetsModule } from './assets/assets.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ReportsModule } from './reports/reports.module';
import { ImportsModule } from './imports/imports.module';
import { ExportsModule } from './exports/exports.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AssetCategoriesModule,
    AssetsModule,
    AssignmentsModule,
    MaintenanceModule,
    AuditLogsModule,
    ReportsModule,
    ImportsModule,
    ExportsModule,
  ],
  controllers: [HealthController, MeController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
