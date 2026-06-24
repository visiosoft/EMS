import { Module } from '@nestjs/common';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { OrganizationChartController } from './organization-chart.controller';
import { OrganizationChartService } from './organization-chart.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AdminUsersModule, AuditModule],
  controllers: [OrganizationChartController],
  providers: [OrganizationChartService],
  exports: [OrganizationChartService],
})
export class OrganizationChartModule {}
