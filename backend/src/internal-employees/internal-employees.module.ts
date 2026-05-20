import { Module } from '@nestjs/common';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { InternalEmployeesController } from './internal-employees.controller';
import { InternalEmployeesService } from './internal-employees.service';

@Module({
  imports: [AdminUsersModule],
  controllers: [InternalEmployeesController],
  providers: [InternalEmployeesService],
})
export class InternalEmployeesModule {}
