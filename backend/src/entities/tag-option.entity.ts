import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'TagOption', schema: 'dbo' })
export class TagOption {
  @PrimaryGeneratedColumn({ name: 'TagOptionID' })
  tagOptionId: number;

  @Column({ name: 'TagName', type: 'nvarchar', length: 100 })
  tagName: string;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive: boolean;

  @Column({ name: 'SortOrder', type: 'int', nullable: true })
  sortOrder: number | null;
}
