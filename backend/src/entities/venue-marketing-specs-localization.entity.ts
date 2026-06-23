import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VenueMarketingSpecs } from './venue-marketing-specs.entity';
import { LocalizationOption } from './localization-option.entity';

@Entity({ name: 'VenueMarketingSpecsLocalization', schema: 'dbo' })
export class VenueMarketingSpecsLocalization {
  @PrimaryGeneratedColumn({ name: 'VenueMarketingSpecsLocalizationID' })
  id: number;

  @Column({ name: 'VenueMarketingSpecsID', type: 'int' })
  venueMarketingSpecsId: number;

  @ManyToOne(() => VenueMarketingSpecs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'VenueMarketingSpecsID' })
  spec: VenueMarketingSpecs;

  @Column({ name: 'LocalizationOptionID', type: 'int' })
  localizationOptionId: number;

  @ManyToOne(() => LocalizationOption)
  @JoinColumn({ name: 'LocalizationOptionID' })
  localizationOption: LocalizationOption;

  @Column({ name: 'CustomValue', type: 'nvarchar', length: 255, nullable: true })
  customValue: string | null;
}
