import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { Dma } from './dma.entity';
import { ServiceProvided } from './service-provided.entity';

@Entity({ name: 'CompanyServiceArea', schema: 'dbo' })
export class CompanyServiceArea {
  @PrimaryGeneratedColumn({ name: 'CompanyServiceAreaID' })
  companyServiceAreaId: number;

  @Column({ name: 'CompanyID', type: 'int' })
  companyId: number;

  @Column({ name: 'DMAID', type: 'int' })
  dmaid: number;

  @Column({ name: 'ServiceProvidedID', type: 'int' })
  serviceProvidedId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'CompanyID' })
  company: Company;

  @ManyToOne(() => Dma)
  @JoinColumn({ name: 'DMAID' })
  dma: Dma;

  @ManyToOne(() => ServiceProvided)
  @JoinColumn({ name: 'ServiceProvidedID' })
  serviceProvided: ServiceProvided;
}

