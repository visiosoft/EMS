import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

/** dbo.EngagementTravelHotel — hotel booking detail linked to EngagementTravel. */
@Entity({ name: 'EngagementTravelHotel', schema: 'dbo' })
export class EngagementTravelHotel extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'HotelTravelID', type: 'int' })
  hotelTravelId: number;

  @Column({ name: 'EngagementTravelID', type: 'int' })
  engagementTravelId: number;

  @Column({ name: 'HotelCompanyID', type: 'int', nullable: true })
  hotelCompanyId: number | null;

  @Column({ name: 'NumberOfRooms', type: 'int', nullable: true })
  numberOfRooms: number | null;

  @Column({ name: 'RoomTypes', type: 'nvarchar', length: 255, nullable: true })
  roomTypes: string | null;

  @Column({ name: 'CheckInDate', type: 'date', nullable: true })
  checkInDate: string | null;

  @Column({ name: 'CheckOutDate', type: 'date', nullable: true })
  checkOutDate: string | null;

  @Column({ name: 'OccupantContactID', type: 'int', nullable: true })
  occupantContactId: number | null;
}
