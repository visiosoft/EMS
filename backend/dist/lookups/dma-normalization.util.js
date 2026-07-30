"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dmaMarketNameNormSql = dmaMarketNameNormSql;
function dmaMarketNameNormSql(colExpr) {
    return `LOWER(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(
    CASE WHEN RIGHT(RTRIM(${colExpr}),1) IN ('.', ',', ':', ';')
         THEN LEFT(RTRIM(${colExpr}), LEN(RTRIM(${colExpr}))-1)
         ELSE RTRIM(${colExpr}) END
  , '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))))`;
}
//# sourceMappingURL=dma-normalization.util.js.map