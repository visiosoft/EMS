import { Module } from '@nestjs/common';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { CompanyModule } from '../company/company.module';
import { InternalMarketsController } from './internal-markets.controller';
import { InternalMarketsService } from './internal-markets.service';

@Module({
  imports: [AdminUsersModule, CompanyModule],
  controllers: [InternalMarketsController],
  providers: [InternalMarketsService],
})
export class InternalMarketsModule {}
