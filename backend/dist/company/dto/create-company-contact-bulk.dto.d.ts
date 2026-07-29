export declare class CreateCompanyContactBulkDto {
    firstName: string;
    lastName: string;
    email: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    roleIds: number[];
    departmentIds: number[];
}
