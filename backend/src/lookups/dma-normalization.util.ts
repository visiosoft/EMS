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
