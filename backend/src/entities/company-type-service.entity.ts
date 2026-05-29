import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompanyType } from './company-type.entity';
import { ServiceProvided } from './service-provided.entity';

@Entity({ name: 'CompanyTypeService', schema: 'dbo' })
export class CompanyTypeService {
  @PrimaryGeneratedColumn({ name: 'CompanyTypeServiceID' })
  companyTypeServiceId: number;

  @Column({ name: 'CompanyTypeID', type: 'int' })
  companyTypeId: number;

  @ManyToOne(() => CompanyType)
  @JoinColumn({ name: 'CompanyTypeID' })
  companyType: CompanyType;

  @Column({ name: 'ServiceProvidedID', type: 'int' })
  serviceProvidedId: number;

  @ManyToOne(() => ServiceProvided)
  @JoinColumn({ name: 'ServiceProvidedID' })
  serviceProvided: ServiceProvided;
}
