import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VenueMarketingSpecs } from './venue-marketing-specs.entity';
import { TagOption } from './tag-option.entity';

@Entity({ name: 'VenueMarketingSpecsTag', schema: 'dbo' })
export class VenueMarketingSpecsTag {
  @PrimaryGeneratedColumn({ name: 'VenueMarketingSpecsTagID' })
  id: number;

  @Column({ name: 'VenueMarketingSpecsID', type: 'int' })
  venueMarketingSpecsId: number;

  @ManyToOne(() => VenueMarketingSpecs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'VenueMarketingSpecsID' })
  spec: VenueMarketingSpecs;

  @Column({ name: 'TagOptionID', type: 'int' })
  tagOptionId: number;

  @ManyToOne(() => TagOption)
  @JoinColumn({ name: 'TagOptionID' })
  tagOption: TagOption;
}
