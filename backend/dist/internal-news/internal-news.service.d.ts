import { DataSource } from 'typeorm';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { AuditRequestContext } from '../audit/audit-request-context.service';
import { CreateNewsDto } from './dto/create-news.dto';
export type InternalNewsListItem = {
    id: string;
    title: string;
    summary: string;
    body: string;
    createdBy: string | null;
    createdByName: string;
    createdAt: string | null;
    modifiedBy: string | null;
    modifiedAt: string | null;
};
export declare class InternalNewsService {
    private readonly dataSource;
    private readonly auditContext;
    private readonly adminUsersService;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext, adminUsersService: AdminUsersService);
    findAll(limit?: number, skip?: number): Promise<InternalNewsListItem[]>;
    create(dto: CreateNewsDto): Promise<InternalNewsListItem>;
    private toListItems;
    private getAuthorNames;
    private getColumnFlags;
}
