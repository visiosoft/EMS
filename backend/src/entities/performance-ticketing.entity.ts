import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * dbo.PerformanceTicketing — ticketing / marketing data per show (PerformanceID).
 * Requires TicketingID as IDENTITY (or equivalent) when inserting new rows.
 */
@Entity({ name: 'PerformanceTicketing', schema: 'dbo' })
export class PerformanceTicketing {
  @PrimaryGeneratedColumn({ name: 'TicketingID', type: 'int' })
  ticketingId: number;

  @Column({ name: 'PerformanceID', type: 'int' })
  performanceId: number;

  @Column({
    name: 'TicketingStatus',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  ticketingStatus: string | null;

  @Column({ name: 'OnSaleDate', type: 'date', nullable: true })
  onSaleDate: string | Date | null;

  @Column({ name: 'PreSaleDate', type: 'date', nullable: true })
  preSaleDate: string | Date | null;

  @Column({
    /** DB column uses “Packaged” (not “Package”); maps to API `vipPackagedOffer`. */
    name: 'VIPPackagedOffer',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  vipPackagedOffer: string | null;

  @Column({
    name: 'PreSaleSpecialPrices',
    type: 'nvarchar',
    length: 'max' as any,
    nullable: true,
  })
  preSaleSpecialPrices: string | null;

  @Column({
    name: 'KidsTicketsPrices',
    type: 'nvarchar',
    length: 'max' as any,
    nullable: true,
  })
  kidsTicketsPrices: string | null;

  @Column({ name: 'TicketingLinkID', type: 'int', nullable: true })
  ticketingLinkId: number | null;

  @Column({
    name: 'GrossTicketSales',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  grossTicketSales: string | number | null;

  @Column({ name: 'TotalComps', type: 'int', nullable: true })
  totalComps: number | null;

  @Column({ name: 'TotalTickets', type: 'int', nullable: true })
  totalTickets: number | null;

  @Column({ name: 'TotalAdmissions', type: 'int', nullable: true })
  totalAdmissions: number | null;
}
