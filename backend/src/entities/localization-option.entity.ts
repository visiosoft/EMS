import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'LocalizationOption', schema: 'dbo' })
export class LocalizationOption {
  @PrimaryGeneratedColumn({ name: 'LocalizationOptionID' })
  localizationOptionId: number;

  @Column({ name: 'LocalizationName', type: 'nvarchar', length: 100 })
  localizationName: string;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive: boolean;

  @Column({ name: 'SortOrder', type: 'int', nullable: true })
  sortOrder: number | null;
}
