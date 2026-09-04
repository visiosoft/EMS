import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuditRequestContext } from '../audit/audit-request-context.service';
export type IaeEmployeeRow = {
    contactId: number;
    firstName: string;
    lastName: string;
    email: string;
    cellPhone: string | null;
    workPhone: string | null;
    roleName: string | null;
    jobTitle: string | null;
    extension: string | null;
    departmentName: string | null;
    department2: string | null;
    departmentRank: number | null;
};
export declare class InternalEmployeesService {
    private readonly dataSource;
    private readonly auditContext;
    private readonly configService;
    constructor(dataSource: DataSource, auditContext: AuditRequestContext, configService: ConfigService);
    private department2Select;
    listStaffEmployees(): Promise<IaeEmployeeRow[]>;
    listEmployeesByDepartment(departmentId: number): Promise<IaeEmployeeRow[]>;
    private fetchEntraJobTitleMap;
    private acquireAppOnlyGraphToken;
    private fetchJobTitlesWithToken;
}
