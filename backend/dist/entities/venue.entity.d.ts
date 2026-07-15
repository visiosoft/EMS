import { Address } from './address.entity';
import { Company } from './company.entity';
import { NonResidentWithholding } from './non-resident-withholding.entity';
import { SeatingType } from './seating-type.entity';
import { VenueType } from './venue-type.entity';
export declare class Venue {
    companyId: number;
    company: Company;
    venueName: string;
    seatingCapacity: number;
    salesTaxType: string | null;
    salesTaxRate: string | null;
    taxInCart: boolean;
    insuranceLanguage: string | null;
    insurancePolicyCopyRequirements: string | null;
    venueRelationshipIae: string;
    venueTypeId: number | null;
    venueType: VenueType | null;
    seatingTypeId: number | null;
    seatingType: SeatingType | null;
    loadDockAddressId: number | null;
    loadDockAddress: Address | null;
    nonResidentWithholdingId: number | null;
    nonResidentWithholding: NonResidentWithholding | null;
    stageDimensions: string | null;
    flySystemSpecs: string | null;
    stageType: string | null;
    seatingChartLinkId: number | null;
}
