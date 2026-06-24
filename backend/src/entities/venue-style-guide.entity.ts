import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

@Entity({ name: 'VenueStyleGuide', schema: 'dbo' })
export class VenueStyleGuide extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'VenueStyleGuideID' })
  venueStyleGuideId: number;

  @Column({ name: 'Font', type: 'nvarchar', length: 255, nullable: true })
  font: string | null;

  @Column({ name: 'PrimaryColors', type: 'nvarchar', length: 255, nullable: true })
  primaryColors: string | null;

  @Column({ name: 'AccentColors', type: 'nvarchar', length: 255, nullable: true })
  accentColors: string | null;

  @Column({ name: 'Notes', type: 'nvarchar', length: 'max', nullable: true })
  notes: string | null;

  @Column({ name: 'LogoLinkID', type: 'int', nullable: true })
  logoLinkId: number | null;
}
