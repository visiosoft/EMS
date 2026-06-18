import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'PerformancePromoPassword', schema: 'dbo' })
export class PerformancePromoPassword {
  @PrimaryGeneratedColumn({ name: 'PromoPasswordID', type: 'int' })
  promoPasswordId: number;

  @Column({ name: 'PerformanceID', type: 'int' })
  performanceId: number;

  @Column({ name: 'PasswordType', type: 'nvarchar', length: 50 })
  passwordType: string;

  @Column({ name: 'Password', type: 'nvarchar', length: 500 })
  password: string;

  @Column({ name: 'ActiveDateStart', type: 'date', nullable: true })
  activeDateStart: string | Date | null;

  @Column({ name: 'ActiveDateEnd', type: 'date', nullable: true })
  activeDateEnd: string | Date | null;

  @Column({ name: 'DiscountType', type: 'nvarchar', length: 10, nullable: true })
  discountType: string | null;

  @Column({
    name: 'DiscountAmount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  discountAmount: string | number | null;
}
