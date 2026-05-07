import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Company } from './company.entity';
import { ServiceProvided } from './service-provided.entity';
import { Venue } from './venue.entity';

@Entity({ name: 'VenueServiceProvider', schema: 'dbo' })
export class VenueServiceProvider {
  @PrimaryColumn({ name: 'VenueCompanyID', type: 'int' })
  venueCompanyId: number;

  @PrimaryColumn({ name: 'ServiceID', type: 'int' })
  serviceId: number;

  @PrimaryColumn({ name: 'ProviderCompanyID', type: 'int' })
  providerCompanyId: number;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'VenueCompanyID' })
  venue: Venue;

  @ManyToOne(() => ServiceProvided)
  @JoinColumn({ name: 'ServiceID' })
  service: ServiceProvided;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'ProviderCompanyID' })
  providerCompany: Company;
}

