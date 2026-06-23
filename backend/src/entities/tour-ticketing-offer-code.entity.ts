import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';
import { Tour } from './tour.entity';

@Entity({ name: 'TourTicketingOfferCode', schema: 'dbo' })
export class TourTicketingOfferCode extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'OfferCodeID' })
  offerCodeId: number;

  @Column({ name: 'TourID', type: 'int' })
  tourId: number;

  @ManyToOne(() => Tour)
  @JoinColumn({ name: 'TourID' })
  tour: Tour;

  @Column({ name: 'Code', type: 'nvarchar', length: 100 })
  code: string;

  @Column({ name: 'AssignedTo', type: 'nvarchar', length: 100, nullable: true })
  assignedTo: string | null;

  @Column({ name: 'IAESMS', type: 'nvarchar', length: 100, nullable: true })
  iaeSms: string | null;

  @Column({ name: 'Purpose', type: 'nvarchar', length: 100, nullable: true })
  purpose: string | null;
}
