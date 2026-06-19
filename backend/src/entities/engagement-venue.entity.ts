import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

@Entity({ name: 'EngagementVenue', schema: 'dbo' })
export class EngagementVenue extends AuditColumns {
  @PrimaryColumn({ name: 'EngagementID', type: 'int' })
  engagementId: number;

  @PrimaryColumn({ name: 'VenueCompanyID', type: 'int' })
  venueCompanyId: number;

  @Column({ name: 'IsPrimary', type: 'bit' })
  isPrimary: boolean;

  @Column({ name: 'VenueBookingManagerContactID', type: 'int', nullable: true })
  venueBookingManagerContactId: number | null;
}
