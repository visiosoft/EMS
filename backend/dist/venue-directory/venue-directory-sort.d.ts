import type { SelectQueryBuilder } from 'typeorm';
import type { Venue } from '../entities/venue.entity';
export declare const ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL = "(SELECT STRING_AGG(LTRIM(RTRIM(ccx.CompanyName)), N', ') WITHIN GROUP (ORDER BY LTRIM(RTRIM(ccx.CompanyName)))\n          FROM dbo.VenueComplexMember vcmx\n          INNER JOIN dbo.Company ccx ON ccx.CompanyID = vcmx.ComplexCompanyID\n          WHERE vcmx.VenueCompanyID = v.companyId)";
export declare function applyAllVenuesSort(qb: SelectQueryBuilder<Venue>, sortByRaw?: string, sortDirRaw?: string): void;
