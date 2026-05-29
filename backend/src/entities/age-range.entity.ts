import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'AgeRange', schema: 'dbo' })
export class AgeRange {
  @PrimaryGeneratedColumn({ name: 'AgeRangeID' })
  ageRangeId: number;

  @Column({ name: 'AgeRangeLabel', type: 'nvarchar', length: 20 })
  ageRangeLabel: string;

  @Column({ name: 'SortOrder', type: 'int' })
  sortOrder: number;
}
