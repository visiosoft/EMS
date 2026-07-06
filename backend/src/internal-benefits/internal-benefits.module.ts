import { Module } from '@nestjs/common';
import { InternalBenefitsController } from './internal-benefits.controller';
import { InternalBenefitsService } from './internal-benefits.service';

@Module({
  controllers: [InternalBenefitsController],
  providers: [InternalBenefitsService],
})
export class InternalBenefitsModule {}
