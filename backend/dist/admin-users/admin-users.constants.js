"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IAE_ENTRA_COMPANY_NAME = void 0;
exports.isIaeEntraCompany = isIaeEntraCompany;
exports.IAE_ENTRA_COMPANY_NAME = 'Innovation Arts & Entertainment';
function normalizeCompanyName(value) {
    return value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '')
        .trim();
}
function levenshteinDistance(a, b) {
    if (a.length === 0)
        return b.length;
    if (b.length === 0)
        return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}
const IAE_COMPANY_NORMALIZED = normalizeCompanyName(exports.IAE_ENTRA_COMPANY_NAME);
function isIaeEntraCompany(companyName) {
    const normalized = normalizeCompanyName(companyName ?? '');
    if (!normalized)
        return false;
    if (normalized.includes(IAE_COMPANY_NORMALIZED))
        return true;
    if (IAE_COMPANY_NORMALIZED.includes(normalized) && normalized.length > 5)
        return true;
    if (levenshteinDistance(normalized, IAE_COMPANY_NORMALIZED) <= 3)
        return true;
    return false;
}
//# sourceMappingURL=admin-users.constants.js.map