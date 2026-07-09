import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Nielsen DMA population reference data ("Sakshi's table"). NielsenCode is a unique
 * natural key (253 rows), but MarketName is NOT unique — ~49 names repeat across
 * multiple NielsenCode/Rank rows (e.g. "NEW YORK" has 10 differently-ranked rows).
 * Callers must dedupe by picking the lowest Rank per normalized name before joining
 * to dbo.DMA.MarketName. See docs/sql/dma-population-fix-request.sql.
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
