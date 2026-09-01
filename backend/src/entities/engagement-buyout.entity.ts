import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

/** dbo.EngagementBuyout — individual production buyouts for an engagement. */
@Entity({ name: 'EngagementBuyout', schema: 'dbo' })
export class EngagementBuyout extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'EngagementBuyoutID', type: 'int' })
  engagementBuyoutId: number;

  @Column({ name: 'ProductionID', type: 'int' })
  productionId: number;

  @Column({ name: 'BuyoutDescription', type: 'nvarchar', length: 500 })
  buyoutDescription: string;

  @Column({ name: 'BuyoutBudgetAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  buyoutBudgetAmount: number | null;
}