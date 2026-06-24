import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medium } from './medium.entity';

@Entity({ name: 'PlacementCategory', schema: 'dbo' })
export class PlacementCategory {
  @PrimaryGeneratedColumn({ name: 'PlacementCategoryID' })
  placementCategoryId: number;

  @Column({ name: 'PlacementName', type: 'nvarchar', length: 100 })
  placementName: string;

  @Column({ name: 'MediumID', type: 'int' })
  mediumId: number;

  @ManyToOne(() => Medium)
  @JoinColumn({ name: 'MediumID' })
  medium: Medium;

  @Column({ name: 'SizeUnit', type: 'nvarchar', length: 20, nullable: true })
  sizeUnit: string | null;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive: boolean;

  @Column({ name: 'SortOrder', type: 'int', nullable: true })
  sortOrder: number | null;
}
