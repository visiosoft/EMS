import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AgeRange } from './age-range.entity';
import { Tour } from './tour.entity';

@Entity({ name: 'TourAudienceAgeRange', schema: 'dbo' })
export class TourAudienceAgeRange {
  @PrimaryColumn({ name: 'TourID', type: 'int' })
  tourId: number;

  @PrimaryColumn({ name: 'AgeRangeID', type: 'int' })
  ageRangeId: number;

  @ManyToOne(() => Tour)
  @JoinColumn({ name: 'TourID' })
  tour: Tour;

  @ManyToOne(() => AgeRange)
  @JoinColumn({ name: 'AgeRangeID' })
  ageRange: AgeRange;
}
