export declare class CreateCompanyContactDto {
    firstName: string;
    lastName: string;
    email: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    roleId: number;
    departmentId: number;
}
export declare class UpdateCompanyContactDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    roleId?: number;
    departmentId?: number;
}
