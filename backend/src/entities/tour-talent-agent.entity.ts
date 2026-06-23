import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';
import { Contact } from './contact.entity';
import { Tour } from './tour.entity';

@Entity({ name: 'TourTalentAgent', schema: 'dbo' })
export class TourTalentAgent extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'TourTalentAgentID' })
  tourTalentAgentId: number;

  @Column({ name: 'TourID', type: 'int' })
  tourId: number;

  @ManyToOne(() => Tour)
  @JoinColumn({ name: 'TourID' })
  tour: Tour;

  @Column({ name: 'ContactID', type: 'int' })
  contactId: number;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'ContactID' })
  contact: Contact;
}
