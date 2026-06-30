import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { InternalEmployeesService } from './internal-employees.service';

@UseGuards(InternalAccessGuard)
@Controller('internal/iae-employees')
export class InternalEmployeesController {
  constructor(
    private readonly internalEmployeesService: InternalEmployeesService,
  ) {}

  @Get()
  findStaff(@Query('departmentId') departmentId?: string) {
    if (departmentId) {
      return this.internalEmployeesService.listEmployeesByDepartment(Number(departmentId));
    }
    return this.internalEmployeesService.listStaffEmployees();
  }
}
