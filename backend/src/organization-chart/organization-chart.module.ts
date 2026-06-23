import { Module } from '@nestjs/common';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { OrganizationChartController } from './organization-chart.controller';
import { OrganizationChartService } from './organization-chart.service';

@Module({
  imports: [AdminUsersModule],
  controllers: [OrganizationChartController],
  providers: [OrganizationChartService],
})
export class OrganizationChartModule {}
