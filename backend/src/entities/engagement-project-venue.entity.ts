import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'EngagementProjectVenue', schema: 'dbo' })
export class EngagementProjectVenue {
  @PrimaryGeneratedColumn({ name: 'EngagementProjectVenueID' })
  engagementProjectVenueId: number;

  @Column({ name: 'EngagementProjectID', type: 'int' })
  engagementProjectId: number;

  @Column({ name: 'VenueCompanyID', type: 'int' })
  venueCompanyId: number;

  @Column({ name: 'VenueStatus', type: 'nvarchar', length: 50 })
  venueStatus: string;

  @Column({ name: 'OfferCreationStatus', type: 'nvarchar', length: 50, nullable: true })
  offerCreationStatus: string | null;

  @Column({ name: 'OfferReviewStatus', type: 'nvarchar', length: 50, nullable: true })
  offerReviewStatus: string | null;

  @Column({ name: 'ConfirmedOfferLinkID', type: 'int', nullable: true })
  confirmedOfferLinkId: number | null;
}
