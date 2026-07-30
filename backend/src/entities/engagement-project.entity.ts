import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tour } from './tour.entity';

@Entity({ name: 'EngagementProject', schema: 'dbo' })
export class EngagementProject {
  @PrimaryGeneratedColumn({ name: 'EngagementProjectID' })
  engagementProjectId: number;

  @Column({ name: 'TourID', type: 'int' })
  tourId: number;

  @ManyToOne(() => Tour)
  @JoinColumn({ name: 'TourID' })
  tour: Tour;

  /**
   * @deprecated Moved to EngagementProjectVenue. Kept for backward compat
   * until migration `move-offer-status-to-venue-level.sql` is executed.
   */
  @Column({ name: 'OfferCreationStatus', type: 'nvarchar', length: 50, nullable: true })
  projectStage: string | null;

  /** @deprecated Moved to EngagementProjectVenue. */
  @Column({ name: 'OfferReviewStatus', type: 'nvarchar', length: 50, nullable: true })
  offerReviewStatus: string | null;

  /** @deprecated Moved to EngagementProjectVenue. */
  @Column({ name: 'ConfirmedOfferLinkID', type: 'int', nullable: true })
  confirmedOfferLinkId: number | null;

  @Column({ name: 'CreatedDate', type: 'datetime2' })
  createdDate: Date;

  @Column({ name: 'CreatedBy', type: 'nvarchar', length: 200, nullable: true })
  createdBy: string | null;
}
