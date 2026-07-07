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
   * DB column was renamed `ProjectStage` → `OfferCreationStatus`.
   * Allowed values: Requested, Drafted, Submitted.
   * The entity property keeps the legacy name `projectStage` to avoid a wide
   * API/ frontend rename; it maps to the new column via `@Column name` below.
   */
  @Column({ name: 'OfferCreationStatus', type: 'nvarchar', length: 50 })
  projectStage: string;

  /**
   * New column `OfferReviewStatus` — only applicable once an offer is
   * Submitted (OfferCreationStatus = 'Submitted').
   * Allowed values: In Consideration, Declined, Confirmed.
   * `Confirmed` is the value that triggers project → engagement conversion.
   */
  @Column({
    name: 'OfferReviewStatus',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  offerReviewStatus: string | null;

  @Column({ name: 'CreatedDate', type: 'datetime2' })
  createdDate: Date;

  @Column({ name: 'CreatedBy', type: 'nvarchar', length: 200, nullable: true })
  createdBy: string | null;
}
