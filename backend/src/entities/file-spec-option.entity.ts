import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'FileSpecOption', schema: 'dbo' })
export class FileSpecOption {
  @PrimaryGeneratedColumn({ name: 'FileSpecOptionID' })
  fileSpecOptionId: number;

  @Column({ name: 'FileSpecName', type: 'nvarchar', length: 100 })
  fileSpecName: string;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive: boolean;

  @Column({ name: 'SortOrder', type: 'int', nullable: true })
  sortOrder: number | null;
}
