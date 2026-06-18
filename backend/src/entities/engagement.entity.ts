import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';
import { Tour } from './tour.entity';

/**
 * dbo.Engagement
 * Includes SellableCapacity (int) and GrossPotential (decimal(18,2)) per dbo schema.
 * Opening show date/time lives in dbo.Performance (earliest performance for the engagement).
 * NOTE: AttractionID was removed — reach Attraction via TourID → Tour → AttractionID.
 * TourID is NOT NULL (required).
 */
@Entity({ name: 'Engagement', schema: 'dbo' })
export class Engagement extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'EngagementID' })
  engagementId: number;

  @Column({ name: 'EngagementStatus', type: 'nvarchar', length: 50 })
  engagementStatus: string;

  @Column({
    name: 'EngagementScaling',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  engagementScaling: string | null;

  /** FK → Tour.TourID — NOT NULL in DB */
  @Column({ name: 'TourID', type: 'int' })
  tourId: number;

  @Column({ name: 'SellableCapacity', type: 'int', nullable: true })
  sellableCapacity: number | null;

  @Column({
    name: 'GrossPotential',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  grossPotential: string | number | null;

  @Column({ name: 'TourManagerContactID', type: 'int', nullable: true })
  tourManagerContactId: number | null;

  @ManyToOne(() => Tour)
  @JoinColumn({ name: 'TourID' })
  tour: Tour;
}
