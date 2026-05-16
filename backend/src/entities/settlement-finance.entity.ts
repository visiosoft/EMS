import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * dbo.SettlementFinance — master for EngagementFinances.SettlementFinanceID.
 * Requires SettlementFinanceID as IDENTITY (or equivalent) if the API inserts new rows.
 */
@Entity({ name: 'SettlementFinance', schema: 'dbo' })
export class SettlementFinance {
  @PrimaryGeneratedColumn({ name: 'SettlementFinanceID', type: 'int' })
  settlementFinanceId: number;

  @Column({
    name: 'ArtistSettlementStatus',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  artistSettlementStatus: string | null;

  @Column({
    name: 'VenueSettlementStatus',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  venueSettlementStatus: string | null;

  @Column({
    name: 'SubscriptionSalesRevenueTotal',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  subscriptionSalesRevenueTotal: string | number | null;

  @Column({
    name: 'SeasonTicketSalesByIAE',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  seasonTicketSalesByIae: string | number | null;

  @Column({
    name: 'SeasonTicketFundsTransferred',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  seasonTicketFundsTransferred: string | number | null;

  @Column({
    name: 'NetBoxOfficeFundsDepositedAccount',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  netBoxOfficeFundsDepositedAccount: string | null;

  @Column({
    name: 'HSTCollectedFromTicketSales',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  hstCollectedFromTicketSales: string | number | null;

  @Column({
    name: 'HSTPaidOnTourPayments',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  hstPaidOnTourPayments: string | number | null;

  @Column({
    name: 'HSTPaidOnShowExpenses',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  hstPaidOnShowExpenses: string | number | null;

  @Column({
    name: 'HSTPaidOnVenueExpenses',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  hstPaidOnVenueExpenses: string | number | null;

  @Column({
    name: 'ArtistGrossTaxableCompensation',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  artistGrossTaxableCompensation: string | number | null;

  @Column({
    name: 'AmountDueToDeptOfRevenue',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  amountDueToDeptOfRevenue: string | number | null;

  @Column({
    name: 'CheckNumberOrConfOfWithholdingPayment',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  checkNumberOrConfOfWithholdingPayment: string | null;
}
