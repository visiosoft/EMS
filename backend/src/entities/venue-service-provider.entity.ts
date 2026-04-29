import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from './company.entity';
import { ServiceProvided } from './service-provided.entity';
import { Venue } from './venue.entity';

@Entity({ name: 'VenueServiceProvider', schema: 'dbo' })
export class VenueServiceProvider {
  @PrimaryGeneratedColumn()
  /** Table has no PK in documentation; create surrogate for TypeORM mapping. */
  _id: number;

  @Column({ name: 'VenueCompanyID', type: 'int' })
  venueCompanyId: number;

  @Column({ name: 'ServiceID', type: 'int' })
  serviceId: number;

  @Column({ name: 'ProviderCompanyID', type: 'int' })
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

