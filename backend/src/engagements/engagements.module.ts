import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AttractionToursModule } from '../attraction-tours/attraction-tours.module';
import { DocumentLibraryModule } from '../document-library/document-library.module';
import { Attraction } from '../entities/attraction.entity';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { ContactInfo } from '../entities/contact-info.entity';
import { Department } from '../entities/department.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementIAEContact } from '../entities/engagement-iae-contact.entity';
import { Link } from '../entities/link.entity';
import { EngagementFinances } from '../entities/engagement-finance.entity';
import { EngagementLink } from '../entities/engagement-link.entity';
import { EngagementProduction } from '../entities/engagement-production.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { EngagementXref } from '../entities/engagement-xref.entity';
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
import { EngagementTravel } from '../entities/engagement-travel.entity';
import { EngagementTravelCarService } from '../entities/engagement-travel-car-service.entity';
import { EngagementTravelHotel } from '../entities/engagement-travel-hotel.entity';
import { EngagementPartner } from '../entities/engagement-partner.entity';
import { EngagementProductionEquipmentRental } from '../entities/engagement-production-equipment-rental.entity';
import { EquipmentRentalType } from '../entities/equipment-rental-type.entity';
import { PerformanceContract } from '../entities/performance-contract.entity';
import { ContractExtractionService } from './contract-extraction.service';
import { ContractLlmClient } from './contract-llm.client';

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([
      Engagement,
      Link,
      EngagementFinances,
      EngagementLink,
      EngagementVenue,
      EngagementXref,
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
      ContactInfo,
      Role,
      Department,
      EngagementTravel,
      EngagementTravelCarService,
      EngagementTravelHotel,
      EngagementPartner,
      EngagementProductionEquipmentRental,
      EquipmentRentalType,
      PerformanceContract,
    ]),
    AttractionToursModule,
    DocumentLibraryModule,
  ],
  controllers: [EngagementController],
  providers: [EngagementService, ContractExtractionService, ContractLlmClient],
  exports: [EngagementService],
})
export class EngagementsModule {}
