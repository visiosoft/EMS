import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

/**
 * dbo.Attraction
 * Columns: AttractionID, AttractionName, AttractionManagementLinkID
 * NOTE: ClassID was removed from this table — it lives exclusively on Tour.
 */
@Entity({ name: 'Attraction', schema: 'dbo' })
export class Attraction extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'AttractionID' })
  attractionId: number;

  @Column({ name: 'AttractionName', type: 'nvarchar', length: 200 })
  attractionName: string;

  @Column({ name: 'AttractionManagementLinkID', type: 'int', nullable: true })
  attractionManagementLinkId: number | null;
}
