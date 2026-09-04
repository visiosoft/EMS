"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dmaMarketNameNormSql = dmaMarketNameNormSql;
exports.normalizeDmaMarketNameJs = normalizeDmaMarketNameJs;
exports.normalizeNielsenMarketNameForMatch = normalizeNielsenMarketNameForMatch;
function dmaMarketNameNormSql(colExpr) {
    return `LOWER(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(
    CASE WHEN RIGHT(RTRIM(${colExpr}),1) IN ('.', ',', ':', ';')
         THEN LEFT(RTRIM(${colExpr}), LEN(RTRIM(${colExpr}))-1)
         ELSE RTRIM(${colExpr}) END
  , '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))))`;
}
function normalizeDmaMarketNameJs(name) {
    let s = name.replace(/\s+$/, '');
    if (/[.,:;]$/.test(s))
        s = s.slice(0, -1);
    s = s.trim().replace(/\s{2,}/g, ' ');
    return s.toLowerCase();
}
function normalizeNielsenMarketNameForMatch(name) {
    let s = normalizeDmaMarketNameJs(name).toUpperCase();
    s = s.replace(/\(.*?\)/g, ' ');
    s = s.replace(/\bFT\.?\b/g, 'FORT');
    s = s.replace(/\bST\.?\b/g, 'SAINT');
    s = s.replace(/[.,;:]/g, ' ');
    s = s.replace(/&/g, 'AND');
    s = s.replace(/-/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s.toLowerCase();
}
//# sourceMappingURL=dma-normalization.util.js.map