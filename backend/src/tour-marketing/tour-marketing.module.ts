import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tour } from '../entities/tour.entity';
import { TourTicketingOfferCode } from '../entities/tour-ticketing-offer-code.entity';
import { TourMarketingController } from './tour-marketing.controller';
import { TourMarketingService } from './tour-marketing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tour, TourTicketingOfferCode]),
  ],
  controllers: [TourMarketingController],
  providers: [TourMarketingService],
  exports: [TourMarketingService],
})
export class TourMarketingModule {}
