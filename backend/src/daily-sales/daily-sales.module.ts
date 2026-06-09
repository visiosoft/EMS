import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from '../entities/address.entity';
import { Attraction } from '../entities/attraction.entity';
import { Class } from '../entities/class.entity';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { ContactInfo } from '../entities/contact-info.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { Performance } from '../entities/performance.entity';
import { PerformanceTicketing } from '../entities/performance-ticketing.entity';
import { TicketingSales } from '../entities/ticketing-sales.entity';
import { Tour } from '../entities/tour.entity';
import { Venue } from '../entities/venue.entity';
import { AuditModule } from '../audit/audit.module';
import { EngagementsModule } from '../engagements/engagements.module';
import { DailySalesController } from './daily-sales.controller';
import { DailySalesService } from './daily-sales.service';

@Module({
  imports: [
    AuditModule,
    EngagementsModule,
    TypeOrmModule.forFeature([
      TicketingSales,
      Performance,
      PerformanceTicketing,
      Engagement,
      Tour,
      Attraction,
      Class,
      EngagementVenue,
      Venue,
      Company,
      ContactAssignment,
      Contact,
      ContactInfo,
      Address,
    ]),
  ],
  controllers: [DailySalesController],
  providers: [DailySalesService],
})
export class DailySalesModule {}
