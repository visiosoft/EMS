import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AttractionToursModule } from '../attraction-tours/attraction-tours.module';
import { Attraction } from '../entities/attraction.entity';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { Department } from '../entities/department.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementIAEContact } from '../entities/engagement-iae-contact.entity';
import { Link } from '../entities/link.entity';
import { EngagementFinances } from '../entities/engagement-finance.entity';
import { EngagementProduction } from '../entities/engagement-production.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { NonResidentWithholding } from '../entities/non-resident-withholding.entity';
import { ArtistFinance } from '../entities/artist-finance.entity';
import { SettlementFinance } from '../entities/settlement-finance.entity';
import { Performance } from '../entities/performance.entity';
import { PerformanceTicketing } from '../entities/performance-ticketing.entity';
import { Role } from '../entities/role.entity';
import { TicketingSales } from '../entities/ticketing-sales.entity';
import { Tour } from '../entities/tour.entity';
import { Venue } from '../entities/venue.entity';
import { VenueServiceProvider } from '../entities/venue-service-provider.entity';
import { ServiceProvided } from '../entities/service-provided.entity';
import { CompanyService as CompanyServiceEntity } from '../entities/company-service.entity';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([
      Engagement,
      Link,
      EngagementFinances,
      EngagementVenue,
      EngagementProduction,
      Performance,
      PerformanceTicketing,
      TicketingSales,
      Attraction,
      Tour,
      Venue,
      Company,
      VenueServiceProvider,
      ServiceProvided,
      CompanyServiceEntity,
      NonResidentWithholding,
      ArtistFinance,
      SettlementFinance,
      EngagementIAEContact,
      Contact,
      Role,
      Department,
    ]),
    AttractionToursModule,
  ],
  controllers: [EngagementController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementsModule {}
