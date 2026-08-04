import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** dbo.EquipmentRentalType — lookup table for equipment rental categories. */
@Entity({ name: 'EquipmentRentalType', schema: 'dbo' })
export class EquipmentRentalType {
  @PrimaryGeneratedColumn({ name: 'EquipmentRentalTypeID', type: 'int' })
  equipmentRentalTypeId: number;

  @Column({ name: 'TypeName', type: 'nvarchar', length: 100 })
  typeName: string;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive: boolean;

  @Column({ name: 'SortOrder', type: 'int', nullable: true })
  sortOrder: number | null;
}
