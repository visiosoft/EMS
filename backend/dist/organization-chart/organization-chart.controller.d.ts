import { OrganizationChartService } from './organization-chart.service';
export declare class OrganizationChartController {
    private readonly organizationChartService;
    constructor(organizationChartService: OrganizationChartService);
    getChart(): Promise<import("./organization-chart.service").OrganizationChartResponse>;
    getHierarchicalChart(graphToken?: string): Promise<import("./organization-chart.service").OrganizationChartHierarchyResponse>;
}
