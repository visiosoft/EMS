import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';
import { Engagement } from './engagement.entity';

/** dbo.Performance — one row per show / performance under an engagement (see EMS_DATABASE_ARCHITECTURE §4.27). */
@Entity({ name: 'Performance', schema: 'dbo' })
export class Performance extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'PerformanceID' })
  performanceId: number;

  @Column({ name: 'EngagementID', type: 'int' })
  engagementId: number;

  @ManyToOne(() => Engagement)
  @JoinColumn({ name: 'EngagementID' })
  engagement: Engagement;

  /**
   * DB column was renamed `PerformanceStatus` → `TicketingStatus`.
   * Allowed values: Private (Not Announced), Public (Not On Sale),
   * Public (On-Sale), Public (Season Ticket Sales Only).
   * The entity property keeps the legacy name `performanceStatus` to avoid a
   * collision with `PerformanceTicketing.ticketingStatus` (a separate concept
   * on a different table); it maps to the new column via `@Column name` below.
   */
  @Column({ name: 'TicketingStatus', type: 'nvarchar', length: 50 })
  performanceStatus: string;

  @Column({ name: 'PerformanceDate', type: 'date' })
  performanceDate: string;

  /** SQL Server `time` — stored as string (e.g. 20:00:00). */
  @Column({ name: 'PerformanceTime', type: 'time' })
  performanceTime: string;
}
