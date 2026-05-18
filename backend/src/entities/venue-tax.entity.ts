import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tax } from './tax.entity';
import { Venue } from './venue.entity';

@Entity({ name: 'VenueTax', schema: 'dbo' })
export class VenueTax {
  @PrimaryColumn({ name: 'VenueCompanyID', type: 'int' })
  venueCompanyId: number;

  @PrimaryColumn({ name: 'TaxID', type: 'int' })
  taxId: number;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'VenueCompanyID' })
  venue: Venue;

  @ManyToOne(() => Tax)
  @JoinColumn({ name: 'TaxID' })
  tax: Tax;
}
