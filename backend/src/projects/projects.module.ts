import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { AttractionToursModule } from '../attraction-tours/attraction-tours.module';
import { Attraction } from '../entities/attraction.entity';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { ContactAssignment } from '../entities/contact-assignment.entity';
import { Engagement } from '../entities/engagement.entity';
import { EngagementProject } from '../entities/engagement-project.entity';
import { EngagementProjectDma } from '../entities/engagement-project-dma.entity';
import { EngagementProjectPerformanceOption } from '../entities/engagement-project-performance-option.entity';
import { EngagementProjectVenue } from '../entities/engagement-project-venue.entity';
import { EngagementVenue } from '../entities/engagement-venue.entity';
import { EngagementXref } from '../entities/engagement-xref.entity';
import { Link } from '../entities/link.entity';
import { Performance } from '../entities/performance.entity';
import { Tour } from '../entities/tour.entity';
import { TourTalentAgent } from '../entities/tour-talent-agent.entity';
import { Venue } from '../entities/venue.entity';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [
    AdminUsersModule,
    AttractionToursModule,
    TypeOrmModule.forFeature([
      EngagementProject,
      EngagementProjectDma,
      EngagementProjectVenue,
      EngagementProjectPerformanceOption,
      Engagement,
      EngagementVenue,
      EngagementXref,
      Performance,
      Tour,
      TourTalentAgent,
      Attraction,
      Venue,
      Company,
      Contact,
      ContactAssignment,
      Link,
    ]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectsModule {}
