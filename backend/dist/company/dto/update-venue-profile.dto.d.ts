declare class LoadDockAddressDto {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
}
export declare class UpdateVenueProfileDto {
    venueName?: string;
    seatingCapacity?: number;
    salesTaxRate?: string | null;
    taxInCart?: boolean;
    insuranceLanguage?: string | null;
    insurancePolicyCopyRequirements?: string | null;
    venueRelationshipIae?: string;
    venueTypeId?: number | null;
    seatingTypeId?: number | null;
    entertainmentComplexCompanyIds?: number[];
    brandIds?: number[];
    ticketingSystem?: string | null;
    venueWebsite?: string | null;
    loadDockAddress?: LoadDockAddressDto | null;
}
export {};
