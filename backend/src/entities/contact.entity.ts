import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';
import { ContactInfo } from './contact-info.entity';

@Entity({ name: 'Contact', schema: 'dbo' })
export class Contact extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'ContactID' })
  contactId: number;

  @Column({ name: 'ContactInfoID', type: 'int' })
  contactInfoId: number;

  @ManyToOne(() => ContactInfo, { eager: false })
  @JoinColumn({ name: 'ContactInfoID' })
  contactInfo: ContactInfo;

  @Column({ name: 'is_staff', type: 'bit', nullable: true })
  isStaff: boolean | null;
}
