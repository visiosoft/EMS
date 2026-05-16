import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** dbo.EngagementIAEContact — IAE staff assigned to an engagement. */
@Entity({ name: 'EngagementIAEContact', schema: 'dbo' })
export class EngagementIAEContact {
  @PrimaryGeneratedColumn({ name: 'EngagementIAEContactID', type: 'int' })
  engagementIaeContactId: number;

  @Column({ name: 'EngagementID', type: 'int' })
  engagementId: number;

  @Column({ name: 'ContactID', type: 'int' })
  contactId: number;

  @Column({ name: 'RoleID', type: 'int', nullable: true })
  roleId: number | null;

  @Column({ name: 'DepartmentID', type: 'int', nullable: true })
  departmentId: number | null;

  @Column({ name: 'IsPrimary', type: 'bit', default: () => '(0)' })
  isPrimary: boolean;

  @Column({ name: 'Notes', type: 'nvarchar', length: 500, nullable: true })
  notes: string | null;

  @Column({ name: 'CreatedDate', type: 'datetime' })
  createdDate: Date;
}
