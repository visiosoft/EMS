import { DataSource } from 'typeorm';
import { ToolCallRecord } from './ai.types';
export declare class AiToolsExecutor {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    executeTool(name: string, input: Record<string, unknown>): Promise<ToolCallRecord>;
    private searchProjects;
    private getProjectDetail;
    private searchEngagements;
    private getEngagementDetail;
    private searchCompanies;
    private getCompanyDetail;
    private searchContacts;
    private searchVenues;
    private getDailySalesSummary;
    private getAttractionsAndTours;
    private searchHandbookAndNews;
    private executeReadonlySql;
}
