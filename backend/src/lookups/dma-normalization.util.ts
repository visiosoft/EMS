/**
 * Canonical SQL normalization for dbo.DMA.MarketName comparisons.
 *
 * Strips one trailing punctuation mark (.,:;), collapses doubled spaces, trims,
 * and lowercases — so near-duplicate rows like "ABILENE-SWEETWATER" vs
 * "Abilene-Sweetwater." group into one market. Must stay byte-identical with the
 * market-family match in venue-directory so grouped market cards and their venue
 * drill-downs agree.
 */
export function dmaMarketNameNormSql(colExpr: string): string {
  return `LOWER(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(
    CASE WHEN RIGHT(RTRIM(${colExpr}),1) IN ('.', ',', ':', ';')
         THEN LEFT(RTRIM(${colExpr}), LEN(RTRIM(${colExpr}))-1)
         ELSE RTRIM(${colExpr}) END
  , '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))))`;
}

/**
 * JS mirror of {@link dmaMarketNameNormSql} for in-memory joins (e.g. matching
 * dbo.DMA market names against the small dbo.DMAPopulation reference table without
 * a SQL-side join). Must stay behaviorally identical to the SQL version.
 */
export function normalizeDmaMarketNameJs(name: string): string {
  let s = name.replace(/\s+$/, '');
  if (/[.,:;]$/.test(s)) s = s.slice(0, -1);
  s = s.trim().replace(/\s{2,}/g, ' ');
  return s.toLowerCase();
}
