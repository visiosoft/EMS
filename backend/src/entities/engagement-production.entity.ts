import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** dbo.EngagementProduction — production logistics dates per engagement (RehearsalDate, LoadInDate). */
@Entity({ name: 'EngagementProduction', schema: 'dbo' })
export class EngagementProduction {
  @PrimaryGeneratedColumn({ name: 'ProductionID' })
  productionId: number;

  @Column({ name: 'EngagementID', type: 'int' })
  engagementId: number;

  @Column({ name: 'RehearsalDate', type: 'date', nullable: true })
  rehearsalDate: string | null;

  @Column({ name: 'LoadInDate', type: 'date', nullable: true })
  loadInDate: string | null;

  @Column({ name: 'AnnouncementDate', type: 'date', nullable: true })
  announcementDate: string | null;

  @Column({ name: 'RunnerRequired', type: 'bit', nullable: true })
  runnerRequired: boolean | null;

  @Column({ name: 'CateringRequired', type: 'bit', nullable: true })
  cateringRequired: boolean | null;

  @Column({ name: 'CateringBudgetLineItem', type: 'nvarchar', length: 500, nullable: true })
  cateringBudgetLineItem: string | null;

  @Column({ name: 'ProductionBuyoutRequired', type: 'bit', nullable: true })
  productionBuyoutRequired: boolean | null;

  @Column({ name: 'ProductionBuyoutDescription', type: 'nvarchar', length: 500, nullable: true })
  productionBuyoutDescription: string | null;

  @Column({ name: 'ProductionBuyoutBudgetAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  productionBuyoutBudgetAmount: number | null;
}
