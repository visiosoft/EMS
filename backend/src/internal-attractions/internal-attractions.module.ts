import { Module } from '@nestjs/common';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { AttractionToursModule } from '../attraction-tours/attraction-tours.module';
import { InternalAttractionsController } from './internal-attractions.controller';
import { InternalAttractionsService } from './internal-attractions.service';

@Module({
  imports: [AdminUsersModule, AttractionToursModule],
  controllers: [InternalAttractionsController],
  providers: [InternalAttractionsService],
})
export class InternalAttractionsModule {}
