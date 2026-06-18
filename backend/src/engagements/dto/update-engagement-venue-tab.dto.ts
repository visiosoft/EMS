import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function toOptionalInt(v: unknown): number | null | undefined {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

/** PATCH dbo.EngagementVenue per-venue fields visible in the Venues tab. */
export class UpdateEngagementVenueTabDto {
  /** dbo.EngagementVenue.VenueBookingManagerContactID */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  venueBookingManagerContactId?: number | null;

  /**
   * dbo.Venue.VenueTypeID — venue-level field, editable here for convenience.
   * Also drives the main venue profile; updates dbo.Venue directly.
   */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  venueTypeId?: number | null;

  /** dbo.Venue.StageDimensions */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  stageDimensions?: string | null;

  /** dbo.Venue.FlySystemSpecs */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  flySystemSpecs?: string | null;

  /** dbo.Venue.StageType */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stageType?: string | null;

  // ── Optional columns (probed at runtime) ───────────────────────────────

  /** dbo.Venue.TechPackPdfUrl (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  techPackPdfUrl?: string | null;

  /** dbo.EngagementVenue.AttractionTechDirectorContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  attractionTechDirectorContactId?: number | null;

  /** dbo.EngagementVenue.VenueContractSharePointLink (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  venueContractSharePointLink?: string | null;

  /** dbo.EngagementVenue.PartiallyExecutedContractSharePointLink (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  partiallyExecutedContractSharePointLink?: string | null;

  /** dbo.EngagementVenue.FullyExecutedContractSharePointLink (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  fullyExecutedContractSharePointLink?: string | null;

  /** dbo.EngagementVenue.VenueForecastSharePointLink (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  venueForecastSharePointLink?: string | null;

  /** dbo.EngagementVenue.VenueMarketingDirectorContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  venueMarketingDirectorContactId?: number | null;

  /** dbo.EngagementVenue.VenueMarketingManagerContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  venueMarketingManagerContactId?: number | null;

  /** dbo.EngagementVenue.VenueDigitalMarketingManagerContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  venueDigitalMarketingManagerContactId?: number | null;

  /** dbo.EngagementVenue.IaeProductionManagerContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  iaeProductionManagerContactId?: number | null;

  /** dbo.EngagementVenue.VenueProductionManagerContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  venueProductionManagerContactId?: number | null;

  /** dbo.EngagementVenue.StagehandContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  stagehandContactId?: number | null;

  /** dbo.Venue.TicketingSystem (existing column, editable here) */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ticketingSystem?: string | null;

  /** dbo.EngagementVenue.TicketingAdminContactID (optional column) */
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  ticketingAdminContactId?: number | null;

  /** dbo.Venue.SeatingChartUrl (optional column) */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  seatingChartUrl?: string | null;
}
