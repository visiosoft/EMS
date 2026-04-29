import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Tax', schema: 'dbo' })
export class Tax {
  @PrimaryGeneratedColumn({ name: 'TaxID' })
  taxId: number;

  @Column({ name: 'TaxName', type: 'nvarchar', length: 150 })
  taxName: string;

  @Column({ name: 'TaxRate', type: 'decimal', precision: 18, scale: 6 })
  taxRate: string;

  @Column({ name: 'TaxJurisdictionType', type: 'nvarchar', length: 100 })
  taxJurisdictionType: string;
}

