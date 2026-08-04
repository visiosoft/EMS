import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'DepartmentRole', schema: 'dbo' })
export class DepartmentRole {
  @PrimaryGeneratedColumn({ name: 'DepartmentRoleID' })
  departmentRoleId: number;

  @Column({ name: 'DepartmentID', type: 'int' })
  departmentId: number;

  @Column({ name: 'RoleID', type: 'int' })
  roleId: number;
}
