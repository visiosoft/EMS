import { Controller, Get, UseGuards, Headers } from '@nestjs/common';
import { EntraAuthGuard } from '../admin-users/entra-auth.guard';
import { OrganizationChartService } from './organization-chart.service';

@Controller('organization-chart')
@UseGuards(EntraAuthGuard)
export class OrganizationChartController {
  constructor(
    private readonly organizationChartService: OrganizationChartService,
  ) {}

  @Get()
  getChart() {
    return this.organizationChartService.getChart();
  }

  @Get('hierarchy')
  getHierarchicalChart(@Headers('x-graph-access-token') graphToken?: string) {
    return this.organizationChartService.getHierarchicalChart(graphToken);
  }
}
