import { Controller, Get, UseGuards } from '@nestjs/common';
import { InternalAccessGuard } from '../internal-access/internal-access.guard';
import { InternalBenefitsService } from './internal-benefits.service';

@UseGuards(InternalAccessGuard)
@Controller('internal/benefits')
export class InternalBenefitsController {
  constructor(private readonly internalBenefitsService: InternalBenefitsService) {}

  /** The signed-in employee's Health/Dental/Vision elections with matched premiums. */
  @Get('my-insurance')
  getMyInsurance() {
    return this.internalBenefitsService.getMyInsurance();
  }

  /** All active plans with benefit bullets and current pricing. */
  @Get('plans')
  listPlans() {
    return this.internalBenefitsService.listPlans();
  }
}
