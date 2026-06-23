import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';
import { PlacementCategory } from './placement-category.entity';
import { FileFormatOption } from './file-format-option.entity';
import { VenueStyleGuide } from './venue-style-guide.entity';

@Entity({ name: 'VenueMarketingSpecs', schema: 'dbo' })
export class VenueMarketingSpecs extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'VenueMarketingSpecsID' })
  venueMarketingSpecsId: number;

  @Column({ name: 'VenueID', type: 'int' })
  venueId: number;

  @Column({ name: 'StyleGuideEnabled', type: 'bit' })
  styleGuideEnabled: boolean;

  @Column({ name: 'VenueStyleGuideID', type: 'int', nullable: true })
  venueStyleGuideId: number | null;

  @ManyToOne(() => VenueStyleGuide, { nullable: true })
  @JoinColumn({ name: 'VenueStyleGuideID' })
  venueStyleGuide: VenueStyleGuide | null;

  @Column({ name: 'FileName', type: 'nvarchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: 'PlacementCategoryID', type: 'int', nullable: true })
  placementCategoryId: number | null;

  @ManyToOne(() => PlacementCategory, { nullable: true })
  @JoinColumn({ name: 'PlacementCategoryID' })
  placementCategory: PlacementCategory | null;

  @Column({ name: 'GraphicSizeHorizontal', type: 'nvarchar', length: 50, nullable: true })
  graphicSizeHorizontal: string | null;

  @Column({ name: 'GraphicSizeVertical', type: 'nvarchar', length: 50, nullable: true })
  graphicSizeVertical: string | null;

  @Column({ name: 'FileFormatOptionID', type: 'int', nullable: true })
  fileFormatOptionId: number | null;

  @ManyToOne(() => FileFormatOption, { nullable: true })
  @JoinColumn({ name: 'FileFormatOptionID' })
  fileFormat: FileFormatOption | null;

  @Column({ name: 'Notes', type: 'nvarchar', length: 'max', nullable: true })
  notes: string | null;
}
