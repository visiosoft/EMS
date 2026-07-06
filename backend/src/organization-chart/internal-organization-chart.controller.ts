import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { OrganizationChartService } from './organization-chart.service';

/**
 * Company Hub (WMS) org chart. Same data as the EMS `/organization-chart` endpoint but
 * behind the permissive InternalAccessGuard so any signed-in Hub user can view it. The
 * underlying service builds an Entra manager hierarchy when a delegated Graph token is
 * supplied (via `x-graph-access-token`) and falls back to the department view otherwise.
 */
@Controller('internal/organization-chart')
@UseGuards(InternalAccessGuard)
export class InternalOrganizationChartController {
  constructor(
    private readonly organizationChartService: OrganizationChartService,
  ) {}

  @Get('hierarchy')
  getHierarchicalChart(@Headers('x-graph-access-token') graphToken?: string) {
    return this.organizationChartService.getHierarchicalChart(graphToken);
  }
}
