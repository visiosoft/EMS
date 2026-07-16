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

  /**
   * Offer Creation Status at the venue (component) level.
   * Values: Requested, Drafted, Submitted.
   * NOTE: Added by migration `move-offer-status-to-venue-level.sql`.
   * Until migration runs, this field won't be populated — service falls back to project-level.
   */
  offerCreationStatus?: string | null;

  /** Offer Review Status at the venue level. Added by migration. */
  offerReviewStatus?: string | null;

  /** FK → dbo.Link for confirmed offer PDF. Added by migration. */
  confirmedOfferLinkId?: number | null;
}
