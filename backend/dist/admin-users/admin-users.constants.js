"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IAE_ENTRA_COMPANY_NAME = void 0;
exports.isIaeEntraCompany = isIaeEntraCompany;
exports.IAE_ENTRA_COMPANY_NAME = 'Innovation Arts & Entertainment';
function normalizeCompanyName(value) {
    return value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
const IAE_COMPANY_NORMALIZED = normalizeCompanyName(exports.IAE_ENTRA_COMPANY_NAME);
function isIaeEntraCompany(companyName) {
    const normalized = normalizeCompanyName(companyName ?? '');
    if (!normalized)
        return false;
    return normalized.includes(IAE_COMPANY_NORMALIZED);
}
//# sourceMappingURL=admin-users.constants.js.map