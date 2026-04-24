import { Entity, PrimaryColumn } from 'typeorm';

/**
 * dbo.SettlementFinance — master for EngagementFinances.SettlementFinanceID.
 */
@Entity({ name: 'SettlementFinance', schema: 'dbo' })
export class SettlementFinance {
  @PrimaryColumn({ name: 'SettlementFinanceID', type: 'int' })
  settlementFinanceId: number;
}
