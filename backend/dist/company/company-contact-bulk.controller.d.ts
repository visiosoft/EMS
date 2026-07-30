import { DataSource } from 'typeorm';
import { CreateCompanyContactBulkDto } from './dto/create-company-contact-bulk.dto';
export declare class CompanyContactBulkController {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    addContactBulk(companyId: number, dto: CreateCompanyContactBulkDto): Promise<{
        contactAssignmentId: number;
        contactId: number;
        contactInfoId: number;
        firstName: string;
        lastName: string;
        email: string;
        cellPhone: string | null;
        workPhone: string | null;
        roleId: number;
        roleName: string;
        departmentId: number;
        departmentName: string;
    }[]>;
    private getOrCreateContact;
    private getRowsByAssignmentIds;
}
