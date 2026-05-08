import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Department', schema: 'dbo' })
export class Department {
  @PrimaryGeneratedColumn({ name: 'DepartmentID' })
  departmentId: number;

  @Column({ name: 'DepartmentName', type: 'nvarchar', length: 100 })
  departmentName: string;
}
