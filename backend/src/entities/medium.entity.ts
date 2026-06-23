import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Medium', schema: 'dbo' })
export class Medium {
  @PrimaryGeneratedColumn({ name: 'MediumID' })
  mediumId: number;

  @Column({ name: 'MediumName', type: 'nvarchar', length: 50 })
  mediumName: string;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive: boolean;
}
