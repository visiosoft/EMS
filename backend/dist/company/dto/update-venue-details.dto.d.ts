import { UpdateVenueProfileDto } from './update-venue-profile.dto';
declare class ContactDraftDto {
    fullName?: string;
    email?: string;
    phone?: string;
    cellPhone?: string;
}
declare class LinkDraftDto {
    linkId?: number | null;
    linkType?: string;
    linkUrl?: string;
    linkName?: string;
    linkPath?: string;
}
declare class NonResidentWithholdingDraftDto {
    withholdingTaxRate?: string;
    dmaid?: number | null;
    taxAgencyId?: number | null;
    withholdingLink?: LinkDraftDto | null;
    artistWaiverInstructions?: LinkDraftDto | null;
    iaeWaiverInstructions?: LinkDraftDto | null;
}
export declare class UpdateVenueDetailsDto {
    venueProfile?: UpdateVenueProfileDto;
    brandIds?: number[];
    taxIds?: number[];
    stagehandProviderCompanyId?: number | null;
    nonResidentWithholdingId?: number | null;
    hasStateTaxOnTickets?: 0 | 1;
    hasCityTaxOnTickets?: 0 | 1;
    financeDirectors?: ContactDraftDto[];
    settlementManagers?: ContactDraftDto[];
    marketingDirectors?: ContactDraftDto[];
    technicalDirectors?: ContactDraftDto[];
    ticketingManagers?: ContactDraftDto[];
    stagehandProviderContacts?: ContactDraftDto[];
    financeDirector?: ContactDraftDto;
    settlementManager?: ContactDraftDto;
    marketingDirector?: ContactDraftDto;
    technicalDirector?: ContactDraftDto;
    ticketingManager?: ContactDraftDto;
    bookingDirectors?: ContactDraftDto[];
    rentalManagers?: ContactDraftDto[];
    calendarManagers?: ContactDraftDto[];
    contractManagers?: ContactDraftDto[];
    bookingDirector?: ContactDraftDto;
    rentalManager?: ContactDraftDto;
    calendarManager?: ContactDraftDto;
    contractManager?: ContactDraftDto;
    stagehandProviderContact?: ContactDraftDto;
    nonResidentWithholding?: NonResidentWithholdingDraftDto;
}
export {};
