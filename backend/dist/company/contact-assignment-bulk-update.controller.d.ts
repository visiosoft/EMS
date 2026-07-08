import { DataSource } from 'typeorm';
declare class UpdateContactAssignmentBulkDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    roleIds: number[];
    departmentIds: number[];
}
export declare class ContactAssignmentBulkUpdateController {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    updateContactBulk(assignmentId: number, dto: UpdateContactAssignmentBulkDto): Promise<{
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
    private getRowsByAssignmentIds;
}
export {};
