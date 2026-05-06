import { IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

/** SeatingTypeID via TypeORM; ticketing/website use dynamic column names (see venue-ticketing-columns.resolver.ts). */
export class UpdateVenueTicketingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  seatingTypeId?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(100)
  ticketingSystem?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(2048)
  venueWebsite?: string | null;
}
