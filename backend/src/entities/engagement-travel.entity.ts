import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

/** dbo.EngagementTravel — parent record for Hotel or Car travel arrangements. */
@Entity({ name: 'EngagementTravel', schema: 'dbo' })
export class EngagementTravel extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'EngagementTravelID', type: 'int' })
  engagementTravelId: number;

  @Column({ name: 'EngagementID', type: 'int' })
  engagementId: number;

  /** 'Hotel' | 'Car' */
  @Column({ name: 'TravelType', type: 'nvarchar', length: 20 })
  travelType: string;

  @Column({ name: 'BookedBy', type: 'nvarchar', length: 50, nullable: true })
  bookedBy: string | null;
}
