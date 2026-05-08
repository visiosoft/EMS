import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'SeatingType', schema: 'dbo' })
export class SeatingType {
  @PrimaryGeneratedColumn({ name: 'SeatingTypeID' })
  seatingTypeId: number;

  @Column({ name: 'SeatingName', type: 'nvarchar', length: 100 })
  seatingName: string;
}
