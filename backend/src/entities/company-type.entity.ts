import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'CompanyType', schema: 'dbo' })
export class CompanyType {
  @PrimaryGeneratedColumn({ name: 'CompanyTypeID' })
  companyTypeId: number;

  @Column({ name: 'CompanyTypeName', type: 'nvarchar', length: 100 })
  companyTypeName: string;
}
