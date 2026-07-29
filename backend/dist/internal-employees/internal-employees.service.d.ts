import { DataSource } from 'typeorm';
export type IaeEmployeeRow = {
    contactId: number;
    firstName: string;
    lastName: string;
    email: string;
    cellPhone: string | null;
    workPhone: string | null;
    roleName: string | null;
    extension: string | null;
    departmentName: string | null;
};
export declare class InternalEmployeesService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    listStaffEmployees(): Promise<IaeEmployeeRow[]>;
    listEmployeesByDepartment(departmentId: number): Promise<IaeEmployeeRow[]>;
}
