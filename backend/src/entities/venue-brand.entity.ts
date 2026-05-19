import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Brand } from './brand.entity';
import { Venue } from './venue.entity';

@Entity({ name: 'VenueBrand', schema: 'dbo' })
export class VenueBrand {
  @PrimaryColumn({ name: 'VenueCompanyID', type: 'int' })
  venueCompanyId: number;

  @PrimaryColumn({ name: 'BrandID', type: 'int' })
  brandId: number;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'VenueCompanyID' })
  venue: Venue;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'BrandID' })
  brand: Brand;
}
