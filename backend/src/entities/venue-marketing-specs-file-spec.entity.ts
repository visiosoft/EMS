import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VenueMarketingSpecs } from './venue-marketing-specs.entity';
import { FileSpecOption } from './file-spec-option.entity';

@Entity({ name: 'VenueMarketingSpecsFileSpec', schema: 'dbo' })
export class VenueMarketingSpecsFileSpec {
  @PrimaryGeneratedColumn({ name: 'VenueMarketingSpecsFileSpecID' })
  id: number;

  @Column({ name: 'VenueMarketingSpecsID', type: 'int' })
  venueMarketingSpecsId: number;

  @ManyToOne(() => VenueMarketingSpecs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'VenueMarketingSpecsID' })
  spec: VenueMarketingSpecs;

  @Column({ name: 'FileSpecOptionID', type: 'int' })
  fileSpecOptionId: number;

  @ManyToOne(() => FileSpecOption)
  @JoinColumn({ name: 'FileSpecOptionID' })
  fileSpecOption: FileSpecOption;

  @Column({ name: 'CustomValue', type: 'nvarchar', length: 255, nullable: true })
  customValue: string | null;
}
