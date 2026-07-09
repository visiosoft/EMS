import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { UpdateVenueProfileDto } from './update-venue-profile.dto';

class ContactDraftDto {
  /**
   * When set, links this EXISTING contact to the role directly (by id) instead of
   * re-matching on the typed email. This is how the Venue Profile "assign existing
   * contact" picker attaches a venue's already-known contact (e.g. its Booking
   * Director) to a role without creating a duplicate Contact/ContactInfo.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contactId?: number | null;

  /** "First Last" (split on first whitespace). */
  @IsOptional()
  fullName?: string;

  @IsOptional()
  email?: string;

  /** Maps to dbo.ContactInfo.WorkPhone. */
  @IsOptional()
  phone?: string;

  /** Maps to dbo.ContactInfo.CellPhone (second phone in the venue UI). */
  @IsOptional()
  cellPhone?: string;
}

class LinkDraftDto {
  @IsOptional()
  linkId?: number | null;

  @IsOptional()
  linkType?: string;

  @IsOptional()
  linkUrl?: string;

  @IsOptional()
  linkName?: string;

  @IsOptional()
  linkPath?: string;
}

class NonResidentWithholdingDraftDto {
  @IsOptional()
  withholdingTaxRate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  dmaid?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  taxAgencyId?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LinkDraftDto)
  withholdingLink?: LinkDraftDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LinkDraftDto)
  artistWaiverInstructions?: LinkDraftDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LinkDraftDto)
  iaeWaiverInstructions?: LinkDraftDto | null;
}

export class UpdateVenueDetailsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateVenueProfileDto)
  venueProfile?: UpdateVenueProfileDto;

  /** dbo.VenueBrand (VenueCompanyID + BrandID) */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  brandIds?: number[];

  /** dbo.VenueTax (VenueCompanyID + TaxID) */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  taxIds?: number[];

  /** dbo.VenueServiceProvider for "Stagehands" service. */
  @IsOptional()
  @IsInt()
  @Min(1)
  stagehandProviderCompanyId?: number | null;

  /** dbo.Venue.NonResidentWithholdingID */
  @IsOptional()
  @IsInt()
  @Min(1)
  nonResidentWithholdingId?: number | null;

  /** Convenience toggles derived from VenueTax + TaxJurisdictionType. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  hasStateTaxOnTickets?: 0 | 1;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  hasCityTaxOnTickets?: 0 | 1;

  /**
   * Venue contacts captured from the venue screen.
   * Persisted as dbo.ContactInfo + dbo.Contact + dbo.ContactAssignment using inferred Role+Department names.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  /** Multiple contacts for this venue role (each row: Name, Email, Phone in the UI). */
  financeDirectors?: ContactDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  settlementManagers?: ContactDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  marketingDirectors?: ContactDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  /** Multiple technical directors (replaces `technicalDirector` when sent). */
  technicalDirectors?: ContactDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  /** Multiple ticketing managers (replaces `ticketingManager` when sent). */
  ticketingManagers?: ContactDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  /** Multiple stagehand contact persons (replaces `stagehandProviderContact` when sent). */
  stagehandProviderContacts?: ContactDraftDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  financeDirector?: ContactDraftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  settlementManager?: ContactDraftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  marketingDirector?: ContactDraftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  technicalDirector?: ContactDraftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  ticketingManager?: ContactDraftDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  bookingDirectors?: ContactDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  rentalManagers?: ContactDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  calendarManagers?: ContactDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDraftDto)
  contractManagers?: ContactDraftDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  bookingDirector?: ContactDraftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  rentalManager?: ContactDraftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  calendarManager?: ContactDraftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  contractManager?: ContactDraftDto;

  /** Stored as a venue contact assignment (Role: Stagehand Provider, Dept: Technical). */
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDraftDto)
  stagehandProviderContact?: ContactDraftDto;

  /**
   * Full editor for dbo.NonResidentWithholding + dbo.Link records.
   * Only applies to the selected `nonResidentWithholdingId`.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => NonResidentWithholdingDraftDto)
  nonResidentWithholding?: NonResidentWithholdingDraftDto;
}
