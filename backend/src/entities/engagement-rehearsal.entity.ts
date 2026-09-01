import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** dbo.EngagementRehearsal — one row per rehearsal date/time on an engagement. */
@Entity({ name: 'EngagementRehearsal', schema: 'dbo' })
export class EngagementRehearsal {
  @PrimaryGeneratedColumn({ name: 'RehearsalID' })
  rehearsalId: number;

  @Column({ name: 'EngagementID', type: 'int' })
  engagementId: number;

  @Column({ name: 'RehearsalDate', type: 'date' })
  rehearsalDate: string;

  @Column({ name: 'RehearsalTime', type: 'time', nullable: true })
  rehearsalTime: string | null;
}
