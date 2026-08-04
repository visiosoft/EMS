import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditColumns } from '../audit/audit-columns';

/** dbo.EngagementProductionEquipmentRental — junction linking Production to EquipmentRentalType. */
@Entity({ name: 'EngagementProductionEquipmentRental', schema: 'dbo' })
export class EngagementProductionEquipmentRental extends AuditColumns {
  @PrimaryGeneratedColumn({ name: 'EngagementProductionEquipmentRentalID', type: 'int' })
  engagementProductionEquipmentRentalId: number;

  @Column({ name: 'ProductionID', type: 'int' })
  productionId: number;

  @Column({ name: 'EquipmentRentalTypeID', type: 'int' })
  equipmentRentalTypeId: number;

  @Column({ name: 'BudgetAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  budgetAmount: number | null;
}
