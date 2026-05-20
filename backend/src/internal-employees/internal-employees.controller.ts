import { Controller, Get, UseGuards } from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { InternalEmployeesService } from './internal-employees.service';

@UseGuards(InternalAccessGuard)
@Controller('internal/iae-employees')
export class InternalEmployeesController {
  constructor(private readonly internalEmployeesService: InternalEmployeesService) {}

  @Get()
  findStaff() {
    return this.internalEmployeesService.listStaffEmployees();
  }
}
