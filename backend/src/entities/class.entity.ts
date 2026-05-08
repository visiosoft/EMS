import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Class', schema: 'dbo' })
export class Class {
  @PrimaryGeneratedColumn({ name: 'ClassID' })
  classId: number;

  @Column({ name: 'ClassName', type: 'nvarchar', length: 100 })
  className: string;
}
