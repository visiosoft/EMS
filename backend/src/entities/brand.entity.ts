import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Brand', schema: 'dbo' })
export class Brand {
  @PrimaryGeneratedColumn({ name: 'BrandID' })
  brandId: number;

  @Column({ name: 'BrandName', type: 'nvarchar', length: 100 })
  brandName: string;
}

