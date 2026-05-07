import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Role', schema: 'dbo' })
export class Role {
  @PrimaryGeneratedColumn({ name: 'RoleID' })
  roleId: number;

  @Column({ name: 'RoleName', type: 'nvarchar', length: 100 })
  roleName: string;
}
