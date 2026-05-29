import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attraction } from '../entities/attraction.entity';
import { AgeRange } from '../entities/age-range.entity';
import { Class } from '../entities/class.entity';
import { Company } from '../entities/company.entity';
import { CompanyType } from '../entities/company-type.entity';
import { Contact } from '../entities/contact.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementProject } from '../entities/engagement-project.entity';
import { Link } from '../entities/link.entity';
import { Tour } from '../entities/tour.entity';
import { Job } from '../entities/job.entity';
import { TourAudienceAgeRange } from '../entities/tour-audience-age-range.entity';
import { TourTalentAgent } from '../entities/tour-talent-agent.entity';
import { VenueType } from '../entities/venue-type.entity';
import { AttractionController } from './attraction.controller';
import { AttractionService } from './attraction.service';
import { EmsAppCreatedStore } from './ems-app-created.store';
import { TourController } from './tour.controller';
import { TourService } from './tour.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attraction,
      AgeRange,
      Link,
      Tour,
      Job,
      TourAudienceAgeRange,
      Class,
      VenueType,
      Company,
      CompanyType,
      Contact,
      ContactAssignment,
      TourTalentAgent,
      Engagement,
      EngagementProject,
    ]),
  ],
  controllers: [AttractionController, TourController],
  providers: [AttractionService, TourService, EmsAppCreatedStore],
  exports: [AttractionService, TourService, EmsAppCreatedStore],
})
export class AttractionToursModule {}
