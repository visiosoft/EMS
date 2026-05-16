import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Engagement } from './engagement.entity';

/**
 * dbo.EngagementFinances — one row per engagement (1:1 on EngagementID).
 * PK is FinanceID (not EngagementFinanceID).
 * SellableCapacity and GrossPotential are on dbo.Engagement; GET finance merges them into the response.
 */
@Entity({ name: 'EngagementFinances', schema: 'dbo' })
export class EngagementFinances {
  @PrimaryGeneratedColumn({ name: 'FinanceID' })
  financeId: number;

  @Column({ name: 'EngagementID', type: 'int', unique: true })
  engagementId: number;

  @OneToOne(() => Engagement)
  @JoinColumn({ name: 'EngagementID' })
  engagement: Engagement;

  @Column({
    name: 'EstimatedBreakeven',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  estimatedBreakeven: string | number | null;

  @Column({
    name: 'PromoterProfit',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  promoterProfit: string | number | null;

  @Column({
    name: 'VenueTerms',
    type: 'nvarchar',
    length: 'max' as any,
    nullable: true,
  })
  venueTerms: string | null;

  @Column({ name: 'ConfirmationPacketApproved', type: 'bit', nullable: true })
  confirmationPacketApproved: boolean | null;

  @Column({
    name: 'IAEWaiverApplicationConfirmationNumber',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  iaeWaiverApplicationConfirmationNumber: string | null;

  @Column({
    name: 'IAEWaiverApplicationSubmissionDate',
    type: 'date',
    nullable: true,
  })
  iaeWaiverApplicationSubmissionDate: string | null;

  @Column({
    name: 'IAEApplicationWaiverStatus',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  iaeApplicationWaiverStatus: string | null;

  @Column({ name: 'DateFundsReceived', type: 'date', nullable: true })
  dateFundsReceived: string | null;

  @Column({
    name: 'FundsDue',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  fundsDue: string | number | null;

  @Column({
    name: 'FundsWithheld',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  fundsWithheld: string | number | null;

  @Column({
    name: 'FundsOwed',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  fundsOwed: string | number | null;

  @Column({
    name: 'ReceivableBankAccount',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  receivableBankAccount: string | null;

  @Column({
    name: 'RequiredNonResidentWithholdingID',
    type: 'int',
    nullable: true,
  })
  requiredNonResidentWithholdingId: number | null;

  @Column({ name: 'ArtistFinanceID', type: 'int', nullable: true })
  artistFinanceId: number | null;

  @Column({ name: 'SettlementFinanceID', type: 'int', nullable: true })
  settlementFinanceId: number | null;
}
