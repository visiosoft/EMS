import { Entity, PrimaryColumn } from 'typeorm';

/**
 * dbo.ArtistFinance — master for EngagementFinances.ArtistFinanceID.
 * Exposes at least the PK; extend with @Column as needed to enrich dropdown labels.
 */
@Entity({ name: 'ArtistFinance', schema: 'dbo' })
export class ArtistFinance {
  @PrimaryColumn({ name: 'ArtistFinanceID', type: 'int' })
  artistFinanceId: number;
}
