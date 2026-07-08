export declare class ManageContactDto {
    firstName: string;
    lastName: string;
    email: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    companyId?: number | null;
    roleIds?: number[];
    departmentIds?: number[];
}
export declare class UpdateManagedContactDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    companyId?: number | null;
    roleIds?: number[];
    departmentIds?: number[];
}
