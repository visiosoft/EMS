import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

/** dbo.EngagementTravelCarService — car service detail linked to EngagementTravel. */
@Entity({ name: 'EngagementTravelCarService', schema: 'dbo' })
export class EngagementTravelCarService extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'CarServiceTravelID', type: 'int' })
  carServiceTravelId: number;

  @Column({ name: 'EngagementTravelID', type: 'int' })
  engagementTravelId: number;

  @Column({ name: 'OriginAddressID', type: 'int', nullable: true })
  originAddressId: number | null;

  @Column({ name: 'DestinationAddressID', type: 'int', nullable: true })
  destinationAddressId: number | null;

  @Column({ name: 'PickupDateTime', type: 'datetime2', nullable: true })
  pickupDateTime: Date | null;
}
