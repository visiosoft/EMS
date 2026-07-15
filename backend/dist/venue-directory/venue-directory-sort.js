"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL = void 0;
exports.applyAllVenuesSort = applyAllVenuesSort;
exports.ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL = `(SELECT STRING_AGG(LTRIM(RTRIM(ccx.CompanyName)), N', ') WITHIN GROUP (ORDER BY LTRIM(RTRIM(ccx.CompanyName)))
          FROM dbo.VenueComplexMember vcmx
          INNER JOIN dbo.Company ccx ON ccx.CompanyID = vcmx.ComplexCompanyID
          WHERE vcmx.VenueCompanyID = v.companyId)`;
function applyAllVenuesSort(qb, sortByRaw, sortDirRaw) {
    const sortBy = (sortByRaw ?? '').trim().toLowerCase();
    const sortDir = (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const tieBreak = () => qb.addOrderBy('v.venueName', 'ASC');
    if (sortBy === 'type') {
        qb.orderBy('vt.venueTypeName', sortDir);
        tieBreak();
    }
    else if (sortBy === 'city') {
        qb.orderBy('pa.city', sortDir);
        tieBreak();
    }
    else if (sortBy === 'dma') {
        qb.orderBy('d.marketName', sortDir);
        tieBreak();
    }
    else if (sortBy === 'capacity') {
        qb.orderBy('v.seatingCapacity', sortDir);
        tieBreak();
    }
    else if (sortBy === 'complex') {
        qb.orderBy(exports.ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL, sortDir);
        tieBreak();
    }
    else {
        qb.orderBy('v.venueName', sortDir).addOrderBy('v.companyId', 'ASC');
    }
}
//# sourceMappingURL=venue-directory-sort.js.map