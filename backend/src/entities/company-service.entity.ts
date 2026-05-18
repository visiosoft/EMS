import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { ServiceProvided } from './service-provided.entity';

@Entity({ name: 'CompanyService', schema: 'dbo' })
export class CompanyService {
  @PrimaryGeneratedColumn({ name: 'CompanyServiceID' })
  companyServiceId: number;

  @Column({ name: 'CompanyID', type: 'int' })
  companyId: number;

  @Column({ name: 'ServiceProvidedID', type: 'int' })
  serviceProvidedId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'CompanyID' })
  company: Company;

  @ManyToOne(() => ServiceProvided)
  @JoinColumn({ name: 'ServiceProvidedID' })
  serviceProvided: ServiceProvided;
}
