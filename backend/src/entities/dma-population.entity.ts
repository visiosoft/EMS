import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Nielsen DMA population reference data ("Sakshi's table"). NielsenCode is a unique
 * natural key (253 rows); MarketName is also unique per row as of Sakshi's 2026-07
 * correction (each NielsenCode maps to its own real Nielsen market name). Joining
 * this to dbo.DMA.MarketName still isn't a plain string match, though: dbo.DMA uses
 * our own full multi-city labels ("SAN FRANCISCO-OAKLAND-SAN JOSE") while this table
 * uses official, often shorter Nielsen labels ("San Francisco") — see
 * normalizeNielsenMarketNameForMatch() in lookups/dma-normalization.util.ts for the
 * matching logic and its documented limits.
 */
@Entity({ name: 'DMAPopulation', schema: 'dbo' })
export class DmaPopulation {
  @PrimaryColumn({ name: 'NielsenCode', type: 'int' })
  nielsenCode: number;

  @Column({ name: 'Rank', type: 'int', nullable: true })
  rank: number | null;

  @Column({ name: 'Metro12PlusPopulation', type: 'int', nullable: true })
  metro12PlusPopulation: number | null;

  @Column({ name: 'Hispanic12PlusPopulation', type: 'int', nullable: true })
  hispanic12PlusPopulation: number | null;

  @Column({ name: 'Black12PlusPopulation', type: 'int', nullable: true })
  black12PlusPopulation: number | null;

  @Column({ name: 'DataAsOfYear', type: 'smallint', nullable: true })
  dataAsOfYear: number | null;

  @Column({ name: 'MarketName', type: 'nvarchar', length: 200, nullable: true })
  marketName: string | null;
}
