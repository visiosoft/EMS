import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * dbo.ArtistFinance — master for EngagementFinances.ArtistFinanceID.
 * Requires ArtistFinanceID as IDENTITY (or equivalent) if the API inserts new rows.
 */
@Entity({ name: 'ArtistFinance', schema: 'dbo' })
export class ArtistFinance {
  @PrimaryGeneratedColumn({ name: 'ArtistFinanceID', type: 'int' })
  artistFinanceId: number;

  @Column({
    name: 'ArtistDealType',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  artistDealType: string | null;

  @Column({
    name: 'ArtistMiddleMoney',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  artistMiddleMoney: string | number | null;

  @Column({
    name: 'ArtistGuarantee',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  artistGuarantee: string | number | null;

  @Column({
    name: 'ArtistRoyaltyVariableFee',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  artistRoyaltyVariableFee: string | null;

  @Column({
    name: 'ArtistBackEndTerms',
    type: 'nvarchar',
    length: 'max' as any,
    nullable: true,
  })
  artistBackEndTerms: string | null;
}
