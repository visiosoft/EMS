import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

@Entity({ name: 'EngagementPartner', schema: 'dbo' })
export class EngagementPartner extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'EngagementPartnerID' })
  engagementPartnerId: number;

  @Column({ name: 'EngagementID', type: 'int' })
  engagementId: number;

  @Column({ name: 'PartnerCompanyID', type: 'int' })
  partnerCompanyId: number;

  @Column({ name: 'PartnerContactID', type: 'int', nullable: true })
  partnerContactId: number | null;
}
