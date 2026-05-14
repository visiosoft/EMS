import type { SelectQueryBuilder } from 'typeorm';
import type { Venue } from '../entities/venue.entity';

/** Same expression as list SELECT — must be used in ORDER BY for SQL Server (alias-only ORDER BY is fragile with TypeORM + joins). */
export const ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL = `(SELECT STRING_AGG(LTRIM(RTRIM(ccx.CompanyName)), N', ') WITHIN GROUP (ORDER BY LTRIM(RTRIM(ccx.CompanyName)))
          FROM dbo.VenueComplexMember vcmx
          INNER JOIN dbo.Company ccx ON ccx.CompanyID = vcmx.ComplexCompanyID
          WHERE vcmx.VenueCompanyID = v.companyId)`;

/**
 * Applies ORDER BY for All Venues list. Uses concrete SQL fragments so MSSQL + OFFSET/FETCH
 * always receives valid ORDER BY (join aliases and computed columns).
 */
export function applyAllVenuesSort(
  qb: SelectQueryBuilder<Venue>,
  sortByRaw?: string,
  sortDirRaw?: string,
): void {
  const sortBy = (sortByRaw ?? '').trim().toLowerCase();
  const sortDir =
    (sortDirRaw ?? '').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const tieBreak = () => qb.addOrderBy('v.venueName', 'ASC');
  if (sortBy === 'type') {
    qb.orderBy('vt.venueTypeName', sortDir);
    tieBreak();
  } else if (sortBy === 'dma') {
    qb.orderBy('d.marketName', sortDir);
    tieBreak();
  } else if (sortBy === 'capacity') {
    qb.orderBy('v.seatingCapacity', sortDir);
    tieBreak();
  } else if (sortBy === 'complex') {
    qb.orderBy(ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL, sortDir);
    tieBreak();
  } else {
    qb.orderBy('v.venueName', sortDir).addOrderBy('v.companyId', 'ASC');
  }
}
