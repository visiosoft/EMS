import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export type OrganizationChartMember = {
    memberId: number;
    contactId: number;
    sortOrder: number;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    cellPhone: string;
    workPhone: string;
    jobTitle: string;
    roleName: string;
    departmentName: string;
};
export type OrganizationChartNode = {
    nodeId: number;
    parentNodeId: number | null;
    label: string;
    sortOrder: number;
    members: OrganizationChartMember[];
};
export type OrganizationChartResponse = {
    configured: boolean;
    generatedAt: string;
    company: {
        companyId: number;
        companyName: string;
    } | null;
    nodes: OrganizationChartNode[];
    warnings: string[];
};
export type HierarchyMember = {
    memberId: number;
    contactId: number;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    cellPhone: string;
    workPhone: string;
    jobTitle: string;
    roleName: string;
    departmentName: string;
    entraUserId?: string;
};
export type HierarchyNode = {
    nodeId: string;
    member: HierarchyMember;
    children: HierarchyNode[];
};
export type OrganizationChartHierarchyResponse = {
    mode: 'hierarchy' | 'department';
    configured: boolean;
    generatedAt: string;
    company: {
        companyId: number;
        companyName: string;
    } | null;
    roots: HierarchyNode[];
    unmatched: HierarchyMember[];
    stats: {
        people: number;
        departments: number;
        levels: number;
    };
    warnings: string[];
    nodes?: OrganizationChartNode[];
};
export declare class OrganizationChartService {
    private readonly dataSource;
    private readonly auditContext;
    private readonly logger;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext);
    getHierarchicalChart(graphAccessToken?: string): Promise<OrganizationChartHierarchyResponse>;
    private resolveGraphToken;
    private fetchEntraUsersWithManagers;
    private buildHierarchyFromEntra;
    private buildMembersFromRows;
    getChart(): Promise<OrganizationChartResponse>;
    private getInternalCompanies;
    private hasContactInfoJobTitleColumn;
    private loadInternalContacts;
    private buildDepartmentNodes;
}
