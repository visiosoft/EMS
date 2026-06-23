import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'FileFormatOption', schema: 'dbo' })
export class FileFormatOption {
  @PrimaryGeneratedColumn({ name: 'FileFormatOptionID' })
  fileFormatOptionId: number;

  @Column({ name: 'FileFormatName', type: 'nvarchar', length: 50 })
  fileFormatName: string;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive: boolean;

  @Column({ name: 'SortOrder', type: 'int', nullable: true })
  sortOrder: number | null;
}
