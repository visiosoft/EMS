import { InternalEmployeesService } from './internal-employees.service';
export declare class InternalEmployeesController {
    private readonly internalEmployeesService;
    constructor(internalEmployeesService: InternalEmployeesService);
    findStaff(departmentId?: string): Promise<import("./internal-employees.service").IaeEmployeeRow[]>;
}
