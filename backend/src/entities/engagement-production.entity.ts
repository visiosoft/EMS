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
}
