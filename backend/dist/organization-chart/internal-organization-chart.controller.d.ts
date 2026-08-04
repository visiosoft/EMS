import { OrganizationChartService } from './organization-chart.service';
export declare class InternalOrganizationChartController {
    private readonly organizationChartService;
    constructor(organizationChartService: OrganizationChartService);
    getHierarchicalChart(graphToken?: string): Promise<import("./organization-chart.service").OrganizationChartHierarchyResponse>;
}
