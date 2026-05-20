import { Module } from '@nestjs/common';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { VenueDirectoryModule } from '../venue-directory/venue-directory.module';
import { InternalVenuesController } from './internal-venues.controller';
import { InternalVenuesService } from './internal-venues.service';

@Module({
  imports: [AdminUsersModule, VenueDirectoryModule],
  controllers: [InternalVenuesController],
  providers: [InternalVenuesService],
})
export class InternalVenuesModule {}
